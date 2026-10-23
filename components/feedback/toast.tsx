'use client';
import {AlertCircle,CheckCircle2,Info,X} from 'lucide-react';

export type ToastKind='success'|'error'|'info';
export type Toast={id:number;text:string;kind:ToastKind};
const icons={success:CheckCircle2,error:AlertCircle,info:Info};

// Bottom-corner messages; screen readers hear them through the live region.
export function Toasts({toasts,onDismiss}:{toasts:Toast[];onDismiss:(id:number)=>void}){
  return <div className="toast-region" aria-live="polite" aria-relevant="additions">
    {toasts.map(t=>{const Icon=icons[t.kind];return <div key={t.id} className="toast" data-kind={t.kind} role={t.kind==='error'?'alert':'status'}>
      <Icon size={19} aria-hidden="true"/><span>{t.text}</span>
      <button type="button" className="icon-button" aria-label="Cerrar mensaje" onClick={()=>onDismiss(t.id)}><X size={16}/></button>
    </div>})}
  </div>;
}
