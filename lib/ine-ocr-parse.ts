// Local OCR output is transient. Only these reviewed identification fields may leave this module.
import type { IneIdentity } from './ine-identity';
import {stateByAbbreviation} from './ine-states';

export type IneCandidateStatus = 'Reconocido' | 'Revisar';
export type IneOcrResult = {
  values: Partial<IneIdentity>;
  confidence?: Partial<Record<keyof IneIdentity, number>>;
  status: Partial<Record<keyof IneIdentity, IneCandidateStatus>>;
};
export type IneZone='curp'|'fechaNacimiento'|'domicilio';

// The applicant explicitly selects the printed field. These suggestions never
// replace the independent document evidence used by administration.
export function extractIneZoneCandidates(zone:IneZone,first:string,second:string):IneOcrResult{
  function parse(text:string):IneOcrResult{
    if(zone==='fechaNacimiento'){
      const value=parseBirthDate(text);
      return value?{values:{fechaNacimiento:value},status:{fechaNacimiento:'Revisar'}}:{values:{},status:{}};
    }
    const heading=zone==='curp'?'CURP':'DOMICILIO';
    const pattern=zone==='curp'?/^CURP\b/i:/^DOMICILI?O\b/i;
    return extractIneCandidates(pattern.test(text.trim())?text:heading+'\n'+text);
  }
  const a=parse(first),b=parse(second),out:IneOcrResult={values:{},status:{}};
  const fields:(keyof IneIdentity)[]=zone==='domicilio'?['calleNumero','colonia','codigoPostal','municipio','estado']:[zone];
  for(const field of fields){
    const value=a.values[field],other=b.values[field];
    if(value&&other&&value.toUpperCase()===other.toUpperCase()){
      Object.assign(out.values,{[field]:value});out.status[field]='Revisar';
    }
  }
  return out;
}

const CURP = /^[A-ZÑ&][AEIOUX][A-ZÑ&]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HMX](?:AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s:–—-]+$/g, '').trim();
const label = (s: string) => fold(s).replace(/[.:]/g, '').replace(/\s+/g, ' ').trim();
const otherFieldLabel = /\b(?:NOMBRES?|APELLIDO(?:\s+(?:PATERNO|MATERNO))?|FECHA(?:\s+DE)?\s+NACIMIENTO|SEXO|GENERO|INDIGENA|CURP|DOMICILI?O|COLONIA|C\s*P|CODIGO\s+POSTAL|MUNICIPIO|ALCALDIA|ESTADO|VIGENCIA|VENCIMIENTO|CLAVE\s+DE\s+ELECTOR|ANO\s+DE\s+REGISTRO|SECCION)\b/u;
const compactForeignLabel = /(?:GENERO|INDIGENA|SEXO|CURP|DOMICILI?O|FECHADENACIMI|FECHANACIMI|VIGENCIA|SECCION|CLAVEDEELECTOR)/u;
const birthHeading=/^FECHA\s*(?:DE\s*)?NACIMI(?:E(?:N(?:T(?:O)?)?)?)?\b\s*[:\-]?\s*/i;
const containsLabel = (s: string) => {
  const normalized=label(s).replace(/[^A-Z0-9 ]/gu, ' ');
  return otherFieldLabel.test(normalized)||compactForeignLabel.test(normalized.replace(/\s+/gu,''));
};
const personName = (s: string) => /^[\p{L}][\p{L} '’\-]{1,99}$/u.test(s) && !containsLabel(s);
const streetAddress = (s: string) => {
  const value=tidy(s);
  return value.length>=6 && /\p{L}{2,}/u.test(value) && /(?:\d{1,6}|\bS\s*\/?\s*N\b|\bSIN\s+NUMERO\b)/iu.test(value)
    && /^[\p{L}\p{N}\s.,#°º/\-]+$/u.test(value) && !containsLabel(value);
};

function realDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day && d.getTime() <= Date.now();
}

export function normalizeCurp(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '');
}

// OCR frequently confuses digits with letters in the six date positions.
// Corrections are only accepted if the complete CURP then passes structural checks.
function ocrCurp(value: string): string | undefined {
  const token = fold(value).match(/[A-ZÑ&0-9]{18}/u)?.[0];
  if (!token) return;
  if (curpFormatValid(token)) return token;
  const date = token.slice(4, 10).replace(/[OQ]/gu, '0').replace(/[IL]/gu, '1').replace(/Z/gu, '2').replace(/S/gu, '5').replace(/B/gu, '8');
  const corrected = token.slice(0, 4) + date + token.slice(10);
  return corrected !== token && curpFormatValid(corrected) ? corrected : undefined;
}

// Structural validation only; this does not authenticate a person or a government record.
export function curpFormatValid(value: string): boolean {
  const curp = normalizeCurp(value);
  if (!CURP.test(curp)) return false;
  const yy = Number(curp.slice(4, 6));
  const year = (/[A-J]/.test(curp[16]) ? 2000 : 1900) + yy;
  return realDate(year, Number(curp.slice(6, 8)), Number(curp.slice(8, 10)));
}

export function parseBirthDate(value: string): string | undefined {
  const iso=value.match(/\b(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b/);
  if(iso){const [,year,month,day]=iso;if(realDate(Number(year),Number(month),Number(day)))return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;return}
  const match = value.match(/\b(\d{1,2})(?:\s*[./-]\s*|\s+)(\d{1,2})(?:\s*[./-]\s*|\s+)(\d{4})\b/);
  if (!match) return;
  const [, day, month, year] = match;
  if (!realDate(Number(year), Number(month), Number(day))) return;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Only split a printed locality and a known state suffix; never infer either. */
export function parseIneLocality(row:string):{municipio:string;estado:string}|undefined{
  if(/\d/u.test(row)||containsLabel(row))return;
  for(const [abbreviation,estado] of Object.entries(stateByAbbreviation)){
    const suffix=abbreviation.split('').join('[\\s.]*');
    const match=row.trim().match(new RegExp('^(.+?)(?:\\s*,\\s*|\\s+)'+suffix+'[.\\s]*$','iu'));
    const municipio=match?.[1]?.replace(/[.,\s]+$/,'').trim();
    if(municipio&&/^[\p{L}][\p{L} ’'\-]{2,119}$/u.test(municipio))return {municipio,estado};
  }
}

// INE addresses usually print one DOMICILIO heading followed by three rows,
// rather than separate COLONIA, C.P., MUNICIPIO and ESTADO labels.
function addressBlock(lines:string[],index:number,out:IneOcrResult){
  const rows:string[]=[];
  const inline=tidy(lines[index].replace(/^DOMICILI?O\s*[:\-]?\s*/i,''));
  if(inline&&!containsLabel(inline))rows.push(inline);
  for(let i=index+1;i<Math.min(lines.length,index+7);i++){
    if(/^(?:CURP|NOMBRES?|APELLIDO|SEXO|GENERO|FECHA|VIGENCIA|SECCION|CLAVE)\b/.test(label(lines[i])))break;
    rows.push(lines[i]);
  }
  // Ignore at most two non-numeric OCR noise rows only when a clearly
  // prefixed street follows. A colony, locality or another field is not a street.
  if(rows[0]&&!streetAddress(rows[0])){
    const streetIndex=rows.findIndex((row,i)=>i>0&&i<=2&&/^(?:C\.?|CALLE|AV\.?|AVENIDA|BLVD\.?|BOULEVARD|CTO\.?|CIRCUITO|PRV\.?|PRIVADA|CERRADA|PROL\.?)\s+/iu.test(row)&&streetAddress(row));
    if(streetIndex>0&&rows.slice(0,streetIndex).every(row=>!/[0-9]/.test(row)&&!containsLabel(row)&&!parseIneLocality(row)))rows.splice(0,streetIndex);
  }
  const hasStreet=!!rows[0]&&!/^(?:COL(?:ONIA)?\b|C\.?\s*P\.?\b|MUNICIPIO\b|ESTADO\b)/iu.test(rows[0])&&streetAddress(rows[0]);
  if(hasStreet)put(out,'calleNumero',rows[0],'Revisar');
  for(const [index,row] of rows.slice(hasStreet?1:0).entries()){
    // Some layouts print a residential area without COL/COLONIA. Only the
    // row immediately after an identified street, with an actual postal code,
    // can be proposed as neighborhood; preserve its printed prefix verbatim.
    const neighborhood=row.match(/^COL(?:ONIA)?\.?\s*[:\-]?\s+(.+)$/iu)
      ||(hasStreet&&index===0&&/\b\d{5}\b/.test(row)&&!containsLabel(row)?[row,row]:null);
    if(neighborhood){
      const postal=neighborhood[1].match(/\b\d{5}\b/);
      const name=tidy(neighborhood[1].slice(0,postal?.index??neighborhood[1].length).replace(/\s+C\.?\s*P\.?\s*[:.]?\s*$/i,''));
      if(/^[\p{L}\p{N}][\p{L}\p{N} .’'\-]{1,119}$/u.test(name)&&!containsLabel(name))put(out,'colonia',name,'Revisar');
      if(postal)put(out,'codigoPostal',postal[0],'Revisar');
      continue;
    }
    const locality=parseIneLocality(row);
    if(locality){
      put(out,'municipio',locality.municipio,'Revisar');put(out,'estado',locality.estado,'Revisar');
    }
  }
}

function nextValue(lines: string[], index: number, prefix: RegExp): string {
  const inline = tidy(lines[index].replace(prefix, ''));
  if (/[\p{L}\p{N}]/u.test(inline)) return containsLabel(inline) ? '' : inline;
  const next = lines[index + 1] || '';
  return containsLabel(next) ? '' : tidy(next);
}

function put<K extends keyof IneIdentity>(out: IneOcrResult, key: K, value: IneIdentity[K], status: IneCandidateStatus) {
  const max: Record<keyof IneIdentity, number> = {
    nombres: 100, apellidoPaterno: 100, apellidoMaterno: 100, fechaNacimiento: 10,
    sexo: 2, curp: 18, calleNumero: 200, colonia: 120, codigoPostal: 5,
    municipio: 120, estado: 100, vigencia: 16,
  };
  if (value && value.length <= max[key] && !/\bCLAVE\s+DE\s+ELECTOR\b/.test(fold(value)) && !out.values[key] && (!['nombres','apellidoPaterno','apellidoMaterno'].includes(key) || personName(value)) && (key!=='calleNumero'||streetAddress(value))) {
    out.values[key] = value;
    out.status[key] = status;
  }
}

/** Extract only requested fields. No raw OCR text or unrelated identifiers are returned. */
export function extractIneCandidates(raw: string): IneOcrResult {
  const out: IneOcrResult = { values: {}, status: {} };
  const input = typeof raw === 'string' ? raw.slice(0, 16000) : '';
  const original = input.split(/\r?\n/).map(tidy).filter(Boolean).map(line=>line.replace(/^C\s+U\s+R\s+P\b/i,'CURP'));
  const lines: string[] = [];
  for (let i = 0; i < original.length; i++) {
    // If a forbidden label occupies its own line, skip its adjacent value as well.
    const forbidden = label(original[i]);
    if (/^(?:CLAVE\s+DE\s+ELECTOR|ELECTOR\s+KEY)\b/.test(forbidden)) {
      if (/^(?:CLAVE\s+DE\s+ELECTOR|ELECTOR\s+KEY)$/.test(forbidden) && original[i + 1]&&!containsLabel(original[i+1])) i++;
      continue;
    }
    lines.push(original[i]);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = label(line);
    const value = (pattern: RegExp) => nextValue(lines, i, pattern);
    // A two-column scan can append the sex label to a different field's row.
    const inlineSex=key.match(/(?:^|\s)(?:SEXO|GENERO)\s*(NB|H|M)(?:\s|$)/u)?.[1];
    if(inlineSex)put(out,'sexo',inlineSex as 'H'|'M'|'NB','Reconocido');
    if (/^APELLIDO\s+PATERNO\b/.test(key)) put(out, 'apellidoPaterno', value(/^APELLIDO\s+PATERNO\s*[:\-]?\s*/i), 'Revisar');
    else if (/^APELLIDO\s+MATERNO\b/.test(key)) put(out, 'apellidoMaterno', value(/^APELLIDO\s+MATERNO\s*[:\-]?\s*/i), 'Revisar');
    else if (/^NOMBRES?\b/.test(key)) {
      // Tesseract may put SEXO from the right column on the NOMBRE heading.
      // Only a complete, clean three-row block may then populate names.
      const heading = key.replace(/[^A-Z ]/gu, ' ').replace(/\s+/gu, ' ').trim();
      const layoutHeading = /^NOMBRE(?: (?:SEXO|GENERO) (?:H|M|NB))?$/u.test(heading);
      const block = layoutHeading && [lines[i + 1], lines[i + 2], lines[i + 3]].every(part => part && personName(part));
      // On this INE layout, the singular heading precedes three lines:
      // paternal surname, maternal surname, then given name. A partial block
      // cannot safely identify which line is the given name.
      const name = key.startsWith('NOMBRE')&&!key.startsWith('NOMBRES') ? '' : value(/^NOMBRES?\s*[:\-]?\s*/i);
      // The common three-line INE layout lists paternal, maternal, then given names.
      if (block) {
        put(out, 'apellidoPaterno', tidy(lines[i + 1]), 'Revisar');
        put(out, 'apellidoMaterno', tidy(lines[i + 2]), 'Revisar');
        put(out, 'nombres', tidy(lines[i + 3]), 'Revisar');
      } else if (name) put(out, 'nombres', name, 'Revisar');
    }
    else if (birthHeading.test(key)) {
      const parsed = parseBirthDate(value(birthHeading));
      if (parsed) put(out, 'fechaNacimiento', parsed, /NACIMIENTO\b/.test(key)?'Reconocido':'Revisar');
    }
    else if (/^(?:SEXO|GENERO)\b/.test(key)) {
      const sex = fold(value(/^(?:SEXO|G[ÉE]NERO)\s*[:\-]?\s*/i));
      if (sex === 'H' || sex === 'M' || sex === 'NB') put(out, 'sexo', sex, 'Reconocido');
    }
    else if (/^CURP\b/.test(key)) {
      let observed = value(/^CURP\s*[:\-]?\s*/i);
      const inline=tidy(line.replace(/^CURP\s*[:\-]?\s*/i,''));
      for(let row=i+(inline?1:2);observed&&normalizeCurp(observed).length<18&&row<Math.min(lines.length,i+4);row++){
        if(containsLabel(lines[row])||!/^[A-ZÑ&0-9\s]+$/u.test(fold(lines[row]))||normalizeCurp(observed+lines[row]).length>18)break;
        observed+=' '+lines[row];
      }
      const token = fold(observed).replace(/\s+/g,'').match(/[A-ZÑ&0-9]{18}/u)?.[0];
      const candidate = token && ocrCurp(token);
      if (candidate) put(out, 'curp', candidate, candidate===token?'Reconocido':'Revisar');
    }
    else if (/^DOMICILI?O\b/.test(key)) addressBlock(lines,i,out);
    else if (/^CALLE(?:\s+Y\s+NUMERO)?\b/.test(key)) put(out, 'calleNumero', value(/^CALLE(?:\s+Y\s+N[ÚU]MERO)?\s*[:\-]?\s*/i), 'Revisar');
    else if (/^COLONIA\b/.test(key)) put(out, 'colonia', value(/^COLONIA\s*[:\-]?\s*/i), 'Revisar');
    else if (/^C\.?P\.?\b|^CODIGO\s+POSTAL\b/.test(key)) {
      const cp = value(/^(?:C\.?P\.?|C[ÓO]DIGO\s+POSTAL)\s*[:\-]?\s*/i).match(/\b\d{5}\b/)?.[0];
      if (cp) put(out, 'codigoPostal', cp, 'Reconocido');
    }
    else if (/^(?:MUNICIPIO|ALCALDIA)\b/.test(key)) put(out, 'municipio', value(/^(?:MUNICIPIO|ALCALD[ÍI]A)\s*[:\-]?\s*/i), 'Revisar');
    else if (/^ESTADO\b/.test(key)) put(out, 'estado', value(/^ESTADO\s*[:\-]?\s*/i), 'Revisar');
    else if (/^(?:VIGENCIA|VENCIMIENTO)\b/.test(key)) {
      const validity = value(/^(?:VIGENCIA|VENCIMIENTO)\s*[:\-]?\s*/i)
        .match(/^(?:19|20|21)\d{2}(?:\s*[-/]\s*(?:19|20|21)\d{2})?$/)?.[0]?.replace(/\s*[-/]\s*/, '-');
      if (validity) {
        const [start, end] = validity.split('-').map(Number);
        if (end === undefined || end >= start) put(out, 'vigencia', validity, 'Revisar');
      }
    }
  }
  return out;
}
