(() => {
  const defs = [
    ['math-race','🏆 Математикалық жарыс','Екі ойыншы немесе команда дұрыс жауап арқылы жарыста алға жылжиды.'],
    ['wheel','🎡 Сәттілік дөңгелегі','Дөңгелек кездейсоқ тапсырманы таңдайды.'],
    ['auction','💰 Математикалық аукцион','Команда жауапқа сенімділігіне қарай ұпай тігеді.'],
    ['blitz','🧠 Блиц','Қысқа уақытта бірнеше математикалық тапсырма орында.'],
    ['cards','🃏 Математикалық карточкалар','Карточканы ашып, ішіндегі есепті орында.'],
    ['quest','🗺️ Математикалық квест','Бірнеше бекеттен өтіп, соңғы мақсатқа жет.'],
    ['secret-number','🔑 Құпия сан','Тапсырмаларды шешіп, жасырылған санды анықта.'],
    ['puzzle','🧩 Пазл жина','Әр дұрыс жауап пазлдың бір бөлігін ашады.'],
    ['rocket','🚀 Зымыран жарысы','Әр дұрыс жауап зымыранды жоғары көтереді.'],
    ['castle','🏰 Қамалды қорғау','Дұрыс есептермен математикалық қамалды қорға.'],
    ['car-race','🏎️ Математикалық жарыс','Әр дұрыс жауап машинаға жылдамдық береді.'],
    ['target','🎯 Нысанаға дәл тигіз','Тапсырманы шешіп, дұрыс нысананы таңда.'],
    ['bridge','🌉 Көпірден өт','Әр дұрыс жауап көпірдің келесі тасын ашады.'],
    ['math-king','👑 Математика патшасы','Деңгейлерден өтіп, финалдық тапсырманы орында.']
  ];
  const extraGames = defs.map(([id,title,description]) => ({id,title,description,formats:['Жеке','Жұптық','Топтық'],skills:['Есептеу','Логика','Белсенділік']}));
  window.mathGames = (window.mathGames || []).concat(extraGames);
  const ids = new Set(extraGames.map(g=>g.id));
  const oldGet = window.getGameQuestions;
  const oldRender = window.renderCurrentQuestion;
  let state = {id:null, questions:[], index:0, score:0};

  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');}
  function makeQuestions(key){
    const qs = oldGet ? oldGet('quick-answer',key) : [];
    return qs.map((q,i)=>({question:q.question||`Тапсырма ${i+1}`,answer:String(q.answer??''),options:q.options||[String(q.answer??''),'5','8','10'].filter((v,j,a)=>a.indexOf(v)===j).slice(0,4)}));
  }
  window.getGameQuestions = function(gameId,key){
    if(!ids.has(gameId)) return oldGet ? oldGet(gameId,key) : [];
    const qs=makeQuestions(key); state={id:gameId,questions:qs,index:0,score:0}; return qs;
  };

  function addStyles(){
    if(document.getElementById('extra-v3-styles'))return;
    const s=document.createElement('style');s.id='extra-v3-styles';s.textContent=`
      .x3{max-width:900px;margin:auto}.x3-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.x3-head span{font-size:12px;font-weight:900;letter-spacing:1.4px}.x3-head b{font-size:11px;color:#9fb1c7;padding:7px 10px;border:1px solid rgba(255,255,255,.1);border-radius:99px}.x3-card{padding:30px;border-radius:24px;border:1px solid rgba(255,255,255,.1);background:#0b1727;text-align:center}.x3-q{font-size:clamp(25px,5vw,44px);font-weight:900;margin:20px 0}.x3-options{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:680px;margin:auto}.x3-options button{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#10253d;color:#fff;font:inherit;font-weight:900;cursor:pointer}.x3-options button:hover{transform:translateY(-2px);border-color:#5ee7ff}.x3-note{color:#8fa3bb;font-size:11px;margin-top:13px}.x3-race{height:95px;border-radius:18px;background:linear-gradient(90deg,rgba(62,220,140,.12),rgba(94,231,255,.08));border:1px solid rgba(255,255,255,.1);position:relative;margin:18px 0}.x3-runner{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:38px;transition:left .45s}.x3-wheel{width:180px;height:180px;border-radius:50%;margin:10px auto 18px;display:grid;place-items:center;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);border:8px solid #10233b;font-size:42px}.x3-spin{animation:x3spin .8s ease}.x3-money{font-size:34px;font-weight:900;color:#f7c873}.x3-bids{display:flex;justify-content:center;gap:8px;margin:15px 0;flex-wrap:wrap}.x3-bids button{padding:9px 14px;border-radius:10px;border:1px solid rgba(247,200,115,.25);background:#332b16;color:#f7d68e;font-weight:900}.x3-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:600px;margin:20px auto}.x3-tile{aspect-ratio:3/4;border-radius:14px;background:linear-gradient(145deg,#162f50,#09172a);border:1px solid rgba(94,231,255,.2);display:grid;place-items:center;font-size:32px;cursor:pointer;color:white}.x3-stops{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:20px 0}.x3-stop{width:45px;height:45px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);background:#0c1b2e;color:#73869c;font-weight:900}.x3-stop.done{background:#35d49a;color:#06130d}.x3-stop.active{background:#5ee7ff;color:#06131c}.x3-secret{font-size:55px;letter-spacing:12px;color:#a78bfa;margin:18px}.x3-puzzle{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:300px;margin:18px auto}.x3-piece{aspect-ratio:1;border-radius:9px;background:#10243a;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;color:#53677d;font-size:22px}.x3-piece.on{background:linear-gradient(135deg,#5ee7ff,#8b7cff);color:#07111f}.x3-rocket{font-size:68px;transition:.4s;margin:12px}.x3-meter{height:11px;background:#12243a;border-radius:99px;overflow:hidden;margin:18px 0}.x3-meter i{display:block;height:100%;background:linear-gradient(90deg,#5ee7ff,#8b7cff)}.x3-castle{font-size:78px;margin:10px}.x3-road{height:82px;border-radius:17px;background:repeating-linear-gradient(90deg,#17283a 0 35px,#22384d 35px 70px);display:flex;align-items:center;overflow:hidden;padding:0 10px}.x3-car{font-size:58px;transition:.45s}.x3-targets{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:520px;margin:auto}.x3-target{padding:18px;border-radius:50%;border:2px solid rgba(255,255,255,.13);background:#18283a;color:#fff;font-weight:900;cursor:pointer}.x3-bridge{display:flex;justify-content:center;gap:5px;align-items:end;height:120px;margin:10px}.x3-stone{width:42px;height:42px;border-radius:8px;background:#172b41;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;color:#64788e}.x3-stone.done{background:#5ee7ff;color:#07111f}.x3-king{font-size:70px}.x3-level{display:inline-block;padding:7px 11px;border-radius:99px;background:rgba(167,139,250,.12);color:#b8a7ff;font-size:11px;font-weight:900}@keyframes x3spin{to{transform:rotate(720deg)}}@media(max-width:700px){.x3-options{grid-template-columns:1fr}.x3-cards{grid-template-columns:repeat(2,1fr)}.x3-card{padding:21px}.x3-secret{font-size:40px;letter-spacing:7px}}
    `;document.head.appendChild(s);
  }

  function finish(){document.getElementById('gameQuestion').innerHTML=`<div class="game-finish"><div class="finish-icon">🏆</div><h2>Жарайсың!</h2><p>Ойын аяқталды.</p><div class="game-result">Нәтиже: ${state.score} ұпай</div></div>`;}
  function next(v){const q=state.questions[state.index];if(String(v).trim().toLowerCase()===String(q.answer).trim().toLowerCase())state.score+=10;state.index++;if(state.index>=state.questions.length)finish();else render();}
  function options(q){return `<div class="x3-options">${q.options.map(o=>`<button type="button" data-x3="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;}

  function render(){
    const q=state.questions[state.index];if(!q)return finish();const id=state.id,total=state.questions.length,p=Math.round(state.index/total*100),game=extraGames.find(g=>g.id===id),box=document.getElementById('gameQuestion');
    document.getElementById('gameProgress').textContent=`${state.index+1} / ${total}`;
    let visual='';
    if(id==='math-race')visual=`<div class="x3-race"><span class="x3-runner" style="left:${Math.max(5,p)}%">🏃</span></div>`;
    if(id==='wheel')visual=`<div class="x3-wheel" id="x3Wheel">🎡</div><button class="game-primary" id="x3Spin">Айналдыру</button>`;
    if(id==='auction')visual=`<div class="x3-money">💰 ${Math.max(10,100-state.index*10)} ұпай</div><div class="x3-bids">${[10,20,30].map(v=>`<button type="button" data-x3bid="${v}">Тігу +${v}</button>`).join('')}</div>`;
    if(id==='blitz')visual=`<div class="x3-money" style="color:#ff7b8c">⚡ БЛИЦ</div>`;
    if(id==='cards')visual=`<div class="x3-cards">${[1,2,3,4].map((n,i)=>`<div class="x3-tile">${i===state.index%4?'❓':'🃏'}</div>`).join('')}</div>`;
    if(id==='quest')visual=`<div class="x3-stops">${Array.from({length:6},(_,i)=>`<span class="x3-stop ${i<state.index?'done':''} ${i===state.index?'active':''}">${i+1}</span>`).join('')}</div>`;
    if(id==='secret-number')visual=`<div class="x3-secret">${Array.from({length:4},(_,i)=>i<state.index?'●':'_').join(' ')}</div>`;
    if(id==='puzzle')visual=`<div class="x3-puzzle">${Array.from({length:9},(_,i)=>`<span class="x3-piece ${i<state.index?'on':''}">${i<state.index?'✓':''}</span>`).join('')}</div>`;
    if(id==='rocket')visual=`<div class="x3-rocket" style="transform:translateY(-${p/2}px)">🚀</div><div class="x3-meter"><i style="width:${p}%"></i></div>`;
    if(id==='castle')visual=`<div class="x3-castle">🏰</div><div class="x3-meter"><i style="width:${p}%"></i></div>`;
    if(id==='car-race')visual=`<div class="x3-road"><span class="x3-car" style="transform:translateX(${Math.min(70,p)}vw)">🏎️</span></div>`;
    if(id==='target')visual=`<div class="x3-targets">${q.options.map(o=>`<button type="button" class="x3-target" data-x3="${esc(o)}">🎯 ${esc(o)}</button>`).join('')}</div>`;
    if(id==='bridge')visual=`<div class="x3-bridge">${Array.from({length:8},(_,i)=>`<span class="x3-stone ${i<state.index?'done':''}">${i<state.index?'✓':''}</span>`).join('')}</div>`;
    if(id==='math-king')visual=`<span class="x3-level">LEVEL ${state.index+1}</span><div class="x3-king">👑</div>`;
    box.innerHTML=`<div class="x3"><div class="x3-head"><span>${esc(game.title)}</span><b>${state.index+1}/${total}</b></div><div class="x3-card">${visual}<div class="x3-q">${esc(q.question)}</div>${options(q)}<div class="x3-note">Дұрыс жауап келесі кезеңді ашады.</div></div></div>`;
    box.querySelectorAll('[data-x3]').forEach(b=>b.addEventListener('click',()=>next(b.dataset.x3)));
    box.querySelectorAll('[data-x3bid]').forEach(b=>b.addEventListener('click',()=>{state.score+=Number(b.dataset.x3bid);b.textContent='Тігілді ✓';}));
    const spin=document.getElementById('x3Spin');if(spin)spin.onclick=()=>{const w=document.getElementById('x3Wheel');w.classList.add('x3-spin');setTimeout(()=>w.classList.remove('x3-spin'),800);};
  }

  window.renderCurrentQuestion=function(){if(ids.has(state.id)){addStyles();render();}else return oldRender?oldRender():undefined;};
  function refresh(){addStyles();if(typeof window.renderGameCards==='function')window.renderGameCards();const stat=document.querySelector('.game-stat strong');if(stat)stat.textContent=String(window.mathGames.length);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
