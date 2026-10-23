import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {readFileSync} from 'node:fs';
import {ensureCollections} from '../db/collections';
import {handle} from '../lib/api';
import {price,stars,date} from '../lib/rules';
import {preparePresentation,presentationIds} from '../lib/presentation-data';
async function fixture(){const server=await MongoMemoryServer.create();const client=await MongoClient.connect(server.getUri());const db=client.db('trade-test');await ensureCollections(db);return {db,env:{MONGO:db,MONGODB_FILES:'true'},close:async()=>{await client.close();await server.stop()}}}
const records:any[]=[];
async function request(env:any,path:string,data?:any,cookie='',expected=200,extra:any={}){const headers:any={...extra};if(cookie)headers.cookie=cookie;let body:any;if(data instanceof FormData)body=data;else if(data!==undefined){body=JSON.stringify(data);headers['content-type']='application/json'}const r=await handle(new Request('https://trade.test/api/'+path,{method:data===undefined?'GET':'POST',headers,body}),env);const result=await r.json();assert.equal(r.status,expected,`${path}: ${JSON.stringify(result)}`);return {data:result as any,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie}}
const credentials=(name:string)=>({name,email:name+'@example.test',password:'Test-password-unique-42'});
const png=readFileSync('public/demo-assets/antes.png');
async function upload(env:any,cookie:string,kind:string,rid?:string,expected=201){const f=new FormData();f.set('file',new File([png],'demo.png',{type:'image/png'}));f.set('kind',kind);if(rid)f.set('request',rid);return request(env,'upload',f,cookie,expected)}
function ok(hu:string,scenario:string){records.push({historia:hu,escenario:scenario,esperado:'Operación permitida con datos persistidos; restricciones respetadas',obtenido:'Aserciones correctas',estado:'aprobado'})}
test('Validaciones de importes, estrellas y fechas',()=>{assert.equal(price('150.59'),150.59);for(const n of [0,-1,'abc',Infinity])assert.throws(()=>price(n));for(const n of [0,6,2.5,'x'])assert.throws(()=>stars(n));assert.throws(()=>date('2026-02-30'));assert.throws(()=>date('2000-01-01'));ok('HU-08, HU-11, HU-19','Valores inválidos rechazados')});

test('Presentación: imágenes recuperables, casos coherentes y datos ajenos conservados',async(t)=>{
 const {db,env,close}=await fixture();t.after(close);
 const normal=await request(env,'register',credentials('cuenta-normal'));
 const saved=(await request(env,'requests',{trade:'Plomería',description:'Solicitud ajena a los ejemplos',date:new Date(Date.now()+86400000).toISOString().slice(0,10)},normal.cookie,201)).data.id;
 const assets={profile:png,document:png,before:png,after:png,trades:{'Plomería':png}};
 await preparePresentation(db,assets);
 await preparePresentation(db,assets);
 assert.ok(await db.collection('requests').findOne({id:saved}));
 assert.equal(await db.collection('requests').countDocuments({id:{$in:presentationIds}}),5);
 const missing=await db.collection('files').aggregate([{$lookup:{from:'file_objects',localField:'id',foreignField:'_id',as:'object'}},{$match:{object:{$size:0}}}]).toArray();assert.equal(missing.length,0);
 const teamEnv={...env,DEMO_ENABLED:'true'};
 const overview=await request(teamEnv,'demo-status');assert.equal(overview.data.prepared,true);
 await request(teamEnv,'demo-catalog',{});
 const client=await request(teamEnv,'demo',{role:'cliente'}),worker=await request(teamEnv,'demo',{role:'proveedor'}),admin=await request(teamEnv,'demo',{role:'admin'});
 const publicPhoto=await handle(new Request('https://trade.test/api/files/catalog-provider-1-avatar'),teamEnv);assert.equal(publicPhoto.status,200);assert.deepEqual(new Uint8Array(await publicPhoto.arrayBuffer()),new Uint8Array(png));
 const localWithEmptyR2=await handle(new Request('https://trade.test/api/files/catalog-provider-1-avatar'),{...teamEnv,BUCKET:{get(){throw Error('No debe consultar R2 cuando MongoDB está seleccionado.')}}});assert.equal(localWithEmptyR2.status,200);
 await request(teamEnv,'files/presentation-applicant-document',undefined,client.cookie,403);
 const privateDocument=await handle(new Request('https://trade.test/api/files/presentation-applicant-document',{headers:{cookie:admin.cookie}}),teamEnv);assert.equal(privateDocument.status,200);
 await request(teamEnv,'quote',{request:'presentation-new',price:900,description:'Diagnóstico y reparación de la conexión.'},worker.cookie,201);
 const detail=(await request(teamEnv,'requests/presentation-new',undefined,client.cookie)).data;assert.equal(detail.quotes.length,1);
 await request(teamEnv,'accept',{id:detail.quotes[0].id},client.cookie);
 await request(teamEnv,'finish',{request:'presentation-assigned'},worker.cookie);
 await request(teamEnv,'confirm',{request:'presentation-finished'},client.cookie);
 await request(teamEnv,'review',{request:'presentation-finished',stars:5,comment:'Resultado revisado.'},client.cookie);
 await request(teamEnv,'approve',{id:'presentation-applicant'},admin.cookie);
 ok('Presentación','Casos preparados con imágenes, permisos, roles y restablecimiento sin borrar solicitudes ajenas');
});
test('Flujo integrado completo de 20 historias y permisos',async(t)=>{const {db,env,close}=await fixture();t.after(close);
 await request(env,'requests',undefined,'',401);
 const client=await request(env,'register',credentials('ana'));ok('HU-01','Registro de cuenta con nombre, correo y contraseña');await request(env,'register',credentials('ana'),'',409);await request(env,'register',{...credentials('short'),password:'abc'},'',400);await request(env,'login',{...credentials('ana'),password:'wrong'},'',401);
 const login=await request(env,'login',credentials('ana'));assert.equal((await request(env,'me',undefined,login.cookie)).data.user.name,'ana');ok('HU-02','Acceso válido y rechazo de contraseña incorrecta');
 const worker=await request(env,'register',credentials('luis')),other=await request(env,'register',credentials('other')),admin=await request(env,'register',credentials('admin'));await db.collection('users').updateOne({email:'admin@example.test'},{$set:{role:'admin'}});const workerId=(await request(env,'me',undefined,worker.cookie)).data.user.id;
 await request(env,'applications',undefined,client.cookie,403);await request(env,'approve',{id:workerId},client.cookie,403);await request(env,'requests?scope=available',undefined,worker.cookie,403);
 const photo=(await upload(env,worker.cookie,'photo')).data.id,document=(await upload(env,worker.cookie,'document')).data.id;
 await request(env,'apply',{trade:'Plomería',experience:'5 años',zone:'León',description:'Plomería residencial',photo,document},worker.cookie,201);assert.equal((await request(env,'me',undefined,worker.cookie)).data.application.status,'Pendiente');assert.equal((await request(env,'providers')).data.length,0);ok('HU-03','Solicitud pendiente con documentos e información obligatoria');
 for(const [cookie,expected] of [[worker.cookie,200],[admin.cookie,200],[other.cookie,403],['',403]] as const){const headers=new Headers();if(cookie)headers.set('cookie',cookie);const response=await handle(new Request('https://trade.test/api/files/'+document,{headers}),env);assert.equal(response.status,expected)}
 await request(env,'approve',{id:workerId},admin.cookie);assert.equal((await request(env,'me',undefined,worker.cookie)).data.application.status,'Aprobada');ok('HU-04','Solo administración aprueba y habilita proveedores');
 await request(env,'requests',{trade:'Plomería',description:'Fuga en mi casa',date:'2099-01-01'},worker.cookie,403);await request(env,'requests',{trade:'Pintura',description:'Pintar recámara',date:'2099-01-01'},worker.cookie,201);ok('Flujo','Un proveedor no publica solicitudes de su propio oficio, pero sí de otros');
 const rita=await request(env,'register',credentials('rita'));const ritaPhoto=(await upload(env,rita.cookie,'photo')).data.id,ritaDoc=(await upload(env,rita.cookie,'document')).data.id;const ritaApply={trade:'Electricidad',experience:'2 años',zone:'León',description:'Instalaciones',photo:ritaPhoto,document:ritaDoc};
 await request(env,'apply',ritaApply,rita.cookie,201);assert.equal((await request(env,'applications',undefined,admin.cookie)).data[0].status,'Pendiente');await request(env,'reject',{id:(await request(env,'me',undefined,rita.cookie)).data.user.id},client.cookie,403);await request(env,'reject',{id:(await request(env,'me',undefined,rita.cookie)).data.user.id},admin.cookie,400);await request(env,'reject',{id:(await request(env,'me',undefined,rita.cookie)).data.user.id,reason:'La identificación no se lee.'},admin.cookie);assert.equal((await request(env,'me',undefined,rita.cookie)).data.application.reason,'La identificación no se lee.');assert.equal((await request(env,'me',undefined,rita.cookie)).data.application.status,'Rechazada');await request(env,'apply',ritaApply,rita.cookie,201);assert.equal((await request(env,'me',undefined,rita.cookie)).data.application.status,'Pendiente');await request(env,'apply',ritaApply,rita.cookie,409);ok('Flujo','Administración rechaza registros pendientes; el proveedor puede volver a enviarlo');
 await request(env,'users',undefined,client.cookie,403);const people=(await request(env,'users',undefined,admin.cookie)).data;assert.ok(people.length>=4);assert.ok(people.every((p:any)=>p.hash===undefined&&p.salt===undefined));assert.equal(people.find((p:any)=>p.id===workerId).provider_status,'Aprobada');ok('Administración','Directorio de clientes y proveedores solo para administración y sin contraseñas');
 await request(env,'requests',{trade:'Pintura',description:'Prueba de administración',date:'2099-01-01'},admin.cookie,403);ok('Administración','Las cuentas de administración no publican solicitudes de servicio');
 const adminPhoto=(await upload(env,admin.cookie,'photo')).data.id,adminDoc=(await upload(env,admin.cookie,'document')).data.id;await request(env,'apply',{trade:'Pintura',experience:'1 año',zone:'León',description:'Prueba',photo:adminPhoto,document:adminDoc},admin.cookie,403);assert.equal((await request(env,'me',undefined,admin.cookie)).data.application,null);ok('Administración','Las cuentas de administración no se registran como proveedores');
 const found=(await request(env,'providers?trade='+encodeURIComponent('Plomería'))).data;assert.equal(found.length,1);assert.equal((await request(env,'providers?trade='+encodeURIComponent('Pintura'))).data.length,0);ok('HU-05','Filtro por oficio y exclusión de perfiles pendientes');const profile=(await request(env,'providers/'+workerId)).data;for(const key of ['name','photo','trade','experience','description','status'])assert.ok(profile[key]);assert.equal(profile.document,undefined);ok('HU-06','Perfil público completo sin documento privado');await request(env,'files/'+document,undefined,other.cookie,403);
 const future='2099-01-01';const rid=(await request(env,'requests',{trade:'Plomería',description:'Fuga bajo el lavabo',date:future},client.cookie,201)).data.id;ok('HU-08','Solicitud asociada a su cliente');await request(env,'requests',{trade:'Otro',description:'Fuga',date:future},client.cookie,400);
 const problem=(await upload(env,client.cookie,'problem',rid)).data.id;assert.ok((await request(env,'requests/'+rid,undefined,client.cookie)).data.files.some((f:any)=>f.id===problem));assert.equal((await request(env,'requests?scope=mine',undefined,client.cookie)).data.find((item:any)=>item.id===rid).problem_file,problem);ok('HU-09','Imagen almacenada y asociada a solicitud');await upload(env,other.cookie,'problem',rid,403);
 const bad=new FormData();bad.set('file',new File(['<script>bad</script>'],'fake.png',{type:'image/png'}));bad.set('kind','photo');await request(env,'upload',bad,client.cookie,400);
 const otherTrade=(await request(env,'requests',{trade:'Pintura',description:'Pintar cocina',date:future},client.cookie,201)).data.id;const available=(await request(env,'requests?scope=available',undefined,worker.cookie)).data;assert.deepEqual(available.map((r:any)=>r.id),[rid]);assert.equal(available[0].problem_file,problem);ok('HU-10','Solo solicitudes activas del oficio registrado');await request(env,'quote',{request:otherTrade,price:50,description:'Pintar'},worker.cookie,403);
 await request(env,'quote',{request:rid,price:850,description:'Reparación y materiales'},worker.cookie,201);ok('HU-11','Cotización con precio y alcance persistida');await request(env,'quote',{request:rid,price:850,description:'Duplicada'},worker.cookie,409);const r=(await request(env,'requests/'+rid,undefined,client.cookie)).data;assert.equal(r.quotes[0].price,850);ok('HU-12','Propietario consulta propuestas recibidas');await request(env,'requests/'+rid,undefined,other.cookie,403);
 await request(env,'accept',{id:r.quotes[0].id},other.cookie,403);await request(env,'accept',{id:r.quotes[0].id},client.cookie);assert.equal((await request(env,'requests/'+rid,undefined,client.cookie)).data.status,'Asignada');assert.equal((await request(env,'requests?scope=assigned',undefined,worker.cookie)).data.find((item:any)=>item.id===rid).problem_file,problem);await request(env,'accept',{id:r.quotes[0].id},client.cookie,409);ok('HU-13','Aceptación única por el propietario');
 await request(env,'confirm',{request:rid},client.cookie,409);await request(env,'review',{request:rid,stars:5},client.cookie,403);await upload(env,other.cookie,'before',rid,403);
 await upload(env,worker.cookie,'before',rid);ok('HU-14','Evidencia inicial solo del proveedor asignado');await upload(env,worker.cookie,'after',rid);ok('HU-15','Evidencia final solo del proveedor asignado');const evidence=(await request(env,'requests/'+rid,undefined,client.cookie)).data.files;assert.ok(evidence.some((f:any)=>f.kind==='before'));assert.ok(evidence.some((f:any)=>f.kind==='after'));ok('HU-16','Evidencias antes y después del mismo servicio disponibles');
 await request(env,'finish',{request:rid},client.cookie,403);await request(env,'finish',{request:rid},worker.cookie);assert.equal((await request(env,'requests/'+rid,undefined,client.cookie)).data.status,'Terminado');ok('HU-17','Proveedor marca terminado');await request(env,'confirm',{request:rid},worker.cookie,403);await request(env,'confirm',{request:rid},client.cookie);assert.equal((await request(env,'requests/'+rid,undefined,client.cookie)).data.status,'Completado');ok('HU-18','Cliente confirma completado');
 await request(env,'review',{request:rid,stars:6},client.cookie,400);await request(env,'review',{request:rid,stars:5},client.cookie);assert.equal((await request(env,'requests/'+rid,undefined,client.cookie)).data.review.stars,5);ok('HU-19','Estrellas válidas asociadas a servicio y proveedor');await request(env,'review',{request:rid,comment:'Puntual y claro con el precio.'},client.cookie);assert.equal((await request(env,'requests/'+rid,undefined,client.cookie)).data.review.comment,'Puntual y claro con el precio.');ok('HU-20','Comentario independiente sin perder la calificación');assert.equal((await request(env,'providers/'+workerId)).data.works.length,2);ok('HU-07','Trabajos completados publicados en perfil');
 await db.collection('files').updateOne({id:photo},{$set:{url:'/media/'+photo+'.webp'}});assert.equal((await request(env,'providers')).data.find((p:any)=>p.id===workerId).photo_url,'/media/'+photo+'.webp');assert.ok((await request(env,'providers/'+workerId)).data.works.every((w:any)=>'id' in w));ok('Rendimiento','Fotografías públicas con URL directa; documentos privados siguen protegidos');
 await request(env,'requests',{trade:'Plomería',description:'CSRF',date:future},client.cookie,403,{origin:'https://other.test'});await request(env,'demo',{role:'admin'},'',403);await request(env,'approve',{id:{$ne:null}},admin.cookie,400);await request(env,'confirm',{request:{$ne:null}},client.cookie,400);await request(env,'logout',{},client.cookie);assert.equal((await request(env,'me',undefined,client.cookie)).data.user,null);ok('Seguridad','Acceso por rol, privacidad de documentos, cierre de sesión y origen');
 const teamEnv={...env,DEMO_ENABLED:'true'};
 await request(teamEnv,'demo',{role:'owner'},'',400);
 for(const role of ['cliente','proveedor','admin']){const demoSession=await request(teamEnv,'demo',{role});const identity=(await request(teamEnv,'me',undefined,demoSession.cookie)).data;assert.equal(identity.user.id,'demo-'+role);if(role==='admin')await request(teamEnv,'applications',undefined,demoSession.cookie);}
 await request({...env,DEMO_ENABLED:'false'},'demo',{role:'admin'},'',403);
 // Several trades per provider: catalog, opportunities and own-trade rule use the whole list.
 const multi=await request(env,'register',credentials('multi'));const multiId=(await request(env,'me',undefined,multi.cookie)).data.user.id;const multiPhoto=(await upload(env,multi.cookie,'photo')).data.id,multiDoc=(await upload(env,multi.cookie,'document')).data.id;
 await request(env,'apply',{trades:[],experience:'x',zone:'León',description:'x',photo:multiPhoto,document:multiDoc},multi.cookie,400);await request(env,'apply',{trades:['Pintura','Cerrajería','Pintura'],experience:'4 años',zone:'León',description:'Pintura y cerraduras',photo:multiPhoto,document:multiDoc},multi.cookie,201);
 const multiApp=(await request(env,'me',undefined,multi.cookie)).data.application;assert.deepEqual(multiApp.trades,['Pintura','Cerrajería']);assert.equal(multiApp.trade,'Pintura');await request(env,'approve',{id:multiId},admin.cookie);
 for(const t of ['Pintura','Cerrajería'])assert.ok((await request(env,'providers?trade='+encodeURIComponent(t))).data.some((p:any)=>p.id===multiId));
 const lockReq=(await request(env,'requests',{trade:'Cerrajería',description:'Cambiar chapa',date:'2099-01-01'},other.cookie,201)).data.id;assert.ok((await request(env,'requests?scope=available',undefined,multi.cookie)).data.some((r:any)=>r.id===lockReq));await request(env,'quote',{request:lockReq,price:300,description:'Chapa nueva'},multi.cookie,201);
 await request(env,'requests',{trade:'Cerrajería',description:'Propio',date:'2099-01-01'},multi.cookie,403);ok('Oficios','Un proveedor ofrece varios oficios: catálogo, oportunidades, cotización y regla de oficio propio');
 // Direct requests: asked to one provider, only that provider sees, opens and quotes them.
 const painter=await request(env,'register',credentials('painter'));const painterId=(await request(env,'me',undefined,painter.cookie)).data.user.id;const painterPhoto=(await upload(env,painter.cookie,'photo')).data.id,painterDoc=(await upload(env,painter.cookie,'document')).data.id;
 await request(env,'apply',{trades:['Pintura'],experience:'3 años',zone:'León',description:'Pintura',photo:painterPhoto,document:painterDoc},painter.cookie,201);await request(env,'approve',{id:painterId},admin.cookie);
 await request(env,'requests',{trade:'Plomería',description:'No la ofrece',date:'2099-01-01',provider:multiId},other.cookie,400);await request(env,'requests',{trade:'Pintura',description:'Inexistente',date:'2099-01-01',provider:'no-existe'},other.cookie,404);await request(env,'requests',{trade:'Pintura',description:'Objeto',date:'2099-01-01',provider:{$ne:null}},other.cookie,400);
 const direct=(await request(env,'requests',{trade:'Pintura',description:'Pintar sala, solo para multi',date:'2099-01-01',provider:multiId},other.cookie,201)).data.id;
 assert.ok((await request(env,'requests?scope=available',undefined,multi.cookie)).data.some((r:any)=>r.id===direct));assert.ok(!(await request(env,'requests?scope=available',undefined,painter.cookie)).data.some((r:any)=>r.id===direct));
 await request(env,'requests/'+direct,undefined,painter.cookie,403);await request(env,'quote',{request:direct,price:500,description:'Intruso'},painter.cookie,403);await request(env,'quote',{request:direct,price:600,description:'Pintura de sala'},multi.cookie,201);
 assert.equal((await request(env,'requests/'+direct,undefined,other.cookie)).data.target_name,'multi');assert.equal((await request(env,'requests?scope=mine',undefined,other.cookie)).data.find((r:any)=>r.id===direct).target_name,'multi');ok('Solicitud directa','El cliente pide a un proveedor concreto; solo ese proveedor la ve y cotiza');
 // Active flag is required: the database rejects users and providers without it.
 await assert.rejects(db.collection('users').insertOne({id:'sin-activo',name:'Sin activo',email:'sin-activo@example.test',hash:'x',salt:'x',role:'cliente'}),(e:any)=>e.code===121);ok('Activo','La base de datos rechaza usuarios sin el campo active');
 // Active flag: deactivated providers disappear and cannot quote; deactivated accounts cannot log in.
 assert.equal((await request(env,'me',undefined,worker.cookie)).data.application.active,true);
 await db.collection('providers').updateOne({id:workerId},{$set:{active:false}});assert.ok(!(await request(env,'providers')).data.some((p:any)=>p.id===workerId));await request(env,'providers/'+workerId,undefined,'',404);await request(env,'requests?scope=available',undefined,worker.cookie,403);assert.equal((await request(env,'me',undefined,worker.cookie)).data.user.id,workerId);
 await db.collection('providers').updateOne({id:workerId},{$set:{active:true}});assert.ok((await request(env,'providers')).data.some((p:any)=>p.id===workerId));ok('Activo','Proveedor desactivado oculto del catálogo y sin oportunidades; se puede reactivar');
 await db.collection('users').updateOne({email:'other@example.test'},{$set:{active:false}});assert.equal((await request(env,'me',undefined,other.cookie)).data.user,null);await request(env,'login',credentials('other'),'',403);await db.collection('users').updateOne({email:'other@example.test'},{$set:{active:true}});await request(env,'login',credentials('other'));ok('Activo','Cuenta desactivada sin sesión ni acceso; se puede reactivar');
 const otherId=(await db.collection('users').findOne({email:'other@example.test'}))!.id,adminId=(await db.collection('users').findOne({email:'admin@example.test'}))!.id;const otherLogin=await request(env,'login',credentials('other'));
 await request(env,'account-active',{id:otherId,active:false},worker.cookie,403);await request(env,'account-active',{id:adminId,active:false},admin.cookie,403);await request(env,'provider-active',{id:otherId,active:false},admin.cookie,409);await request(env,'account-active',{id:otherId,active:'no'},admin.cookie,400);
 await request(env,'account-active',{id:otherId,active:false},admin.cookie);assert.equal((await request(env,'me',undefined,otherLogin.cookie)).data.user,null);assert.equal((await request(env,'users',undefined,admin.cookie)).data.find((p:any)=>p.id===otherId).active,false);await request(env,'account-active',{id:otherId,active:true},admin.cookie);await request(env,'login',credentials('other'));
 await request(env,'provider-active',{id:workerId,active:false},admin.cookie);assert.ok(!(await request(env,'providers')).data.some((p:any)=>p.id===workerId));assert.equal((await request(env,'users',undefined,admin.cookie)).data.find((p:any)=>p.id===workerId).provider_active,false);await request(env,'provider-active',{id:workerId,active:true},admin.cookie);assert.ok((await request(env,'providers')).data.some((p:any)=>p.id===workerId));ok('Administración','Administración desactiva y reactiva cuentas y proveedores; nunca otra cuenta de administración');
 console.log('TRADE_TEST_REPORT='+JSON.stringify(records));});
test('Cuenta: ajustes, contraseña, desactivación y recuperación',async(t)=>{const {db,env,close}=await fixture();t.after(close);
 const ana=await request(env,'register',credentials('ana'));const admin=await request(env,'register',credentials('jefa'));await db.collection('users').updateOne({email:'jefa@example.test'},{$set:{role:'admin'}});
 const anaId=(await request(env,'me',undefined,ana.cookie)).data.user.id;assert.ok((await db.collection('users').findOne({id:anaId}))!.created_at);
 // Name and avatar
 await request(env,'account',{name:'Ana López'},ana.cookie);assert.equal((await request(env,'me',undefined,ana.cookie)).data.user.name,'Ana López');
 await request(env,'account',{},ana.cookie,400);await request(env,'account',{name:'x'},'',401);
 const avatar=(await upload(env,ana.cookie,'avatar')).data.id;await request(env,'account',{photo:avatar},ana.cookie);assert.equal((await request(env,'me',undefined,ana.cookie)).data.user.photo_url,'/api/files/'+avatar);
 const otherAvatar=(await upload(env,admin.cookie,'avatar')).data.id;await request(env,'account',{photo:otherAvatar},ana.cookie,400);
 await request(env,'account',{photo:null},ana.cookie);assert.equal((await request(env,'me',undefined,ana.cookie)).data.user.photo,null);
 // Password change keeps this session and closes the others
 const second=await request(env,'login',credentials('ana'));
 await request(env,'account-password',{current:'mal',password:'Otra-clave-segura-1'},ana.cookie,403);await request(env,'account-password',{current:credentials('ana').password,password:'corta'},ana.cookie,400);
 await request(env,'account-password',{current:credentials('ana').password,password:'Otra-clave-segura-1'},ana.cookie);
 assert.ok((await request(env,'me',undefined,ana.cookie)).data.user);assert.equal((await request(env,'me',undefined,second.cookie)).data.user,null);
 await request(env,'login',credentials('ana'),'',401);await request(env,'login',{...credentials('ana'),password:'Otra-clave-segura-1'});
 // Recovery: request, admin issues a link, link sets a new password once
 const forgot=(await request(env,'forgot',{email:'ana@example.test'})).data;const unknown=(await request(env,'forgot',{email:'nadie@example.test'})).data;assert.equal(forgot.message,unknown.message);
 await request(env,'password-resets',undefined,ana.cookie,403);const open=(await request(env,'password-resets',undefined,admin.cookie)).data;assert.equal(open.length,1);assert.equal(open[0].email,'ana@example.test');assert.equal(open[0].token_hash,undefined);
 await request(env,'reset-link',{id:anaId},ana.cookie,403);const link=(await request(env,'reset-link',{id:anaId},admin.cookie)).data.path as string;const token=link.split('/').pop()!;
 assert.ok(!(await db.collection('password_resets').findOne({token_hash:token})));
 assert.deepEqual((await request(env,'reset/'+token)).data,{valid:true,name:'Ana López'});assert.equal((await request(env,'reset/otro')).data.valid,false);
 await request(env,'reset',{token,password:'corta'},'',400);await request(env,'reset',{token,password:'Clave-recuperada-22'});await request(env,'reset',{token,password:'Clave-recuperada-33'},'',410);
 await request(env,'login',{...credentials('ana'),password:'Clave-recuperada-22'});
 const expired=(await request(env,'reset-link',{id:anaId},admin.cookie)).data.path.split('/').pop();await db.collection('password_resets').updateOne({user_id:anaId,status:'Enviada'},{$set:{expires:Date.now()-1}});await request(env,'reset',{token:expired,password:'Clave-vencida-44'},'',410);
 // Closing one's own account; admins cannot
 await request(env,'account-deactivate',{password:'x'},admin.cookie,403);
 const session=await request(env,'login',{...credentials('ana'),password:'Clave-recuperada-22'});await request(env,'account-deactivate',{password:'mal'},session.cookie,403);
 await request(env,'account-deactivate',{password:'Clave-recuperada-22'},session.cookie);assert.equal((await request(env,'me',undefined,session.cookie)).data.user,null);
 await request(env,'login',{...credentials('ana'),password:'Clave-recuperada-22'},'',403);
});
test('Administración: tablero, ficha de persona, motivos y bitácora',async(t)=>{const {db,env,close}=await fixture();t.after(close);
 const boss=await request(env,'register',credentials('jefa'));await db.collection('users').updateOne({email:'jefa@example.test'},{$set:{role:'admin'}});
 const luis=await request(env,'register',credentials('luis'));const luisId=(await request(env,'me',undefined,luis.cookie)).data.user.id;
 const photo=(await upload(env,luis.cookie,'photo')).data.id,document=(await upload(env,luis.cookie,'document')).data.id;
 await request(env,'apply',{trades:['Plomería'],experience:'5 años',zone:'León',description:'Plomería',photo,document},luis.cookie,201);
 await request(env,'admin/summary',undefined,luis.cookie,403);
 let summary=(await request(env,'admin/summary',undefined,boss.cookie)).data;assert.equal(summary.attention.registrations,1);assert.equal(summary.roles.admin,1);assert.equal(summary.week.people,2);
 await request(env,'approve',{id:luisId},boss.cookie);
 await request(env,'provider-active',{id:luisId,active:false,reason:'Quejas por puntualidad'},boss.cookie);assert.equal((await request(env,'me',undefined,luis.cookie)).data.application.deactivated_reason,'Quejas por puntualidad');
 await request(env,'provider-active',{id:luisId,active:true},boss.cookie);
 await request(env,'account-active',{id:luisId,active:false,reason:'Cuenta duplicada'},boss.cookie);
 const blocked=await handle(new Request('https://trade.test/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(credentials('luis'))}),env);assert.equal(blocked.status,403);assert.match((await blocked.json() as any).error,/Cuenta duplicada/);
 await request(env,'account-active',{id:luisId,active:true},boss.cookie);
 const card=(await request(env,'admin/people/'+luisId,undefined,boss.cookie)).data;
 assert.equal(card.person.email,'luis@example.test');assert.equal(card.person.hash,undefined);assert.equal(card.registration.status,'Aprobada');assert.equal(card.registration.decided_by,(await db.collection('users').findOne({email:'jefa@example.test'}))!.id);
 assert.deepEqual(card.history.map((h:any)=>h.action),['account.activate','account.deactivate','provider.activate','provider.deactivate','provider.approve']);
 assert.equal(card.history[1].detail,'Cuenta duplicada');assert.equal(card.history[0].actor_name,'jefa');
 await request(env,'admin/people/nadie',undefined,boss.cookie,404);
 summary=(await request(env,'admin/summary',undefined,boss.cookie)).data;assert.equal(summary.attention.registrations,0);assert.equal(summary.activity.length,5);
});
