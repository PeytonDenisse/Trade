import type {Db} from 'mongodb';
import {decideProvider} from './provider-decision';
import {sha256} from './api-context';
import type {IneEvidence} from './ine-analysis';

export type ReviewQueue={send:(message:{job:string})=>Promise<unknown>};
export type ReviewJob={_id:string;provider:string;document:string;generation:number;state:string;created:string;attempts:number;lease?:string;lease_until?:number;outcome?:string};
export const reviewJobs='provider_review_jobs';
export async function enqueueProviderReview(db:Db,queue:ReviewQueue|undefined,provider:string,document:string){
 const control=await db.collection<any>('settings').findOne({key:'app'});
 if(!queue||control?.providerAutomaticReview!==true)return false;
 const generation=control.providerReviewGeneration||0,_id=await sha256(JSON.stringify([provider,document,generation]));
 const jobs=db.collection<ReviewJob>(reviewJobs);
 await jobs.updateOne({_id},{$setOnInsert:{provider,document,generation,state:'queued',created:new Date().toISOString(),attempts:0}},{upsert:true});
 try{await queue.send({job:_id});return true}
 catch{await jobs.updateOne({_id,state:'queued'},{$set:{state:'manual'}});return false}
}
export async function ownReviewState(db:Db,provider:string,document:string){
 const job=await db.collection<ReviewJob>(reviewJobs).findOne({provider,document},{sort:{created:-1}});
 if(job&&['queued','processing'].includes(job.state)&&!(await db.collection<any>('settings').findOne({key:'app',providerAutomaticReview:true,providerReviewGeneration:job.generation})))return {state:'manual'};
 return job?{state:job.state}:undefined;
}
const failedEvidence=():IneEvidence=>({original:{values:{},confidence:{}},processed:{values:{},confidence:{}},warnings:[],failure:'processing-error'});
export async function processProviderReview(db:Db,jobId:string,read:(file:{bytes:Uint8Array;mime:string})=>Promise<IneEvidence>){
 if(!/^[a-f0-9]{64}$/.test(jobId))return {state:'ignored'};
 const jobs=db.collection<ReviewJob>(reviewJobs),control=await db.collection<any>('settings').findOne({key:'app'});
 if(control?.providerAutomaticReview!==true)return {state:'disabled'};
 const lease=crypto.randomUUID(),job=await jobs.findOneAndUpdate({_id:jobId,generation:control.providerReviewGeneration||0,
  $or:[{state:'queued'},{state:'processing',lease_until:{$lt:Date.now()}}]},{$set:{state:'processing',lease,lease_until:Date.now()+150000},$inc:{attempts:1}},{returnDocument:'after'});
 if(!job){const existing=await jobs.findOne({_id:jobId});return {state:existing?.state==='processing'?'busy':'ignored'}}
 const cancel=async()=>{await jobs.updateOne({_id:jobId,lease},{$set:{state:'cancelled'}});return {state:'cancelled'}};
 const provider=await db.collection<any>('providers').findOne({id:job.provider,status:'Pendiente',document:job.document,analysis_eligible:true,'analysis.document':{$ne:job.document}});
 if(!provider||!provider.identity)return cancel();
 let evidence:IneEvidence;
 try{
  const file=await db.collection<any>('files').findOne({id:job.document,owner:job.provider,kind:'document'});
  const object=file&&await db.collection<any>('file_objects').findOne({_id:job.document});
  const bytes=object?.data?.value();
  if(!file||!bytes||bytes.byteLength>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.mime))throw Error('Document unavailable');
  evidence=await read({bytes:new Uint8Array(bytes),mime:file.mime});
 }catch{
  if(job.attempts<3){await jobs.updateOne({_id:jobId,lease},{$set:{state:'queued'}});return {state:'retry'}}
  evidence=failedEvidence();
 }
 try{
  const result=await decideProvider({db,user:{id:'system:provider-review',name:'Revisión automática'},id:()=>crypto.randomUUID()},
   {id:job.provider,decision:'analysis',document:job.document,runId:jobId,evidence,job:{id:jobId,lease,generation:job.generation}});
  return {state:'finished',approved:result?.approved===true};
 }catch(error:any){
  if(error.status===409)return cancel();
  const state=job.attempts>=3?'manual':'queued';
  await jobs.updateOne({_id:jobId,lease},{$set:{state}});
  return {state:state==='queued'?'retry':'manual'};
 }
}
