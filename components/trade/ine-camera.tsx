'use client';

import {useEffect,useRef,useState} from 'react';
import {Camera,CameraOff,Check,RefreshCw,RotateCcw,X} from 'lucide-react';
import styles from './ine-camera.module.css';

type Props={
  onCapture:(file:File)=>void;
  onCancel:()=>void;
  onGallery?:()=>void;
  onManual?:()=>void;
};
type Facing='environment'|'user';

function cameraError(cause:unknown){
  const name=cause instanceof DOMException?cause.name:'';
  if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'Se denegó el permiso de la cámara. Puedes habilitarlo en el navegador o usar otra opción.';
  if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'No encontramos una cámara en este dispositivo.';
  if(name==='NotReadableError'||name==='TrackStartError')return 'La cámara está ocupada o no pudo iniciarse. Cierra otras aplicaciones que la utilicen.';
  if(name==='OverconstrainedError')return 'La cámara no admite esta configuración. Prueba con otra cámara o sube una imagen.';
  return 'No se pudo abrir la cámara. Prueba desde la galería o captura los datos manualmente.';
}

// Informative only: no photo is rejected by these heuristics.
function imageQualityWarning(canvas:HTMLCanvasElement){
  const sample=document.createElement('canvas');
  sample.width=120;sample.height=80;
  const context=sample.getContext('2d',{willReadFrequently:true});
  if(!context)return '';
  context.drawImage(canvas,0,0,sample.width,sample.height);
  const pixels=context.getImageData(0,0,sample.width,sample.height).data;
  let brightness=0,edges=0;
  const luma=new Float32Array(sample.width*sample.height);
  for(let i=0;i<luma.length;i++){
    const offset=i*4;
    luma[i]=pixels[offset]*.2126+pixels[offset+1]*.7152+pixels[offset+2]*.0722;
    brightness+=luma[i];
  }
  for(let y=0;y<sample.height-1;y++)for(let x=0;x<sample.width-1;x++){
    const i=y*sample.width+x;
    edges+=Math.abs(luma[i]-luma[i+1])+Math.abs(luma[i]-luma[i+sample.width]);
  }
  if(brightness/luma.length<55)return 'La foto parece oscura. Acércate a una fuente de luz y evita reflejos.';
  if(edges/(2*(sample.width-1)*(sample.height-1))<6)return 'La foto podría estar borrosa. Revisa que los datos se puedan leer.';
  return '';
}

export function IneCamera({onCapture,onCancel,onGallery,onManual}:Props){
  const videoRef=useRef<HTMLVideoElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const objectUrlRef=useRef('');
  const [facing,setFacing]=useState<Facing>('environment');
  const [mode,setMode]=useState<'live'|'captured'>('live');
  const [ready,setReady]=useState(false);
  const [canSwitch,setCanSwitch]=useState(false);
  const [capturing,setCapturing]=useState(false);
  const [captured,setCaptured]=useState<File|null>(null);
  const [previewUrl,setPreviewUrl]=useState('');
  const [warning,setWarning]=useState('');
  const [error,setError]=useState('');

  function stopCamera(){
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
  }
  function clearPreview(){
    if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current='';setPreviewUrl('');setCaptured(null);setWarning('');
  }
  useEffect(()=>{
    if(mode!=='live')return;
    let cancelled=false;
    let acquired:MediaStream|null=null;
    const videoNode=videoRef.current;
    async function open(){
      setError('');setReady(false);
      if(!window.isSecureContext){setError('La cámara requiere HTTPS o localhost. Puedes subir una foto o capturar los datos manualmente.');return}
      if(!navigator.mediaDevices?.getUserMedia){setError('Este navegador no permite usar la cámara desde la página.');return}
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}}});
        acquired=stream;
        if(cancelled){stream.getTracks().forEach(track=>track.stop());return}
        streamRef.current=stream;
        const video=videoRef.current;
        if(!video)throw new Error('No se pudo mostrar la vista previa.');
        video.srcObject=stream;
        await video.play();
        if(cancelled)return;
        setReady(true);
        const devices=await navigator.mediaDevices.enumerateDevices().catch(()=>[] as MediaDeviceInfo[]);
        if(!cancelled)setCanSwitch(devices.filter(device=>device.kind==='videoinput').length>1);
      }catch(cause){
        if(cancelled)return;
        stopCamera();
        setError(cameraError(cause));
      }
    }
    void open();
    return()=>{
      cancelled=true;
      acquired?.getTracks().forEach(track=>track.stop());
      if(streamRef.current===acquired)streamRef.current=null;
      if(videoNode?.srcObject===acquired)videoNode.srcObject=null;
    };
  },[facing,mode]);
  useEffect(()=>()=>{
    streamRef.current?.getTracks().forEach(track=>track.stop());
    if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);
  },[]);

  async function takePhoto(){
    const video=videoRef.current;
    if(!video||!ready||!video.videoWidth||!video.videoHeight)return;
    setCapturing(true);setError('');
    try{
      const canvas=document.createElement('canvas');
      canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      const context=canvas.getContext('2d');
      if(!context)throw new Error('No se pudo capturar la fotografía.');
      context.drawImage(video,0,0,canvas.width,canvas.height);
      const qualityWarning=imageQualityWarning(canvas);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
      if(!blob||blob.type!=='image/jpeg')throw new Error('No se pudo crear la fotografía. Prueba desde la galería.');
      if(blob.size===0||blob.size>5*1024*1024)throw new Error('La fotografía supera 5 MB. Acerca la cámara o usa una imagen más pequeña.');
      const file=new File([blob],`ine-captura-${Date.now()}.jpg`,{type:'image/jpeg'});
      clearPreview();
      const url=URL.createObjectURL(file);
      objectUrlRef.current=url;setPreviewUrl(url);setCaptured(file);setWarning(qualityWarning);setMode('captured');
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo capturar la fotografía.')}
    finally{setCapturing(false)}
  }
  function retry(){clearPreview();setMode('live')}
  function close(action:()=>void){stopCamera();clearPreview();action()}

  return <section className={styles.camera} aria-label="Capturar fotografía de la identificación">
    <div className={styles.heading}><div><h3>Tomar foto de mi INE</h3><p>Coloca la credencial completa dentro del marco, con buena luz y sin reflejos.</p></div><button type="button" className={styles.close} aria-label="Cerrar cámara" onClick={()=>close(onCancel)}><X size={20}/></button></div>
    <div className={styles.stage}>
      <video ref={videoRef} className={mode==='captured'?styles.hidden:styles.video} autoPlay muted playsInline aria-label="Vista previa de la cámara"/>
      {/* Blob URLs stay in the browser and cannot be optimized by the image service. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {mode==='captured'&&previewUrl&&<img className={styles.photo} src={previewUrl} alt="Fotografía tomada de la identificación para revisión"/>}
      {mode==='live'&&<div className={styles.frame} aria-hidden="true"><span/><span/><span/><span/></div>}
      {mode==='live'&&!ready&&!error&&<p className={styles.stageMessage} role="status">Abriendo cámara…</p>}
      {mode==='live'&&error&&<p className={styles.stageMessage}><CameraOff size={25} aria-hidden="true"/>{error}</p>}
    </div>
    {warning&&mode==='captured'&&<p className={styles.warning} role="status">{warning} Puedes repetir la foto o continuar si es legible.</p>}
    {mode==='live'?<div className={styles.actions}><button type="button" className="secondary" onClick={()=>close(onCancel)}>Cancelar</button>{canSwitch&&<button type="button" className="secondary" disabled={!ready} onClick={()=>setFacing(value=>value==='environment'?'user':'environment')}><RefreshCw size={17}/>Cambiar cámara</button>}<button type="button" className="primary" disabled={!ready||capturing} onClick={()=>void takePhoto()}><Camera size={18}/>{capturing?'Capturando…':'Capturar foto'}</button></div>:<div className={styles.actions}><button type="button" className="secondary" onClick={retry}><RotateCcw size={17}/>Repetir foto</button><button type="button" className="primary" disabled={!captured} onClick={()=>{if(captured){stopCamera();onCapture(captured)}}}><Check size={18}/>Usar esta foto</button></div>}
    <div className={styles.alternatives}><span>¿Prefieres otra opción?</span>{onGallery&&<button type="button" onClick={()=>close(onGallery)}>Subir desde mi dispositivo</button>}{onManual&&<button type="button" onClick={()=>close(onManual)}>Ingresar mis datos manualmente</button>}</div>
  </section>;
}
