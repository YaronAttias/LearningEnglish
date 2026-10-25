const assert=require('node:assert/strict');
const fs=require('node:fs');
const {boot,KEY}=require('./helpers.cjs');
const app=boot();const {w,$,click}=app;const d=$('#about-dialog');const checks=[];
function check(name,fn){fn();checks.push(name);}
// jsdom has no native dialog implementation: simulate only its open/close API.
d.showModal=()=>d.setAttribute('open','');
d.close=()=>{d.removeAttribute('open');d.dispatchEvent(new w.Event('close'));};
d.getBoundingClientRect=()=>({left:100,right:700,top:50,bottom:700});
w.eval(fs.readFileSync('dist/about.js','utf8'));
const saved=w.localStorage.getItem(KEY);
check('Closed on initial load',()=>assert(!d.hasAttribute('open')));
check('Open button and background scroll-lock class',()=>{click('#about-open');assert(d.hasAttribute('open'));assert(w.document.body.classList.contains('about-is-open'));});
check('Interior click keeps dialog open',()=>{d.dispatchEvent(new w.MouseEvent('click',{clientX:200,clientY:100,bubbles:true}));assert(d.hasAttribute('open'));});
check('Close button restores focus and scroll class',()=>{click('#about-close');assert(!d.hasAttribute('open'));assert.equal(w.document.activeElement,$('#about-open'));assert(!w.document.body.classList.contains('about-is-open'));});
check('Continue button closes',()=>{click('#about-open');click('#about-done');assert(!d.hasAttribute('open'));});
check('Outside-panel click closes',()=>{click('#about-open');d.dispatchEvent(new w.MouseEvent('click',{clientX:20,clientY:20,bubbles:true}));assert(!d.hasAttribute('open'));});
check('Profile links and safe new-tab attributes',()=>{for(const a of w.document.querySelectorAll('footer a,#about-dialog a')){assert.equal(a.href,'https://github.com/YaronAttias');assert.equal(a.target,'_blank');assert(a.rel.includes('noopener')&&a.rel.includes('noreferrer'));}assert.equal(w.document.querySelectorAll('footer a,#about-dialog a').length,2);});
check('No email in footer or dialog',()=>assert(!/mailto:|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test($('footer').outerHTML+d.outerHTML)));
check('Learning storage unchanged by About interactions',()=>assert.equal(w.localStorage.getItem(KEY),saved));
check('Card navigation still works',()=>{const before=$('.word').textContent;click('#next');assert.notEqual($('.word').textContent,before);});
check('Speech requests still work',()=>{const button=app.$('#listen');assert(button);button.click();assert(app.spoken.length>0);});
const report={date:'2026-10-25',passed:checks.length,checks,limits:['Native browser verification blocked by file URL security policy.','Dialog API simulated in jsdom; Escape, native focus containment, actual layout, mobile scrolling and audible output are not verified.']};
fs.writeFileSync('tests/reports/about-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));app.close();