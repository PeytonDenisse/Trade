'use client';
import {useState, type ReactNode} from 'react';
import {ArrowRight, CalendarDays, Camera, Check, CheckCircle2, ChevronLeft, ClipboardList, Image as ImageIcon, Plus, Star, Wrench} from 'lucide-react';
import {RemoteImage} from './remote-image';
import {fileSrc} from '../../lib/design-images';

type Request = {id:string;target_name?:string;trade:string;description:string;date:string;status:string;problem_file?:string;provider?:string;quote?:string;files?:{id:string;kind:string;url?:string}[];quotes?:Quote[];review?:{stars?:number;comment?:string}|null};
type Quote = {id:string;provider_name?:string;price:number;description:string;status:string};
const steps=['Activa','Asignada','Terminado','Completado'];
const money=(price:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(price);
const dateLabel=(date:string)=>{const [year,month,day]=date.split('-').map(Number);return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric'}).format(new Date(year,month-1,day))};

function State({status}:{status:string}){return <span className="status request-status" data-status={status}>{status}</span>}

export function MyRequests({items,loading,error,openingId,onOpen,onCreate}:{items:Request[];loading:boolean;error:string;openingId:string;onOpen:(id:string)=>void;onCreate:()=>void}){
  return <div className="my-requests"><div className="request-heading"><div><p className="eyebrow">TUS PROYECTOS, EN UN SOLO LUGAR</p><h1>Mis solicitudes</h1><p>Consulta el estado de tus solicitudes, compara cotizaciones y sigue cada trabajo.</p></div><button className="primary" onClick={onCreate}><Plus size={18}/> Nueva solicitud</button></div>
    <h2>Todas mis solicitudes</h2>
    {loading?<p className="request-feedback" role="status">Cargando solicitudes…</p>:error?<p className="request-feedback" role="alert">No pudimos cargar tus solicitudes. {error}</p>:items.length?<div className="my-request-list">{items.map(request=><button className="my-request-card" key={request.id} onClick={()=>onOpen(request.id)} disabled={!!openingId}>
      <span className="my-request-thumb">{request.problem_file?<RemoteImage src={'/api/files/'+request.problem_file} alt="Foto del problema adjunta a esta solicitud"/>:<Wrench aria-hidden="true" size={28}/>}</span>
      <span className="my-request-copy"><strong>{request.description}</strong><span>{request.trade} · {dateLabel(request.date)}{request.target_name&&<> · Para {request.target_name}</>}</span></span><State status={request.status}/><ArrowRight className="my-request-arrow" size={19}/>
      {openingId===request.id&&<span className="my-request-loading" role="status">Abriendo…</span>}
    </button>)}</div>:<div className="request-empty"><ClipboardList size={35}/><h3>Aún no tienes solicitudes</h3><p>Publica lo que necesitas para recibir cotizaciones de profesionales.</p><button className="primary" onClick={onCreate}>Crear solicitud <ArrowRight size={17}/></button></div>}
  </div>;
}

function FileGroup({request,kind,label}:{request:Request;kind:string;label:string}){
  const files=request.files?.filter(file=>file.kind===kind)||[];
  return <div className="work-photo-group"><h3>{label}</h3>{files.length?<div className="work-photo-list">{files.map(file=><RemoteImage key={file.id} src={fileSrc(file.id,file.url)} alt={`${label} del trabajo, fotografía subida por el proveedor`}/>)}</div>:<div className="work-photo-empty"><ImageIcon size={26}/><span>Sin fotografía de {label.toLowerCase()} todavía.</span></div>}</div>;
}

function ReviewPanel({request,onStars,onComment}:{request:Request;onStars:(stars:number)=>Promise<void>;onComment:(comment:string)=>Promise<void>}){
  const [stars,setStars]=useState(request.review?.stars||0);
  const [comment,setComment]=useState(request.review?.comment||'');
  const [busy,setBusy]=useState<'stars'|'comment'|''>('');
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  async function save(kind:'stars'|'comment'){
    if(kind==='stars'&&!stars){setError('Elige una calificación de 1 a 5 estrellas.');return}
    if(kind==='comment'&&!comment.trim()){setError('Escribe un comentario antes de guardarlo.');return}
    setBusy(kind);setError('');setSuccess('');
    try{if(kind==='stars')await onStars(stars);else await onComment(comment.trim());setSuccess(kind==='stars'?'Calificación guardada.':'Comentario guardado.')}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar la reseña.')}finally{setBusy('')}
  }
  return <section className="journey-card review-panel"><p className="eyebrow">SERVICIO COMPLETADO</p><h2>¿Cómo te fue con el servicio?</h2><p>Tu opinión ayuda a otros clientes a conocer el trabajo de este profesional.</p>
    <div className="review-fields"><div><h3>Califica el servicio</h3><div className="star-buttons" role="group" aria-label="Calificación de 1 a 5 estrellas">{[1,2,3,4,5].map(value=><button key={value} type="button" aria-label={`${value} ${value===1?'estrella':'estrellas'}`} aria-pressed={stars===value} onClick={()=>{setStars(value);setError('');setSuccess('')}}><Star size={34} fill={value<=stars?'currentColor':'none'}/></button>)}</div><span className="review-hint">{stars?`${stars} de 5 estrellas`:'Elige de 1 a 5 estrellas'}</span><button className="primary" disabled={!!busy||stars===request.review?.stars} onClick={()=>save('stars')}>{busy==='stars'?'Guardando…':'Guardar calificación'}</button></div>
      <div><label htmlFor="review-comment">Comentario</label><textarea id="review-comment" maxLength={1000} value={comment} onChange={event=>{setComment(event.target.value);setError('');setSuccess('')}} placeholder="Cuenta cómo fue tu experiencia con el servicio."/><span className="review-hint">{comment.length}/1000 caracteres</span><button className="primary" disabled={!!busy||comment.trim()===request.review?.comment} onClick={()=>save('comment')}>{busy==='comment'?'Guardando…':'Guardar comentario'}</button></div></div>
    {error&&<p className="error" role="alert">{error}</p>}{success&&<p className="notice" role="status"><CheckCircle2 size={18}/>{success}</p>}
  </section>;
}

export function RequestJourney({request,justPublished,onBack,onList,onUpload,onAccept,onConfirm,onStars,onComment}:{request:Request;justPublished?:ReactNode;onBack:()=>void;onList:()=>void;onUpload?:ReactNode;onAccept:(id:string)=>Promise<void>;onConfirm:()=>Promise<void>;onStars:(stars:number)=>Promise<void>;onComment:(comment:string)=>Promise<void>}){
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const problem=request.files?.filter(file=>file.kind==='problem')||[];
  const quotes=request.quotes||[];
  const assigned=quotes.find(quote=>quote.id===request.quote);
  async function run(kind:string,action:()=>Promise<void>){setBusy(kind);setError('');setSuccess('');try{await action();setSuccess(kind==='confirm'?'Servicio confirmado como Completado.':'Cotización aceptada. El trabajo está Asignado.')}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la acción.')}finally{setBusy('')}}
  return <div className="request-journey"><button className="back" onClick={onBack}><ChevronLeft size={18}/> Volver a mis solicitudes</button>{justPublished}
    <div className="journey-heading"><div><p className="eyebrow">DETALLE DE LA SOLICITUD</p><h1>Solicitud de {request.trade}</h1><p>{request.status==='Activa'?'Revisa las cotizaciones y elige la propuesta para tu proyecto.':request.status==='Asignada'?'Sigue el trabajo y revisa las fotografías del proveedor.':request.status==='Terminado'?'Revisa el resultado antes de confirmar su finalización.':'Tu servicio está completado. Puedes compartir tu experiencia.'}</p></div><div className="journey-summary"><small>Solicitud #{request.id.slice(0,8)}</small><strong>{request.trade}</strong>{request.target_name&&<span className="target-badge">Solicitud para {request.target_name}</span>}<span><CalendarDays size={16}/> Fecha solicitada: {dateLabel(request.date)}</span><State status={request.status}/></div></div>
    {error&&<p className="error" role="alert">{error}</p>}{success&&<p className="notice" role="status"><CheckCircle2 size={18}/>{success}</p>}
    <section className="journey-card"><h2>Estado del servicio</h2><ol className="journey-steps">{steps.map((step,index)=><li key={step} className={index<steps.indexOf(request.status)?'is-complete':index===steps.indexOf(request.status)?'is-current':''} aria-current={step===request.status?'step':undefined}><span>{index<steps.indexOf(request.status)?<Check size={17}/>:index+1}</span><strong>{step}</strong></li>)}</ol><p className="journey-state-note">{request.status==='Activa'?'Tu solicitud está disponible para recibir cotizaciones.':request.status==='Asignada'?'La cotización fue aceptada y el trabajo está asignado.':request.status==='Terminado'?'El proveedor marcó el trabajo como terminado. Revisa el resultado y confirma cuando estés conforme.':'Confirmaste la finalización del servicio.'}</p></section>
    <section className="journey-card"><h2>Detalle del trabajo</h2><p className="journey-description">{request.description}</p><div className="journey-meta"><span><Wrench size={17}/>{request.trade}</span><span><CalendarDays size={17}/>{dateLabel(request.date)}</span>{assigned&&<span><CheckCircle2 size={17}/>Proveedor asignado: {assigned.provider_name||'Profesional de Trade'}</span>}</div><h3>Foto del problema</h3>{problem.length?<div className="problem-photos">{problem.map(file=><RemoteImage key={file.id} src={'/api/files/'+file.id} alt="Fotografía del problema subida por el cliente"/>)}</div>:<p className="work-photo-empty"><Camera size={22}/> No se adjuntó una foto del problema.</p>}{onUpload&&request.status==='Activa'&&<div className="problem-upload">{onUpload}<small>PNG, JPG o WebP · Máximo 5 MB por imagen.</small></div>}</section>
    <section className="journey-card"><h2>Cotizaciones recibidas</h2><p>Compara el precio total y la descripción de lo incluido en cada propuesta.</p>{quotes.length?<div className="quote-grid">{quotes.map(quote=><article className="quote-card" key={quote.id}><div className="quote-card-head"><span className="quote-avatar" aria-hidden="true">{(quote.provider_name||'P').slice(0,1)}</span><div><h3>{quote.provider_name||'Profesional de Trade'}</h3><State status={quote.status}/></div></div><span className="quote-label">Precio total en MXN</span><strong className="quote-price">{money(quote.price)}</strong><span className="quote-label">Qué incluye</span><p className="quote-description">{quote.description}</p>{request.status==='Activa'&&quote.status==='Pendiente'&&<button className="primary" disabled={!!busy} onClick={()=>run(quote.id,()=>onAccept(quote.id))}>{busy===quote.id?'Aceptando…':'Aceptar cotización'} <ArrowRight size={17}/></button>}</article>)}</div>:<div className="request-empty compact"><ClipboardList size={28}/><h3>Aún no hay cotizaciones</h3><p>Las propuestas aparecerán aquí cuando los profesionales respondan.</p></div>}</section>
    {request.provider&&<section className="journey-card"><h2>Fotografías del trabajo</h2><p>Estas fotografías de Antes y Después las sube el proveedor asignado.</p><div className="work-photos"><FileGroup request={request} kind="before" label="Antes"/><FileGroup request={request} kind="after" label="Después"/></div>{request.status==='Terminado'&&<div className="journey-confirm"><div><h3>Confirma la finalización</h3><p>Revisa el trabajo y sus fotografías. Si estás conforme, confirma el servicio como Completado.</p></div><button className="primary" disabled={!!busy} onClick={()=>run('confirm',onConfirm)}>{busy==='confirm'?'Confirmando…':'Confirmar servicio completado'} <ArrowRight size={17}/></button></div>}</section>}
    {request.status==='Completado'&&<ReviewPanel request={request} onStars={onStars} onComment={onComment}/>}
    <button className="text-button journey-list-link" onClick={onList}>Ver mis solicitudes <ArrowRight size={16}/></button>
  </div>;
}
