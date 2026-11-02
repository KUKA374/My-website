(() => {
  const games = [
    ['math-race','🏆 Математикалық жарыс','Екі ойыншы немесе команда дұрыс жауап арқылы жарысады.'],
    ['wheel','🎡 Сәттілік дөңгелегі','Дөңгелек кездейсоқ тапсырма таңдайды.'],
    ['auction','💰 Математикалық аукцион','Команда жауапқа ұпай тігеді.'],
    ['blitz','🧠 Блиц','Қысқа уақытта бірнеше тапсырманы орында.'],
    ['cards','🃏 Математикалық карточкалар','Карточканы ашып, есепті орында.'],
    ['quest','🗺️ Математикалық квест','Бекеттерден өтіп, соңғы мақсатқа жет.'],
    ['secret-number','🔑 Құпия сан','Тапсырмаларды шешіп, жасырын санды тап.'],
    ['puzzle','🧩 Пазл жина','Дұрыс жауаптар арқылы пазлды жина.'],
    ['rocket','🚀 Зымыран жарысы','Дұрыс жауаппен зымыранды алға жылжыт.'],
    ['castle','🏰 Қамалды қорғау','Дұрыс есептермен қамалды қорға.'],
    ['car-race','🏎️ Математикалық жарыс','Дұрыс жауап машинаға жылдамдық береді.'],
    ['target','🎯 Нысанаға дәл тигіз','Дұрыс жауапқа сәйкес нысананы таңда.'],
    ['bridge','🌉 Көпірден өт','Дұрыс жауап арқылы көпірден өт.'],
    ['math-king','👑 Математика патшасы','Деңгейлерден өтіп, финалдық тапсырманы орында.']
  ].map(([id,title,description])=>({id,title,description,formats:['Жеке','Жұптық','Топтық'],skills:['Есептеу','Логика','Белсенділік']}));

  if (typeof mathGames !== 'undefined') mathGames.push(...games);

  const extraIds = new Set(games.map(g => g.id));
  const specialIds = new Set(['math-race','wheel']);
  const coreGet = window.getGameQuestions;
  const coreRender = window.renderCurrentQuestion;
  const special = { id:null, qs:[], i:0, score:0, wheelReady:false, timer:null, timeLeft:20, tugLeft:0, tugRight:0, tugTurn:'left', tugPos:0 };

  const esc = v => String(v ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\"/g,'&quot;').replace(/'/g,'&#039;');

  function css(){
    if(document.getElementById('extra-v5-css')) return;
    const s=document.createElement('style'); s.id='extra-v5-css';
    s.textContent=`
      .v5{max-width:920px;margin:auto;text-align:center}.v5-card{padding:28px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:linear-gradient(145deg,#0c1b2d,#081321);box-shadow:0 18px 55px rgba(0,0,0,.22)}
      .v5-title{color:#5ee7ff;font-size:12px;font-weight:900;letter-spacing:1.7px}.v5-q{font-size:clamp(25px,5vw,44px);font-weight:900;margin:24px 0}.v5-opts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:680px;margin:auto}.v5-opts button{padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#10253d;color:white;font:inherit;font-weight:900;cursor:pointer;transition:.2s}.v5-opts button:hover{border-color:#5ee7ff;transform:translateY(-2px)}
      .v5-hud{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:15px}.v5-pill{padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.06);color:#b9c8d8;font-size:12px;font-weight:900}.v5-pill strong{color:#fff}.v5-timer{color:#f7c873}.v5-timer.danger{color:#ff7b8c}.v5-race{height:100px;border-radius:20px;background:linear-gradient(90deg,rgba(53,212,154,.10),rgba(94,231,255,.12));border:1px solid rgba(255,255,255,.1);position:relative;margin:20px 0;overflow:hidden}.v5-race:before{content:'START';position:absolute;left:12px;top:10px;font-size:9px;color:#66829b;letter-spacing:1px}.v5-race:after{content:'FINISH';position:absolute;right:12px;top:10px;font-size:9px;color:#66829b;letter-spacing:1px}.v5-run{position:absolute;top:52%;transform:translate(-50%,-50%);font-size:42px;transition:left .35s ease}.v5-wheel-wrap{padding:8px}.v5-wheel{width:190px;height:190px;border-radius:50%;margin:5px auto 20px;display:grid;place-items:center;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);border:9px solid #10233b;font-size:46px;box-shadow:0 0 35px rgba(94,231,255,.12);transition:transform 1s cubic-bezier(.17,.67,.25,1)}.v5-wheel.spinning{transform:rotate(900deg)}.v5-wheel-label{color:#8da5bd;font-size:11px}.v5-result{padding:22px;border-radius:18px;background:rgba(53,212,154,.08);border:1px solid rgba(53,212,154,.2);margin-top:18px}.v5-result h2{margin:8px 0}.v5-replay{margin-top:18px}.v5-feedback{min-height:28px;margin-top:14px;font-weight:900}.v5-feedback.ok{color:#35d49a}.v5-feedback.bad{color:#ff7b8c}.v5-teamboard{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:14px;align-items:center;margin:15px 0 20px}.v5-team{padding:18px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:#10253d}.v5-team.active{border-color:#5ee7ff;box-shadow:0 0 22px rgba(94,231,255,.1)}.v5-team.red.active{border-color:#ff7b8c}.v5-team .name{font-size:11px;color:#8da5bd;font-weight:900;letter-spacing:1px}.v5-team .score{font-size:34px;font-weight:900;margin-top:7px}.v5-rope{height:92px;border-radius:18px;background:linear-gradient(90deg,rgba(94,231,255,.08),rgba(255,123,140,.08));border:1px solid rgba(255,255,255,.08);position:relative;overflow:hidden}.v5-rope-line{position:absolute;left:8%;right:8%;top:50%;height:8px;background:#c79a62;border-radius:99px;transform:translateY(-50%)}.v5-rope-mark{position:absolute;top:50%;left:50%;width:24px;height:24px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);transition:left .35s ease;box-shadow:0 0 16px rgba(255,255,255,.35)}.v5-rope-pos{font-size:10px;color:#8399ae;margin-top:8px}.v5-answer-label{font-size:11px;color:#8da5bd;margin:5px 0 14px}.v5-win{font-size:48px;margin-bottom:8px}.v5-win h2{font-size:30px;margin:5px 0}.v5-muted{color:#8195ad;font-size:12px}
      .v5-mini-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:680px;margin:auto}.v5-mini-grid button{padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#10253d;color:#fff;font-weight:900;cursor:pointer}.v5-meter{height:10px;background:#12243a;border-radius:99px;overflow:hidden;margin:15px 0}.v5-meter i{display:block;height:100%;background:linear-gradient(90deg,#5ee7ff,#8b7cff)}
      @media(max-width:700px){.v5-opts,.v5-mini-grid{grid-template-columns:1fr}.v5-card{padding:20px}.v5-teamboard{grid-template-columns:1fr}.v5-rope{order:3}.v5-wheel{width:160px;height:160px}.v5-q{font-size:28px}}
    `;
    document.head.appendChild(s);
  }

  function getSource(key, gameId){
    const bank = window.gameQuestionBank?.[key];
    if(!bank) return [];
    if(gameId === 'tug-of-war') return bank['tug-of-war'] || [];
    return (bank.quickAnswer || []).map(q => ({
      question:q.question,
      answer:String(q.answer),
      options:q.options || makeOptions(q.answer)
    }));
  }

  function makeOptions(answer){
    const a=Number(answer);
    if(Number.isFinite(a)) return [String(a),String(a+2),String(a-2),String(a+4)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);
    return [String(answer),'5','8','10'];
  }

  window.getGameQuestions=function(id,key){
    if(id==='math-race' || id==='wheel'){
      special.id=id; special.qs=getSource(key,id); special.i=0; special.score=0; special.wheelReady=(id!=='wheel');
      return special.qs;
    }
    if(id==='tug-of-war'){
      special.id=id; special.qs=getSource(key,id); special.i=0; special.score=0; special.tugLeft=0; special.tugRight=0; special.tugTurn='left'; special.tugPos=0;
      return special.qs;
    }
    if(extraIds.has(id)){
      const qs=getSource(key,id); special.id=id; special.qs=qs; special.i=0; special.score=0; return qs;
    }
    special.id=null;
    return coreGet ? coreGet(id,key) : [];
  };

  function replay(){
    if(typeof startSelectedGame==='function') startSelectedGame();
  }

  function finishRace(reason='Ойын аяқталды'){
    clearInterval(special.timer);
    const b=document.getElementById('gameQuestion'); if(!b)return;
    b.innerHTML=`<div class="v5"><div class="v5-card"><div class="v5-win">🏆</div><h2>${esc(reason)}</h2><p class="v5-muted">Дұрыс жауап саны: ${special.score / 10}</p><div class="v5-result"><strong>Жалпы ұпай: ${special.score}</strong></div><button class="game-primary v5-replay" type="button" id="v5replay">🔄 Қайта ойнау</button></div></div>`;
    document.getElementById('v5replay').onclick=replay;
  }

  function answerRace(value){
    const q=special.qs[special.i]; if(!q)return;
    const correct=String(value).trim()===String(q.answer).trim();
    if(correct) special.score+=10;
    special.i++;
    if(special.i>=special.qs.length) finishRace(); else renderSpecial();
  }

  function startRaceTimer(){
    clearInterval(special.timer); special.timeLeft=20;
    special.timer=setInterval(()=>{
      special.timeLeft--;
      const el=document.getElementById('v5time'); if(el){el.textContent=`⏱️ ${special.timeLeft} с`;el.classList.toggle('danger',special.timeLeft<=5);}
      if(special.timeLeft<=0){clearInterval(special.timer);special.i++;special.i>=special.qs.length?finishRace('Уақыт аяқталды'):renderSpecial();}
    },1000);
  }

  function renderRace(){
    const q=special.qs[special.i], total=special.qs.length, p=Math.round((special.i/total)*100), b=document.getElementById('gameQuestion');
    b.innerHTML=`<div class="v5"><div class="v5-hud"><span class="v5-pill">🏆 Жарыс</span><span class="v5-pill">Сұрақ <strong>${special.i+1}/${total}</strong></span><span class="v5-pill">Ұпай <strong>${special.score}</strong></span><span class="v5-pill v5-timer" id="v5time">⏱️ 20 с</span></div><div class="v5-card"><div class="v5-race"><span class="v5-run" style="left:${Math.max(5,p)}%">🏃</span></div><div class="v5-q">${esc(q.question)}</div><div class="v5-opts">${q.options.map(o=>`<button type="button" data-race="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="v5-feedback" id="v5feedback"></div></div></div>`;
    b.querySelectorAll('[data-race]').forEach(x=>x.onclick=()=>answerRace(x.dataset.race));
    startRaceTimer();
  }

  function renderWheel(){
    const q=special.qs[special.i], total=special.qs.length, b=document.getElementById('gameQuestion');
    b.innerHTML=`<div class="v5"><div class="v5-hud"><span class="v5-pill">🎡 Сәттілік дөңгелегі</span><span class="v5-pill">Сұрақ <strong>${special.i+1}/${total}</strong></span><span class="v5-pill">Ұпай <strong>${special.score}</strong></span></div><div class="v5-card v5-wheel-wrap"><div class="v5-wheel" id="v5wheel">🎡</div><div class="v5-wheel-label">Алдымен дөңгелекті айналдыр</div><button class="game-primary" id="v5spin" type="button">🎡 Айналдыру</button><div id="v5wheelQuestion"></div></div></div>`;
    document.getElementById('v5spin').onclick=()=>{
      const w=document.getElementById('v5wheel');w.classList.add('spinning');
      setTimeout(()=>{w.classList.remove('spinning');special.wheelReady=true;showWheelQuestion(q);},1000);
    };
  }

  function showWheelQuestion(q){
    const b=document.getElementById('v5wheelQuestion'); if(!b)return;
    b.innerHTML=`<div class="v5-q">${esc(q.question)}</div><div class="v5-opts">${q.options.map(o=>`<button type="button" data-wheel="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    b.querySelectorAll('[data-wheel]').forEach(x=>x.onclick=()=>{if(String(x.dataset.wheel)===String(q.answer))special.score+=20;special.i++;special.i>=special.qs.length?finishWheel():renderWheel();});
  }

  function finishWheel(){
    const b=document.getElementById('gameQuestion'); if(!b)return;
    b.innerHTML=`<div class="v5"><div class="v5-card"><div class="v5-win">🎡🏆</div><h2>Дөңгелек ойыны аяқталды!</h2><div class="v5-result"><strong>Жалпы ұпай: ${special.score}</strong></div><button class="game-primary v5-replay" type="button" id="v5replay">🔄 Қайта ойнау</button></div></div>`;
    document.getElementById('v5replay').onclick=replay;
  }

  function answerTug(value){
    const q=special.qs[special.i], correct=String(value)===String(q.answer);
    if(correct){
      if(special.tugTurn==='left'){special.tugLeft++;special.tugPos=Math.min(3,special.tugPos+1);}else{special.tugRight++;special.tugPos=Math.max(-3,special.tugPos-1);}
    }
    special.tugTurn=special.tugTurn==='left'?'right':'left';
    special.i++;
    if(special.tugPos>=3 || special.tugPos<=-3 || special.i>=special.qs.length) finishTug(); else renderTug();
  }

  function renderTug(){
    const q=special.qs[special.i], total=special.qs.length, b=document.getElementById('gameQuestion'), left=(special.tugPos+3)/6*84+8;
    b.innerHTML=`<div class="v5"><div class="v5-hud"><span class="v5-pill">🪢 Арқан тартыс</span><span class="v5-pill">Раунд <strong>${special.i+1}/${total}</strong></span><span class="v5-pill">Кезек: <strong>${special.tugTurn==='left'?'🔵 Көк команда':'🔴 Қызыл команда'}</strong></span></div><div class="v5-teamboard"><div class="v5-team ${special.tugTurn==='left'?'active':''}"><div class="name">🔵 КӨК КОМАНДА</div><div class="score">${special.tugLeft}</div></div><div><div class="v5-rope"><div class="v5-rope-line"></div><div class="v5-rope-mark" style="left:${left}%"></div></div><div class="v5-rope-pos">Арқан ортасы → дұрыс жауап берген команда жағына жылжиды</div></div><div class="v5-team red ${special.tugTurn==='right'?'active':''}"><div class="name">🔴 ҚЫЗЫЛ КОМАНДА</div><div class="score">${special.tugRight}</div></div></div><div class="v5-card"><div class="v5-answer-label">${special.tugTurn==='left'?'🔵 Көк команда жауап береді':'🔴 Қызыл команда жауап береді'}</div><div class="v5-q">${esc(q.question)}</div><div class="v5-opts">${q.options.map(o=>`<button type="button" data-tug="${esc(o)}">${esc(o)}</button>`).join('')}</div></div></div>`;
    b.querySelectorAll('[data-tug]').forEach(x=>x.onclick=()=>answerTug(x.dataset.tug));
  }

  function finishTug(){
    const winner=special.tugLeft>special.tugRight?'🔵 Көк команда':special.tugRight>special.tugLeft?'🔴 Қызыл команда':'🤝 Тең ойын';
    const b=document.getElementById('gameQuestion');if(!b)return;
    b.innerHTML=`<div class="v5"><div class="v5-card"><div class="v5-win">🪢🏆</div><h2>${winner}</h2><p class="v5-muted">Арқан тартыс аяқталды.</p><div class="v5-result"><strong>Көк: ${special.tugLeft} ұпай &nbsp; | &nbsp; Қызыл: ${special.tugRight} ұпай</strong></div><button class="game-primary v5-replay" type="button" id="v5replay">🔄 Қайта ойнау</button></div></div>`;
    document.getElementById('v5replay').onclick=replay;
  }


  const sceneNames={
    auction:"💰 МАТЕМАТИКАЛЫҚ АУКЦИОН",blitz:"🧠 БЛИЦ",cards:"🃏 КАРТОЧКАЛАР",quest:"🗺️ МАТЕМАТИКАЛЫҚ КВЕСТ",
    "secret-number":"🔑 ҚҰПИЯ САН",puzzle:"🧩 ПАЗЛ ЖИНА",rocket:"🚀 ЗЫМЫРАН ЖАРЫСЫ",castle:"🏰 ҚАМАЛДЫ ҚОРҒА",
    "car-race":"🏎️ КӨЛІК ЖАРЫСЫ",target:"🎯 НЫСАНА",bridge:"🌉 КӨПІРДЕН ӨТ","math-king":"👑 МАТЕМАТИКА ПАТШАСЫ"
  };
  function sceneCss(){
    if(document.getElementById("game-scenes-css"))return;
    const el=document.createElement("style");el.id="game-scenes-css";
    el.textContent=`
      .scene{--scene-accent:#5ee7ff;max-width:960px;margin:auto;color:#eef8ff}
      .scene[data-kind="auction"]{--scene-accent:#f8cc73}.scene[data-kind="puzzle"]{--scene-accent:#b5a3ff}
      .scene[data-kind="castle"]{--scene-accent:#ff9b8a}.scene[data-kind="quest"]{--scene-accent:#7be0ae}
      .scene[data-kind="rocket"]{--scene-accent:#87c6ff}.scene[data-kind="bridge"]{--scene-accent:#7ee2d3}
      .scene-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px}
      .scene-title{font-weight:900;font-size:13px;letter-spacing:1px;color:var(--scene-accent)}
      .scene-chip{font-size:12px;border:1px solid rgba(255,255,255,.13);border-radius:999px;padding:8px 13px;background:#142a43}
      .scene-stage{position:relative;min-height:172px;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:radial-gradient(circle at 80% 0%,rgba(94,231,255,.09),transparent 50%),linear-gradient(145deg,#10253d,#0a1729);overflow:hidden;margin-bottom:16px}
      .scene-stage h3{font-size:15px;color:#bed1e4;margin:0 0 16px}
      .scene-visual{font-size:52px;line-height:1.4;text-align:center}
      .scene-question{border:1px solid rgba(255,255,255,.11);background:#0d2035;border-radius:22px;padding:24px;text-align:center}
      .scene-question h3{font-size:clamp(23px,4vw,36px);line-height:1.35;margin:8px 0 24px}
      .scene-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .scene-options button{font:inherit;font-weight:800;color:#fff;background:#17334e;border:1px solid rgba(255,255,255,.16);border-radius:14px;min-height:56px;padding:14px;cursor:pointer;transition:transform .18s,border-color .18s,background .18s}
      .scene-options button:hover{transform:translateY(-2px);border-color:var(--scene-accent);background:#1d4261}
      .scene-options button:focus-visible{outline:3px solid var(--scene-accent);outline-offset:2px}
      .scene-progress{height:12px;border-radius:99px;background:#1c344b;overflow:hidden;margin:15px 0}
      .scene-progress span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#39c9e8,var(--scene-accent));transition:width .45s}
      .scene-path{display:flex;justify-content:space-between;gap:6px;align-items:center;margin:24px 0}
      .scene-node{flex:1;text-align:center;border-radius:13px;padding:12px 2px;background:#19324b;border:1px solid #31516b;font-size:23px}
      .scene-node.done{background:#145a50;border-color:#4ad5a2}.scene-node.current{outline:2px solid var(--scene-accent);outline-offset:2px}
      .scene-puzzle{display:grid;grid-template-columns:repeat(3,1fr);max-width:290px;margin:auto;gap:5px}
      .scene-piece{aspect-ratio:1;display:grid;place-items:center;border-radius:10px;border:2px dashed #49617d;background:#0a182b;color:#66819e;font-size:28px;transition:background .25s}
      .scene-piece.done{border:2px solid #9d91ff;background:linear-gradient(140deg,#6456c5,#2c8fc0);color:white}
      .scene-track{height:98px;border-radius:18px;position:relative;background:repeating-linear-gradient(90deg,#183c59 0 32px,#204662 32px 64px);border:1px solid #38627b;margin-top:24px}
      .scene-vehicle{position:absolute;left:var(--pos);top:17px;font-size:43px;transition:left .6s ease;transform:translateX(-20%)}.scene-finish{position:absolute;right:14px;top:10px;font-size:43px}
      .scene-health{display:flex;gap:6px;justify-content:center;font-size:29px}
      .scene-targets{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.scene-target{font-size:39px;padding:15px;border-radius:50%;border:2px solid #44647f;background:#163550}
      .scene-bridge{display:flex;gap:5px;justify-content:center;margin-top:28px}.scene-plank{height:27px;flex:1;max-width:60px;background:#244059;border:2px dashed #5a7892;border-radius:5px}.scene-plank.done{background:#8b6041;border:2px solid #d3a06a}
      .scene-auction{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}.scene-money{font-size:26px;font-weight:900;color:#f8cc73}
      .scene-feedback{min-height:24px;margin-top:14px;font-weight:800;color:#b9cfe2}
      .scene-done{text-align:center;padding:38px 20px;border:1px solid rgba(255,255,255,.13);border-radius:23px;background:#0e2239}
      .scene-done h2{font-size:30px}.scene-done p{color:#b9cfe2}
      @media(max-width:600px){.scene-stage{padding:17px;min-height:130px}.scene-question{padding:18px}.scene-options{grid-template-columns:1fr}.scene-node{font-size:17px;padding:9px 2px}.scene-visual{font-size:38px}}
      @media(prefers-reduced-motion:reduce){.scene-progress span,.scene-vehicle,.scene-piece,.scene-options button{transition:none}}
    `;
    document.head.appendChild(el);
  }
  function renderFallback(){
    sceneCss();
    const b=document.getElementById("gameQuestion");if(!b)return;
    const id=special.id,qs=special.qs,total=qs.length,i=special.i,q=qs[i];
    const correct=Number(special.score/10);
    if(!q){
      const label=sceneNames[id]||"ОЙЫН";
      b.innerHTML=`<div class="scene-done"><div class="scene-visual">🏆</div><h2>${esc(label)} аяқталды!</h2><p>Дұрыс жауап: ${correct} / ${total}</p><p>Жиналған ұпай: ${special.score}</p><button class="game-primary" id="scene-replay">🔄 Қайта ойнау</button></div>`;
      b.querySelector("#scene-replay").onclick=replay;
      return;
    }
    const progress=Math.round(i/total*100),label=sceneNames[id]||id;
    let stage="";
    if(id==="rocket"||id==="car-race"){
      const vehicle=id==="rocket"?"🚀":"🏎️";
      stage=`<h3>${id==="rocket"?"Ғарышқа ұшу":"Мәре сызығына жету"}</h3><div class="scene-track"><span class="scene-vehicle" style="--pos:${Math.min(85,correct/total*85)}%">${vehicle}</span><span class="scene-finish">🏁</span></div><div class="scene-progress"><span style="width:${progress}%"></span></div>`;
    }else if(id==="puzzle"){
      const cells=Array.from({length:9},(_,n)=>`<div class="scene-piece ${n<Math.round(correct/total*9)?"done":""}">${n<Math.round(correct/total*9)?"✦":"?"}</div>`).join("");
      stage=`<h3>Дұрыс жауаппен пазл бөліктерін аш</h3><div class="scene-puzzle">${cells}</div>`;
    }else if(id==="quest"||id==="math-king"){
      const icon=id==="quest"?"🗺️":"👑";
      stage=`<h3>${icon} Кезеңдер картасы</h3><div class="scene-path">${Array.from({length:Math.min(total,8)},(_,n)=>`<div class="scene-node ${n<i?"done":n===i?"current":""}">${n<i?"✓":n===i?"📍":"🔒"}</div>`).join("")}</div>`;
    }else if(id==="auction"){
      stage=`<h3>Аукциондағы ұпай қоры</h3><div class="scene-auction"><span class="scene-chip">Бастапқы қор: 100</span><span class="scene-chip">Жауап бонусы: +10</span><span class="scene-money">💰 ${100+special.score} ұпай</span></div><div class="scene-visual">🔨</div>`;
    }else if(id==="castle"){
      stage=`<h3>Қамалды қорғау — ${i+1}-шабуыл</h3><div class="scene-visual">🏰 🛡️</div><div class="scene-health">${Array.from({length:Math.min(total,8)},(_,n)=>n<i?"🟩":"⬜").join("")}</div>`;
    }else if(id==="bridge"){
      stage=`<h3>Көпірді аяқтау үшін есептерді шеш</h3><div class="scene-visual">🚶 🌊</div><div class="scene-bridge">${Array.from({length:Math.min(total,10)},(_,n)=>`<div class="scene-plank ${n<correct?"done":""}"></div>`).join("")}</div>`;
    }else if(id==="target"){
      stage=`<h3>Дұрыс жауап — дәл тиген нысана!</h3><div class="scene-targets"><div class="scene-target">🎯</div><div class="scene-target">🎯</div><div class="scene-target">🎯</div></div>`;
    }else if(id==="cards"){
      stage=`<h3>Карточка №${i+1}</h3><div class="scene-visual">🃏 🂠 🃏</div>`;
    }else if(id==="secret-number"){
      stage=`<h3>Құпия кодты жина</h3><div class="scene-visual">${"🔓".repeat(correct)}${"🔒".repeat(Math.max(0,total-correct))}</div>`;
    }else if(id==="blitz"){
      stage=`<h3>Блиц — жылдам әрі дәл жауап бер!</h3><div class="scene-visual">⚡ ⏱️</div><div class="scene-progress"><span style="width:${progress}%"></span></div>`;
    }else{
      stage=`<h3>Математикалық сынақ</h3><div class="scene-visual">⭐</div>`;
    }
    const options=Array.isArray(q.options)&&q.options.length?q.options:[String(q.answer)];
    b.innerHTML=`<div class="scene" data-kind="${esc(id)}"><div class="scene-header"><span class="scene-title">${esc(label)}</span><span class="scene-chip">Сұрақ ${i+1}/${total} · ⭐ ${special.score}</span></div><div class="scene-stage">${stage}</div><div class="scene-question"><h3>${esc(q.question)}</h3><div class="scene-options">${options.map(o=>`<button type="button" data-scene-answer="${esc(o)}">${esc(o)}</button>`).join("")}</div><div class="scene-feedback" aria-live="polite"></div></div></div>`;
    b.querySelectorAll("[data-scene-answer]").forEach(btn=>btn.onclick=()=>{
      const correctAnswer=String(btn.dataset.sceneAnswer)===String(q.answer);
      b.querySelectorAll("[data-scene-answer]").forEach(x=>x.disabled=true);
      if(correctAnswer)special.score+=10;
      const feedback=b.querySelector(".scene-feedback");
      feedback.textContent=correctAnswer?"✓ Дұрыс! +10 ұпай":"Дұрыс жауап: "+String(q.answer);
      feedback.style.color=correctAnswer?"#73e7b3":"#ffb3a8";
      const next=document.createElement("button");next.className="game-primary";next.type="button";next.textContent=i+1>=total?"Нәтижені көру":"Келесі тапсырма →";
      next.style.marginTop="12px";next.onclick=()=>{special.i++;renderFallback();};
      feedback.appendChild(document.createElement("div")).appendChild(next);
    });
  }

  function renderSpecial(){
    css();
    if(special.id==='math-race')return renderRace();
    if(special.id==='wheel')return renderWheel();
    if(special.id==='tug-of-war')return renderTug();
    if(extraIds.has(special.id))return renderFallback();
    if(coreRender)coreRender();
  }

  window.renderCurrentQuestion=function(){
    if(specialIds.has(special.id)||special.id==='tug-of-war'||extraIds.has(special.id)) renderSpecial();
    else if(coreRender) coreRender();
  };

  if(typeof renderGameCards==='function') renderGameCards();
})();
