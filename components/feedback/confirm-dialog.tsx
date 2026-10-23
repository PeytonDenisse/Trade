'use client';
import {useEffect,useRef,useState} from 'react';
import {AlertTriangle} from 'lucide-react';

export type ConfirmOptions={
  title:string;
  body?:string;
  confirmLabel:string;
  // Label of the button that closes without acting ("Cancelar" unless that would read like the action).
  cancelLabel?:string;
  danger?:boolean;
  // Asks for a written reason (reject, deactivate); required ones block the button until filled.
  reason?:{label:string;required?:boolean;placeholder?:string};
};

// Native <dialog> as a modal: it traps focus, closes with Escape and returns focus when it closes.
export function ConfirmDialog({title,body,confirmLabel,cancelLabel='Cancelar',danger,reason,onClose}:ConfirmOptions&{onClose:(value:{reason:string}|null)=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  const [text,setText]=useState('');
  useEffect(()=>{const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal()},[]);
  const missing=!!reason?.required&&text.trim().length<3;
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={event=>{event.preventDefault();onClose(null)}}>
    <form method="dialog" onSubmit={event=>{event.preventDefault();if(!missing)onClose({reason:text.trim()})}}>
      <div className="confirm-heading">{danger&&<span className="confirm-icon" aria-hidden="true"><AlertTriangle size={20}/></span>}<h2 id="confirm-title">{title}</h2></div>
      {body&&<p className="confirm-body">{body}</p>}
      {reason&&<label className="confirm-reason">{reason.label}{reason.required?'':' (opcional)'}<textarea value={text} onChange={event=>setText(event.target.value)} placeholder={reason.placeholder} rows={3} maxLength={300} autoFocus/></label>}
      <div className="confirm-actions">
        <button type="button" className="secondary" onClick={()=>onClose(null)} autoFocus={!reason}>{cancelLabel}</button>
        <button type="submit" className={danger?'primary danger':'primary'} disabled={missing}>{confirmLabel}</button>
      </div>
    </form>
  </dialog>;
}
