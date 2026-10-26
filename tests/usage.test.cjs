const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {createDB} = require('./usage-db.cjs');
const origin = 'https://word.test';
const owner = {'oai-authenticated-user-id':'owner-site-id','oai-authenticated-user-email':'owner@example.test'};
const modulePromise = import('../worker/index.mjs');
async function fixture() {
  const {handle} = await modulePromise;
  const env = {DB:createDB(),ADMIN_EMAIL:'owner@example.test',LEARNER_LINK_KEY:'test-key-only-not-a-production-secret-123456789'};
  const asset = (route, request, headers) => new Response(route,{headers});
  async function call(route,{method='GET',data,headers={},admin=false,cookie}={}) {
    const h = {...(admin?owner:{}),...headers};
    if (!['GET','HEAD'].includes(method) && !('Origin' in h)) h.Origin=origin;
    if (cookie) h.Cookie=cookie;
    if (data!==undefined) h['Content-Type']='application/json';
    return handle(new Request(origin+route,{method,headers:h,body:data===undefined?undefined:JSON.stringify(data)}),env,asset);
  }
  async function enroll() {
    const result=await call('/api/admin/students',{method:'POST',admin:true,data:{label:'תלמיד 01'}});
    assert.equal(result.status,201);const student=await result.json();
    const token=new URL(student.link).hash.slice('#learner='.length);
    const joined=await call('/api/usage/enroll',{method:'POST',data:{token}});
    assert.equal(joined.status,200);
    return {...student,token,cookie:joined.headers.get('Set-Cookie').split(';')[0],setCookie:joined.headers.get('Set-Cookie')};
  }
  return {env,call,enroll,close:()=>env.DB.close()};
}
const report = (overrides={}) => ({id:crypto.randomUUID(),activeMs:15000,answers:2,completed:1,...overrides});

test('USAGE security: anonymous/other-account access denied on page, alias, and every admin operation',async()=>{
  const f=await fixture();try{
    for(const route of ['/admin','/admin/','/admin.html']) {
      const r=await f.call(route);assert.equal(r.status,302);assert.match(r.headers.get('Location'),/^\/signin-with-chatgpt/);
      assert.equal((await f.call(route,{headers:{...owner,'oai-authenticated-user-email':'other@example.test'}})).status,403);
    }
    for(const [route,method] of [['/api/admin/students','GET'],['/api/admin/students','POST'],['/api/admin/students/'+ 'a'.repeat(32)+'/link','POST'],['/api/admin/students/'+ 'a'.repeat(32)+'/revoke','POST'],['/api/admin/students/'+ 'a'.repeat(32),'DELETE']]) {
      assert.equal((await f.call(route,{method,data:method==='POST'?{}:undefined})).status,401);
      assert.equal((await f.call(route,{method,data:method==='POST'?{}:undefined,headers:{...owner,'oai-authenticated-user-email':'other@example.test'}})).status,403);
    }
    assert.equal((await f.call('/admin',{admin:true})).status,200);
    assert.equal((await f.call('/api/admin/students',{headers:{'oai-authenticated-user-email':owner['oai-authenticated-user-email']}})).status,401);
  }finally{f.close();}
});
test('USAGE links: signed fragment, secure HttpOnly cookie, no admin access or learning data',async()=>{
  const f=await fixture();try{
    const s=await f.enroll();assert.match(s.link,/#learner=/);assert.match(s.setCookie,/Secure; HttpOnly; SameSite=Strict/);
    assert.equal((await f.call('/api/admin/students',{cookie:s.cookie})).status,401);
    assert.deepEqual(await (await f.call('/api/usage/status',{cookie:s.cookie})).json(),{enabled:true});
    assert.deepEqual(await (await f.call('/api/usage/status')).json(),{enabled:false});
    assert.equal((await f.call('/api/usage/enroll',{method:'POST',data:{token:s.token.slice(0,-2)+'xx'}})).status,403);
    const listing=await (await f.call('/api/admin/students',{admin:true})).json();
    assert.doesNotMatch(JSON.stringify(listing),/token|signature|example.test|learner=/);
    assert.equal((await f.call('/api/usage/enroll',{method:'POST',data:{token:s.token,name:'PII'}})).status,403);
  }finally{f.close();}
});
test('USAGE security: same-origin JSON mutations, bounded input and strict field allowlist',async()=>{
  const f=await fixture();try{
    assert.equal((await f.call('/api/admin/students',{method:'POST',admin:true,data:{label:'A'},headers:{Origin:'https://evil.test'}})).status,403);
    assert.equal((await f.call('/api/admin/students',{method:'POST',admin:true,data:{label:'<img src=x onerror=alert(1)>'}})).status,400);
    assert.equal((await f.call('/api/admin/students',{method:'POST',admin:true,data:{label:'A',email:'no'}})).status,400);
    assert.equal((await f.call('/api/admin/students',{method:'POST',admin:true,data:{label:'a'.repeat(3000)}})).status,400);
    const s=await f.enroll();
    for(const overrides of [{activeMs:60001},{answers:-1},{completed:4},{answers:1.5},{answerText:'hello'},{activeMs:0,answers:0,completed:0}]) {
      assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report(overrides)})).status,400);
    }
    assert.equal((await f.call('/api/usage/report',{method:'POST',data:report()})).status,403);
  }finally{f.close();}
});
test('USAGE totals: retries are idempotent, two tabs cannot double-count time, aggregation works',async()=>{
  const f=await fixture();try{
    const s=await f.enroll(), now=Date.now();
    f.env.DB.raw.prepare('UPDATE students SET meter_at = ? WHERE id = ?').run(now-16000,s.id);
    const payload=report();
    assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:payload})).status,200);
    await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:payload});
    await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report({answers:1,completed:0})});
    const data=await (await f.call('/api/admin/students',{admin:true})).json();const student=data.students[0];
    assert.equal(student.answers,3);assert.equal(student.completed,1);assert.ok(student.active_ms>=15000&&student.active_ms<17000);
    assert.equal(data.daily.length,1);assert.equal(data.daily[0].active_ms,student.active_ms);
  }finally{f.close();}
});
test('USAGE revoke and deletion invalidate existing links/cookies and remove all records',async()=>{
  const f=await fixture();try{
    const s=await f.enroll();await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()});
    assert.equal((await f.call(`/api/admin/students/${s.id}/revoke`,{method:'POST',admin:true,data:{}})).status,200);
    assert.equal((await f.call('/api/usage/enroll',{method:'POST',data:{token:s.token}})).status,403);
    assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()})).status,403);
    assert.equal((await f.call(`/api/admin/students/${s.id}/link`,{method:'POST',admin:true,data:{}})).status,409);
    await f.call(`/api/admin/students/${s.id}`,{method:'DELETE',admin:true});
    for(const table of ['students','daily_usage','reports'])assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0);
  }finally{f.close();}
});
test('USAGE retention and write limits: expired aggregates/dedup IDs removed, burst bounded',async()=>{
  const f=await fixture();try{
    const s=await f.enroll();
    f.env.DB.raw.prepare('INSERT INTO daily_usage VALUES (?, ?, 1000, 1, 0)').run(s.id,'2020-01-01');
    f.env.DB.raw.prepare('INSERT INTO reports VALUES (?, ?, ?, 1)').run(s.id,crypto.randomUUID(),Date.now()-2*86400000);
    const result=await (await f.call('/api/admin/students?days=90',{admin:true})).json();assert.equal(result.daily.length,0);
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM reports').get().n,0);
    for(let i=0;i<12;i++)assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()})).status,200);
    assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()})).status,429);
    assert.equal((await f.call('/api/admin/students?days=999',{admin:true})).status,400);
  }finally{f.close();}
});
test('USAGE forget clears only device cookie and does not delete shared history',async()=>{
  const f=await fixture();try{
    const s=await f.enroll(),r=await f.call('/api/usage/forget',{method:'POST',cookie:s.cookie,data:{}});
    assert.match(r.headers.get('Set-Cookie'),/Max-Age=0/);
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM students').get().n,1);
  }finally{f.close();}
});

async function client({token=true}={}) {
  const {JSDOM}=require('jsdom');let now=0,visible=true,focus=true,fail=false;
  const dom=new JSDOM('<footer></footer>',{url:origin+(token?'#learner=sample-token':''),runScripts:'outside-only'}),w=dom.window;
  Object.defineProperty(w.performance,'now',{value:()=>now});
  Object.defineProperty(w.document,'visibilityState',{get:()=>visible?'visible':'hidden'});w.document.hasFocus=()=>focus;
  const sent=[],intervals=[];w.setInterval=fn=>intervals.push(fn);w.crypto.randomUUID=crypto.randomUUID.bind(crypto);
  w.fetch=async(url,opts)=>{const data=opts.body?JSON.parse(opts.body):null;sent.push({url,data});if(fail&&url.endsWith('report'))throw Error('offline');return {ok:true,status:200,json:async()=>({enabled:token})};};
  w.eval(fs.readFileSync(path.join(__dirname,'../dist/usage.js'),'utf8'));
  const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};await settle();
  return {w,sent,tick:async ms=>{now+=ms;intervals[0]();await settle();},hidden:async value=>{visible=!value;w.document.dispatchEvent(new w.Event('visibilitychange'));await settle();},blur:async()=>{focus=false;w.dispatchEvent(new w.Event('blur'));await settle();},offline:value=>{fail=value;},close:()=>w.close()};
}
test('USAGE client: idle open tab counts zero, active seconds stop at 60s, background counts zero',async()=>{
  const c=await client();try{
    assert.equal(c.w.location.hash,'');await c.tick(120000);assert.equal(c.sent.filter(s=>s.url.endsWith('report')).length,0);
    c.w.WordUsage.answer();await c.tick(15000);await c.tick(55000);
    const reports=c.sent.filter(s=>s.url.endsWith('report'));assert.equal(reports.reduce((n,r)=>n+r.data.activeMs,0),60000);assert.equal(reports[0].data.answers,1);
    await c.hidden(true);await c.tick(120000);assert.equal(c.sent.filter(s=>s.url.endsWith('report')).length,2);
    await c.hidden(false);await c.tick(15000);assert.equal(c.sent.filter(s=>s.url.endsWith('report')).length,2);
    c.w.WordUsage.answer();await c.tick(5000);await c.blur();await c.tick(30000);
    assert.equal(c.sent.filter(s=>s.url.endsWith('report')).at(-1).data.activeMs,5000);
  }finally{c.close();}
});
test('USAGE client: retry keeps batch ID, fresh answers stay separate; unlinked visitor not tracked',async()=>{
  const c=await client();try{
    c.offline(true);c.w.WordUsage.answer();await c.tick(15000);const first=c.sent.at(-1).data;
    c.w.WordUsage.answer();c.offline(false);await c.tick(15000);assert.deepEqual(c.sent.at(-1).data,first);
    await c.tick(15000);assert.notEqual(c.sent.at(-1).data.id,first.id);assert.equal(c.sent.at(-1).data.answers,1);
    assert.deepEqual(Object.keys(first).sort(),['activeMs','answers','completed','id']);
  }finally{c.close();}
  const unlinked=await client({token:false});try{unlinked.w.WordUsage.answer();await unlinked.tick(15000);assert.equal(unlinked.sent.length,1);}finally{unlinked.close();}
});
test('USAGE integration: real learning answer and completed round invoke explicit hooks',()=>{
  const {boot}=require('./helpers.cjs');const a=boot();try{
    let answers=0,completed=0;a.w.WordUsage={answer(){answers++;},complete(){completed++;}};
    a.importText('one | אחד\ntwo | שני');a.mode(2);
    a.click('[data-choice="אחד"]'); // answer can be wrong for shuffled deck; use actual current card below
    const current=a.$('.word').textContent;
    if(!a.$('#continue'))a.click('[data-choice="'+(current==='one'?'אחד':'שני')+'"]');
    a.click('#continue');const next=a.$('.word').textContent;a.click('[data-choice="'+(next==='one'?'אחד':'שני')+'"]');a.click('#continue');
    assert.ok(answers>=2);assert.equal(completed,1);
  }finally{a.close();}
});

test('USAGE admin UI: empty state, create link, table metrics, filtering and revoke',async()=>{
  const {JSDOM}=require('jsdom');const f=await fixture();
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../dist/admin.html'),'utf8'),{url:origin+'/admin',runScripts:'outside-only'}),w=dom.window;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};w.confirm=()=>true;
  w.fetch=async(url,opts)=>f.call(url,{method:opts.method,data:opts.body?JSON.parse(opts.body):undefined,admin:true});
  const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
  try{
    w.eval(fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8'));await settle();
    assert.equal(w.document.getElementById('empty').hidden,false);
    w.document.getElementById('add-student').click();assert.equal(w.document.getElementById('student-dialog').open,true);
    w.document.getElementById('student-label').value='תלמיד 01';
    w.document.getElementById('student-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
    assert.match(w.document.getElementById('personal-link').value,/#learner=/);assert.equal(w.document.getElementById('link-dialog').open,true);
    assert.equal(w.document.querySelectorAll('#students tr').length,1);assert.equal(w.document.getElementById('metric-students').textContent,'0 / 1');
    w.document.getElementById('close-link').click();assert.equal(w.document.getElementById('personal-link').value,'');
    w.document.getElementById('period').value='30';w.document.getElementById('period').dispatchEvent(new w.Event('change'));await settle();
    assert.equal(w.document.querySelectorAll('.day-column').length,6);
    w.document.querySelector('[aria-label="השבתה · תלמיד 01"]').click();await settle();
    assert.match(w.document.getElementById('students').textContent,/הקישור הושבת/);assert.equal(w.document.querySelector('.row-actions .copy'),null);
  }finally{w.close();f.close();}
});

test('USAGE penalty integration: attacks, defense, retry and match completion counted once',()=>{
  const {boot}=require('./helpers.cjs');const a=boot();try{
    let answers=0,completed=0;a.w.WordUsage={answer(){answers++;},complete(){completed++;}};
    a.mode(4);a.click('#pa-arena .kick');
    const right=()=>{const q=a.w.eval('mission[step]');return a.all('[data-penalty-choice]').find(b=>b.textContent===(q.type===3?q.w.en:q.w.he));};
    const wrong=a.all('[data-penalty-choice]').find(b=>b!==right());wrong.click();right().click();
    assert.equal(answers,2);assert.equal(completed,0);
    a.click('.target.t1');a.click('#pa-arena .kick');
    right().click();assert.equal(answers,3);
    a.click('.target.t1');a.click('#pa-arena .kick');
    for(let i=1;i<5;i++){
      right().click();a.click('.target.t1');a.click('#pa-arena .kick');
      right().click();a.click('.target.t1');a.click('#pa-arena .kick');
    }
    assert.equal(answers,11);assert.equal(completed,1);
  }finally{a.close();}
});

test('USAGE production artifact: real assets, protected admin aliases, no source or metadata download',async()=>{
  const built=fs.readFileSync(path.join(__dirname,'../dist/server/index.js'),'utf8');
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(built).toString('base64'))).default;
  const f=await fixture();try{
    const call=(route,headers={})=>worker.fetch(new Request(origin+route,{headers}),f.env);
    assert.match(await (await call('/')).text(),/Word League/);
    assert.equal((await call('/admin')).status,302);assert.equal((await call('/admin.html')).status,302);
    assert.match(await (await call('/admin',owner)).text(),/מעקב למידה/);
    for(const route of ['/server/index.js','/.openai/hosting.json','/worker/index.mjs','/drizzle/0000_usage.sql','/package.json','/.env'])assert.equal((await call(route)).status,404);
    const asset=await call('/usage.js');assert.match(asset.headers.get('Content-Type'),/javascript/);assert.equal(asset.headers.get('Referrer-Policy'),'no-referrer');assert.equal(asset.headers.get('Cache-Control'),'private, no-store');
    assert.match(asset.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
    const png=await call('/images/vocabulary-atlas.png');assert.equal((await png.arrayBuffer()).byteLength,3149232);
  }finally{f.close();}
});
