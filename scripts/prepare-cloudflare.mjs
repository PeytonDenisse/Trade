import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const withoutImages = args.includes('--without-images');
const [bucketName = 'trade-files', workerName = 'trade'] = args.filter(arg => arg !== '--without-images');
for (const name of [bucketName, workerName]) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error('Usa nombres en minúsculas con números y guiones.');
}
const source = new URL('../dist/server/wrangler.json', import.meta.url);
const output = new URL('../dist/server/wrangler.public.json', import.meta.url);
const config = JSON.parse(readFileSync(source, 'utf8'));
config.name = workerName;
delete config.topLevelName;
config.workers_dev = true;
config.preview_urls = false;
config.vars = { ...config.vars, DEMO_ENABLED: 'false', MONGODB_DB: 'trade' };
delete config.vars.MONGODB_URI;
config.d1_databases = [];
config.r2_buckets = withoutImages ? [] : [{ binding: 'BUCKET', bucket_name: bucketName }];
writeFileSync(output, JSON.stringify(config, null, 2) + '\n');
console.log(`Configuración pública preparada: ${fileURLToPath(output)}`);
console.log('La demo de roles está deshabilitada. Usa el registro normal de Trade.');
console.log('Configura MONGODB_URI como secreto de Wrangler antes de usar la aplicación.');
if (withoutImages) console.log('Publicación sin R2: las imágenes no están disponibles.');
