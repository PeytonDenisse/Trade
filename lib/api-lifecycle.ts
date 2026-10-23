import {required} from './rules';
import {getSettings} from './settings-db';
import type {Ctx} from './api-context';

// Request states beyond the happy path (design PDF, section 6):
// Cancelada (the client or an admin closed it), Vencida (no quote accepted in time),
// En disputa (someone reported a problem; administration resolves it).

// Active requests older than the configured days expire when anyone next looks.
export async function expireRequests(x:Ctx){
 const {requestExpiryDays}=await getSettings(x.db);
 const limit=new Date(Date.now()-requestExpiryDays*86400000).toISOString();
 const old=await x.all('requests',{status:'Activa',created:{$lt:limit}},{},{id:1});
 if(!old.length)return;
 const ids=old.map(r=>r.id);
 await x.c('requests').updateMany({id:{$in:ids},status:'Activa'},{$set:{status:'Vencida'}});
 await x.c('quotes').updateMany({request:{$in:ids},status:'Pendiente'},{$set:{status:'No seleccionada'}});
}

export async function lifecyclePost(x:Ctx,path:string,b:any){
 if(path==='cancel'){
  x.auth();const r=await x.one('requests',{id:x.sid(b.request)});
  if(!r)x.fail('Solicitud no encontrada.',404);
  if(r.owner!==x.user.id)x.fail('Solo quien publicó la solicitud puede cancelarla.',403);
  if(r.status!=='Activa')x.fail('Solo se cancelan solicitudes que aún no tienen propuesta aceptada.',409);
  const why=b.reason?required(b.reason,'Motivo',300):null;
  if(!(await x.c('requests').updateOne({id:r.id,status:'Activa'},{$set:{status:'Cancelada',closed_reason:why}})).modifiedCount)x.fail('La solicitud ya cambió de estado.',409);
  await x.c('quotes').updateMany({request:r.id,status:'Pendiente'},{$set:{status:'No seleccionada'}});
  return x.json({ok:true});
 }
 // Reporting a problem works like a return: the job stops until administration decides.
 if(path==='report'){
  x.auth();const r=await x.one('requests',{id:x.sid(b.request)});
  if(!r)x.fail('Solicitud no encontrada.',404);
  const byClient=r.owner===x.user.id,byProvider=r.provider===x.user.id;
  if(!byClient&&!byProvider)x.fail('Solo el cliente o el proveedor asignado pueden reportar un problema.',403);
  if(!['Asignada','Terminado','Completado','En disputa'].includes(r.status))x.fail('Solo se reportan problemas de trabajos asignados o terminados.',409);
  if(await x.one('reports',{request:r.id,status:'Abierto'}))x.fail('Ya hay un reporte abierto sobre este trabajo; administración lo está revisando.',409);
  const report={id:x.id(),request:r.id,by:x.user.id,against:byClient?r.provider:r.owner,reason:required(b.reason,'Qué pasó',1000),status:'Abierto',created:new Date().toISOString(),previous_status:r.status,resolution:null,resolved_by:null,resolved_at:null};
  await x.c('reports').insertOne(report);
  // A finished job cannot be confirmed while the report is open; a completed one keeps its state.
  if(r.status!=='Completado')await x.c('requests').updateOne({id:r.id},{$set:{status:'En disputa'}});
  return x.json({id:report.id},201);
 }
 return null;
}
