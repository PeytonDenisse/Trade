import {validateIneIdentity,type IneIdentity} from './ine-identity';

// Shared by the form and the server; agreement alone never raises this score.
export const INE_MIN_CONFIDENCE=75;
export const INE_ANALYSIS_VERSION='ine-local-v1';
export const INE_ENGINE_VERSION='tesseract-7/opencv-4.12/field-confidence-2/field-crops-3';
export const identityKeys=(['nombres','apellidoPaterno','apellidoMaterno','fechaNacimiento','sexo','curp','calleNumero','colonia','codigoPostal','municipio','estado','vigencia'] as const);
export const criticalKeys:readonly (keyof IneIdentity)[]=['nombres','apellidoPaterno','apellidoMaterno','curp','fechaNacimiento','vigencia'];
export type IneReading={values:Partial<IneIdentity>;confidence:Partial<Record<keyof IneIdentity,number>>};
export type IneEvidence={original:IneReading;processed:IneReading;warnings:string[];failure?:'processing-error'|'image-unreadable'};
export type IneFieldEvidence={field:keyof IneIdentity;declared:string;original:string;processed:string;confidenceOriginal:number;confidenceProcessed:number;issues:string[]};
export type IneAnalysis={version:string;engine:string;document:string;runId:string;at:string;by:string;outcome:'approved'|'review';reasons:string[];fields:IneFieldEvidence[]};
const allowedWarnings=new Set(['low-resolution','blur','dark','low-contrast','overexposed']);
const warningLabels:Record<string,string>={'low-resolution':'resolución insuficiente',blur:'imagen borrosa',dark:'poca luz','low-contrast':'poco contraste',overexposed:'exceso de luz'};
const fieldLabels:Record<keyof IneIdentity,string>={nombres:'Nombre(s)',apellidoPaterno:'Apellido paterno',apellidoMaterno:'Apellido materno',fechaNacimiento:'Fecha de nacimiento',sexo:'Sexo o género',curp:'CURP',calleNumero:'Calle y número',colonia:'Colonia',codigoPostal:'Código postal',municipio:'Municipio',estado:'Estado',vigencia:'Vigencia'};
export function normalizeIneValue(value:string){return value.normalize('NFD').replace(/n\u0303/gi,'Ñ').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim()}

// This endpoint accepts only bounded, structured evidence, never full OCR text.
export function cleanIneEvidence(input:unknown):IneEvidence{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Falta la evidencia de las dos lecturas.');
 const source=input as any;
 function reading(raw:any):IneReading{
  if(!raw||typeof raw!=='object'||!raw.values||!raw.confidence||Array.isArray(raw.values)||Array.isArray(raw.confidence))throw Error('Lectura OCR inválida.');
  const out:IneReading={values:{},confidence:{}};
  for(const field of identityKeys){
   if(raw.values[field]!==undefined){if(typeof raw.values[field]!=='string'||raw.values[field].length>300)throw Error('Campo OCR inválido.');Object.assign(out.values,{[field]:raw.values[field]})}
   if(raw.confidence[field]!==undefined){const n=raw.confidence[field];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>100)throw Error('Confianza OCR inválida.');out.confidence[field]=n}
  }
  return out;
 }
 if(!Array.isArray(source.warnings)||source.warnings.length>5||source.warnings.some((w:unknown)=>typeof w!=='string'||!allowedWarnings.has(w)))throw Error('Indicadores de calidad inválidos.');
 if(source.failure!==undefined&&!['processing-error','image-unreadable'].includes(source.failure))throw Error('Fallo de análisis inválido.');
 return {original:reading(source.original),processed:reading(source.processed),warnings:[...new Set<string>(source.warnings)],...(source.failure?{failure:source.failure}:{})};
}

export function evaluateIne(identity:unknown,evidence:IneEvidence,duplicate:boolean,year=new Date().getFullYear()){
 const reasons:string[]=[];let valid:IneIdentity|undefined;
 try{valid=validateIneIdentity(identity)}catch{reasons.push('Los datos declarados están incompletos o no son coherentes.')}
 if(evidence.failure)reasons.push('No se pudo completar la lectura. Solicita una nueva captura o revisa el documento.');
 if(evidence.warnings.length)reasons.push('La imagen presenta problemas de calidad: '+evidence.warnings.map(w=>warningLabels[w]).join(', ')+'.');
 if(duplicate)reasons.push('Hay otro registro con la misma CURP; requiere revisión manual.');
 const source=(valid||identity||{}) as Partial<IneIdentity>;
 const fields:IneFieldEvidence[]=identityKeys.map(field=>{
  const declared=String(source[field]||''),a=String(evidence.original.values[field]||''),b=String(evidence.processed.values[field]||'');
  const ca=evidence.original.confidence[field]||0,cb=evidence.processed.confidence[field]||0,issues:string[]=[];
  const critical=criticalKeys.includes(field)&&!(field==='apellidoMaterno'&&!declared);
  if(critical){
   if(!a||!b)issues.push('Falta una de las dos lecturas.');
   if(ca<INE_MIN_CONFIDENCE||cb<INE_MIN_CONFIDENCE)issues.push(`Confianza inferior a ${INE_MIN_CONFIDENCE} en alguna lectura.`);
   if(a&&b&&normalizeIneValue(a)!==normalizeIneValue(b))issues.push('Las lecturas no coinciden.');
   if((a&&normalizeIneValue(a)!==normalizeIneValue(declared))||(b&&normalizeIneValue(b)!==normalizeIneValue(declared)))issues.push('No coincide con el dato declarado.');
  }else if((a&&normalizeIneValue(a)!==normalizeIneValue(declared))||(b&&normalizeIneValue(b)!==normalizeIneValue(declared)))issues.push('Hay una diferencia que debe revisar administración.');
  if(issues.length)reasons.push(`${fieldLabels[field]}: ${issues.join(' ')}`);
  return {field,declared,original:a,processed:b,confidenceOriginal:ca,confidenceProcessed:cb,issues};
 });
 const years=String(source.vigencia||'').match(/\d{4}/g)?.map(Number)||[];
 if(!years.length||years.length>2||year<years[0]||year>years[years.length-1]){
  // A single printed year is an expiry year, not a start year.
  if(!(years.length===1&&year<=years[0]))reasons.push('La vigencia no incluye el año actual.');
 }
 return {outcome:reasons.length?'review' as const:'approved' as const,reasons,fields};
}
