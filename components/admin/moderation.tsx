'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,EyeOff,Star} from 'lucide-react';
import {useConfirm,useToast} from '../feedback/feedback-provider';
import {day,errorText,type Api} from './shared';

const outcomes=[
  {value:'Terminado',label:'Vuelve a «Terminado»: el cliente revisa y confirma'},
  {value:'Asignada',label:'Vuelve a «Asignada»: el proveedor sigue trabajando'},
  {value:'Completado',label:'Se da por completado'},
  {value:'Cancelada',label:'Se cancela el trabajo'},
];

// Moderación: problem reports, reviews and requests that have waited the longest.
export function Moderation({api,onPerson}:{api:Api;onPerson:(id:string)=>void}){
  const confirm=useConfirm(),toast=useToast();
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[resolving,setResolving]=useState<Record<string,{outcome:string;resolution:string}>>({});
  const load=()=>api('admin/moderation').then(setData).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  async function act(path:string,body:any,done:string){try{await api(path,body);toast(done);await load()}catch(cause){toast(errorText(cause),'error')}}
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar la moderación. {error}</div>;
  if(!data)return <div className="admin-feedback" role="status">Cargando…</div>;
  const open=data.reports.filter((r:any)=>r.status==='Abierto'),closed=data.reports.filter((r:any)=>r.status!=='Abierto');
  const form=(id:string)=>resolving[id]||{outcome:'Terminado',resolution:''};
  return <div className="moderation">
    <section aria-labelledby="mod-reports"><h2 id="mod-reports" className="admin-section-title"><AlertTriangle size={19}/>Reportes abiertos <span className="count-pill">{open.length}</span></h2>
      {open.length?<div className="report-list">{open.map((r:any)=>{const f=form(r.id);return <article key={r.id} className="report-card">
        <header><span className="status" data-status={r.request_status}>{r.request_status}</span><strong>{r.trade}</strong><small>Reportado el {day(r.created)}</small></header>
        <p className="report-reason">«{r.reason}»</p>
        <p className="muted">Reporta <button type="button" className="text-button" onClick={()=>onPerson(r.by)}>{r.by_name}</button>{r.against&&<> sobre <button type="button" className="text-button" onClick={()=>onPerson(r.against)}>{r.against_name}</button></>} · Trabajo: {r.description}</p>
        <form className="report-resolve" onSubmit={e=>{e.preventDefault();act('admin/report-resolve',{id:r.id,...f},'Reporte resuelto. Ambas partes verán la decisión.')}}>
          <label className="settings-field">Cómo continúa<select value={f.outcome} onChange={e=>setResolving({...resolving,[r.id]:{...f,outcome:e.target.value}})}>{outcomes.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="settings-field">Decisión (la verán el cliente y el proveedor)<textarea rows={2} maxLength={1000} value={f.resolution} onChange={e=>setResolving({...resolving,[r.id]:{...f,resolution:e.target.value}})}/></label>
          <button className="primary" type="submit" disabled={f.resolution.trim().length<3}>Resolver reporte</button>
        </form>
      </article>})}</div>:<p className="attention-clear">No hay reportes abiertos.</p>}
      {closed.length>0&&<details className="resolved-reports"><summary>Reportes resueltos ({closed.length})</summary><ul>{closed.map((r:any)=><li key={r.id}><strong>{r.trade}</strong> · {r.by_name}: «{r.reason}» → {r.resolution} <small>({day(r.resolved_at)})</small></li>)}</ul></details>}
    </section>
    <section aria-labelledby="mod-reviews"><h2 id="mod-reviews" className="admin-section-title"><Star size={19}/>Reseñas recientes</h2>
      {data.reviews.length?<ul className="review-moderation">{data.reviews.map((r:any)=><li key={r.request} className={r.hidden?'is-hidden':undefined}>
        <span className="stars" aria-label={r.stars?`${r.stars} de 5 estrellas`:'Sin estrellas'}>{r.stars?'★'.repeat(r.stars)+'☆'.repeat(5-r.stars):'—'}</span>
        <span><strong>{r.owner_name}</strong> sobre <button type="button" className="text-button" onClick={()=>onPerson(r.provider)}>{r.provider_name}</button><small>{r.comment||'Sin comentario'}{r.hidden&&r.hidden_reason?` · Oculta: ${r.hidden_reason}`:''}</small></span>
        {r.hidden?<button type="button" className="text-button" onClick={()=>act('admin/review-hidden',{request:r.request,hidden:false},'Reseña visible de nuevo.')}>Mostrar</button>
        :<button type="button" className="text-button danger" onClick={async()=>{const a=await confirm({title:'¿Ocultar esta reseña?',body:'Saldrá del perfil público y del promedio de estrellas. Queda guardada y puedes volver a mostrarla.',confirmLabel:'Ocultar reseña',danger:true,reason:{label:'Motivo',required:true,placeholder:'Ej.: lenguaje ofensivo, datos personales.'}});if(a)act('admin/review-hidden',{request:r.request,hidden:true,reason:a.reason},'Reseña oculta.')}}><EyeOff size={14}/>Ocultar</button>}
      </li>)}</ul>:<p className="muted">Aún no hay reseñas.</p>}
    </section>
    <section aria-labelledby="mod-waiting"><h2 id="mod-waiting" className="admin-section-title">Solicitudes abiertas más antiguas</h2>
      <p className="muted">Cierra las que estén duplicadas, abandonadas o fuera de las reglas. Las activas vencen solas según los Ajustes.</p>
      {data.waiting.length?<ul className="person-requests waiting-list">{data.waiting.map((r:any)=><li key={r.id}><span className="status" data-status={r.status}>{r.status}</span><span><strong>{r.trade} · {r.owner_name}</strong><small>{r.description}</small></span><span className="waiting-actions"><time dateTime={r.created}>{day(r.created)}</time><button type="button" className="text-button danger" onClick={async()=>{const a=await confirm({title:'¿Cerrar esta solicitud?',body:'Pasará a «Cancelada» y el cliente verá el motivo.',confirmLabel:'Cerrar solicitud',danger:true,reason:{label:'Motivo',required:true}});if(a)act('admin/request-close',{id:r.id,reason:a.reason},'Solicitud cerrada.')}}>Cerrar</button></span></li>)}</ul>:<p className="muted">No hay solicitudes abiertas.</p>}
    </section>
  </div>;
}
