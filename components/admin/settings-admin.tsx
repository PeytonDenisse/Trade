'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {useToast} from '../feedback/feedback-provider';
import {errorText,type Api} from './shared';

type Settings={registrationOpen:boolean;providerApplicationsOpen:boolean;requestExpiryDays:number;maxOpenRequests:number};

// Ajustes: platform rules the API enforces.
export function SettingsAdmin({api}:{api:Api}){
  const toast=useToast();
  const [saved,setSaved]=useState<Settings|null>(null),[form,setForm]=useState<Settings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{api('admin/settings').then(s=>{setSaved(s);setForm(s)}).catch(e=>setError(e.message))},[]);
  if(error)return <div className="admin-feedback error" role="alert">No se pudieron cargar los ajustes. {error}</div>;
  if(!form||!saved)return <div className="admin-feedback" role="status">Cargando ajustes…</div>;
  const changed=Object.fromEntries(Object.entries(form).filter(([k,v])=>saved[k as keyof Settings]!==v));
  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);
    try{const next=await api('admin/settings',changed);setSaved(next);setForm(next);toast('Ajustes guardados.')}catch(cause){toast(errorText(cause),'error')}finally{setBusy(false)}
  }
  const toggle=(key:'registrationOpen'|'providerApplicationsOpen',label:string,help:string)=><label className="setting-toggle"><input type="checkbox" checked={form[key]} onChange={e=>setForm({...form,[key]:e.target.checked})}/><span><strong>{label}</strong><small>{help}</small></span></label>;
  const number=(key:'requestExpiryDays'|'maxOpenRequests',label:string,help:string,min:number,max:number)=><label className="settings-field setting-number">{label}<input type="number" min={min} max={max} value={form[key]} onChange={e=>setForm({...form,[key]:Number(e.target.value)})}/><small>{help}</small></label>;
  return <form className="settings-admin" onSubmit={save}>
    <section className="settings-card"><h2>Registro</h2>
      {toggle('registrationOpen','Permitir cuentas nuevas','Si lo apagas, nadie puede crear una cuenta; quienes ya tienen una siguen entrando.')}
      {toggle('providerApplicationsOpen','Recibir registros de proveedores','Si lo apagas, nadie puede enviar un registro de proveedor nuevo.')}
    </section>
    <section className="settings-card"><h2>Solicitudes</h2>
      {number('requestExpiryDays','Días para que venza una solicitud sin respuesta','Una solicitud activa sin propuesta aceptada pasa a «Vencida» después de estos días.',1,365)}
      {number('maxOpenRequests','Solicitudes activas por cliente','Evita que una cuenta llene el tablero de oportunidades.',1,100)}
    </section>
    <div className="settings-save"><button className="primary" type="submit" disabled={busy||!Object.keys(changed).length}>{busy?'Guardando…':'Guardar ajustes'}</button>{Object.keys(changed).length>0&&<button type="button" className="text-button" onClick={()=>setForm(saved)}>Descartar cambios</button>}</div>
  </form>;
}
