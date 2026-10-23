'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,ClipboardList,Copy,FileLock2,KeyRound,UserRound} from 'lucide-react';
import {RemoteImage} from '../trade/remote-image';
import {fileSrc} from '../../lib/design-images';
import {tradesOf} from '../../lib/rules';
import {useConfirm,useToast} from '../feedback/feedback-provider';
import {day,errorText,when,type Api} from './shared';

// Por revisar: provider registrations and password recovery requests (approval queue).
export function ReviewQueue({api,onPerson}:{api:Api;onPerson:(id:string)=>void}){
  const confirm=useConfirm(),toast=useToast();
  const [items,setItems]=useState<any[]|null>(null),[resets,setResets]=useState<any[]>([]),[error,setError]=useState('');
  const [selectedId,setSelectedId]=useState(''),[busy,setBusy]=useState(false),[links,setLinks]=useState<Record<string,string>>({});
  async function load(){try{const [apps,open]=await Promise.all([api('applications'),api('password-resets')]);setItems(apps.filter((a:any)=>a.status==='Pendiente'));setResets(open)}catch(e:any){setError(e.message)}}
  useEffect(()=>{load()},[]);
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar la lista. {error}</div>;
  if(!items)return <div className="admin-feedback" role="status">Cargando pendientes…</div>;
  const selected=items.find(i=>i.id===selectedId)||items[0];
  async function decide(approve:boolean){
    if(!selected)return;
    const answer=await confirm(approve
      ?{title:`¿Aprobar a ${selected.name}?`,body:`Aparecerá en el catálogo como proveedor de ${tradesOf(selected).join(', ')} y podrá cotizar.`,confirmLabel:'Aprobar proveedor'}
      :{title:`¿Rechazar el registro de ${selected.name}?`,body:'La persona verá el motivo en su registro y podrá enviar uno nuevo.',confirmLabel:'Rechazar registro',danger:true,reason:{label:'Motivo del rechazo',required:true,placeholder:'Ej.: la foto de la identificación no se lee.'}});
    if(!answer)return;
    setBusy(true);
    try{await api(approve?'approve':'reject',{id:selected.id,reason:answer.reason});toast(approve?`${selected.name}: registro aprobado. Ya aparece en el catálogo.`:`${selected.name}: registro rechazado.`);setSelectedId('');await load()}
    catch(cause){toast(errorText(cause),'error')}finally{setBusy(false)}
  }
  async function issue(r:any){
    try{const {path}=await api('reset-link',{id:r.user_id});const link=window.location.origin+path;setLinks(l=>({...l,[r.user_id]:link}));toast(`Enlace generado para ${r.name}. Vale 24 horas.`);await load()}
    catch(cause){toast(errorText(cause),'error')}
  }
  async function copy(link:string){try{await navigator.clipboard.writeText(link);toast('Enlace copiado.','info')}catch{toast('No se pudo copiar; selecciona el enlace y cópialo.','error')}}
  return <div className="review-queue">
    <section aria-labelledby="queue-registrations">
      <h2 id="queue-registrations" className="admin-section-title">Registros de proveedor <span className="count-pill">{items.length}</span></h2>
      {items.length?<div className="admin-grid"><div className="admin-list"><div className="admin-items">{items.map(item=><button key={item.id} type="button" className="admin-item" aria-current={selected?.id===item.id?'true':undefined} onClick={()=>setSelectedId(item.id)}><span className="admin-item-photo">{item.photo?<RemoteImage src={fileSrc(item.photo,item.photo_url)} alt=""/>:<UserRound size={24}/>}</span><span className="admin-item-copy"><strong>{item.name}</strong><small>{tradesOf(item).join(', ')} · {item.zone}</small></span><ArrowRight size={17}/></button>)}</div></div>
        {selected&&<section className="admin-detail" aria-label={`Registro de ${selected.name}`}>
          <div className="admin-person"><span className="admin-person-photo">{selected.photo?<RemoteImage src={fileSrc(selected.photo,selected.photo_url)} alt={`Foto de perfil de ${selected.name}`}/>:<UserRound size={32}/>}</span><div><span className="status" data-status="Pendiente">Pendiente</span><h2>{selected.name}</h2><p>{tradesOf(selected).join(', ')} · {selected.zone}</p><button type="button" className="text-button" onClick={()=>onPerson(selected.id)}>Ver ficha completa</button></div></div>
          <dl className="admin-facts"><div><dt>Oficios</dt><dd>{tradesOf(selected).join(', ')}</dd></div><div><dt>Zona</dt><dd>{selected.zone}</dd></div><div><dt>Experiencia</dt><dd>{selected.experience}</dd></div><div><dt>Descripción</dt><dd>{selected.description}</dd></div></dl>
          <div className="admin-document"><h3>Documento de identificación</h3>{selected.document?<RemoteImage src={'/api/files/'+selected.document} alt={`Documento privado de ${selected.name}`}/>:<p>No se adjuntó un documento.</p>}<p><FileLock2 size={19}/> Documento privado: solo la persona y administración pueden verlo.</p></div>
          <div className="admin-actions"><button className="primary" type="button" disabled={busy} onClick={()=>decide(true)}>{busy?'Guardando…':'Aprobar proveedor'} <ArrowRight size={18}/></button><button className="secondary" type="button" disabled={busy} onClick={()=>decide(false)}>Rechazar…</button></div>
        </section>}
      </div>:<div className="admin-empty"><ClipboardList size={34}/><h3>No hay registros pendientes</h3><p>Los registros nuevos de proveedores aparecerán aquí.</p></div>}
    </section>
    <section aria-labelledby="queue-resets">
      <h2 id="queue-resets" className="admin-section-title">Recuperación de contraseña <span className="count-pill">{resets.length}</span></h2>
      <p className="muted">Trade aún no envía correos: genera el enlace y hazlo llegar a la persona por un medio en que confíes.</p>
      {resets.length?<ul className="reset-list">{resets.map(r=><li key={r.id}>
        <KeyRound size={18} aria-hidden="true"/>
        <span><button type="button" className="text-button" onClick={()=>onPerson(r.user_id)}>{r.name}</button><small>{r.email} · pidió el {day(r.requested)}</small>{r.status==='Enviada'&&!links[r.user_id]&&<small>Enlace enviado; vence {when(new Date(r.expires).toISOString())}</small>}</span>
        {links[r.user_id]?<span className="reset-link"><input readOnly value={links[r.user_id]} aria-label={`Enlace para ${r.name}`} onFocus={e=>e.target.select()}/><button type="button" className="secondary small-action" onClick={()=>copy(links[r.user_id])}><Copy size={15}/>Copiar</button></span>
        :<button type="button" className="primary small-action" onClick={()=>issue(r)}>{r.status==='Enviada'?'Generar otro enlace':'Generar enlace'}</button>}
      </li>)}</ul>:<p className="attention-clear">Nadie ha pedido recuperar su contraseña.</p>}
    </section>
  </div>;
}
