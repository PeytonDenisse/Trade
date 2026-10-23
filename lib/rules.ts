// Accounts and provider profiles are active unless an admin sets active:false.
// Older records without the field count as active.
export const ACTIVE={active:{$ne:false}} as const;
export const isActive=(doc:{active?:boolean}|null|undefined)=>!!doc&&doc.active!==false;
export const trades=['Plomería','Electricidad','Carpintería','Cerrajería','Pintura','Albañilería','Mantenimiento'];
export function required(v:unknown,label:string,max=2000){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`${label}: completa el campo (máximo ${max} caracteres).`);return v.trim()}
// Providers may offer several trades; `trade` keeps the first one for older code and data.
export const tradesOf=(p:{trade?:string;trades?:string[]}|null|undefined)=>!p?[]:p.trades?.length?p.trades:p.trade?[p.trade]:[];
export function tradeList(v:unknown,offered:string[]=trades){const list=[...new Set((Array.isArray(v)?v:v==null||v===''?[]:[v]).map(t=>trade(t,offered)))];if(!list.length)throw new Error('Selecciona al menos un oficio.');return list}
export function trade(v:unknown,list:string[]=trades){if(!list.includes(String(v)))throw new Error('Selecciona un oficio válido.');return String(v)}
export function price(v:unknown){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>10000000)throw new Error('El precio debe ser mayor que cero y menor a 10 millones.');return Math.round(n*100)/100}
export function stars(v:unknown){const n=Number(v);if(!Number.isInteger(n)||n<1||n>5)throw new Error('Selecciona de 1 a 5 estrellas.');return n}
export function date(v:unknown){const s=String(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s||s<new Date().toISOString().slice(0,10))throw new Error('Selecciona una fecha válida, de hoy en adelante.');return s}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('')}
