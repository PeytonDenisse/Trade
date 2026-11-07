'use client';
import {useEffect} from 'react';
import {createIneReader} from '../../lib/ine-reader';
import {cleanIneEvidence} from '../../lib/ine-analysis';
import type {IneRunnerInput} from '../../lib/ine-browser-runner';

export function IneBackgroundRunner(){
 useEffect(()=>{
  let busy=false;
  window.tradeIneRunner={async read(input:IneRunnerInput){
   if(busy)throw Error('El motor está ocupado.');
   if(!['image/png','image/jpeg','image/webp'].includes(input.mime)||typeof input.base64!=='string'||input.base64.length>7000000)throw Error('Documento inválido.');
   busy=true;const reader=createIneReader(),timer=setTimeout(()=>void reader.close(),120000);
   try{
    const bytes=Uint8Array.from(atob(input.base64),character=>character.charCodeAt(0));
    if(!bytes.length||bytes.length>5*1024*1024)throw Error('Documento inválido.');
    return JSON.stringify(cleanIneEvidence((await reader.read(new File([bytes],'identificacion',{type:input.mime}))).evidence));
   }finally{clearTimeout(timer);await reader.close();busy=false}
  }};
  return()=>{delete window.tradeIneRunner};
 },[]);
 return <main><h1>Proceso de revisión de Trade</h1><p>Este proceso recibe documentos únicamente desde el servicio de revisión. No concede permisos ni guarda decisiones desde esta página.</p></main>;
}
