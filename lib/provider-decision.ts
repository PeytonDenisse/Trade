import type {Ctx} from './api-context';
import {cleanIneEvidence,evaluateIne,INE_ANALYSIS_VERSION,INE_ENGINE_VERSION,type IneAnalysis} from './ine-analysis';

function conflict(message:string):never{throw Object.assign(Error(message),{status:409})}
// All three writes commit together. No approval/role/audit can be left half saved.
export async function decideProvider(x:Pick<Ctx,'db'|'user'|'id'>,input:{id:string;decision:'approve'|'reject'|'analysis';reason?:string;document?:string;runId?:string;evidence?:unknown;job?:{id:string;lease:string;generation:number}}){
 const evidence=input.decision==='analysis'?cleanIneEvidence(input.evidence):undefined;
 const session=x.db.client.startSession();
 try{return await session.withTransaction(async()=>{
  const providers=x.db.collection<any>('providers'),users=x.db.collection<any>('users');
  const person=await users.findOne({id:input.id},{session});
  if(!person)throw Object.assign(Error('Usuario no encontrado.'),{status:404});
  const registration=await providers.findOne({id:input.id},{session});
  if(!registration)conflict('No hay un registro pendiente.');
  if(input.decision==='analysis'&&registration.analysis?.runId===input.runId&&registration.analysis?.document===input.document)return {analysis:registration.analysis,approved:registration.status==='Aprobada'};
  if(registration.status!=='Pendiente')conflict('El registro ya fue resuelto por otra revisión.');
  if(input.document&&registration.document!==input.document)conflict('El documento cambió. Actualiza la lista y analízalo de nuevo.');
  if(input.job){
   if(registration.analysis?.document===input.document)conflict('El registro ya tiene un análisis guardado.');
   const control=await x.db.collection('settings').updateOne({key:'app',providerAutomaticReview:true,providerReviewGeneration:input.job.generation},{$inc:{providerReviewFence:1}},{session});
   if(!control.matchedCount)conflict('La revisión automática se desactivó o cambió.');
   const job=await x.db.collection('provider_review_jobs').updateOne({_id:input.job.id as any,provider:input.id,document:input.document,state:'processing',lease:input.job.lease,lease_until:{$gt:Date.now()}},{$set:{state:'finished'}},{session});
   if(!job.matchedCount)conflict('Otra ejecución tiene este análisis o expiró la reserva.');
  }
  let analysis:IneAnalysis|undefined;
  if(evidence){
   if(!registration.identity)conflict('Este registro antiguo requiere revisión manual.');
   const duplicate=!!await providers.findOne({id:{$ne:input.id},'identity.curp':registration.identity.curp},{session,projection:{id:1}});
   const result=evaluateIne(registration.identity,evidence,duplicate);
   if(!await x.db.collection('files').findOne({id:registration.document,owner:input.id,kind:'document'},{session,projection:{id:1}})){result.outcome='review';result.reasons.push('No se encontró el documento privado asociado al solicitante.')}
   if(person.active===false||registration.active===false||person.role==='admin'){result.outcome='review';result.reasons.push('La cuenta o el perfil requieren revisión administrativa.')}
   analysis={...result,version:INE_ANALYSIS_VERSION,engine:INE_ENGINE_VERSION,document:input.document!,runId:input.runId!,at:new Date().toISOString(),by:x.user.id};
  }
  const approved=input.decision==='approve'||analysis?.outcome==='approved';
  const rejected=input.decision==='reject';
  const status=approved?'Aprobada':rejected?'Rechazada':'Pendiente';
  const set:any={...(analysis?{analysis}:{}),...(status!=='Pendiente'?{status,reason:rejected?input.reason:null,decided_by:x.user.id,decided_at:new Date().toISOString()}:{} )};
  if(!(await providers.updateOne({id:input.id,status:'Pendiente',document:registration.document},{$set:set},{session})).matchedCount)conflict('El registro cambió durante la revisión.');
  if(approved)await users.updateOne({id:input.id,role:{$ne:'admin'}},{$set:{role:'proveedor'}},{session});
  const action=approved?'provider.approve':rejected?'provider.reject':'provider.analysis-review';
  await x.db.collection('audit_log').insertOne({id:x.id(),at:new Date().toISOString(),actor:x.user.id,actor_name:x.user.name,action,target:person.id,target_name:person.name,detail:analysis?`Análisis ${INE_ANALYSIS_VERSION}: ${approved?'aprobación automática':'requiere revisión'}.`:input.reason||null},{session});
  return {approved,analysis};
 },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}})}finally{await session.endSession()}
}
