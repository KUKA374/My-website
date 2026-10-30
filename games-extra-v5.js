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

  function renderFallback(){
    const q=special.qs[special.i], b=document.getElementById('gameQuestion'); if(!q||!b)return;
    const total=special.qs.length;
    b.innerHTML=`<div class="v5"><div class="v5-hud"><span class="v5-pill">${esc(special.id)}</span><span class="v5-pill">Сұрақ <strong>${special.i+1}/${total}</strong></span><span class="v5-pill">Ұпай <strong>${special.score}</strong></span></div><div class="v5-card"><div class="v5-q">${esc(q.question)}</div><div class="v5-opts">${q.options.map(o=>`<button type="button" data-extra="${esc(o)}">${esc(o)}</button>`).join('')}</div></div></div>`;
    b.querySelectorAll('[data-extra]').forEach(x=>x.onclick=()=>{if(String(x.dataset.extra)===String(q.answer))special.score+=10;special.i++;special.i>=special.qs.length?finishRace():renderFallback();});
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
