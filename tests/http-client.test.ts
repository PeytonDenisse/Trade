import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,readApiResponse} from '../lib/http-client';

test('El cliente presenta errores de texto y HTML sin intentar mostrarlos como JSON',async()=>{
  await assert.rejects(readApiResponse(new Response('Payload Too Large',{status:413})),/tamaño permitido.*5 MB/);
  await assert.rejects(readApiResponse(new Response('<html>Worker exceeded resource limits</html>',{status:503})),/temporalmente/);
  await assert.rejects(readApiResponse(Response.json({error:'Correo o contraseña incorrectos.'},{status:401})),/Correo o contraseña/);
  await assert.rejects(readApiResponse(new Response('<html>Error</html>')),/respuesta inesperada/);
  assert.deepEqual(await readApiResponse(Response.json({user:null})),{user:null});
});

test('Las lecturas de sesión envían cookies del mismo origen y evitan caché',async(t)=>{
  const fetchMock=t.mock.method(globalThis,'fetch',async(_url:any,options:any)=>{
    assert.equal(options.credentials,'same-origin');
    assert.equal(options.cache,'no-store');
    return Response.json({user:{id:'cliente-1'}});
  });
  assert.equal((await api('me')).user.id,'cliente-1');
  assert.equal(fetchMock.mock.calls[0].arguments[0],'/api/me');
});
