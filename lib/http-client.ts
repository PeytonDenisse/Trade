// Gateways and hosting limits may return text or HTML instead of our API's JSON.
export async function readApiResponse<T=any>(response:Response):Promise<T>{
  const text=await response.text();
  let data:any;
  try{data=JSON.parse(text)}catch{/* Handle the HTTP status before reporting malformed JSON. */}
  if(!response.ok){
    const fallback=response.status===413
      ?'El archivo o la solicitud supera el tamaño permitido. Las imágenes admiten hasta 5 MB.'
      :response.status===503
        ?'El servicio no está disponible temporalmente. Intenta de nuevo en unos momentos.'
        :'No se pudo completar la operación. Intenta de nuevo.';
    throw new Error(typeof data?.error==='string'?data.error:fallback);
  }
  if(data===undefined)throw new Error('El servidor devolvió una respuesta inesperada. Intenta de nuevo.');
  return data as T;
}

export async function api(path:string,data?:any){
  const response=await fetch('/api/'+path,{
    credentials:'same-origin',cache:'no-store',
    ...(data!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),
  });
  return readApiResponse(response);
}
