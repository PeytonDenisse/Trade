'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,FileLock2,History,KeyRound,Star,UserRound} from 'lucide-react';
import {RemoteImage} from '../trade/remote-image';
import {fileSrc} from '../../lib/design-images';
import {tradesOf} from '../../lib/rules';
import {useConfirm,useToast} from '../feedback/feedback-provider';
import {actionLabel,day,errorText,roleLabel,when,type Api} from './shared';

// Ficha de persona (/admin/personas/:id): account, registration, activity and every admin action on it.
export function PersonPage({api,id,me,onBack}:{api:Api;id:string;me:string;onBack:()=>void}){
  const confirm=useConfirm(),toast=useToast();
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[link,setLink]=useState('');
  const load=()=>api('admin/people/'+encodeURIComponent(id)).then(setData).catch(e=>setError(e.message));
  useEffect(()=>{setData(null);setLink('');load()},[id]);
  if(error)return <div className="person-page"><button type="button" className="text-button" onClick={onBack}><ArrowLeft size={16}/>Volver a Personas</button><div className="admin-feedback error" role="alert">{error}</div></div>;
  if(!data)return <div className="admin-feedback" role="status">Cargando ficha…</div>;
  const {person,registration:reg,requests,jobs,reviews,history,recovery}=data;
  const active=person.active!==false;
  const role=person.role==='admin'?'admin':reg?.status==='Aprobada'?'proveedor':'cliente';
  const rating=reviews.filter((r:any)=>r.stars&&!r.hidden);
  const average=rating.length?(rating.reduce((s:number,r:any)=>s+r.stars,0)/rating.length).toFixed(1):null;
  async function run(ask:Parameters<typeof confirm>[0],path:string,body:any,done:string){
    const answer=await confirm(ask);if(!answer)return;
    setBusy(true);try{await api(path,{...body,reason:answer.reason||undefined});toast(done);await load()}catch(cause){toast(errorText(cause),'error')}finally{setBusy(false)}
  }
  const toggleAccount=()=>run(active
    ?{title:`¿Desactivar la cuenta de ${person.name}?`,body:'No podrá iniciar sesión y se cerrarán sus sesiones. Verá el motivo al intentar entrar.',confirmLabel:'Desactivar cuenta',danger:true,reason:{label:'Motivo'}}
    :{title:`¿Reactivar la cuenta de ${person.name}?`,body:'Podrá volver a iniciar sesión.',confirmLabel:'Reactivar cuenta'},
    'account-active',{id,active:!active},`Cuenta ${active?'desactivada':'reactivada'}.`);
  const providerOn=reg?.active!==false;
  const toggleProvider=()=>run(providerOn
    ?{title:`¿Desactivar el perfil de proveedor de ${person.name}?`,body:'Dejará de aparecer en el catálogo y no podrá cotizar; podrá terminar los trabajos ya asignados.',confirmLabel:'Desactivar proveedor',danger:true,reason:{label:'Motivo'}}
    :{title:`¿Reactivar el perfil de proveedor de ${person.name}?`,body:'Volverá a aparecer en el catálogo y podrá cotizar.',confirmLabel:'Reactivar proveedor'},
    'provider-active',{id,active:!providerOn},`Perfil de proveedor ${providerOn?'desactivado':'reactivado'}.`);
  async function resetLink(){
    if(!await confirm({title:`¿Generar un enlace de recuperación para ${person.name}?`,body:'El enlace permite crear una contraseña nueva durante 24 horas. Cualquier enlace anterior deja de servir.',confirmLabel:'Generar enlace'}))return;
    try{const {path}=await api('reset-link',{id});setLink(window.location.origin+path);toast('Enlace generado.');await load()}catch(cause){toast(errorText(cause),'error')}
  }
  const list=(rows:any[],empty:string)=>rows.length?<ul className="person-requests">{rows.map(r=><li key={r.id}><span className="status" data-status={r.status}>{r.status}</span><span><strong>{r.trade}</strong><small>{r.description}</small></span><time dateTime={r.created}>{day(r.created)}</time></li>)}</ul>:<p className="muted">{empty}</p>;
  return <div className="person-page">
    <button type="button" className="text-button back-link" onClick={onBack}><ArrowLeft size={16}/>Volver a Personas</button>
    <section className="person-header">
      <span className="admin-person-photo">{person.photo_url?<RemoteImage src={person.photo_url} alt=""/>:reg?.photo?<RemoteImage src={fileSrc(reg.photo,reg.photo_url)} alt=""/>:<UserRound size={34}/>}</span>
      <div><h2>{person.name}</h2><p>{person.email}</p>
        <div className="badges"><span className="role-badge" data-role={role}>{roleLabel[role]}</span>{!active&&<span className="status" data-status="Desactivada">Cuenta desactivada</span>}{reg&&<span className="status" data-status={reg.status}>Proveedor: {reg.status}</span>}{reg?.status==='Aprobada'&&!providerOn&&<span className="status" data-status="Desactivada">Proveedor desactivado</span>}</div>
        {person.created_at&&<small>Registrada el {day(person.created_at)}</small>}
        {!active&&person.deactivated_reason&&<p className="reason-note">Motivo de la desactivación: {person.deactivated_reason}</p>}
      </div>
    </section>
    {person.id!==me&&person.role!=='admin'&&<section className="person-actions" aria-label="Acciones">
      <button type="button" className={active?'secondary danger-outline':'primary'} disabled={busy} onClick={toggleAccount}>{active?'Desactivar cuenta':'Reactivar cuenta'}</button>
      {reg?.status==='Aprobada'&&<button type="button" className="secondary" disabled={busy} onClick={toggleProvider}>{providerOn?'Desactivar proveedor':'Reactivar proveedor'}</button>}
      <button type="button" className="secondary" disabled={busy} onClick={resetLink}><KeyRound size={16}/>Enlace de recuperación</button>
    </section>}
    {link&&<p className="reset-link"><input readOnly value={link} aria-label="Enlace de recuperación" onFocus={e=>e.target.select()}/><button type="button" className="secondary small-action" onClick={()=>navigator.clipboard.writeText(link).then(()=>toast('Enlace copiado.','info'))}>Copiar</button></p>}
    {recovery&&!link&&<p className="muted"><KeyRound size={15}/> {recovery.status==='Solicitada'?`Pidió recuperar su contraseña el ${day(recovery.requested)}.`:`Tiene un enlace de recuperación vigente hasta ${when(new Date(recovery.expires).toISOString())}.`}</p>}
    <div className="person-grid">
      {reg&&<section className="settings-card"><h3>Registro de proveedor</h3>
        <dl className="admin-facts"><div><dt>Oficios</dt><dd>{tradesOf(reg).join(', ')}{reg.pending_trades?.length?<small> · por revisar: {reg.pending_trades.join(', ')}</small>:null}</dd></div><div><dt>Zona</dt><dd>{reg.zone}</dd></div><div><dt>Experiencia</dt><dd>{reg.experience}</dd></div><div><dt>Decisión</dt><dd>{reg.decided_at?`${reg.status} el ${day(reg.decided_at)}`:'Sin decisión'}{reg.reason?` · «${reg.reason}»`:''}</dd></div>{reg.deactivated_reason&&<div><dt>Motivo de desactivación</dt><dd>{reg.deactivated_reason}</dd></div>}</dl>
        {reg.document&&<details className="person-document"><summary><FileLock2 size={16}/>Ver documento de identificación</summary><RemoteImage src={'/api/files/'+reg.document} alt={`Documento de ${person.name}`}/></details>}
      </section>}
      <section className="settings-card"><h3>Solicitudes como cliente <span className="count-pill">{requests.length}</span></h3>{list(requests,'No ha publicado solicitudes.')}</section>
      {reg&&<section className="settings-card"><h3>Trabajos como proveedor <span className="count-pill">{jobs.length}</span></h3>{list(jobs,'Aún no tiene trabajos asignados.')}</section>}
      {reg&&<section className="settings-card"><h3><Star size={17}/>Reseñas recibidas {average&&<span className="count-pill">{average} ★</span>}</h3>{reviews.length?<ul className="person-reviews">{reviews.map((r:any)=><li key={r.request}><span>{r.stars?'★'.repeat(r.stars):'Sin estrellas'}</span><span>{r.comment||'Sin comentario'}</span>{r.hidden&&<span className="status" data-status="Desactivada">Oculta</span>}</li>)}</ul>:<p className="muted">Sin reseñas.</p>}</section>}
      <section className="settings-card person-history"><h3><History size={17}/>Historial de administración</h3>
        {history.length?<ol className="activity-list">{history.map((h:any)=><li key={h.id}><span><strong>{h.actor_name}</strong> · {actionLabel[h.action]||h.action}{h.detail?<small>«{h.detail}»</small>:null}</span><time dateTime={h.at}>{when(h.at)}</time></li>)}</ol>:<p className="muted">Ninguna acción de administración sobre esta cuenta.</p>}
      </section>
    </div>
  </div>;
}
