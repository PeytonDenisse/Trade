import {required} from './rules';
import type {Ctx} from './api-context';
import {tradeNames} from './trades-db';
import {getSettings,settingsUpdate,type Settings} from './settings-db';

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
  rows:x=>x.agg('users',[{$lookup:{from:'providers',localField:'id',foreignField:'id',as:'_p'}},{$set:{_p:{$first:'$_p'}}},{$project:{_id:0,name:1,email:1,role:1,created_at:1,active:{$cond:[{$eq:['$active',false]},'No','Sí']},provider_status:'$_p.status',zone:'$_p.zone',trades:{$reduce:{input:{$ifNull:['$_p.trades',[]]},initialValue:'',in:{$concat:['$$value',{$cond:[{$eq:['$$value','']},'',', ']},'$$this']}}}}},{$sort:{name:1}}])},
 solicitudes:{label:'solicitudes',columns:[['id','Solicitud'],['trade','Oficio'],['status','Estado'],['owner_name','Cliente'],['provider_name','Proveedor'],['date','Fecha pedida'],['created','Creada']],
  rows:x=>x.agg('requests',[{$lookup:{from:'users',localField:'owner',foreignField:'id',as:'_o'}},{$lookup:{from:'users',localField:'provider',foreignField:'id',as:'_v'}},{$project:{_id:0,id:1,trade:1,status:1,date:1,created:1,owner_name:{$first:'$_o.name'},provider_name:{$first:'$_v.name'}}},{$sort:{created:-1}}])},
 resenas:{label:'reseñas',columns:[['provider_name','Proveedor'],['stars','Estrellas'],['comment','Comentario'],['hidden','Oculta']],
  rows:x=>x.agg('reviews',[{$lookup:{from:'users',localField:'provider',foreignField:'id',as:'_v'}},{$project:{_id:0,stars:1,comment:1,provider_name:{$first:'$_v.name'},hidden:{$cond:[{$eq:['$hidden',true]},'Sí','No']}}}])},
 actividad:{label:'actividad',columns:[['at','Fecha'],['actor_name','Administrador'],['action','Acción'],['target_name','Persona'],['detail','Detalle']],
  rows:x=>x.all('audit_log',{},{at:-1,_id:-1})},
};

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

export async function adminPost(x:Ctx,path:string,b:any){
 if(path.startsWith('admin/trade')){admin(x);return tradesPost(x,path,b)}
 // Equipo: give or remove admin rights; never one's own, and at least one admin always remains.
 if(path==='admin/role'){
  admin(x);if(typeof b.admin!=='boolean')x.fail('Datos inválidos.');
  const filter=b.email!==undefined?{email:required(b.email,'Correo',254).toLowerCase()}:{id:x.sid(b.id)};
  const person:any=await x.one('users',filter,{id:1,name:1,role:1,active:1});
  if(!person)x.fail('No hay una cuenta con ese correo.',404);
  if(person.id===x.user.id)x.fail('No puedes cambiar tus propios permisos.',403);
  if(b.admin){
   if(person.role==='admin')x.fail(`${person.name} ya es administrador.`,409);
   if(person.active===false)x.fail('Reactiva la cuenta antes de darle permisos.',409);
   // Admins don't offer services; a provider must leave that role first.
   if(await x.one('providers',{id:person.id,status:{$ne:'Rechazada'}}))x.fail(`${person.name} tiene un registro de proveedor; un administrador no puede ofrecer servicios.`,409);
  }else{
   if(person.role!=='admin')x.fail(`${person.name} no es administrador.`,409);
   if(await x.c('users').countDocuments({role:'admin',active:{$ne:false}})<=1)x.fail('Debe quedar al menos un administrador.',409);
  }
  await x.c('users').updateOne({id:person.id},{$set:{role:b.admin?'admin':'cliente'}});
  await audit(x,b.admin?'role.admin':'role.remove',person);
  return x.json({ok:true});
 }
 // A report ends with a written decision and the state the job continues in.
 if(path==='admin/report-resolve'){
  admin(x);const report=await x.one('reports',{id:x.sid(b.id),status:'Abierto'});if(!report)x.fail('El reporte ya está resuelto.',409);
  const outcome=String(b.outcome||'');if(!['Asignada','Terminado','Completado','Cancelada'].includes(outcome))x.fail('Elige cómo continúa el trabajo.');
  const resolution=required(b.resolution,'Decisión',1000);
  await x.c('reports').updateOne({id:report.id},{$set:{status:'Resuelto',resolution,resolved_by:x.user.id,resolved_at:new Date().toISOString()}});
  await x.c('requests').updateOne({id:report.request,status:'En disputa'},{$set:{status:outcome,...(outcome==='Cancelada'?{closed_reason:resolution}:{})}});
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
  admin(x);const r=await x.one('requests',{id:x.sid(b.id)});if(!r)x.fail('Solicitud no encontrada.',404);
  if(!['Activa','Asignada','En disputa'].includes(r.status))x.fail('Esta solicitud ya está cerrada.',409);
  const why=required(b.reason,'Motivo',300);
  await x.c('requests').updateOne({id:r.id},{$set:{status:'Cancelada',closed_reason:why}});
  await x.c('quotes').updateMany({request:r.id,status:'Pendiente'},{$set:{status:'No seleccionada'}});
  await audit(x,'request.close',await x.one('users',{id:r.owner},{id:1,name:1}),`${r.trade}: ${why}`);
  return x.json({ok:true});
 }
 if(path==='admin/settings'){
  admin(x);let update:Partial<Settings>;
  try{update=settingsUpdate(b)}catch(e:any){x.fail(e.message)}
  await x.c('settings').updateOne({key:'app'},{$set:{...update!,updated_at:new Date().toISOString(),updated_by:x.user.id},$setOnInsert:{key:'app'}},{upsert:true});
  await audit(x,'settings.update',null,Object.entries(update!).map(([k,v])=>`${k}: ${v}`).join(', '));
  return x.json(await getSettings(x.db));
 }
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
