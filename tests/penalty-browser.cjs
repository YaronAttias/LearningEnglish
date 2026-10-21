const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Y758350/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',r=>r.abort());
await page.goto('http://127.0.0.1:52190',{waitUntil:'domcontentloaded'});
const out=path.join(__dirname,'reports/browser');fs.mkdirSync(out,{recursive:true});
await page.screenshot({path:path.join(out,'league-home.png'),fullPage:true});
await page.locator('.mission-cta').click();
await page.getByRole('button',{name:'ברצלונה',exact:true}).click();
await page.getByRole('button',{name:'לאמין ימאל',exact:true}).click();
await page.getByRole('button',{name:'עולים למגרש ←',exact:true}).click();
let clozes=0;
for(let i=0;i<5;i++){
const q=await page.evaluate(()=>({type:mission[step].type,en:mission[step].w.en,he:mission[step].w.he}));
if(q.type===3){clozes++;if(!(await page.locator('.sentence-question').textContent()).includes('___'))throw Error('Missing cloze');if(await page.locator('#pa-arena .word').count())throw Error('Cloze answer exposed');await page.locator('.workspace').screenshot({path:path.join(out,'league-cloze.png')});}
const choices=page.locator('[data-penalty-choice]');
if(i===0){const wrong=choices.filter({hasNotText:q.type===3?q.en:q.he});await wrong.nth(0).click();await wrong.nth(1).click();await page.locator('.answer-reveal').waitFor();if(!(await page.locator('.answer-reveal').textContent()).includes(q.en))throw Error('Reveal missing');}
else{await page.getByRole('button',{name:q.type===3?q.en:q.he,exact:true}).click();if(await page.locator('#pa-arena input').count())throw Error('Power slider remains');await page.getByRole('button',{name:'ימין גבוה',exact:true}).click();await page.getByRole('button',{name:'בועטים לשער'}).click();}
await page.getByRole('button',{name:i===4?'לשריקת הסיום':'לבעיטה הבאה'}).click();
}
if(clozes!==2)throw Error('Wrong cloze mix');
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wordsteps-grade8-mosaic-v1')));
if(saved.game.missions!==1||saved.game.xp!==55)throw Error('Reward mismatch '+JSON.stringify(saved.game));
await page.reload({waitUntil:'domcontentloaded'});
if(!(await page.locator('#gamePanel').textContent()).includes('55'))throw Error('Progress lost after reload');
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
fs.writeFileSync(path.join(out,'league-browser.json'),JSON.stringify({passed:true,clozes,viewportWidths:[320,390,768,1280],missions:saved.game.missions,xp:saved.game.xp,errors},null,2));
console.log('PASS: real browser, 2 cloze + 3 translation questions, forced miss and answer reveal, automatic power, rewards/reload, 4 widths, return to cards, no errors.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
