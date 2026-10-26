const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createDB}=require('../usage-db.cjs');
const {JSDOM}=require('jsdom');
(async()=>{
 const {handle}=await import('../../worker/index.mjs');
 const env={DB:createDB(),ADMIN_EMAIL:'owner@example.test',LEARNER_LINK_KEY:'x'.repeat(64)};
 const origin='https://review.test';
 const call=(route,data,cookie)=>handle(new Request(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)}),env,()=>new Response(''));
 const joined=await call('/api/usage/start',{seed:crypto.randomUUID()});
 const cookie=joined.headers.get('Set-Cookie').split(';')[0];
 const responses=await Promise.all(Array.from({length:20},()=>call('/api/usage/report',{id:crypto.randomUUID(),activeMs:0,answers:1,completed:0},cookie)));
 const accepted=responses.filter(r=>r.status===200).length;
 assert.equal(accepted,12);
 console.log('RATE_LIMIT local adapter: 12/20 concurrent reports accepted. Stored:',env.DB.raw.prepare('SELECT COUNT(*) AS n FROM reports').get().n);
 env.DB.close();
 const dom=new JSDOM('<footer></footer>',{url:origin,runScripts:'outside-only'}),w=dom.window;
 let resolveStart;let now=0;const sent=[];Object.defineProperty(w.performance,'now',{value:()=>now});
 w.crypto.randomUUID=crypto.randomUUID.bind(crypto);w.setInterval=()=>{};
 let focused=true;w.document.hasFocus=()=>focused;Object.defineProperty(w.document,'visibilityState',{get:()=>'visible'});
 w.fetch=(url,opts)=>{sent.push(url);if(url.endsWith('/start'))return new Promise(resolve=>resolveStart=resolve);return Promise.resolve({ok:true,status:200,json:async()=>({})});};
 w.eval(fs.readFileSync('dist/usage.js','utf8'));
 w.WordUsage.answer();
w.localStorage.setItem('wordleague-usage-off','1');
 w.dispatchEvent(new w.StorageEvent('storage',{key:'wordleague-usage-off',newValue:'1'}));
 resolveStart({ok:true,status:200,json:async()=>({enabled:true})});
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(w.document.querySelector('footer button').hidden,true);
 now=15000;focused=false;w.dispatchEvent(new w.Event('blur'));
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(sent.filter(url=>url.endsWith('/report')).length,0);
console.log('OPT_OUT fixed: pending start stays disabled; button visible:',!w.document.querySelector('footer button').hidden);
 w.close();
 const chartDom=new JSDOM(fs.readFileSync('dist/admin.html','utf8'),{url:origin+'/admin',runScripts:'outside-only'}),a=chartDom.window;
 a.Date.now=()=>Date.parse('2026-10-26T23:30:00+02:00');
 a.fetch=async()=>({ok:true,status:200,json:async()=>({students:[],days:7,daily:[{day:'2026-10-24',active_ms:60000},{day:'2026-10-25',active_ms:120000}]})});
 a.eval(fs.readFileSync('dist/admin.js','utf8'));
 for(let i=0;i<12;i++)await Promise.resolve();
 const labels=[...a.document.querySelectorAll('.day-column')].map(el=>el.textContent);
 console.log('DST_CHART:',JSON.stringify(labels));
 assert.equal(labels.filter(s=>s.endsWith('25.10')).length,1);
 assert.equal(labels.filter(s=>s.endsWith('20.10')).length,1);
 chartDom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});




