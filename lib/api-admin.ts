import {required} from './rules';
import {decideProvider} from './provider-decision';
import type {Ctx} from './api-context';
import {tradeNames} from './trades-db';
import {getSettings,settingsUpdate,type Settings} from './settings-db';
import {drainFileDeletions} from './file-deletions';

// Administration (design PDF, section 7). Every change an admin makes is written to audit_log.
const reason=(v:unknown,label='Motivo')=>v==null||v===''?null:required(v,label,300);
const withPhoto=[{$lookup:{from:'files',localField:'photo',foreignField:'id',as:'_photo'}},{$set:{photo_url:{$first:'$_photo.url'}}},{$project:{_photo:0}}];
const since=(days:number)=>new Date(Date.now()-days*86400000).toISOString();

export async function audit(x:Ctx,action:string,target?:{id:string;name?:string}|null,detail?:string|null){
 await x.c('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action,target:target?.id??null,target_name:target?.name??null,detail:detail??null});
}

function admin(x:Ctx){x.auth();if(x.user.role!=='admin')x.fail('Acceso reservado a administración.',403)}

const tradeName=(v:unknown)=>{const name=required(v,'Nombre del oficio',40).replace(/\s+/g,' ');if(name.length<3)throw Object.assign(new Error('Nombre del oficio: usa al menos 3 letras.'),{status:400});return name};
const sameName=(name:string)=>({name:{$regex:'^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$',$options:'i'}});

// CSV for spreadsheets: quoted cells, and a leading ' on cells a spreadsheet would run as a formula.
function csv(rows:any[],columns:[string,string][]){
 const cell=(v:unknown)=>{let s=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 return '﻿'+[columns.map(([,label])=>cell(label)).join(','),...rows.map(r=>columns.map(([key])=>cell(r[key])).join(','))].join('\r\n');
}
const exportsBy:Record<string,{label:string;columns:[string,string][];rows:(x:Ctx)=>Promise<any[]>}>={
 personas:{label:'personas',columns:[['name','Nombre'],['email','Correo'],['role','Rol'],['active','Cuenta activa'],['created_at','Registro'],['provider_status','Estado de proveedor'],['trades','Oficios'],['zone','Zona']],
  rows:x=>x.agg('users',[{$match:{role:{$ne:'eliminado'}}},{$lookup:{from:'providers',localField:'id',foreignField:'id',as:'_p'}},{$set:{_p:{$first:'$_p'}}},{$project:{_id:0,name:1,email:1,role:1,created_at:1,active:{$cond:[{$eq:['$active',false]},'No','Sí']},provider_status:'$_p.status',zone:'$_p.zone',trades:{$reduce:{input:{$ifNull:['$_p.trades',[]]},initialValue:'',in:{$concat:['$$value',{$cond:[{$eq:['$$value','']},'',', ']},'$$this']}}}}},{$sort:{name:1}}])},
 solicitudes:{label:'solicitudes',columns:[['id','Solicitud'],['trade','Oficio'],['status','Estado'],['owner_name','Cliente'],['provider_name','Proveedor'],['date','Fecha pedida'],['created','Creada']],
  rows:x=>x.agg('requests',[{$lookup:{from:'users',localField:'owner',foreignField:'id',as:'_o'}},{$lookup:{from:'users',localField:'provider',foreignField:'id',as:'_v'}},{$project:{_id:0,id:1,trade:1,status:1,date:1,created:1,owner_name:{$first:'$_o.name'},provider_name:{$first:'$_v.name'}}},{$sort:{created:-1}}])},
 resenas:{label:'reseñas',columns:[['provider_name','Proveedor'],['stars','Estrellas'],['comment','Comentario'],['hidden','Oculta']],
  rows:x=>x.agg('reviews',[{$lookup:{from:'users',localField:'provider',foreignField:'id',as:'_v'}},{$project:{_id:0,stars:1,comment:1,provider_name:{$first:'$_v.name'},hidden:{$cond:[{$eq:['$hidden',true]},'Sí','No']}}}])},
 actividad:{label:'actividad',columns:[['at','Fecha'],['actor_name','Administrador'],['action','Acción'],['target_name','Persona'],['detail','Detalle']],
  rows:x=>x.all('audit_log',{},{at:-1,_id:-1})},
};

export async function adminGet(x:Ctx,path:string){
 // Directory of every account; never returns hash or salt.
 if(path==='users'){admin(x);return x.json(await x.agg('users',[{$match:{role:{$ne:'eliminado'}}},{$project:{_id:0,id:1,name:1,email:1,role:1,photo:1,created_at:1,active:{$ne:['$active',false]}}},{$lookup:{from:'requests',localField:'id',foreignField:'owner',as:'_req'}},{$lookup:{from:'providers',localField:'id',foreignField:'id',as:'_prov'}},{$set:{requests:{$size:'$_req'},provider_status:{$first:'$_prov.status'},provider_active:{$ne:[{$first:'$_prov.active'},false]}}},{$project:{_req:0,_prov:0}},{$sort:{name:1}}]))}
 if(path==='applications'){admin(x);return x.json(await x.agg('providers',[{$set:{_order:{$indexOfArray:[['Pendiente','Rechazada','Aprobada'],'$status']}}},{$sort:{_order:1}},{$project:{_order:0}},{$lookup:{from:'users',localField:'id',foreignField:'id',as:'_u'}},{$set:{name:{$first:'$_u.name'}}},{$project:{_id:0,_u:0}},...withPhoto]))}
 // Tablero: what needs attention first, then how the platform is doing.
 if(path==='admin/summary'){
  admin(x);const count=(name:string,filter:any)=>x.c(name).countDocuments(filter);
  const [registrations,recoveries,reports,roles,inactive,statuses,newPeople,newRequests,activity]=await Promise.all([
   count('providers',{status:'Pendiente'}),count('password_resets',{status:'Solicitada'}),count('reports',{status:'Abierto'}),
   x.agg('users',[{$match:{role:{$ne:'eliminado'}}},{$group:{_id:'$role',n:{$sum:1}}}]),count('users',{active:false,role:{$ne:'eliminado'}}),
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
  const [person]=await x.agg('users',[{$match:{id:pid,role:{$ne:'eliminado'}}},{$project:{_id:0,hash:0,salt:0}}]);if(!person)x.fail('Persona no encontrada.',404);
  if(person.photo)person.photo_url='/api/files/'+person.photo;
  const [registration]=await x.agg('providers',[{$match:{id:pid}},...withPhoto]);
  const [requests,jobs,targeted,quoted,reviews,history,recovery]=await Promise.all([
   x.all('requests',{owner:pid},{created:-1},{id:1,trade:1,status:1,created:1,description:1,date:1}),
   x.all('requests',{provider:pid},{created:-1},{id:1,trade:1,status:1,created:1,description:1,date:1}),
   x.all('requests',{target:pid,provider:{$ne:pid},status:'Activa'},{created:-1},{id:1,trade:1,status:1,created:1,description:1,date:1}),
   x.agg('quotes',[{$match:{provider:pid,status:'Pendiente'}},{$lookup:{from:'requests',localField:'request',foreignField:'id',as:'_request'}},{$set:{_request:{$first:'$_request'}}},{$match:{'_request.status':'Activa'}},{$project:{_id:0,id:1,request:1,status:1,trade:'$_request.trade',description:'$_request.description',created:'$_request.created',date:'$_request.date'}},{$sort:{created:-1}}]),
   x.all('reviews',{provider:pid},{},{request:1,stars:1,comment:1,hidden:1}),
   x.all('audit_log',{target:pid},{at:-1,_id:-1}).then(list=>list.slice(0,25)),
   x.one('password_resets',{user_id:pid,status:{$in:['Solicitada','Enviada']}},{token_hash:0}),
  ]);
  const relatedIds=(await x.all('requests',{$or:[{owner:pid},{provider:pid},{target:pid}]},{},{id:1})).map(row=>row.id);
  const openReports=await x.c('reports').countDocuments({status:'Abierto',$or:[{by:pid},{against:pid},{request:{$in:relatedIds}}]});
  return x.json({person,registration:registration||null,requests,jobs,targeted,quoted,openReports,reviews,history,recovery});
 }
 // Moderación: problem reports, reviews and requests that have been waiting the longest.
 if(path==='admin/moderation'){
  admin(x);const names=(field:string,as:string)=>[{$lookup:{from:'users',localField:field,foreignField:'id',as:'_'+as}},{$set:{[as]:{$first:'$_'+as+'.name'}}},{$project:{['_'+as]:0}}];
  const [reports,reviews,waiting]=await Promise.all([
   x.agg('reports',[{$sort:{status:1,created:-1}},{$limit:40},...names('by','by_name'),...names('against','against_name'),{$lookup:{from:'requests',localField:'request',foreignField:'id',as:'_r'}},{$set:{trade:{$first:'$_r.trade'},request_status:{$first:'$_r.status'},description:{$first:'$_r.description'}}},{$project:{_id:0,_r:0}}]),
   x.agg('reviews',[{$lookup:{from:'requests',localField:'request',foreignField:'id',as:'_r'}},{$set:{created:{$first:'$_r.created'},trade:{$first:'$_r.trade'}}},{$sort:{created:-1}},{$limit:40},...names('provider','provider_name'),...names('owner','owner_name'),{$project:{_id:0,_r:0}}]),
   x.agg('requests',[{$match:{status:{$in:['Activa','Asignada']}}},{$sort:{created:1}},{$limit:20},...names('owner','owner_name'),{$project:{_id:0,id:1,trade:1,status:1,created:1,description:1,owner_name:1}}]),
  ]);
  return x.json({reports,reviews,waiting});
 }
 // Reportes: requests over the last six months, by trade, outcomes, prices and the best-rated providers.
 if(path==='admin/analytics'){
  admin(x);const start=new Date();start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()-5);const from=start.toISOString().slice(0,7);
  const [months,byTrade,statuses,price,rating,top]=await Promise.all([
   x.agg('requests',[{$set:{month:{$substrCP:['$created',0,7]}}},{$match:{month:{$gte:from}}},{$group:{_id:'$month',n:{$sum:1}}}]),
   x.agg('requests',[{$group:{_id:'$trade',n:{$sum:1},completed:{$sum:{$cond:[{$eq:['$status','Completado']},1,0]}}}},{$sort:{n:-1,_id:1}}]),
   x.agg('requests',[{$group:{_id:'$status',n:{$sum:1}}}]),
   x.agg('quotes',[{$match:{status:'Aceptada'}},{$group:{_id:null,avg:{$avg:'$price'},n:{$sum:1}}}]),
   x.agg('reviews',[{$match:{hidden:{$ne:true},stars:{$ne:null}}},{$group:{_id:null,avg:{$avg:'$stars'},n:{$sum:1}}}]),
   x.agg('requests',[{$match:{status:'Completado',provider:{$ne:null}}},{$group:{_id:'$provider',completed:{$sum:1}}},{$lookup:{from:'reviews',let:{p:'$_id'},pipeline:[{$match:{$expr:{$eq:['$provider','$$p']},hidden:{$ne:true}}}],as:'_r'}},{$lookup:{from:'users',localField:'_id',foreignField:'id',as:'_u'}},{$project:{_id:0,id:'$_id',completed:1,name:{$first:'$_u.name'},rating:{$avg:'$_r.stars'}}},{$sort:{completed:-1,rating:-1}},{$limit:5}]),
  ]);
  // Every one of the six months appears, with zero when nothing was created.
  const counts=Object.fromEntries(months.map(m=>[m._id,m.n]));
  const series=Array.from({length:6},(_,i)=>{const d=new Date(start);d.setUTCMonth(start.getUTCMonth()+i);const key=d.toISOString().slice(0,7);return {month:key,requests:counts[key]||0}});
  return x.json({months:series,byTrade:byTrade.map(t=>({trade:t._id,requests:t.n,completed:t.completed})),statuses:Object.fromEntries(statuses.map(s=>[s._id,s.n])),acceptedPrice:price[0]?{average:price[0].avg,count:price[0].n}:null,rating:rating[0]?{average:rating[0].avg,count:rating[0].n}:null,topProviders:top});
 }
 // Actividad: the audit log, newest first, filtered by kind of action or text.
 if(path==='admin/audit'){
  admin(x);const kind=x.url.searchParams.get('kind')||'',q=(x.url.searchParams.get('q')||'').trim().slice(0,80);
  const filter:any={};
  if(kind)filter.action={$regex:'^'+kind.replace(/[^a-z]/g,'')+'\\.'};
  if(q){const re={$regex:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};filter.$or=[{actor_name:re},{target_name:re},{detail:re}]}
  return x.json(await x.c('audit_log').find(filter,{projection:{_id:0},sort:{at:-1,_id:-1},limit:200}).toArray());
 }
 if(path==='admin/team'){admin(x);return x.json(await x.all('users',{role:'admin'},{name:1},{id:1,name:1,email:1,active:1,created_at:1}))}
 if(path==='admin/settings'){admin(x);return x.json(await getSettings(x.db))}
 // Oficios with how many providers offer each one and how many requests use it.
 if(path==='admin/trades'){
  admin(x);await tradeNames(x.db);
  return x.json(await x.agg('trades',[{$lookup:{from:'providers',localField:'name',foreignField:'trades',as:'_p'}},{$lookup:{from:'requests',localField:'name',foreignField:'trade',as:'_r'}},{$project:{_id:0,name:1,active:1,order:1,providers:{$size:'$_p'},requests:{$size:'$_r'}}},{$sort:{order:1,name:1}}]));
 }
 if(path.startsWith('admin/export/')){
  admin(x);const kind=exportsBy[path.split('/')[2]];if(!kind)x.fail('Exportación no disponible.',404);
  const body=csv(await kind.rows(x),kind.columns);
  await audit(x,'data.export',null,kind.label);
  return new Response(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="trade-${path.split('/')[2]}-${new Date().toISOString().slice(0,10)}.csv"`,'Cache-Control':'no-store'}});
 }
 return null;
}

async function tradesPost(x:Ctx,path:string,b:any){
 const c=x.c('trades');await tradeNames(x.db);
 // Create, or rename everywhere the old name is used.
 if(path==='admin/trade'){
  const name=tradeName(b.name);
  if(b.previous==null){
   if(await c.findOne(sameName(name)))x.fail('Ese oficio ya existe.',409);
   const last=await c.find({},{sort:{order:-1},limit:1}).toArray();
   await c.insertOne({name,active:true,order:(last[0]?.order??-1)+1});
   await audit(x,'trade.create',null,name);
  }else{
   const previous=x.sid(b.previous);if(!await c.findOne({name:previous}))x.fail('Oficio no encontrado.',404);
   if(previous===name)x.fail('Escribe un nombre distinto.');
   const clash=await c.findOne(sameName(name));if(clash&&clash.name!==previous)x.fail('Ya existe un oficio con ese nombre.',409);
   await c.updateOne({name:previous},{$set:{name}});
   await x.c('providers').updateMany({trades:previous},{$set:{'trades.$[t]':name}},{arrayFilters:[{t:previous}]});
   await x.c('providers').updateMany({trade:previous},{$set:{trade:name}});
   await x.c('providers').updateMany({pending_trades:previous},{$set:{'pending_trades.$[t]':name}},{arrayFilters:[{t:previous}]});
   await x.c('requests').updateMany({trade:previous},{$set:{trade:name}});
   await audit(x,'trade.rename',null,`${previous} → ${name}`);
  }
  return x.json({ok:true});
 }
 // An inactive trade leaves the catalog and new requests; providers keep it on their profile.
 if(path==='admin/trade-active'){
  if(typeof b.active!=='boolean')x.fail('Datos inválidos.');
  const name=x.sid(b.name);
  if(!b.active&&await c.countDocuments({active:true})<=1)x.fail('Debe quedar al menos un oficio activo.',409);
  if(!(await c.updateOne({name},{$set:{active:b.active}})).matchedCount)x.fail('Oficio no encontrado.',404);
  await audit(x,b.active?'trade.activate':'trade.deactivate',null,name);
  return x.json({ok:true});
 }
 // One trade per line (CSV first column); a header row and duplicates are skipped.
 if(path==='admin/trades-import'){
  const text=required(b.text,'Archivo',20000);
  const names=[...new Set(text.split(/\r?\n/).map(line=>line.split(/[,;]/)[0].replace(/^﻿|^"|"$/g,'').trim()).filter(n=>n&&!/^(oficio|nombre|name)s?$/i.test(n)))];
  if(!names.length)x.fail('El archivo no tiene oficios.');
  const added:string[]=[],existing:string[]=[];
  let order=((await c.find({},{sort:{order:-1},limit:1}).toArray())[0]?.order??-1)+1;
  for(const raw of names){const name=tradeName(raw);if(await c.findOne(sameName(name))){existing.push(name);continue}await c.insertOne({name,active:true,order:order++});added.push(name)}
  if(added.length)await audit(x,'trade.import',null,added.join(', '));
  return x.json({added,existing});
 }
 return null;
}

// Keep a non-login tombstone with the same id so closed work keeps valid
// references. All mutable private data and file bytes are removed together.
async function deleteUser(x:Ctx,b:any){
 admin(x);
 const uid=x.sid(b.id),email=x.sid(b.email).trim().toLowerCase();
 if(!uid||!email)x.fail('Indica la cuenta y confirma su correo.',400);
 if(uid===x.user.id)x.fail('No puedes eliminar tu propia cuenta.',403);
 const session=x.db.client.startSession();
 let externalKeys:string[]=[];
 try{
  await session.withTransaction(async()=>{
   const db=x.db,users=db.collection<any>('users');
   await db.collection('settings').updateOne({key:'app'},{$inc:{adminDeleteFence:1}},{upsert:true,session});
   if(!await users.findOne({id:x.user.id,role:'admin',active:{$ne:false}},{session}))x.fail('Acceso reservado a administración.',403);
   const person=await users.findOne({id:uid,role:{$ne:'eliminado'}},{session});
   if(!person)x.fail('La persona ya no existe.',404);
   if(person.email.toLowerCase()!==email)x.fail('El correo de confirmación no coincide.',400);
   if(person.role==='admin'&&person.active!==false){
    if(await users.countDocuments({role:'admin',active:{$ne:false}},{session})<=1)x.fail('No puedes eliminar el último administrador activo.',409);
   }
   const open=['Activa','Asignada','Terminado','En disputa'];
   const requests=db.collection<any>('requests');
   const related={ $or:[{owner:uid},{provider:uid},{target:uid}] };
   if(await requests.countDocuments({...related,status:{$in:open}},{session}))x.fail('La persona tiene solicitudes o trabajos sin cerrar. Resuélvelos antes de eliminarla.',409);
   const history=await requests.find(related,{session,projection:{id:1}}).toArray();
   const requestIds=history.map(item=>item.id);
   if(await db.collection('reports').countDocuments({status:'Abierto',$or:[{by:uid},{against:uid},...(requestIds.length?[{request:{$in:requestIds}}]:[])]},{session}))x.fail('La persona tiene reportes abiertos. Resuélvelos antes de eliminarla.',409);
   const quotes=await db.collection<any>('quotes').find({provider:uid,status:{$in:['Pendiente','Aceptada']}},{session,projection:{request:1}}).toArray();
   if(quotes.length&&await requests.countDocuments({id:{$in:quotes.map(q=>q.request)},status:{$in:open}},{session}))x.fail('La persona tiene cotizaciones vigentes. Resuélvelas antes de eliminarla.',409);
   const ownedFiles=await db.collection<any>('files').find({owner:uid},{session,projection:{id:1}}).toArray();
   externalKeys=x.mongoFiles?[]:ownedFiles.map(item=>item.id);
   // The conditional write makes simultaneous deletion attempts conflict.
   if(!(await users.updateOne({id:uid,role:{$ne:'eliminado'}},{$set:{name:'Cuenta eliminada',email:`cuenta-eliminada-${uid}@deleted.invalid`,hash:'!',salt:'!',role:'eliminado',active:false,photo:null,created_at:null,deactivated_reason:null}},{session})).matchedCount)x.fail('La cuenta cambió durante la eliminación.',409);
   await db.collection('sessions').deleteMany({user_id:uid},{session});
   await db.collection('password_resets').deleteMany({user_id:uid},{session});
   await db.collection('provider_review_jobs').deleteMany({provider:uid},{session});
   await db.collection('providers').deleteOne({id:uid},{session});
   if(ownedFiles.length){const ids=ownedFiles.map(item=>item.id);await db.collection('files').deleteMany({owner:uid},{session});if(x.mongoFiles)await db.collection('file_objects').deleteMany({_id:{$in:ids}},{session});else await db.collection('file_deletions').insertMany(ids.map(id=>({id,queued_at:new Date().toISOString(),attempts:0,next_at:Date.now()})),{session})}
   await requests.updateMany({owner:uid},{$set:{description:'Solicitud de cuenta eliminada'},$unset:{location:''}},{session});
   await requests.updateMany({owner:uid,closed_by:{$ne:'admin'}},{$unset:{closed_reason:''}},{session});
   await db.collection('quotes').updateMany({provider:uid},{$set:{description:'Cotización de cuenta eliminada'}},{session});
   await db.collection('reviews').updateMany({$or:[{owner:uid},{provider:uid}]},{$set:{comment:null,hidden:true,hidden_reason:'Cuenta eliminada'}},{session});
   await db.collection('reports').updateMany({$or:[{by:uid},{against:uid},...(requestIds.length?[{request:{$in:requestIds}}]:[])]},{$set:{reason:'Cuenta eliminada',resolution:null}},{session});
   await db.collection('password_resets').updateMany({issued_by:uid},{$set:{issued_by:null}},{session});
   await db.collection('providers').updateMany({decided_by:uid},{$set:{decided_by:null}},{session});
   await db.collection('reports').updateMany({resolved_by:uid},{$set:{resolved_by:null}},{session});
   await db.collection('settings').updateMany({updated_by:uid},{$set:{updated_by:null}},{session});
   await db.collection('audit_log').updateMany({actor:uid},{$set:{actor_name:'Cuenta eliminada',detail:null}},{session});
   await db.collection('audit_log').updateMany({target:uid},{$set:{target_name:null,detail:null}},{session});
   await db.collection('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action:'user.delete',target:uid,target_name:null,detail:'Cuenta anonimizada y acceso revocado.'},{session});
   return true;
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
  let storageCleanupPending=externalKeys.length>0;
  if(externalKeys.length&&x.bucket?.delete){
   try{storageCleanupPending=(await drainFileDeletions(x.db,x.bucket,externalKeys)).pending>0}catch{storageCleanupPending=true}
  }
  return x.json({ok:true,storageCleanupPending});
 }catch(error){if(error instanceof Error&&'hasErrorLabel' in error&&typeof error.hasErrorLabel==='function'&&(error.hasErrorLabel as (label:string)=>boolean)('TransientTransactionError'))x.fail('La cuenta cambió durante la eliminación. Inténtalo de nuevo.',409);throw error}
 finally{await session.endSession()}
}

export async function adminPost(x:Ctx,path:string,b:any){
 if(path==='admin/user-delete')return deleteUser(x,b);
 if(path==='admin/provider-analysis'){
  admin(x);
  const id=x.sid(b.id),document=x.sid(b.document),runId=x.sid(b.runId);
  if(!id||id.length>100||!document||document.length>150||!/^[-a-zA-Z0-9]{16,100}$/.test(runId))x.fail('Identificadores de análisis inválidos.');
  return x.json(await decideProvider(x,{id,document,runId,decision:'analysis',evidence:b.evidence}));
 }
 if(path.startsWith('admin/trade')){admin(x);return tradesPost(x,path,b)}
 // Equipo: give or remove admin rights; never one's own, and at least one admin always remains.
 if(path==='admin/role'){
  admin(x);if(typeof b.admin!=='boolean')x.fail('Datos inválidos.');
  const filter=b.email!==undefined?{email:required(b.email,'Correo',254).toLowerCase()}:{id:x.sid(b.id)};
  const session=x.db.client.startSession();
  try{
   return await session.withTransaction(async()=>{
    const users=x.db.collection<any>('users');
    await x.db.collection('settings').updateOne({key:'app'},{$inc:{adminDeleteFence:1}},{upsert:true,session});
    if(!await users.findOne({id:x.user.id,role:'admin',active:{$ne:false}},{session}))x.fail('Acceso reservado a administración.',403);
    const person=await users.findOne({...filter,role:{$ne:'eliminado'}},{session});
    if(!person)x.fail('No hay una cuenta con ese correo.',404);
    if(person.id===x.user.id)x.fail('No puedes cambiar tus propios permisos.',403);
    if(b.admin){
     if(person.role==='admin')x.fail(`${person.name} ya es administrador.`,409);
     if(person.active===false)x.fail('Reactiva la cuenta antes de darle permisos.',409);
     if(await x.db.collection('providers').findOne({id:person.id,status:{$ne:'Rechazada'}},{session}))x.fail(`${person.name} tiene un registro de proveedor; un administrador no puede ofrecer servicios.`,409);
    }else{
     if(person.role!=='admin')x.fail(`${person.name} no es administrador.`,409);
     if(await users.countDocuments({role:'admin',active:{$ne:false}},{session})<=1)x.fail('Debe quedar al menos un administrador.',409);
    }
    if(!(await users.updateOne({id:person.id,role:person.role,active:{$ne:false}},{$set:{role:b.admin?'admin':'cliente'}},{session})).matchedCount)x.fail('La cuenta cambió durante la operación.',409);
    await x.db.collection('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action:b.admin?'role.admin':'role.remove',target:person.id,target_name:person.name,detail:null},{session});
    return x.json({ok:true});
   },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
  }finally{await session.endSession()}
 }
 // A report ends with a written decision and the state the job continues in.
 if(path==='admin/report-resolve'){
  admin(x);const report=await x.one('reports',{id:x.sid(b.id),status:'Abierto'});if(!report)x.fail('El reporte ya está resuelto.',409);
  const outcome=String(b.outcome||'');if(!['Asignada','Terminado','Completado','Cancelada'].includes(outcome))x.fail('Elige cómo continúa el trabajo.');
  const resolution=required(b.resolution,'Decisión',1000);
  await x.c('reports').updateOne({id:report.id},{$set:{status:'Resuelto',resolution,resolved_by:x.user.id,resolved_at:new Date().toISOString()}});
  await x.c('requests').updateOne({id:report.request,status:'En disputa'},{$set:{status:outcome,...(outcome==='Cancelada'?{closed_reason:resolution,closed_by:'admin'}:{})}});
  await audit(x,'report.resolve',await x.one('users',{id:report.against},{id:1,name:1}),`${outcome}: ${resolution}`);
  return x.json({ok:true});
 }
 // Hidden reviews stay stored but leave the public profile and the rating.
 if(path==='admin/review-hidden'){
  admin(x);if(typeof b.hidden!=='boolean')x.fail('Datos inválidos.');
  const review=await x.one('reviews',{request:x.sid(b.request)});if(!review)x.fail('Reseña no encontrada.',404);
  const why=b.hidden?required(b.reason,'Motivo',300):null;
  await x.c('reviews').updateOne({request:review.request},{$set:{hidden:b.hidden,hidden_reason:why}});
  await audit(x,b.hidden?'review.hide':'review.show',await x.one('users',{id:review.provider},{id:1,name:1}),why);
  return x.json({ok:true});
 }
 if(path==='admin/request-close'){
  admin(x);const id=x.sid(b.id),why=required(b.reason,'Motivo',300);
  const session=x.db.client.startSession();
  try{return await session.withTransaction(async()=>{
   const requests=x.db.collection<any>('requests'),r=await requests.findOne({id},{session});
   if(!r)x.fail('Solicitud no encontrada.',404);
   if(!['Activa','Asignada','Terminado','En disputa'].includes(r.status))x.fail('Esta solicitud ya está cerrada.',409);
   if(!(await requests.updateOne({id:r.id,status:r.status},{$set:{status:'Cancelada',closed_reason:why,closed_by:'admin'}},{session})).matchedCount)x.fail('La solicitud cambió durante la cancelación.',409);
   await x.db.collection('quotes').updateMany({request:r.id,status:{$in:['Pendiente','Aceptada']}},[{$set:{status:{$cond:[{$eq:['$status','Aceptada']},'Cancelada','No seleccionada']}}}],{session});
   await x.db.collection('reports').updateMany({request:r.id,status:'Abierto'},{$set:{status:'Resuelto',resolution:`Cancelado por administración: ${why}`,resolved_by:x.user.id,resolved_at:new Date().toISOString()}},{session});
   const owner=await x.db.collection<any>('users').findOne({id:r.owner},{session,projection:{name:1}});
   await x.db.collection('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action:'request.close',target:r.owner,target_name:owner?.name??null,detail:`${r.trade}: ${why}`},{session});
   return x.json({ok:true});
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}})}finally{await session.endSession()}
 }
 if(path==='admin/quote-withdraw'){
  admin(x);const id=x.sid(b.id),why=required(b.reason,'Motivo',300);
  const session=x.db.client.startSession();
  try{return await session.withTransaction(async()=>{
   const quotes=x.db.collection<any>('quotes'),quote=await quotes.findOne({id},{session});
   if(!quote)x.fail('Cotización no encontrada.',404);
   if(quote.status!=='Pendiente')x.fail('Solo se puede retirar una cotización pendiente.',409);
   const request=await x.db.collection<any>('requests').findOne({id:quote.request},{session});
   if(!request||request.status!=='Activa')x.fail('La solicitud ya no está activa.',409);
   if(!(await quotes.updateOne({id,status:'Pendiente'},{$set:{status:'Retirada',closed_reason:why}},{session})).matchedCount)x.fail('La cotización cambió durante la cancelación.',409);
   const provider=await x.db.collection<any>('users').findOne({id:quote.provider},{session,projection:{name:1}});
   await x.db.collection('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action:'quote.withdraw',target:quote.provider,target_name:provider?.name??null,detail:`${request.trade}: ${why}`},{session});
   return x.json({ok:true});
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}})}finally{await session.endSession()}
 }
 if(path==='admin/settings'){
  admin(x);let update:Partial<Settings>;
  try{update=settingsUpdate(b)}catch(e:any){x.fail(e.message)}
  if(update!.providerAutomaticReview===true&&!x.automaticReviewAvailable)x.fail('La prueba automática todavía no está conectada. Conserva la revisión actual hasta configurar Browser Run y la cola.',503);
  if(update!.providerAutomaticReview===true){
   const info=(await Promise.all(['settings','provider_review_jobs'].map(name=>x.db.listCollections({name}).toArray()))).flat();
   const settingsInfo=info.find(item=>item.name==='settings');
   const properties=settingsInfo&&'options' in settingsInfo?settingsInfo.options?.validator?.$jsonSchema?.properties:undefined;
   if(!info.some(item=>item.name==='provider_review_jobs')||!properties?.providerAutomaticReview||!properties?.providerReviewGeneration||!properties?.providerReviewFence)x.fail('Falta preparar la base para la prueba automática. Consulta la guía de activación antes de encenderla.',503);
  }
  await x.c('settings').updateOne({key:'app'},{$set:{...update!,updated_at:new Date().toISOString(),updated_by:x.user.id},$setOnInsert:{key:'app'},...(update!.providerAutomaticReview!==undefined?{$inc:{providerReviewGeneration:1}}:{})},{upsert:true});
  await audit(x,'settings.update',null,Object.entries(update!).map(([k,v])=>`${k}: ${v}`).join(', '));
  return x.json(await getSettings(x.db));
 }
 if(!['approve','reject','account-active','provider-active'].includes(path))return null;
 admin(x);
 const person:any=await x.one('users',{id:x.sid(b.id),role:{$ne:'eliminado'}},{id:1,name:1,role:1});
 if(!person)x.fail('Usuario no encontrado.',404);
 if(path==='approve'){
  await decideProvider(x,{id:person.id,decision:'approve'});
 }
 // A rejection always says why; the person sees it on their registration.
 if(path==='reject'){
  const why=required(b.reason,'Motivo del rechazo',300);
  await decideProvider(x,{id:person.id,decision:'reject',reason:why});
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
