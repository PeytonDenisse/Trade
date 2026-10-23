'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ShieldPlus} from 'lucide-react';
import {useConfirm,useToast} from '../feedback/feedback-provider';
import {day,errorText,type Api} from './shared';

// Equipo: who administers Trade. Nobody changes their own rights and one admin always remains.
export function Team({api,me,onPerson}:{api:Api;me:string;onPerson:(id:string)=>void}){
  const confirm=useConfirm(),toast=useToast();
  const [team,setTeam]=useState<any[]|null>(null),[error,setError]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false);
  const load=()=>api('admin/team').then(setTeam).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  async function change(body:any,ask:Parameters<typeof confirm>[0],done:string){
    if(!await confirm(ask))return;
    setBusy(true);try{await api('admin/role',body);toast(done);setEmail('');await load()}catch(cause){toast(errorText(cause),'error')}finally{setBusy(false)}
  }
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar el equipo. {error}</div>;
  if(!team)return <div className="admin-feedback" role="status">Cargando equipo…</div>;
  const add=(e:FormEvent)=>{e.preventDefault();const value=email.trim();change({email:value,admin:true},{title:`¿Dar permisos de administración a ${value}?`,body:'Podrá aprobar proveedores, desactivar cuentas, cambiar ajustes y ver documentos privados. La cuenta debe existir y no ser de proveedor.',confirmLabel:'Dar permisos'},`${value} ahora es administrador.`)};
  return <div className="team-admin">
    <form className="inline-form" onSubmit={add}>
      <label className="settings-field">Agregar por correo<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com"/></label>
      <button className="primary" type="submit" disabled={busy||!email.includes('@')}><ShieldPlus size={17}/>Dar permisos</button>
    </form>
    <ul className="team-list">{team.map(a=><li key={a.id}>
      <span className="person-initial" aria-hidden="true">{a.name.slice(0,1)}</span>
      <span><button type="button" className="text-button" onClick={()=>onPerson(a.id)}>{a.name}</button>{a.id===me&&<small> (tú)</small>}<small>{a.email}{a.created_at?` · desde ${day(a.created_at)}`:''}</small></span>
      {a.active===false&&<span className="status" data-status="Desactivada">Desactivada</span>}
      {a.id!==me&&<button type="button" className="text-button danger" disabled={busy||team.length<2} onClick={()=>change({id:a.id,admin:false},{title:`¿Quitar los permisos de ${a.name}?`,body:'Su cuenta seguirá activa como cliente.',confirmLabel:'Quitar permisos',danger:true},`${a.name} ya no es administrador.`)}>Quitar permisos</button>}
    </li>)}</ul>
    <p className="muted">Para quitarte tus propios permisos, pide a otra persona del equipo que lo haga.</p>
  </div>;
}
