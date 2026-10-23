'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,CheckCircle2,ClipboardList,Download,FileLock2,House,Search,ShieldCheck,UserRound,Wrench,X} from 'lucide-react';
import {RemoteImage} from './remote-image';
import {designImages,fileSrc} from '../../lib/design-images';
import {trades} from '../../lib/rules';

type Person={id:string;name:string;email:string;role:string;requests:number;provider_status?:string};
type Application={id:string;name:string;trade:string;zone:string;experience:string;description:string;photo?:string;photo_url?:string;document?:string;status:string};
const assets=[['perfil.png','Foto de perfil'],['identificacion.png','Identificación ficticia'],['antes.png','Antes'],['despues.png','Después']] as const;

export function AdminReview({items,people,presentationOnly,loading,error,onApprove,onReject}:{items:Application[];people:Person[];presentationOnly:boolean;loading:boolean;error:string;onApprove:(id:string)=>Promise<void>;onReject:(id:string)=>Promise<void>}){
  const [tab,setTab]=useState<'pending'|'people'>('pending');
  // The presentation admin only reviews Luis, so class demos stay predictable; the other tabs show everyone.
  const allPending=items.filter(item=>item.status==='Pendiente');
  const pending=presentationOnly?allPending.filter(item=>item.id==='presentation-provider-login'):allPending;
  const canReview=(id:string)=>!presentationOnly||id==='presentation-provider-login';
  const [selectedId,setSelectedId]=useState('');
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState('');
  const [success,setSuccess]=useState('');
  const selected=pending.find(item=>item.id===selectedId)||pending[0];
  async function decide(approve:boolean){if(!selected)return;setBusy(true);setActionError('');setSuccess('');try{await (approve?onApprove:onReject)(selected.id);setSuccess(approve?`${selected.name}: registro aprobado. Su perfil ya puede mostrarse en Trade.`:`${selected.name}: registro rechazado. Podrá enviar uno nuevo.`)}catch(cause){setActionError(cause instanceof Error?cause.message:'No se pudo guardar la decisión.')}finally{setBusy(false)}}
  return <div className="admin-review"><div className="admin-heading"><p className="eyebrow">ADMINISTRACIÓN · POC</p><h1>Revisar proveedores</h1><p>Revisa los registros pendientes y consulta todos los proveedores y clientes de Trade.</p></div>
    <div className="admin-tabs" role="tablist" aria-label="Vistas de administración">{([['pending','Por revisar',pending.length],['people','Personas',people.length]] as const).map(([key,label,count])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label} <span>{loading?'…':count}</span></button>)}</div>
    {success&&<p className="notice" role="status"><CheckCircle2 size={19}/>{success}</p>}{actionError&&<p className="error" role="alert">{actionError}</p>}
    {tab==='pending'&&presentationOnly&&allPending.length>pending.length&&<p className="muted">Como cuenta de presentación solo revisas el registro de Luis. Hay {allPending.length-pending.length} registros pendientes más de otras personas; puedes verlos en Personas.</p>}
    {tab==='pending'&&<>{loading?<div className="admin-feedback" role="status">Cargando registros pendientes…</div>:error?<div className="admin-feedback error" role="alert">No se pudieron cargar los registros. {error}</div>:pending.length?<div className="admin-grid"><section className="admin-list"><div className="admin-list-heading"><h2>Registros pendientes</h2><span>{pending.length}</span></div><div className="admin-items">{pending.map(item=><button key={item.id} type="button" className="admin-item" aria-current={selected?.id===item.id?'true':undefined} onClick={()=>{setSelectedId(item.id);setActionError('');setSuccess('')}}><span className="admin-item-photo">{item.photo?<RemoteImage src={fileSrc(item.photo,item.photo_url)} alt=""/>:<UserRound size={24}/>}</span><span className="admin-item-copy"><strong>{item.name}</strong><small>{item.trade} · {item.zone}</small></span><span className="status" data-status="Pendiente">Pendiente</span><ArrowRight size={17}/></button>)}</div></section>
      {selected&&<section className="admin-detail" aria-label={`Registro de ${selected.name}`}><div className="admin-person"><span className="admin-person-photo">{selected.photo?<RemoteImage src={fileSrc(selected.photo,selected.photo_url)} alt={`Foto de perfil de ${selected.name}`}/>:<UserRound size={32}/>}</span><div><span className="status" data-status="Pendiente">Pendiente</span><h2>{selected.name}</h2><p>{selected.trade} · {selected.zone}</p></div></div><dl className="admin-facts"><div><dt>Oficio</dt><dd>{selected.trade}</dd></div><div><dt>Zona declarada</dt><dd>{selected.zone}</dd></div><div><dt>Experiencia declarada</dt><dd>{selected.experience}</dd></div><div><dt>Descripción</dt><dd>{selected.description}</dd></div></dl><div className="admin-document"><h3>Documento de identificación</h3>{selected.document?<RemoteImage src={'/api/files/'+selected.document} alt={`Documento privado de ${selected.name} para revisión administrativa`}/>:<p>No se adjuntó un documento.</p>}<p><FileLock2 size={19}/> Documento privado. Solo la persona que lo adjuntó y Administración pueden consultarlo; no aparece en el perfil público.</p></div><div className="admin-actions"><button className="primary admin-approve" type="button" disabled={busy} onClick={()=>decide(true)}>{busy?'Guardando…':'Aprobar proveedor'} <ArrowRight size={18}/></button><button className="secondary" type="button" disabled={busy} onClick={()=>decide(false)}>Rechazar</button></div></section>}</div>:<div className="admin-empty"><ClipboardList size={38}/><h2>No hay registros pendientes</h2><p>En este momento no hay registros de proveedores por revisar.</p></div>}</>}
    {tab==='people'&&<PeopleDirectory people={people} applications={items} loading={loading} error={error} canReview={canReview} onReview={id=>{setSelectedId(id);setActionError('');setSuccess('');setTab('pending');window.scrollTo({top:0})}}/>}
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
type Row={id:string;name:string;email:string;role:Role;status?:string;trade?:string;zone?:string;requests:number};
const roleLabel:Record<Role,string>={cliente:'Cliente',proveedor:'Proveedor',admin:'Administrador'};
const statuses=['Pendiente','Aprobada','Rechazada'] as const;

// One searchable list of every account; provider rows add their registration data.
function PeopleDirectory({people,applications,loading,error,canReview,onReview}:{people:Person[];applications:Application[];loading:boolean;error:string;canReview:(id:string)=>boolean;onReview:(id:string)=>void}){
  const [role,setRole]=useState<''|Role>('');
  const [status,setStatus]=useState('');
  const [trade,setTrade]=useState('');
  const [query,setQuery]=useState('');
  const rows=useMemo<Row[]>(()=>{const byId=new Map(applications.map(a=>[a.id,a]));return people.map(person=>{const app=byId.get(person.id);const r:Role=person.role==='admin'?'admin':app?'proveedor':'cliente';return {id:person.id,name:person.name,email:person.email,role:r,status:app?.status,trade:app?.trade,zone:app?.zone,requests:person.requests}}).sort((a,b)=>Number(b.status==='Pendiente')-Number(a.status==='Pendiente')||a.name.localeCompare(b.name,'es'))},[people,applications]);
  // Status and trade only describe providers, so choosing either narrows the list to providers.
  const providerOnly=!!status||!!trade;
  const needle=query.trim().toLowerCase();
  const shown=rows.filter(row=>(!role||row.role===role)&&(!providerOnly||row.role==='proveedor')&&(!status||row.status===status)&&(!trade||row.trade===trade)&&(!needle||row.name.toLowerCase().includes(needle)||row.email.toLowerCase().includes(needle)));
  const filtered=!!(role||status||trade||needle);
  const clear=()=>{setRole('');setStatus('');setTrade('');setQuery('')};
  const count=(r?:Role,s?:string)=>rows.filter(row=>(!r||row.role===r)&&(!s||row.status===s)).length;
  const chips:[string,number,()=>void,boolean][]=[
    ['Todas',rows.length,clear,!filtered],
    ['Clientes',count('cliente'),()=>{clear();setRole('cliente')},role==='cliente'&&!needle],
    ['Proveedores',count('proveedor'),()=>{clear();setRole('proveedor')},role==='proveedor'&&!status&&!trade&&!needle],
    ['Pendientes',count('proveedor','Pendiente'),()=>{clear();setRole('proveedor');setStatus('Pendiente')},status==='Pendiente'&&!trade&&!needle],
    ['Administradores',count('admin'),()=>{clear();setRole('admin')},role==='admin'&&!needle],
  ];
  const lockProviderFilters=!!role&&role!=='proveedor';
  if(loading)return <div className="admin-feedback" role="status">Cargando personas…</div>;
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar el directorio. {error}</div>;
  return <section className="people-directory" aria-label="Directorio de personas">
    <div className="people-chips" aria-label="Filtros rápidos">{chips.map(([label,n,apply,active])=><button key={label} type="button" className={active?'active':''} aria-pressed={active} onClick={apply}>{label} <span>{n}</span></button>)}</div>
    <div className="people-filters">
      <label className="people-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Buscar por nombre o correo" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre o correo"/></label>
      <label>Rol<select value={role} onChange={event=>{const value=event.target.value as ''|Role;setRole(value);if(value&&value!=='proveedor'){setStatus('');setTrade('')}}}><option value="">Todos</option><option value="cliente">Clientes</option><option value="proveedor">Proveedores</option><option value="admin">Administradores</option></select></label>
      <label title={lockProviderFilters?'Solo aplica a proveedores':undefined}>Estado<select value={status} disabled={lockProviderFilters} onChange={event=>setStatus(event.target.value)}><option value="">Todos</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <label title={lockProviderFilters?'Solo aplica a proveedores':undefined}>Oficio<select value={trade} disabled={lockProviderFilters} onChange={event=>setTrade(event.target.value)}><option value="">Todos</option>{trades.map(t=><option key={t}>{t}</option>)}</select></label>
    </div>
    <div className="people-summary"><span role="status">Mostrando <strong>{shown.length}</strong> de {rows.length} personas{providerOnly&&!role?' · solo proveedores':''}</span>{filtered&&<button type="button" className="text-button" onClick={clear}><X size={15}/> Limpiar filtros</button>}</div>
    {shown.length?<div className="admin-table-wrap"><table className="admin-table people-table"><thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Oficio y zona</th><th scope="col">Estado</th><th scope="col">Solicitudes</th><th scope="col"><span className="visually-hidden">Acción</span></th></tr></thead><tbody>{shown.map(row=><tr key={row.id}>
      <td data-label="Persona"><span className="person-cell"><span className="person-initial" aria-hidden="true">{row.name.slice(0,1)}</span><span><strong>{row.name}</strong><small>{row.email}</small></span></span></td>
      <td data-label="Rol"><span className="role-badge" data-role={row.role}>{roleLabel[row.role]}</span></td>
      <td data-label="Oficio y zona">{row.trade?<span className="trade-cell">{row.trade}<small>{row.zone}</small></span>:<span className="muted-dash">—</span>}</td>
      <td data-label="Estado">{row.status?<span className="status" data-status={row.status}>{row.status}</span>:<span className="muted-dash">—</span>}</td>
      <td data-label="Solicitudes">{row.requests}</td>
      <td data-label="Acción">{row.status==='Pendiente'&&canReview(row.id)?<button type="button" className="secondary small-action" onClick={()=>onReview(row.id)}>Revisar <ArrowRight size={15}/></button>:row.status==='Pendiente'?<small className="muted-dash">Lo revisa un administrador regular</small>:null}</td>
    </tr>)}</tbody></table></div>:<div className="admin-empty"><Search size={34}/><h2>Nadie coincide con estos filtros</h2><p>Prueba con otro rol, estado u oficio, o borra la búsqueda.</p><button type="button" className="secondary" onClick={clear}>Limpiar filtros</button></div>}
  </section>;
}
