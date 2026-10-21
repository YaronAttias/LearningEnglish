const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Y758350/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',r=>r.abort());
await page.goto('http://127.0.0.1:52190',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{const mount=WordPenalty.mount;WordPenalty.mount=(host,options)=>mount(host,{...options,shotOutcome:()=>true,opponentAim:i=>i<4?0:1});});
const out=path.join(__dirname,'reports/browser');fs.mkdirSync(out,{recursive:true});
await page.screenshot({path:path.join(out,'league-home.png'),fullPage:true});
await page.locator('.mission-cta').click();
await page.getByRole('button',{name:'ברצלונה',exact:true}).click();
await page.getByRole('button',{name:'לאמין ימאל',exact:true}).click();
await page.getByRole('button',{name:'עולים למגרש ←',exact:true}).click();
let clozes=0,rounds=0;
async function scores(){return page.evaluate(()=>[Number(document.querySelector('[data-score="home"]').textContent),Number(document.querySelector('[data-score="away"]').textContent)]);}
for(let i=0;i<10;i++){
const before=await scores();rounds++;
const q=await page.evaluate(()=>({type:mission[step].type,en:mission[step].w.en,he:mission[step].w.he}));
if(q.type===3){clozes++;if(!(await page.locator('.sentence-question').textContent()).includes('___'))throw Error('Missing cloze');if(await page.locator('#pa-arena .word').count())throw Error('Cloze answer exposed');await page.locator('.workspace').screenshot({path:path.join(out,'league-cloze.png')});}
const choices=page.locator('[data-penalty-choice]');
if(i===0){const wrong=choices.filter({hasNotText:q.type===3?q.en:q.he});await wrong.nth(0).click();await wrong.nth(1).click();await page.locator('.answer-reveal').waitFor();if(!(await page.locator('.answer-reveal').textContent()).includes(q.en))throw Error('Reveal missing');}
else{await page.getByRole('button',{name:q.type===3?q.en:q.he,exact:true}).click();if(await page.locator('#pa-arena input').count()||await page.locator('#pa-arena .kick').count())throw Error('Extra attack control remains');await page.getByRole('button',{name:'ימין גבוה',exact:true}).click();}
await page.getByRole('button',{name:'לתור השוער שלי'}).waitFor();
const afterHome=await scores();if(afterHome[1]!==before[1]||afterHome[0]!==before[0]+Number(i!==0))throw Error('Home kick changed wrong score');
await page.getByRole('button',{name:'לתור השוער שלי'}).click();
if(await page.locator('#pa-arena').getAttribute('data-phase')!=='defense-question')throw Error('No defense question');
const defense=await page.evaluate(()=>({type:mission[step].type,en:mission[step].w.en,he:mission[step].w.he}));
if(defense.type===3)clozes++;
if(i===1){const choices=page.locator('[data-penalty-choice]').filter({hasNotText:defense.type===3?defense.en:defense.he});await choices.nth(0).click();await choices.nth(1).click();}
else{await page.getByRole('button',{name:defense.type===3?defense.en:defense.he,exact:true}).click();if(await page.locator('#pa-arena .kick').count())throw Error('Extra defense click remains');if(i===4)await page.locator('.workspace').screenshot({path:path.join(out,'league-defense.png')});await page.getByRole('button',{name:'ימין גבוה',exact:true}).click();}
await page.getByRole('button',{name:i===5?'לשריקת הסיום':'לבעיטה הבאה'}).waitFor();
if(i===1){if(await page.locator('canvas').getAttribute('data-keeper-motion')!=='stationary')throw Error('Keeper moved after two errors');if(!(await page.locator('.answer-reveal').textContent()).includes(defense.en))throw Error('Defense answer not revealed');}
const afterAway=await scores();if(afterAway[0]!==afterHome[0]||afterAway[1]!==before[1]+Number(i<4))throw Error('Away kick changed wrong score');
await page.getByRole('button',{name:i===5?'לשריקת הסיום':'לבעיטה הבאה'}).click();
if(i===5)break;
}
if(clozes<2||rounds!==6)throw Error('Missing cloze or sudden death');
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wordsteps-grade8-mosaic-v1')));
if(saved.game.missions!==1||saved.game.xp!==saved.game.correct*10+15)throw Error('Reward mismatch '+JSON.stringify(saved.game));
await page.reload({waitUntil:'domcontentloaded'});
if(!(await page.locator('#gamePanel').textContent()).includes(String(saved.game.xp)))throw Error('Progress lost after reload');
for(const width of [320,390,768,1280]){
await page.setViewportSize({width,height:1000});await page.locator('.mission-cta').click();
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+width);
await page.getByRole('button',{name:'עולים למגרש ←',exact:true}).click();
const q=await page.evaluate(()=>({en:mission[0].w.en,he:mission[0].w.he,type:mission[0].type}));
await page.getByRole('button',{name:q.type===3?q.en:q.he,exact:true}).click();
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Aim overflow '+width);
if(width===390)await page.locator('.workspace').screenshot({path:path.join(out,'league-mobile.png')});
await page.locator('[data-mode="0"]').click();
}
if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync(path.join(out,'league-browser.json'),JSON.stringify({passed:true,clozes,rounds,independentAlternatingScores:true,suddenDeath:true,viewportWidths:[320,390,768,1280],missions:saved.game.missions,xp:saved.game.xp,errors},null,2));
console.log('PASS: attack/defense questions, single-click actions, stationary keeper after two errors, corner saves, independent scores, sudden death, rewards/reload, four widths, no errors.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
