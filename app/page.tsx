'use client';
import {useEffect,useRef,useState} from 'react';
import {Menu,X,House,Search,ShieldCheck,ArrowUpRight,ArrowRight,Plus,Wrench,UserRound,Briefcase,ClipboardList,Camera,ChevronLeft} from 'lucide-react';
import {trades,isActive,tradesOf} from '../lib/rules';
import {Hero,PopularTrades,ProfessionalCard,HowItWorks,GuidePage} from '../components/trade/marketing';
import {ProfilePage} from '../components/trade/profile';
import {AccessPage,CreateRequestPage,PublishedNotice} from '../components/trade/access-request';
import {RemoteImage} from '../components/trade/remote-image';


import {ProviderApplication,ProviderWorkspace} from '../components/trade/provider-workflow';
import {MyRequests,RequestJourney} from '../components/trade/request-journey';
import {AdminPortal} from '../components/admin/admin-portal';
import {pathFor,parsePath} from '../lib/routes';
import {FeedbackProvider,useToast} from '../components/feedback/feedback-provider';
import {AccountMenu} from '../components/account/account-menu';
import {AccountPage} from '../components/account/account-page';
import {ForgotPage,ResetPage} from '../components/account/password-recovery';

const money=(n:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
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
export default function Page(){return <FeedbackProvider><Home/></FeedbackProvider>}
function Home(){
const toast=useToast();
const [menuOpen,setMenuOpen]=useState(false);
const [justPublishedId,setJustPublishedId]=useState('');
const [openingId,setOpeningId]=useState('');
// Where to go after login/registration; empty means the role start page (Mi inicio).
const [authDestination,setAuthDestination]=useState('');
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
const [user,setUser]=useState<any>(null),[application,setApplication]=useState<any>(null),[page,setPage]=useState('explore'),[providers,setProviders]=useState<any[]>([]),[filter,setFilter]=useState(''),[items,setItems]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[profile,setProfile]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[photo,setPhoto]=useState(''),[document,setDocument]=useState('');
const [requestTrade,setRequestTrade]=useState('');
const [catalogQuery,setCatalogQuery]=useState('');
// Provider the client is asking directly from their profile; null means open to all.
const [requestTarget,setRequestTarget]=useState<{id:string;name:string;trades:string[]}|null>(null);
// Admin section (/admin/:tab) and the person page open in it (/admin/personas/:id).
const [adminTab,setAdminTab]=useState('tablero'),[personId,setPersonId]=useState('');
const [resetToken,setResetToken]=useState('');
async function me(){const d=await api('me');setUser(d.user);setApplication(d.application);return d}
// The provider's own trade can't be requested; an empty trade means the client chooses.
function startRequest(trade='',target:{id:string;name:string;trades:string[]}|null=null){setRequestTrade(trade);setRequestTarget(target);if(user)go('create');else{setAuthDestination('create');go('login')}}
const ownTrades=application&&application.status!=='Rechazada'?tradesOf(application):[];
// Mi inicio is each role's working page, not a separate page of shortcuts.
function homeFor(u:any,app:any){if(!u)return 'explore';if(u.role==='admin')return 'admin';if(app?.status==='Aprobada'&&app.active!==false)return 'available';if(app)return 'apply';return 'mine'}
const view=page==='home'?homeFor(user,application):page;
// Client-side search over the loaded catalog: name or zone.
const catalogNeedle=catalogQuery.trim().toLowerCase();
const shownProviders=catalogNeedle?providers.filter(p=>[p.name,p.zone].some((v:any)=>String(v||'').toLowerCase().includes(catalogNeedle))):providers;
async function load(){const sequence=++loadSequence.current;setLoading(true);setError('');try{if(view==='explore'){const result=await api('providers'+(filter?'?trade='+encodeURIComponent(filter):''));if(sequence===loadSequence.current)setProviders(result)}if(['mine','available','assigned'].includes(view)){const result=await api('requests?scope='+view);if(sequence===loadSequence.current)setItems(view==='available'&&user?.id==='presentation-provider-login'?result.filter((r:any)=>r.owner==='presentation-client-login'):result)}}catch(e:any){if(sequence===loadSequence.current)setError(e.message)}finally{if(sequence===loadSequence.current)setLoading(false)}}
useEffect(()=>{load()},[view,filter]);
// Pages that need a session; visitors who open them by link are sent to log in first.
const privatePages=['home','mine','create','apply','available','assigned','account','saved','admin'];
// True while the address is being turned into screen state, so that state is not pushed back.
const applyingUrl=useRef(true);
async function openPath(pathname:string,u:any,app:any){
  applyingUrl.current=true;
  try{
    const r=parsePath(pathname,trades);
    const target=r.page==='admin'?'home':r.page;
    if(u&&pathname==='/'){go('home',u,app);return}
    if(!u&&privatePages.includes(r.page)){setAuthDestination(target);go('login',u,app);return}
    go(target,u,app);
    if(r.trade)setFilter(r.trade);
    if(r.token)setResetToken(r.token);
    if(r.page==='admin'){setAdminTab(r.adminTab||'tablero');setPersonId(r.personId||'')}
    if(r.providerId)setProfile(await api('providers/'+r.providerId));
    if(r.requestId)await detail(r.requestId);
  }catch(e:any){setError(e.message)}
  finally{window.requestAnimationFrame(()=>{applyingUrl.current=false})}
}
useEffect(()=>{me().then(d=>openPath(window.location.pathname,d.user,d.application)).catch(e=>{setError(e.message);applyingUrl.current=false})},[]);
useEffect(()=>{const onPop=()=>openPath(window.location.pathname,user,application);window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[user,application]);
function go(p:string,u:any=user,app:any=application){
  // Signed-in people reach their working page as Mi inicio; visitors have no Mi inicio.
  if(u&&(p==='admin'||p===homeFor(u,app)))p='home';
  const wasMobileMenuOpen=menuOpen;
  // Staying on the same page starts no new load, so the current one must be allowed to finish.
  if(p!==page)loadSequence.current++;
  setMenuOpen(false);setPage(p);setSelected(null);setProfile(null);setJustPublishedId('');setError('');setPersonId('');if(p==='home')setAdminTab('tablero');
  if(wasMobileMenuOpen)window.requestAnimationFrame(()=>window.document.getElementById('main-content')?.focus({preventScroll:true}));
}
function signedOut(){setUser(null);setApplication(null);go('explore',null,null)}
async function act(fn:()=>Promise<any>){setError('');try{await fn()}catch(e:any){setError(e.message)}}
async function detail(id:string){setSelected(await api('requests/'+id))}
async function change(path:string,data:any){await api(path,data);await detail(selected.id);await load();toast(({quote:'Cotización enviada. El cliente debe abrir su solicitud y aceptar la propuesta.',accept:'Propuesta aceptada. El proveedor ya puede ver este servicio en Mis trabajos.',finish:'Trabajo terminado. Falta que el cliente revise las evidencias y confirme.',confirm:'Servicio completado. Ahora puedes guardar tu calificación y comentario.',review:'Evaluación guardada en el perfil del proveedor.'} as Record<string,string>)[path]||'Cambio guardado.')}

const role=user?.role==='admin'?'admin':user?.role==='proveedor'||application?'proveedor':'cliente';
const nav=[...(user?[['home','Mi inicio',House]]:[]),...(user?.role==='admin'?[]:[['explore','Explorar oficios',Search],['guide','Cómo funciona',ShieldCheck]]),...(user?.role==='admin'||homeFor(user,application)==='mine'?[]:[['mine','Mis solicitudes',ClipboardList]]),...(application?.status==='Aprobada'?[['group','Como proveedor'],...(isActive(application)&&homeFor(user,application)!=='available'?[['available','Oportunidades',Briefcase]]:[]),['assigned','Mis trabajos',Wrench]]:[])] as any[];
// Browser address for the current screen (design PDF 10.1); Back and shared links use it.
const path=pathFor({page:page==='home'&&user?.role==='admin'?'admin':page==='home'?(selected?view:'home'):page,trade:page==='explore'?filter:undefined,providerId:profile?.id,requestId:selected?.id,token:resetToken,adminTab,personId});
useEffect(()=>{if(!applyingUrl.current&&window.location.pathname!==path)window.history.pushState(null,'',path)},[path]);
// "Offer my services" only makes sense for clients who have not registered as providers yet.
const providerLink=!user?{label:'Ofrecer mis servicios',page:'register'}:user.role==='admin'||application?.status==='Aprobada'?null:application?.status==='Pendiente'?{label:'Ver mi registro de proveedor',page:'apply'}:{label:'Ofrecer mis servicios',page:'apply'};
return <div className="shell public-shell">
<a className="skip-link" href="#main-content">Ir al contenido</a>
<header className="site-header"><div className="site-header-inner">
  <a className="brand" href="/" aria-label="Trade inicio"><span className="brandmark"><House aria-hidden="true"/></span>Trade</a>
  <nav ref={navigation} id="site-navigation" aria-label="Navegación principal" className={menuOpen?'site-navigation is-open':'site-navigation'}>
    {nav.map(([key,label,Icon])=>key==='group'?<span key={label} className="nav-group-label">{label}</span>:<button key={key} className={page===key?'active':''} aria-current={page===key?'page':undefined} onClick={()=>{if(!['explore','guide','demo'].includes(key)&&!user){setAuthDestination('');go('login')}else go(key)}}><Icon size={17}/>{label}</button>)}
    {providerLink&&<button className="mobile-offer" onClick={()=>go(providerLink.page)}>{providerLink.label}</button>}
  </nav>
  <div className="site-account">{user?<AccountMenu user={user} role={role} onAccount={()=>go('account')} onProfile={application?.status==='Aprobada'?()=>act(async()=>{go('explore');setProfile(await api('providers/'+user.id));window.scrollTo({top:0})}):undefined} onLogout={()=>act(async()=>{await api('logout',{});signedOut()})}/>:<button className="secondary" onClick={()=>{setAuthDestination('');go('login')}}>Iniciar sesión</button>}
    <button ref={menuToggle} className="menu-toggle icon-button" aria-label={menuOpen?'Cerrar menú':'Abrir menú'} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
  </div>
</div></header>
<div className="main"><main id="main-content" tabIndex={-1}>
<div className="site-context"><span>Servicios para tu hogar y negocio</span><span className="demo">POC · Datos de demostración</span>{user&&<span className="demo-actor">Espacio de {role==='admin'?'administrador':role}</span>}{user&&providerLink&&<button className="text-link" onClick={()=>go(providerLink.page)}>{providerLink.label} <ArrowUpRight size={15}/></button>}</div>
{error&&<div className="error" role="alert">{error}</div>}


{page==='explore'&&!profile&&<>
<Hero onExplore={focusCatalog}/>
<PopularTrades onSelect={selectTrade}/>
<section className="catalog professional-catalog" id="catalogo" tabIndex={-1}>
  <div className="section-head"><div><p className="eyebrow">PERSONAS QUE SABEN HACERLO</p><h2>{filter?'Resultados en '+filter:'Profesionales destacados'}</h2><p>Conoce su experiencia y solicita una cotización para tu proyecto.</p></div>
  <div className="catalog-controls"><label className="catalog-filter catalog-search">Buscar<input type="search" value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)} placeholder="Nombre o zona"/></label><label className="catalog-filter">Oficio<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos los oficios</option>{trades.map(t=><option key={t}>{t}</option>)}</select></label></div></div>
  <div className="catalog-meta"><span>{shownProviders.length} {shownProviders.length===1?'perfil aprobado':'perfiles aprobados'}{catalogQuery.trim()?` para «${catalogQuery.trim()}»`:''}</span><span>Los perfiles de demostración y las imágenes ilustrativas están identificados.</span></div>
  {loading?<p role="status">Buscando profesionales…</p>:shownProviders.length?<div className={filter||catalogQuery?'professional-grid is-filtered':'professional-grid'}>{shownProviders.map(p=><ProfessionalCard key={p.id} provider={p} onOpen={()=>act(async()=>{setProfile(await api('providers/'+p.id));window.scrollTo({top:0})})}/>)}</div>:<div className="empty"><Wrench size={36}/><h3>{catalogQuery.trim()?'Nadie coincide con tu búsqueda':'No hay profesionales de este oficio'}</h3><p>{catalogQuery.trim()?'Prueba con otro nombre o zona.':'Explora otros oficios o vuelve más tarde.'}</p><button className="secondary" onClick={()=>{setFilter('');setCatalogQuery('')}}>Ver todos los profesionales <ArrowRight size={16}/></button></div>}
</section>
<HowItWorks onExplore={focusCatalog} onGuide={()=>{go('guide');window.scrollTo({top:0})}}/>
</>}
{profile&&<ProfilePage provider={profile} isOwn={profile.id===user?.id} isAdmin={user?.role==='admin'} ownTrades={ownTrades} onBack={()=>{setProfile(null);window.requestAnimationFrame(focusCatalog)}} onRequest={()=>startRequest(tradesOf(profile).find(t=>!ownTrades.includes(t))||'',{id:profile.id,name:profile.name,trades:tradesOf(profile)})}/>}
{['login','register'].includes(page)&&<AccessPage onExplore={focusCatalog} onForgot={()=>go('forgot')} onSubmit={async(mode,values)=>{await api(mode,values);await me();go(authDestination||'home');setAuthDestination('');window.scrollTo({top:0})}}/>}
{view==='apply'&&<ProviderApplication authenticated={!!user} application={application} photoId={photo} documentId={document}
  photoUpload={<Upload kind="photo" label={photo?'Cambiar foto de perfil':'Subir foto de perfil'} onDone={setPhoto}/>}
  documentUpload={<Upload kind="document" label={document?'Cambiar documento':'Subir documento de identificación'} onDone={setDocument}/>}
  onLogin={()=>{setAuthDestination('apply');go('login')}}
  onOpportunities={()=>go('available')}
  onSubmit={async values=>{await api('apply',{...values,photo,document});await me();toast('Tu registro como proveedor quedó pendiente de revisión.')}}
/>}
{page==='create'&&<CreateRequestPage key={requestTrade+(requestTarget?.id||'')} initialTrade={ownTrades.includes(requestTrade)?'':requestTrade} excludeTrades={ownTrades} target={requestTarget} onClearTarget={()=>setRequestTarget(null)} onSubmit={async(values)=>{const r=await api('requests',{...values,...(requestTarget?{provider:requestTarget.id}:{})});setRequestTarget(null);go('mine');setJustPublishedId(r.id);await detail(r.id)}}/>}
{view==='mine'&&!selected&&<MyRequests items={items} loading={loading} error={error} openingId={openingId} onOpen={id=>act(async()=>{await detail(id);window.scrollTo({top:0})})} onCreate={()=>startRequest()}/>}
{['available','assigned'].includes(view)&&<ProviderWorkspace mode={view as 'available'|'assigned'} trade={tradesOf(application).join(', ')} items={items} selected={selected} loading={loading} error={error} openingId={openingId}
  onOpen={id=>act(async()=>{await detail(id);window.requestAnimationFrame(()=>window.document.getElementById('provider-detail')?.scrollIntoView({block:'start'}))})}
  onBack={()=>setSelected(null)}
  onQuote={(price,description)=>change('quote',{request:selected.id,price,description})}
  onFinish={()=>change('finish',{request:selected.id})}
  renderUpload={kind=><Upload kind={kind} request={selected?.id} label={kind==='before'?'Subir foto · Antes':'Subir foto · Después'} onDone={async()=>{await detail(selected.id);toast('Fotografía del trabajo añadida.')}}/>}
/>}
{selected&&selected.owner===user?.id&&<RequestJourney key={selected.id} request={selected}
  onBack={()=>{setSelected(null);setJustPublishedId('');window.scrollTo({top:0})}}
  onList={()=>{setSelected(null);setJustPublishedId('');window.scrollTo({top:0})}}
  justPublished={selected.id===justPublishedId?<PublishedNotice onViewList={()=>{setSelected(null);setJustPublishedId('')}} hasPhoto={selected.files.some((file:any)=>file.kind==='problem')}>
    {selected.status==='Activa'&&<Upload kind="problem" request={selected.id} label="Añadir foto del problema (opcional)" onDone={async()=>{await detail(selected.id);toast('Foto del problema añadida.')}}/>}
    <small>PNG, JPG o WebP · Máximo 5 MB.</small>
  </PublishedNotice>:undefined}
  onUpload={selected.id!==justPublishedId&&selected.status==='Activa'?<Upload kind="problem" request={selected.id} label="Adjuntar foto del problema" onDone={async()=>{await detail(selected.id);toast('Foto del problema añadida.')}}/>:undefined}
  onAccept={id=>change('accept',{id})}
  onConfirm={()=>change('confirm',{request:selected.id})}
  onStars={async stars=>{await api('review',{request:selected.id,stars});await detail(selected.id)}}
  onComment={async comment=>{await api('review',{request:selected.id,comment});await detail(selected.id)}}
/>}
{view==='admin'&&user&&<AdminPortal api={api} tab={adminTab} personId={personId} me={user.id} onTab={tab=>{setAdminTab(tab);setPersonId('');window.scrollTo({top:0})}} onPerson={id=>{setPersonId(id);window.scrollTo({top:0})}}/>}

{page==='account'&&user&&<AccountPage key={user.id} user={user}
  photoUpload={<Upload kind="avatar" label={user.photo?'Cambiar foto':'Subir foto'} onDone={async(id:string)=>{await api('account',{photo:id});await me();toast('Foto actualizada.')}}/>}
  onRemovePhoto={async()=>{await api('account',{photo:null});await me()}}
  onSaveName={async name=>{await api('account',{name});await me()}}
  onChangePassword={(current,password)=>api('account-password',{current,password})}
  onDeactivate={async password=>{await api('account-deactivate',{password});signedOut();toast('Tu cuenta quedó desactivada.','info')}}
/>}
{page==='forgot'&&<ForgotPage onBack={()=>go('login')} onSubmit={async email=>(await api('forgot',{email})).message}/>}
{page==='reset'&&<ResetPage token={resetToken} onCheck={token=>api('reset/'+encodeURIComponent(token))} onSubmit={async(token,password)=>{await api('reset',{token,password})}} onLogin={()=>{setResetToken('');go('login')}}/>}
{page==='guide'&&<GuidePage onExplore={()=>{go('explore');window.requestAnimationFrame(focusCatalog)}}/>}
</main><footer className="site-footer">
  <div><a className="brand" href="/"><span className="brandmark"><House aria-hidden="true"/></span>Trade</a><p>Hogares más nuestros,<br/>un oficio a la vez.</p><small>Demostración académica · Sin pagos reales</small></div>
  {(!user||role==='cliente')&&<div><h3>Explorar</h3>{['Plomería','Electricidad','Carpintería'].map(t=><button key={t} onClick={()=>selectTrade(t)}>{t}</button>)}<button onClick={()=>selectTrade('')}>Todos los oficios</button></div>}
  <div><h3>{user?'Mi espacio':'Acceso'}</h3>{user?nav.filter(([key])=>key!=='group').map(([key,label])=><button key={key} disabled={role==='proveedor'&&application?.status!=='Aprobada'&&['available','assigned'].includes(key)} onClick={()=>{go(key);window.scrollTo({top:0})}}>{label}</button>):<><button onClick={()=>go('login')}>Iniciar sesión</button></>}</div>
  <div className="footer-bottom"><span>© {new Date().getFullYear()} Trade · Proyecto académico</span><span>Fotografías ilustrativas generadas para Trade</span></div>
</footer></div></div>
}
