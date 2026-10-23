'use client';
import {ArrowRight,Search,ClipboardList,Plus,Wrench,ShieldCheck,UserRound} from 'lucide-react';
export function RoleHome({role,user,application,onNavigate}:{role:string;user:any;application:any;onNavigate:(page:string)=>void}){
 const approved=application?.status==='Aprobada'&&application?.active!==false;
 const deactivated=application?.status==='Aprobada'&&application?.active===false;
 const sections=role==='admin'?[
  {page:'admin',title:'Revisar proveedores',Icon:ShieldCheck,text:'Revisa los datos y la identificación de cada registro. Apruébalo para que pueda cotizar o recházalo para que envíe uno nuevo.'},
 ]:role==='proveedor'?[
  {page:'apply',title:'Mi perfil',Icon:UserRound,text:deactivated?'Administración desactivó tu perfil de proveedor. No apareces en el catálogo ni puedes cotizar.':approved?'Tu perfil ya está aprobado. Ya puedes enviar cotizaciones.':'Tu registro como proveedor está pendiente. Administración debe aprobarlo antes de que puedas cotizar.'},
  {page:'available',title:'Oportunidades',Icon:ClipboardList,text:'Pedidos de los clientes. Abre uno y envía precio y alcance.',disabled:!approved},
  {page:'assigned',title:'Mis trabajos',Icon:Wrench,text:'Solo aparecen los servicios donde el cliente aceptó tu cotización. Aquí subes Antes / Después y marcas Terminado.',disabled:!approved&&!deactivated},
 ]:[
  {page:'explore',title:'Explorar oficios',Icon:Search,text:'Es el catálogo: conoce oficios, perfiles, trabajos y reseñas. Aquí todavía no estás contratando.'},
  {page:'create',title:'Nueva solicitud',Icon:Plus,text:'Publica qué necesitas, el oficio y la fecha. Después puedes adjuntar la foto del problema.'},
  {page:'mine',title:'Mis solicitudes',Icon:ClipboardList,text:'Aquí ves tus pedidos. Abre uno para ver cotizaciones, aceptar una y confirmar el resultado.'},
 ];
 return <section className="role-home"><p className="eyebrow">MI ESPACIO · {role==='admin'?'ADMINISTRADOR':role==='proveedor'?'PROVEEDOR':'CLIENTE'}</p><h1>Hola, {user.name.split(' · ')[0]}.</h1><p className="role-home-intro">{role==='admin'?'Apruebas o rechazas los registros de proveedores. El servicio lo gestionan el cliente y el proveedor.':role==='proveedor'?'Respondes a los pedidos del cliente. Primero Administración aprueba tu registro; después cotizas y realizas los trabajos que te asignen.':'Necesitas un servicio. Explora el catálogo, publica una solicitud y elige una de las cotizaciones recibidas.'}</p>
 <div className="role-home-grid">{sections.map(({page,title,Icon,text,disabled}:any)=><article key={page}><Icon size={30}/><h2>{title}</h2><p>{text}</p><button className="primary" disabled={disabled} onClick={()=>onNavigate(page)}>{disabled?'Requiere aprobación':'Abrir '+title.toLowerCase()}<ArrowRight size={17}/></button></article>)}</div>
 <div className="demo-checklist"><h2>{role==='admin'?'¿Qué haces después?':'¿Dónde están las cotizaciones?'}</h2><p>{role==='admin'?'Después de aprobar o rechazar el registro de Luis, cierra sesión. Entra como Ana para publicar la solicitud. No tienes que aceptar cotizaciones ni confirmar trabajos.':role==='proveedor'?'Abre Oportunidades y selecciona el pedido. Ahí envías tu cotización. Solo pasa a Mis trabajos cuando el cliente la acepta.':'Abre Mis solicitudes y selecciona el pedido que publicaste. Las cotizaciones aparecen dentro del detalle, no en Explorar oficios.'}</p></div>
 {role==='cliente'&&<p className="muted">¿Quieres ofrecer tus servicios? <button className="text-link" onClick={()=>onNavigate('apply')}>Ofrecer mis servicios <ArrowRight size={15}/></button></p>}
 </section>;
}
