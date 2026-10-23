// Extends only the existing requests validator; never rewrites user/request data.
import {mkdirSync,writeFileSync} from 'node:fs';
import {MongoClient} from 'mongodb';
import {locationSchema} from '../lib/service-location.ts';

if(!process.env.MONGODB_URI)throw Error('Falta MONGODB_URI en .env.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
try{
 const db=client.db(process.env.MONGODB_DB||'trade');
 const [collection]=await db.listCollections({name:'requests'}).toArray();
 const validator=collection?.options?.validator;
 const schema=validator?.$jsonSchema;
 if(!schema?.properties||schema.required?.includes('location'))throw Error('El validador de solicitudes requiere revisión manual; no se modificó.');
 if(JSON.stringify(schema.properties.location)===JSON.stringify(locationSchema)){
  console.log('El campo opcional location ya está habilitado. No se modificaron documentos.');
 }else{
  mkdirSync('.sites-runtime/backups',{recursive:true});
  writeFileSync(`.sites-runtime/backups/requests-validator-before-map-${Date.now()}.json`,JSON.stringify({database:db.databaseName,validator},null,2));
  await db.command({collMod:'requests',validator:{...validator,$jsonSchema:{...schema,properties:{...schema.properties,location:locationSchema}}}});
  console.log('Campo opcional location habilitado. Se conservaron las reglas existentes y no se modificaron usuarios ni solicitudes.');
 }
}finally{await client.close()}
