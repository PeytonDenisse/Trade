import type {Db} from 'mongodb';
import {passwordHash} from './rules';
// Demo entry is restricted to the owner-private Sites boundary and a verified platform identity.
// Disable DEMO_ENABLED before changing the site's audience.
export async function demo(req:Request,env:any,db:Db,role:string){
 if(env.DEMO_ENABLED!=='true'||!req.headers.get('oai-authenticated-user-id'))return Response.json({error:'La demo requiere acceso del propietario y configuración habilitada.'},{status:403});
 if(!['cliente','proveedor','admin'].includes(role))return Response.json({error:'Rol inválido.'},{status:400});
 const names:any={cliente:'Ana López · Demo',proveedor:'Luis Ramírez · Demo',admin:'Administración · Demo'};
 for(const r of ['cliente','proveedor','admin']){const uid='demo-'+r;if(!await db.collection('users').findOne({id:uid})){const salt=crypto.randomUUID();await db.collection('users').updateOne({id:uid},{$setOnInsert:{name:names[r],email:r+'@trade.example',hash:await passwordHash(crypto.randomUUID(),salt),salt,role:r==='proveedor'?'cliente':r}},{upsert:true})}}
 const token=crypto.randomUUID()+crypto.randomUUID();await db.collection('sessions').insertOne({token,user_id:'demo-'+role,expires:Date.now()+86400000});return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`trade_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${new URL(req.url).protocol==='https:'?'; Secure':''}`}});
}
