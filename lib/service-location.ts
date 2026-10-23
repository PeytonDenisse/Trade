export type ServiceLocation={lat:number;lng:number;address?:string};

// Missing is valid for every request created before maps were available.
export function serviceLocation(value:unknown):ServiceLocation|undefined{
  if(value===undefined||value===null)return undefined;
  if(typeof value!=='object'||Array.isArray(value))throw new Error('Ubicación inválida. Marca un punto en el mapa.');
  const {lat,lng,address}=value as Record<string,unknown>;
  if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||lat< -90||lat>90||lng< -180||lng>180)throw new Error('Ubicación inválida. Revisa las coordenadas del mapa.');
  if(address!==undefined&&(typeof address!=='string'||address.length>300))throw new Error('La dirección de referencia debe tener como máximo 300 caracteres.');
  return {lat,lng,...(typeof address==='string'&&address.trim()?{address:address.trim()}:{})};
}

export const locationSchema={bsonType:'object',required:['lat','lng'],additionalProperties:false,properties:{lat:{bsonType:'number',minimum:-90,maximum:90},lng:{bsonType:'number',minimum:-180,maximum:180},address:{bsonType:'string',maxLength:300}}};

export function directionsUrl(point:ServiceLocation){
  return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(`${point.lat},${point.lng}`);
}
