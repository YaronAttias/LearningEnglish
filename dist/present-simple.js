/* Present Simple is independent of vocabulary scores and imported word lists. */
(() => {
  const categories = {positive:'חיוב', negative:'שלילה', question:'שאלות'};
  let category='positive', queue=[], cursor=0, review=false, answered=false, missed=new Set(), correct=0;
  const button=document.createElement('button');
  button.className='mode';button.dataset.mode='5';button.textContent='Present Simple';button.setAttribute('aria-pressed','false');
  $('modes').append(button);
  const shuffle = values => {const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  function start(kind=category){category=kind;queue=PRESENT_SIMPLE_QUESTIONS.filter(q=>q.kind===category);cursor=0;review=false;missed=new Set();correct=0;show();}
  function show(){
    stopPenalty?.();stopPenalty=null;locked=false;answered=false;
    $('stage').classList.remove('word-feed','penalty-stage');$('stage').classList.add('grammar-stage');
    $('filter').disabled=true;$('shuffle').disabled=false;$('shuffle').textContent='סבב חדש ↻';
    document.querySelector('.mission-cta')?.setAttribute('aria-pressed','false');
    document.querySelectorAll('.mode').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('modeTitle').textContent='Present Simple · '+categories[category];
    $('position').textContent=(review?'חזרה לחיזוק · ':'')+`${cursor+1} מתוך ${queue.length}`;
    $('bar').style.width=100*cursor/queue.length+'%';summary();
    const q=queue[cursor];
    $('stage').innerHTML=`<div class="grammar"><div class="grammar-categories" role="group" aria-label="סוג המשפט">${Object.entries(categories).map(([kind,title])=>`<button type="button" data-grammar-category="${kind}" aria-pressed="${kind===category}" class="${kind===category?'primary':''}">${title} · 20</button>`).join('')}</div><p class="hint">בחרו את האפשרות שמשלימה את המשפט בזמן הווה פשוט.</p><p class="sentence grammar-sentence" dir="ltr">${escapeHTML((q.before+' _____ '+q.after).trim())}</p><div class="options grammar-options" role="group" aria-label="אפשרויות תשובה" dir="ltr">${shuffle(q.options).map((value,i)=>`<button type="button" data-grammar-choice="${i}" aria-pressed="false">${escapeHTML(value)}</button>`).join('')}</div><div id="grammar-feedback" role="status" aria-live="polite" class="feedback"></div><div id="grammar-after"></div></div>`;
    $('stage').querySelectorAll('[data-grammar-category]').forEach(b=>b.onclick=()=>start(b.dataset.grammarCategory));
    $('stage').querySelectorAll('[data-grammar-choice]').forEach(b=>{const value=b.textContent;b.onclick=()=>answerQuestion(q,value,b);});
  }
  function answerQuestion(q,value,selected){
    if(answered)return;answered=true;const ok=q.answer.includes(value.toLowerCase());
    if(!review){if(ok)correct++;else missed.add(q);}
    window.WordUsage?.answer();
    selected.setAttribute('aria-pressed','true');
    $('stage').querySelectorAll('[data-grammar-choice]').forEach(b=>{b.disabled=true;if(q.answer.includes(b.textContent.toLowerCase())){b.classList.add('primary');b.textContent+=' ✓';}else if(b===selected){b.classList.add('grammar-wrong');b.textContent+=' ✕';}});
    const right=q.options.find(v=>q.answer.includes(v.toLowerCase()));
    $('stage').querySelector('.grammar-sentence').textContent=(q.before+' '+right+' '+q.after).trim();
    $('grammar-feedback').textContent=(ok?'נכון! ✓ ':'התשובה הנכונה: '+right+'. ')+q.tip;
    $('grammar-feedback').className='feedback '+(ok?'correct':'wrong');
    $('bar').style.width=100*(cursor+1)/queue.length+'%';
    const next=document.createElement('button');next.type='button';next.id='grammar-next';next.className='primary';
    next.textContent=cursor+1<queue.length?'המשפט הבא ←':!review&&missed.size?'חזרה על הטעויות ←':'סיום הסבב ✓';
    next.onclick=()=>{cursor++;if(cursor<queue.length){show();return;}if(!review&&missed.size){queue=shuffle([...missed]);cursor=0;review=true;show();return;}finish();};
    $('grammar-after').append(next);
  }
  function finish(){
    window.WordUsage?.complete();$('position').textContent='הסבב הושלם';$('bar').style.width='100%';
    $('stage').innerHTML=`<div class="grammar"><h2>כל הכבוד, סיימת את הסבב! 🎉</h2><p>${correct} מתוך 20 תשובות נכונות בניסיון הראשון.</p>${missed.size?`<p>חזרת גם על ${missed.size} משפטים לחיזוק.</p>`:''}<div class="actions"><button type="button" class="primary" id="grammar-restart">סבב נוסף</button><button type="button" id="grammar-category-next">לקטגוריה הבאה ←</button></div></div>`;
    $('grammar-restart').onclick=()=>start();$('grammar-category-next').onclick=()=>{const keys=Object.keys(categories);start(keys[(keys.indexOf(category)+1)%keys.length]);};
  }
  const previousBuild=buildDeck,previousRender=render,previousShuffle=$('shuffle').onclick;
  const previousMission=renderMission;
  renderMission=function(){$('filter').disabled=false;$('shuffle').textContent='ערבוב מילים ↻';$('stage').classList.remove('grammar-stage');previousMission();};
  buildDeck=function(){if(mode===5){start();return;}previousBuild();};
  render=function(){if(mode===5){show();return;}$('filter').disabled=false;$('shuffle').textContent='ערבוב מילים ↻';$('stage').classList.remove('grammar-stage');previousRender();};
  $('shuffle').onclick=()=>mode===5?start():previousShuffle();
  button.onclick=()=>{mode=5;start();};
})();
