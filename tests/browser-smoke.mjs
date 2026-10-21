// Run only inside Codex cua_repl with its documented browser/tab handles.
// Does not install or launch a browser; never submits answers or changes progress.
import fs from 'node:fs/promises';
export async function runBrowserSmoke({tab,viewport,outputDirectory}){
  await fs.mkdir(outputDirectory,{recursive:true});const results=[];
  const record=(id,ok,detail)=>results.push({id,ok,detail});
  try{
    for(const width of [360,390,768,1280]){
      await viewport.set({width,height:844});
      await tab.reload();
      const snapshot=await tab.playwright.domSnapshot();
      const m=await tab.playwright.evaluate(()=>({viewport:window.innerWidth,client:document.documentElement.clientWidth,content:document.documentElement.scrollWidth,lang:document.documentElement.lang,dir:document.documentElement.dir,images:[...document.querySelectorAll('[role="img"]')].map(e=>({label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width})),modes:document.querySelectorAll('[data-mode]').length}));
      record('RESPONSIVE-'+width,Math.abs(m.viewport-width)<=2&&m.content<=m.client&&m.modes===5&&m.lang==='he'&&m.dir==='rtl',m);
      await fs.writeFile(`${outputDirectory}/viewport-${width}.png`,await tab.screenshot({fullPage:true}));
      record('PUBLIC-'+width,/Word Steps|WORD STEPS/.test(snapshot)&&!/Log in to access/.test(snapshot),'Public app visibly present');
    }
    await tab.playwright.locator('[data-mode="0"]').click();
    await tab.playwright.locator('#filter').selectOption('all');
    const labels=[];
    for(let i=0;i<58;i++){
      const label=await tab.playwright.locator('.vocab-illustration').getAttribute('aria-label');labels.push(label);
      await tab.playwright.locator('#next').click();
    }
    record('BROWSER-58-PICTURES',new Set(labels).size===58&&labels.every(Boolean),{unique:new Set(labels).size});
    await tab.playwright.locator('[data-mode="1"]').click();
    record('BROWSER-WRITE-FORM',await tab.playwright.locator('#answer').isVisible(),'Writing input is visible; no answer submitted');
    await tab.playwright.locator('[data-mode="2"]').click();
    record('BROWSER-MEANING',await tab.playwright.locator('[data-choice]').count()===4,'Four choices are rendered');
    await tab.playwright.locator('[data-mode="3"]').click();
    record('BROWSER-SENTENCE', /___/.test(await tab.playwright.locator('.sentence').innerText()), 'Original practice example with a blank');
    await tab.playwright.locator('[data-mode="0"]').click();
  }finally{await viewport.reset();}
  const report={at:new Date().toISOString(),scope:'In-app Chromium browser, viewport emulation only. Not physical iOS Safari or Android Chrome; no real users.',results,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length};await fs.writeFile(`${outputDirectory}/browser-smoke.json`,JSON.stringify(report,null,2));return report;
}

