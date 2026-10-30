(() => {
  const games = [
    ['math-race','🏆 Математикалық жарыс','Екі ойыншы немесе команда дұрыс жауап арқылы жарыста алға жылжиды.',['Жұптық','Топтық']],
    ['wheel','🎡 Сәттілік дөңгелегі','Дөңгелек кездейсоқ тапсырманы таңдайды, ойыншы есепті шешеді.',['Сыныппен','Жеке']],
    ['auction','💰 Математикалық аукцион','Команда жауапқа сенімділігіне қарай ұпай тігіп, дұрыс шешіммен ұтысын арттырады.',['Топтық']],
    ['blitz','🧠 Блиц','Қысқа уақыт ішінде бірнеше математикалық тапсырманы қатарынан орында.',['Жеке','Жұптық']],
    ['cards','🃏 Математикалық карточкалар','Карточканы ашып, оның ішіндегі есепті орында.',['Жеке','Жұптық']],
    ['quest','🗺️ Математикалық квест','Бірнеше бекеттен өтіп, соңғы математикалық мақсатқа жет.',['Топтық','Жұптық']],
    ['secret-number','🔑 Құпия сан','Математикалық тапсырмаларды шешіп, жасырылған санды анықта.',['Жеке','Жұптық']],
    ['puzzle','🧩 Пазл жина','Әр дұрыс жауап пазлдың бір бөлігін ашады.',['Жеке','Топтық']],
    ['rocket','🚀 Зымыран жарысы','Әр дұрыс жауап зымыранды келесі деңгейге көтереді.',['Жеке','Сыныппен']],
    ['castle','🏰 Қамалды қорғау','Дұрыс есептермен математикалық қамалды қорғайсың.',['Топтық','Сыныппен']],
    ['car-race','🏎️ Математикалық жарыс','Әр дұрыс жауап машинаға жылдамдық береді.',['Жеке','Жұптық']],
    ['target','🎯 Нысанаға дәл тигіз','Тапсырманы шешіп, нысанадағы дұрыс жауапты таңда.',['Жеке','Жұптық']],
    ['bridge','🌉 Көпірден өт','Әр дұрыс жауап көпірдің келесі тасын ашады.',['Жеке','Топтық']],
    ['math-king','👑 Математика патшасы','Деңгейлерден өтіп, финалдық тапсырманы орындап, математиканың патшасы атан.',['Жеке','Сыныппен']]
  ];
  const extraGames = games.map(([id,title,description,formats]) => ({id,title,description,formats,skills:['Есептеу','Логика','Белсенділік']}));
  window.mathGames = (window.mathGames || []).concat(extraGames);
  const ids = new Set(extraGames.map(g => g.id));
  let state = { id:null, questions:[], index:0, score:0, lessonKey:'' };
  const oldGet = window.getGameQuestions;
  const oldSelect = window.selectGame;

  function esc(v){ return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;'); }
  function questionsFor(lessonKey){
    let q = oldGet ? oldGet('quick-answer',lessonKey) : [];
    if(!q.length && window.gameQuestionBank?.[lessonKey]) q = window.gameQuestionBank[lessonKey].quickAnswer || [];
    return q.map((x,i)=>({question:x.question || `Тапсырма ${i+1}`,answer:String(x.answer ?? ''),options:x.options || [String(x.answer ?? ''),'5','8','10'].filter((v,j,a)=>a.indexOf(v)===j).slice(0,4)}));
  }
  window.getGameQuestions = function(gameId,lessonKey){ return ids.has(gameId) ? questionsFor(lessonKey) : (oldGet ? oldGet(gameId,lessonKey) : []); };

  function addStyles(){
    if(document.getElementById('extra-v2-styles')) return;
    const s=document.createElement('style'); s.id='extra-v2-styles'; s.textContent=`
      .xg{max-width:900px;margin:auto}.xg-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.xg-head span{font-size:12px;font-weight:900;letter-spacing:1.4px}.xg-head b{font-size:11px;color:#9fb1c7;padding:7px 10px;border:1px solid rgba(255,255,255,.1);border-radius:99px}.xg-card{padding:30px;border-radius:24px;border:1px solid rgba(255,255,255,.1);background:#0b1727;text-align:center}.xg-q{font-size:clamp(25px,5vw,44px);font-weight:900;margin:20px 0}.xg-options{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:680px;margin:auto}.xg-options button{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#10253d;color:#fff;font:inherit;font-weight:900;cursor:pointer}.xg-options button:hover{transform:translateY(-2px);border-color:#5ee7ff}.xg-note{color:#8fa3bb;font-size:11px;margin-top:13px}.xg-meter{height:11px;background:#12243a;border-radius:99px;overflow:hidden;margin:18px 0}.xg-meter i{display:block;height:100%;background:linear-gradient(90deg,#5ee7ff,#8b7cff);transition:.4s}.xg-race{height:95px;border-radius:18px;background:linear-gradient(90deg,rgba(62,220,140,.12),rgba(94,231,255,.08));border:1px solid rgba(255,255,255,.1);position:relative;margin:18px 0}.xg-runner{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:38px;transition:left .45s}.xg-wheel{width:180px;height:180px;border-radius:50%;margin:10px auto 18px;display:grid;place-items:center;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);border:8px solid #10233b;font-size:42px}.spin{animation:xspin .8s ease}.xg-auction{font-size:34px;font-weight:900;color:#f7c873}.xg-bids{display:flex;justify-content:center;gap:8px;margin:15px 0;flex-wrap:wrap}.xg-bids button{padding:9px 14px;border-radius:10px;border:1px solid rgba(247,200,115,.25);background:#332b16;color:#f7d68e;font-weight:900}.xg-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:600px;margin:20px auto}.xg-card-tile{aspect-ratio:3/4;border-radius:14px;background:linear-gradient(145deg,#162f50,#09172a);border:1px solid rgba(94,231,255,.2);display:grid;place-items:center;font-size:32px;font-weight:900;cursor:pointer;color:white}.xg-stops,.xg-bridge{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:20px 0}.xg-stop{width:45px;height:45px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);background:#0c1b2e;color:#73869c;font-weight:900}.xg-stop.done{background:#35d49a;color:#06130d}.xg-stop.active{background:#5ee7ff;color:#06131c}.xg-secret{font-size:55px;letter-spacing:12px;color:#a78bfa;margin:18px}.xg-puzzle{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:300px;margin:18px auto}.xg-piece{aspect-ratio:1;border-radius:9px;background:#10243a;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;color:#53677d;font-size:22px}.xg-piece.on{background:linear-gradient(135deg,#5ee7ff,#8b7cff);color:#07111f}.xg-rocket{font-size:68px;transition:.4s;margin:12px}.xg-castle{font-size:78px;margin:10px}.xg-car-road{height:82px;border-radius:17px;background:repeating-linear-gradient(90deg,#17283a 0 35px,#22384d 35px 70px);display:flex;align-items:center;overflow:hidden;padding:0 10px}.xg-car{font-size:58px;transition:.45s}.xg-targets{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:520px;margin:auto}.xg-target{padding:18px;border-radius:50%;border:2px solid rgba(255,255,255,.13);background:#18283a;color:#fff;font-weight:900;cursor:pointer}.xg-stone{width:42px;height:42px;border-radius:8px;background:#172b41;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;color:#64788e}.xg-stone.done{background:#5ee7ff;color:#07111f}.xg-king{font-size:70px}.xg-level{display:inline-block;padding:7px 11px;border-radius:99px;background:rgba(167,139,250,.12);color:#b8a7ff;font-size:11px;font-weight:900}@keyframes xspin{to{transform:rotate(720deg)}}@media(max-width:700px){.xg-options{grid-template-columns:1fr}.xg-cards{grid-template-columns:repeat(2,1fr)}.xg-card{padding:21px}.xg-secret{font-size:40px;letter-spacing:7px}}
    `; document.head.appendChild(s);
  }

  function finishExtra(){
    const box=document.getElementById('gameQuestion');
    box.innerHTML=`<div class="game-finish"><div class="finish-icon">🏆</div><h2>Жарайсың!</h2><p>Ойын аяқталды.</p><div class="game-result">Нәтиже: ${state.score} ұпай</div></div>`;
  }
  function next(value){
    const q=state.questions[state.index];
    const ok=String(value).trim().toLowerCase()===String(q.answer).trim().toLowerCase();
    if(ok) state.score += 10;
    state.index++;
    if(state.index>=state.questions.length) finishExtra(); else renderExtra();
  }
  function btns(q){return `<div class="xg-options">${q.options.map(o=>`<button type="button" data-xans="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;}

  function renderExtra(){
    const q=state.questions[state.index], total=state.questions.length, p=Math.round(state.index/total*100), id=state.id;
    const game=extraGames.find(g=>g.id===id), box=document.getElementById('gameQuestion');
    document.getElementById('gameProgress').textContent=`${state.index+1} / ${total}`;
    let visual='';
    if(id==='math-race') visual=`<div class="xg-race"><span class="xg-runner" style="left:${Math.max(5,p)}%">🏃</span></div>`;
    if(id==='wheel') visual=`<div class="xg-wheel" id="xWheel">🎡</div><button class="game-primary" id="xSpin">Айналдыру</button>`;
    if(id==='auction') visual=`<div class="xg-auction">💰 ${100-state.index*10} ұпай</div><div class="xg-bids">${[10,20,30].map(v=>`<button data-xbid="${v}">Тігу +${v}</button>`).join('')}</div>`;
    if(id==='blitz') visual=`<div class="xg-auction" style="color:#ff7b8c">⚡ ${Math.max(1,10-state.index)} секция</div>`;
    if(id==='cards') visual=`<div class="xg-cards">${[1,2,3,4].map((n,i)=>`<button class="xg-card-tile" type="button">${i===state.index%4?'❓':'🃏'}</button>`).join('')}</div>`;
    if(id==='quest') visual=`<div class="xg-stops">${Array.from({length:6},(_,i)=>`<span class="xg-stop ${i<state.index?'done':''} ${i===state.index?'active':''}">${i+1}</span>`).join('')}</div>`;
    if(id==='secret-number') visual=`<div class="xg-secret">${Array.from({length:4},(_,i)=>i<state.index?'●':'_').join(' ')}</div>`;
    if(id==='puzzle') visual=`<div class="xg-puzzle">${Array.from({length:9},(_,i)=>`<span class="xg-piece ${i<state.index?'on':''}">${i<state.index?'✓':''}</span>`).join('')}</div>`;
    if(id==='rocket') visual=`<div class="xg-rocket" style="transform:translateY(-${p/2}px)">🚀</div><div class="xg-meter"><i style="width:${p}%"></i></div>`;
    if(id==='castle') visual=`<div class="xg-castle">🏰</div><div class="xg-meter"><i style="width:${p}%"></i></div>`;
    if(id==='car-race') visual=`<div class="xg-car-road"><span class="xg-car" style="transform:translateX(${Math.min(80,p)}vw)">🏎️</span></div>`;
    if(id==='target') visual=`<div class="xg-targets">${q.options.map(o=>`<button class="xg-target" data-xans="${esc(o)}">🎯 ${esc(o)}</button>`).join('')}</div>`;
    if(id==='bridge') visual=`<div class="xg-bridge">${Array.from({length:8},(_,i)=>`<span class="xg-stone ${i<state.index?'done':''}">${i<state.index?'✓':''}</span>`).join('')}</div>`;
    if(id==='math-king') visual=`<span class="xg-level">LEVEL ${state.index+1}</span><div class="xg-king">👑</div>`;
    box.innerHTML=`<div class="xg"><div class="xg-head"><span>${esc(game.title)}</span><b>${state.index+1}/${total}</b></div><div class="xg-card">${visual}<div class="xg-q">${esc(q.question)}</div>${btns(q)}<div class="xg-note">Дұрыс жауап келесі кезеңді ашады.</div></div></div>`;
    box.querySelectorAll('[data-xans]').forEach(b=>b.addEventListener('click',()=>next(b.dataset.xans)));
    box.querySelectorAll('[data-xbid]').forEach(b=>b.addEventListener('click',()=>{state.score+=Number(b.dataset.xbid); b.textContent='Тігілді ✓';}));
    const spin=document.getElementById('xSpin'); if(spin) spin.onclick=()=>{const w=document.getElementById('xWheel');w.classList.add('spin');setTimeout(()=>w.classList.remove('spin'),800);};
  }

  window.startSelectedGame = function(){
    const id=document.body.dataset.game;
    if(!ids.has(id)){
      const original=window.__originalStartSelectedGame;
      if(original) return original();
      return;
    }
    const lessonId=document.getElementById('lessonSelect')?.value;
    const grade=document.getElementById('gradeSelect')?.value;
    const subject=document.getElementById('subjectSelect')?.value;
    const quarter=document.getElementById('quarterSelect')?.value;
    const lessonKey=`${grade}-${subject}-${quarter}-${lessonId}`;
    state={id,questions:questionsFor(lessonKey),index:0,score:0,lessonKey};
    if(!state.questions.length){
      const msg=document.getElementById('gameMessage'); msg.style.display='block'; msg.textContent='Бұл тақырыпқа тапсырмалар әлі енгізілмеген. Ойын механизмі дайын.'; return;
    }
    document.getElementById('gameSetup').style.display='none'; document.getElementById('gameArea').style.display='block'; document.getElementById('gameMessage').style.display='none';
    addStyles(); renderExtra();
  };

  window.__originalStartSelectedGame = window.startSelectedGame;
  // Keep the original function available before replacing it on the next tick.
  const originalStart = window.startSelectedGame;
  window.startSelectedGame = function(){
    const id=document.body.dataset.game;
    if(ids.has(id)) return startExtra(id);
    return originalStart();
  };
  function startExtra(id){
    const lessonId=document.getElementById('lessonSelect')?.value, grade=document.getElementById('gradeSelect')?.value, subject=document.getElementById('subjectSelect')?.value, quarter=document.getElementById('quarterSelect')?.value;
    const key=`${grade}-${subject}-${quarter}-${lessonId}`; state={id,questions:questionsFor(key),index:0,score:0,lessonKey:key};
    if(!state.questions.length){const msg=document.getElementById('gameMessage');msg.style.display='block';msg.textContent='Бұл тақырыпқа тапсырмалар әлі енгізілмеген. Ойын механизмі дайын.';return;}
    document.getElementById('gameSetup').style.display='none';document.getElementById('gameArea').style.display='block';document.getElementById('gameMessage').style.display='none';addStyles();renderExtra();
  }

  function refresh(){ addStyles(); if(typeof window.renderGameCards==='function') window.renderGameCards(); const st=document.querySelector('.game-stat strong'); if(st) st.textContent=String(window.mathGames.length); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',refresh,{once:true}); else refresh();
})();
