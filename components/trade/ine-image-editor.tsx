'use client';
import {useEffect,useRef,useState} from 'react';
import {RotateCw} from 'lucide-react';

export function IneImageEditor({file,onUse,onCancel,zone}:{file:File;onUse:(file:File)=>void;onCancel:()=>void;zone?:'CURP'|'Fecha de nacimiento'|'Domicilio'}){
 const canvas=useRef<HTMLCanvasElement>(null),[rotation,setRotation]=useState(0);
 const [crop,setCrop]=useState({left:0,top:0,right:100,bottom:100}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  createImageBitmap(file).then(bitmap=>{
   if(!cancelled&&canvas.current){
    const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));const width=Math.round(bitmap.width*scale),height=Math.round(bitmap.height*scale);
    const node=canvas.current;node.width=rotation%180?height:width;node.height=rotation%180?width:height;
    const context=node.getContext('2d')!;context.translate(node.width/2,node.height/2);context.rotate(rotation*Math.PI/180);context.drawImage(bitmap,-width/2,-height/2,width,height);
   }
   bitmap.close();
  }).catch(()=>{if(!cancelled)setError('No se pudo abrir esta imagen. Elige otra captura.')});
  return()=>{cancelled=true};
 },[file,rotation]);
 async function useImage(){
  if(!canvas.current)return;setBusy(true);setError('');
  try{
   const input=canvas.current;const x=input.width*crop.left/100,y=input.height*crop.top/100;
   const width=Math.round(input.width*(crop.right-crop.left)/100),height=Math.round(input.height*(crop.bottom-crop.top)/100);
   if(width<(zone?100:300)||height<(zone?24:180))throw Error(zone?'El recorte es demasiado pequeño. Incluye la línea completa y un margen.':'El recorte es demasiado pequeño. Incluye toda la credencial y sus datos.');
   const output=document.createElement('canvas');output.width=width;output.height=height;
   output.getContext('2d')!.drawImage(input,x,y,width,height,0,0,width,height);
   const blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/jpeg',.95));
   if(!blob||blob.size>5*1024*1024)throw Error('No se pudo preparar una imagen de hasta 5 MB.');
   onUse(new File([blob],'ine-documento.jpg',{type:'image/jpeg'}));
  }catch(e){setError(e instanceof Error?e.message:'No se pudo recortar la imagen.')}
  finally{setBusy(false)}
 }
 return <section className="ine-image-editor" aria-label={zone?'Seleccionar zona de '+zone:'Ajustar imagen de INE'}><h3>{zone?'Selecciona la zona: '+zone:'Encuadra tu identificación'}</h3><p>{zone?(zone==='Domicilio'?'Incluye las líneas de calle, colonia, código postal, municipio y estado.':'Incluye únicamente el valor impreso, sin la etiqueta ni otros campos.')+' El recorte se leerá en este navegador; conservarás la imagen completa adjunta.':'Incluye toda la credencial. Ajusta los bordes y gira la foto si es necesario; revisa luz, enfoque y reflejos.'}</p>
  <div className="ine-crop-preview"><canvas ref={canvas} aria-label="Vista previa del recorte"/><div className="ine-crop-box" style={{left:crop.left+'%',top:crop.top+'%',right:(100-crop.right)+'%',bottom:(100-crop.bottom)+'%'}}/></div>
  <button type="button" className="secondary" onClick={()=>{setRotation(n=>(n+90)%360);setCrop({left:0,top:0,right:100,bottom:100})}}><RotateCw size={17}/>Girar 90°</button>
  <div className="ine-crop-controls">{(['left','top','right','bottom'] as const).map((edge,index)=><label key={edge}>{['Borde izquierdo','Borde superior','Borde derecho','Borde inferior'][index]}<input type="range" min={edge==='right'?crop.left+(zone?2:10):edge==='bottom'?crop.top+(zone?2:10):0} max={edge==='left'?crop.right-(zone?2:10):edge==='top'?crop.bottom-(zone?2:10):100} value={crop[edge]} onChange={e=>setCrop(v=>({...v,[edge]:Number(e.target.value)}))}/></label>)}</div>
  {error&&<p className="error" role="alert">{error}</p>}<div className="admin-actions"><button type="button" className="primary" disabled={busy} onClick={()=>void useImage()}>{busy?'Preparando…':zone?'Leer esta zona':'Usar imagen y analizar'}</button><button type="button" className="secondary" disabled={busy} onClick={onCancel}>{zone?'Cancelar lectura de zona':'Elegir otra imagen'}</button></div>
 </section>;
}
