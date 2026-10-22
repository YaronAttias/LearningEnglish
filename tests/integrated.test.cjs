const {test}=require('node:test');const assert=require('node:assert/strict');const {boot}=require('./helpers.cjs');
test('FOCUS-SNAPSHOT: one focused word stays the only question through sudden death',()=>{
  const a=boot({stored:{stats:{abroad:{checked:true,focus:true}}},shotOutcome:(team,i)=>team==='home'||i<5});
  try{
    a.filter('focus');begin(a);
    for(let turn=0;turn<12;turn++){
      assert.equal(a.w.eval('mission[step].w.en'),'abroad');
      right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');
    }
    assert.equal(a.state().game.missions,1);
    assert.deepEqual(Object.keys(a.state().stats),['abroad']);
    assert.equal(a.state().game.xp,25);
    a.click('#pa-arena .kick');assert.match(a.$('#stage').textContent,/אין מילים/);
  }finally{a.close();}
});
test('SHUFFLE-GAME: shuffle cannot reset a match and is restored for learning',()=>{
  const a=boot();
  try{
    begin(a);const arena=a.$('#pa-arena');
    for(const phase of ['question','aim','result']){
      if(phase==='aim')right(a).click();
      if(phase==='result')a.click('.target.t1');
      assert.equal(a.$('#shuffle').disabled,true);a.click('#shuffle');
      assert.equal(a.$('#pa-arena'),arena);
      assert.equal(arena.dataset.phase,phase);
    }
    assert.equal(a.$('[data-score="home"]').textContent,'1');
    a.mode(0);assert.equal(a.$('#shuffle').disabled,false);
    a.click('#shuffle');assert.ok(a.$('.word'));
  }finally{a.close();}
});
scenario('FOCUS-REMOVE-GAME: removing a focus marker preserves the active arena',a=>{
  a.filter('focus');begin(a);const arena=a.$('#pa-arena');
  a.click('[data-remove-focus="abroad"]');
  assert.equal(a.$('#pa-arena'),arena);right(a).click();
  a.click('.target.t1');a.click('#pa-arena .kick');
  assert.equal(a.w.eval('mission[step].w.en'),'abroad');
},{stored:{stats:{abroad:{checked:true,focus:true}}}});
function scenario(name,run,options){test(name,()=>{const a=boot(options);try{run(a);}finally{a.close();}});}
function begin(a){a.mode(4);a.all('#pa-arena .kick')[0]?.click();}
function right(a){const s=a.w.eval('mission[step]');const value=s.type===3?s.w.en:s.w.he;return a.all('[data-penalty-choice]').find(b=>b.textContent===value);}
function next(a){a.click('#pa-arena .target.t1');a.click('#pa-arena .kick');right(a).click();a.click('#pa-arena .target.t1');a.click('#pa-arena .kick');}
function complete(a){for(let i=0;i<5;i++){right(a).click();next(a);}}
function reachDefense(a){begin(a);right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');}
scenario('INTEGRATED-01: ten attack and defense answers reward learning and persist after reload',a=>{begin(a);assert.equal(a.$('#answer'),null);complete(a);const state=a.state();assert.equal(state.game.missions,1);assert.equal(state.game.correct,10);assert.equal(state.game.xp,115);assert.ok(state.game.awards.includes('first'));assert.ok(state.game.awards.includes('five'));const b=boot({stored:state});try{assert.match(b.$('#gamePanel').textContent,/115/);}finally{b.close();}});
scenario('ADAPTIVE-01: weak words precede future reviews and wrong retry stays weak',a=>{begin(a);assert.equal(a.w.eval('mission[0].w.en'),'adventure');a.all('[data-penalty-choice]').find(b=>b!==right(a)).click();right(a).click();assert.equal(a.state().stats.adventure.focus,true);assert.equal(a.state().game.correct,0);assert.ok(a.state().stats.adventure.due>Date.now());},{stored:{stats:{adventure:{focus:true,checked:true,due:0},abroad:{checked:true,due:9999999999999}}}});
scenario('ADAPTIVE-02: 70 translation / 30 cloze across two complete missions',a=>{begin(a);assert.equal(a.w.eval('mission.filter(q=>q.type===3).length'),2);complete(a);a.click('#pa-arena .kick');a.click('#pa-arena .kick');assert.equal(a.w.eval('mission.filter(q=>q.type===3).length'),1);});
scenario('ADAPTIVE-03: correct answers schedule spaced review and double clicks award once',a=>{begin(a);const name=a.w.eval('mission[0].w.en');const button=right(a);button.click();button.click();assert.equal(a.state().game.xp,10);assert.ok(a.state().stats[name].due>Date.now()+23*3600000);});
scenario('GAME-01: same word on the same day earns no repeated word XP',a=>{a.mode(2);a.all('[data-choice]').find(b=>b.dataset.choice==='בחוץ לארץ').click();assert.equal(a.state().game.xp,10);a.mode(2);a.all('[data-choice]').find(b=>b.dataset.choice==='בחוץ לארץ').click();assert.equal(a.state().game.xp,10);});
scenario('PENALTY-01: two errors count as a miss and reveal the answer, with no reward',a=>{begin(a);const answer=right(a).textContent;a.all('[data-penalty-choice]').find(b=>b!==right(a)).click();assert.match(a.$('#pa-arena .hint').textContent,/ניסיון אחד/);assert.equal(a.$('.answer-reveal'),null);a.all('[data-penalty-choice]').find(b=>!b.disabled&&b!==right(a)).click();assert.match(a.$('.answer-reveal').textContent,new RegExp(answer));assert.equal(a.all('.pip.miss').length>=1,true);assert.equal(a.state().game.xp,0);assert.equal(a.state().game.correct,0);});
scenario('GAME-03: accepted reset clears game and learning state together',a=>{begin(a);right(a).click();a.click('#reset');assert.equal(a.state().game.xp,0);assert.deepEqual(a.state().stats,{});});
scenario('FEED-01: keyboard advances only focused learning card',a=>{a.$('#stage').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(a.$('.word').textContent,'adventure');a.$('#stage').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));assert.equal(a.$('.word').textContent,'abroad');});
scenario('CONTENT-02: 58 bilingual sentences, exact cloze substitutions and EXTRA coverage',a=>{const words=a.w.eval('SOURCE_WORDS');assert.equal(words.length,58);for(const w of words){assert.ok(w.translation);assert.ok(w.cloze.includes('___'),w.en);assert.equal(w.cloze.replace('___',w.en).toLowerCase(),w.sentence.toLowerCase(),w.en);}});
scenario('STORAGE-05: malformed game and stats fields do not break a mission',a=>{begin(a);right(a).click();assert.ok(Number.isFinite(a.state().game.xp));},{stored:{game:{xp:'bad',days:[null],awards:[3]},stats:{abroad:null}}});
scenario('ADAPTIVE-04: one-word lists still play a standard shootout with five alternating pairs',a=>{a.filter('focus');begin(a);assert.match(a.$('#stage').textContent,/אין מילים/);a.importText('apple | תפוח');a.click('#pa-arena .kick');for(let i=0;i<5;i++){assert.equal(a.all('[data-penalty-choice]').length,1);a.click('[data-penalty-choice]');next(a);}assert.match(a.$('#stage').textContent,/שריקת הסיום/);assert.equal(a.state().game.missions,1);assert.equal(a.state().game.xp,25);});
scenario('MIGRATION-01: previous default saved list gains examples without losing progress',a=>{a.mode(3);assert.match(a.$('.sentence').textContent,/___/);assert.equal(a.state().stats.abroad.attempts,2);},{stored:{words:[{en:'abroad',he:'בחוץ לארץ',sentence:'',cloze:'',translation:''}],stats:{abroad:{checked:true,attempts:2}}}});
scenario('GAME-04: levels and remaining achievement conditions unlock together',a=>{a.mode(2);a.all('[data-choice]').find(b=>b.dataset.choice==='בחוץ לארץ').click();assert.equal(a.state().game.xp,100);assert.ok(a.state().game.awards.includes('level'));assert.ok(a.state().game.awards.includes('twenty'));assert.ok(a.state().game.awards.includes('days'));},{stored:{game:{xp:90,correct:19,days:['2026-01-01','2026-01-02']}}});
scenario('FEED-02: upward touch gesture advances a learning card',a=>{const start=new a.w.Event('touchstart',{bubbles:true});start.touches=[{clientX:100,clientY:300}];a.$('#stage').dispatchEvent(start);const end=new a.w.Event('touchend',{bubbles:true});end.changedTouches=[{clientX:105,clientY:180}];a.$('#stage').dispatchEvent(end);assert.equal(a.$('.word').textContent,'adventure');});
scenario('PENALTY-02: defense cloze hides target and offers English answers',a=>{begin(a);right(a).click();next(a);right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');const q=a.w.eval('mission[step]');assert.equal(q.type,3);assert.equal(a.$('#pa-arena').dataset.role,'defend');assert.match(a.$('.sentence-question').textContent,/___/);assert.equal(a.$('#pa-arena .word'),null);assert.ok(a.all('[data-penalty-choice]').some(b=>b.textContent===q.w.en));assert.equal(a.$('#pa-arena input[type="range"]'),null);});
scenario('PENALTY-03: leaving during a shot cannot award a completed match',a=>{begin(a);right(a).click();a.mode(0);assert.equal(a.$('#pa-arena'),null);assert.equal(a.state().game.missions,0);assert.ok(a.$('#stage').classList.contains('word-feed'));});
scenario('PENALTY-04: attack and defense each require a question; a corner click immediately acts',a=>{begin(a);right(a).click();assert.equal(a.$('#pa-arena .kick'),null);a.click('#pa-arena .target.t1');assert.equal(a.$('[data-score="home"]').textContent,'1');assert.equal(a.$('[data-score="away"]').textContent,'0');a.click('#pa-arena .kick');assert.equal(a.$('#pa-arena').dataset.phase,'defense-question');assert.equal(a.all('.target').length,0);right(a).click();assert.equal(a.$('#pa-arena .kick'),null);a.click('#pa-arena .target.t1');assert.equal(a.$('[data-score="home"]').textContent,'1');assert.equal(a.$('[data-score="away"]').textContent,'1');assert.match(a.$('#pa-arena .content').textContent,/היריבה הבקיעה/);});
scenario('PENALTY-05: two learning errors never grant the opponent a goal',a=>{begin(a);a.all('[data-penalty-choice]').find(b=>b!==right(a)).click();a.all('[data-penalty-choice]').find(b=>!b.disabled&&b!==right(a)).click();assert.equal(a.$('[data-score="home"]').textContent,'0');assert.equal(a.$('[data-score="away"]').textContent,'0');assert.equal(a.all('[data-team="away"] .pip.goal').length,0);});
scenario('PENALTY-06: early 3–0 win rewards six attack/defense answers exactly once',a=>{begin(a);for(let i=0;i<3;i++){right(a).click();next(a);}assert.match(a.$('#pa-arena .content').textContent,/שריקת הסיום/);assert.equal(a.state().game.missions,1);assert.equal(a.state().game.xp,75);assert.equal(a.all('[data-team="home"] .pip.goal').length,3);},{shotOutcome:team=>team==='home'});
scenario('PENALTY-07: sudden death also asks attack and defense questions before deciding',a=>{begin(a);for(let i=0;i<5;i++){right(a).click();next(a);}assert.ok(a.all('[data-penalty-choice]').length);assert.match(a.$('.round').textContent,/הכרעה/);assert.equal(a.state().game.missions,0);right(a).click();a.click('.target.t1');assert.equal(a.state().game.missions,0);a.click('#pa-arena .kick');assert.equal(a.$('#pa-arena').dataset.phase,'defense-question');right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');assert.match(a.$('#pa-arena .content').textContent,/שריקת הסיום/);assert.equal(a.state().game.missions,1);},{shotOutcome:(team,i)=>team==='home'||i<5});
scenario('PENALTY-08: clinching attack does not ask an unnecessary defense question',a=>{begin(a);for(let i=0;i<3;i++){right(a).click();next(a);}right(a).click();a.click('.target.t1');assert.equal(a.all('[data-team="away"] .pip.goal').length,1);assert.equal(a.all('[data-team="away"] .pip.miss').length,2);assert.match(a.$('#pa-arena .kick').textContent,/לשריקת הסיום/);a.click('#pa-arena .kick');assert.match(a.$('#pa-arena .content').textContent,/שריקת הסיום/);assert.equal(a.state().game.missions,1);},{shotOutcome:(team,i)=>team==='home'||i===0});
scenario('DEFENSE-01: matching corner saves immediately; duplicate corner clicks cannot repeat it',a=>{reachDefense(a);right(a).click();const corner=a.$('.target.t0');assert.equal(a.$('#pa-arena .kick'),null);corner.click();corner.click();assert.equal(a.$('#pa-arena').dataset.phase,'opponentResult');assert.equal(a.$('[data-score="away"]').textContent,'0');assert.equal(a.all('[data-team="away"] .pip.miss').length,1);assert.match(a.$('#pa-arena .content').textContent,/עצירה גדולה/);assert.equal(a.$('canvas').dataset.keeperMotion,'dive');});
scenario('DEFENSE-02: different corner concedes exactly one opponent goal',a=>{reachDefense(a);right(a).click();a.click('.target.t3');assert.equal(a.$('[data-score="home"]').textContent,'1');assert.equal(a.$('[data-score="away"]').textContent,'1');assert.equal(a.all('[data-team="away"] .pip.goal').length,1);assert.equal(a.$('canvas').dataset.keeperMotion,'dive');});
scenario('DEFENSE-03: two errors force a stationary keeper, goal, answer reveal and no word reward',a=>{reachDefense(a);const q=a.w.eval('mission[step]'),before=a.state().game.xp;a.all('[data-penalty-choice]').find(b=>b!==right(a)).click();assert.equal(a.$('#pa-arena').dataset.phase,'defense-question');assert.equal(a.$('[data-score="away"]').textContent,'0');a.all('[data-penalty-choice]').find(b=>!b.disabled&&b!==right(a)).click();assert.equal(a.$('canvas').dataset.keeperMotion,'stationary');assert.equal(a.$('[data-score="away"]').textContent,'1');assert.ok(a.$('.answer-reveal').textContent.includes(q.w.en));assert.ok(a.$('.answer-reveal').textContent.includes(q.w.he));assert.equal(a.all('.target').length,0);assert.equal(a.state().game.xp,before);assert.equal(a.state().stats[q.w.en].focus,true);});
scenario('DEFENSE-04: retry success permits saving and keeps the word marked for review',a=>{reachDefense(a);const q=a.w.eval('mission[step]'),before=a.state().game.xp;a.all('[data-penalty-choice]').find(b=>b!==right(a)).click();right(a).click();assert.equal(a.$('#pa-arena').dataset.phase,'defense-aim');a.click('.target.t0');assert.equal(a.$('[data-score="away"]').textContent,'0');assert.equal(a.$('canvas').dataset.keeperMotion,'dive');assert.equal(a.state().game.xp,before);assert.equal(a.state().stats[q.w.en].focus,true);});
for(const role of ['attack','defend'])for(const type of [2,3])scenario('FOCUS-PENALTY: '+role+' type '+type+' updates immediately, survives repeated correct answer and reload',a=>{
  a.importText(type===3?'apple | תפוח | I eat an apple. | אני אוכל תפוח | I eat an ___.\npear | אגס | I eat a pear. | אני אוכל אגס | I eat a ___.':'apple | תפוח\npear | אגס');
  a.w.Math.random=()=>.5;begin(a);
  if(role==='defend'){right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');}
  const current=a.w.eval('mission[step]');assert.equal(current.type,type);const name=current.w.en;
  a.all('[data-penalty-choice]').find(b=>b!==right(a)).click();
  assert.ok(a.all('[data-focus]').some(b=>b.dataset.focus===name));assert.equal(a.$('#focusCount').textContent,'1 מילים');assert.equal(a.state().stats[name].focus,true);
  right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');
  for(let turns=0;a.w.eval('mission[step].w.en')!==name&&turns<4;turns++){right(a).click();a.click('.target.t1');a.click('#pa-arena .kick');}
  assert.equal(a.w.eval('mission[step].w.en'),name);right(a).click();
  assert.equal(a.state().stats[name].focus,true);assert.equal(a.state().stats[name].attempts,1);assert.ok(a.all('[data-focus]').some(b=>b.dataset.focus===name));
  const b=boot({stored:a.state()});try{assert.ok(b.all('[data-focus]').some(button=>button.dataset.focus===name));assert.equal(b.state().stats[name].focus,true);}finally{b.close();}
});
