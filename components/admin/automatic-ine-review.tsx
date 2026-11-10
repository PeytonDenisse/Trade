'use client';
import {useEffect,useRef,useState} from 'react';
import {createIneReader,type IneReader} from '../../lib/ine-reader';
import {INE_ANALYSIS_VERSION,type IneEvidence} from '../../lib/ine-analysis';
import type {Api} from './shared';

const emptyEvidence:()=>IneEvidence=()=>({original:{values:{},confidence:{}},processed:{values:{},confidence:{}},warnings:[],failure:'processing-error'});
export function AutomaticIneReview({api,items,onItems,makeReader=createIneReader}:{api:Api;items:any[];onItems:(items:any[])=>void;makeReader?:()=>IneReader}){
 const [running,setRunning]=useState(false),[message,setMessage]=useState('');
 const [counts,setCounts]=useState({approved:0,review:0,errors:0});
 const [lastDecision,setLastDecision]=useState('');
 const generation=useRef(0),reader=useRef<IneReader|null>(null),controller=useRef<AbortController|null>(null),active=useRef(false),mounted=useRef(true),wake=useRef<(()=>void)|null>(null);
 const current=useRef(items);current.current=items;
 function cancel(){generation.current++;active.current=false;controller.current?.abort();wake.current?.();wake.current=null;void reader.current?.close();reader.current=null}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;cancel()}},[]);
 function pause(){cancel();setRunning(false);setMessage('Revisión pausada. Las decisiones guardadas se conservan.')}
 async function start(retry=false){
  if(active.current)return;
  active.current=true;setRunning(true);setCounts({approved:0,review:0,errors:0});setLastDecision('');
  const version=++generation.current,signalController=new AbortController();controller.current=signalController;
  let engine=makeReader();reader.current=engine;
  const retryIds=new Set(retry?current.current.map(p=>p.id):[]),seen=new Set<string>();
  const valid=()=>mounted.current&&generation.current===version&&!signalController.signal.aborted;
  try{
   while(valid()){
    const apps=await api('applications',undefined,{signal:signalController.signal});if(!valid())break;
    const pending=apps.filter((p:any)=>p.status==='Pendiente');onItems(pending);
    const next=pending.find((p:any)=>p.analysis_eligible===true&&p.identity&&p.document&&!seen.has(p.id+':'+p.document)&&
     (retryIds.has(p.id)||p.analysis?.version!==INE_ANALYSIS_VERSION||p.analysis?.document!==p.document));
    if(!next){
     setMessage('Esperando nuevos registros. Los casos antiguos o con observaciones quedan para revisión manual.');
     await new Promise<void>(resolve=>{const timer=setTimeout(()=>{wake.current=null;resolve()},10000);wake.current=()=>{clearTimeout(timer);resolve()}});
     continue;
    }
    seen.add(next.id+':'+next.document);let evidence=emptyEvidence();
    setMessage(`Analizando a ${next.name}…`);
    try{
     const response=await fetch('/api/files/'+encodeURIComponent(next.document),{credentials:'same-origin',cache:'no-store',signal:signalController.signal});
     if(!response.ok)throw Error('No se pudo cargar el documento privado.');
     const blob=await response.blob();if(blob.size>5*1024*1024)throw Error('Documento demasiado grande.');
     const timer=setTimeout(()=>{void engine.close()},120000);
     try{evidence=(await engine.read(new File([blob],'identificacion',{type:blob.type}),progress=>{if(valid())setMessage(`${next.name}: ${progress}`)})).evidence}
     finally{clearTimeout(timer)}
    }catch(e){if(!valid())break;setMessage(`${next.name}: no se pudo completar la lectura; se enviará a revisión.`);await engine.close();engine=makeReader();reader.current=engine}
    if(!valid())break;
    try{
     const result=await api('admin/provider-analysis',{id:next.id,document:next.document,runId:crypto.randomUUID(),evidence},{signal:signalController.signal});
     if(!valid())break;
     setCounts(n=>({...n,[result.approved?'approved':'review']:n[result.approved?'approved':'review']+1}));
     setLastDecision(result.approved?`${next.name}: registro aprobado automáticamente.`:`${next.name}: requiere revisión manual.`);
    }catch(e){if(!valid())break;setCounts(n=>({...n,errors:n.errors+1}));setMessage(e instanceof Error?e.message:'No se pudo guardar la revisión.')}
   }
  }catch(e){if(valid()){setMessage(e instanceof Error?e.message:'No se pudo cargar la cola.');setCounts(n=>({...n,errors:n.errors+1}))}}
  finally{await engine.close();if(valid()){active.current=false;setRunning(false)}if(reader.current===engine)reader.current=null}
 }
 return <section className="automatic-ine-review" aria-label="Revisión automática de identificaciones"><h3>Revisión automática local</h3><p>Al iniciar la revisión, Trade aprueba cada registro sin otro clic cuando tres campos distintos coinciden con los datos declarados y ambas lecturas alcanzan al menos 80 %. Las contradicciones y los casos insuficientes quedan pendientes; no se rechaza a nadie por un fallo del OCR. Funciona mientras esta sección esté abierta y la revisión esté iniciada.</p>
 <div className="admin-actions"><button className="primary" type="button" disabled={running} onClick={()=>void start()}>Iniciar revisión automática</button><button className="secondary" type="button" disabled={!running} onClick={pause}>Pausar</button><button className="secondary" type="button" disabled={running} onClick={()=>void start(true)}>Reanalizar observaciones</button></div>
 <p role="status">{message}</p>{lastDecision&&<p role="status">{lastDecision}</p>}<p>Aprobados: {counts.approved} · Para revisión: {counts.review} · Errores o registros cambiados: {counts.errors}</p><small>Lectura y validación interna; no certifica la autenticidad de la INE.</small>
 </section>;
}
