import type {IneEvidence} from './ine-analysis';
import type {IneIdentity} from './ine-identity';

// These fields are printed directly on supported INE fronts. Locality and state
// are excluded because the parser may derive them from an abbreviated address.
export const preliminaryFields=(['nombres','apellidoPaterno','apellidoMaterno','fechaNacimiento','sexo','curp','calleNumero','colonia','codigoPostal','vigencia'] as const);
export type PreliminaryField=typeof preliminaryFields[number];
export const PRELIMINARY_CONFIDENCE=80;
const normalizeIneValue=(value:string)=>value.normalize('NFD').replace(/n\u0303/gi,'Ñ').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
export type PreliminaryResult={status:'Sin lectura'|'Validación preliminar aprobada'|'Revisión manual';matched:PreliminaryField[];review:PreliminaryField[];conflicts:PreliminaryField[]};

export function evaluateInePreliminary(identity:Partial<Record<keyof IneIdentity,string>>,evidence:IneEvidence|null):PreliminaryResult{
 if(!evidence||evidence.failure)return {status:evidence?'Revisión manual':'Sin lectura',matched:[],review:[...preliminaryFields],conflicts:[]};
 const matched:PreliminaryField[]=[],review:PreliminaryField[]=[],conflicts:PreliminaryField[]=[];
 for(const field of preliminaryFields){
  const declared=identity[field],original=evidence.original.values[field],processed=evidence.processed.values[field];
  const a=evidence.original.confidence[field],b=evidence.processed.confidence[field];
  if(!declared||!original||!processed||a===undefined||b===undefined){review.push(field);continue}
  const normalized=normalizeIneValue(declared);
  if(normalizeIneValue(original)!==normalizeIneValue(processed)||normalizeIneValue(original)!==normalized){conflicts.push(field);continue}
  if(a>=PRELIMINARY_CONFIDENCE&&b>=PRELIMINARY_CONFIDENCE)matched.push(field);
  else review.push(field);
 }
 return {status:matched.length>=3&&!conflicts.length?'Validación preliminar aprobada':'Revisión manual',matched,review,conflicts};
}
