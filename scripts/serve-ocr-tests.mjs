import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createReadStream,statSync} from 'node:fs';
import path from 'node:path';
await import('./prepare-ocr-assets.mjs');
const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.ocr-test.config.mts'],{stdio:'inherit'});
if(build.error)throw build.error;if(build.status!==0)process.exit(build.status??1);
const root=path.resolve('.sites-runtime/ocr-browser-build');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg'};
createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/ine-review-runner'?'/tests/browser/runner.html':pathname));
  if(!file.startsWith(root+path.sep)||!statSync(file).isFile()){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end()}
}).listen(5193,'127.0.0.1',()=>console.log('OCR browser fixture: http://127.0.0.1:5193/tests/browser/harness.html'));
