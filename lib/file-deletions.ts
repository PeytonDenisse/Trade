import type {Db} from 'mongodb';

export type FileDeleteBucket={delete:(key:string)=>Promise<unknown>};
type Job={id:string;queued_at:string;attempts:number;next_at:number};

// R2 is private. Removing the file metadata in the account transaction revokes
// application access immediately; this outbox removes the underlying bytes.
// Deletion is idempotent, so a worker may safely retry after a crash.
export async function drainFileDeletions(db:Db,bucket:FileDeleteBucket,ids?:string[]):Promise<{deleted:number;pending:number}>{
 const jobs=db.collection<Job>('file_deletions');
 if(ids&&ids.length===0)return {deleted:0,pending:0};
 const scope=ids?{id:{$in:ids}}:{};
 const due=ids?scope:{next_at:{$lte:Date.now()}};
 const batch=await jobs.find(due).sort({next_at:1}).limit(50).toArray();
 let deleted=0;
 for(const job of batch){
  try{
   await bucket.delete(job.id);
   await jobs.deleteOne({id:job.id});
   deleted++;
  }catch{
   // A failed remote deletion remains in the outbox for the next cron run.
   const attempts=job.attempts+1;
   const delay=Math.min(60*60_000,30_000*2**Math.min(attempts-1,7));
   await jobs.updateOne({id:job.id},{$inc:{attempts:1},$set:{next_at:Date.now()+delay}});
  }
 }
 return {deleted,pending:await jobs.countDocuments(scope)};
}
