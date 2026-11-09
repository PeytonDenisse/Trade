import type {Worker as OcrWorker,Block,Page,PSM} from 'tesseract.js';
import {extractIneCandidates,extractIneZoneCandidates,type IneOcrResult,type IneZone} from './ine-ocr-parse';
import {supplementIneScan,planIneCurpRegion,recoverIneCriticalBlocks} from './ine-ocr-image';
import {INE_MIN_CONFIDENCE,identityKeys,normalizeIneValue,type IneEvidence,type IneReading} from './ine-analysis';
import type {IneIdentity} from './ine-identity';
import {diagnoseIneReading,type IneReadDiagnostics} from './ine-ocr-diagnostics';

import {fieldConfidences} from './ine-confidence';
export {fieldConfidences} from './ine-confidence';

function readingConfidences(result:IneOcrResult,blocks:Block[]|null|undefined){
 const measured=fieldConfidences(result.values,blocks);
 for(const field of identityKeys)if(result.confidence?.[field]!==undefined)measured[field]=Math.max(measured[field]||0,result.confidence[field]!);
 return measured;
}

export function mergeIneReadings(original:IneReading,processed:IneReading):IneOcrResult{
 const result:IneOcrResult={values:{},status:{}};
 for(const field of identityKeys){
  const a=original.values[field],b=processed.values[field];
  if(a&&b&&normalizeIneValue(a)!==normalizeIneValue(b)){
   // This is a form suggestion, not approval evidence. Keep the observed
   // candidate for correction while the two original readings stay unchanged.
   Object.assign(result.values,{[field]:(processed.confidence[field]||0)>=(original.confidence[field]||0)?b:a});
   result.status[field]='Revisar';continue;
  }
  const value=b||a;if(!value)continue;
  Object.assign(result.values,{[field]:value});
  result.status[field]=a&&b&&(original.confidence[field]||0)>=INE_MIN_CONFIDENCE&&(processed.confidence[field]||0)>=INE_MIN_CONFIDENCE?'Reconocido':'Revisar';
 }
 return result;
}

export function selectFocusedCurp(first:{text:string;confidence:number},second:{text:string;confidence:number}){
 const value=extractIneZoneCandidates('curp',first.text,second.text).values.curp;
 const confidence=Math.min(first.confidence,second.confidence);
 if(value&&confidence>=25)return {value,confidence};
}

export function selectBestFocusedCurp(pairs:readonly {value:string;confidence:number}[]){
 if(!pairs.length)return;
 const best=pairs.reduce((a,b)=>a.confidence>=b.confidence?a:b);
 return {...best,confidence:new Set(pairs.map(pair=>pair.value)).size===1?best.confidence:0};
}

// The final CURP position is numeric. Re-read its actual glyph instead of
// substituting a similar-looking letter or using the applicant's declaration.
export function planCurpDigitRetry(page:Pick<Page,'text'|'blocks'>){
 const raw=page.text.toUpperCase().replace(/\s/g,'');
 if(!/^[A-ZÑ&0-9]{17}[A-Z]$/.test(raw))return;
 const probe=raw.slice(0,17)+'0';
 if(!extractIneZoneCandidates('curp',probe,probe).values.curp)return;
 const symbols=(page.blocks||[]).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words.flatMap(word=>word.symbols||[]))))
  .filter(symbol=>/^[A-ZÑ&0-9]$/.test(symbol.text.toUpperCase()));
 if(symbols.map(symbol=>symbol.text.toUpperCase()).join('')!==raw)return;
 const box=symbols.at(-1)?.bbox;if(!box||box.x1<=box.x0||box.y1<=box.y0)return;
 return {prefix:raw.slice(0,17),box};
}
async function retryCurpDigit(worker:OcrWorker,source:HTMLCanvasElement,page:Page,mode:PSM,whitelist:string){
 const retry=planCurpDigitRetry(page);if(!retry)return page;
 const {PSM}=await import('tesseract.js'),digits:{text:string;confidence:number}[]=[];
 try{
  await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_CHAR,tessedit_char_whitelist:'0123456789'});
  const h=retry.box.y1-retry.box.y0,pad=Math.max(2,Math.round(h*.08));
  const left=Math.max(0,retry.box.x0-pad),top=Math.max(0,retry.box.y0-pad);
  const width=Math.min(source.width-left,retry.box.x1-retry.box.x0+2*pad),height=Math.min(source.height-top,h+2*pad);
  for(const threshold of [null,110]){
   const canvas=document.createElement('canvas');const border=Math.ceil(height*.4);canvas.width=width*2+2*border;canvas.height=height*2+2*border;
   const context=canvas.getContext('2d',{willReadFrequently:true})!;context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(source,left,top,width,height,border,border,width*2,height*2);
   if(threshold!==null){const pixels=context.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,v=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722<threshold?0:255;d[i]=d[i+1]=d[i+2]=v}context.putImageData(pixels,0,0)}
   const result=(await worker.recognize(canvas)).data;digits.push({text:result.text.trim(),confidence:result.confidence});
  }
  if(digits.every(digit=>/^\d$/.test(digit.text)&&digit.confidence>=25)&&digits[0].text===digits[1].text){
   const value=retry.prefix+digits[0].text;
   if(extractIneZoneCandidates('curp',value,value).values.curp)return {text:value,confidence:Math.min(page.confidence,...digits.map(digit=>digit.confidence))};
  }
  return page;
 }finally{await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:whitelist})}
}

// Re-read the printed CURP as a line, without using the applicant's declaration
// as a hint. Two agreeing crops are required before replacing the page reading.
async function focusedCurp(worker:OcrWorker,file:Blob,blocks:Block[]|null|undefined){
 const bitmap=await createImageBitmap(file);
 try{
  const area=planIneCurpRegion(blocks,bitmap.width,bitmap.height);if(!area)return;
  const left=Math.floor(area.left*bitmap.width),top=Math.floor(area.top*bitmap.height);
  const width=Math.min(bitmap.width-left,Math.ceil(area.width*bitmap.width)),height=Math.min(bitmap.height-top,Math.ceil(area.height*bitmap.height));
  const {PSM}=await import('tesseract.js');
  const pairs:{value:string;confidence:number}[]=[];
  for(const scale of [1,2])for(const mode of [PSM.SINGLE_LINE,PSM.RAW_LINE]){
   // RAW_LINE avoids the word segmentation that can merge the final glyph.
   // Its whitelist must remain disabled: Tesseract otherwise reports zero
   // confidence for some mixed letter/number identifiers.
   await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:mode===PSM.RAW_LINE?'':'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ&0123456789'});
   const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
   const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(bitmap,left,top,width,height,0,0,canvas.width,canvas.height);
   const first=await retryCurpDigit(worker,canvas,(await worker.recognize(canvas,{}, {blocks:true})).data,mode,mode===PSM.RAW_LINE?'':'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ&0123456789');
   const pixels=context.getImageData(0,0,canvas.width,canvas.height);
   for(let i=0;i<pixels.data.length;i+=4){const gray=Math.round(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=gray}
   context.putImageData(pixels,0,0);const second=await retryCurpDigit(worker,canvas,(await worker.recognize(canvas,{}, {blocks:true})).data,mode,mode===PSM.RAW_LINE?'':'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ&0123456789');
   const found=selectFocusedCurp(first,second);if(found)pairs.push(found);
  }
  if((selectBestFocusedCurp(pairs)?.confidence||0)<INE_MIN_CONFIDENCE){
   await worker.setParameters({tessedit_pageseg_mode:PSM.RAW_LINE,tessedit_char_whitelist:''});
   for(const scale of [1,2]){
    const readings:{text:string;confidence:number}[]=[];
    for(const threshold of [110,145]){
     const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
     const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(bitmap,left,top,width,height,0,0,canvas.width,canvas.height);
     const pixels=context.getImageData(0,0,canvas.width,canvas.height);
     for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data;const level=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722<threshold?0:255;d[i]=d[i+1]=d[i+2]=level}
     context.putImageData(pixels,0,0);readings.push((await worker.recognize(canvas)).data);
    }
    const found=selectFocusedCurp(readings[0],readings[1]);if(found)pairs.push(found);
   }
  }
  return selectBestFocusedCurp(pairs);
 }finally{bitmap.close();await worker.setParameters({tessedit_char_whitelist:''})}
}

export function createIneReader(){
 let closed=false,ocr:OcrWorker|undefined,initializing:Promise<OcrWorker>|undefined;
 let currentProgress:(message:string)=>void=()=>{};
 let imageWorker:Worker|undefined;
 const pending=new Map<string,{resolve:(v:{blob:Blob;binaryBlob:Blob;warnings:string[]})=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 const cancelled=()=>closed;
 const abort=()=>new DOMException('Análisis cancelado.','AbortError');
 async function ensure(){
  if(closed)throw abort();
  if(!initializing)initializing=(async()=>{
   const {createWorker}=await import('tesseract.js');
   const worker=await createWorker('spa',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',logger:m=>{if(!closed&&m.status==='recognizing text')currentProgress(`Leyendo texto… ${Math.round((m.progress||0)*100)} %`)}});
   if(closed){await worker.terminate();throw abort()}
   ocr=worker;return worker;
  })();
  return initializing;
 }
 function preprocess(file:File){
  if(!imageWorker){
   imageWorker=new Worker('/ocr/ine-preprocess-worker.js');
   imageWorker.onmessage=({data})=>{const entry=pending.get(data.id);if(!entry)return;clearTimeout(entry.timer);pending.delete(data.id);if(data.error)entry.reject(Error(data.error));else entry.resolve({blob:data.blob,binaryBlob:data.binaryBlob,warnings:data.warnings})};
   imageWorker.onerror=()=>{for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('No se pudo iniciar el procesamiento de imagen.'))}pending.clear()};
  }
  return new Promise<{blob:Blob;binaryBlob:Blob;warnings:string[]}>((resolve,reject)=>{
   const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(Error('La mejora de imagen tardó demasiado.'))},60000);
   pending.set(id,{resolve,reject,timer});imageWorker!.postMessage({id,file});
  });
 }
 return {
  async readZone(file:File,zone:IneZone):Promise<IneOcrResult>{
   const worker=await ensure(),{PSM}=await import('tesseract.js');
   const bitmap=await createImageBitmap(file);
   try{
    const scale=Math.min(1,2400/bitmap.width),canvas=document.createElement('canvas');
    canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const mode of zone==='curp'?[PSM.SINGLE_LINE,PSM.RAW_LINE]:[zone==='domicilio'?PSM.SINGLE_BLOCK:PSM.SINGLE_LINE]){
     context.drawImage(bitmap,0,0,canvas.width,canvas.height);
     await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:zone==='curp'&&mode!==PSM.RAW_LINE?'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ&0123456789':zone==='fechaNacimiento'?'0123456789/.- ':''});
     const first=(await worker.recognize(canvas)).data;if(closed)throw abort();
     const pixels=context.getImageData(0,0,canvas.width,canvas.height);
     for(let i=0;i<pixels.data.length;i+=4){const gray=Math.round(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=gray}
     context.putImageData(pixels,0,0);
     const second=(await worker.recognize(canvas)).data;if(closed)throw abort();
     const result=first.confidence>=25&&second.confidence>=25?extractIneZoneCandidates(zone,first.text,second.text):{values:{},status:{}};
     if(Object.keys(result.values).length)return result;
    }
    return {values:{},status:{}};
   }finally{bitmap.close()}
  },
  async read(file:File,progress:(message:string)=>void=()=>{}):Promise<{evidence:IneEvidence;candidates:IneOcrResult;diagnostics?:IneReadDiagnostics}>{
   currentProgress=progress;
   progress('Preparando lectura local…');const worker=await ensure();
   const {PSM}=await import('tesseract.js');await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,user_defined_dpi:'300',tessedit_char_whitelist:''});
   const [first,enhanced]=await Promise.all([worker.recognize(file,{}, {blocks:true}),preprocess(file)]);
   if(closed)throw abort();
   const firstBlocks=await recoverIneCriticalBlocks(worker,file,first.data.blocks,cancelled);
   let a=extractIneCandidates(first.data.text);
   try{a=await supplementIneScan(worker,file,a,cancelled,firstBlocks)}catch{if(closed)throw abort()}
   const original={values:a.values,confidence:readingConfidences(a,firstBlocks)};
   const originalCurp=await focusedCurp(worker,file,firstBlocks);
   if(originalCurp){const conflict=original.values.curp&&original.values.curp!==originalCurp.value;original.values.curp=originalCurp.value;original.confidence.curp=conflict?0:originalCurp.confidence}
   progress('Comparando con la imagen corregida…');
   await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
   const second=await worker.recognize(enhanced.blob,{}, {blocks:true});
   if(closed)throw abort();
   const secondBlocks=await recoverIneCriticalBlocks(worker,enhanced.blob,second.data.blocks,cancelled);
   let b=extractIneCandidates(second.data.text);
   try{b=await supplementIneScan(worker,new File([enhanced.blob],'lectura.png',{type:'image/png'}),b,cancelled,secondBlocks)}catch{if(closed)throw abort()}
   if(closed)throw abort();
   const processed={values:b.values,confidence:readingConfidences(b,secondBlocks)};
   await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
   const binary=await worker.recognize(enhanced.binaryBlob,{}, {blocks:true});if(closed)throw abort();
   const alternate=extractIneCandidates(binary.data.text),alternateConfidence=fieldConfidences(alternate.values,binary.data.blocks);
   for(const field of identityKeys){
    const primary=processed.values[field],other=alternate.values[field];
    if(!primary&&other){Object.assign(processed.values,{[field]:other});processed.confidence[field]=alternateConfidence[field]||0}
    else if(primary&&other&&normalizeIneValue(primary)!==normalizeIneValue(other))processed.confidence[field]=0;
   }
   const processedCurp=await focusedCurp(worker,enhanced.blob,secondBlocks);
   if(processedCurp){const conflict=processed.values.curp&&processed.values.curp!==processedCurp.value;processed.values.curp=processedCurp.value;processed.confidence.curp=conflict?0:processedCurp.confidence}
   return {evidence:{original,processed,warnings:enhanced.warnings},candidates:mergeIneReadings(original,processed),diagnostics:{original:diagnoseIneReading(first.data.text,original),processed:diagnoseIneReading(second.data.text+'\n'+binary.data.text,processed),warnings:enhanced.warnings}};
  },
  async close(){
   closed=true;imageWorker?.terminate();
   for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(abort())}pending.clear();
   if(ocr)await ocr.terminate().catch(()=>{});
  },
 };
}
export type IneReader=ReturnType<typeof createIneReader>;
