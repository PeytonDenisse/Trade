import puppeteer from '@cloudflare/puppeteer';
import {withDb,type DbEnv} from '../db/mongo';
import {processProviderReview} from '../lib/provider-review-jobs';
import {readIneInBrowser} from '../lib/ine-browser-runner';
type Env=DbEnv&{BROWSER:Fetcher;TRADE_APP_ORIGIN:string};
export default {
 fetch(){return new Response('Not found',{status:404})},
 async queue(batch:MessageBatch<unknown>,env:Env){
  for(const message of batch.messages){
   try{
    const body=message.body as {job?:unknown}|null;
    if(typeof body?.job!=='string'){message.ack();continue}
    const result=await withDb(env,db=>processProviderReview(db,body.job as string,
     file=>readIneInBrowser(()=>puppeteer.launch(env.BROWSER),env.TRADE_APP_ORIGIN,file)));
    if(result.state==='retry'||result.state==='busy')message.retry({delaySeconds:result.state==='busy'?160:30});else message.ack();
   }catch{message.retry({delaySeconds:30})}
  }
 },
} satisfies ExportedHandler<Env>;
