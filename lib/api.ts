import {Binary,type Db} from 'mongodb';
import {seedCatalog} from './catalog-seed';
import {demo} from './demo';
import {required,trade,price,stars,date,passwordHash} from './rules';
import {withDb,type DbEnv} from '../db/mongo';
type Env=DbEnv&{BUCKET?:any,DEMO_ENABLED?:string,MONGODB_FILES?:string};
const json=(data:any,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const id=()=>crypto.randomUUID();
// Replaces the SQL JOIN on users: copies the user's name from `field` into `as`.
const withName=(field:string,as:string)=>[{$lookup:{from:'users',localField:field,foreignField:'id',as:'_u'}},{$set:{[as]:{$first:'$_u.name'}}},{$project:{_id:0,_u:0}}];
// R2 remains preferred. Small demo uploads can use MongoDB on hosts without R2.
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
  const BUCKET=env.BUCKET||(env.MONGODB_FILES==='true'?mongoStorage(db):undefined);
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
 const user:any=session?await one('users',{id:session.user_id},{id:1,name:1,email:1,role:1}):null;
 const auth=()=>{if(!user)fail('Inicia sesión para continuar.',401);return user};
 const own=async(rid:string)=>{const r=await one('requests',{id:rid});if(!r)fail('Solicitud no encontrada.',404);return r as any};
 const approved=(uid:string)=>one('providers',{id:uid,status:'Aprobada'});
 const provider=async()=>{auth();const p=await approved(user.id);if(!p)fail('Necesitas autorización como proveedor.',403);return p as any};
 const fileOwned=async(fid:unknown,kind:string)=>{if(!await one('files',{id:sid(fid),owner:user.id,kind}))fail('Adjunta el archivo solicitado.');return fid as string};
 try{
 if(req.method!=='GET') {const origin=req.headers.get('origin');if(origin&&origin!==url.origin)fail('Origen no permitido.',403);if(Number(req.headers.get('content-length')||0)>5500000)fail('El archivo supera el límite.',413)}
 if(req.method==='GET'){
 if(path.startsWith('files/')&&!env.BUCKET)fail('Las imágenes no están disponibles en esta versión.',503);
 if(path==='me')return json({user,application:user?await one('providers',{id:user.id}):null});
 if(path==='providers'){const t=url.searchParams.get('trade');return json(await agg('providers',[{$match:{status:'Aprobada',...(t?{trade:t}:{})}},{$lookup:{from:'reviews',localField:'id',foreignField:'provider',as:'_r'}},{$set:{rating:{$avg:'$_r.stars'}}},...withName('id','name'),{$project:{document:0,_r:0}}]))}
 if(path.startsWith('providers/')){const pid=path.split('/')[1];const [p]=await agg('providers',[{$match:{id:pid,status:'Aprobada'}},...withName('id','name'),{$project:{document:0}}]);if(!p)fail('Proveedor no encontrado.',404);const done=(await all('requests',{provider:pid,status:'Completado'},{},{id:1})).map(r=>r.id);return json({...p,works:await all('files',{request:{$in:done},kind:{$in:['before','after']}},{},{id:1,kind:1,request:1}),reviews:await all('reviews',{provider:pid},{},{stars:1,comment:1})})}
 if(path==='applications'){auth();if(user.role!=='admin')fail('Acceso reservado a administración.',403);return json(await agg('providers',[{$sort:{status:-1}},...withName('id','name')]))}
 if(path==='requests'){auth();const scope=url.searchParams.get('scope');if(scope==='available'){const p=await provider();return json(await agg('requests',[{$match:{trade:p.trade,status:'Activa',owner:{$ne:user.id}}},{$sort:{created:-1}},...withName('owner','owner_name')]))}if(scope==='assigned')return json(await all('requests',{provider:user.id},{created:-1}));return json(await agg('requests',[{$match:{owner:user.id}},{$sort:{created:-1}},{$lookup:{from:'files',let:{rid:'$id'},pipeline:[{$match:{$expr:{$and:[{$eq:['$request','$$rid']},{$eq:['$kind','problem']}]}}},{$limit:1},{$project:{_id:0,id:1}}],as:'_problem'}},{$set:{problem_file:{$first:'$_problem.id'}}},{$project:{_id:0,_problem:0}}]))}
 if(path.startsWith('requests/')){auth();const r=await own(path.split('/')[1]);const p=await approved(user.id);const participant=r.owner===user.id||r.provider===user.id;if(!participant&&!(p?.trade===r.trade&&r.status==='Activa'))fail('No tienes acceso a este servicio.',403);return json({...r,quotes:await agg('quotes',[{$match:{request:r.id,...(r.owner===user.id?{}:{provider:user.id})}},...withName('provider','provider_name')]),files:await all('files',{request:r.id},{},{id:1,kind:1}),review:await one('reviews',{request:r.id})})}
 if(path.startsWith('files/')){const f:any=await one('files',{id:path.split('/')[1]});if(!f)fail('Archivo no encontrado.',404);let allowed=false;if(f.kind==='photo')allowed=!!await one('providers',{photo:f.id,status:'Aprobada'});if(f.request){const r=await own(f.request);allowed=r.status==='Completado'&&['before','after'].includes(f.kind);if(user){const p=await approved(user.id);allowed=allowed||r.owner===user.id||r.provider===user.id||(f.kind==='problem'&&r.status==='Activa'&&p?.trade===r.trade)}}if(user&&(f.owner===user.id||user.role==='admin'))allowed=true;if(!allowed)fail('No tienes acceso al archivo.',403);const obj=await env.BUCKET.get(f.id);if(!obj)fail('Archivo no encontrado.',404);return new Response(obj.body,{headers:{'Content-Type':f.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}})}
 return json({error:'Ruta no encontrada.'},404);
 }
 if(req.method!=='POST')return json({error:'Método no permitido.'},405);
 if(path==='upload'){
 if(!env.BUCKET)fail('La carga de imágenes está deshabilitada temporalmente.',503);
 auth();const form=await req.formData(),file=form.get('file') as File,kind=String(form.get('kind')),rid=String(form.get('request')||'');if(!file||typeof file.arrayBuffer!=='function'||file.size>5*1024*1024||file.size===0)fail('Adjunta una imagen de hasta 5 MB.');if(!['photo','document','problem','before','after'].includes(kind))fail('Tipo de imagen inválido.');if(rid){const r=await own(rid);if(kind==='problem'){if(r.owner!==user.id||r.status!=='Activa')fail('Solo puedes añadir fotografías a tus solicitudes activas.',403)}else if(['before','after'].includes(kind)){if(r.provider!==user.id||r.status!=='Asignada')fail('Solo el proveedor asignado puede registrar evidencia durante el trabajo.',403)}else fail('Tipo de archivo no permitido.')}else if(!['photo','document'].includes(kind))fail('Selecciona un servicio.');
 const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';const mime=png?'image/png':jpg?'image/jpeg':webp?'image/webp':'';if(!mime||mime!==file.type)fail('Usa una imagen PNG, JPG o WebP válida.');const fid=id();await env.BUCKET.put(fid,bytes,{httpMetadata:{contentType:mime}});await c('files').insertOne({id:fid,owner:user.id,request:rid||null,kind,mime});return json({id:fid},201);
 }
 const b:any=await req.json().catch(()=>fail('Datos inválidos.'));
 // This shared seed endpoint relies on the verified owner-private Sites boundary.
 if(path==='demo-catalog')return await seedCatalog(env,db);
 if(path==='demo')return await demo(req,env,db,b.role);
 if(path==='register'||path==='login'){
 const email=required(b.email,'Correo',254).toLowerCase(),pw=required(b.password,'Contraseña',128);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Escribe un correo válido.');let u:any;
 if(path==='register'){if(pw.length<10)fail('La contraseña debe tener al menos 10 caracteres.');if(await one('users',{email}))fail('Este correo ya tiene una cuenta.',409);const uid=id(),salt=id();await c('users').insertOne({id:uid,name:required(b.name,'Nombre',100),email,hash:await passwordHash(pw,salt),salt,role:'cliente'});u={id:uid}}else{u=await one('users',{email});if(!u||await passwordHash(pw,u.salt)!==u.hash)fail('Correo o contraseña incorrectos.',401)}const session=id()+id();await c('sessions').insertOne({token:session,user_id:u.id,expires:Date.now()+86400000});return json({ok:true},200,{'Set-Cookie':`trade_session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`})
 }
 if(path==='logout'){if(token)await c('sessions').deleteOne({token});return json({ok:true},200,{'Set-Cookie':'trade_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
 auth();
 if(path==='apply'){if(await one('providers',{id:user.id}))fail('Ya enviaste una solicitud.',409);await c('providers').insertOne({id:user.id,trade:trade(b.trade),experience:required(b.experience,'Experiencia',500),zone:required(b.zone,'Zona',200),description:required(b.description,'Descripción',2000),photo:await fileOwned(b.photo,'photo'),document:await fileOwned(b.document,'document'),status:'Pendiente'});return json({ok:true},201)}
 if(path==='approve'){if(user.role!=='admin')fail('Solo administración puede aprobar.',403);const pid=sid(b.id);if(!(await c('providers').updateOne({id:pid,status:'Pendiente'},{$set:{status:'Aprobada'}})).modifiedCount)fail('No hay una solicitud pendiente.',409);await c('users').updateOne({id:pid,role:{$ne:'admin'}},{$set:{role:'proveedor'}});return json({ok:true})}
 if(path==='requests'){const rid=id();await c('requests').insertOne({id:rid,owner:user.id,trade:trade(b.trade),description:required(b.description,'Descripción'),date:date(b.date),status:'Activa',provider:null,quote:null,created:new Date().toISOString()});return json({id:rid},201)}
 if(path==='quote'){const p=await provider(),r=await own(sid(b.request));if(r.status!=='Activa'||r.trade!==p.trade||r.owner===user.id)fail('No puedes cotizar esta solicitud.',403);if(await one('quotes',{request:r.id,provider:user.id}))fail('Ya enviaste una cotización.',409);const qid=id();await c('quotes').insertOne({id:qid,request:r.id,provider:user.id,price:price(b.price),description:required(b.description,'Incluye'),status:'Pendiente'});if(!await one('requests',{id:r.id,status:'Activa'})){await c('quotes').deleteOne({id:qid});fail('La solicitud ya no está activa.',409)}return json({ok:true},201)}
 if(path==='accept'){const q:any=await one('quotes',{id:sid(b.id)});if(!q)fail('Cotización no encontrada.',404);const r=await own(q.request);if(r.owner!==user.id)fail('Solo el cliente puede elegir la cotización.',403);if(r.status!=='Activa'||q.status!=='Pendiente')fail('Ya se seleccionó una propuesta.',409);if(!(await c('requests').updateOne({id:r.id,status:'Activa',owner:user.id},{$set:{status:'Asignada',provider:q.provider,quote:q.id}})).modifiedCount)fail('Otra cotización fue aceptada primero.',409);await c('quotes').updateMany({request:r.id},[{$set:{status:{$cond:[{$eq:['$id',q.id]},'Aceptada','No seleccionada']}}}]);return json({ok:true})}
 if(path==='finish'||path==='confirm'){const r=await own(sid(b.request)),finish=path==='finish';if((finish?r.provider:r.owner)!==user.id)fail('No tienes permiso para cambiar este servicio.',403);const previous=finish?'Asignada':'Terminado',next=finish?'Terminado':'Completado';if(r.status!==previous)fail('El servicio no está en el estado requerido.',409);if(!(await c('requests').updateOne({id:r.id,status:previous},{$set:{status:next}})).modifiedCount)fail('El servicio ya cambió de estado.',409);return json({ok:true})}
 if(path==='review'){const r=await own(sid(b.request));if(r.owner!==user.id||r.status!=='Completado')fail('Solo puedes evaluar tus servicios completados.',403);if(b.stars===undefined&&b.comment===undefined)fail('Añade una calificación o comentario.');const rating=b.stars===undefined?null:stars(b.stars),comment=b.comment===undefined?null:required(b.comment,'Comentario',1000);await c('reviews').updateOne({request:r.id},{$set:{...(rating===null?{}:{stars:rating}),...(comment===null?{}:{comment})},$setOnInsert:{provider:r.provider,owner:user.id}},{upsert:true});return json({ok:true})}
 return json({error:'Ruta no encontrada.'},404);
 }catch(e:any){return json({error:e.code===11000?'El registro ya existe.':e.message||'No pudimos completar la operación.'},e.status||400)}
}
