import type {Db} from 'mongodb';

// Platform settings administration can change (one document, key "app").
export type Settings={registrationOpen:boolean;providerApplicationsOpen:boolean;requestExpiryDays:number;maxOpenRequests:number};
export const defaultSettings:Settings={registrationOpen:true,providerApplicationsOpen:true,requestExpiryDays:30,maxOpenRequests:10};

export async function getSettings(db:Db):Promise<Settings>{
 const doc=await db.collection<any>('settings').findOne({key:'app'},{projection:{_id:0,key:0,updated_at:0,updated_by:0}});
 return {...defaultSettings,...(doc||{})};
}

// Checks one change against its allowed range; returns the clean partial update.
export function settingsUpdate(b:any):Partial<Settings>{
 const out:Partial<Settings>={};
 for(const key of ['registrationOpen','providerApplicationsOpen'] as const)if(b[key]!==undefined){if(typeof b[key]!=='boolean')throw new Error('Datos inválidos.');out[key]=b[key]}
 const range=(key:'requestExpiryDays'|'maxOpenRequests',min:number,max:number,label:string)=>{if(b[key]===undefined)return;const n=Number(b[key]);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${label}: usa un número entero de ${min} a ${max}.`);out[key]=n};
 range('requestExpiryDays',1,365,'Días para que venza una solicitud');
 range('maxOpenRequests',1,100,'Solicitudes activas por cliente');
 if(!Object.keys(out).length)throw new Error('No hay cambios que guardar.');
 return out;
}
