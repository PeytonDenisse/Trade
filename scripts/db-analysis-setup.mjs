// Add missing optional INE properties, preserving deployed rules and records.
import {mkdirSync,writeFileSync} from 'node:fs';
import {MongoClient} from 'mongodb';
import {collections} from '../db/collections.ts';
if(!process.env.MONGODB_URI)throw Error('Falta MONGODB_URI en .env.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
try{
 const db=client.db(process.env.MONGODB_DB||'trade');
 const [info]=await db.listCollections({name:'providers'}).toArray();const validator=info?.options?.validator,schema=validator?.$jsonSchema;
 if(!schema?.properties||['identity','analysis','analysis_eligible'].some(field=>schema.required?.includes(field)))throw Error('El validador requiere revisión manual; no se modificó.');
 const optionalFields={identity:collections.providers.fields.identity,analysis:collections.providers.fields.analysis,analysis_eligible:{bsonType:'bool'}};
 // Keep existing property validators, including any stricter custom rules.
 for(const [field,definition] of Object.entries(optionalFields))if(schema.properties[field]&&schema.properties[field].bsonType!==definition.bsonType)throw Error(`El campo ${field} tiene un esquema incompatible; no se modificó.`);
 const missing=Object.fromEntries(Object.entries(optionalFields).filter(([field])=>!Object.hasOwn(schema.properties,field)));
 if(!Object.keys(missing).length)console.log('Los campos opcionales de identidad y análisis ya están habilitados.');
 else{
  mkdirSync('.sites-runtime/backups',{recursive:true});writeFileSync(`.sites-runtime/backups/providers-before-analysis-${Date.now()}.json`,JSON.stringify({database:db.databaseName,validator},null,2));
  await db.command({collMod:'providers',validator:{...validator,$jsonSchema:{...schema,properties:{...schema.properties,...missing}}}});
  console.log(`Campos opcionales habilitados: ${Object.keys(missing).join(', ')}. No se modificaron proveedores, usuarios ni decisiones anteriores.`);
 }
 await db.collection('providers').createIndex({'identity.curp':1});
}finally{await client.close()}
