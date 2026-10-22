import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const base = new URL(process.argv[2] || 'https://trade.trade-demo-eexxttrraa.workers.dev');
if (base.protocol !== 'https:') throw new Error('Deployment checks require HTTPS.');

for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    for (const path of ['/', '/api/me', '/api/providers']) {
      const response = await fetch(new URL(path, base), {
        signal: AbortSignal.timeout(15_000),
        headers: { 'Cache-Control': 'no-cache' },
      });
      assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
      if (path === '/') assert.match(await response.text(), /trade/i);
      else {
        const body = await response.json();
        if (path === '/api/providers') assert.ok(Array.isArray(body), 'Expected provider list from MongoDB');
        else assert.equal(body.user, null, 'Anonymous request must not be authenticated');
      }
    }
    {
      const enter=role=>fetch(new URL('/api/demo',base),{method:'POST',headers:{'Content-Type':'application/json',Origin:base.origin},body:JSON.stringify({role}),signal:AbortSignal.timeout(15_000)});
      for(const role of ['cliente','proveedor','admin']){
        const response=await enter(role);
        assert.equal(response.status,200,'Team demo role must be available');
        const cookie=response.headers.get('set-cookie')?.split(';')[0];
        assert.ok(cookie,'Demo must create a session');
        const me=await fetch(new URL('/api/me',base),{headers:{Cookie:cookie},signal:AbortSignal.timeout(15_000)});
        assert.equal(me.status,200);
        assert.equal((await me.json()).user.id,'demo-'+role);
        if(role==='admin')assert.equal((await fetch(new URL('/api/applications',base),{headers:{Cookie:cookie},signal:AbortSignal.timeout(15_000)})).status,200);
      }
      console.log('Team demo verified: direct client, provider and administrator access.');
    }
    console.log(`Deployment verified: ${base.origin} (page, session, MongoDB).`);
    break;
  } catch (error) {
    if (attempt === 5) throw error;
    console.log(`Deployment check ${attempt}/5 failed; retrying in 5 seconds.`);
    await setTimeout(5_000);
  }
}
