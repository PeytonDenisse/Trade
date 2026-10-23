'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,ArrowRight,ClipboardCheck,KeyRound,UsersRound} from 'lucide-react';
import {actionLabel,when,type Api} from './shared';

const statusOrder=['Activa','Asignada','Terminado','Completado','Cancelada','Vencida','En disputa'];

// Tablero: what needs attention first, then the platform's numbers and the latest admin activity.
export function Dashboard({api,onTab}:{api:Api;onTab:(tab:string)=>void}){
  const [data,setData]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{api('admin/summary').then(setData).catch(e=>setError(e.message))},[]);
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar el tablero. {error}</div>;
  if(!data)return <div className="admin-feedback" role="status">Cargando tablero…</div>;
  const {attention,roles,inactive,requests,week,activity}=data;
  const people=(roles.cliente||0)+(roles.proveedor||0)+(roles.admin||0);
  const tasks=[
    {n:attention.registrations,label:'Registros de proveedor por revisar',tab:'por-revisar',Icon:ClipboardCheck},
    {n:attention.recoveries,label:'Personas que olvidaron su contraseña',tab:'por-revisar',Icon:KeyRound},
    {n:attention.reports,label:'Reportes de problemas abiertos',tab:'moderacion',Icon:AlertTriangle},
  ];
  const pending=tasks.filter(t=>t.n>0);
  return <div className="admin-dashboard">
    <section aria-labelledby="dash-attention">
      <h2 id="dash-attention" className="admin-section-title">Necesita tu atención</h2>
      {pending.length?<div className="attention-list">{pending.map(t=><button key={t.label} type="button" className="attention-item" onClick={()=>onTab(t.tab)}><t.Icon size={20} aria-hidden="true"/><strong>{t.n}</strong><span>{t.label}</span><ArrowRight size={17} aria-hidden="true"/></button>)}</div>
      :<p className="attention-clear">Todo al día: no hay registros, recuperaciones ni reportes pendientes.</p>}
    </section>
    <section aria-labelledby="dash-numbers">
      <h2 id="dash-numbers" className="admin-section-title">La plataforma hoy</h2>
      <div className="stat-tiles">
        <div className="stat-tile"><span>Personas</span><strong>{people}</strong><small>{roles.cliente||0} clientes · {roles.proveedor||0} proveedores · {roles.admin||0} admin.</small></div>
        <div className="stat-tile"><span>Cuentas desactivadas</span><strong>{inactive}</strong><small>No pueden iniciar sesión</small></div>
        <div className="stat-tile"><span>Nuevas personas</span><strong>{week.people}</strong><small>Últimos 7 días</small></div>
        <div className="stat-tile"><span>Nuevas solicitudes</span><strong>{week.requests}</strong><small>Últimos 7 días</small></div>
      </div>
    </section>
    <section aria-labelledby="dash-requests">
      <h2 id="dash-requests" className="admin-section-title">Solicitudes por estado</h2>
      <dl className="status-counts">{statusOrder.filter(s=>requests[s]).map(s=><div key={s}><dt><span className="status" data-status={s}>{s}</span></dt><dd>{requests[s]}</dd></div>)}</dl>
    </section>
    <section aria-labelledby="dash-activity">
      <div className="admin-section-row"><h2 id="dash-activity" className="admin-section-title">Actividad reciente</h2><button type="button" className="text-button" onClick={()=>onTab('actividad')}>Ver toda la actividad <ArrowRight size={15}/></button></div>
      {activity.length?<ol className="activity-list">{activity.map((a:any)=><li key={a.id}><UsersRound size={16} aria-hidden="true"/><span><strong>{a.actor_name}</strong> · {actionLabel[a.action]||a.action}{a.target_name?<> · {a.target_name}</>:null}{a.detail?<small>«{a.detail}»</small>:null}</span><time dateTime={a.at}>{when(a.at)}</time></li>)}</ol>
      :<p className="muted">Aún no hay acciones de administración registradas.</p>}
    </section>
  </div>;
}
