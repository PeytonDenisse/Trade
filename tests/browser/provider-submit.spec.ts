import {test,expect} from '@playwright/test';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {handle} from '../../lib/api';
import {ensureCollections} from '../../db/collections';
import {processProviderReview} from '../../lib/provider-review-jobs';
import {readIneInBrowser} from '../../lib/ine-browser-runner';

test('El envío dispara una lectura independiente sin navegador del solicitante ni sesión administrativa',async({page,browser})=>{
 const memory=await MongoMemoryReplSet.create({replSet:{count:1}}),client=await MongoClient.connect(memory.getUri());
 try{
  const db=client.db('submit-browser-test');await ensureCollections(db);
  await db.collection('settings').insertOne({key:'app',providerAutomaticReview:true,providerReviewGeneration:1});
  const messages:{job:string}[]=[],env={MONGO:db,MONGODB_FILES:'true',PROVIDER_REVIEW_QUEUE:{send:async(message:{job:string})=>{messages.push(message)}}};
  let cookie='';
  async function api(path:string,data:any){
   const response=await handle(new Request('http://127.0.0.1:5193/api/'+path,{method:'POST',headers:{cookie,...(data instanceof FormData?{}:{'Content-Type':'application/json'})},body:data instanceof FormData?data:JSON.stringify(data)}),env);
   cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;expect(response.ok).toBeTruthy();return await response.json() as any;
  }
  const identity={nombres:'ANA MARIA',apellidoPaterno:'GARCIA',apellidoMaterno:'LOPEZ',fechaNacimiento:'1956-12-31',sexo:'M',curp:'GALA561231MDFRPN79',calleNumero:'CALLE FICTICIA 10',colonia:'CENTRO',codigoPostal:'06000',municipio:'CUAUHTEMOC',estado:'CIUDAD DE MEXICO',vigencia:'2020-2030'};
  await page.goto('/tests/browser/harness.html');await page.waitForFunction(()=>Boolean((window as any).harness));
  const image=await page.evaluate(async()=>Array.from(new Uint8Array(await (await (window as any).harness.card()).arrayBuffer())));
  await api('register',{name:'Cliente ficticio',email:'fixture@example.test',password:'Test-password-unique-42'});
  async function upload(kind:string){const data=new FormData();data.set('kind',kind);data.set('file',new File([new Uint8Array(image)],'sintetico.png',{type:'image/png'}));return (await api('upload',data)).id}
  const photo=await upload('photo'),document=await upload('document');
  await api('apply',{trades:['Plomería'],experience:'Prueba',zone:'Zona ficticia',description:'Prueba',photo,document,identity,analysis:{outcome:'approved'}});
  expect(messages).toHaveLength(1);
  await page.goto('about:blank');
  const result=await processProviderReview(db,messages[0].job,file=>readIneInBrowser(async()=>{const context=await browser.newContext();return {newPage:()=>context.newPage(),close:()=>context.close()}},'http://127.0.0.1:5193',file));
  expect(result.state).toBe('finished');
  const record=await db.collection('providers').findOne({document});
  expect(record?.analysis.by).toBe('system:provider-review');
  expect(record?.status).toBe(result.approved?'Aprobada':'Pendiente');
  expect(await db.collection('users').countDocuments({role:'admin'})).toBe(0);
  expect((await db.collection('provider_review_jobs').findOne({_id:messages[0].job as any}))?.state).toBe('finished');
 }finally{await client.close();await memory.stop()}
});
