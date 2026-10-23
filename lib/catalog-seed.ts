import type {Db} from 'mongodb';
// Synthetic catalog. Only for the owner-private academic demo, never real endorsements.
export const catalog=[
 ['Carlos Mendoza','Plomería','12 años de experiencia','León Centro','Reparo fugas, instalo calentadores y doy mantenimiento a tuberías. Explico el trabajo y los materiales antes de comenzar.','#547a64',5,'Reparación de fuga en lavabo'],
 ['Mariana Torres','Electricidad','8 años de experiencia','Zona Norte, León','Instalaciones eléctricas residenciales, cambio de contactos y revisión de tableros. Trabajo con orden y atención al detalle.','#bc985f',5,'Cambio de contactos eléctricos'],
 ['José Hernández','Carpintería','15 años de experiencia','San Juan Bosco, León','Fabricación y reparación de muebles, puertas y clósets. Ajusto cada proyecto al espacio y las necesidades del cliente.','#927458',4,'Ajuste de puerta de madera'],
 ['Andrea Salazar','Pintura','6 años de experiencia','Zona Sur, León','Pintura de interiores y exteriores, resanes y preparación de muros. Cuido los muebles y la limpieza al finalizar.','#8f7999',5,'Renovación de pintura en sala'],
 ['Miguel Navarro','Cerrajería','10 años de experiencia','Coecillo, León','Instalación y mantenimiento de cerraduras, cambios de cilindros y ajustes de puertas para hogares y negocios.','#6b879a',4,'Instalación de cerradura'],
 ['Roberto Castillo','Albañilería','18 años de experiencia','Zona Oriente, León','Reparaciones de muros, colocación de pisos y remodelaciones pequeñas. Presento el alcance de cada trabajo con claridad.','#ab7659',5,'Reparación de muro interior'],
 ['Fernanda Ríos','Mantenimiento','7 años de experiencia','León y alrededores','Mantenimiento general para hogares y pequeños negocios. Instalación de accesorios, ajustes y reparaciones cotidianas.','#658d8b',5,'Mantenimiento de local comercial'],
 ['David Ortega','Plomería','9 años de experiencia','Zona Poniente, León','Destapes, cambios de llaves y reparación de sanitarios. Reviso la causa del problema antes de proponer una solución.','#758e56',4,'Cambio de llave mezcladora'],
 ['Paola Vargas','Electricidad','5 años de experiencia','León Centro','Iluminación interior, instalación de lámparas y diagnóstico de fallas eléctricas en viviendas.','#a47d86',5,'Instalación de iluminación'],
 ['Ricardo Luna','Carpintería','11 años de experiencia','Zona Norte, León','Restauración de muebles y fabricación de repisas a medida. Acabados sencillos y funcionales para cada espacio.','#8d8b68',4,'Restauración de repisa']
] as const;
function avatar(name:string,color:string){const initials=name.split(' ').map(s=>s[0]).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" rx="160" fill="${color}"/><circle cx="160" cy="115" r="54" fill="#ffffff" opacity=".3"/><path d="M50 290c0-85 220-85 220 0" fill="#ffffff" opacity=".3"/><text x="160" y="185" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="76" font-weight="bold">${initials}</text></svg>`}
export async function seedCatalog(env:any,db:Db){
 if(env.DEMO_ENABLED!=='true')return Response.json({error:'Catálogo de demostración deshabilitado.'},{status:403});
 // Same as SQL INSERT OR IGNORE: only writes documents whose key does not exist yet.
 const add=(name:string,key:string,doc:any)=>db.collection(name).updateOne({[key]:doc[key]},{$setOnInsert:doc},{upsert:true});
 await add('users','id',{id:'catalog-client',name:'Cliente ficticio · Demo',email:'catalog-client@trade.example',hash:crypto.randomUUID(),salt:crypto.randomUUID(),role:'cliente',active:true});
 for(let i=0;i<catalog.length;i++){
 const [name,trade,experience,zone,description,color,rating,job]=catalog[i],uid=`catalog-provider-${i+1}`,photo=uid+'-avatar',document=uid+'-document',rid=uid+'-service',qid=uid+'-quote';
 if(!await env.BUCKET.get(photo))await env.BUCKET.put(photo,new TextEncoder().encode(avatar(name,color)),{httpMetadata:{contentType:'image/svg+xml'}});
 if(!await env.BUCKET.get(document))await env.BUCKET.put(document,new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#e9eee8"/><text x="40" y="150" font-size="28" font-family="Arial">PERFIL FICTICIO · DEMOSTRACIÓN</text><text x="40" y="220" font-size="22" font-family="Arial">Sin documento de identidad real</text></svg>'),{httpMetadata:{contentType:'image/svg+xml'}});
 await add('users','id',{id:uid,name:name+' · Demo',email:`proveedor${i+1}@trade.example`,hash:crypto.randomUUID(),salt:crypto.randomUUID(),role:'proveedor',active:true});
 await add('files','id',{id:photo,owner:uid,request:null,kind:'photo',mime:'image/svg+xml'});
 await add('files','id',{id:document,owner:uid,request:null,kind:'document',mime:'image/svg+xml'});
 await add('providers','id',{id:uid,trade,experience,zone,description:description+' Perfil ficticio para demostración.',photo,document,status:'Aprobada',active:true});
 await add('requests','id',{id:rid,owner:'catalog-client',trade,description:job+' (ejemplo ficticio)',date:'2026-10-10',status:'Completado',provider:uid,quote:qid,created:'2026-10-08T12:00:00Z'});
 await add('quotes','id',{id:qid,request:rid,provider:uid,price:650+i*125,description:'Servicio y materiales de ejemplo. Sin transacción real.',status:'Aceptada'});
 await add('reviews','request',{request:rid,provider:uid,owner:'catalog-client',stars:rating,comment:'Reseña ficticia de demostración: '+['Explicó el trabajo y dejó todo limpio.','Buena comunicación y atención al detalle.','El resultado quedó como se había acordado.'][i%3]});
 }
 return Response.json({ok:true,providers:catalog.length,note:'Perfiles y reseñas ficticios. La carga es idempotente y conserva registros existentes.'});
}
