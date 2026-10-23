import {Binary,type Db} from 'mongodb';
import {serviceLocation} from './service-location';
import {seedCatalog} from './catalog-seed';
import {demo} from './demo';
import {required,trade,tradeList,tradesOf,price,stars,date,passwordHash,ACTIVE} from './rules';
import {withDb,type DbEnv} from '../db/mongo';
import {accountGet,accountPost} from './api-account';
import {adminGet,adminPost} from './api-admin';
import {tradeNames} from './trades-db';
import {getSettings} from './settings-db';
import {expireRequests,lifecyclePost} from './api-lifecycle';
import type {Ctx} from './api-context';
type Env=DbEnv&{BUCKET?:any,DEMO_ENABLED?:string,MONGODB_FILES?:string};
const json=(data:any,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const id=()=>crypto.randomUUID();
// Replaces the SQL JOIN on users: copies the user's name from `field` into `as`.
const withName=(field:string,as:string)=>[{$lookup:{from:'users',localField:field,foreignField:'id',as:'_u'}},{$set:{[as]:{$first:'$_u.name'}}},{$project:{_id:0,_u:0}}];
// Hides providers whose account an admin deactivated.
const withActiveAccount=[{$lookup:{from:'users',localField:'id',foreignField:'id',as:'_acct'}},{$match:{'_acct.active':{$ne:false}}},{$project:{_acct:0}}];
// Public images may have a static URL; adds it as photo_url so pages skip /api/files.
const withPhotoUrl=[{$lookup:{from:'files',localField:'photo',foreignField:'id',as:'_photo'}},{$set:{photo_url:{$first:'$_photo.url'}}},{$project:{_photo:0}}];
const withProblemFile=[{$lookup:{from:'files',let:{rid:'$id'},pipeline:[{$match:{$expr:{$and:[{$eq:['$request','$$rid']},{$eq:['$kind','problem']}]}}},{$limit:1},{$project:{_id:0,id:1}}],as:'_problem'}},{$set:{problem_file:{$first:'$_problem.id'}}},{$project:{_id:0,_problem:0}}];
// Explicit MongoDB selection also applies locally, where Vite still supplies an empty R2 binding.
function mongoStorage(db:Db){
 const objects=db.collection<{_id:string,data:Binary}>('file_objects');
 return {
  async put(key:string,data:Uint8Array){
   await objects.updateOne({_id:key},{$set:{data:new Binary(data)}},{upsert:true});
  },
  async get(key:string){
   const object=await objects.findOne({_id:key});
   return object?{body:new Uint8Array(object.data.value())}:null;
  }
 };
}
export function handle(req:Request,env:Env){
 return withDb(env,db=>{
  const BUCKET=env.MONGODB_FILES==='true'?mongoStorage(db):env.BUCKET;
  return route(req,{...env,BUCKET},db);
 }).catch((e:any)=>json({error:e.message||'No pudimos completar la operación.'},500));
}
async function route(req:Request,env:Env,db:Db){
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\//,''),c=(name:string)=>db.collection<any>(name);
 const one=(name:string,filter:any,projection:any={})=>c(name).findOne(filter,{projection:{_id:0,...projection}});
 const all=(name:string,filter:any,sort:any={},projection:any={})=>c(name).find(filter,{projection:{_id:0,...projection},sort}).toArray();
 const agg=(name:string,pipeline:any[])=>c(name).aggregate(pipeline).toArray();
 const fail=(message:string,status=400)=>{throw Object.assign(new Error(message),{status})};
 // Body ids go straight into filters, so reject objects like {"$ne":null}.
 const sid=(v:unknown)=>typeof v==='string'?v:fail('Datos inválidos.');
 const token=req.headers.get('cookie')?.match(/(?:^|;\s*)trade_session=([^;]+)/)?.[1];
 const session=token?await one('sessions',{token,expires:{$gt:Date.now()}}):null;
 const user:any=session?await one('users',{id:session.user_id,...ACTIVE},{id:1,name:1,email:1,role:1,photo:1}):null;
 if(user?.photo)user.photo_url='/api/files/'+user.photo;
 const auth=()=>{if(!user)fail('Inicia sesión para continuar.',401);return user};
 const ctx:Ctx={db,c,one,all,agg,fail:fail as Ctx['fail'],sid,id,json,user,auth,token,url};
 const own=async(rid:string)=>{const r=await one('requests',{id:rid});if(!r)fail('Solicitud no encontrada.',404);return r as any};
 // A request asked to one provider (target) is only open to that provider.
 const openTo=(r:any,uid:string)=>!r.target||r.target===uid;
 const approved=(uid:string)=>one('providers',{id:uid,status:'Aprobada',...ACTIVE});
 const provider=async()=>{auth();const p=await approved(user.id);if(!p)fail('Necesitas un registro de proveedor aprobado.',403);return p as any};
 const fileOwned=async(fid:unknown,kind:string)=>{if(!await one('files',{id:sid(fid),owner:user.id,kind}))fail('Adjunta el archivo solicitado.');return fid as string};
 try{
 if(req.method!=='GET') {const origin=req.headers.get('origin');if(origin&&origin!==url.origin)fail('Origen no permitido.',403);if(Number(req.headers.get('content-length')||0)>5500000)fail('El archivo supera el límite.',413)}
 if(req.method==='GET'){
 // Overdue active requests become Vencida before anyone reads them.
 if(path.startsWith('requests')||path==='admin/summary'||path==='admin/moderation')await expireRequests(ctx);
 if(path==='demo-status'){
  if(env.DEMO_ENABLED!=='true')return json({enabled:false,requests:[]});
  const ids=['presentation-new','presentation-active','presentation-assigned','presentation-finished','presentation-completed'];
  const requests=await all('requests',{id:{$in:ids}},{},{id:1,description:1,status:1});
  return json({enabled:true,prepared:requests.length===ids.length,requests,providerStatus:(await approved('demo-proveedor'))?'Aprobada':'Sin aprobación',pendingApplications:await c('providers').countDocuments({status:'Pendiente'})});
 }
 if(path.startsWith('files/')&&!env.BUCKET)fail('Las imágenes no están disponibles en esta versión.',503);
 if(path==='trades')return json(await tradeNames(db));
 // What visitors need to know before signing up.
 if(path==='settings'){const s=await getSettings(db);return json({registrationOpen:s.registrationOpen,providerApplicationsOpen:s.providerApplicationsOpen})}
 if(path==='me')return json({user,application:user?await one('providers',{id:user.id}):null});
 if(path==='providers'){const t=url.searchParams.get('trade');return json(await agg('providers',[{$match:{status:'Aprobada',...ACTIVE,...(t?{trades:t}:{})}},...withActiveAccount,{$lookup:{from:'reviews',localField:'id',foreignField:'provider',as:'_r'}},{$set:{rating:{$avg:{$map:{input:{$filter:{input:'$_r',cond:{$ne:['$$this.hidden',true]}}},in:'$$this.stars'}}}}},...withName('id','name'),...withPhotoUrl,{$project:{document:0,_r:0}}]))}
 if(path.startsWith('providers/')){const pid=path.split('/')[1];const [p]=await agg('providers',[{$match:{id:pid,status:'Aprobada',...ACTIVE}},...withActiveAccount,...withName('id','name'),...withPhotoUrl,{$project:{document:0}}]);if(!p)fail('Proveedor no encontrado.',404);const done=(await all('requests',{provider:pid,status:'Completado'},{},{id:1})).map(r=>r.id);return json({...p,works:await all('files',{request:{$in:done},kind:{$in:['before','after']}},{},{id:1,kind:1,request:1,url:1}),reviews:await all('reviews',{provider:pid,hidden:{$ne:true}},{},{stars:1,comment:1})})}
 if(path==='requests'){auth();const scope=url.searchParams.get('scope');if(scope==='available'){const p=await provider();return json(await agg('requests',[{$match:{trade:{$in:tradesOf(p)},status:'Activa',owner:{$ne:user.id},$or:[{target:null},{target:{$exists:false}},{target:user.id}]}},{$sort:{created:-1}},...withName('owner','owner_name'),...withProblemFile,{$project:{location:0}}]))}if(scope==='assigned')return json(await agg('requests',[{$match:{provider:user.id}},{$sort:{created:-1}},...withProblemFile]));return json(await agg('requests',[{$match:{owner:user.id}},{$sort:{created:-1}},...withProblemFile,...withName('target','target_name')]))}
 if(path.startsWith('requests/')){auth();const r=await own(path.split('/')[1]);const p=await approved(user.id);const participant=r.owner===user.id||r.provider===user.id;if(!participant&&!(tradesOf(p).includes(r.trade)&&r.status==='Activa'&&openTo(r,user.id)))fail('No tienes acceso a este servicio.',403);const target:any=r.target?await one('users',{id:r.target},{name:1}):null;return json({...r,location:participant?r.location:undefined,locationShared:!!r.location,target_name:target?.name,quotes:await agg('quotes',[{$match:{request:r.id,...(r.owner===user.id?{}:{provider:user.id})}},...withName('provider','provider_name')]),files:await all('files',{request:r.id},{},{id:1,kind:1,url:1}),review:await one('reviews',{request:r.id}),report:(await all('reports',{request:r.id},{created:-1},{id:1,status:1,reason:1,resolution:1,created:1,by:1}))[0]||null})}
 if(path.startsWith('files/')){const f:any=await one('files',{id:path.split('/')[1]});if(!f)fail('Archivo no encontrado.',404);let allowed=false;if(f.kind==='photo')allowed=!!await one('providers',{photo:f.id,status:'Aprobada'});if(f.request){const r=await own(f.request);allowed=r.status==='Completado'&&['before','after'].includes(f.kind);if(user){const p=await approved(user.id);allowed=allowed||r.owner===user.id||r.provider===user.id||(f.kind==='problem'&&r.status==='Activa'&&tradesOf(p).includes(r.trade)&&openTo(r,user.id))}}if(user&&(f.owner===user.id||user.role==='admin'||f.kind==='avatar'))allowed=true;if(!allowed)fail('No tienes acceso al archivo.',403);const obj=await env.BUCKET.get(f.id);if(!obj)fail('Archivo no encontrado.',404);return new Response(obj.body,{headers:{'Content-Type':f.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=31536000, immutable'}})}
 const reply=await accountGet(ctx,path)??await adminGet(ctx,path);if(reply)return reply;
 return json({error:'Ruta no encontrada.'},404);
 }
 if(req.method!=='POST')return json({error:'Método no permitido.'},405);
 if(path==='upload'){
 if(!env.BUCKET)fail('La carga de imágenes está deshabilitada temporalmente.',503);
 auth();const form=await req.formData(),file=form.get('file') as File,kind=String(form.get('kind')),rid=String(form.get('request')||'');if(!file||typeof file.arrayBuffer!=='function'||file.size>5*1024*1024||file.size===0)fail('Adjunta una imagen de hasta 5 MB.');if(!['photo','document','avatar','problem','before','after'].includes(kind))fail('Tipo de imagen inválido.');if(rid){const r=await own(rid);if(kind==='problem'){if(r.owner!==user.id||r.status!=='Activa')fail('Solo puedes añadir fotografías a tus solicitudes activas.',403)}else if(['before','after'].includes(kind)){if(r.provider!==user.id||r.status!=='Asignada')fail('Solo el proveedor asignado puede registrar evidencia durante el trabajo.',403)}else fail('Tipo de archivo no permitido.')}else if(!['photo','document','avatar'].includes(kind))fail('Selecciona un servicio.');
 const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';const mime=png?'image/png':jpg?'image/jpeg':webp?'image/webp':'';if(!mime||mime!==file.type)fail('Usa una imagen PNG, JPG o WebP válida.');const fid=id();await env.BUCKET.put(fid,bytes,{httpMetadata:{contentType:mime}});await c('files').insertOne({id:fid,owner:user.id,request:rid||null,kind,mime});return json({id:fid},201);
 }
 const b:any=await req.json().catch(()=>fail('Datos inválidos.'));
 // This shared seed endpoint relies on the verified owner-private Sites boundary.
 if(path==='demo-catalog')return await seedCatalog(env,db);
 if(path==='demo')return await demo(req,env,db,b.role);
 const accountReply=await accountPost(ctx,path,b);if(accountReply)return accountReply;
 if(path==='register'||path==='login'){
 const email=required(b.email,'Correo',254).toLowerCase(),pw=required(b.password,'Contraseña',128);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Escribe un correo válido.');let u:any;
 if(path==='register'){if(!(await getSettings(db)).registrationOpen)fail('El registro de cuentas nuevas está cerrado por ahora.',403);if(pw.length<10)fail('La contraseña debe tener al menos 10 caracteres.');if(await one('users',{email}))fail('Este correo ya tiene una cuenta.',409);const uid=id(),salt=id();await c('users').insertOne({id:uid,name:required(b.name,'Nombre',100),email,hash:await passwordHash(pw,salt),salt,role:'cliente',active:true,created_at:new Date().toISOString()});u={id:uid}}else{u=await one('users',{email});if(!u||await passwordHash(pw,u.salt)!==u.hash)fail('Correo o contraseña incorrectos.',401);if(u.active===false)fail('Esta cuenta está desactivada'+(u.deactivated_reason?': '+u.deactivated_reason:'')+'. Contacta a administración.',403)}const session=id()+id();await c('sessions').insertOne({token:session,user_id:u.id,expires:Date.now()+86400000});return json({ok:true},200,{'Set-Cookie':`trade_session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`})
 }
 if(path==='logout'){if(token)await c('sessions').deleteOne({token});return json({ok:true},200,{'Set-Cookie':'trade_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
 auth();
 const adminReply=await adminPost(ctx,path,b)??await lifecyclePost(ctx,path,b);if(adminReply)return adminReply;
 // Trades offered right now; new registrations and requests must use one of them.
 const offered=['apply','requests'].includes(path)?await tradeNames(db):[];
 // A rejected provider may send a new registration; any other existing one blocks it.
 if(path==='apply'){if(user.role==='admin')fail('Las cuentas de administración no pueden registrarse como proveedores.',403);const previous:any=await one('providers',{id:user.id});if(previous&&previous.status!=='Rechazada')fail('Ya enviaste tu registro como proveedor.',409);if(!(await getSettings(db)).providerApplicationsOpen)fail('Los registros de proveedores están cerrados por ahora.',403);if(previous)await c('providers').deleteOne({id:user.id,status:'Rechazada'});await c('providers').insertOne({id:user.id,...(list=>({trade:list[0],trades:list}))(tradeList(b.trades??b.trade,offered)),experience:required(b.experience,'Experiencia',500),zone:required(b.zone,'Zona',200),description:required(b.description,'Descripción',2000),photo:await fileOwned(b.photo,'photo'),document:await fileOwned(b.document,'document'),status:'Pendiente',active:true});return json({ok:true},201)}
 // Providers hire other trades; a plumber posting a plumbing request makes no sense.
 if(path==='requests'){if(user.role==='admin')fail('Las cuentas de administración no publican solicitudes de servicio.',403);const registration:any=await one('providers',{id:user.id,status:{$ne:'Rechazada'}});const {maxOpenRequests}=await getSettings(db);if(await c('requests').countDocuments({owner:user.id,status:'Activa'})>=maxOpenRequests)fail(`Ya tienes ${maxOpenRequests} solicitudes activas; espera a que avancen o cancela alguna.`,409);if(registration&&tradesOf(registration).includes(trade(b.trade,offered)))fail(`No puedes publicar solicitudes de ${trade(b.trade,offered)}: es uno de tus oficios.`,403);let target:string|null=null;if(b.provider!==undefined&&b.provider!==null&&b.provider!==''){target=sid(b.provider);if(target===user.id)fail('No puedes pedirte una cotización a ti mismo.',403);const chosen:any=await approved(target);if(!chosen)fail('Ese profesional no está disponible.',404);if(!tradesOf(chosen).includes(trade(b.trade,offered)))fail(`Ese profesional no ofrece ${trade(b.trade,offered)}.`,400)}
  const location=serviceLocation(b.location);const rid=id();await c('requests').insertOne({id:rid,owner:user.id,trade:trade(b.trade,offered),description:required(b.description,'Descripción'),date:date(b.date),status:'Activa',provider:null,quote:null,created:new Date().toISOString(),...(target?{target}:{}),...(location?{location}:{})});return json({id:rid},201)}
 if(path==='quote'){const p=await provider(),r=await own(sid(b.request));if(r.status!=='Activa'||!tradesOf(p).includes(r.trade)||r.owner===user.id||!openTo(r,user.id))fail('No puedes cotizar esta solicitud.',403);if(await one('quotes',{request:r.id,provider:user.id}))fail('Ya enviaste una cotización.',409);const qid=id();await c('quotes').insertOne({id:qid,request:r.id,provider:user.id,price:price(b.price),description:required(b.description,'Incluye'),status:'Pendiente'});if(!await one('requests',{id:r.id,status:'Activa'})){await c('quotes').deleteOne({id:qid});fail('La solicitud ya no está activa.',409)}return json({ok:true},201)}
 if(path==='accept'){const q:any=await one('quotes',{id:sid(b.id)});if(!q)fail('Cotización no encontrada.',404);const r=await own(q.request);if(r.owner!==user.id)fail('Solo el cliente puede elegir la cotización.',403);if(r.status!=='Activa'||q.status!=='Pendiente')fail('Ya se seleccionó una propuesta.',409);if(!(await c('requests').updateOne({id:r.id,status:'Activa',owner:user.id},{$set:{status:'Asignada',provider:q.provider,quote:q.id}})).modifiedCount)fail('Otra cotización fue aceptada primero.',409);await c('quotes').updateMany({request:r.id},[{$set:{status:{$cond:[{$eq:['$id',q.id]},'Aceptada','No seleccionada']}}}]);return json({ok:true})}
 if(path==='finish'||path==='confirm'){const r=await own(sid(b.request)),finish=path==='finish';if((finish?r.provider:r.owner)!==user.id)fail('No tienes permiso para cambiar este servicio.',403);const previous=finish?'Asignada':'Terminado',next=finish?'Terminado':'Completado';if(r.status!==previous)fail('El servicio no está en el estado requerido.',409);if(!(await c('requests').updateOne({id:r.id,status:previous},{$set:{status:next}})).modifiedCount)fail('El servicio ya cambió de estado.',409);return json({ok:true})}
 if(path==='review'){const r=await own(sid(b.request));if(r.owner!==user.id||r.status!=='Completado')fail('Solo puedes evaluar tus servicios completados.',403);if(b.stars===undefined&&b.comment===undefined)fail('Añade una calificación o comentario.');const rating=b.stars===undefined?null:stars(b.stars),comment=b.comment===undefined?null:required(b.comment,'Comentario',1000);await c('reviews').updateOne({request:r.id},{$set:{...(rating===null?{}:{stars:rating}),...(comment===null?{}:{comment})},$setOnInsert:{provider:r.provider,owner:user.id}},{upsert:true});return json({ok:true})}
 return json({error:'Ruta no encontrada.'},404);
 }catch(e:any){return json({error:e.code===11000?'El registro ya existe.':e.message||'No pudimos completar la operación.'},e.status||400)}
}
