'use client';
import {useState,type FormEvent,type ReactNode} from 'react';
import {KeyRound,ShieldAlert,UserRound} from 'lucide-react';
import {Avatar} from './account-menu';
import {useConfirm,useToast} from '../feedback/feedback-provider';

type Props={
  user:any;
  photoUpload:ReactNode;
  onRemovePhoto:()=>Promise<void>;
  onSaveName:(name:string)=>Promise<void>;
  onChangePassword:(current:string,password:string)=>Promise<void>;
  onDeactivate:(password:string)=>Promise<void>;
};

// Runs a form action: keeps the button busy, shows the error under the form, toasts success.
function useAction(){
  const toast=useToast();
  const [busy,setBusy]=useState(''),[error,setError]=useState<{form:string;text:string}|null>(null);
  async function run(form:string,action:()=>Promise<void>,done?:string){
    setBusy(form);setError(null);
    try{await action();if(done)toast(done);return true}catch(cause){setError({form,text:cause instanceof Error?cause.message:'No se pudo guardar.'});return false}finally{setBusy('')}
  }
  const errorFor=(form:string)=>error?.form===form?<p className="error" role="alert">{error.text}</p>:null;
  return {busy,run,errorFor};
}

// Mi cuenta (/cuenta): profile, password and closing the account.
export function AccountPage({user,photoUpload,onRemovePhoto,onSaveName,onChangePassword,onDeactivate}:Props){
  const confirm=useConfirm();
  const {busy,run,errorFor}=useAction();
  const [name,setName]=useState(user.name);
  const [pw,setPw]=useState({current:'',next:'',again:''});
  const [closing,setClosing]=useState('');
  async function savePassword(event:FormEvent){
    event.preventDefault();
    if(await run('password',async()=>{
      if(pw.next.length<10)throw new Error('La contraseña nueva debe tener al menos 10 caracteres.');
      if(pw.next!==pw.again)throw new Error('Las contraseñas nuevas no coinciden.');
      await onChangePassword(pw.current,pw.next);
    },'Contraseña actualizada. Se cerraron tus sesiones en otros dispositivos.'))setPw({current:'',next:'',again:''});
  }
  async function deactivate(event:FormEvent){
    event.preventDefault();
    if(!await confirm({title:'¿Desactivar tu cuenta?',body:'Se cerrará tu sesión y no podrás volver a entrar. Para recuperarla tendrás que pedirlo a administración.',confirmLabel:'Desactivar mi cuenta',danger:true}))return;
    await run('close',()=>onDeactivate(closing));
  }
  return <div className="account-page">
    <div className="page-heading"><p className="eyebrow">MI CUENTA</p><h1>Ajustes de la cuenta</h1><p>Cambia tu nombre, tu foto y tu contraseña.</p></div>

    <section className="settings-card" aria-labelledby="account-profile">
      <h2 id="account-profile"><UserRound size={20}/>Perfil</h2>
      <div className="settings-photo"><Avatar user={user} size={72}/><div>{photoUpload}{user.photo&&<button type="button" className="text-button" disabled={!!busy} onClick={()=>run('photo',onRemovePhoto,'Foto eliminada.')}>Quitar foto</button>}</div></div>
      <form onSubmit={event=>{event.preventDefault();run('name',()=>onSaveName(name),'Nombre actualizado.')}}>
        {errorFor('name')}{errorFor('photo')}
        <label className="settings-field">Nombre<input value={name} maxLength={100} autoComplete="name" onChange={event=>setName(event.target.value)}/></label>
        <label className="settings-field">Correo electrónico<input value={user.email} readOnly aria-describedby="email-help"/><small id="email-help">El correo identifica tu cuenta y no se puede cambiar.</small></label>
        <button className="primary" type="submit" disabled={busy==='name'||!name.trim()||name.trim()===user.name}>{busy==='name'?'Guardando…':'Guardar nombre'}</button>
      </form>
    </section>

    <section className="settings-card" aria-labelledby="account-password">
      <h2 id="account-password"><KeyRound size={20}/>Contraseña</h2>
      <form onSubmit={savePassword}>
        {errorFor('password')}
        <label className="settings-field">Contraseña actual<input type="password" autoComplete="current-password" value={pw.current} onChange={event=>setPw({...pw,current:event.target.value})} required/></label>
        <label className="settings-field">Contraseña nueva<input type="password" autoComplete="new-password" minLength={10} value={pw.next} onChange={event=>setPw({...pw,next:event.target.value})} required/><small>Mínimo 10 caracteres.</small></label>
        <label className="settings-field">Repite la contraseña nueva<input type="password" autoComplete="new-password" value={pw.again} onChange={event=>setPw({...pw,again:event.target.value})} required/></label>
        <button className="primary" type="submit" disabled={busy==='password'||!pw.current||!pw.next}>{busy==='password'?'Guardando…':'Cambiar contraseña'}</button>
      </form>
    </section>

    {user.role!=='admin'&&<section className="settings-card danger-zone" aria-labelledby="account-close">
      <h2 id="account-close"><ShieldAlert size={20}/>Desactivar cuenta</h2>
      <p>Tus solicitudes y trabajos se conservan, pero no podrás iniciar sesión ni aparecer en el catálogo.</p>
      <form onSubmit={deactivate}>
        {errorFor('close')}
        <label className="settings-field">Confirma con tu contraseña<input type="password" autoComplete="current-password" value={closing} onChange={event=>setClosing(event.target.value)} required/></label>
        <button className="secondary danger-outline" type="submit" disabled={busy==='close'||!closing}>Desactivar mi cuenta</button>
      </form>
    </section>}
  </div>;
}
