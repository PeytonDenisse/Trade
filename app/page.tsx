'use client';
import {useEffect,useRef,useState} from 'react';
import {Menu,X,House,Search,ShieldCheck,ArrowUpRight,ArrowRight,Wrench,Check,LogOut,Briefcase,ClipboardList,Camera} from 'lucide-react';
import {trades} from '../lib/rules';
import {Hero,PopularTrades,ProfessionalCard,HowItWorks,GuidePage} from '../components/trade/marketing';
import {ProfilePage} from '../components/trade/profile';
import {AccessPage,CreateRequestPage,PublishedNotice} from '../components/trade/access-request';
import {MyRequests,RequestJourney} from '../components/trade/request-journey';
import {ProviderApplication,ProviderWorkspace} from '../components/trade/provider-workflow';
import {RemoteImage} from '../components/trade/remote-image';
async function api(path:string,data?:any){const r=await fetch('/api/'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo completar la operación.');return d}
function Upload({kind,request,onDone,label}:any){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <div className="upload-field"><label className="upload"><Camera size={20}/><span>{busy?'Subiendo…':label}</span><input aria-label={label} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e=>{
    const f=e.target.files?.[0];if(!f)return;setError('');
    if(!['image/png','image/jpeg','image/webp'].includes(f.type)){setError('Selecciona una imagen PNG, JPG o WebP.');e.target.value='';return}
    if(f.size===0||f.size>5*1024*1024){setError('La imagen debe contener datos y pesar como máximo 5 MB.');e.target.value='';return}
    setBusy(true);try{const d=new FormData();d.set('file',f);d.set('kind',kind);if(request)d.set('request',request);const r=await fetch('/api/upload',{method:'POST',body:d});const j:any=await r.json();if(!r.ok)throw new Error(j.error);await onDone(j.id)}catch(e:any){setError(e.message)}finally{setBusy(false);e.target.value=''}
  }}/></label>{error&&<p className="field-error" role="alert">{error}</p>}</div>
}
export default function Home(){
const [menuOpen,setMenuOpen]=useState(false);
const [justPublishedId,setJustPublishedId]=useState('');
const [openingId,setOpeningId]=useState('');
const [authDestination,setAuthDestination]=useState('explore');
const loadSequence=useRef(0);
const menuToggle=useRef<HTMLButtonElement>(null);
const navigation=useRef<HTMLElement>(null);
useEffect(()=>{
  if(!menuOpen)return;
  const firstLink=navigation.current?.querySelector('button');
  firstLink?.focus();
  const closeOnEscape=(event:KeyboardEvent)=>{
    if(event.key==='Escape'){
      setMenuOpen(false);
      menuToggle.current?.focus();
    }
  };
  window.addEventListener('keydown',closeOnEscape);
  return()=>window.removeEventListener('keydown',closeOnEscape);
},[menuOpen]);
function focusCatalog(){setProfile(null);setPage('explore');window.requestAnimationFrame(()=>{const catalog=window.document.getElementById('catalogo');catalog?.scrollIntoView({block:'start'});catalog?.focus({preventScroll:true})})}
function selectTrade(value:string){setFilter(value);go('explore');window.requestAnimationFrame(focusCatalog)}
const [user,setUser]=useState<any>(null),[application,setApplication]=useState<any>(null),[page,setPage]=useState('explore'),[providers,setProviders]=useState<any[]>([]),[filter,setFilter]=useState(''),[items,setItems]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[profile,setProfile]=useState<any>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[photo,setPhoto]=useState(''),[document,setDocument]=useState('');
async function me(){const d=await api('me');setUser(d.user);setApplication(d.application)}
async function load(){const sequence=++loadSequence.current;setLoading(true);setError('');try{if(page==='explore'){const result=await api('providers'+(filter?'?trade='+encodeURIComponent(filter):''));if(sequence===loadSequence.current)setProviders(result)}if(['mine','available','assigned'].includes(page)){const result=await api('requests?scope='+page);if(sequence===loadSequence.current)setItems(result)}if(page==='admin'){const result=await api('applications');if(sequence===loadSequence.current)setItems(result)}}catch(e:any){if(sequence===loadSequence.current)setError(e.message)}finally{if(sequence===loadSequence.current)setLoading(false)}}
useEffect(()=>{me().catch(e=>setError(e.message))},[]);useEffect(()=>{load()},[page,filter]);
function go(p:string){
  const wasMobileMenuOpen=menuOpen;
  loadSequence.current++;
  setMenuOpen(false);setPage(p);setSelected(null);setProfile(null);setJustPublishedId('');setError('');setNotice('');
  if(wasMobileMenuOpen)window.requestAnimationFrame(()=>window.document.getElementById('main-content')?.focus({preventScroll:true}));
}
async function act(fn:()=>Promise<any>){setError('');try{await fn()}catch(e:any){setError(e.message)}}
async function detail(id:string){setOpeningId(id);try{setSelected(await api('requests/'+id))}finally{setOpeningId('')}}
async function change(path:string,data:any){await api(path,data);await detail(selected.id);setNotice('Cambio guardado.');await load()}
const nav=[['explore','Explorar oficios',Search],['guide','Cómo funciona',ShieldCheck],['demo','Recorrido de demo',Briefcase],['mine','Mis solicitudes',ClipboardList],...(application?.status==='Aprobada'?[['available','Oportunidades',Briefcase],['assigned','Mis trabajos',Wrench]]:[]),...(user?.role==='admin'?[['admin','Revisar proveedores',ShieldCheck]]:[])] as any[];
return <div className="shell public-shell">
<a className="skip-link" href="#main-content">Ir al contenido</a>
<header className="site-header"><div className="site-header-inner">
  <a className="brand" href="/" aria-label="Trade inicio"><span className="brandmark"><House aria-hidden="true"/></span>Trade</a>
  <nav ref={navigation} id="site-navigation" aria-label="Navegación principal" className={menuOpen?'site-navigation is-open':'site-navigation'}>
    {nav.map(([key,label,Icon])=><button key={key} className={page===key?'active':''} aria-current={page===key?'page':undefined} onClick={()=>{if(!['explore','guide','demo'].includes(key)&&!user){setAuthDestination(key==='mine'?'mine':'explore');go('login')}else go(key)}}><Icon size={17}/>{label}</button>)}
    {user&&<button className="mobile-offer" onClick={()=>go('apply')}>Ofrecer mis servicios</button>}
  </nav>
  <div className="site-account">{user?<><span className="account-name"><span className="avatar">{user.name[0]}</span><b>{user.name}</b></span><button className="icon-button" aria-label="Cerrar sesión" onClick={()=>act(async()=>{await api('logout',{});setUser(null);setApplication(null);go('explore')})}><LogOut size={19}/></button></>:<button className="secondary" onClick={()=>{setAuthDestination('explore');go('login')}}>Iniciar sesión</button>}
    <button ref={menuToggle} className="menu-toggle icon-button" aria-label={menuOpen?'Cerrar menú':'Abrir menú'} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
  </div>
</div></header>
<div className="main"><main id="main-content" tabIndex={-1}>
<div className="site-context"><span>Servicios para tu hogar y negocio</span><span className="demo">POC · Datos de demostración</span>{user&&<button className="text-link" onClick={()=>go('apply')}>Ofrecer mis servicios <ArrowUpRight size={15}/></button>}</div>
{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status"><Check size={18}/>{notice}</div>}
{page==='explore'&&!profile&&<>
<Hero onExplore={focusCatalog}/>
<PopularTrades onSelect={selectTrade}/>
<section className="catalog professional-catalog" id="catalogo" tabIndex={-1}>
  <div className="section-head"><div><p className="eyebrow">PERSONAS QUE SABEN HACERLO</p><h2>{filter?'Resultados en '+filter:'Profesionales destacados'}</h2><p>Conoce su experiencia y solicita una cotización para tu proyecto.</p></div>
  <label className="catalog-filter">Oficio<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos los oficios</option>{trades.map(t=><option key={t}>{t}</option>)}</select></label></div>
  <div className="catalog-meta"><span>{providers.length} {providers.length===1?'perfil aprobado':'perfiles aprobados'}</span><span>Los perfiles de demostración y las imágenes ilustrativas están identificados.</span></div>
  {loading?<p role="status">Buscando profesionales…</p>:providers.length?<div className={filter?'professional-grid is-filtered':'professional-grid'}>{providers.map(p=><ProfessionalCard key={p.id} provider={p} onOpen={()=>act(async()=>{setProfile(await api('providers/'+p.id));window.scrollTo({top:0})})}/>)}</div>:<div className="empty"><Wrench size={36}/><h3>No hay profesionales de este oficio</h3><p>Explora otros oficios o vuelve más tarde.</p><button className="secondary" onClick={()=>setFilter('')}>Ver todos los oficios <ArrowRight size={16}/></button></div>}
</section>
<HowItWorks onExplore={focusCatalog}/>
</>}
{profile&&<ProfilePage provider={profile} onBack={()=>{setProfile(null);window.requestAnimationFrame(focusCatalog)}} onRequest={()=>{if(user)go('create');else{setAuthDestination('create');go('login')}}}/>}
{['login','register'].includes(page)&&<AccessPage onExplore={focusCatalog} onSubmit={async(mode,values)=>{await api(mode,values);await me();go(authDestination);setAuthDestination('explore')}}/>}
{page==='apply'&&<ProviderApplication authenticated={!!user} application={application} photoId={photo} documentId={document}
  photoUpload={<Upload kind="photo" label={photo?'Cambiar foto de perfil':'Subir foto de perfil'} onDone={setPhoto}/>}
  documentUpload={<Upload kind="document" label={document?'Cambiar documento':'Subir documento de identificación'} onDone={setDocument}/>}
  onLogin={()=>{setAuthDestination('apply');go('login')}}
  onOpportunities={()=>go('available')}
  onSubmit={async values=>{await api('apply',{...values,photo,document});await me();setNotice('Tu solicitud quedó Pendiente de revisión.')}}
/>}
{page==='create'&&<CreateRequestPage onSubmit={async(values)=>{const r=await api('requests',values);go('mine');setJustPublishedId(r.id);await detail(r.id)}}/>}
{page==='mine'&&!selected&&<MyRequests items={items} loading={loading} error={error} openingId={openingId} onOpen={id=>act(async()=>{await detail(id);window.scrollTo({top:0})})} onCreate={()=>go('create')}/>}
{['available','assigned'].includes(page)&&<ProviderWorkspace mode={page as 'available'|'assigned'} trade={application?.trade||''} items={items} selected={selected} loading={loading} error={error} openingId={openingId}
  onOpen={id=>act(async()=>{await detail(id);window.requestAnimationFrame(()=>window.document.getElementById('provider-detail')?.scrollIntoView({block:'start'}))})}
  onBack={()=>setSelected(null)}
  onQuote={(price,description)=>change('quote',{request:selected.id,price,description})}
  onFinish={()=>change('finish',{request:selected.id})}
  renderUpload={kind=><Upload kind={kind} request={selected?.id} label={kind==='before'?'Subir foto · Antes':'Subir foto · Después'} onDone={async()=>{await detail(selected.id);setNotice('Fotografía del trabajo añadida.')}}/>}
/>}
{selected&&selected.owner===user?.id&&<RequestJourney key={selected.id} request={selected}
  onBack={()=>{setSelected(null);setJustPublishedId('');window.scrollTo({top:0})}}
  onList={()=>{setSelected(null);setJustPublishedId('');window.scrollTo({top:0})}}
  justPublished={selected.id===justPublishedId?<PublishedNotice onViewList={()=>{setSelected(null);setJustPublishedId('')}} hasPhoto={selected.files.some((file:any)=>file.kind==='problem')}>
    {selected.status==='Activa'&&<Upload kind="problem" request={selected.id} label="Añadir foto del problema (opcional)" onDone={async()=>{await detail(selected.id);setNotice('Foto del problema añadida.')}}/>}
    <small>PNG, JPG o WebP · Máximo 5 MB.</small>
  </PublishedNotice>:undefined}
  onUpload={selected.id!==justPublishedId&&selected.status==='Activa'?<Upload kind="problem" request={selected.id} label="Adjuntar foto del problema" onDone={async()=>{await detail(selected.id);setNotice('Foto del problema añadida.')}}/>:undefined}
  onAccept={id=>change('accept',{id})}
  onConfirm={()=>change('confirm',{request:selected.id})}
  onStars={async stars=>{await api('review',{request:selected.id,stars});await detail(selected.id)}}
  onComment={async comment=>{await api('review',{request:selected.id,comment});await detail(selected.id)}}
/>}
{page==='admin'&&<><p className="eyebrow">ADMINISTRACIÓN</p><h1>Revisión de proveedores.</h1><p className="muted">La aprobación habilita el perfil en Trade. En esta POC se utilizan identidades ficticias.</p>{!items.length&&<p className="empty">No hay solicitudes de proveedores.</p>}{items.map(p=><article className="panel" key={p.id}><div className="section-head"><h2>{p.name}</h2><span className="status" data-status={p.status}>{p.status}</span></div><p>{p.trade} · {p.zone}</p><p>{p.experience}</p><p>{p.description}</p><div className="comparison"><figure><RemoteImage src={'/api/files/'+p.photo} alt="Fotografía de perfil"/><figcaption>Perfil</figcaption></figure><figure><RemoteImage src={'/api/files/'+p.document} alt="Documento de identificación para revisión"/><figcaption>Documento privado</figcaption></figure></div>{p.status==='Pendiente'&&<button className="primary" onClick={()=>act(async()=>{await api('approve',{id:p.id});await load();setNotice('Proveedor aprobado. Su perfil ya es visible.')})}>Aprobar proveedor <ShieldCheck size={18}/></button>}</article>)}</>}
{page==='demo'&&<section className="panel form-panel"><p className="eyebrow">DEMOSTRACIÓN ACADÉMICA</p><h1>Una necesidad. Tres perspectivas.</h1><p>Prueba el recorrido con cuentas ficticias. Elige cliente, proveedor o administración para entrar directamente. Los datos de demo se comparten entre colaboradores.</p><div className="guide-step"><b>01</b><div><h3>Cliente</h3><p>Publica una solicitud de plomería, acepta una cotización y confirma el resultado.</p></div><button className="secondary" onClick={()=>act(async()=>{await api('demo',{role:'cliente'});await me();go('mine')})}>Entrar</button></div><div className="guide-step"><b>02</b><div><h3>Proveedor</h3><p>Solicita autorización con imágenes ficticias. Después cotiza y registra las evidencias.</p></div><button className="secondary" onClick={()=>act(async()=>{await api('demo',{role:'proveedor'});await me();go('apply')})}>Entrar</button></div><div className="guide-step"><b>03</b><div><h3>Administración</h3><p>Revisa la solicitud del proveedor y aprueba su perfil.</p></div><button className="secondary" onClick={()=>act(async()=>{await api('demo',{role:'admin'});await me();go('admin')})}>Entrar</button></div><p className="muted">Para probar el registro y acceso con contraseña, cierra sesión y crea una cuenta nueva. Los datos guardados permanecen al cambiar de rol.</p><p><a href="/demo-assets/perfil.png" download>Imagen ficticia de perfil</a> · <a href="/demo-assets/identificacion.png" download>Identificación ficticia</a> · <a href="/demo-assets/antes.png" download>Antes</a> · <a href="/demo-assets/despues.png" download>Después</a></p></section>}
{page==='guide'&&<GuidePage onExplore={()=>{go('explore');window.requestAnimationFrame(focusCatalog)}}/>}
</main><footer className="site-footer">
  <div><a className="brand" href="/"><span className="brandmark"><House aria-hidden="true"/></span>Trade</a><p>Hogares más nuestros,<br/>un oficio a la vez.</p><small>Demostración académica · Sin pagos reales</small></div>
  <div><h3>Explorar</h3>{['Plomería','Electricidad','Carpintería'].map(t=><button key={t} onClick={()=>selectTrade(t)}>{t}</button>)}<button onClick={()=>selectTrade('')}>Todos los oficios</button></div>
  <div><h3>Tu proyecto</h3><button onClick={()=>{go('guide');window.scrollTo({top:0})}}>Cómo funciona</button><button onClick={()=>{go(user?'mine':'login');window.scrollTo({top:0})}}>Mis solicitudes</button><button onClick={()=>{go(user?'apply':'register');window.scrollTo({top:0})}}>Ofrecer mis servicios</button></div>
  <div className="footer-bottom"><span>© {new Date().getFullYear()} Trade · Proyecto académico</span><span>Fotografías ilustrativas generadas para Trade</span></div>
</footer></div></div>
}
