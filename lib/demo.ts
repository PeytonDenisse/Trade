import type {Db} from 'mongodb';
import {passwordHash} from './rules';
// The academic demo exposes its three fictional roles when explicitly enabled.
export async function demo(req:Request,env:any,db:Db,role:string){
 if(env.DEMO_ENABLED!=='true')return Response.json({error:'El recorrido de demo está deshabilitado.'},{status:403});
 if(!['cliente','proveedor','admin'].includes(role))return Response.json({error:'Rol inválido.'},{status:400});
 const names:any={cliente:'Ana López · Demo',proveedor:'Luis Ramírez · Demo',admin:'Administración · Demo'};
 for(const r of ['cliente','proveedor','admin']){const uid='demo-'+r;if(!await db.collection('users').findOne({id:uid})){const salt=crypto.randomUUID();await db.collection('users').updateOne({id:uid},{$setOnInsert:{name:names[r],email:r+'@trade.example',hash:await passwordHash(crypto.randomUUID(),salt),salt,role:r==='proveedor'?'cliente':r,active:true}},{upsert:true})}}
 const token=crypto.randomUUID()+crypto.randomUUID();await db.collection('sessions').insertOne({token,user_id:'demo-'+role,expires:Date.now()+86400000});return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`trade_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${new URL(req.url).protocol==='https:'?'; Secure':''}`}});
}
