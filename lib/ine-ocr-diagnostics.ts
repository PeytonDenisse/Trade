import type {IneIdentity} from './ine-identity';
import type {IneReading} from './ine-analysis';

export type IneReadStatus='extracted'|'label-only'|'not-located';
export type IneReadDiagnostics={original:Record<keyof IneIdentity,IneReadStatus>;processed:Record<keyof IneIdentity,IneReadStatus>;warnings:string[]};
const headings:Record<keyof IneIdentity,RegExp>={
 nombres:/\bNOMBRES?\b/,apellidoPaterno:/\b(?:NOMBRES?|APELLIDO\s+PATERNO)\b/,apellidoMaterno:/\b(?:NOMBRES?|APELLIDO\s+MATERNO)\b/,
 curp:/\bC\s*U\s*R\s*P\b/,fechaNacimiento:/\bFECHA\s*(?:DE\s*)?NACIMI(?:E(?:N(?:T(?:O)?)?)?)?\b/,sexo:/\b(?:SEXO|GENERO)\b/,
 calleNumero:/\b(?:DOMICILI?O|CALLE)\b/,colonia:/\b(?:DOMICILI?O|COLONIA|COL)\b/,codigoPostal:/\b(?:DOMICILI?O|CODIGO\s+POSTAL|C\s*P)\b/,
 municipio:/\b(?:DOMICILI?O|MUNICIPIO|ALCALDIA)\b/,estado:/\b(?:DOMICILI?O|ESTADO)\b/,vigencia:/\b(?:VIGENCIA|VENCIMIENTO)\b/,
};

// Only categories leave this function. Never include OCR strings, identifiers,
// field values or file names in a diagnostic report.
export function diagnoseIneReading(raw:string,reading:IneReading):Record<keyof IneIdentity,IneReadStatus>{
 const text=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[.:]/g,' ');
 return Object.fromEntries(Object.entries(headings).map(([field,pattern])=>[
  field,reading.values[field as keyof IneIdentity]?'extracted':pattern.test(text)?'label-only':'not-located',
 ])) as Record<keyof IneIdentity,IneReadStatus>;
}

export const ineReadStatusLabel:Record<IneReadStatus,string>={
 extracted:'Dato extraído',
 'label-only':'Etiqueta localizada; sin dato extraíble',
 'not-located':'Etiqueta no localizada',
};
export const ineQualityLabel:Record<string,string>={
 'low-resolution':'Resolución insuficiente',blur:'Posible desenfoque',dark:'Imagen oscura',
 'low-contrast':'Poco contraste',overexposed:'Posible sobreexposición o reflejo',
};
