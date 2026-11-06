'use client';
import {useState,type FormEvent} from 'react';
import {IneIdentityCapture} from './ine-identity-capture';
import {emptyIneDraft,ineIdentityErrors,validateIneIdentity} from '../../lib/ine-identity';
import {api} from '../../lib/http-client';

export function IneCorrection({previousDocument,onUploadDocument,onSaved}:{previousDocument:string;onUploadDocument:(file:File)=>Promise<string>;onSaved:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[identity,setIdentity]=useState(emptyIneDraft),[document,setDocument]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [showRequired,setShowRequired]=useState(false);
 async function submit(event:FormEvent){
  event.preventDefault();setShowRequired(true);setError('');
  if(!document||!confirmed||Object.keys(ineIdentityErrors(identity)).length){setError('Adjunta una nueva imagen, completa los datos y confirma que los revisaste.');return}
  setBusy(true);
  try{await api('provider/identity-correction',{previousDocument,document,identity:validateIneIdentity(identity)});await onSaved();setOpen(false)}
  catch(e){setError(e instanceof Error?e.message:'No se pudieron guardar las correcciones.')}
  finally{setBusy(false)}
 }
 if(!open)return <button type="button" className="secondary" onClick={()=>setOpen(true)}>Corregir identificación y volver a revisión</button>;
 return <form onSubmit={submit} noValidate><p>Adjunta una nueva captura y revisa los datos. Tus oficios e información profesional se conservarán.</p><IneIdentityCapture value={identity} onChange={setIdentity} documentId={document} onUploadDocument={onUploadDocument} onDocumentAttached={setDocument} confirmed={confirmed} onConfirmed={setConfirmed} errors={showRequired?ineIdentityErrors(identity):{}} showRequired={showRequired}/>{error&&<p className="error" role="alert">{error}</p>}<div className="admin-actions"><button className="primary" disabled={busy} type="submit">{busy?'Guardando…':'Enviar correcciones'}</button><button className="secondary" disabled={busy} type="button" onClick={()=>setOpen(false)}>Cancelar</button></div></form>;
}
