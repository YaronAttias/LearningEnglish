const {test}=require('node:test');const assert=require('node:assert/strict');const {boot,KEY}=require('./helpers.cjs');
scenario('SECURITY-STATS: prototype-like word names keep independent progress after reload',a=>{
  a.importText('__proto__ | מיוחד\nconstructor | בנאי\ntoString | טקסט');
  a.mode(1);
  for(const name of ['__proto__','constructor','toString']){
    a.submit('wrong');a.submit(name);
    assert.equal(a.w.eval('Object.hasOwn(Object.prototype,"focus")'),false);
    assert.equal(a.state().stats[name].attempts,2);
    a.click('#continue');
  }
  const stored=a.state();assert.equal(stored.game.xp,30);
  const b=boot({stored});
  try{
    assert.equal(b.w.eval('Object.getPrototypeOf(stats) === null'),true);
    b.mode(1);b.submit('__proto__');
    assert.equal(b.state().stats.__proto__.attempts,3);
    assert.equal(b.state().stats.constructor.attempts,2);
    assert.equal(b.state().stats.toString.attempts,2);
    assert.equal(b.state().game.xp,30);
    assert.equal(b.w.eval('Object.hasOwn(Object.prototype,"checked")'),false);
  }finally{b.close();}
  for(const id of ['reset','restore']){
    a.click('#'+id);
    assert.equal(a.w.eval('Object.getPrototypeOf(stats) === null'),true);
    assert.deepEqual(a.state().stats,{});
  }
});
function scenario(name,run,options){test(name,()=>{const a=boot(options);try{run(a);}finally{a.close();}});}
scenario('CONTENT-01: 58 unique words, 46 core and 12 EXTRA',a=>{assert.equal(a.$('#count').textContent,'58');const rows=a.all('.word-row');assert.equal(rows.length,58);assert.equal(new Set(rows.map(r=>r.querySelector('button').textContent)).size,58);assert.equal(a.all('.word-row small').length,12);});
scenario('LEARN-01: first word, Hebrew meaning and accessible picture',a=>{assert.equal(a.$('.word').textContent,'abroad');assert.equal(a.$('.meaning').textContent,'בחוץ לארץ');assert.match(a.$('[role="img"]').getAttribute('aria-label'),/abroad/);assert.ok(a.$('#prev').disabled);});
scenario('LEARN-02: next, previous and wrap around',a=>{a.click('#next');assert.equal(a.$('.word').textContent,'adventure');a.click('#prev');assert.equal(a.$('.word').textContent,'abroad');for(let i=0;i<58;i++)a.click('#next');assert.equal(a.$('.word').textContent,'abroad');});
scenario('IMAGES-01: all 58 cards have distinct valid crop rectangles',a=>{const rects=new Set();for(let i=0;i<58;i++){const image=a.$('.vocab-illustration');assert.ok(image);const [x,y,w,h]=image.getAttribute('viewBox').split(' ').map(Number);assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=971&&y+h<=1619);rects.add(image.getAttribute('viewBox'));a.click('#next');}assert.equal(rects.size,58);});
scenario('AUDIO-01: hearing a word requests English speech at learning speed',a=>{a.click('#listen');assert.equal(a.spoken[0].text,'abroad');assert.equal(a.spoken[0].lang,'en-US');assert.equal(a.spoken[0].rate,.85);});
scenario('AUDIO-02: unavailable speech shows a useful message',a=>{a.click('#listen');assert.match(a.$('#feedback').textContent,/אינו תומך/);},{speech:false});
scenario('FILTER-01: core has 46 words and EXTRA has 12',a=>{a.filter('core');assert.match(a.$('#position').textContent,/46/);a.filter('extra');assert.match(a.$('#position').textContent,/12/);assert.equal(a.$('.word').textContent,'adventurous');});
scenario('FILTER-02: no focus words gives an empty state',a=>{a.filter('focus');assert.match(a.$('#stage').textContent,/אין מילים/);assert.equal(a.$('#position').textContent,'0 מילים');});
scenario('WRITE-01: empty answer does not count as an attempt',a=>{a.mode(1);a.submit('   ');assert.match(a.$('#feedback').textContent,/כתבו תשובה/);assert.equal(a.state(),null);});
scenario('WRITE-02: case and surrounding spaces are accepted',a=>{a.mode(1);a.submit('  ABROAD  ');assert.match(a.$('#feedback').textContent,/נכון/);assert.equal(a.state().stats.abroad.focus,false);});
scenario('WRITE-03: curly apostrophe is normalized',a=>{for(let i=0;i<8;i++)a.click('#next');a.mode(1);for(let i=0;i<8;i++){a.click('#reveal');a.click('#continue');}a.submit('can’t afford');assert.match(a.$('#feedback').textContent,/נכון/);});
scenario('WRITE-04: wrong answer creates a focus word and retry succeeds',a=>{a.mode(1);a.submit('wrong');assert.equal(a.state().stats.abroad.focus,true);assert.equal(a.all('[data-remove-focus]').length,1);a.submit('abroad');assert.equal(a.state().stats.abroad.focus,false);assert.match(a.$('#feedback').textContent,/נכון/);});
scenario('WRITE-05: reveal counts as needing practice',a=>{a.mode(1);a.click('#reveal');assert.equal(a.state().stats.abroad.focus,true);assert.match(a.$('#feedback').textContent,/abroad/);});
scenario('WRITE-06: double submission cannot double count after success',a=>{a.mode(1);a.submit('abroad');a.submit('abroad');assert.equal(a.state().stats.abroad.attempts,1);});
scenario('MEANING-01: 4 distinct choices include the correct answer',a=>{a.mode(2);const choices=a.all('[data-choice]');assert.equal(choices.length,4);assert.equal(new Set(choices.map(b=>b.textContent)).size,4);assert.ok(choices.some(b=>b.textContent==='בחוץ לארץ'));});
scenario('MEANING-02: correct choice provides success and next',a=>{a.mode(2);a.all('[data-choice]').find(b=>b.textContent==='בחוץ לארץ').click();assert.match(a.$('#feedback').textContent,/נכון/);assert.ok(a.$('#continue'));});
scenario('FOCUS-01: individual removal preserves another word and attempt history',a=>{a.mode(1);a.click('#reveal');a.click('#continue');a.click('#reveal');a.click('[data-remove-focus="abroad"]');assert.equal(a.all('[data-remove-focus]').length,1);assert.ok(a.$('[data-remove-focus="adventure"]'));assert.equal(a.state().stats.abroad.checked,true);assert.equal(a.state().stats.abroad.attempts,1);assert.equal(a.state().stats.abroad.focus,false);});
scenario('FOCUS-02: removing the last focused card handles empty state',a=>{a.mode(1);a.click('#reveal');a.click('[data-focus="abroad"]');a.click('[data-remove-focus="abroad"]');assert.match(a.$('#stage').textContent,/אין מילים/);assert.equal(a.all('[data-remove-focus]').length,0);});
scenario('STORAGE-01: independent users have independent progress',a=>{a.mode(1);a.click('#reveal');const b=boot();try{assert.equal(b.state(),null);assert.equal(b.all('[data-remove-focus]').length,0);}finally{b.close();}assert.equal(a.state().stats.abroad.focus,true);});
scenario('STORAGE-02: progress survives a reload with the same saved data',a=>{a.mode(1);a.click('#reveal');const b=boot({stored:a.state()});try{assert.ok(b.$('[data-remove-focus="abroad"]'));assert.match(b.$('#progress').textContent,/1 מתוך 58/);}finally{b.close();}});
scenario('STORAGE-03: malformed JSON falls back to default content',a=>assert.equal(a.$('#count').textContent,'58'),{stored:'{broken'});
scenario('STORAGE-04: blocked storage does not prevent practice',a=>{a.mode(1);a.click('#reveal');assert.match(a.$('#manageStatus').textContent,/לא ניתן לשמור/);assert.match(a.$('#feedback').textContent,/abroad/);},{storageBlocked:true});
scenario('RESET-01: cancel leaves progress unchanged',a=>{a.mode(1);a.click('#reveal');a.click('#reset');assert.equal(a.state().stats.abroad.focus,true);},{confirm:false});
scenario('RESET-02: accepted reset clears progress but retains content',a=>{a.mode(1);a.click('#reveal');a.click('#reset');assert.deepEqual(a.state().stats,{});assert.equal(a.$('#count').textContent,'58');});
scenario('IMPORT-01: simple list replaces content and clears old progress',a=>{a.mode(1);a.click('#reveal');a.importText('apple - תפוח\nbook - ספר');assert.equal(a.$('#count').textContent,'2');assert.deepEqual(a.state().stats,{});});
scenario('IMPORT-02: invalid, empty, duplicate and invalid-cloze lists are rejected',a=>{for(const text of ['', 'apple', 'apple | תפוח\nAPPLE | תפוח', 'apple | תפוח | Example | דוגמה | no blank']){a.importText(text);assert.equal(a.$('#count').textContent,'58');assert.equal(a.state(),null);}});
scenario('IMPORT-03: full format supports EXTRA and sentence practice',a=>{a.importText('apple | תפוח | I eat an apple. | אני אוכל תפוח. | I eat an ___. | EXTRA');a.mode(3);assert.equal(a.$('.sentence').textContent,'I eat an ___.');a.click('[data-choice]');assert.match(a.$('#feedback').textContent,/נכון/);a.filter('extra');assert.match(a.$('#position').textContent,/1 מתוך 1/);});
scenario('SECURITY-01: imported HTML remains text instead of executing',a=>{a.importText('<img src=x onerror=alert(1)> | <script>alert(1)</script>');a.mode(0);assert.equal(a.$('#stage img'),null);assert.equal(a.$('#stage script'),null);assert.match(a.$('.word').textContent,/<img/);});
scenario('SENTENCE-01: all original examples contain a usable blank',a=>{a.mode(3);assert.match(a.$('.sentence').textContent,/___/);assert.equal(a.all('[data-choice]').length,4);assert.match(a.w.document.body.textContent,/דוגמאות מקוריות/);});
scenario('RESTORE-01: original words and illustrations can be restored',a=>{a.importText('apple - תפוח');a.click('#restore');a.mode(0);assert.equal(a.$('#count').textContent,'58');assert.equal(a.$('.word').textContent,'abroad');assert.ok(a.$('[role="img"]'));});
scenario('ROUND-01: single-word round ends and can restart',a=>{a.importText('apple - תפוח');a.mode(1);a.submit('apple');a.click('#continue');assert.match(a.$('#stage').textContent,/סיימת/);a.click('#restart');assert.ok(a.$('#answer'));});
scenario('A11Y-01: direction, form labels, live feedback and pressed mode are present',a=>{assert.equal(a.w.document.documentElement.lang,'he');assert.equal(a.w.document.documentElement.dir,'rtl');a.mode(1);assert.ok(a.$('label[for="answer"]'));assert.equal(a.$('#feedback').getAttribute('aria-live'),'polite');assert.equal(a.$('[data-mode="1"]').getAttribute('aria-pressed'),'true');assert.equal(a.$('#answer').dir,'ltr');});
test('EXPORT-01: text download preserves 58 entries, Hebrew and EXTRA',async()=>{const a=boot();try{let blob,filename;a.w.Blob=Blob;a.w.URL.createObjectURL=value=>{blob=value;return 'blob:test';};a.w.URL.revokeObjectURL=()=>{};a.w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};a.click('#export');const text=await blob.text();assert.equal(text.trim().split('\n').length,58);assert.equal((text.match(/EXTRA/g)||[]).length,12);assert.match(text,/abroad \| בחוץ לארץ/);assert.equal(filename,'word-steps-grade8.txt');}finally{a.close();}});
scenario('IMPORT-04: cancellation preserves content and progress',a=>{a.mode(1);a.click('#reveal');a.importText('apple - תפוח');assert.equal(a.$('#count').textContent,'58');assert.equal(a.state().stats.abroad.focus,true);},{confirm:false});
test('ROBUSTNESS-01: valid JSON with corrupt word records must recover safely',()=>{const a=boot({stored:{words:[null],stats:{}}});try{assert.equal(a.$('#count').textContent,'58');}finally{a.close();}});
test('ROBUSTNESS-02: nonnumeric saved attempt count must not corrupt progress',()=>{const a=boot({stored:{stats:{abroad:{attempts:'invalid',checked:true,focus:true}}}});try{a.mode(1);a.submit('abroad');assert.ok(Number.isFinite(a.state().stats.abroad.attempts));}finally{a.close();}});
