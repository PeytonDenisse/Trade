import {cleanIneEvidence,type IneEvidence} from './ine-analysis';
export type IneRunnerInput={base64:string;mime:string};
declare global{interface Window{tradeIneRunner?:{read:(input:IneRunnerInput)=>Promise<string>}}}
export type IneBrowser={newPage:()=>Promise<any>;close:()=>Promise<unknown>};
// Launch is supplied by Cloudflare in production, or an isolated local browser
// in the trial. Applicant data never becomes an executable script or a URL.
export async function readIneInBrowser(launch:()=>Promise<IneBrowser>,origin:string,file:{bytes:Uint8Array;mime:string}):Promise<IneEvidence>{
 const url=new URL(origin);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw Error('Origen del lector inválido.');
 if(url.username||url.password||file.bytes.length>5*1024*1024)throw Error('Documento u origen inválido.');
 let binary='';for(let offset=0;offset<file.bytes.length;offset+=16384)binary+=String.fromCharCode(...file.bytes.subarray(offset,offset+16384));
 const browser=await launch(),timer=setTimeout(()=>void browser.close(),145000);
 try{
  const page=await browser.newPage();await page.goto(new URL('/ine-review-runner',url.origin).href);
  await page.waitForFunction(()=>Boolean(window.tradeIneRunner));
  const result=await page.evaluate((input:IneRunnerInput)=>window.tradeIneRunner!.read(input),{base64:btoa(binary),mime:file.mime});
  if(typeof result!=='string'||result.length>30000)throw Error('Resultado del lector inválido.');
  return cleanIneEvidence(JSON.parse(result));
 }finally{clearTimeout(timer);await browser.close()}
}
