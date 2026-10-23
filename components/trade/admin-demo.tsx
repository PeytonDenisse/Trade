'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,CheckCircle2,ClipboardList,Download,FileLock2,House,Search,ShieldCheck,UserRound,Wrench,X} from 'lucide-react';
import {RemoteImage} from './remote-image';
import {designImages,fileSrc} from '../../lib/design-images';

type Person={id:string;name:string;email:string;role:string;requests:number;provider_status?:string;active?:boolean;provider_active?:boolean};
type SetActive=(kind:'account'|'provider',id:string,active:boolean)=>Promise<void>;
type Application={id:string;name:string;trade:string;zone:string;experience:string;description:string;photo?:string;photo_url?:string;document?:string;status:string};
const assets=[['perfil.png','Foto de perfil'],['identificacion.png','Identificación ficticia'],['antes.png','Antes'],['despues.png','Después']] as const;

export function AdminReview({items,people,loading,error,onApprove,onReject,onSetActive}:{items:Application[];people:Person[];loading:boolean;error:string;onApprove:(id:string)=>Promise<void>;onReject:(id:string)=>Promise<void>;onSetActive:SetActive}){
  const [tab,setTab]=useState<'pending'|'people'>('pending');
  const pending=items.filter(item=>item.status==='Pendiente');
  const [selectedId,setSelectedId]=useState('');
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState('');
  const [success,setSuccess]=useState('');
  const selected=pending.find(item=>item.id===selectedId)||pending[0];
  async function decide(approve:boolean){if(!selected)return;setBusy(true);setActionError('');setSuccess('');try{await (approve?onApprove:onReject)(selected.id);setSuccess(approve?`${selected.name}: registro aprobado. Su perfil ya puede mostrarse en Trade.`:`${selected.name}: registro rechazado. Podrá enviar uno nuevo.`)}catch(cause){setActionError(cause instanceof Error?cause.message:'No se pudo guardar la decisión.')}finally{setBusy(false)}}
  return <div className="admin-review"><div className="admin-heading"><p className="eyebrow">MI INICIO · ADMINISTRACIÓN</p><h1>Panel de administración</h1><p>Aprueba o rechaza registros de proveedores y administra las cuentas de clientes, proveedores y administradores.</p></div>
    <div className="admin-tabs" role="tablist" aria-label="Vistas de administración">{([['pending','Por revisar',pending.length],['people','Personas',people.length]] as const).map(([key,label,count])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label} <span>{loading?'…':count}</span></button>)}</div>
    {success&&<p className="notice" role="status"><CheckCircle2 size={19}/>{success}</p>}{actionError&&<p className="error" role="alert">{actionError}</p>}
    {tab==='pending'&&<>{loading?<div className="admin-feedback" role="status">Cargando registros pendientes…</div>:error?<div className="admin-feedback error" role="alert">No se pudieron cargar los registros. {error}</div>:pending.length?<div className="admin-grid"><section className="admin-list"><div className="admin-list-heading"><h2>Registros pendientes</h2><span>{pending.length}</span></div><div className="admin-items">{pending.map(item=><button key={item.id} type="button" className="admin-item" aria-current={selected?.id===item.id?'true':undefined} onClick={()=>{setSelectedId(item.id);setActionError('');setSuccess('')}}><span className="admin-item-photo">{item.photo?<RemoteImage src={fileSrc(item.photo,item.photo_url)} alt=""/>:<UserRound size={24}/>}</span><span className="admin-item-copy"><strong>{item.name}</strong><small>{item.trade} · {item.zone}</small></span><span className="status" data-status="Pendiente">Pendiente</span><ArrowRight size={17}/></button>)}</div></section>
      {selected&&<section className="admin-detail" aria-label={`Registro de ${selected.name}`}><div className="admin-person"><span className="admin-person-photo">{selected.photo?<RemoteImage src={fileSrc(selected.photo,selected.photo_url)} alt={`Foto de perfil de ${selected.name}`}/>:<UserRound size={32}/>}</span><div><span className="status" data-status="Pendiente">Pendiente</span><h2>{selected.name}</h2><p>{selected.trade} · {selected.zone}</p></div></div><dl className="admin-facts"><div><dt>Oficio</dt><dd>{selected.trade}</dd></div><div><dt>Zona declarada</dt><dd>{selected.zone}</dd></div><div><dt>Experiencia declarada</dt><dd>{selected.experience}</dd></div><div><dt>Descripción</dt><dd>{selected.description}</dd></div></dl><div className="admin-document"><h3>Documento de identificación</h3>{selected.document?<RemoteImage src={'/api/files/'+selected.document} alt={`Documento privado de ${selected.name} para revisión administrativa`}/>:<p>No se adjuntó un documento.</p>}<p><FileLock2 size={19}/> Documento privado. Solo la persona que lo adjuntó y Administración pueden consultarlo; no aparece en el perfil público.</p></div><div className="admin-actions"><button className="primary admin-approve" type="button" disabled={busy} onClick={()=>decide(true)}>{busy?'Guardando…':'Aprobar proveedor'} <ArrowRight size={18}/></button><button className="secondary" type="button" disabled={busy} onClick={()=>decide(false)}>Rechazar</button></div></section>}</div>:<div className="admin-empty"><ClipboardList size={38}/><h2>No hay registros pendientes</h2><p>En este momento no hay registros de proveedores por revisar.</p></div>}</>}
    {tab==='people'&&<PeopleDirectory people={people} applications={items} loading={loading} error={error} onApprove={onApprove} onReject={onReject} onSetActive={onSetActive} onReview={id=>{setSelectedId(id);setActionError('');setSuccess('');setTab('pending');window.scrollTo({top:0})}}/>}
  </div>
}

export function DemoJourney({onEnter}:{onEnter:(role:'cliente'|'proveedor'|'admin')=>Promise<void>}){
  const [busy,setBusy]=useState<string>('');
  const [error,setError]=useState('');
  async function enter(role:'cliente'|'proveedor'|'admin'){setBusy(role);setError('');try{await onEnter(role)}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo entrar en la demostración.')}finally{setBusy('')}}
  const roles=[{key:'cliente',name:'Cliente',icon:UserRound,image:designImages.home,description:'Publica una solicitud, revisa cotizaciones, confirma el trabajo y deja una reseña.',steps:['Publica tu solicitud','Acepta una cotización','Confirma y califica']},{key:'proveedor',name:'Proveedor',icon:Wrench,image:designImages.carpentry,description:'Envía tu registro como proveedor, cotiza oportunidades de tu oficio y registra el trabajo.',steps:['Envía tu registro','Envía una cotización','Sube Antes y Después']},{key:'admin',name:'Administración',icon:ShieldCheck,image:designImages.planning,description:'Revisa los datos y el documento privado de cada registro pendiente.',steps:['Revisa registros','Consulta el documento privado','Aprueba o rechaza']}] as const;
  return <div className="demo-journey"><section className="demo-hero"><div><p className="eyebrow">RECORRIDO DE DEMO</p><h1>Una necesidad.<br/><em>Tres perspectivas.</em></h1><p>Explora Trade desde cada rol con cuentas y archivos ficticios. Los datos se comparten entre quienes usan esta instancia de demostración.</p></div><figure><RemoteImage src={designImages.home} alt="Hogar, imagen ilustrativa"/><figcaption>Imagen ilustrativa</figcaption></figure></section><div className="demo-disclosure"><BriefcaseBusiness size={24}/><div><strong>POC · Datos de demostración</strong><p>Utiliza solo datos e imágenes ficticias. Esta instancia no procesa pagos ni certifica identidades.</p></div></div>{error&&<p className="error" role="alert">{error}</p>}
    <section className="demo-roles" aria-label="Entrar por rol">{roles.map(({key,name,icon:Icon,image,description,steps})=><article className="demo-role" key={key}><div className="demo-role-photo"><RemoteImage src={image} alt={`Imagen ilustrativa del recorrido de ${name.toLowerCase()}`}/><span>Imagen ilustrativa</span></div><div className="demo-role-body"><Icon size={23}/><h2>{name}</h2><p>{description}</p><ol>{steps.map(step=><li key={step}>{step}</li>)}</ol><button type="button" className="primary" disabled={!!busy} onClick={()=>enter(key)}>{busy===key?'Entrando…':`Entrar como ${name}`} <ArrowRight size={17}/></button></div></article>)}</section>
    <section className="demo-resources"><div><p className="eyebrow">ARCHIVOS DE EJEMPLO</p><h2>Recursos ficticios descargables</h2><p>Imágenes PNG de demostración para completar el recorrido. La identificación es una imagen ficticia, no un documento real.</p></div><div className="demo-assets">{assets.map(([file,label])=><a key={file} href={'/demo-assets/'+file} download={file}><span><RemoteImage src={'/demo-assets/'+file} alt=""/></span><strong>{label}</strong><small>PNG · Dato ficticio</small><Download size={20}/></a>)}</div></section><div className="demo-end"><House size={24}/><p>Empieza por Cliente y sigue las tres perspectivas para recorrer la POC.</p><button className="primary" type="button" disabled={!!busy} onClick={()=>enter('cliente')}>Comenzar recorrido <ArrowRight size={17}/></button></div>
  </div>
}

type Role='cliente'|'proveedor'|'admin';
type Row={id:string;name:string;email:string;role:Role;status?:string;trade?:string;zone?:string;requests:number;active:boolean;providerActive:boolean};
const roleLabel:Record<Role,string>={cliente:'Cliente',proveedor:'Proveedor',admin:'Administrador'};
type View=''|'cliente'|'pending'|'approved'|'rejected'|'admin'|'inactive';
// One dropdown replaces the separate role, status and account filters.
const views:{key:View;label:string;match:(row:Row)=>boolean}[]=[
  {key:'',label:'Todas las personas',match:()=>true},
  {key:'pending',label:'Proveedores pendientes',match:row=>row.status==='Pendiente'},
  {key:'approved',label:'Proveedores aprobados',match:row=>row.status==='Aprobada'},
  {key:'rejected',label:'Proveedores rechazados',match:row=>row.status==='Rechazada'},
  {key:'cliente',label:'Clientes',match:row=>row.role==='cliente'},
  {key:'admin',label:'Administradores',match:row=>row.role==='admin'},
  {key:'inactive',label:'Cuentas desactivadas',match:row=>!row.active||!row.providerActive},
];

// One searchable list of every account; provider rows add their registration data.
function PeopleDirectory({people,applications,loading,error,onApprove,onReject,onSetActive,onReview}:{people:Person[];applications:Application[];loading:boolean;error:string;onApprove:(id:string)=>Promise<void>;onReject:(id:string)=>Promise<void>;onSetActive:SetActive;onReview:(id:string)=>void}){
  const [view,setView]=useState<View>('');
  const [query,setQuery]=useState('');
  const [busyId,setBusyId]=useState('');
  const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
  const rows=useMemo<Row[]>(()=>{const byId=new Map(applications.map(a=>[a.id,a]));return people.map(person=>{const app=byId.get(person.id);const r:Role=person.role==='admin'?'admin':app?'proveedor':'cliente';return {id:person.id,name:person.name,email:person.email,role:r,status:app?.status,trade:app?.trade,zone:app?.zone,requests:person.requests,active:person.active!==false,providerActive:person.provider_active!==false}}).sort((a,b)=>Number(b.status==='Pendiente')-Number(a.status==='Pendiente')||a.name.localeCompare(b.name,'es'))},[people,applications]);
  const needle=query.trim().toLowerCase();
  const current=views.find(v=>v.key===view)!;
  const shown=rows.filter(row=>current.match(row)&&(!needle||[row.name,row.email,row.trade,row.zone].some(text=>text?.toLowerCase().includes(needle))));
  const filtered=!!(view||needle);
  const clear=()=>{setView('');setQuery('')};
  async function run(row:Row,question:string,action:()=>Promise<void>,done:string){
    if(!window.confirm(question))return;
    setBusyId(row.id);setMessage(null);
    try{await action();setMessage({ok:true,text:`${row.name}: ${done}`})}catch(cause){setMessage({ok:false,text:cause instanceof Error?cause.message:'No se pudo guardar el cambio.'})}finally{setBusyId('')}
  }
  const approve=(row:Row)=>run(row,`¿Aprobar a ${row.name} como proveedor de ${row.trade}?\n\nSu perfil aparecerá en el catálogo y podrá cotizar. Si aún no revisaste su identificación, usa «Ver registro».`,()=>onApprove(row.id),'registro aprobado. Ya aparece en el catálogo.');
  const reject=(row:Row)=>run(row,`¿Rechazar el registro de ${row.name}?\n\nNo aparecerá en el catálogo. Podrá enviar un registro nuevo.`,()=>onReject(row.id),'registro rechazado. Podrá enviar uno nuevo.');
  const toggle=(kind:'account'|'provider',row:Row,active:boolean)=>run(row,kind==='account'
      ?`¿${active?'Reactivar':'Desactivar'} la cuenta de ${row.name}?\n\n${active?'Podrá volver a iniciar sesión.':'No podrá iniciar sesión y se cerrarán sus sesiones abiertas.'}`
      :`¿${active?'Reactivar':'Desactivar'} el perfil de proveedor de ${row.name}?\n\n${active?'Volverá a aparecer en el catálogo y podrá cotizar.':'Dejará de aparecer en el catálogo y no podrá cotizar; podrá terminar los trabajos ya asignados.'}`,
    ()=>onSetActive(kind,row.id,active),`${kind==='account'?'cuenta':'perfil de proveedor'} ${active?'reactivado':'desactivado'}.`);
  if(loading)return <div className="admin-feedback" role="status">Cargando personas…</div>;
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar el directorio. {error}</div>;
  return <section className="people-directory" aria-label="Directorio de personas">
    <div className="people-filters">
      <label className="people-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Buscar por nombre, correo, oficio o zona" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre, correo, oficio o zona"/></label>
      <label>Mostrar<select value={view} onChange={event=>setView(event.target.value as View)}>{views.map(v=><option key={v.key} value={v.key}>{v.label} ({rows.filter(v.match).length})</option>)}</select></label>
    </div>
    {message&&<p className={message.ok?'notice':'error'} role={message.ok?'status':'alert'}>{message.ok&&<CheckCircle2 size={18}/>}{message.text}</p>}
    <div className="people-summary"><span role="status">Mostrando <strong>{shown.length}</strong> de {rows.length} personas</span>{filtered&&<button type="button" className="text-button" onClick={clear}><X size={15}/> Limpiar filtros</button>}</div>
    {shown.length?<div className="admin-table-wrap"><table className="admin-table people-table"><thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Oficio y zona</th><th scope="col">Estado</th><th scope="col">Solicitudes</th><th scope="col">Acciones</th></tr></thead><tbody>{shown.map(row=><tr key={row.id} className={row.status==='Pendiente'?'is-pending':undefined}>
      <td data-label="Persona"><span className="person-cell"><span className="person-initial" aria-hidden="true">{row.name.slice(0,1)}</span><span><strong>{row.name}</strong><small>{row.email}</small></span></span></td>
      <td data-label="Rol"><span className="role-badge" data-role={row.role}>{roleLabel[row.role]}</span>{!row.active&&<span className="status" data-status="Desactivada">Cuenta desactivada</span>}</td>
      <td data-label="Oficio y zona">{row.trade?<span className="trade-cell">{row.trade}<small>{row.zone}</small></span>:<span className="muted-dash">—</span>}</td>
      <td data-label="Estado">{row.status?<span className="status" data-status={row.status}>{row.status}</span>:<span className="muted-dash">—</span>}{row.status==='Aprobada'&&!row.providerActive&&<span className="status" data-status="Desactivada">Proveedor desactivado</span>}</td>
      <td data-label="Solicitudes">{row.requests}</td>
      <td data-label="Acciones">{busyId===row.id?<span className="muted-dash">Guardando…</span>:<span className="row-actions">
        {row.status==='Pendiente'&&<><button type="button" className="primary small-action" disabled={!!busyId} onClick={()=>approve(row)}>Aprobar</button><button type="button" className="secondary small-action" disabled={!!busyId} onClick={()=>reject(row)}>Rechazar</button><button type="button" className="text-button" onClick={()=>onReview(row.id)}>Ver registro</button></>}
        {row.status==='Aprobada'&&<button type="button" className="text-button" disabled={!!busyId} onClick={()=>toggle('provider',row,!row.providerActive)}>{row.providerActive?'Desactivar proveedor':'Reactivar proveedor'}</button>}
        {row.role!=='admin'&&<button type="button" className={row.active?'text-button danger':'text-button'} disabled={!!busyId} onClick={()=>toggle('account',row,!row.active)}>{row.active?'Desactivar cuenta':'Reactivar cuenta'}</button>}
        {row.role==='admin'&&<span className="muted-dash">—</span>}
      </span>}</td>
    </tr>)}</tbody></table></div>:<div className="admin-empty"><Search size={34}/><h2>Nadie coincide</h2><p>Prueba con otra opción en «Mostrar» o borra la búsqueda.</p><button type="button" className="secondary" onClick={clear}>Limpiar filtros</button></div>}
  </section>;
}
