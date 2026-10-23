import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { MongoClient, BSON } from 'mongodb';
import ts from 'typescript';

mkdirSync('.sites-runtime/presentation-modules', { recursive: true });
for (const name of ['presentation-data', 'catalog-seed', 'rules']) {
 const source = readFileSync(`lib/${name}.ts`, 'utf8');
 const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace(/from '(\.[^']+)'/g, "from '$1.mjs'");
 writeFileSync(`.sites-runtime/presentation-modules/${name}.mjs`, code);
}
const { preparePresentation } = await import('../.sites-runtime/presentation-modules/presentation-data.mjs');

if (!process.env.MONGODB_URI) throw new Error('Configura MONGODB_URI en .env.');
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
 const db = client.db(process.env.MONGODB_DB || 'trade');
 const backup = {};
 for (const name of ['users','providers','requests','quotes','reviews','files','file_objects']) backup[name] = await db.collection(name).find({}).toArray();
 mkdirSync('.sites-runtime/backups', { recursive: true });
 const path = `.sites-runtime/backups/before-presentation-${Date.now()}.json`;
 writeFileSync(path, BSON.EJSON.stringify(backup));
 console.log(`Respaldo privado guardado en ${path}`);
 const image = name => new Uint8Array(readFileSync(`public/${name}`));
 const result = await preparePresentation(db, { profile: image('demo-assets/perfil.png'), document: image('demo-assets/identificacion.png'), before: image('demo-assets/antes.png'), after: image('demo-assets/despues.png'), trades: { 'Plomería': image('design-assets/plomeria.png'), 'Electricidad': image('design-assets/electricidad.png'), 'Carpintería': image('design-assets/carpinteria.png') } });
 console.log(JSON.stringify(result, null, 2));
} finally { await client.close(); }
