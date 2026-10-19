import {passwordHash} from './rules';
// Demo entry is restricted to the owner-private Sites boundary and a verified platform identity.
// Disable DEMO_ENABLED before changing the site's audience.
export async function demo(req:Request,env:any,role:string){
 if(env.DEMO_ENABLED!=='true'||!req.headers.get('oai-authenticated-user-id'))return Response.json({error:'La demo requiere acceso del propietario y configuración habilitada.'},{status:403});
 if(!['cliente','proveedor','admin'].includes(role))return Response.json({error:'Rol inválido.'},{status:400});
 const names:any={cliente:'Ana López · Demo',proveedor:'Luis Ramírez · Demo',admin:'Administración · Demo'};
 for(const r of ['cliente','proveedor','admin']){const uid='demo-'+r;if(!await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(uid).first()){const salt=crypto.randomUUID();await env.DB.prepare('INSERT OR IGNORE INTO users(id,name,email,hash,salt,role) VALUES(?,?,?,?,?,?)').bind(uid,names[r],r+'@trade.example',await passwordHash(crypto.randomUUID(),salt),salt,r==='proveedor'?'cliente':r).run()}}
 const token=crypto.randomUUID()+crypto.randomUUID();await env.DB.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(token,'demo-'+role,Date.now()+86400000).run();return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`trade_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${new URL(req.url).protocol==='https:'?'; Secure':''}`}});
}
