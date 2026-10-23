import {required} from './rules';
import type {Ctx} from './api-context';

// Administration (design PDF, section 7). Every change an admin makes is written to audit_log.
const reason=(v:unknown,label='Motivo')=>v==null||v===''?null:required(v,label,300);
const withPhoto=[{$lookup:{from:'files',localField:'photo',foreignField:'id',as:'_photo'}},{$set:{photo_url:{$first:'$_photo.url'}}},{$project:{_photo:0}}];
const since=(days:number)=>new Date(Date.now()-days*86400000).toISOString();

export async function audit(x:Ctx,action:string,target?:{id:string;name?:string}|null,detail?:string|null){
 await x.c('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action,target:target?.id??null,target_name:target?.name??null,detail:detail??null});
}

function admin(x:Ctx){x.auth();if(x.user.role!=='admin')x.fail('Acceso reservado a administración.',403)}

export async function adminGet(x:Ctx,path:string){
 // Directory of every account; never returns hash or salt.
 if(path==='users'){admin(x);return x.json(await x.agg('users',[{$project:{_id:0,id:1,name:1,email:1,role:1,photo:1,created_at:1,active:{$ne:['$active',false]}}},{$lookup:{from:'requests',localField:'id',foreignField:'owner',as:'_req'}},{$lookup:{from:'providers',localField:'id',foreignField:'id',as:'_prov'}},{$set:{requests:{$size:'$_req'},provider_status:{$first:'$_prov.status'},provider_active:{$ne:[{$first:'$_prov.active'},false]}}},{$project:{_req:0,_prov:0}},{$sort:{name:1}}]))}
 if(path==='applications'){admin(x);return x.json(await x.agg('providers',[{$set:{_order:{$indexOfArray:[['Pendiente','Rechazada','Aprobada'],'$status']}}},{$sort:{_order:1}},{$project:{_order:0}},{$lookup:{from:'users',localField:'id',foreignField:'id',as:'_u'}},{$set:{name:{$first:'$_u.name'}}},{$project:{_id:0,_u:0}},...withPhoto]))}
 // Tablero: what needs attention first, then how the platform is doing.
 if(path==='admin/summary'){
  admin(x);const count=(name:string,filter:any)=>x.c(name).countDocuments(filter);
  const [registrations,recoveries,reports,roles,inactive,statuses,newPeople,newRequests,activity]=await Promise.all([
   count('providers',{status:'Pendiente'}),count('password_resets',{status:'Solicitada'}),count('reports',{status:'Abierto'}),
   x.agg('users',[{$group:{_id:'$role',n:{$sum:1}}}]),count('users',{active:false}),
   x.agg('requests',[{$group:{_id:'$status',n:{$sum:1}}}]),
   count('users',{created_at:{$gte:since(7)}}),count('requests',{created:{$gte:since(7)}}),
   x.all('audit_log',{},{at:-1,_id:-1}).then(list=>list.slice(0,6)),
  ]);
  const pick=(rows:any[])=>Object.fromEntries(rows.map(r=>[r._id,r.n]));
  return x.json({attention:{registrations,recoveries,reports},roles:pick(roles),inactive,requests:pick(statuses),week:{people:newPeople,requests:newRequests},activity});
 }
 // Ficha de persona: everything about one account in one place.
 if(path.startsWith('admin/people/')){
  admin(x);const pid=path.split('/')[2];
  const [person]=await x.agg('users',[{$match:{id:pid}},{$project:{_id:0,hash:0,salt:0}}]);if(!person)x.fail('Persona no encontrada.',404);
  if(person.photo)person.photo_url='/api/files/'+person.photo;
  const [registration]=await x.agg('providers',[{$match:{id:pid}},...withPhoto]);
  const [requests,jobs,reviews,history,recovery]=await Promise.all([
   x.all('requests',{owner:pid},{created:-1},{id:1,trade:1,status:1,created:1,description:1,date:1}),
   x.all('requests',{provider:pid},{created:-1},{id:1,trade:1,status:1,created:1,description:1,date:1}),
   x.all('reviews',{provider:pid},{},{request:1,stars:1,comment:1,hidden:1}),
   x.all('audit_log',{target:pid},{at:-1,_id:-1}).then(list=>list.slice(0,25)),
   x.one('password_resets',{user_id:pid,status:{$in:['Solicitada','Enviada']}},{token_hash:0}),
  ]);
  return x.json({person,registration:registration||null,requests,jobs,reviews,history,recovery});
 }
 return null;
}

export async function adminPost(x:Ctx,path:string,b:any){
 if(!['approve','reject','account-active','provider-active'].includes(path))return null;
 admin(x);
 const person:any=await x.one('users',{id:x.sid(b.id)},{id:1,name:1,role:1});
 if(!person)x.fail('Usuario no encontrado.',404);
 const decided={decided_by:x.user.id,decided_at:new Date().toISOString()};
 if(path==='approve'){
  if(!(await x.c('providers').updateOne({id:person.id,status:'Pendiente'},{$set:{status:'Aprobada',reason:null,...decided}})).modifiedCount)x.fail('No hay un registro pendiente.',409);
  await x.c('users').updateOne({id:person.id,role:{$ne:'admin'}},{$set:{role:'proveedor'}});
  await audit(x,'provider.approve',person);
 }
 // A rejection always says why; the person sees it on their registration.
 if(path==='reject'){
  const why=required(b.reason,'Motivo del rechazo',300);
  if(!(await x.c('providers').updateOne({id:person.id,status:'Pendiente'},{$set:{status:'Rechazada',reason:why,...decided}})).modifiedCount)x.fail('No hay un registro pendiente.',409);
  await audit(x,'provider.reject',person,why);
 }
 // Accounts and provider profiles switch on or off; never an admin's.
 if(path==='account-active'||path==='provider-active'){
  if(typeof b.active!=='boolean')x.fail('Datos inválidos.');
  if(person.role==='admin')x.fail('No se puede desactivar una cuenta de administración.',403);
  const on=b.active===true,why=on?null:reason(b.reason);
  if(path==='account-active'){
   await x.c('users').updateOne({id:person.id},{$set:{active:on,deactivated_reason:why}});
   if(!on)await x.c('sessions').deleteMany({user_id:person.id});
  }else if(!(await x.c('providers').updateOne({id:person.id,status:'Aprobada'},{$set:{active:on,deactivated_reason:why}})).matchedCount)x.fail('Solo se pueden activar o desactivar proveedores aprobados.',409);
  await audit(x,(path==='account-active'?'account.':'provider.')+(on?'activate':'deactivate'),person,why);
 }
 return x.json({ok:true});
}
