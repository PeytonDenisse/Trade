// Explicitly isolated trial. Never read .env or connect to the user's database.
import {spawnSync} from 'node:child_process';
import {readFileSync,createReadStream,statSync} from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {chromium} from '@playwright/test';
import {compileTestApi} from './compile-test-api.mjs';
await import('./prepare-ocr-assets.mjs');compileTestApi();
const built=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.ocr-test.config.mts'],{stdio:'inherit'});
if(built.error)throw built.error;if(built.status!==0)process.exit(built.status??1);
const {handle}=await import('../.test-output/lib/api.mjs');
const {ensureCollections}=await import('../.test-output/db/collections.mjs');
const {processProviderReview,reviewJobs}=await import('../.test-output/lib/provider-review-jobs.mjs');
const {readIneInBrowser}=await import('../.test-output/lib/ine-browser-runner.mjs');
const {identityKeys}=await import('../.test-output/lib/ine-analysis.mjs');
const temporary=await MongoMemoryReplSet.create({replSet:{count:1}}),client=await MongoClient.connect(temporary.getUri()),db=client.db('trade-automatic-trial');
await ensureCollections(db);
const origin='http://127.0.0.1:5194',queue=[],scenarios=new Map(),browsers=new Set();let pumping=false,closing=false;
const env={MONGO:db,MONGODB_FILES:'true',PROVIDER_REVIEW_QUEUE:{send:async message=>{queue.push(message.job);void pump()}}};
async function api(route,data,cookie=''){
 const response=await handle(new Request(origin+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(data instanceof FormData?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify(data)}),env);
 const result=await response.json();if(!response.ok)throw Error(result.error);return {data:result,cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};
}
const admin=await api('register',{name:'Administración ficticia',email:'admin@example.test',password:'Trial-local-password-42'});
const adminId=(await api('me',undefined,admin.cookie)).data.user.id;await db.collection('users').updateOne({id:adminId},{$set:{role:'admin'}});
await api('admin/settings',{providerAutomaticReview:true},admin.cookie);
async function pump(){
 if(pumping||closing)return;pumping=true;
 try{while(queue.length&&!closing){const id=queue.shift();try{
  const job=await db.collection(reviewJobs).findOne({_id:id}),record=job&&await db.collection('providers').findOne({id:job.provider}),scenario=scenarios.get(job?.provider);
  const result=await processProviderReview(db,id,async file=>{
   if(scenario==='clear'||scenario==='uncertain'){
    const reading={values:record.identity,confidence:Object.fromEntries(identityKeys.map(key=>[key,scenario==='clear'?96:83]))};return {original:reading,processed:reading,warnings:[]};
   }
   return readIneInBrowser(async()=>{const browser=await chromium.launch({headless:true,...((process.env.PLAYWRIGHT_CHANNEL||process.platform==='win32')?{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}:{})});browsers.add(browser);return {newPage:()=>browser.newPage(),close:async()=>{browsers.delete(browser);await browser.close()}}},origin,file);
  });
  if(result.state==='retry'&&!closing)queue.push(id);
 }catch{if(!closing)console.log('Una solicitud de prueba requiere revisión manual.')}}}finally{pumping=false}
}
const identity={nombres:'ANA MARIA',apellidoPaterno:'GARCIA',apellidoMaterno:'LOPEZ',fechaNacimiento:'1956-12-31',sexo:'M',curp:'GALA561231MDFRPN79',calleNumero:'CALLE FICTICIA 10',colonia:'CENTRO',codigoPostal:'06000',municipio:'CUAUHTEMOC',estado:'CIUDAD DE MEXICO',vigencia:'2020-2030'};
const root=path.resolve('.sites-runtime/ocr-browser-build'),mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 try{
  const url=new URL(req.url,origin);
  if(req.method==='POST'){
   if(req.headers.origin&&req.headers.origin!==origin)return json({error:'Origen no permitido'},403);
   let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>7500000)return json({error:'Archivo demasiado grande'},413);parts.push(part)}const body=JSON.parse(Buffer.concat(parts).toString());
   if(url.pathname==='/trial/mode'){if(typeof body.enabled!=='boolean')throw Error('Modo inválido');await api('admin/settings',{providerAutomaticReview:body.enabled},admin.cookie);return json({ok:true})}
   if(url.pathname==='/trial/submit'){
    if(!['ocr','clear','uncertain'].includes(body.scenario)||typeof body.document!=='string')throw Error('Caso inválido');
    const session=await api('register',{name:'Proveedor ficticio',email:crypto.randomUUID()+'@example.test',password:'Trial-local-password-42'});
    const id=(await api('me',undefined,session.cookie)).data.user.id;scenarios.set(id,body.scenario);
    const upload=async(kind,bytes)=>{const form=new FormData();form.set('kind',kind);form.set('file',new File([bytes],'ejemplo.png',{type:'image/png'}));return (await api('upload',form,session.cookie)).data.id};
    const photo=await upload('photo',readFileSync('public/demo-assets/antes.png')),document=await upload('document',Buffer.from(body.document,'base64'));
    // Use a different synthetic CURP for each test account to avoid the
    // duplicate rule obscuring this trial. These are not real identities.
    const counter=await db.collection('providers').countDocuments({}),letter='MLKJHGFDCB'[counter%10];
    const declared={...identity,curp:identity.curp.slice(0,15)+letter+identity.curp.slice(16)};
    // OCR-real must compare against the exact printed synthetic value.
    if(body.scenario==='ocr')declared.curp=identity.curp;
    await api('apply',{trades:['Plomería'],experience:'Prueba ficticia',zone:'Zona ficticia',description:'Servicio de prueba',photo,document,identity:declared},session.cookie);
    return json({id},201);
   }
   return json({error:'Ruta no encontrada'},404);
  }
  if(url.pathname==='/trial/state'){
   const application=await db.collection('providers').findOne({id:url.searchParams.get('id')||''},{projection:{_id:0,status:1,'analysis.reasons':1}}),user=application&&await db.collection('users').findOne({id:url.searchParams.get('id')});
   const job=application&&await db.collection(reviewJobs).findOne({provider:url.searchParams.get('id')},{sort:{created:-1}}),control=await db.collection('settings').findOne({key:'app'});
   const disabled=control?.providerAutomaticReview!==true;
   return json({enabled:!disabled,application,role:user?.role,job:disabled&&['queued','processing'].includes(job?.state)?'manual':job?.state});
  }
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(readFileSync('tests/browser/submit-trial.html'))}
  const file=path.resolve(root,'.'+(url.pathname==='/ine-review-runner'?'/tests/browser/runner.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)||!statSync(file).isFile())return json({error:'No encontrado'},404);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(file).pipe(res);
 }catch{json({error:'No se pudo completar la prueba local.'},400)}
});
async function stop(){if(closing)return;closing=true;server.close();for(const browser of browsers)await browser.close().catch(()=>{});while(pumping)await new Promise(resolve=>setTimeout(resolve,100));await client.close();await temporary.stop();process.exit(0)}
process.on('SIGINT',stop);process.on('SIGTERM',stop);server.on('error',async()=>{console.error('El puerto 5194 no está disponible.');await stop()});
server.listen(5194,'127.0.0.1',()=>console.log(`Prueba aislada: ${origin}\nCtrl+C elimina los registros temporales. No se usa Atlas ni Cloudflare.`));
