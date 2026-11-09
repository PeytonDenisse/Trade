import {fieldConfidences} from './ine-confidence';
import type {Block,Worker} from 'tesseract.js';
import {extractIneCandidates,extractIneZoneCandidates,parseIneLocality,type IneOcrResult} from './ine-ocr-parse';
import type {IneIdentity} from './ine-identity';

type Region={left:number;top:number;width:number;height:number};
type Scan={field:keyof IneIdentity;label:string;anchor?:Region;value:Region;scale?:number};
type Box={x0:number;y0:number;x1:number;y1:number};
type Word={text:string;confidence:number;bbox:Box};
type Anchor={box:Box;confidence:number};

// INE's published catalogue of entity abbreviations. Unknown tokens stay pending.


// The existing labeled fallback also covers scans without word coordinates.
const fallbackRegions:Scan[]=[
  {field:'curp',label:'CURP',anchor:{left:.05,top:.77,width:.48,height:.10},value:{left:.05,top:.81,width:.46,height:.075}},
  {field:'fechaNacimiento',label:'FECHA DE NACIMIENTO',anchor:{left:.05,top:.86,width:.36,height:.105},value:{left:.05,top:.905,width:.29,height:.065}},
  {field:'vigencia',label:'VIGENCIA',anchor:{left:.57,top:.85,width:.31,height:.11},value:{left:.58,top:.90,width:.26,height:.07}},
];
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'');
const labels:Partial<Record<keyof IneIdentity,string[]>>={
  nombres:['NOMBRE'],sexo:['SEXO','GENERO'],calleNumero:['DOMICILIO','DOMICILO'],curp:['CURP'],
  fechaNacimiento:['FECHANACIMIENTO','FECHADENACIMIENTO'],vigencia:['VIGENCIA'],
};
function matchesScanLabel(field:keyof IneIdentity,text:string){
  const compact=fold(text);
  return Boolean(labels[field]?.includes(compact))||(field==='fechaNacimiento'&&/^FECHA(?:DE)?NACIMI(?:E(?:N(?:T(?:O)?)?)?)?$/.test(compact));
}

function wordsIn(blocks:Block[]|null|undefined):Word[][]{
  return (blocks||[]).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.map(line=>line.words.map(word=>({text:word.text,confidence:word.confidence,bbox:word.bbox})))));
}
function anchorFor(lines:Word[][],field:keyof IneIdentity):Anchor|undefined{
  const expected=labels[field];if(!expected)return;
  let best:Anchor|undefined;
  for(const words of lines)for(let i=0;i<words.length;i++)for(let count=1;count<=3&&i+count<=words.length;count++){
    const group=words.slice(i,i+count);
    if(!matchesScanLabel(field,group.map(word=>word.text).join(''))||group.some(word=>word.confidence<45))continue;
    if(group.some((word,index)=>index>0&&word.bbox.x0-group[index-1].bbox.x1>2*(word.bbox.y1-word.bbox.y0)))continue;
    const ratio=(group.at(-1)!.bbox.x1-group[0].bbox.x0)/(Math.max(...group.map(word=>word.bbox.y1))-Math.min(...group.map(word=>word.bbox.y0)));
    if(field==='calleNumero'&&(ratio<3||ratio>10))continue;
    if(field==='curp'&&(ratio<1.6||ratio>6))continue;
    const confidence=Math.min(...group.map(word=>word.confidence));
    if(best&&best.confidence>=confidence)continue;
    best={box:{x0:group[0].bbox.x0,y0:Math.min(...group.map(word=>word.bbox.y0)),x1:group.at(-1)!.bbox.x1,y1:Math.max(...group.map(word=>word.bbox.y1))},confidence};
  }
  return best;
}
function region(x:number,y:number,width:number,height:number,imageWidth:number,imageHeight:number):Region{
  const left=Math.max(0,Math.min(imageWidth-1,Math.round(x)));
  const top=Math.max(0,Math.min(imageHeight-1,Math.round(y)));
  return {left:left/imageWidth,top:top/imageHeight,width:Math.max(1,Math.min(imageWidth-left,Math.round(width)))/imageWidth,height:Math.max(1,Math.min(imageHeight-top,Math.round(height)))/imageHeight};
}
function nameRows(lines:Word[][],anchor:Anchor):Word[][]{
  const {x0,y0,y1}=anchor.box,h=y1-y0;
  const words=lines.flat().filter(word=>word.bbox.x0>=x0-h&&word.bbox.x1<=x0+11*h&&word.bbox.y0>=y0+.85*h&&word.bbox.y0<y0+5*h)
    .sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0);
  const rows:Word[][]=[];
  for(const word of words){
    const row=rows.at(-1);
    if(row&&word.bbox.y0-row[0].bbox.y0<=h*.25)row.push(word);
    else rows.push([word]);
  }
  return rows;
}

/** Crop positions follow detected labels rather than a particular photograph. */
export function planIneScans(blocks:Block[]|null|undefined,imageWidth:number,imageHeight:number):Scan[]{
  const lines=wordsIn(blocks);const scans:Scan[]=[];
  for(const field of ['nombres','calleNumero','fechaNacimiento','vigencia','curp'] as const){
    const anchor=anchorFor(lines,field);if(!anchor)continue;
    const rows=field==='nombres'?nameRows(lines,anchor):[];
    if(field==='nombres'&&rows.length<2)continue;
    const {x0,y0,x1,y1}=anchor.box;const h=y1-y0,w=x1-x0;
    if(h<12||h>imageHeight*.12)continue;
    const firstRowTop=rows[0]?.[0]?.bbox.y0??0,secondRowTop=rows[1]?.[0]?.bbox.y0??0;
    const rowGap=secondRowTop-firstRowTop;
    const tight=rowGap<h*.8;
    const secondRowBottom=Math.max(...(rows[1]||[]).map(word=>word.bbox.y1));
    const givenTop=Math.max(secondRowBottom-.3*h,secondRowTop+.85*rowGap);
    const givenRow=(rows[2]||[]).filter(word=>/^[\p{L}'’\-]+$/u.test(word.text)).sort((a,b)=>a.bbox.x0-b.bbox.x0);
    const givenWords:Word[]=[];
    for(const word of givenRow){if(givenWords.length&&word.bbox.x0-givenWords.at(-1)!.bbox.x1>1.5*h)break;givenWords.push(word)}
    const printedName=field==='nombres'&&givenWords.length?{x0:givenWords[0].bbox.x0,y0:Math.min(...givenWords.map(word=>word.bbox.y0)),x1:givenWords.at(-1)!.bbox.x1,y1:Math.max(...givenWords.map(word=>word.bbox.y1))}:undefined;
    const printedDate=field==='fechaNacimiento'?lines.flat().filter(word=>/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}$/.test(word.text)
      &&word.bbox.x0>=x0-h&&word.bbox.x1<=x0+10*h&&word.bbox.y0>=y1-h*.1&&word.bbox.y1<=y1+3*h).sort((a,b)=>b.confidence-a.confidence)[0]:undefined;
    const streetRows=field==='calleNumero'?wordsIn(blocks).flat().filter(word=>word.bbox.x0>=x0-h*.5&&word.bbox.x1<x0+20*h&&word.bbox.y0>=y1+h*.1&&word.bbox.y1<=y1+2.2*h&&word.bbox.y1-word.bbox.y0<=h*1.6).sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0):[];
    const streetLines:Word[][]=[];
    for(const word of streetRows){const row=streetLines.find(row=>Math.abs((word.bbox.y0+word.bbox.y1-row[0].bbox.y0-row[0].bbox.y1)/2)<h*.4);if(row)row.push(word);else streetLines.push([word])}
    const streetLine=streetLines.find(row=>{const text=row.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(word=>word.text).join(' ');return !/^(?:COL(?:ONIA)?|C\.?\s*P)\b/i.test(text)&&Boolean(extractIneCandidates('CALLE Y NUMERO: '+text).values.calleNumero)});
    const printedStreet=streetLine?{x0:Math.min(...streetLine.map(word=>word.bbox.x0)),x1:Math.max(...streetLine.map(word=>word.bbox.x1)),y0:Math.min(...streetLine.map(word=>word.bbox.y0)),y1:Math.max(...streetLine.map(word=>word.bbox.y1))}:undefined;
    const value=printedStreet?region(printedStreet.x0-.2*h,printedStreet.y0-.2*h,printedStreet.x1-printedStreet.x0+.4*h,printedStreet.y1-printedStreet.y0+.4*h,imageWidth,imageHeight)
      :printedName?region(printedName.x0-.25*h,printedName.y0-.25*h,printedName.x1-printedName.x0+.5*h,printedName.y1-printedName.y0+.5*h,imageWidth,imageHeight)
      :printedDate?region(printedDate.bbox.x0-.25*h,printedDate.bbox.y0-.25*h,printedDate.bbox.x1-printedDate.bbox.x0+.5*h,printedDate.bbox.y1-printedDate.bbox.y0+.5*h,imageWidth,imageHeight)
      :field==='nombres'?region(x0-(tight?.35:.75)*h,givenTop,tight?2.2*w:11.06*h,Math.min(1.6*h,2.1*rowGap),imageWidth,imageHeight)
      :field==='calleNumero'?region(x0-.3*h,y1+.08*h,16*h,1.6*h,imageWidth,imageHeight)
      :field==='curp'?region(x0-.2*h,y1+.08*h,Math.max(5.8*w,18*h),2.8*h,imageWidth,imageHeight)
      :field==='fechaNacimiento'?region(x0-.2*h,y1+.08*h,10*h,1.8*h,imageWidth,imageHeight)
      :region(x0,y1+.08*h,1.8*w,2.8*h,imageWidth,imageHeight);
    scans.push({field,label:field==='nombres'?'NOMBRES':field==='calleNumero'?'DOMICILIO':field==='fechaNacimiento'?'FECHA DE NACIMIENTO':field.toUpperCase(),value,scale:field==='nombres'&&!tight?3:1});
  }
  // The date heading can disappear from the full-page pass. Locate and
  // verify its own label beside VIGENCIA before reading the value below it.
  if(!scans.some(scan=>scan.field==='fechaNacimiento')){
    const name=anchorFor(lines,'nombres'),validity=anchorFor(lines,'vigencia');
    if(name&&validity&&validity.box.x0>name.box.x0&&validity.box.y0>name.box.y1){
      const h=validity.box.y1-validity.box.y0,nh=name.box.y1-name.box.y0;
      if(h>=12&&h<imageHeight*.12){
        const x=name.box.x0-.33*nh,y=validity.box.y0;
        scans.push({field:'fechaNacimiento',label:'FECHA DE NACIMIENTO',
          anchor:region(x,y-.2*h,Math.min(13*h,validity.box.x0-x),1.5*h,imageWidth,imageHeight),
          value:region(x,validity.box.y1+.08*h,10*h,1.8*h,imageWidth,imageHeight),scale:1});
      }
    }
  }
  return scans;
}

/** Read all address rows together; the single-line street crop omits them. */
export function planIneAddressBlock(blocks:Block[]|null|undefined,imageWidth:number,imageHeight:number):Region|undefined{
  const lines=wordsIn(blocks),anchor=anchorFor(lines,'calleNumero');if(!anchor)return;
  const {x0,y0,y1}=anchor.box,h=y1-y0;if(h<8||h>imageHeight*.12)return;
  // Stop at the following labeled field, including labels in another OCR block.
  const next=lines.flat().filter(word=>word.bbox.x0>=x0-h&&word.bbox.x0<x0+20*h
    &&word.bbox.y0>y1+h*.5&&/^(?:CURP|CLAVE|FECHA|VIGENCIA|SECCION)$/.test(fold(word.text)))
    .sort((a,b)=>a.bbox.y0-b.bbox.y0)[0];
  const bottom=Math.min(y0+7*h,next?next.bbox.y0-.2*h:imageHeight);
  if(bottom<=y1)return;
  return region(x0-.5*h,y1,Math.min(imageWidth-x0,25*h),bottom-y1,imageWidth,imageHeight);
}

export function planIneCurpRegion(blocks:Block[]|null|undefined,imageWidth:number,imageHeight:number):Region|undefined{
  const lines=wordsIn(blocks),anchor=anchorFor(lines,'curp');if(!anchor)return;
  const {x0,x1,y0,y1}=anchor.box,h=y1-y0;
  // The neighboring AÑO DE REGISTRO heading can be a single long OCR word.
  // A value on CURP's own line must look alphanumeric, not merely be long.
  const token=lines.flat().find(word=>{
    const text=word.text.toUpperCase().replace(/[^A-Z0-9Ñ&]/g,'');
    return text.length>=16&&text.length<=22&&(text.match(/\d/g)||[]).length>=4&&/[A-ZÑ&]/.test(text)
    &&word.bbox.x0>=x1&&word.bbox.x0-x1<22*h&&Math.abs((word.bbox.y0+word.bbox.y1-y0-y1)/2)<h*.8;
  });
  if(token)return region(token.bbox.x0-.3*h,token.bbox.y0-.3*h,token.bbox.x1-token.bbox.x0+.6*h,token.bbox.y1-token.bbox.y0+.6*h,imageWidth,imageHeight);
  const next=['fechaNacimiento','vigencia'].map(field=>anchorFor(lines,field as keyof IneIdentity))
    .filter((value):value is Anchor=>Boolean(value&&value.box.y0>y1+h)).sort((a,b)=>a.box.y0-b.box.y0)[0];
  const below=lines.flat().filter(word=>{const text=word.text.toUpperCase().replace(/[^A-Z0-9]/g,'');return text.length>=16&&text.length<=22&&(text.match(/\d/g)||[]).length>=4
    &&word.bbox.x0>=x0-h&&word.bbox.x1<=x0+22*h&&word.bbox.y0>=y1&&word.bbox.y1<(next?.box.y0??y1+3*h);}).sort((a,b)=>a.bbox.y0-b.bbox.y0||b.confidence-a.confidence)[0];
  if(below)return region(below.bbox.x0-.25*h,below.bbox.y0-.25*h,below.bbox.x1-below.bbox.x0+.5*h,below.bbox.y1-below.bbox.y0+.5*h,imageWidth,imageHeight);
  const top=y1+.08*h,bottom=Math.min(y1+2.88*h,next?next.box.y0-.15*h:imageHeight);
  return region(x0-.2*h,top,Math.max(5.8*(x1-x0),18*h),bottom-top,imageWidth,imageHeight);
}

/** The first two high-confidence rows under NOMBRE identify the surnames. */
export function layoutNameCandidates(blocks:Block[]|null|undefined):IneOcrResult{
  const lines=wordsIn(blocks);const anchor=anchorFor(lines,'nombres');
  if(!anchor)return {values:{},status:{}};
  const rows=nameRows(lines,anchor),out:IneOcrResult={values:{},status:{}};
  if(rows.length<2)return out;
  for(const [index,field] of ['apellidoPaterno','apellidoMaterno'].entries()){
    const row=rows[index];
    if(!row||row.length>3||row.some(word=>word.confidence<80))continue;
    const text=row.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(word=>word.text).join(' ');
    const candidate=extractIneCandidates(`APELLIDO ${index===0?'PATERNO':'MATERNO'}: ${text}`);
    if(candidate.values[field as 'apellidoPaterno'|'apellidoMaterno']){
      Object.assign(out.values,{[field]:candidate.values[field as 'apellidoPaterno'|'apellidoMaterno']});
      out.status[field as 'apellidoPaterno'|'apellidoMaterno']='Revisar';
    }
  }
  return out;
}

/** Read the short H, M or NB marker only beside its own right-column label. */
export function layoutGenderCandidate(blocks:Block[]|null|undefined):IneOcrResult{
  const lines=wordsIn(blocks),name=anchorFor(lines,'nombres'),gender=anchorFor(lines,'sexo');
  const out:IneOcrResult={values:{},status:{}};
  if(!name||!gender)return out;
  const h=gender.box.y1-gender.box.y0;
  if(gender.box.x0<name.box.x0+3*h)return out;
  const center=(word:Word)=>(word.bbox.y0+word.bbox.y1)/2;
  const match=lines.flat().filter(word=>word.confidence>=70&&word.bbox.x0>=gender.box.x1
    &&word.bbox.x0-gender.box.x1<2*h&&Math.abs(center(word)-(gender.box.y0+gender.box.y1)/2)<h*.55)
    .sort((a,b)=>a.bbox.x0-b.bbox.x0)[0];
  const marker=match&&fold(match.text);
  if(marker==='H'||marker==='M'||marker==='NB'){
    out.values.sexo=marker;
    out.status.sexo='Revisar';
  }
  return out;
}

/** The labeled second address row contains COL, neighborhood and postal code. */
export function layoutAddressCandidates(blocks:Block[]|null|undefined):IneOcrResult{
  const lines=wordsIn(blocks),anchor=anchorFor(lines,'calleNumero');
  const out:IneOcrResult={values:{},status:{}};
  if(!anchor)return out;
  const {x0,y0,y1}=anchor.box,h=y1-y0;
  const words=lines.flat();
  const prefix=words.find(word=>['COL','COLONIA'].includes(fold(word.text))&&word.confidence>=70
    &&Math.abs(word.bbox.x0-x0)<h&&word.bbox.y0>y0+1.5*h&&word.bbox.y0<y0+5*h);
  if(!prefix)return out;
  const center=(word:Word)=>(word.bbox.y0+word.bbox.y1)/2;
  const postal=words.find(word=>/^\d{5}$/u.test(word.text)&&word.confidence>=80
    &&word.bbox.x0>prefix.bbox.x1&&Math.abs(center(word)-center(prefix))<h);
  if(!postal)return out;
  const between=words.filter(word=>word.bbox.x0>prefix.bbox.x1&&word.bbox.x1<postal.bbox.x0
    &&Math.abs(center(word)-center(prefix))<h&&word.confidence>=70).sort((a,b)=>a.bbox.x0-b.bbox.x0);
  if(!between.length||between.length>5)return out;
  const neighborhood=between.map(word=>word.text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'')).join(' ');
  if(!/^[\p{L}][\p{L} '\-]{2,119}$/u.test(neighborhood))return out;
  const parsed=extractIneCandidates(`COLONIA: ${neighborhood}`);
  const postalResult=extractIneCandidates(`C.P.: ${postal.text}`);
  if(parsed.values.colonia&&postalResult.values.codigoPostal){
    out.values.colonia=parsed.values.colonia;
    out.values.codigoPostal=postalResult.values.codigoPostal;
    out.status.colonia='Revisar';
    out.status.codigoPostal='Revisar';
  }
  return out;
}

/** An unlabelled municipality/state row needs a second OCR reading before use. */
export function layoutMunicipalityEvidence(blocks:Block[]|null|undefined):{candidate:IneOcrResult;box:Box;folded:string}|undefined{
  const lines=wordsIn(blocks),anchor=anchorFor(lines,'calleNumero');
  if(!anchor)return;
  const {x0,y0,y1}=anchor.box,h=y1-y0,words=lines.flat();
  const next=words.filter(word=>word.bbox.x0>=x0-h&&word.bbox.x0<x0+25*h&&word.bbox.y0>y1+h*.5
    &&/^(?:CLAVE|CURP|FECHA|VIGENCIA|SECCION)$/.test(fold(word.text))).sort((a,b)=>a.bbox.y0-b.bbox.y0)[0];
  const candidates=words.filter(word=>word.confidence>=55&&word.bbox.x0>=x0-h&&word.bbox.x1<x0+25*h
    &&word.bbox.y0>y1+.5*h&&word.bbox.y0<Math.min(y0+8*h,next?.bbox.y0??Infinity))
    .sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0);
  const rows:Word[][]=[];
  for(const word of candidates){
    const row=rows.find(row=>Math.abs((word.bbox.y0+word.bbox.y1-row[0].bbox.y0-row[0].bbox.y1)/2)<h*.6);
    if(row)row.push(word);else rows.push([word]);
  }
  for(const row of rows){
    const sorted=row.sort((a,b)=>a.bbox.x0-b.bbox.x0),text=sorted.map(word=>word.text).join(' ');
    const locality=parseIneLocality(text);if(!locality)continue;
    const candidate:IneOcrResult={values:locality,status:{municipio:'Revisar',estado:'Revisar'}};
    return {candidate,folded:fold(text),box:{
      x0:Math.min(...row.map(word=>word.bbox.x0)),y0:Math.min(...row.map(word=>word.bbox.y0)),
      x1:Math.max(...row.map(word=>word.bbox.x1)),y1:Math.max(...row.map(word=>word.bbox.y1)),
    }};
  }
}

export function curpMatchesOcrFields(curp:string,date?:string,sex?:string):boolean{
  return (!date||curp.slice(4,10)===date.slice(2).replaceAll('-',''))&&(!sex||sex==='NB'||curp[10]===sex);
}

export function consensusCandidate(candidates:readonly string[]):string|undefined{
  return candidates.length>=2&&new Set(candidates).size===1?candidates[0]:undefined;
}


function crop(image:ImageBitmap,area:Region,enhance:boolean|'gray'|'ink'|'ink-light',scale=3):HTMLCanvasElement{
  const left=Math.max(0,Math.floor(image.width*area.left)),top=Math.max(0,Math.floor(image.height*area.top));
  const width=Math.max(1,Math.min(image.width-left,Math.ceil(image.width*area.width)));
  const height=Math.max(1,Math.min(image.height-top,Math.ceil(image.height*area.height)));
  const canvas=document.createElement('canvas');
  canvas.width=width*scale;canvas.height=height*scale;
  const context=canvas.getContext('2d',{willReadFrequently:Boolean(enhance)});
  if(!context)throw new Error('No se pudo preparar la imagen para OCR.');
  context.drawImage(image,left,top,width,height,0,0,canvas.width,canvas.height);
  if(enhance){
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    if(enhance===true){
      const histogram=new Uint32Array(256);
      for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data;histogram[Math.round(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)]++}
      const total=pixels.data.length/4;
      let cumulative=0,low=0,high=255;
      for(let i=0;i<256;i++){cumulative+=histogram[i];if(cumulative>=total*.02){low=i;break}}
      cumulative=0;
      for(let i=255;i>=0;i--){cumulative+=histogram[i];if(cumulative>=total*.02){high=i;break}}
      const range=Math.max(1,high-low);
      for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data;const gray=Math.max(0,Math.min(255,Math.round((d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722-low)*255/range)));d[i]=gray;d[i+1]=gray;d[i+2]=gray}
    }else{
      for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data;const gray=Math.round(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722);const level=enhance==='ink'||enhance==='ink-light'?(gray<(enhance==='ink'?110:145)?0:255):gray;d[i]=level;d[i+1]=level;d[i+2]=level}
    }
    context.putImageData(pixels,0,0);
  }
  return canvas;
}

// A missing page label is re-read locally before any field value is accepted.
// This region only locates headings; it never supplies a value from coordinates alone.
export async function recoverIneCriticalBlocks(worker:Worker,file:Blob,blocks:Block[]|null|undefined,cancelled:()=>boolean):Promise<Block[]>{
 const original=blocks||[],has=(source:Block[],field:keyof IneIdentity)=>Boolean(anchorFor(wordsIn(source),field));
 const footer=['curp','fechaNacimiento','vigencia'] as const;
 if(footer.every(field=>has(original,field))&&has(original,'calleNumero'))return original;
 const image=await createImageBitmap(file);
 try{
  if(image.width<600||image.height<600)return original;
  const {PSM}=await import('tesseract.js'),scale=2;
  const recovered:Block[]=[...original];
  const searches:{area:Region;fields:readonly (keyof IneIdentity)[];variants:readonly ('ink'|'gray')[]}[]=[{area:{left:.28,top:.68,width:.70,height:.30},fields:footer,variants:['ink','gray'] as const},
   {area:{left:.28,top:.44,width:.46,height:.28},fields:['calleNumero'] as const,variants:['gray','ink'] as const}];
  for(const {area,fields,variants} of searches){
   for(const enhance of variants){
    if(cancelled()||fields.every(field=>has(recovered,field)))break;
    const existing=new Set((['curp','fechaNacimiento','vigencia','calleNumero','nombres'] as const).filter(field=>has(recovered,field)));
    const left=Math.floor(image.width*area.left),top=Math.floor(image.height*area.top);
    await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,tessedit_char_whitelist:''});
    const data=(await worker.recognize(crop(image,area,enhance,scale),{}, {blocks:true})).data;
    if(cancelled())break;
    // A low-score heading can still have a good box. Verify that small
    // heading twice before trusting it, rather than using a distorted box.
    for(const word of (data.blocks||[]).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words)))){
     const field=matchesScanLabel('curp',word.text)?'curp':matchesScanLabel('calleNumero',word.text)?'calleNumero':undefined;
     if(!field||!fields.includes(field))continue;
     const expected=field==='curp'?/^CURP$/:/^DOMICILI?O$/,minimumRatio=field==='curp'?1.6:3,maximumRatio=field==='curp'?6:10;
     const box=word.bbox,h=(box.y1-box.y0)/scale,w=(box.x1-box.x0)/scale;
     if(word.confidence>=45&&w/h>=minimumRatio&&w/h<=maximumRatio)continue;
     if(w/h>maximumRatio||w/h<.5)continue;
     const fontHeight=w/h>=minimumRatio?h:w/(field==='curp'?2.5:5);
     const areas=w/h>=minimumRatio?[region(left+box.x0/scale-.2*h,top+box.y0/scale-.2*h,w+.4*h,h*1.4,image.width,image.height)]
      :[1.35,1.6,1.1].map(offset=>region(left+box.x0/scale-.1*fontHeight,top+box.y1/scale-offset*fontHeight,w+.2*fontHeight,1.15*fontHeight,image.width,image.height));
     for(const area of areas){
      if(cancelled())break;
      await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE});
      const pair=[];
      for(const variant of [false,'gray'] as const){pair.push((await worker.recognize(crop(image,area,variant,2),{}, {blocks:true})).data);if(cancelled())break}
      if(pair.length===2&&pair.every(reading=>expected.test(fold(reading.text))&&reading.confidence>=45)){
       word.confidence=Math.min(...pair.map(reading=>reading.confidence));
       const verified=(pair[0].blocks||[]).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words))).find(candidate=>expected.test(fold(candidate.text)))?.bbox;
       word.bbox=verified?{x0:(area.left*image.width+verified.x0/2-left)*scale,y0:(area.top*image.height+verified.y0/2-top)*scale,x1:(area.left*image.width+verified.x1/2-left)*scale,y1:(area.top*image.height+verified.y1/2-top)*scale}
        :{x0:(area.left*image.width-left)*scale,y0:(area.top*image.height-top)*scale,x1:((area.left+area.width)*image.width-left)*scale,y1:((area.top+area.height)*image.height-top)*scale};break;
      }
     }
    }
    const keep=(word:Word)=>!((existing.has('curp')&&fold(word.text)==='CURP')
     ||(existing.has('fechaNacimiento')&&/^(?:FECHA|NACIMI|FECHADENACIMI)/.test(fold(word.text)))
     ||(existing.has('vigencia')&&fold(word.text)==='VIGENCIA')
     ||(existing.has('calleNumero')&&/^DOMICILI?O$/.test(fold(word.text)))
     ||(existing.has('nombres')&&fold(word.text)==='NOMBRE'));
    for(const block of data.blocks||[])recovered.push({...block,paragraphs:block.paragraphs.map(paragraph=>({...paragraph,lines:paragraph.lines.map(line=>({...line,words:line.words.filter(keep).map(word=>({...word,bbox:{x0:left+word.bbox.x0/scale,y0:top+word.bbox.y0/scale,x1:left+word.bbox.x1/scale,y1:top+word.bbox.y1/scale}}))}))}))});
   }
  }
  return recovered;
 }finally{image.close()}
}

export async function supplementIneScan(worker:Worker,file:File,base:IneOcrResult,cancelled:()=>boolean,blocks?:Block[]|null):Promise<IneOcrResult>{
  if(typeof createImageBitmap!=='function')return base;
  const {PSM}=await import('tesseract.js');
  const merged:IneOcrResult={values:{...base.values},status:{...base.status},confidence:{...fieldConfidences(base.values,blocks),...base.confidence}};
  const image=await createImageBitmap(file);
  try{
    if(image.width<600||image.height<600)return merged;
    const addressBlock=planIneAddressBlock(blocks,image.width,image.height);
    if(addressBlock&&['calleNumero','colonia','codigoPostal','municipio','estado'].some(field=>!merged.values[field as keyof IneIdentity])){
      await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
      const first=(await worker.recognize(crop(image,addressBlock,false,2))).data;
      if(cancelled())return merged;
      const second=(await worker.recognize(crop(image,addressBlock,'gray',2))).data;
      if(cancelled())return merged;
      const found=first.confidence>=25&&second.confidence>=25?extractIneZoneCandidates('domicilio',first.text,second.text):{values:{},status:{}} as IneOcrResult;
      for(const field of ['calleNumero','colonia','codigoPostal','municipio','estado'] as const)if(!merged.values[field]&&found.values[field]){
        merged.values[field]=found.values[field];merged.status[field]='Revisar';
      }
    }
    const names=layoutNameCandidates(blocks);
    for(const field of ['apellidoPaterno','apellidoMaterno'] as const)if(!merged.values[field]&&names.values[field]){merged.values[field]=names.values[field];merged.status[field]='Revisar'}
    const gender=layoutGenderCandidate(blocks);
    if(!merged.values.sexo&&gender.values.sexo){merged.values.sexo=gender.values.sexo;merged.status.sexo='Revisar'}
    const address=layoutAddressCandidates(blocks);
    for(const field of ['colonia','codigoPostal'] as const)if(!merged.values[field]&&address.values[field]){merged.values[field]=address.values[field];merged.status[field]='Revisar'}
    const municipality=layoutMunicipalityEvidence(blocks);
    if(municipality&&(!merged.values.municipio||!merged.values.estado)){
      const h=municipality.box.y1-municipality.box.y0;
      const area=region(municipality.box.x0-.3*h,municipality.box.y0-.25*h,
        municipality.box.x1-municipality.box.x0+.6*h,1.5*h,image.width,image.height);
      await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE});
      const raw=(await worker.recognize(crop(image,area,false,1))).data;
      if(cancelled())return merged;
      const gray=(await worker.recognize(crop(image,area,'gray',1))).data;
      if(cancelled())return merged;
      const firstLocality=parseIneLocality(raw.text.trim()),secondLocality=parseIneLocality(gray.text.trim());
      const same=(value:ReturnType<typeof parseIneLocality>)=>value&&value.municipio.toUpperCase()===municipality.candidate.values.municipio?.toUpperCase()&&value.estado===municipality.candidate.values.estado;
      if(raw.confidence>=55&&gray.confidence>=55&&same(firstLocality)&&same(secondLocality)){
        for(const field of ['municipio','estado'] as const)if(!merged.values[field]&&municipality.candidate.values[field]){
          merged.values[field]=municipality.candidate.values[field];merged.status[field]='Revisar';
        }
      }
    }
    for(const {field,label,anchor,value,scale} of [...planIneScans(blocks,image.width,image.height),...fallbackRegions]){
      if(cancelled())break;
      if(merged.values[field])continue;
      if(anchor){
        await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
        const anchorText=(await worker.recognize(crop(image,anchor,false,2))).data.text;
        if(cancelled())break;
        const foundLabel=(text:string)=>field==='fechaNacimiento'?/FECHA(?:DE)?NACIMI(?:E(?:N(?:T(?:O)?)?)?)?/.test(fold(text)):fold(text).includes(fold(label));
        if(!foundLabel(anchorText)){
          const enhanced=(await worker.recognize(crop(image,anchor,true))).data.text;
          if(cancelled())break;
          if(!foundLabel(enhanced))continue;
        }
      }
      await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE});
      const recognized=(await worker.recognize(crop(image,value,field==='curp'?'gray':false,scale),{}, {blocks:true})).data;
      if(cancelled())break;
      if(field==='curp'){
        const narrower=region(value.left*image.width,value.top*image.height,value.width*image.width-value.height*image.height*.015,value.height*image.height*.985,image.width,image.height);
        const widened=region(value.left*image.width,value.top*image.height-value.height*image.height*.14,value.width*image.width+value.height*image.height*.14,value.height*image.height*1.21,image.width,image.height);
        const readings=[recognized];
        for(const area of [narrower,widened]){
          readings.push((await worker.recognize(crop(image,area,'gray',scale),{}, {blocks:true})).data);
          if(cancelled())break;
        }
        if(cancelled())break;
        const candidates=readings.filter(reading=>reading.confidence>=25).map(reading=>extractIneCandidates(`CURP\n${reading.text}`).values.curp).filter((found):found is string=>Boolean(found));
        const agreed=consensusCandidate(candidates);
        if(agreed&&curpMatchesOcrFields(agreed,merged.values.fechaNacimiento,merged.values.sexo)){merged.values.curp=agreed;merged.status.curp='Revisar'}
        continue;
      }
      if(field==='nombres'||field==='calleNumero'||field==='fechaNacimiento'){
        const readings=[recognized];
        const shifted=(fraction:number)=>region(value.left*image.width,value.top*image.height+value.height*image.height*fraction,
          value.width*image.width,value.height*image.height,image.width,image.height);
        const areas=field==='nombres'?[value,shifted(-.03)]
          :field==='fechaNacimiento'?[value,shifted(-.03),shifted(.03)]:[value];
        for(const [index,area] of areas.entries()){
          if(index)readings.push((await worker.recognize(crop(image,area,false,scale),{}, {blocks:true})).data);
          readings.push((await worker.recognize(crop(image,area,'gray',scale),{}, {blocks:true})).data);
          if(cancelled())break;
        }
        if(cancelled())break;
        if(field==='fechaNacimiento'&&!consensusCandidate(readings.filter(reading=>reading.confidence>=25).map(reading=>extractIneCandidates(`${label}\n${reading.text}`).values[field]).filter((value):value is string=>Boolean(value))))for(const enhance of ['ink','ink-light'] as const){
          readings.push((await worker.recognize(crop(image,value,enhance,scale),{}, {blocks:true})).data);
          if(cancelled())break;
        }
        if(cancelled())break;
        const candidates=readings.filter(reading=>reading.confidence>=25)
          .map(reading=>extractIneCandidates(`${label}\n${reading.text}`).values[field])
          .filter((found):found is string=>Boolean(found));
        const agreed=consensusCandidate(candidates);
        if(agreed){
          Object.assign(merged.values,{[field]:agreed});
          merged.status[field]='Revisar';
          const measured=readings.filter(reading=>extractIneCandidates(`${label}\n${reading.text}`).values[field]===agreed)
            .map(reading=>fieldConfidences({[field]:agreed},reading.blocks)[field]||0).sort((a,b)=>b-a);
          // Require two matching measurements; a weaker extra crop does not erase them.
          merged.confidence![field]=measured.length>=2?measured[1]:0;
        }
        continue;
      }
      if(recognized.confidence<25)continue;
      const candidate=extractIneCandidates(`${label}\n${recognized.text}`);
      const found=candidate.values[field];
      if(found){
        Object.assign(merged.values,{[field]:found});
        merged.status[field]='Revisar';
      }
    }
  }finally{image.close()}
  return merged;
}
