import {required,passwordHash} from './rules';
import {sha256,type Ctx} from './api-context';

const DAY=86400000;
const clearCookie={'Set-Cookie':'trade_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'};
const newPassword=(v:unknown)=>{const pw=required(v,'Contraseña nueva',128);if(pw.length<10)throw Object.assign(new Error('La contraseña nueva debe tener al menos 10 caracteres.'),{status:400});return pw};

// Account settings and password recovery (design PDF, section 3). Returns null when the path is not one of these.
export async function accountGet(x:Ctx,path:string){
 // The reset page asks whether its link still works before showing the form.
 if(path.startsWith('reset/')){const r=await x.one('password_resets',{token_hash:await sha256(path.split('/')[1]||''),status:'Enviada',expires:{$gt:Date.now()}});const u=r?await x.one('users',{id:r.user_id},{name:1}):null;return x.json({valid:!!u,name:u?.name})}
 // Recovery requests waiting for an admin, newest first.
 if(path==='password-resets'){x.auth();if(x.user.role!=='admin')x.fail('Acceso reservado a administración.',403);return x.json(await x.agg('password_resets',[{$match:{status:{$in:['Solicitada','Enviada']}}},{$lookup:{from:'users',localField:'user_id',foreignField:'id',as:'_u'}},{$set:{name:{$first:'$_u.name'},email:{$first:'$_u.email'}}},{$project:{_id:0,_u:0,token_hash:0}},{$sort:{requested:-1}}]))}
 return null;
}

export async function accountPost(x:Ctx,path:string,b:any){
 // Without an email service the person asks here and an admin sends them the link.
 // The answer is the same whether or not the address exists.
 if(path==='forgot'){
  const email=required(b.email,'Correo',254).toLowerCase();
  const u=await x.one('users',{email,active:{$ne:false}},{id:1});
  if(u){const open=await x.one('password_resets',{user_id:u.id,status:{$in:['Solicitada','Enviada']}});const requested=new Date().toISOString();if(open)await x.c('password_resets').updateOne({id:open.id},{$set:{requested}});else await x.c('password_resets').insertOne({id:x.id(),user_id:u.id,status:'Solicitada',requested,token_hash:null,expires:null,issued_by:null})}
  return x.json({ok:true,message:'Si el correo tiene una cuenta, administración te enviará un enlace para crear una contraseña nueva.'});
 }
 if(path==='reset'){
  const pw=newPassword(b.password),hash=await sha256(x.sid(b.token));
  const r=await x.one('password_resets',{token_hash:hash,status:'Enviada',expires:{$gt:Date.now()}});
  if(!r)x.fail('El enlace ya no es válido. Pide uno nuevo a administración.',410);
  const salt=x.id();
  await x.c('users').updateOne({id:r.user_id},{$set:{hash:await passwordHash(pw,salt),salt}});
  await x.c('password_resets').updateOne({id:r.id},{$set:{status:'Usada',token_hash:null}});
  // A new password signs out every device that knew the old one.
  await x.c('sessions').deleteMany({user_id:r.user_id});
  return x.json({ok:true});
 }
 if(path==='reset-link'){
  x.auth();if(x.user.role!=='admin')x.fail('Solo administración genera enlaces de recuperación.',403);
  const target=await x.one('users',{id:x.sid(b.id)},{id:1,name:1});if(!target)x.fail('Usuario no encontrado.',404);
  // The link carries the token; only its hash is stored.
  const token=x.id()+x.id(),fields={status:'Enviada',token_hash:await sha256(token),expires:Date.now()+DAY,issued_by:x.user.id};
  const open=await x.one('password_resets',{user_id:target.id,status:{$in:['Solicitada','Enviada']}});
  if(open)await x.c('password_resets').updateOne({id:open.id},{$set:fields});
  else await x.c('password_resets').insertOne({id:x.id(),user_id:target.id,requested:new Date().toISOString(),...fields});
  return x.json({path:'/restablecer/'+token,expires:fields.expires});
 }
 if(path==='account'){
  x.auth();const set:any={};
  if(b.name!==undefined)set.name=required(b.name,'Nombre',100);
  if(b.photo!==undefined){if(b.photo===null)set.photo=null;else{const fid=x.sid(b.photo);if(!await x.one('files',{id:fid,owner:x.user.id,kind:'avatar'}))x.fail('Sube la foto de nuevo.');set.photo=fid}}
  if(!Object.keys(set).length)x.fail('No hay cambios que guardar.');
  await x.c('users').updateOne({id:x.user.id},{$set:set});
  return x.json({ok:true});
 }
 if(path==='account-password'){
  x.auth();const u=await x.one('users',{id:x.user.id});
  if(await passwordHash(required(b.current,'Contraseña actual',128),u.salt)!==u.hash)x.fail('La contraseña actual no es correcta.',403);
  const pw=newPassword(b.password);if(await passwordHash(pw,u.salt)===u.hash)x.fail('Elige una contraseña distinta de la actual.');
  const salt=x.id();
  await x.c('users').updateOne({id:u.id},{$set:{hash:await passwordHash(pw,salt),salt}});
  // Other devices sign out; this one stays signed in.
  await x.c('sessions').deleteMany({user_id:u.id,token:{$ne:x.token}});
  return x.json({ok:true});
 }
 if(path==='account-deactivate'){
  x.auth();if(x.user.role==='admin')x.fail('Una cuenta de administración no puede desactivarse a sí misma.',403);
  const u=await x.one('users',{id:x.user.id});
  if(await passwordHash(required(b.password,'Contraseña',128),u.salt)!==u.hash)x.fail('La contraseña no es correcta.',403);
  await x.c('users').updateOne({id:u.id},{$set:{active:false}});
  await x.c('sessions').deleteMany({user_id:u.id});
  return x.json({ok:true},200,clearCookie);
 }
 return null;
}
