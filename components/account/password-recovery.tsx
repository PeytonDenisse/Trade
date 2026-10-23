'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowLeft,KeyRound,MailCheck} from 'lucide-react';

// /recuperar: the person leaves their email; administration sends them a link (no email service yet).
export function ForgotPage({onSubmit,onBack}:{onSubmit:(email:string)=>Promise<string>;onBack:()=>void}){
  const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState('');
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{setSent(await onSubmit(email.trim()))}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo enviar.')}finally{setBusy(false)}
  }
  return <section className="recovery-card" aria-labelledby="forgot-title">
    <button type="button" className="text-button" onClick={onBack}><ArrowLeft size={16}/>Volver a iniciar sesión</button>
    <h1 id="forgot-title"><KeyRound size={24}/>Recuperar contraseña</h1>
    {sent?<div className="notice" role="status"><MailCheck size={18}/>{sent}</div>:<>
      <p>Escribe el correo de tu cuenta. Administración revisará la solicitud y te hará llegar un enlace para crear una contraseña nueva. El enlace vale 24 horas.</p>
      <form onSubmit={submit}>
        {error&&<p className="error" role="alert">{error}</p>}
        <label className="settings-field">Correo electrónico<input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} required/></label>
        <button className="primary" type="submit" disabled={busy||!email.trim()}>{busy?'Enviando…':'Pedir enlace'}</button>
      </form>
    </>}
  </section>;
}

// /restablecer/:token: checks the link, then sets the new password.
export function ResetPage({token,onCheck,onSubmit,onLogin}:{token:string;onCheck:(token:string)=>Promise<{valid:boolean;name?:string}>;onSubmit:(token:string,password:string)=>Promise<void>;onLogin:()=>void}){
  const [state,setState]=useState<{valid:boolean;name?:string}|null>(null);
  const [pw,setPw]=useState({next:'',again:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  useEffect(()=>{onCheck(token).then(setState).catch(()=>setState({valid:false}))},[token]);
  async function submit(event:FormEvent){
    event.preventDefault();setError('');
    if(pw.next.length<10)return setError('La contraseña debe tener al menos 10 caracteres.');
    if(pw.next!==pw.again)return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try{await onSubmit(token,pw.next);setDone(true)}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar.')}finally{setBusy(false)}
  }
  return <section className="recovery-card" aria-labelledby="reset-title">
    <h1 id="reset-title"><KeyRound size={24}/>Nueva contraseña</h1>
    {!state?<p role="status">Revisando el enlace…</p>
    :done?<><div className="notice" role="status">Contraseña guardada. Ya puedes iniciar sesión con ella.</div><button className="primary" type="button" onClick={onLogin}>Iniciar sesión</button></>
    :!state.valid?<><p className="error" role="alert">Este enlace ya se usó o venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».</p><button className="secondary" type="button" onClick={onLogin}>Ir a iniciar sesión</button></>
    :<><p>Hola, {state.name}. Elige una contraseña nueva; se cerrarán las sesiones abiertas con la anterior.</p>
      <form onSubmit={submit}>
        {error&&<p className="error" role="alert">{error}</p>}
        <label className="settings-field">Contraseña nueva<input type="password" autoComplete="new-password" value={pw.next} onChange={event=>setPw({...pw,next:event.target.value})} required/><small>Mínimo 10 caracteres.</small></label>
        <label className="settings-field">Repite la contraseña<input type="password" autoComplete="new-password" value={pw.again} onChange={event=>setPw({...pw,again:event.target.value})} required/></label>
        <button className="primary" type="submit" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button>
      </form></>}
  </section>;
}
