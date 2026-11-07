import {mkdirSync,writeFileSync} from 'node:fs';
import {MongoClient} from 'mongodb';
import {collections} from '../db/collections.ts';
if(!process.env.MONGODB_URI)throw Error('Falta MONGODB_URI.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
try{
 const db=client.db(process.env.MONGODB_DB||'trade');
 const [settings]=await db.listCollections({name:'settings'}).toArray(),schema=settings?.options?.validator?.$jsonSchema;
 if(!schema?.properties)throw Error('No se reconoce el validador de ajustes. No se modificó.');
 const keys=['providerAutomaticReview','providerReviewGeneration','providerReviewFence'];
 for(const key of keys)if(schema.required?.includes(key)||schema.properties[key]&&JSON.stringify(schema.properties[key])!==JSON.stringify(collections.settings.fields[key]))throw Error('Ajustes incompatibles. No se modificó.');
 const existingJobs=await db.listCollections({name:'provider_review_jobs'}).toArray();
 if(existingJobs.length)console.log('La colección de trabajos ya existe; se conserva su validador.');
 mkdirSync('.sites-runtime/backups',{recursive:true});
 writeFileSync(`.sites-runtime/backups/before-automatic-review-${Date.now()}.json`,JSON.stringify({settings:settings.options,jobOptions:existingJobs[0]?.options||null},null,2));
 const missing=Object.fromEntries(keys.filter(key=>!schema.properties[key]).map(key=>[key,collections.settings.fields[key]]));
 if(Object.keys(missing).length)await db.command({
  collMod:'settings',
  validator:{...settings.options.validator,$jsonSchema:{...schema,properties:{...schema.properties,...missing}}},
 });
 const def=collections.provider_review_jobs;
 if(!existingJobs.length)await db.createCollection('provider_review_jobs',{validator:{$jsonSchema:{bsonType:'object',additionalProperties:false,required:Object.keys(def.fields).filter(key=>!def.optional?.includes(key)),properties:def.fields}}});
 for(const index of def.index||[])await db.collection('provider_review_jobs').createIndex(index);
 console.log('Preparación completada. Se conserva el interruptor actual; si nunca se activó, continúa apagado. No se modificaron cuentas, registros ni decisiones.');
}finally{await client.close()}
