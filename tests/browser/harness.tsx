import {recoverIneCriticalBlocks,planIneScans,supplementIneScan} from '../../lib/ine-ocr-image';
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AutomaticIneReview} from '../../components/admin/automatic-ine-review';
import {IneIdentityCapture} from '../../components/trade/ine-identity-capture';
import {IneImageEditor} from '../../components/trade/ine-image-editor';
import {createIneReader} from '../../lib/ine-reader';
import {emptyIneDraft} from '../../lib/ine-identity';
import {identityKeys,normalizeIneValue,evaluateIne} from '../../lib/ine-analysis';
import '../../app/globals.css';
import '../../app/mockup.css';

const synthetic={nombres:'ANA MARIA',apellidoPaterno:'GARCIA',apellidoMaterno:'LOPEZ',fechaNacimiento:'1956-12-31',sexo:'M' as const,curp:'GALA561231MDFRPN79',calleNumero:'CALLE FICTICIA 10',colonia:'CENTRO',codigoPostal:'06000',municipio:'CUAUHTEMOC',estado:'CIUDAD DE MEXICO',vigencia:'2020-2030'};
async function card(variant='clear'){
 const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1260;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f6f4ef';ctx.fillRect(0,0,2000,1260);ctx.strokeStyle='#333';ctx.lineWidth=6;ctx.strokeRect(5,5,1990,1250);
 ctx.fillStyle='#222';ctx.font='bold 42px Arial';ctx.fillText('DOCUMENTO SINTETICO DE PRUEBA — SIN VALIDEZ',60,90);
 ctx.fillStyle='#ccc';ctx.fillRect(60,170,310,620);ctx.fillStyle='#222';ctx.font='30px Arial';ctx.fillText('NO ES UNA INE',75,850);
 const rows=['NOMBRES: ANA MARIA','APELLIDO PATERNO: GARCIA','APELLIDO MATERNO: LOPEZ','FECHA DE NACIMIENTO: 31/12/1956','SEXO: M','CURP: '+(variant==='ambiguous'?'GALA561231MDFRPN09':synthetic.curp),'DOMICILIO: CALLE FICTICIA 10','COLONIA: CENTRO','C.P.: 06000','MUNICIPIO: CUAUHTEMOC','ESTADO: CIUDAD DE MEXICO','VIGENCIA: 2020-2030'];
 if(variant==='layout'){
  rows.splice(0,3,'NOMBRE','GARCIA','LOPEZ','ANA MARIA');const index=rows.findIndex(row=>row.startsWith('CURP:'));rows.splice(index,1,'CURP',synthetic.curp);
  const address=rows.findIndex(row=>row.startsWith('DOMICILIO:'));rows.splice(address,5,'DOMICILIO','CALLE FICTICIA 10','COL CENTRO 06000','CUAUHTEMOC, CDMX');
 }
 rows.forEach((row,i)=>{ctx.font=variant==='monospace'&&i===5?'40px Courier New':'40px Arial';ctx.fillText(row,430,variant==='layout'?180+i*72:200+i*78)});
 if(variant==='reference-layout'||variant==='reference-joined'||variant==='reference-compact'){
  // Generic distribution from the supplied reference. All values, artwork and
  // pixels are synthetic; no real document or personal identifier is included.
  canvas.width=1600;canvas.height=1024;ctx.fillStyle='#f6f4ef';ctx.fillRect(0,0,1600,1024);ctx.strokeStyle='#333';ctx.lineWidth=6;ctx.strokeRect(5,5,1590,1014);
  ctx.fillStyle='#222';ctx.font='bold 32px Arial';ctx.fillText('DOCUMENTO SINTETICO — SIN VALIDEZ',350,120);
  ctx.fillStyle='#ccc';ctx.fillRect(110,290,360,500);ctx.fillStyle='#222';ctx.font='24px Arial';ctx.fillText('NO ES UNA INE',170,820);
  const text=(value:string,x:number,y:number,size=36)=>{ctx.font=size+'px Arial';ctx.fillText(value,x,y)};
  text('NOMBRE',525,337,30);text('GARCIA',525,385);text('LOPEZ',525,429);text('ANA MARIA',525,473);text('SEXO M',1400,342,30);
  text('DOMICILIO',525,581,30);text('CALLE FICTICIA 10',525,625);text('PRV JARDIN FICTICIO 06000',525,669);text('CUAUHTEMOC, CDMX',525,713);
  text('CLAVE DE ELECTOR',525,781,30);text('CURP',525,831,30);text(variant==='reference-compact'?'GALA020718MDFRPNA3':synthetic.curp,525,variant==='reference-compact'?870:879,variant==='reference-compact'?34:36);
  text(variant==='reference-joined'?'AÑODEREGISTRO':'AÑO DE REGISTRO',1125,831,30);text('2022 01',1125,877);
  text('FECHA DE NACIMIE',525,variant==='reference-compact'?899:930,30);text(variant==='reference-compact'?'18/07/2002':'31/12/1956',525,976);text('SECCION',940,930,30);text('0000',940,976);
  text('VIGENCIA',1125,930,30);text('2020-2030',1125,976);
 }
 if(variant==='dark'){ctx.fillStyle='#0009';ctx.fillRect(0,0,2000,1260)}
 if(variant==='glare'){const gradient=ctx.createLinearGradient(0,380,0,560);gradient.addColorStop(0,'#fff0');gradient.addColorStop(.5,'#ffff');gradient.addColorStop(1,'#fff0');ctx.fillStyle=gradient;ctx.fillRect(400,380,1550,180)}
 let output=canvas;
 if(variant==='skew'){output=document.createElement('canvas');output.width=2200;output.height=1500;const c=output.getContext('2d')!;c.fillStyle='#444';c.fillRect(0,0,2200,1500);c.translate(1100,750);c.rotate(.08);c.drawImage(canvas,-1000,-630)}
 const blob=await new Promise<Blob>(resolve=>output.toBlob(b=>resolve(b!),'image/png'));return new File([blob],'sintetico.png',{type:'image/png'});
}
const root=createRoot(document.getElementById('root')!);const state={posts:[] as any[],closed:0,uploads:0,release:null as null|(()=>void)};
function Queue({deferred=false,failure=false,legacy=false}:{deferred?:boolean;failure?:boolean;legacy?:boolean}){
 const [items,setItems]=useState<any[]>([{id:'fixture',name:'Registro sintético',status:'Pendiente',analysis_eligible:!legacy,identity:synthetic,document:'documento-fixture'}]);
 const reference=React.useRef(items);reference.current=items;
 const makeReader=()=>({readZone:async()=>({values:{},status:{}}),read:async()=>{if(failure)throw Error('Fallo simulado');if(deferred)await new Promise<void>(resolve=>{state.release=resolve});return {evidence:{original:{values:synthetic,confidence:{}},processed:{values:synthetic,confidence:{}},warnings:[]},candidates:{values:{},status:{}}}},close:async()=>{state.closed++;state.release?.()}});
 const api=async(path:string,data?:any)=>{if(path==='applications')return reference.current;if(path==='admin/provider-analysis'){state.posts.push(data);setItems([]);reference.current=[];return {approved:!data.evidence.failure}}throw Error('Ruta inesperada')};
 return <AutomaticIneReview api={api} items={items} onItems={setItems} makeReader={makeReader}/>;
}
function Capture(){const [value,setValue]=useState(emptyIneDraft),[document,setDocument]=useState(''),[confirmed,setConfirmed]=useState(false);return <IneIdentityCapture value={value} onChange={setValue} documentId={document} onUploadDocument={async()=>{state.uploads++;return 'adjunto'}} onDocumentAttached={setDocument} confirmed={confirmed} onConfirmed={setConfirmed} errors={{}} showRequired={false}/>}
(window as any).harness={
 recoverLabels:async(withLabels:boolean)=>{
  const file=await card();
  const rows=withLabels?[[{text:'CURP',confidence:96,bbox:{x0:20,y0:30,x1:150,y1:85}}],[{text:'FECHA',confidence:96,bbox:{x0:20,y0:210,x1:170,y1:265}},{text:'DE',confidence:96,bbox:{x0:180,y0:210,x1:230,y1:265}},{text:'NACIMIENTO',confidence:96,bbox:{x0:240,y0:210,x1:550,y1:265}}]]:[];
  const worker={setParameters:async()=>{},recognize:async()=>({data:{blocks:[{paragraphs:[{lines:rows.map(words=>({words}))}]}]}})};
  const blocks=await recoverIneCriticalBlocks(worker as any,file,[],()=>false);
  return planIneScans(blocks,2000,1260).map(scan=>scan.field).filter(field=>field==='curp'||field==='fechaNacimiento');
 },
 cropConfidence:async()=>{
  const file=await card();
  const worker={setParameters:async()=>{},recognize:async()=>({data:{text:'FECHA DE NACIMIENTO\n31/12/1956',confidence:96,blocks:[{paragraphs:[{lines:[{words:[{text:'31/12/1956',confidence:93}]}]}]}]}})};
  const result=await supplementIneScan(worker as any,file,{values:{},status:{}},()=>false,[]);
  return {date:result.values.fechaNacimiento,confidence:result.confidence?.fechaNacimiento};
 },
 zoneRead:async(zone:'curp'|'fechaNacimiento'|'domicilio')=>{
  const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=zone==='domicilio'?310:120;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111';ctx.font='48px Arial';
  const rows=zone==='curp'?[synthetic.curp]:zone==='fechaNacimiento'?['31/12/1956']:['CALLE FICTICIA 10','COL CENTRO 06000','CUAUHTEMOC, CDMX'];
  rows.forEach((row,index)=>ctx.fillText(row,40,75+index*80));
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(b=>resolve(b!),'image/png'));const reader=createIneReader();
  try{return await reader.readZone(new File([blob],'zona.png',{type:'image/png'}),zone)}finally{await reader.close()}
 },
 state,card,queue:(deferred=false,failure=false,legacy=false)=>{state.posts=[];state.closed=0;root.render(<Queue deferred={deferred} failure={failure} legacy={legacy}/>);},unmount:()=>root.render(<p>Otra sección</p>),capture:()=>root.render(<Capture/>),
 editor:async()=>root.render(<IneImageEditor file={await card()} onUse={()=>{state.uploads++}} onCancel={()=>{}}/>),
 benchmark:async()=>{
  const reader=createIneReader(),scores=[];
  try{for(const variant of ['monospace','clear','layout','reference-layout','reference-joined','reference-compact','skew','dark','glare','ambiguous']){
   const start=performance.now();const result=await reader.read(await card(variant));
   const truth={...synthetic,...(variant==='ambiguous'?{curp:'GALA561231MDFRPN09'}:{}),...(variant.startsWith('reference-')?{colonia:'PRV JARDIN FICTICIO'}:{}),...(variant==='reference-compact'?{curp:'GALA020718MDFRPNA3',fechaNacimiento:'2002-07-18'}:{})};
   const score=(values:any)=>identityKeys.filter(k=>normalizeIneValue(values[k]||'')===normalizeIneValue(truth[k])).length;
   const decision=evaluateIne(truth,result.evidence,false,2026);
   scores.push({variant,original:score(result.evidence.original.values),processed:score(result.evidence.processed.values),merged:score(result.candidates.values),missing:identityKeys.filter(k=>normalizeIneValue(result.evidence.processed.values[k]||'')!==normalizeIneValue(truth[k])),autoOutcome:decision.outcome,reasons:decision.reasons,total:identityKeys.length,ms:Math.round(performance.now()-start)});
  }}finally{await reader.close()}
  return scores;
 },
};
