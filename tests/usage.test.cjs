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
  async function enroll(seed=crypto.randomUUID(), existingCookie) {
    const joined=await call('/api/usage/start',{method:'POST',data:{seed},cookie:existingCookie});
    assert.equal(joined.status,200);assert.equal((await joined.json()).enabled,true);
    const setCookie=joined.headers.get('Set-Cookie'), cookie=setCookie.split(';')[0], token=cookie.split('=')[1];
    return {id:token.split('.')[0],seed,token,cookie,setCookie};
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
test('USAGE automatic identity: stable seed/cookie, distinct browsers, secure cookie, no PII or admin access',async()=>{
  const f=await fixture();try{
    const s=await f.enroll(), same=await f.enroll(s.seed), other=await f.enroll();
    assert.equal(s.id,same.id);assert.notEqual(s.id,other.id);assert.match(s.setCookie,/Secure; HttpOnly; SameSite=Strict/);
    assert.equal((await f.enroll(crypto.randomUUID(),s.cookie)).id,s.id);
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM students').get().n,2);
    assert.equal((await f.call('/api/admin/students',{cookie:s.cookie})).status,401);
    assert.deepEqual(await (await f.call('/api/usage/status',{cookie:s.cookie})).json(),{enabled:true});
    assert.deepEqual(await (await f.call('/api/usage/status')).json(),{enabled:false});
    const forged=s.cookie.slice(0,-2)+'xx';assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:forged,data:report()})).status,403);
    const listing=await (await f.call('/api/admin/students',{admin:true})).json();
    assert.doesNotMatch(JSON.stringify(listing),/token|signature|example.test|learner=|seed/);
    assert.match(listing.students[0].label,/^דפדפן [a-f0-9]{12}$/);assert.equal(listing.students[0].source,'automatic');
    assert.equal((await f.call('/api/usage/enroll',{method:'POST',data:{token:s.token}})).status,410);
    assert.equal((await f.call('/api/admin/students',{method:'POST',admin:true,data:{label:'A'}})).status,404);
    assert.equal((await f.call('/api/admin/students/'+s.id+'/link',{method:'POST',admin:true,data:{}})).status,404);
  }finally{f.close();}
});
test('USAGE security: same-origin JSON mutations, bounded input and strict field allowlist',async()=>{
  const f=await fixture();try{
    assert.equal((await f.call('/api/admin/students',{method:'POST',admin:true,data:{label:'A'},headers:{Origin:'https://evil.test'}})).status,403);
    assert.equal((await f.call('/api/usage/start',{method:'POST',data:{seed:'<script>'}})).status,400);
    assert.equal((await f.call('/api/usage/start',{method:'POST',data:{seed:crypto.randomUUID(),email:'no'}})).status,400);
    assert.equal((await f.call('/api/usage/start',{method:'POST',data:{seed:'a'.repeat(3000)}})).status,400);
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
test('USAGE revoke and deletion disable automatic identity and remove all records',async()=>{
  const f=await fixture();try{
    const s=await f.enroll();await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()});
    assert.equal((await f.call(`/api/admin/students/${s.id}/revoke`,{method:'POST',admin:true,data:{}})).status,200);
    assert.equal((await (await f.call('/api/usage/start',{method:'POST',data:{seed:s.seed},cookie:s.cookie})).json()).enabled,false);
    assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()})).status,403);

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
test('USAGE forget persists an opt-out cookie across automatic starts without deleting history',async()=>{
  const f=await fixture();try{
    const s=await f.enroll(),r=await f.call('/api/usage/forget',{method:'POST',cookie:s.cookie,data:{}});
    assert.match(r.headers.get('Set-Cookie'),/=off;/);assert.match(r.headers.get('Set-Cookie'),/Max-Age=7776000/);
    const offCookie=r.headers.get('Set-Cookie').split(';')[0];assert.deepEqual(await (await f.call('/api/usage/start',{method:'POST',data:{seed:s.seed},cookie:offCookie})).json(),{enabled:false});
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM students').get().n,1);
  }finally{f.close();}
});

async function client({token=true,enabled=true,seed,off=false}={}) {
  const {JSDOM}=require('jsdom');let now=0,visible=true,focus=true,fail=false;
  const dom=new JSDOM('<footer></footer>',{url:origin+(token?'#learner=sample-token':''),runScripts:'outside-only'}),w=dom.window;
  Object.defineProperty(w.performance,'now',{value:()=>now});
  Object.defineProperty(w.document,'visibilityState',{get:()=>visible?'visible':'hidden'});w.document.hasFocus=()=>focus;
  if(seed)w.localStorage.setItem('wordleague-visitor-seed-v2',seed);if(off)w.localStorage.setItem('wordleague-usage-off','1');
  const sent=[],intervals=[];w.setInterval=fn=>intervals.push(fn);w.crypto.randomUUID=crypto.randomUUID.bind(crypto);
  w.fetch=async(url,opts)=>{const data=opts.body?JSON.parse(opts.body):null;sent.push({url,data});if(fail&&url.endsWith('report'))throw Error('offline');return {ok:true,status:200,json:async()=>({enabled})};};
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
test('USAGE client: retries preserve ID and ordinary shared app URL automatically tracks visitors',async()=>{
  const c=await client();try{
    c.offline(true);c.w.WordUsage.answer();await c.tick(15000);const first=c.sent.at(-1).data;
    c.w.WordUsage.answer();c.offline(false);await c.tick(15000);assert.deepEqual(c.sent.at(-1).data,first);
    await c.tick(15000);assert.notEqual(c.sent.at(-1).data.id,first.id);assert.equal(c.sent.at(-1).data.answers,1);
    assert.deepEqual(Object.keys(first).sort(),['activeMs','answers','completed','id']);
  }finally{c.close();}
  const automatic=await client({token:false});try{automatic.w.WordUsage.answer();await automatic.tick(15000);assert.equal(automatic.sent[0].url,'/api/usage/start');assert.equal(automatic.sent.filter(s=>s.url.endsWith('report')).length,1);}finally{automatic.close();}
});

test('USAGE automatic starts: simultaneous tabs share one identity and public registration is bounded',async()=>{
  const f=await fixture();try{
    const seed=crypto.randomUUID();const visitors=await Promise.all(Array.from({length:8},()=>f.enroll(seed)));
    assert.equal(new Set(visitors.map(v=>v.id)).size,1);assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM students').get().n,1);
    for(let i=0;i<119;i++)await f.enroll();
    const limited=await f.call('/api/usage/start',{method:'POST',data:{seed:crypto.randomUUID()}});assert.equal(limited.status,429);
    assert.equal((await f.enroll(seed)).id,visitors[0].id);
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM students').get().n,120);
  }finally{f.close();}
});

test('USAGE migration: old links/cookies cannot merge browsers and legacy aggregates stay out of automatic totals',async()=>{
  const f=await fixture();try{
    const visitor=await f.enroll();
    f.env.DB.raw.prepare("UPDATE students SET source = 'legacy' WHERE id = ?").run(visitor.id);
    f.env.DB.raw.prepare('INSERT INTO daily_usage VALUES (?, ?, 15000, 3, 1)').run(visitor.id,'2099-01-01');
    const oldCookie=visitor.cookie.replace('__Host-wl-visitor-v2','__Host-wl-learner');
    const newVisitor=await f.enroll(crypto.randomUUID(),oldCookie);assert.notEqual(newVisitor.id,visitor.id);
    assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:visitor.cookie,data:report()})).status,403);
    const listing=await (await f.call('/api/admin/students',{admin:true})).json();assert.equal(listing.students.length,1);assert.equal(listing.daily.length,0);
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM students').get().n,2);
  }finally{f.close();}
});

test('USAGE client: automatic seed survives reload, opt-out survives reload, old link token never transmitted',async()=>{
  const first=await client();let seed;
  try{
    assert.equal(first.sent[0].url,'/api/usage/start');assert.deepEqual(Object.keys(first.sent[0].data),['seed']);
    seed=first.w.localStorage.getItem('wordleague-visitor-seed-v2');assert.equal(first.sent[0].data.seed,seed);
    assert.doesNotMatch(JSON.stringify(first.sent),/sample-token/);
  }finally{first.close();}
  const second=await client({seed});try{assert.equal(second.sent[0].data.seed,seed);}finally{second.close();}
  const stopped=await client({off:true});try{stopped.w.WordUsage.answer();await stopped.tick(120000);assert.equal(stopped.sent.length,0);}finally{stopped.close();}
  const disabled=await client({enabled:false});try{disabled.w.WordUsage.answer();await disabled.tick(120000);assert.equal(disabled.sent.length,1);}finally{disabled.close();}
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

test('USAGE admin UI: automatic visitors appear without creation or link controls, filtering and revoke',async()=>{
  const {JSDOM}=require('jsdom');const f=await fixture();
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../dist/admin.html'),'utf8'),{url:origin+'/admin',runScripts:'outside-only'}),w=dom.window;
  w.confirm=()=>true;
  w.fetch=async(url,opts)=>f.call(url,{method:opts.method,data:opts.body?JSON.parse(opts.body):undefined,admin:true});
  const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
  try{
    w.eval(fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8'));await settle();
    assert.equal(w.document.getElementById('empty').hidden,false);assert.equal(w.document.getElementById('add-student'),null);assert.equal(w.document.querySelector('dialog'),null);
    const visitor=await f.enroll();w.document.getElementById('refresh').click();await settle();
    assert.equal(w.document.querySelectorAll('#students tr').length,1);assert.equal(w.document.getElementById('metric-students').textContent,'0 / 1');
    assert.match(w.document.getElementById('students').textContent,/דפדפן/);assert.doesNotMatch(w.document.body.textContent,/יצירת קישור|קישור אישי/);
    w.document.getElementById('period').value='30';w.document.getElementById('period').dispatchEvent(new w.Event('change'));await settle();
    assert.equal(w.document.querySelectorAll('.day-column').length,6);
    w.document.querySelector('.row-actions button').click();await settle();
    assert.match(w.document.getElementById('students').textContent,/המעקב הופסק/);
    assert.equal((await (await f.call('/api/usage/start',{method:'POST',data:{seed:visitor.seed}})).json()).enabled,false);
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

test('USAGE opt-out: late start cookies cannot override independent server preference',async()=>{
  const f=await fixture();try{
    const s=await f.enroll();
    const lateStart=await f.call('/api/usage/start',{method:'POST',data:{seed:s.seed},cookie:s.cookie});
    const stopped=await f.call('/api/usage/forget',{method:'POST',data:{},cookie:s.cookie});
    const off=stopped.headers.get('Set-Cookie').split(';')[0];
    assert.match(off,/^__Host-wl-usage-off=off$/);
    const combined=off+'; '+lateStart.headers.get('Set-Cookie').split(';')[0];
    assert.deepEqual(await (await f.call('/api/usage/status',{cookie:combined})).json(),{enabled:false});
    const restart=await f.call('/api/usage/start',{method:'POST',data:{seed:s.seed},cookie:combined});
    assert.deepEqual(await restart.json(),{enabled:false});assert.equal(restart.headers.get('Set-Cookie'),null);
    assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:combined,data:report()})).status,403);
    assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM daily_usage').get().n,0);
  }finally{f.close();}
});

test('USAGE opt-out: delayed start response or JSON cannot re-enable another tab',async()=>{
 const {JSDOM}=require('jsdom');
 for(const stage of ['response','json']){
  const dom=new JSDOM('<footer></footer>',{url:origin,runScripts:'outside-only'}),w=dom.window;
  let release,now=0,focused=true;const sent=[],intervals=[];
  Object.defineProperty(w.performance,'now',{value:()=>now});
  Object.defineProperty(w.document,'visibilityState',{get:()=>'visible'});w.document.hasFocus=()=>focused;
  w.crypto.randomUUID=crypto.randomUUID.bind(crypto);w.setInterval=fn=>intervals.push(fn);
  const pending=new Promise(resolve=>release=resolve);
  const response={ok:true,status:200,json:()=>stage==='json'?pending:Promise.resolve({enabled:true})};
  w.fetch=async url=>{sent.push(url);return url.endsWith('/start')?(stage==='response'?pending:response):{ok:true,status:200,json:async()=>({})};};
  const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
  try{
   w.eval(fs.readFileSync(path.join(__dirname,'../dist/usage.js'),'utf8'));await settle();w.WordUsage.answer();
   w.localStorage.setItem('wordleague-usage-off','1');w.dispatchEvent(new w.StorageEvent('storage',{key:'wordleague-usage-off',newValue:'1'}));
   release(stage==='response'?response:{enabled:true});await settle();
   assert.equal(w.document.querySelector('footer button').hidden,true);
   now=15000;focused=false;w.dispatchEvent(new w.Event('blur'));intervals[0]();w.WordUsage.answer();await settle();
   assert.deepEqual(sent,['/api/usage/start']);
  }finally{w.close();}
 }
});

test('USAGE calendar: chart uses distinct calendar dates and exact totals across both DST transitions',async()=>{
 const {JSDOM}=require('jsdom');
 for(const [instant,today] of [['2026-10-26T23:30:00+02:00','2026-10-26'],['2026-03-28T00:30:00+03:00','2026-03-28']]){
  for(const days of [7,30,90]){
   const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../dist/admin.html'),'utf8'),{url:origin+'/admin',runScripts:'outside-only'}),w=dom.window;
   w.Date.now=()=>Date.parse(instant);
   const daily=Array.from({length:days},(_,i)=>({day:new Date(Date.parse(today+'T00:00:00Z')-i*86400000).toISOString().slice(0,10),active_ms:(i+1)*60000}));
   w.fetch=async()=>({ok:true,status:200,json:async()=>({students:[],days,daily})});
   try{
    w.eval(fs.readFileSync(path.join(__dirname,'../dist/admin.js'),'utf8'));for(let i=0;i<15;i++)await Promise.resolve();
    const columns=[...w.document.querySelectorAll('.day-column')];
    assert.equal(columns.length,days===7?7:6);
    assert.equal(columns.reduce((sum,col)=>sum+Number(col.querySelector('.day-value').textContent),0),days*(days+1)/2);
    if(days===7){assert.equal(new Set(columns.map(c=>c.lastElementChild.textContent)).size,7);assert.equal(columns.at(-1).lastElementChild.textContent,today.slice(8)+'.'+today.slice(5,7));}
   }finally{w.close();}
  }
 }
});

test('USAGE calendar: API period and retention use calendar days at DST boundaries',async()=>{
 for(const [instant,today] of [['2026-10-26T23:30:00+02:00','2026-10-26'],['2026-03-28T00:30:00+03:00','2026-03-28']]){
  const f=await fixture(),original=Date.now;Date.now=()=>Date.parse(instant);
  const day=offset=>new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
  try{
   const s=await f.enroll();
   for(const offset of [-90,-89,-30,-29,-7,-6,0])f.env.DB.raw.prepare('INSERT INTO daily_usage VALUES (?, ?, 60000, 1, 0)').run(s.id,day(offset));
   for(const [days,count]of [[7,2],[30,4],[90,6]]){
    const data=await (await f.call('/api/admin/students?days='+days,{admin:true})).json();
    assert.equal(data.daily.length,count);assert.equal(data.students[0].active_ms,count*60000);
   }
   assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM daily_usage WHERE day = ?').get(day(-90)).n,0);
   assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM daily_usage WHERE day = ?').get(day(-89)).n,1);
   // Exercise retention on the reporting path, independently of opening admin.
   f.env.DB.raw.prepare('INSERT INTO daily_usage VALUES (?, ?, 60000, 1, 0)').run(s.id,day(-90));
   assert.equal((await f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report()})).status,200);
   assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM daily_usage WHERE day = ?').get(day(-90)).n,0);
   assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM daily_usage WHERE day = ?').get(day(-89)).n,1);
  }finally{Date.now=original;f.close();}
 }
});

test('USAGE concurrent reporting: shared identity accepts only twelve of twenty requests in local adapter',async()=>{
 const f=await fixture();try{
  const s=await f.enroll();
  const responses=await Promise.all(Array.from({length:20},()=>f.call('/api/usage/report',{method:'POST',cookie:s.cookie,data:report({activeMs:0,answers:1,completed:0})})));
  assert.equal(responses.filter(r=>r.status===200).length,12);
  assert.equal(responses.filter(r=>r.status===429).length,8);
  assert.equal(f.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM reports').get().n,12);
  assert.equal(f.env.DB.raw.prepare('SELECT SUM(answers) AS n FROM daily_usage').get().n,12);
 }finally{f.close();}
});
