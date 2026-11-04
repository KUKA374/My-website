(() => {
  const originalGet = window.getGameQuestions;
  const originalRender = window.renderCurrentQuestion;
  const state = {
    id: null,
    questions: [],
    index: 0,
    score: 0,
    race: { blue: 0, red: 0, turn: 'blue', streak: 0 },
    wheel: { questions: [], index: 0, score: 0, spinning: false, bonus:20 },
    token:0,
    locked:false,
    wheelTimeout:null,
    tug: { blue: 0, red: 0, turn: 'blue', pos: 0 }
  };

  function esc(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function styles() {
    if (document.getElementById('team-mode-css')) return;
    const s = document.createElement('style');
    s.id = 'team-mode-css';
    s.textContent = `
      .team-game{max-width:980px;margin:auto;text-align:center}
      .team-hud{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px}
      .team-pill{padding:9px 13px;border-radius:999px;background:rgba(255,255,255,.06);font-size:12px;font-weight:900;color:#b9c8d8}
      .team-pill strong{color:#fff}.team-card{padding:28px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:linear-gradient(145deg,#0c1b2d,#081321)}
      .teams{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:14px;align-items:center;margin-bottom:20px}
      .team-box{padding:18px;border-radius:18px;background:#10253d;border:2px solid transparent;transition:.25s}.team-box.blue.active{border-color:#5ee7ff;box-shadow:0 0 28px rgba(94,231,255,.14)}.team-box.red.active{border-color:#ff7b8c;box-shadow:0 0 28px rgba(255,123,140,.12)}
      .team-name{font-size:11px;font-weight:900;letter-spacing:1px;color:#9bb0c5}.team-score{font-size:42px;font-weight:900;margin-top:6px}.race-track{height:105px;border-radius:20px;border:1px solid rgba(255,255,255,.1);position:relative;overflow:hidden;background:repeating-linear-gradient(90deg,#10243a 0 35px,#172d45 35px 70px)}
      .race-track:before{content:'🏁';position:absolute;right:10px;top:8px;font-size:18px}.race-runner{position:absolute;top:50%;font-size:38px;transform:translate(-50%,-50%);transition:left .35s ease}.race-runner.blue-run{top:31%}.race-runner.red-run{top:73%}.race-line{position:absolute;left:5%;right:5%;bottom:17px;height:3px;background:rgba(255,255,255,.15)}
      .race-question{font-size:clamp(27px,5vw,46px);font-weight:900;margin:25px 0}.answer-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:700px;margin:auto}.answer-grid button{padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#102943;color:#fff;font:inherit;font-weight:900;cursor:pointer;transition:.2s}.answer-grid button:hover{transform:translateY(-2px);border-color:#5ee7ff}.team-feedback{min-height:26px;margin-top:14px;font-weight:900}.team-feedback.good{color:#35d49a}.team-feedback.bad{color:#ff7b8c}
      .wheel-pointer{font-size:28px;margin-bottom:-8px}.wheel-big{width:200px;height:200px;border-radius:50%;margin:0 auto 18px;display:grid;place-items:center;font-size:50px;border:9px solid #10233b;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);box-shadow:0 0 35px rgba(94,231,255,.12);transition:transform 1.1s cubic-bezier(.17,.67,.25,1)}.wheel-big.spin{transform:rotate(1080deg)}
      .wheel-legend{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:-8px 0 18px}.wheel-legend span{padding:5px 11px;border-radius:999px;background:#142d45;border:1px solid #ffffff20;color:#c7dbea;font-size:12px;font-weight:800}
      .winner{animation:teamWinner .7s ease both}.winner-icon{font-size:68px}@keyframes teamWinner{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
      @media(max-width:720px){.teams{grid-template-columns:1fr}.race-track{order:3}.answer-grid{grid-template-columns:1fr}.team-card{padding:20px}.wheel-big{width:165px;height:165px}}
    `;
    document.head.appendChild(s);
  }

  function sourceQuestions(key,id){
    const bank=window.gameQuestionBank?.[key];
    return (bank?.[id]||bank?.quickAnswer||[]).map((q,i)=>{
      const answer=String(q.answer);
      const choices=[...new Set([...(q.options||[]).map(String),answer])];
      const number=Number(answer.replace(",","."));
      const others=Number.isFinite(number)?[number+1,number-1,number+2,number-2].map(String):["0","1","2","3","5","8","10","1/2"];
      for(const v of others){if(!choices.includes(v))choices.push(v);if(choices.length>=4)break;}
      const four=[answer,...choices.filter(v=>v!==answer)].slice(0,4);
      for(let n=four.length-1;n>0;n--){const j=Math.floor(Math.random()*(n+1));[four[n],four[j]]=[four[j],four[n]];}
      return {question:q.question,answer,options:four};
    });
  }

  function startState(id, key) {
    clearTimeout(state.wheelTimeout);state.wheelTimeout=null;state.token++;
    state.locked=false;
    const qs = sourceQuestions(key,id);
    if (id === 'math-race') {
      state.id=id; state.questions=qs; state.index=0; state.score=0; state.race={blue:0,red:0,turn:'blue',streak:0};
    } else if (id === 'wheel') {
      state.id=id; state.wheel.questions=[...qs];
      for(let n=state.wheel.questions.length-1;n>0;n--){const j=Math.floor(Math.random()*(n+1));[state.wheel.questions[n],state.wheel.questions[j]]=[state.wheel.questions[j],state.wheel.questions[n]];} state.wheel.index=0; state.wheel.score=0; state.wheel.spinning=false; state.wheel.bonus=20; state.questions=state.wheel.questions;
    } else if (id === 'tug-of-war') {
      state.id=id; state.questions=(window.gameQuestionBank?.[key]?.['tug-of-war']||[]); state.index=0; state.tug={blue:0,red:0,turn:'blue',pos:0};
    }
    return state.questions;
  }

  window.getGameQuestions = function(id,key) {
    if (id === 'math-race' || id === 'wheel' || id === 'tug-of-war') return startState(id,key);
    state.id=null;state.token++;clearTimeout(state.wheelTimeout);state.wheelTimeout=null;
    return originalGet ? originalGet(id,key) : [];
  };

  function progress(index,total){
    document.getElementById('gameProgress').textContent=`${index+1} / ${total}`;
    state.locked=false;
    window.GameSession?.present(index);
  }

  // Keep the answer visible until the player explicitly continues. The token
  // prevents old controls and animation callbacks from affecting a new game.
  function feedback(value,q,advance){
    if(state.locked||!q||window.GameSession&&!window.GameSession.canAnswer())return;
    state.locked=true;
    const token=state.token, box=document.getElementById('gameQuestion');
    const ok=answersMatch(value,q.answer);
    window.GameSession?.record(state.id==='wheel'?state.wheel.index:state.index,ok,value);
    box.querySelectorAll('.answer-grid button').forEach(btn=>{
      btn.disabled=true;
      if(answersMatch(btn.textContent,q.answer))btn.classList.add('answer-correct');
      else if(answersMatch(btn.textContent,value))btn.classList.add('answer-wrong');
    });
    const panel=document.createElement('div');panel.className='game-answer-feedback '+(ok?'good':'bad');panel.setAttribute('role','status');
    panel.textContent=ok?'✓ Дұрыс жауап!':'✕ Дұрыс жауап: '+q.answer;
    const next=document.createElement('button');next.type='button';next.className='game-primary';next.textContent='Жалғастыру →';
    let used=false;
    next.onclick=()=>{if(used||token!==state.token)return;used=true;advance(ok);};
    panel.appendChild(document.createElement('div')).appendChild(next);box.appendChild(panel);next.focus({preventScroll:true});
  }

  function renderRace() {
    styles(); const q=state.questions[state.index], total=state.questions.length, b=document.getElementById('gameQuestion');
    if(!q) return finishRace();
    progress(state.index,total);
    const turn=state.race.turn, bluePos=Math.min(88,8+state.race.blue*22), redPos=Math.min(88,8+state.race.red*22);
    b.innerHTML=`<div class="team-game"><div class="team-hud"><span class="team-pill">🏆 МАТЕМАТИКАЛЫҚ ЖАРЫС</span><span class="team-pill">Раунд <strong>${state.index+1}/${total}</strong></span><span class="team-pill">Кезек: <strong>${turn==='blue'?'🔵 Көк':'🔴 Қызыл'}</strong></span></div><div class="teams"><div class="team-box blue ${turn==='blue'?'active':''}"><div class="team-name">🔵 КӨК КОМАНДА</div><div class="team-score">${state.race.blue}</div></div><div class="race-track"><span class="race-runner blue-run" style="left:${bluePos}%">🏃‍♂️</span><span class="race-runner red-run" style="left:${redPos}%">🏃</span><div class="race-line"></div></div><div class="team-box red ${turn==='red'?'active':''}"><div class="team-name">🔴 ҚЫЗЫЛ КОМАНДА</div><div class="team-score">${state.race.red}</div></div></div><div class="team-card"><div class="team-pill">${turn==='blue'?'🔵 Көк команда жауап береді':'🔴 Қызыл команда жауап береді'}</div><div class="race-question">${esc(q.question)}</div><div class="answer-grid">${q.options.map(o=>`<button data-race-team="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="team-feedback" id="teamFeedback"></div></div></div>`;
    b.querySelectorAll('[data-race-team]').forEach(btn=>btn.onclick=()=>raceAnswer(btn.dataset.raceTeam));
  }

  function raceAnswer(value) {
    const q=state.questions[state.index];
    feedback(value,q,correct=>{
      const turn=state.race.turn;
      if(correct)state.race[turn]++;
      state.index++;state.race.turn=turn==='blue'?'red':'blue';
      state.index>=state.questions.length?finishRace():renderRace();
    });
  }

  function finishRace(){
    state.locked=true;document.getElementById("gameProgress").textContent="Нәтиже";
    const winner=state.race.blue>state.race.red?'🔵 Көк команда':state.race.red>state.race.blue?'🔴 Қызыл команда':'🤝 Тең ойын', b=document.getElementById('gameQuestion');
    b.innerHTML=`<div class="team-game"><div class="team-card winner"><div class="winner-icon">🏆</div><h2>${winner}</h2><p>Математикалық жарыс аяқталды!</p><div class="teams"><div class="team-box blue"><div class="team-name">КӨК</div><div class="team-score">${state.race.blue}</div></div><div></div><div class="team-box red"><div class="team-name">ҚЫЗЫЛ</div><div class="team-score">${state.race.red}</div></div></div><button class="game-primary" id="raceReplay">🔄 Қайта ойнау</button></div></div>`;
    document.getElementById('raceReplay').onclick=()=>{if(typeof startSelectedGame==='function')startSelectedGame();};
    window.GameSession?.finish();
  }

  function renderWheel() {
    styles(); const q=state.wheel.questions[state.wheel.index], total=state.wheel.questions.length, b=document.getElementById('gameQuestion');
    if(!q)return finishWheel();
    progress(state.wheel.index,total);state.wheel.spinning=false;
    b.innerHTML=`<div class="team-game"><div class="team-hud"><span class="team-pill">🎡 СӘТТІЛІК ДӨҢГЕЛЕГІ</span><span class="team-pill">Тапсырма <strong>${state.wheel.index+1}/${total}</strong></span><span class="team-pill">Ұпай <strong>${state.wheel.score}</strong></span></div><div class="team-card"><div class="wheel-pointer">▼</div><div class="wheel-big" id="teamWheel">🎡</div><div class="wheel-legend"><span>🔹 10</span><span>🟣 20</span><span>🟡 30</span><span>🔴 40</span></div><button class="game-primary" id="spinTeamWheel">🎡 Айналдыру</button><div id="wheelTask"></div></div></div>`;
    document.getElementById('spinTeamWheel').onclick=()=>{
      if(state.wheel.spinning||state.locked||window.GameSession&&!window.GameSession.canAnswer())return; state.wheel.spinning=true;
      document.getElementById('spinTeamWheel').disabled=true; const w=document.getElementById('teamWheel'); w.classList.add('spin');
      const token=state.token;
      const sector=Math.floor(Math.random()*4);
      state.wheel.bonus=[10,20,30,40][sector];
      w.style.transform=`rotate(${1440+315-90*sector}deg)`;
      state.wheelTimeout=(window.GameSession?window.GameSession.defer:setTimeout)(()=>{if(token!==state.token||state.id!=='wheel')return;w.classList.remove('spin');showWheelTask(q);},1100);
    };
  }

  function showWheelTask(q){
    const box=document.getElementById('wheelTask'); if(!box)return;
    box.innerHTML=`<div class="team-pill">🎁 Таңдалған сектор: +${state.wheel.bonus} ұпай</div><div class="race-question">${esc(q.question)}</div><div class="answer-grid">${q.options.map(o=>`<button data-wheel-team="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="team-feedback" id="wheelFeedback"></div>`;
    box.querySelectorAll('[data-wheel-team]').forEach(btn=>btn.onclick=()=>{feedback(btn.dataset.wheelTeam,q,ok=>{if(ok)state.wheel.score+=state.wheel.bonus;state.wheel.index++;state.wheel.index>=state.wheel.questions.length?finishWheel():renderWheel();});});
  }

  function finishWheel(){
    state.locked=true;document.getElementById("gameProgress").textContent="Нәтиже";
    const b=document.getElementById('gameQuestion');b.innerHTML=`<div class="team-game"><div class="team-card winner"><div class="winner-icon">🎡🏆</div><h2>Дөңгелек аяқталды!</h2><p>Жалпы нәтиже</p><div class="team-score">${state.wheel.score} ұпай</div><button class="game-primary" id="wheelReplay">🔄 Қайта ойнау</button></div></div>`;
    document.getElementById('wheelReplay').onclick=()=>{if(typeof startSelectedGame==='function')startSelectedGame();};
    window.GameSession?.finish();
  }

  function renderTug(){
    styles(); const q=state.questions[state.index], total=state.questions.length,b=document.getElementById('gameQuestion'); if(!q)return finishTug();
    progress(state.index,total);
    const t=state.tug.turn,left=(state.tug.pos+3)/6*84+8;
    b.innerHTML=`<div class="team-game"><div class="team-hud"><span class="team-pill">🪢 АРҚАН ТАРТЫС</span><span class="team-pill">Раунд <strong>${state.index+1}/${total}</strong></span><span class="team-pill">Кезек: <strong>${t==='blue'?'🔵 Көк':'🔴 Қызыл'}</strong></span></div><div class="teams"><div class="team-box blue ${t==='blue'?'active':''}"><div class="team-name">🔵 КӨК</div><div class="team-score">${state.tug.blue}</div></div><div class="race-track"><div class="race-line"></div><span class="race-runner" style="left:${left}%">🪢</span></div><div class="team-box red ${t==='red'?'active':''}"><div class="team-name">🔴 ҚЫЗЫЛ</div><div class="team-score">${state.tug.red}</div></div></div><div class="team-card"><div class="team-pill">${t==='blue'?'Көк команда жауап береді':'Қызыл команда жауап береді'}</div><div class="race-question">${esc(q.question)}</div><div class="answer-grid">${q.options.map(o=>`<button data-tug-team="${esc(o)}">${esc(o)}</button>`).join('')}</div></div></div>`;
    b.querySelectorAll('[data-tug-team]').forEach(btn=>btn.onclick=()=>tugAnswer(btn.dataset.tugTeam));
  }

  function tugAnswer(value){
    const q=state.questions[state.index];
    feedback(value,q,ok=>{
      const t=state.tug.turn;
      if(ok){state.tug[t]++;state.tug.pos+=t==='blue'?-1:1;}
      state.tug.turn=t==='blue'?'red':'blue';state.index++;
      if(Math.abs(state.tug.pos)>=3||state.index>=state.questions.length)finishTug();else renderTug();
    });
  }

  function finishTug(){
    state.locked=true;document.getElementById("gameProgress").textContent="Нәтиже";
    const winner=state.tug.pos<0?'🔵 Көк команда':state.tug.pos>0?'🔴 Қызыл команда':'🤝 Тең ойын',b=document.getElementById('gameQuestion');
    b.innerHTML=`<div class="team-game"><div class="team-card winner"><div class="winner-icon">🪢🏆</div><h2>${winner}</h2><p>Арқан тартыс аяқталды!</p><div class="teams"><div class="team-box blue"><div class="team-name">КӨК</div><div class="team-score">${state.tug.blue}</div></div><div></div><div class="team-box red"><div class="team-name">ҚЫЗЫЛ</div><div class="team-score">${state.tug.red}</div></div></div><button class="game-primary" id="tugReplay">🔄 Қайта ойнау</button></div></div>`;
    document.getElementById('tugReplay').onclick=()=>{if(typeof startSelectedGame==='function')startSelectedGame();};
    window.GameSession?.finish();
  }

  if(window.GameSession)window.GameSession.adapters.teams={
    setQuestions(qs){if(state.id){state.questions=qs;if(state.id==='wheel')state.wheel.questions=qs;}},
    snapshot(){return JSON.parse(JSON.stringify(state));},
    restore(s){Object.assign(state,s);const i=state.id==='wheel'?state.wheel.index:state.index;
      const model=window.GameSession.current(),row=model.records[model.questions[i]?._sessionKey];
      if(state.locked&&row){if(state.id==='math-race'){if(row.correct)state.race[state.race.turn]++;state.race.turn=state.race.turn==='blue'?'red':'blue';state.index++;}
      else if(state.id==='tug-of-war'){if(row.correct){state.tug[state.tug.turn]++;state.tug.pos+=state.tug.turn==='blue'?-1:1;}state.tug.turn=state.tug.turn==='blue'?'red':'blue';state.index++;}
      else {if(row.correct)state.wheel.score+=state.wheel.bonus;state.wheel.index++;}}
      state.locked=false;
      if(state.id==='math-race')renderRace();
      else if(state.id==='tug-of-war'){if(Math.abs(state.tug.pos)>=3||state.index>=state.questions.length)finishTug();else renderTug();}
      else {const wasSpinning=state.wheel.spinning;renderWheel();if(wasSpinning&&!row&&state.wheel.questions[state.wheel.index]){document.getElementById('spinTeamWheel').disabled=true;state.wheel.spinning=true;showWheelTask(state.wheel.questions[state.wheel.index]);}}
    }
  };

  window.cancelGameTeams=function(){state.locked=true;state.id=null;state.token++;clearTimeout(state.wheelTimeout);state.wheelTimeout=null;};

  window.renderCurrentQuestion=function(){
    if(state.id==='math-race')return renderRace();
    if(state.id==='wheel')return renderWheel();
    if(state.id==='tug-of-war')return renderTug();
    return originalRender ? originalRender() : undefined;
  };
})();
