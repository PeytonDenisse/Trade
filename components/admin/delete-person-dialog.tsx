'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {AlertTriangle} from 'lucide-react';

type Person={id:string;name:string;email:string};

export function DeletePersonDialog({person,onClose,onDelete}:{person:Person;onClose:()=>void;onDelete:(person:Person)=>Promise<void>}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [typed,setTyped]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{dialog.current?.showModal();return()=>{dialog.current?.close()}},[]);
  const matches=typed.trim()===person.email;
  async function submit(event:FormEvent){
    event.preventDefault();if(!matches||busy)return;
    setBusy(true);setError('');
    try{await onDelete(person)}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo eliminar la cuenta.');setBusy(false)}
  }
  return <dialog ref={dialog} className="person-delete-dialog" aria-labelledby="person-delete-title" aria-describedby="person-delete-description" onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
    <form onSubmit={submit} noValidate>
      <div className="person-delete-heading"><AlertTriangle size={24} aria-hidden="true"/><h2 id="person-delete-title">Eliminar usuario</h2></div>
      <p id="person-delete-description">Se eliminará la cuenta de <strong>{person.name}</strong> ({person.email}), sus sesiones, su perfil de proveedor y sus archivos privados. El historial cerrado se conservará sin sus datos personales. Si tiene solicitudes o cotizaciones en curso, o reportes abiertos, la eliminación se bloqueará. La operación es definitiva.</p>
      <label htmlFor="person-delete-email">Escribe el correo para confirmar<input id="person-delete-email" type="email" autoComplete="off" spellCheck={false} value={typed} onChange={event=>setTyped(event.target.value)} aria-invalid={!!error} autoFocus/></label>
      {error&&<p className="field-error" role="alert">{error}</p>}
      <div className="person-delete-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="primary danger" disabled={!matches||busy}>{busy?'Eliminando…':'Eliminar usuario'}</button></div>
    </form>
  </dialog>;
}
