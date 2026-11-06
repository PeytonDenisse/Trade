'use client';

import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Camera,CheckCircle2,FileImage,Keyboard,LockKeyhole,RefreshCw} from 'lucide-react';
import {createIneReader,type IneReader} from '../../lib/ine-reader';
import {ineReadStatusLabel,ineQualityLabel,type IneReadDiagnostics} from '../../lib/ine-ocr-diagnostics';
import {IneImageEditor} from './ine-image-editor';
import {IneCamera} from './ine-camera';
import type {IneOcrResult,IneZone} from '../../lib/ine-ocr-parse';
import type {IneIdentity,IneDraft} from '../../lib/ine-identity';
import styles from './ine-identity-capture.module.css';

type Key=keyof IneIdentity;
type Status='Reconocido'|'Revisar'|'Pendiente';
type Method='camera'|'gallery'|'manual'|null;
type Props={
  value:IneDraft;
  onChange:(value:IneDraft)=>void;
  documentId:string;
  onUploadDocument:(file:File)=>Promise<string>;
  onDocumentAttached:(id:string)=>void;
  confirmed:boolean;
  onConfirmed:(value:boolean)=>void;
  errors:Partial<Record<Key,string>>;
  documentError?:string;
  confirmationError?:string;
  showRequired:boolean;
};

const sections:[string,{key:Key;label:string;hint?:string;required?:boolean}[]][]=[
  ['Información personal',[
    {key:'nombres',label:'Nombre(s)',required:true},{key:'apellidoPaterno',label:'Apellido paterno',required:true},{key:'apellidoMaterno',label:'Apellido materno',hint:'Déjalo vacío si no aplica.'},
    {key:'fechaNacimiento',label:'Fecha de nacimiento',required:true},{key:'sexo',label:'Sexo o género',required:true},{key:'curp',label:'CURP',hint:'18 caracteres. El formato no confirma la autenticidad.',required:true},
  ]],
  ['Domicilio',[
    {key:'calleNumero',label:'Calle y número',required:true},{key:'colonia',label:'Colonia',required:true},{key:'codigoPostal',label:'Código postal',hint:'Cinco dígitos, incluidos ceros iniciales.',required:true},
    {key:'municipio',label:'Municipio o alcaldía',required:true},{key:'estado',label:'Estado',required:true},
  ]],
  ['Datos de identificación',[{key:'vigencia',label:'Vigencia del INE',hint:'Copia el año o periodo impreso, por ejemplo 2030 o 2020-2030.',required:true}]],
];
const allKeys=sections.flatMap(([,fields])=>fields.map(({key})=>key));
const today=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`};

export function IneIdentityCapture({value,onChange,documentId,onUploadDocument,onDocumentAttached,confirmed,onConfirmed,errors,documentError,confirmationError,showRequired}:Props){
  const [method,setMethod]=useState<Method>(null);
  const [imageToEdit,setImageToEdit]=useState<File|null>(null);
  const [sourceImage,setSourceImage]=useState<File|null>(null);
  const [zone,setZone]=useState<IneZone|null>(null);
  const [cameraOpen,setCameraOpen]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [scanning,setScanning]=useState(false);
  const [progress,setProgress]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [imageName,setImageName]=useState('');
  const [preview,setPreview]=useState('');
  const [fieldStatus,setFieldStatus]=useState<Partial<Record<Key,Status>>>({});
  const [pendingScan,setPendingScan]=useState<IneOcrResult|null>(null);
  const [diagnostics,setDiagnostics]=useState<IneReadDiagnostics|null>(null);
  const galleryRef=useRef<HTMLInputElement>(null);
  const workerRef=useRef<IneReader|null>(null);
  const scanSequence=useRef(0);
  const uploadSequence=useRef(0);
  const previewRef=useRef('');
  const valueRef=useRef(value);
  const manuallyEdited=useRef(new Set<Key>(allKeys.filter(key=>Boolean(value[key]))));

  useEffect(()=>{valueRef.current=value},[value]);

  useEffect(()=>()=>{
    scanSequence.current++;
    void workerRef.current?.close();
    if(previewRef.current)URL.revokeObjectURL(previewRef.current);
  },[]);

  function choose(next:Method){
    scanSequence.current++;
    uploadSequence.current++;
    void workerRef.current?.close();workerRef.current=null;
    setScanning(false);setUploading(false);setProgress('');setError('');setPendingScan(null);
    setImageToEdit(null);setZone(null);setDiagnostics(null);setMethod(next);setCameraOpen(next==='camera');
  }
  function edit(key:Key,input:string){
    const next=key==='curp'?input.toUpperCase().replace(/\s+/gu,''):input;
    manuallyEdited.current.add(key);
    const updated={...valueRef.current,[key]:next} as IneDraft;
    valueRef.current=updated;
    onChange(updated);
    onConfirmed(false);
    setFieldStatus(current=>({...current,[key]:next?'Revisar':'Pendiente'}));
  }
  function applyScan(result:IneOcrResult,replace:boolean){
    const next={...valueRef.current};const appliedStatus:Partial<Record<Key,Status>>={};
    for(const key of allKeys){
      const candidate=result.values[key];
      if(candidate===undefined||candidate==='')continue;
      if(manuallyEdited.current.has(key))continue;
      if(replace||!next[key]){
        Object.assign(next,{[key]:candidate});
        appliedStatus[key]=result.status[key]||'Revisar';
      }
    }
    valueRef.current=next;onChange(next);onConfirmed(false);setFieldStatus(current=>({...current,...appliedStatus}));setPendingScan(null);
    setNotice(Object.keys(result.values).length<4?'Reconocimiento parcial: revisa la foto con luz uniforme o completa los campos pendientes manualmente.':'Revisa y corrige todos los campos antes de enviar tu registro.');
  }
  async function recognize(file:File){
    const sequence=++scanSequence.current;
    setScanning(true);setProgress('Preparando reconocimiento local…');
    const reader=createIneReader();workerRef.current=reader;
    const timer=setTimeout(()=>void reader.close(),120000);
    try{
      const {candidates:extracted,diagnostics:report}=await reader.read(file,message=>{if(sequence===scanSequence.current)setProgress(message)});
      if(sequence!==scanSequence.current)return;
      setDiagnostics(report||null);
      if(!Object.keys(extracted.values).length){setError('La lectura terminó sin datos extraíbles. Abre «Detalle de la lectura» para identificar los campos que no se localizaron o no se pudieron interpretar. Puedes volver a capturar o completarlos manualmente.');setMethod('manual');return}
      if(allKeys.some(key=>Boolean(valueRef.current[key])))setPendingScan(extracted);else applyScan(extracted,false);
    }catch{
      if(sequence===scanSequence.current){setError('No se pudo completar la lectura. La foto está adjunta; puedes intentar otra captura o completar los datos manualmente.');setMethod('manual')}
    }finally{
      clearTimeout(timer);await reader.close();if(workerRef.current===reader)workerRef.current=null;
      if(sequence===scanSequence.current){setScanning(false);setProgress('')}
    }
  }
  function stageImage(file:File){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){setError('Selecciona una imagen PNG, JPG o WebP de hasta 5 MB.');return}
    scanSequence.current++;void workerRef.current?.close();workerRef.current=null;setScanning(false);setError('');setCameraOpen(false);setZone(null);setImageToEdit(file);
  }
  async function recognizeZone(file:File,selected:IneZone){
    setZone(null);setPendingScan(null);setError('');setNotice('');
    const sequence=++scanSequence.current,reader=createIneReader();workerRef.current=reader;
    setScanning(true);setProgress('Leyendo la zona seleccionada…');
    const timer=setTimeout(()=>void reader.close(),60000);
    try{
      const result=await reader.readZone(file,selected);if(sequence!==scanSequence.current)return;
      if(!Object.keys(result.values).length){setError('No se obtuvo un dato válido coincidente en las dos lecturas de esta zona. Ajusta el recorte o completa el campo manualmente.');return}
      if(allKeys.some(key=>Boolean(valueRef.current[key])))setPendingScan(result);else applyScan(result,false);
      setNotice('Zona leída. Aplica los datos encontrados y revísalos antes de continuar; tus cambios manuales se conservarán.');
    }catch{if(sequence===scanSequence.current)setError('No se pudo leer esta zona. Intenta otro recorte o completa el dato manualmente.')}
    finally{clearTimeout(timer);await reader.close();if(workerRef.current===reader)workerRef.current=null;if(sequence===scanSequence.current){setScanning(false);setProgress('')}}
  }
  async function processFile(file:File){
    setImageToEdit(null);
    const operation=++scanSequence.current;
    const upload=++uploadSequence.current;
    void workerRef.current?.close();workerRef.current=null;
    setError('');setNotice('');setPendingScan(null);setDiagnostics(null);
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){setError('Selecciona una imagen PNG, JPG o WebP de hasta 5 MB.');return}
    setCameraOpen(false);setUploading(true);onConfirmed(false);
    try{
      const uploadedId=await onUploadDocument(file);
      if(operation!==scanSequence.current)return;
      onDocumentAttached(uploadedId);
      setSourceImage(file);
      if(previewRef.current)URL.revokeObjectURL(previewRef.current);
      previewRef.current=URL.createObjectURL(file);setPreview(previewRef.current);setImageName(file.name);
      setNotice('Imagen adjunta. El OCR local intentará completar los datos disponibles.');
      if(upload===uploadSequence.current)setUploading(false);
      await recognize(file);
    }catch(cause){if(operation===scanSequence.current)setError(cause instanceof Error?cause.message:'No se pudo adjuntar la imagen. Inténtalo de nuevo.')}
    finally{if(upload===uploadSequence.current)setUploading(false)}
  }
  function galleryChanged(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(file){setMethod('gallery');setCameraOpen(false);stageImage(file)}event.target.value=''}
  const showForm=method!==null||showRequired;
  return <section className={styles.root} aria-labelledby="ine-heading">
    <div className={styles.heading}><p className="eyebrow">DATOS PRIVADOS PARA REVISIÓN</p><h2 id="ine-heading">Verificación de identidad</h2><p>Para continuar con tu solicitud de registro como proveedor, necesitamos algunos datos de tu identificación oficial. Puedes tomar una fotografía de tu INE, subir una imagen desde tu dispositivo o ingresar tus datos manualmente.</p><small>Esta captura no certifica la identidad ni comprueba la autenticidad del documento.</small></div>
    <div className={styles.methods} role="group" aria-label="Método de captura de datos">
      <button type="button" className={method==='camera'?styles.selected:''} aria-pressed={method==='camera'} onClick={()=>choose('camera')}><Camera aria-hidden="true"/><strong>Tomar foto de mi INE</strong><span>Usa la cámara para capturar la identificación.</span></button>
      <label className={method==='gallery'?styles.selected:''}><FileImage aria-hidden="true"/><strong>Subir foto desde mi dispositivo</strong><span>Elige una imagen y revisa los datos detectados.</span><input id="ine-gallery-file" ref={galleryRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Subir foto desde mi dispositivo" disabled={uploading} onChange={galleryChanged}/></label>
      <button type="button" className={method==='manual'?styles.selected:''} aria-pressed={method==='manual'} onClick={()=>choose('manual')}><Keyboard aria-hidden="true"/><strong>Ingresar mis datos manualmente</strong><span>Completa el formulario sin cámara ni OCR.</span></button>
    </div>
    <p className={styles.privacy}><LockKeyhole size={17} aria-hidden="true"/>La fotografía que confirmes se adjunta a tu cuenta y puede contener otros datos impresos. Trade no solicita ni guarda la clave de elector como campo separado.</p>
    {cameraOpen&&<IneCamera onCapture={file=>{setMethod('camera');stageImage(file)}} onCancel={()=>setCameraOpen(false)} onGallery={()=>{setCameraOpen(false);galleryRef.current?.click()}} onManual={()=>choose('manual')}/>}
    {imageToEdit&&<IneImageEditor file={imageToEdit} onUse={file=>void processFile(file)} onCancel={()=>setImageToEdit(null)}/>}
    {sourceImage&&zone&&<IneImageEditor key={zone} file={sourceImage} zone={zone==='curp'?'CURP':zone==='fechaNacimiento'?'Fecha de nacimiento':'Domicilio'} onUse={file=>void recognizeZone(file,zone)} onCancel={()=>setZone(null)}/>}
    {sourceImage&&!imageToEdit&&!zone&&!scanning&&!uploading&&<div className={styles.scanChoice}><p>¿Quedaron campos pendientes? Selecciona su zona en la foto para repetir solo esa lectura. El recorte no se subirá ni sustituirá el documento completo.</p><button type="button" className="secondary" onClick={()=>{setCameraOpen(false);setZone('curp')}}>Releer CURP por zona</button><button type="button" className="secondary" onClick={()=>{setCameraOpen(false);setZone('fechaNacimiento')}}>Releer nacimiento por zona</button><button type="button" className="secondary" onClick={()=>{setCameraOpen(false);setZone('domicilio')}}>Releer domicilio por zona</button></div>}
    {uploading&&<p role="status" className={styles.message}><RefreshCw size={17} aria-hidden="true"/>Adjuntando imagen y preparando lectura…</p>}
    {scanning&&<p role="status" className={styles.message}><RefreshCw size={17} aria-hidden="true"/>{progress}</p>}
    {error&&<p className="error" role="alert">{error}</p>}{documentError&&<p className="field-error" role="alert">{documentError}</p>}{notice&&<p className="notice" role="status"><CheckCircle2 size={17} aria-hidden="true"/>{notice}</p>}
    {/* This blob URL stays in the browser and cannot use the remote image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {documentId&&<div className={styles.document}><LockKeyhole size={21} aria-hidden="true"/><div><strong>Imagen cargada</strong><small>Identificación adjunta</small>{imageName&&<small>{imageName}</small>}<small>Archivo privado, accesible únicamente para ti y Administración.</small></div>{preview&&<img src={preview} alt="Vista previa local de la identificación adjunta"/>}</div>}
    {pendingScan&&<div className={styles.scanChoice} role="group" aria-label="Elegir cómo aplicar el nuevo reconocimiento"><p>El nuevo reconocimiento encontró datos y ya hay campos llenos. Tus correcciones manuales se conservarán.</p><button type="button" className="secondary" onClick={()=>applyScan(pendingScan,false)}>Conservar datos actuales y llenar vacíos</button><button type="button" className="secondary" onClick={()=>applyScan(pendingScan,true)}>Actualizar solo datos no editados</button></div>}
    {diagnostics&&<details className={styles.diagnostics}><summary>Detalle de la lectura</summary><p>«Pendiente» significa que todavía no se aplicó un dato al formulario. Esta tabla distingue si cada lectura localizó la etiqueta y extrajo un valor. No muestra tus datos personales ni se envía al servidor.</p>{diagnostics.warnings.length>0&&<p>Calidad de imagen: {diagnostics.warnings.map(warning=>ineQualityLabel[warning]||'Revisar calidad de imagen').join('; ')}.</p>}<div className={styles.diagnosticTable}><table><thead><tr><th>Campo</th><th>Imagen original</th><th>Imagen procesada</th></tr></thead><tbody>{sections.flatMap(([,fields])=>fields).map(({key,label})=><tr key={key}><th scope="row">{label}</th><td>{ineReadStatusLabel[diagnostics.original[key]]}</td><td>{ineReadStatusLabel[diagnostics.processed[key]]}</td></tr>)}</tbody></table></div><p>Si aparece «Dato extraído» y el campo sigue vacío, revisa los botones para aplicar la lectura. Los campos editados manualmente se conservan.</p></details>}
    {showForm&&<div className={styles.form}>
      {sections.map(([title,fields])=><fieldset key={title}><legend>{title}</legend><div className={styles.fields}>{fields.map(({key,label,hint,required})=>{
        const status:Status=fieldStatus[key]||(value[key]?'Revisar':'Pendiente');
        const issue=errors[key];
        return <div className={styles.field} key={key}><div className={styles.fieldHeader}><label htmlFor={'ine-'+key}>{label}{required&&' *'}</label><span className={styles.status} data-status={status}>{status}</span></div>{key==='sexo'?<select id={'ine-'+key} value={value.sexo} onChange={event=>edit(key,event.target.value)} aria-invalid={!!issue} aria-describedby={issue?'ine-'+key+'-error':undefined}><option value="">Selecciona una opción</option><option value="H">Hombre (H)</option><option value="M">Mujer (M)</option><option value="NB">No binario (NB)</option></select>:<input id={'ine-'+key} type={key==='fechaNacimiento'?'date':'text'} max={key==='fechaNacimiento'?today():undefined} inputMode={key==='codigoPostal'?'numeric':undefined} maxLength={key==='curp'?18:key==='codigoPostal'?5:key==='vigencia'?16:200} autoComplete="off" value={value[key]} onChange={event=>edit(key,event.target.value)} aria-invalid={!!issue} aria-describedby={issue?'ine-'+key+'-error':undefined}/>}<small>{hint||' '}</small>{issue&&<p id={'ine-'+key+'-error'} className="field-error" role="alert">{issue}</p>}</div>
      })}</div></fieldset>)}
      <div className={styles.review}><h3>Revisión y confirmación</h3><p>Los estados «Reconocido» y «Revisar» describen la lectura del texto, no una verificación oficial. Corrige cualquier dato incorrecto y adjunta una fotografía del INE, incluso si capturaste los datos manualmente.</p><label><input id="ine-confirm" type="checkbox" checked={confirmed} onChange={event=>onConfirmed(event.target.checked)} aria-invalid={!!confirmationError} aria-describedby={confirmationError?'ine-confirm-error':undefined}/>Confirmo que revisé y corregí los datos de mi identificación antes de enviar.</label>{confirmationError&&<p id="ine-confirm-error" className="field-error" role="alert">{confirmationError}</p>}<p><LockKeyhole size={16} aria-hidden="true"/>La imagen y estos datos se usan para la revisión interna del registro. No se publican en tu perfil.</p></div>
    </div>}
    {method==='manual'&&!documentId&&<p className={styles.manualHelp}>Captura tus datos ahora. Para enviar el registro, también necesitarás adjuntar la fotografía mediante la cámara o la opción de dispositivo.</p>}
    {!showForm&&<p className={styles.manualHelp}>Puedes elegir la captura manual desde el inicio; el reconocimiento automático siempre es opcional.</p>}
  </section>
}
