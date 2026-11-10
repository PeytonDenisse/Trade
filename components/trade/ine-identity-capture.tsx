'use client';

import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {CheckCircle2,FileImage,LockKeyhole,RefreshCw,X} from 'lucide-react';
import {createIneReader,type IneReader} from '../../lib/ine-reader';
import {ineReadStatusLabel,ineQualityLabel,type IneReadDiagnostics} from '../../lib/ine-ocr-diagnostics';
import {IneImageEditor} from './ine-image-editor';
import type {IneOcrResult} from '../../lib/ine-ocr-parse';
import type {IneIdentity,IneDraft} from '../../lib/ine-identity';
import type {IneEvidence} from '../../lib/ine-analysis';
import {evaluateInePreliminary,preliminaryFields} from '../../lib/ine-preliminary';
import styles from './ine-identity-capture.module.css';

type Key=keyof IneIdentity;
type Status='Reconocido'|'Revisar'|'Pendiente';
type Method='gallery'|null;
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
  evidence?:IneEvidence|null;
  onEvidenceChange?:(evidence:IneEvidence|null)=>void;
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

export function IneIdentityCapture({value,onChange,documentId,onUploadDocument,onDocumentAttached,confirmed,onConfirmed,errors,documentError,confirmationError,showRequired,evidence:externalEvidence,onEvidenceChange}:Props){
  const [method,setMethod]=useState<Method>(null);
  const [imageToEdit,setImageToEdit]=useState<File|null>(null);
  const [activeSection,setActiveSection]=useState<string|null>(null);
  const [sectionDraft,setSectionDraft]=useState<IneDraft|null>(null);
  const [confirmReplace,setConfirmReplace]=useState(false);
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
  const [localEvidence,setLocalEvidence]=useState<IneEvidence|null>(null);
  const evidence=externalEvidence===undefined?localEvidence:externalEvidence;
  const preliminary=evaluateInePreliminary(value,evidence);
  function updateEvidence(next:IneEvidence|null){setLocalEvidence(next);onEvidenceChange?.(next)}
  const galleryRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const workerRef=useRef<IneReader|null>(null);
  const scanSequence=useRef(0);
  const uploadSequence=useRef(0);
  const previewRef=useRef('');
  const valueRef=useRef(value);
  const manuallyEdited=useRef(new Set<Key>(allKeys.filter(key=>Boolean(value[key]))));

  useEffect(()=>{valueRef.current=value},[value]);
  useEffect(()=>{const dialog=dialogRef.current;if(activeSection&&!dialog?.open)dialog?.showModal();else if(!activeSection&&dialog?.open)dialog.close()},[activeSection]);
  useEffect(()=>{if(!showRequired||!documentId||dialogRef.current?.open)return;const invalid=allKeys.find(key=>errors[key]);if(invalid){const title=sections.find(([,fields])=>fields.some(field=>field.key===invalid))?.[0];if(title)openSection(title)}},[showRequired,documentId,errors]);

  useEffect(()=>()=>{
    scanSequence.current++;
    void workerRef.current?.close();
    if(previewRef.current)URL.revokeObjectURL(previewRef.current);
  },[]);

  function openSection(title:string){setSectionDraft({...valueRef.current});setActiveSection(title)}
  function closeSection(){setActiveSection(null);setSectionDraft(null)}
  function saveSection(){
    if(!sectionDraft||!activeSection)return;
    const fields=sections.find(([title])=>title===activeSection)?.[1]||[];
    const next={...valueRef.current};
    for(const {key} of fields){if(next[key]!==sectionDraft[key]){Object.assign(next,{[key]:sectionDraft[key]});manuallyEdited.current.add(key);setFieldStatus(current=>({...current,[key]:sectionDraft[key]?'Revisar':'Pendiente'}))}}
    valueRef.current=next;onChange(next);onConfirmed(false);closeSection();
  }
  function edit(key:Key,input:string){
    const next=key==='curp'?input.toUpperCase().replace(/\s+/gu,''):input;
    setSectionDraft(current=>current?{...current,[key]:next}:current);
  }
  function applyScan(result:IneOcrResult,replace:boolean){
    const next={...valueRef.current};const appliedStatus:Partial<Record<Key,Status>>={};
    for(const key of allKeys){
      const candidate=result.values[key];
      if(replace){Object.assign(next,{[key]:candidate||''});appliedStatus[key]=candidate?result.status[key]||'Revisar':'Pendiente';continue}
      if(candidate===undefined||candidate==='')continue;
      if(manuallyEdited.current.has(key))continue;
      if(replace||!next[key]){
        Object.assign(next,{[key]:candidate});
        appliedStatus[key]=result.status[key]||'Revisar';
      }
    }
    if(replace)manuallyEdited.current.clear();
    valueRef.current=next;onChange(next);onConfirmed(false);setFieldStatus(current=>({...current,...appliedStatus}));setPendingScan(null);setConfirmReplace(false);
    setNotice(Object.keys(result.values).length<4?'Reconocimiento parcial: revisa la foto con luz uniforme o completa los campos pendientes manualmente.':'Revisa y corrige todos los campos antes de enviar tu registro.');
  }
  async function recognize(file:File){
    const sequence=++scanSequence.current;
    setScanning(true);setProgress('Preparando reconocimiento local…');
    const reader=createIneReader();workerRef.current=reader;
    const timer=setTimeout(()=>void reader.close(),120000);
    try{
      const {candidates:extracted,diagnostics:report,evidence:readEvidence}=await reader.read(file,message=>{if(sequence===scanSequence.current)setProgress(message)});
      if(sequence!==scanSequence.current)return;
      updateEvidence(readEvidence);
      setDiagnostics(report||null);
      if(!Object.keys(extracted.values).length){setError('La lectura terminó sin datos extraíbles. Revisa la imagen o completa los campos pendientes manualmente.');if(allKeys.some(key=>Boolean(valueRef.current[key])))setPendingScan(extracted);return}
      if(allKeys.some(key=>Boolean(valueRef.current[key])))setPendingScan(extracted);else applyScan(extracted,false);
    }catch{
      if(sequence===scanSequence.current){setError('No se pudo completar la lectura. La imagen está adjunta; puedes elegir otra o completar los datos manualmente.')}
    }finally{
      clearTimeout(timer);await reader.close();if(workerRef.current===reader)workerRef.current=null;
      if(sequence===scanSequence.current){setScanning(false);setProgress('')}
    }
  }
  function stageImage(file:File){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){setError('Selecciona una imagen PNG, JPG o WebP de hasta 5 MB.');return}
    scanSequence.current++;void workerRef.current?.close();workerRef.current=null;setScanning(false);setError('');setImageToEdit(file);
  }
  async function processFile(file:File){
    setImageToEdit(null);
    const operation=++scanSequence.current;
    const upload=++uploadSequence.current;
    void workerRef.current?.close();workerRef.current=null;
    setError('');setNotice('');setPendingScan(null);setDiagnostics(null);
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024){setError('Selecciona una imagen PNG, JPG o WebP de hasta 5 MB.');return}
    setUploading(true);onConfirmed(false);
    try{
      const uploadedId=await onUploadDocument(file);
      if(operation!==scanSequence.current)return;
      onDocumentAttached(uploadedId);
      updateEvidence(null);
      if(previewRef.current)URL.revokeObjectURL(previewRef.current);
      previewRef.current=URL.createObjectURL(file);setPreview(previewRef.current);setImageName(file.name);
      setNotice('Imagen adjunta. El OCR local intentará completar los datos disponibles.');
      if(upload===uploadSequence.current)setUploading(false);
      await recognize(file);
    }catch(cause){if(operation===scanSequence.current)setError(cause instanceof Error?cause.message:'No se pudo adjuntar la imagen. Inténtalo de nuevo.')}
    finally{if(upload===uploadSequence.current)setUploading(false)}
  }
  function galleryChanged(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(file){setMethod('gallery');stageImage(file)}event.target.value=''}
  return <section className={styles.root} aria-labelledby="ine-heading">
    <div className={styles.heading}><p className="eyebrow">DATOS PRIVADOS PARA REVISIÓN</p><h2 id="ine-heading">Verificación de identidad</h2><p>Sube una imagen de tu INE. La leeremos en este dispositivo y podrás revisar o completar los datos antes de enviar.</p><small>Esta captura no certifica la identidad ni comprueba la autenticidad del documento.</small></div>
    <div className={styles.methods} role="group" aria-label="Método de captura de datos">
      <label className={method==='gallery'?styles.selected:''}><FileImage aria-hidden="true"/><strong>Subir foto desde mi dispositivo</strong><span>Elige una imagen y revisa los datos detectados.</span><input id="ine-gallery-file" ref={galleryRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Subir foto desde mi dispositivo" disabled={uploading} onChange={galleryChanged}/></label>
    </div>
    <p className={styles.privacy}><LockKeyhole size={17} aria-hidden="true"/>La fotografía que confirmes se adjunta a tu cuenta y puede contener otros datos impresos. Trade no solicita ni guarda la clave de elector como campo separado.</p>
    {imageToEdit&&<IneImageEditor file={imageToEdit} onUse={file=>void processFile(file)} onCancel={()=>setImageToEdit(null)}/>}
    {uploading&&<p role="status" className={styles.message}><RefreshCw size={17} aria-hidden="true"/>Adjuntando imagen y preparando lectura…</p>}
    {scanning&&<p role="status" className={styles.message}><RefreshCw size={17} aria-hidden="true"/>{progress}</p>}
    {error&&<p className="error" role="alert">{error}</p>}{documentError&&<p className="field-error" role="alert">{documentError}</p>}{notice&&<p className="notice" role="status"><CheckCircle2 size={17} aria-hidden="true"/>{notice}</p>}
    {/* This blob URL stays in the browser and cannot use the remote image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {documentId&&<div className={styles.document}><LockKeyhole size={21} aria-hidden="true"/><div><strong>Imagen cargada</strong><small>Identificación adjunta</small>{imageName&&<small>{imageName}</small>}<small>Archivo privado, accesible únicamente para ti y Administración.</small></div>{preview&&<img src={preview} alt="Vista previa local de la identificación adjunta"/>}</div>}
    {pendingScan&&<div className={styles.scanChoice} role="group" aria-label="Elegir cómo aplicar el nuevo reconocimiento"><p>Hay datos en el formulario. Puedes completar los vacíos o actualizar todos los datos con la nueva lectura.</p><button type="button" className="secondary" onClick={()=>applyScan(pendingScan,false)}>Conservar datos actuales y llenar vacíos</button><button type="button" className="secondary" onClick={()=>setConfirmReplace(true)}>Actualizar todos los datos</button>{confirmReplace&&<div role="alertdialog" aria-label="Confirmar actualización de datos" className={styles.confirmReplace}><p>Se perderán tus correcciones manuales. Los campos que no reconozca la nueva lectura quedarán pendientes. ¿Quieres continuar?</p><button type="button" className="primary" onClick={()=>applyScan(pendingScan,true)}>Sí, actualizar todos</button><button type="button" className="secondary" onClick={()=>setConfirmReplace(false)}>Cancelar</button></div>}</div>}
    <div className={styles.review} role="status"><h3>Validación preliminar</h3><p>{preliminary.status}. {preliminary.matched.length} campos coinciden en dos lecturas con confianza mínima de 80 %; se necesitan 3 sin contradicciones. Este resultado no aprueba tu registro ni certifica tu identidad.</p><p>Coincidentes: {preliminary.matched.length?preliminary.matched.map(key=>sections.flatMap(([,fields])=>fields).find(field=>field.key===key)?.label).join(', '):'ninguno'}.</p><p>Para revisar: {preliminary.review.length+preliminary.conflicts.length} de {preliminaryFields.length} campos elegibles{preliminary.conflicts.length?`; ${preliminary.conflicts.length} con lecturas o datos diferentes`:''}.</p></div>
    {diagnostics&&<details className={styles.diagnostics}><summary>Detalle de la lectura</summary><p>«Pendiente» significa que todavía no se aplicó un dato al formulario. Esta tabla distingue si cada lectura localizó la etiqueta y extrajo un valor. No muestra tus datos personales ni se envía al servidor.</p>{diagnostics.warnings.length>0&&<p>Calidad de imagen: {diagnostics.warnings.map(warning=>ineQualityLabel[warning]||'Revisar calidad de imagen').join('; ')}.</p>}<div className={styles.diagnosticTable}><table><thead><tr><th>Campo</th><th>Imagen original</th><th>Imagen procesada</th></tr></thead><tbody>{sections.flatMap(([,fields])=>fields).map(({key,label})=><tr key={key}><th scope="row">{label}</th><td>{ineReadStatusLabel[diagnostics.original[key]]}</td><td>{ineReadStatusLabel[diagnostics.processed[key]]}</td></tr>)}</tbody></table></div><p>Si aparece «Dato extraído» y el campo sigue vacío, revisa los botones para aplicar la lectura. Los campos editados manualmente se conservan.</p></details>}
    <div className={styles.sectionCards}><h3>Revisa tus datos</h3><p>Abre cada apartado para corregir o completar campos. Los datos pendientes necesitan revisión manual.</p>{sections.map(([title,fields])=><button type="button" key={title} className={styles.sectionCard} onClick={()=>openSection(title)}><strong>{title}</strong><span>{fields.filter(({key})=>Boolean(value[key])).length} de {fields.length} con datos · {fields.filter(({key})=>!value[key]).length} pendientes</span></button>)}</div>
    <dialog ref={dialogRef} className={styles.dialog} onCancel={event=>{event.preventDefault();closeSection()}}>
    {activeSection&&sectionDraft&&<div className={styles.dialogContent}><div className={styles.dialogHeading}><h3>{activeSection}</h3><button type="button" aria-label="Cerrar sin guardar" onClick={closeSection}><X size={20}/></button></div><div className={styles.form}>
      {sections.filter(([title])=>title===activeSection).map(([title,fields])=><fieldset key={title}><legend>{title}</legend><div className={styles.fields}>{fields.map(({key,label,hint,required})=>{
        const status:Status=fieldStatus[key]||(sectionDraft[key]?'Revisar':'Pendiente');
        const issue=errors[key];
        return <div className={styles.field} key={key}><div className={styles.fieldHeader}><label htmlFor={'ine-'+key}>{label}{required&&' *'}</label><span className={styles.status} data-status={status}>{status}</span></div>{key==='sexo'?<select id={'ine-'+key} value={sectionDraft.sexo} onChange={event=>edit(key,event.target.value)} aria-invalid={!!issue} aria-describedby={issue?'ine-'+key+'-error':undefined}><option value="">Selecciona una opción</option><option value="H">Hombre (H)</option><option value="M">Mujer (M)</option><option value="NB">No binario (NB)</option></select>:<input id={'ine-'+key} type={key==='fechaNacimiento'?'date':'text'} max={key==='fechaNacimiento'?today():undefined} inputMode={key==='codigoPostal'?'numeric':undefined} maxLength={key==='curp'?18:key==='codigoPostal'?5:key==='vigencia'?16:200} autoComplete="off" value={sectionDraft[key]} onChange={event=>edit(key,event.target.value)} aria-invalid={!!issue} aria-describedby={issue?'ine-'+key+'-error':undefined}/>}<small>{hint||' '}</small>{issue&&<p id={'ine-'+key+'-error'} className="field-error" role="alert">{issue}</p>}</div>
      })}</div></fieldset>)}
    </div><div className={styles.dialogActions}><button type="button" className="secondary" onClick={closeSection}>Cancelar</button><button type="button" className="primary" onClick={saveSection}>Guardar cambios</button></div></div>}
    </dialog>
    <div className={styles.review}><h3>Confirmación</h3><p>Los estados describen la lectura, no una verificación oficial. Revisa los apartados antes de enviar.</p><label><input id="ine-confirm" type="checkbox" checked={confirmed} onChange={event=>onConfirmed(event.target.checked)} aria-invalid={!!confirmationError} aria-describedby={confirmationError?'ine-confirm-error':undefined}/>Confirmo que revisé y corregí los datos de mi identificación antes de enviar.</label>{confirmationError&&<p id="ine-confirm-error" className="field-error" role="alert">{confirmationError}</p>}</div>
  </section>
}
