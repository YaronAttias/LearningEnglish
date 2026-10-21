
window.WordPenalty={mount(host,options){
host.innerHTML='<div id="pa-arena" dir="rtl">'+"<section class=\"game\" aria-label=\"Word Steps — זירת הפנדלים\">\n<header class=\"top\"><div><div class=\"logo\">WORD<span>LEAGUE</span></div><div class=\"eyebrow\">WORD STEPS · PENALTY ARENA</div></div><div class=\"stage-tag\">ליל הגמר<br><b>דו־קרב פנדלים</b></div></header>\n<div class=\"arena\"><canvas aria-label=\"אצטדיון לילי, בועט במדי הקבוצה ושוער מאויר עם כפפות\" role=\"img\"></canvas><div class=\"hud\"><div class=\"scoreboard\"></div></div><div class=\"targets\"></div><div class=\"flash\" aria-hidden=\"true\"></div><div class=\"round\"></div><div class=\"shooter-name\"></div></div>\n<div class=\"content\" aria-live=\"polite\"></div>\n<footer class=\"bottom\"><span>לומדים, משחקים ומתקדמים</span><span>יריבה מדומה · ההתקדמות נשמרת במכשיר</span></footer>\n</section>\n"+'</div>';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let alive=true,answered=false,firstCorrect=0;

const root=host.querySelector('#pa-arena'),canvas=root.querySelector('canvas'),ctx=options.noCanvas?null:canvas.getContext('2d'),panel=root.querySelector('.content'),board=root.querySelector('.scoreboard'),targets=root.querySelector('.targets'),flash=root.querySelector('.flash');
const qs=options.questions;
let contest=PenaltyRules.create();
const defending=()=>s.role==='defend';
const questionIndex=()=>s.i*2+Number(defending());
function beginDefense(){if(busy||contest.winner||contest.turn!=='away'||s.phase!=='result')return;s.role='defend';s.phase='defense-question';s.errors=0;s.rejected=[];s.lastLearningMiss=false;ensureQuestion(questionIndex());save();render();}
function ensureQuestion(i){while(!qs[i]){const q=options.nextQuestion?.(qs.length)||qs[qs.length%options.questions.length];qs.push({...q,a:[...q.a]});}return qs[i];}
function finish(){if(!contest.winner)return;s.phase='end';if(!answered){answered=true;options.onComplete();}save();render();}

const clubs=[
{name:'ריאל מדריד',short:'REAL MADRID',code:'RM',kit:'#f4f3ed',trim:'#c1a562',text:'#243859',source:'https://www.realmadrid.com/en-US/football/first-team/players',players:[{name:'קיליאן אמבפה',back:'MBAPPE',n:10,skin:'#a66d49',hair:'#20201b'},{name:'ויניסיוס ג׳וניור',back:'VINI JR.',n:7,skin:'#7c4d34',hair:'#151b1e'},{name:'ג׳וד בלינגהאם',back:'BELLINGHAM',n:5,skin:'#a16a48',hair:'#28221f'}]},
{name:'ברצלונה',short:'BARCELONA',code:'FCB',kit:'#173c87',trim:'#a41f48',text:'#f7d66c',source:'https://www.fcbarcelona.com/en/football/first-team/players',players:[{name:'לאמין ימאל',back:'LAMINE YAMAL',n:10,skin:'#af7b51',hair:'#29251e'},{name:'ראפיניה',back:'RAPHINHA',n:11,skin:'#bd8a61',hair:'#28221b'},{name:'פדרי',back:'PEDRI',n:8,skin:'#d5ac86',hair:'#35271c'}]},
{name:'מנצ׳סטר סיטי',short:'MAN CITY',code:'MC',kit:'#85c7e4',trim:'#f2f7f7',text:'#16364f',source:'https://www.mancity.com/players',players:[{name:'ארלינג הולאנד',back:'HAALAND',n:9,skin:'#efd0b1',hair:'#d9bd7a'},{name:'פיל פודן',back:'FODEN',n:47,skin:'#e0b596',hair:'#35291f'},{name:'ראיין שרקי',back:'CHERKI',n:10,skin:'#dbad82',hair:'#31271e'}]},
{name:'ליברפול',short:'LIVERPOOL',code:'LFC',kit:'#c62a35',trim:'#f3eee5',text:'#ffffff',source:'https://www.liverpoolfc.com/teams/mens-team',players:[{name:'אלכסנדר איסאק',back:'ISAK',n:9,skin:'#89583f',hair:'#20201c'},{name:'פלוריאן וירץ',back:'WIRTZ',n:7,skin:'#e2b68c',hair:'#62482b'},{name:'קודי גאקפו',back:'GAKPO',n:18,skin:'#bd8861',hair:'#2a231c'}]},
{name:'באיירן מינכן',short:'BAYERN',code:'FCB',kit:'#ce283a',trim:'#f8f6ed',text:'#ffffff',source:'https://fcbayern.com/en/teams/first-team',players:[{name:'הארי קיין',back:'KANE',n:9,skin:'#deb18d',hair:'#5d3d27'},{name:'ג׳מאל מוסיאלה',back:'MUSIALA',n:10,skin:'#ae7b54',hair:'#25251d'},{name:'מייקל אוליסה',back:'OLISE',n:17,skin:'#966642',hair:'#28221d'}]}
];
let s={v:4,phase:'setup',club:options.club||0,player:options.player||0,i:0,g:[],o:[],missed:[],aim:1,power:76,errors:0,rejected:[]},busy=false,frame=0;
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
function save(){if(options.onSelection)options.onSelection(s.club,s.player);}

function poly(points,fill,stroke,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(x,y,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
function ellipse(x,y,rx,ry,c){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
function gradient(x,y,x2,y2,stops){const g=ctx.createLinearGradient(x,y,x2,y2);stops.forEach(([n,c])=>g.addColorStop(n,c));return g;}
function glove(x,y,side,t){ctx.save();ctx.translate(x,y);ctx.rotate(side*(.25+t*.45));poly([[-8,7],[-10,-2],[-8,-11],[-5,-13],[-3,-9],[-2,-15],[2,-15],[3,-9],[6,-13],[9,-11],[9,-2],[11,0],[9,7]],gradient(-10,0,10,0,[[0,'#98bdc1'],[.4,'#f4ffff'],[1,'#bdd5d9']]),'#1b5966',1.2);ctx.fillStyle='#152e45';ctx.fillRect(-8,5,17,6);line(-5,-7,-5,0,'#859fa5',.8);line(0,-10,0,-1,'#859fa5',.8);line(5,-7,5,0,'#859fa5',.8);line(-5,7,6,7,'#c9ff74',2);ctx.restore();}
function person(x,y,dive=0,t=0){ctx.save();ctx.translate(x,y);ctx.rotate(dive*t*1.08);ctx.scale(1.12,1.12);
const leftK=[-23-6*t,40+8*t],rightK=[25+11*t,42-9*t],leftFoot=[-31-6*t,77+4*t],rightFoot=[33+17*t,77-13*t];
line(-12,13,...leftK,'#243a4d',19);line(12,13,...rightK,'#243a4d',19);line(...leftK,...leftFoot,'#25445a',12);line(...rightK,...rightFoot,'#25445a',12);line(...leftK,-29-6*t,63+4*t,'#f2a454',10);line(...rightK,31+14*t,62-11*t,'#f2a454',10);
poly([[leftFoot[0]-6,leftFoot[1]-6],[leftFoot[0]+5,leftFoot[1]-5],[leftFoot[0]+10,leftFoot[1]+2],[leftFoot[0]-13,leftFoot[1]+3]],'#d5ff6c','#132b35',1.5);poly([[rightFoot[0]-5,rightFoot[1]-6],[rightFoot[0]+5,rightFoot[1]-5],[rightFoot[0]+14,rightFoot[1]+3],[rightFoot[0]-10,rightFoot[1]+3]],'#d5ff6c','#132b35',1.5);
const el=-40-7*t,er=40+7*t,ey=-3-22*t,gy=-18-32*t;
line(-23,-25,el,ey,'#e88837',15);line(el,ey,-57-8*t,gy,'#faab53',12);line(23,-25,er,ey,'#e88837',15);line(er,ey,57+8*t,gy,'#faab53',12);
poly([[-15,-37],[-27,-29],[-21,-8],[-17,10],[17,10],[21,-8],[27,-29],[15,-37]],gradient(-24,-10,24,0,[[0,'#be5c23'],[.25,'#f89a41'],[.55,'#ffba66'],[1,'#c4672e']]),'#a95d31',1);
poly([[-17,9],[17,9],[21,28],[3,29],[0,19],[-3,29],[-21,28]],'#193344');line(-15,11,-17,23,'#e9a34e',2);line(15,11,17,23,'#e9a34e',2);
line(-17,-27,-11,-5,'#ffc97c',1);line(17,-27,11,-5,'#be6429',1);line(-9,-35,0,-29,'#233b4b',3);line(0,-29,9,-35,'#233b4b',3);ctx.fillStyle='#193548';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillText('1',0,-6);ctx.fillStyle='#e8f3f4';ctx.fillRect(-13,-25,5,5);
ctx.fillStyle='#c38a62';ctx.fillRect(-6,-45,12,13);ellipse(0,-55,12,16,gradient(-12,-55,12,-55,[[0,'#ad724e'],[.45,'#e2ae7c'],[1,'#c38a60']]));ellipse(-12,-55,3,5,'#c58b61');ellipse(12,-55,3,5,'#c58b61');poly([[-12,-58],[-12,-67],[-7,-73],[6,-73],[12,-66],[12,-58],[7,-65],[-5,-66]],'#2a2722');line(-7,-57,-3,-58,'#372d26',1.8);line(3,-58,7,-57,'#372d26',1.8);line(-5,-54,-4,-54,'#1c2e34',1.5);line(4,-54,5,-54,'#1c2e34',1.5);line(0,-54,-1,-49,'#ab704f',1);line(-4,-46,4,-46,'#86523b',1);glove(-57-8*t,gy,-1,t);glove(57+8*t,gy,1,t);ctx.restore();}
function striker(progress=0,shot=null){const opposing=defending(),club=clubs[opposing?(s.club+1)%5:s.club],p=club.players[opposing?s.i%3:s.player],run=shot?Math.min(1,progress*3):0;ctx.save();ctx.translate(385+90*run,449-15*run);ctx.scale(.93,.93);ctx.rotate(shot?-.11*Math.sin(progress*Math.PI):0);ellipse(0,83,30,7,'#061d1950');
line(-11,25,-17,53,'#c49776',12);line(-17,53,-20,78,'#c9a484',10);line(-20,62,-20,78,club.kit,11);
const kick=shot?Math.sin(Math.min(1,progress*3)*Math.PI):0;line(11,25,17+kick*18,48-kick*18,'#c49776',12);line(17+kick*18,48-kick*18,27+kick*43,78-kick*47,'#c9a484',10);line(24+kick*30,63-kick*36,27+kick*43,78-kick*47,club.kit,11);line(-24,80,-12,80,'#f0fe8c',8);line(24+kick*43,80-kick*47,38+kick*43,80-kick*47,'#f0fe8c',8);
line(-20,-17,-32,7,'#bc8f6d',11);line(20,-17,32,7,'#bc8f6d',11);line(-32,7,-25,20,'#bc8f6d',9);line(32,7,25,20,'#bc8f6d',9);
poly([[-12,-34],[-25,-26],[-26,-8],[-18,-7],[-17,19],[17,19],[18,-7],[26,-8],[25,-26],[12,-34]],club.kit,'#17273880',1);
if(s.club===1){ctx.fillStyle=club.trim;ctx.fillRect(-12,-29,10,47);ctx.fillRect(8,-29,9,47);}line(-20,-25,-14,-29,club.trim,3);line(20,-25,14,-29,club.trim,3);poly([[-17,19],[17,19],[17,34],[2,34],[0,25],[-3,34],[-18,34]],s.club===1?'#173573':club.kit);
ctx.fillStyle=p.skin;ctx.fillRect(-6,-46,12,13);ellipse(0,-54,12,16,p.skin);ellipse(0,-60,13,12,p.hair);if(p.back==='HAALAND'){ellipse(0,-47,5,8,p.hair);}
ctx.textAlign='center';ctx.fillStyle=club.text;ctx.font='bold 6px Arial';ctx.fillText(p.back,0,-20);ctx.font='bold 25px Arial';ctx.fillText(String(p.n),0,6);ctx.restore();}
function football(x,y,r,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);const g=ctx.createRadialGradient(-r*.3,-r*.4,1,0,0,r);g.addColorStop(0,'#ffffff');g.addColorStop(.65,'#e3eaec');g.addColorStop(1,'#839aab');ellipse(0,0,r,r,g);ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();for(let i=0;i<6;i++){const a=i*Math.PI*2/5,px=i===5?0:Math.cos(a)*r*.88,py=i===5?0:Math.sin(a)*r*.88;poly(Array.from({length:5},(_,j)=>[px+Math.cos(j*Math.PI*2/5-.3)*r*.36,py+Math.sin(j*Math.PI*2/5-.3)*r*.36]),'#1b2f43','#80929e',.7);}ctx.restore();ctx.restore();}
let seed=472;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
function draw(progress=0,shot=null){if(!ctx)return;ctx.clearRect(0,0,1000,560);
ctx.fillStyle=gradient(0,0,0,560,[[0,'#081223'],[.4,'#20334b'],[1,'#1c6548']]);ctx.fillRect(0,0,1000,560);
// Stadium roof, structural beams and three tiers of crowd.
poly([[0,30],[500,115],[1000,30],[1000,0],[0,0]],'#101b2c');for(let x=-500;x<1500;x+=120)line(500,110,x,0,'#2f4055',3);
poly([[0,72],[180,142],[820,142],[1000,72],[1000,263],[0,263]],'#142337');
seed=472;for(let j=0;j<1900;j++){const x=rand()*1000,y=112+rand()*145;if(y<145&&x>200&&x<800)continue;ctx.fillStyle=['#578190','#53617e','#d5dcd1','#a6bd7a','#254254','#8f6e71'][Math.floor(rand()*6)];ctx.globalAlpha=.35+rand()*.45;ctx.fillRect(x,y,2+rand()*2,2+rand()*2);}ctx.globalAlpha=1;
for(const y of [151,196,239]){line(0,y,1000,y,'#051521',7);line(0,y-4,1000,y-4,'#608ba25a',1);}
ctx.fillStyle='#0a2339';ctx.fillRect(0,252,1000,22);ctx.fillStyle='#8df5d8';ctx.font='bold 11px Arial';ctx.textAlign='center';for(let x=60;x<1100;x+=175)ctx.fillText('WORD LEAGUE  /  PLAY TO LEARN',x,267);
// Floodlights and volumetric light cones.
for(const x of [82,918]){const g=ctx.createRadialGradient(x,72,0,x,72,95);g.addColorStop(0,'#d1f8ff6a');g.addColorStop(1,'#acd8ff00');ctx.fillStyle=g;ctx.fillRect(x-100,0,200,180);poly([[x-20,80],[x+20,80],[x+230,450],[x-230,450]],'#d8efff06');ctx.fillStyle='#132538';ctx.fillRect(x-44,60,88,15);for(let k=0;k<8;k++){ctx.fillStyle='#edfbff';ctx.fillRect(x-39+k*10,63,7,7);}}
// Perspective pitch and penalty box.
ctx.fillStyle=gradient(0,270,0,560,[[0,'#276f55'],[1,'#154f36']]);ctx.fillRect(0,274,1000,286);
for(let i=0;i<7;i++){const y=274+286*(i/7)**1.45,y2=274+286*((i+1)/7)**1.45;if(i%2===0){ctx.fillStyle='#ffffff06';ctx.fillRect(0,y,1000,y2-y);}}
seed=31;ctx.fillStyle='#a4d88118';for(let i=0;i<1800;i++){const x=rand()*1000,y=280+rand()*280;ctx.fillRect(x,y,1,1+((y-280)/280)*3);}
poly([[277,300],[723,300],[1100,552],[-100,552]],null,'#bde1cb6b',2);poly([[315,301],[685,301],[775,365],[225,365]],null,'#cbead573',2);ellipse(500,464,4,2,'#d6ecdc');
// Goal depth, back net, side panels and frame.
poly([[269,164],[731,164],[731,310],[269,310]],'#10243078');poly([[250,149],[269,164],[269,310],[250,330]],'#c6e4e41b');poly([[750,149],[731,164],[731,310],[750,330]],'#c6e4e41b');
for(let x=270;x<=731;x+=14)line(x,164,x,310,'#cbe1e14a',.8);for(let y=164;y<=310;y+=12)line(269,y,731,y,'#cbe1e14a',.8);
for(let y=150;y<330;y+=12){line(250,y,269,164+(y-150)*.81,'#cbe1e163',.8);line(750,y,731,164+(y-150)*.81,'#cbe1e163',.8);}for(let x=250;x<=750;x+=16)line(x,149,269+(x-250)*.924,164,'#cbe1e163',.8);
line(250,330,250,149,'#b7cad1',7);line(250,149,750,149,'#e3f2f6',7);line(750,149,750,330,'#b7cad1',7);line(253,152,748,152,'#ffffff',2);line(250,330,750,330,'#dfede87a',2);
const kt=shot&&!shot.wide&&!shot.stationary?Math.min(1,Math.max(0,(progress-.12)/.7)):0,dx=shot&&!shot.stationary?(shot.dive%2===0?-1:1):0;
ellipse(500+dx*120*kt,339,45+kt*30,7,'#061d1955');person(500+dx*150*kt,252+(shot&&shot.dive>1?22*kt:-15*kt),dx,kt);
striker(progress,shot);
let bx=500,by=465,br=23;
if(shot){const tx=shot.learningMiss?555:shot.aim%2===0?320:680,ty=shot.wide?-65:shot.aim<2?191:290,e=1-Math.pow(1-progress,1.8);bx=500+(tx-500)*e;by=465+(ty-465)*e-Math.sin(progress*Math.PI)*70;br=23-(shot.wide?20:13)*e;
if(progress<.95){for(let i=4;i>0;i--){const a=Math.max(0,e-i*.025);ellipse(500+(tx-500)*a,465+(ty-465)*a-Math.sin(Math.max(0,progress-i*.015)*Math.PI)*70,br*(1-i*.1),br*(1-i*.1),'#d9ffb0'+['00','18','13','0d','07'][i]);}}
}
ellipse(bx,shot?Math.min(510,465+(330-465)*progress):486,br*1.3,br*.25,'#061b1c60');football(bx,by,br,progress*8);
// Soft vignette keeps attention on goal.
const vignette=ctx.createRadialGradient(500,290,130,500,290,580);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#020d2270');ctx.fillStyle=vignette;ctx.fillRect(0,0,1000,560);
if(shot&&progress>.8&&shot.goal&&!shot.opponent){ctx.save();seed=148;for(let i=0;i<65;i++){const x=rand()*1000,y=rand()*440+(progress-.8)*250;ctx.fillStyle=['#cbff6b','#77d7ff','#ffffff'][i%3];ctx.globalAlpha=(progress-.8)*4;ctx.fillRect(x,y,4,9);}ctx.restore();}
}
function size(){if(!ctx)return;const d=Math.min(devicePixelRatio||1,2);canvas.width=1000*d;canvas.height=560*d;ctx.setTransform(d,0,0,d,0,0);draw();}
function btn(text,action,cls=''){const b=document.createElement('button');b.type='button';b.className='cursor-interaction '+cls;b.textContent=text;b.onclick=action;return b;}
function pips(a){return '<div class="pips" role="list" aria-label="תוצאות הבעיטות">'+Array.from({length:Math.max(5,a.length)},(_,i)=>'<span role="listitem" aria-label="בעיטה '+(i+1)+': '+(i<a.length?(a[i]?'שער':'החמצה'):'טרם נבעטה')+'" class="pip '+(i<a.length?(a[i]?'goal':'miss'):'')+'"></span>').join('')+'</div>';}
function render(){if(!alive)return;root.dataset.phase=s.phase;root.dataset.role=defending()?'defend':'attack';targets.replaceChildren();flash.textContent='';draw();const q=ensureQuestion(questionIndex()),club=clubs[s.club],player=club.players[s.player],opponent=clubs[(s.club+1)%5],opposing=defending();board.innerHTML='<div class="team" data-team="home"><span class="crest" style="background:'+club.kit+';color:'+club.text+'">'+club.code+'</span> '+club.short+'<span class="team-owner">הקבוצה שלך</span>'+pips(s.g)+'</div><div class="scores"><span data-score="home">'+s.g.filter(Boolean).length+'</span> : <span data-score="away">'+s.o.filter(Boolean).length+'</span></div><div class="team" data-team="away">'+opponent.short+' <span class="crest away" style="background:'+opponent.kit+';color:'+opponent.text+'">'+opponent.code+'</span><span class="team-owner">היריבה</span>'+pips(s.o)+'</div>';root.querySelector('.round').textContent=s.phase==='setup'?'הקבוצה שלך בועטת ראשונה':(s.i>=5?'בעיטות הכרעה · ':'')+(opposing?'הגנה · השוער שלך':'התקפה · הבועט שלך')+' · בעיטה '+(s.i+1);const shownPlayer=opposing?opponent.players[s.i%3]:player;root.querySelector('.shooter-name').textContent=shownPlayer.name+' · '+shownPlayer.n+'#';
if(s.phase==='setup'){
panel.innerHTML='<div class="stage-tag">הקבוצה שלך. הבועט שלך.</div><h2 class="selection-title">עם מי עולים למגרש?</h2><div class="club-picks" aria-label="בחירת קבוצה"></div><div class="row"><div class="stage-tag"><b>בחר בועט מ'+club.name+'</b></div><a class="club-source" href="'+club.source+'" target="_blank" rel="noopener">סגל המועדון ↗</a></div><div class="players" aria-label="בחירת שחקן"></div><div class="setup-start"><p>בועטים לסירוגין. עד חמש בעיטות לכל קבוצה, ובהמשך הכרעה אם צריך.</p></div>';
clubs.forEach((c,i)=>{const b=btn('',()=>{s.club=i;s.player=0;save();render();},'club-pick');b.setAttribute('aria-label',c.name);b.setAttribute('aria-pressed',String(i===s.club));b.innerHTML='<span class="shirt" style="--kit:'+c.kit+';--kit-text:'+c.text+'">'+c.code+'</span><span>'+c.name+'</span>';panel.querySelector('.club-picks').append(b);});
club.players.forEach((p,i)=>{const b=btn('',()=>{s.player=i;save();render();},'player-pick');b.setAttribute('aria-label',p.name);b.setAttribute('aria-pressed',String(i===s.player));b.innerHTML='<span class="shirt" style="--kit:'+(s.club===1?'repeating-linear-gradient(90deg,#173c87 0px,#173c87 12px,#a41f48 12px,#a41f48 24px)':club.kit)+';--kit-text:'+club.text+'">'+p.n+'</span><span>'+p.name+'</span><span class="jersey-label">'+p.back+'</span>';panel.querySelector('.players').append(b);});
panel.querySelector('.setup-start').prepend(document.createTextNode('שאלה בהתקפה וגם בהגנה. שני ניסיונות לכל שאלה. '));panel.querySelector('.setup-start').append(btn('עולים למגרש ←',()=>{s.role='attack';s.phase='question';save();render();},'kick'));
}else if(s.phase==='question'||s.phase==='defense-question'){
options.onQuestion?.(questionIndex());const isDefense=defending(),questionPhase=s.phase;
panel.innerHTML='<div class="row"><div class="stage-tag"><b>'+(isDefense?'הגנה / עונים נכון כדי לזנק':'התקפה / עונים נכון כדי לבעוט')+'</b></div><span class="stage-tag">'+(isDefense?'השוער של '+club.name:player.name+' מחכה לבעיטה')+'</span></div><div class="wordrow"><div>'+(q.type===3?'<div class="stage-tag">איזו מילה משלימה את המשפט?</div><div class="sentence-question" lang="en">'+esc(q.s)+'</div>':'<div class="word" lang="en">'+esc(q.w)+'</div><div class="stage-tag">מה הפירוש בעברית?</div>')+'</div></div><div class="choices"></div><div class="hint"></div>';
panel.querySelector('.hint').textContent=s.errors===1?(isDefense?'נשאר ניסיון אחד. טעות נוספת תשאיר את השוער במרכז ותוביל לספיגת גול.':'נשאר ניסיון אחד. טעות נוספת תיחשב כהחמצה.'):'יש לך שני ניסיונות לבחור את התשובה הנכונה.';
q.a.forEach((a,i)=>{const b=btn(a,()=>{if(busy||s.phase!==questionPhase)return;if(i===q.c){if(s.errors===0)firstCorrect++;options.onAttempt(questionIndex(),true,s.errors+1);s.phase=isDefense?'defense-aim':'aim';s.aim=1;save();render();}else{if(!s.missed.includes(q.w))s.missed.push(q.w);s.errors++;options.onAttempt(questionIndex(),false,s.errors);s.rejected.push(i);if(s.errors===2){if(isDefense)opponentKick(true);else shoot(true);}else{save();render();}}},'choice');b.disabled=s.rejected.includes(i);b.dataset.penaltyChoice=String(i);b.dir=q.type===3?'ltr':'rtl';panel.querySelector('.choices').append(b);});
}else if(s.phase==='aim'||s.phase==='defense-aim'){
const isDefense=defending(),aimPhase=s.phase;
panel.innerHTML='<div class="stage-tag"><b>'+(isDefense?'בחר פינה לזינוק':'בחר פינה לבעיטה')+'</b></div><h2>'+(isDefense?'זה הזמן להציל את הקבוצה.':'הכדור אצלך.')+'</h2><div class="stage-tag">'+esc(q.w)+' = '+esc(q.he)+' ✓</div><div class="hint">'+(isDefense?'לחיצה על פינה מפעילה מיד את הבעיטה והזינוק. פינה תואמת = עצירה.':'לחיצה על פינה מפעילה מיד את הבעיטה. העוצמה נקבעת אוטומטית.')+'</div>';
['שמאל גבוה','ימין גבוה','שמאל נמוך','ימין נמוך'].forEach((label,i)=>{const b=btn('＋',()=>{if(busy||s.phase!==aimPhase)return;s.aim=i;save();if(isDefense)opponentKick(false);else shoot();},'target t'+i);b.setAttribute('aria-label',label);targets.append(b);});
}else if(s.phase==='result'){
const goal=s.g[s.i];flash.textContent=goal?'GOOOAL!':s.lastWide?'OVER!':'SAVED!';
panel.innerHTML='<div class="stage-tag">הבעיטה של '+club.name+'</div><h2>'+(goal?'בול לפינה!':s.lastWide?'מעל המשקוף!':'השוער קרא את הבעיטה.')+'</h2><p>'+(s.lastLearningMiss?'שתי תשובות שגויות — הבעיטה שלך נרשמה כהחמצה.':goal?'שער לקבוצה שלך בלבד.':s.lastWide?'הבעיטה עברה מעל השער. התוצאה לא השתנתה.':'השוער עצר. התוצאה לא השתנתה.')+'</p>'+(s.lastLearningMiss?'<div class="answer-reveal">התשובה הנכונה: <bdi lang="en">'+esc(q.w)+'</bdi> = '+esc(q.he)+'</div>':'')+'<div class="resultline stage-tag">'+esc(q.w)+' = '+esc(q.he)+' · '+(contest.winner?'הדו־קרב הוכרע.':'היריבה עוד לא בעטה בתור הזה.')+'</div>';
panel.append(btn(contest.winner?'לשריקת הסיום ←':'לתור השוער שלי ←',()=>{if(s.phase!=='result')return;if(contest.winner)finish();else beginDefense();},'kick'));
}else if(s.phase==='opponent-kicking'){
panel.innerHTML='<div class="stage-tag">השוער של '+club.name+' מול '+opponent.name+'</div><h2>היריבה בועטת…</h2><p>'+(s.lastDefenseFailure?'שתי טעויות — השוער נשאר במרכז.':'השוער מזנק לפינה שבחרת.')+'</p>';
}else if(s.phase==='opponentResult'){
const goal=s.o[s.o.length-1];flash.textContent=goal?'GOAL':'SAVED!';panel.innerHTML='<div class="stage-tag">ההגנה של '+club.name+'</div><h2>'+(goal?'היריבה הבקיעה.':'עצירה גדולה של השוער שלך!')+'</h2><p>'+(s.lastDefenseFailure?'שתי תשובות שגויות — השוער נשאר במרכז והקבוצה ספגה גול.':goal?'הכדור נבעט לפינה אחרת. שער אחד נוסף ליריבה בלבד.':'בחרת את הפינה שאליה נבעט הכדור. אין שער ליריבה.')+'</p>'+(s.lastDefenseFailure?'<div class="answer-reveal">התשובה הנכונה: <bdi lang="en">'+esc(q.w)+'</bdi> = '+esc(q.he)+'</div>':'')+'<p class="stage-tag">'+(contest.winner?'הדו־קרב הוכרע.':s.i>=4?'אם התוצאה שווה, ממשיכים בזוגות בעיטות עד להכרעה.':'עכשיו חוזרים לתור שלך.')+'</p>';
panel.append(btn(contest.winner?'לשריקת הסיום ←':'לבעיטה הבאה ←',()=>{if(s.phase!=='opponentResult')return;if(contest.winner){finish();return;}s.i++;s.role='attack';s.errors=0;s.rejected=[];s.lastLearningMiss=false;s.lastDefenseFailure=false;s.phase='question';ensureQuestion(questionIndex());save();render();},'kick'));
}else{
const a=s.g.filter(Boolean).length,b=s.o.filter(Boolean).length;flash.textContent=contest.winner==='home'?'CHAMPIONS':'NEXT MATCH';panel.innerHTML='<div class="stage-tag">שריקת הסיום / '+a+' : '+b+'</div><h2>'+(contest.winner==='home'?'הניצחון של '+club.name+'.':'הניצחון של '+opponent.name+'.')+'</h2><p>'+firstCorrect+' מתוך '+(s.g.length+s.o.length)+' תשובות נכונות בניסיון הראשון.</p><p>'+(firstCorrect?'קיבלת גם 15 נקודות על השלמת המשחק.':'אפשר לחזור לכרטיסים ולחזק את המילים לפני המשחק הבא.')+'</p>';panel.append(btn('למשחק הבא ←',options.onRestart,'kick'));

}}
function shoot(forcedMiss=false){if(busy||contest.winner||contest.turn!=='home'||!['question','aim'].includes(s.phase))return;const learningMiss=forcedMiss===true;busy=true;s.power=25+Math.floor(Math.random()*76);panel.querySelectorAll('button,input').forEach(e=>e.disabled=true);targets.replaceChildren();const dive=Math.floor(Math.random()*4),wide=learningMiss||(s.power>90&&Math.random()<.5),goal=!learningMiss&&(options.shotOutcome?options.shotOutcome('home',s.i):!wide&&dive!==s.aim),shot={aim:s.aim,dive,goal,wide:goal?false:wide,learningMiss},duration=options.instant?1:reduced?120:1900-s.power*7,turnId=contest.total;let start;
panel.querySelector('.hint').textContent=learningMiss?'שתי טעויות — הכדור נבעט מעל השער…':'הבעיטה בדרך…';
function tick(t){if(!alive||!root.isConnected)return;if(!start)start=t;const p=Math.min(1,(t-start)/duration);draw(p,shot);if(p<1){frame=requestAnimationFrame(tick);}else{contest=PenaltyRules.record(contest,'home',goal,turnId);s.g=contest.home;s.o=contest.away;s.lastWide=shot.wide;s.lastLearningMiss=learningMiss;s.phase='result';busy=false;save();render();draw(1,shot);}}
frame=requestAnimationFrame(tick);}
function opponentKick(forcedGoal=false){if(busy||contest.winner||contest.turn!=='away'||!['defense-question','defense-aim'].includes(s.phase))return;const failed=forcedGoal===true;busy=true;s.lastDefenseFailure=failed;s.phase='opponent-kicking';const power=25+Math.floor(Math.random()*76),aim=options.opponentAim?options.opponentAim(s.i):Math.floor(Math.random()*4),outcome=PenaltyRules.defend(aim,failed?null:s.aim,failed),goal=outcome.goal,shot={aim,dive:failed?null:s.aim,stationary:outcome.stationary,goal,wide:false,opponent:true},duration=options.instant?1:reduced?120:1900-power*7,turnId=contest.total;canvas.dataset.keeperMotion=failed?'stationary':'dive';render();let start;
function tick(t){if(!alive||!root.isConnected)return;if(!start)start=t;const p=Math.min(1,(t-start)/duration);draw(p,shot);if(p<1)frame=requestAnimationFrame(tick);else{contest=PenaltyRules.record(contest,'away',goal,turnId);s.g=contest.home;s.o=contest.away;s.phase='opponentResult';busy=false;save();render();draw(1,shot);}}
frame=requestAnimationFrame(tick);}
size();render();return ()=>{alive=false;cancelAnimationFrame(frame);};
}};
