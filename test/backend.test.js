import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const emulators = process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST;
test('Firebase emulator: authentication, persistence, ownership and transactions', { skip: !emulators, timeout: 120000 }, async t => {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-skillstamp', 'Use the isolated demo-skillstamp project for tests.');
  const { firebaseAuth, db } = await import('../config/firebase.js');
  const port = 3187;
  const base = `http://127.0.0.1:${port}`;
  let server;
  async function start() {
    server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), NODE_ENV: 'test', FIREBASE_PROJECT_ID: 'demo-skillstamp', FIREBASE_WEB_API_KEY: 'demo-key' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    server.stderr.on('data', d => output += d.toString());
    for (let i=0;i<100;i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
      if (server.exitCode !== null) throw new Error(output);
      await delay(100);
    }
    throw new Error(`Server did not start: ${output}`);
  }
  async function stop() { if (!server || server.exitCode !== null) return; const exited = new Promise(r => server.once('exit', r)); server.kill(); await exited; }
  async function api(path, token, method = 'GET', body) {
    const r = await fetch(base + '/api' + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json(), headers: r.headers };
  }
  const identities = [];
  async function account(role) {
    const email = `${role}-${crypto.randomUUID()}@example.com`;
    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'TestPassword123!', returnSecureToken: true }) });
    const identity = await response.json(); assert.ok(identity.idToken, JSON.stringify(identity));
    identities.push(identity.localId);
    return { token: identity.idToken, uid: identity.localId, email };
  }
  try {
    await start();
    const student = await account('student');
    const other = await account('other');
    const employer = await account('employer');
    await t.test('health public; missing and invalid tokens rejected', async () => {
      assert.equal((await api('/health')).status,200);
      assert.equal((await api('/auth/me')).status,401);
      assert.equal((await api('/auth/me','invalid')).status,401);
    });
    await t.test('profile recovery, registration, immutable role', async () => {
      assert.equal((await api('/auth/me',student.token)).data.code,'PROFILE_REQUIRED');
      for (const [identity,role] of [[student,'student'],[other,'student'],[employer,'employer']]) {
        const result = await api('/auth/register', identity.token, 'POST', { name: 'Test Person', role, type: 'Student' });
        assert.equal(result.status,201); assert.equal(result.data.user.id, identity.uid);
        assert.equal(result.data.user.passwordHash,undefined);
      }
      await api('/auth/register',student.token,'POST',{name:'Attempted role change',role:'employer'});
      assert.equal((await api('/auth/me',student.token)).data.user.role,'student');
    });
    await t.test('profile whitelist and authentication-owned email', async () => {
      const r=await api('/profile',student.token,'PATCH',{name:'Owen Demo',email:student.email,skills:['JavaScript'],about:'My profile',location:'Pretoria',role:'employer'});
      assert.equal(r.status,200);assert.equal(r.data.user.role,'student');
      assert.equal((await api('/profile',student.token,'PATCH',{name:'Owen',email:'other@example.com'})).status,400);
    });
    let credential;
    await t.test('challenge answers withheld; ownership and roles enforced',async()=>{
      const c=(await api('/challenges',student.token)).data.challenges;
      assert.ok(c.length);for(const item of c){assert.equal(item.modelAnswer,undefined);assert.equal(item.checklist,undefined);}
      assert.equal((await api('/challenges/excel/start',employer.token,'POST')).status,403);
      const attempt=(await api('/challenges/excel/start',student.token,'POST')).data.attempt;
      assert.equal((await api(`/attempts/${attempt.id}/submit`,other.token,'POST',{answer:'html css javascript'})).status,404);
      const failed=await api(`/attempts/${attempt.id}/submit`,student.token,'POST',{answer:'I do not know.'});
      assert.equal(failed.data.result.pass,false);assert.equal(failed.data.credential,null);
    });
    const answer='Total 4630, average 661, Saturday highest. Recommend more stock.';
    await t.test('concurrent passing attempts issue exactly one credential',async()=>{
      const starts=await Promise.all([1,2].map(()=>api('/challenges/excel/start',student.token,'POST')));
      const submissions=await Promise.all(starts.map(r=>api(`/attempts/${r.data.attempt.id}/submit`,student.token,'POST',{answer,score:0})));
      submissions.forEach(r=>assert.equal(r.status,200));
      assert.equal(submissions[0].data.result.score,100);
      credential=submissions[0].data.credential;
      assert.equal(credential.credentialId,submissions[1].data.credential.credentialId);
      const retry=await api(`/attempts/${starts[0].data.attempt.id}/submit`,student.token,'POST',{answer});
      assert.equal(retry.status,200);
      assert.equal((await api(`/attempts/${starts[0].data.attempt.id}/submit`,student.token,'POST',{answer:'changed'})).status,409);
      const portfolio=(await api('/portfolio',student.token)).data;
      assert.equal(portfolio.stamps.length,1);assert.equal(portfolio.stats.pointsEarned,100);assert.equal(portfolio.results.length,3);
      const notifications=(await api('/notifications',student.token)).data.notifications;
      assert.equal(notifications.length,4);
    });
    await t.test('verification reveals only allowed fields',async()=>{
      assert.equal((await api(`/credentials/${credential.credentialId}/verify`,student.token)).status,403);
      const result=await api(`/credentials/${credential.credentialId}/verify`,employer.token);
      assert.equal(result.data.valid,true);assert.equal(result.data.credential.holderName,'Owen Demo');
      assert.equal(result.data.credential.answer,undefined);assert.equal(result.data.credential.email,undefined);
      assert.equal((await api('/credentials/SS-invalid/verify',employer.token)).status,404);
    });
    await t.test('duplicate application transaction and notification ownership',async()=>{
      const results=await Promise.all([1,2].map(()=>api('/opportunities/o1/apply',student.token,'POST')));
      assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
      assert.equal((await api('/applications',student.token)).data.applications.length,1);
      assert.equal((await api('/applications',other.token)).data.applications.length,0);
      const notice=(await api('/notifications',student.token)).data.notifications[0];
      assert.equal((await api(`/notifications/${notice.id}/read`,other.token,'PATCH')).status,404);
      assert.equal((await api(`/notifications/${notice.id}/read`,student.token,'PATCH')).data.notification.read,true);
    });
    await t.test('database records and login survive an actual Node server restart',async()=>{
      await stop();await start();
      assert.equal((await api('/auth/me',student.token)).data.user.name,'Owen Demo');
      assert.equal((await api('/portfolio',student.token)).data.stamps[0].credentialId,credential.credentialId);
      assert.equal((await api('/applications',student.token)).data.applications.length,1);
      assert.ok((await api('/notifications',student.token)).data.notifications.some(n=>n.read));
    });
    await t.test('malformed JSON rejected and private files not served',async()=>{
      const malformed=await fetch(base+'/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${student.token}`},body:'{'});
      assert.equal(malformed.status,400);
      assert.equal((await fetch(base+'/server.js')).status,404);
      assert.equal((await fetch(base+'/secrets/firebase-service-account.json')).status,404);
    });
    await t.test('revoked and disabled users lose access',async()=>{
      await delay(1100);
      assert.equal((await api('/auth/logout',student.token,'POST')).status,200);
      assert.equal((await api('/auth/me',student.token)).status,401);
      await firebaseAuth.updateUser(other.uid,{disabled:true});
      assert.equal((await api('/auth/me',other.token)).status,401);
    });
  } finally {
    await stop();
    await Promise.all(identities.map(uid=>firebaseAuth.deleteUser(uid).catch(()=>{})));
    await db.terminate();
  }
});
