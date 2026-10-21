const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const KEY='wordsteps-grade8-mosaic-v1';
function boot({stored,storageBlocked=false,speech=true,confirm=true,shotOutcome=(team,i)=>team==='home'||i<4}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),{url:'https://wordsteps.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;w.structuredClone=structuredClone;w.confirm=()=>confirm;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  const spoken=[];if(speech){w.speechSynthesis={cancel(){},getVoices(){return [{lang:'en-US'}]},speak(u){spoken.push(u);}};w.SpeechSynthesisUtterance=function(text){this.text=text;};}
  if(stored!==undefined)w.localStorage.setItem(KEY,typeof stored==='string'?stored:JSON.stringify(stored));
  if(storageBlocked){w.Storage.prototype.getItem=function(){throw Error('blocked');};w.Storage.prototype.setItem=function(){throw Error('blocked');};}
  const vm=require('node:vm');
  let frameTime=0;w.requestAnimationFrame=fn=>{fn(frameTime+=100);return 0;};w.cancelAnimationFrame=()=>{};
  vm.runInContext(fs.readFileSync(path.join(root,'dist/shootout.js'),'utf8'),dom.getInternalVMContext(),{filename:'shootout.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'dist/penalty.js'),'utf8'),dom.getInternalVMContext(),{filename:'penalty.js'});
  const mount=w.WordPenalty.mount;w.WordPenalty.mount=(host,options)=>mount(host,{...options,noCanvas:true,instant:true,shotOutcome,opponentAim:i=>shotOutcome('away',i)?0:1});
  vm.runInContext(fs.readFileSync(path.join(root,'dist/words.js'),'utf8'),dom.getInternalVMContext(),{filename:'words.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),dom.getInternalVMContext(),{filename:'app.js'});
  const $=s=>w.document.querySelector(s), all=s=>[...w.document.querySelectorAll(s)];
  const click=s=>{const el=$(s);if(!el)throw Error('Missing '+s);el.click();};
  const mode=i=>click(`[data-mode="${i}"]`);
  const filter=value=>{$('#filter').value=value;$('#filter').dispatchEvent(new w.Event('change'));};
  const submit=value=>{$('#answer').value=value;$('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
  const importText=text=>{$('#wordInput').value=text;click('#import');};
  const state=()=>JSON.parse(w.localStorage.getItem(KEY));
  return {dom,w,$,all,click,mode,filter,submit,importText,state,spoken,close:()=>w.close()};
}
module.exports={boot,KEY,root};
