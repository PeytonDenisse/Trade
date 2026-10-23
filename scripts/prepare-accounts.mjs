import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {MongoClient,Binary,BSON} from 'mongodb';
import ts from 'typescript';
mkdirSync('.sites-runtime/account-modules',{recursive:true});
for(const name of ['presentation-accounts','rules'])writeFileSync(`.sites-runtime/account-modules/${name}.mjs`,ts.transpileModule(readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
const {presentationAccounts}=await import('../.sites-runtime/account-modules/presentation-accounts.mjs');
const {passwordHash}=await import('../.sites-runtime/account-modules/rules.mjs');
if(!process.env.MONGODB_URI)throw Error('Falta MONGODB_URI en .env.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
try{
 const db=client.db(process.env.MONGODB_DB||'trade'),backup={};
 for(const name of ['users','providers','files','file_objects'])backup[name]=await db.collection(name).find({}).toArray();
 mkdirSync('.sites-runtime/backups',{recursive:true});writeFileSync(`.sites-runtime/backups/before-accounts-${Date.now()}.json`,BSON.EJSON.stringify(backup));
 for(const [role,a] of Object.entries(presentationAccounts)){
  const salt=crypto.randomUUID();
  await db.collection('users').updateOne({id:a.id},{$set:{name:a.name,email:a.email,role,salt,hash:await passwordHash(a.password,salt)},$setOnInsert:{id:a.id,active:true}},{upsert:true});
 }
 const id=presentationAccounts.proveedor.id;
 for(const [kind,asset] of [['photo','design-assets/plomeria.png'],['document','demo-assets/identificacion.png']]){
  const fid=`${id}-${kind}`;
  await db.collection('file_objects').updateOne({_id:fid},{$set:{data:new Binary(readFileSync(`public/${asset}`))}},{upsert:true});
  await db.collection('files').updateOne({id:fid},{$set:{id:fid,owner:id,request:null,kind,mime:'image/png'}},{upsert:true});
 }
 await db.collection('providers').updateOne({id},{$setOnInsert:{id,active:true,trade:'Plomería',experience:'8 años en reparación de fugas e instalaciones de lavabos.',zone:'León Centro, Guanajuato',description:'Diagnóstico y reparación de fugas residenciales. Cuenta ficticia para presentar un servicio de principio a fin.',photo:`${id}-photo`,document:`${id}-document`,status:'Pendiente'}},{upsert:true});
 console.log(JSON.stringify({accounts:Object.entries(presentationAccounts).map(([role,a])=>({role,email:a.email})),providerStatus:(await db.collection('providers').findOne({id})).status,note:'No se crearon solicitudes ni cotizaciones: Ana publicará el único caso durante la presentación.'}));
}finally{await client.close();}
