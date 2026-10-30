(() => {
  const extraGames = [
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
  ].map(([id,title,description]) => ({id,title,description,formats:['Жеке','Жұптық','Топтық'],skills:['Есептеу','Логика','Белсенділік']}));

  // games-data.js defines mathGames with const, so mutate the existing array instead of replacing window.mathGames.
  if (Array.isArray(window.mathGames)) window.mathGames.push(...extraGames);

  const extraIds = new Set(extraGames.map(g => g.id));
  const coreGetQuestions = window.getGameQuestions;
  let state = { id:null, questions:[], index:0, score:0 };

  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function questionsFor(lessonKey){
    const lesson = window.gameQuestionBank?.[lessonKey];
    const source = lesson?.quickAnswer || [];
    return source.map((q,i) => ({
      question:q.question || `Тапсырма ${i+1}`,
      answer:String(q.answer ?? ''),
      options:q.options || [String(q.answer ?? ''),'5','8','10'].filter((v,j,a)=>a.indexOf(v)===j).slice(0,4)
    }));
  }

  window.getGameQuestions = function(gameId, lessonKey){
    if(!extraIds.has(gameId)) return coreGetQuestions ? coreGetQuestions(gameId,lessonKey) : [];
    const qs = questionsFor(lessonKey);
    state = {id:gameId,questions:qs,index:0,score:0};
    return qs;
  };

  function styles(){
    if(document.getElementById('extra-v4-styles')) return;
    const s=document.createElement('style'); s.id='extra-v4-styles';
    s.textContent=`
      .x4{max-width:900px;margin:auto}.x4-card{padding:30px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:#0b1727;text-align:center}.x4-title{font-size:12px;color:#5ee7ff;font-weight:900;letter-spacing:1.5px}.x4-q{font-size:clamp(25px,5vw,44px);font-weight:900;margin:22px 0}.x4-options{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:680px;margin:auto}.x4-options button{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#10253d;color:#fff;font:inherit;font-weight:900;cursor:pointer}.x4-options button:hover{border-color:#5ee7ff;transform:translateY(-2px)}.x4-track{height:90px;border-radius:18px;background:linear-gradient(90deg,rgba(53,212,154,.12),rgba(94,231,255,.12));border:1px solid rgba(255,255,255,.1);position:relative;margin:20px 0}.x4-runner{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:38px;transition:left .45s}.x4-wheel{width:180px;height:180px;border-radius:50%;margin:10px auto 20px;display:grid;place-items:center;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);border:8px solid #10233b;font-size:42px}.x4-money{font-size:34px;font-weight:900;color:#f7c873;margin:15px}.x4-bids{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:15px}.x4-bids button{padding:10px 15px;border-radius:10px;border:1px solid rgba(247,200,115,.25);background:#332b16;color:#f7d68e;font-weight:900;cursor:pointer}.x4-cards,.x4-puzzle{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:600px;margin:20px auto}.x4-tile{aspect-ratio:3/4;border-radius:14px;background:linear-gradient(145deg,#162f50,#09172a);border:1px solid rgba(94,231,255,.2);display:grid;place-items:center;font-size:30px;cursor:pointer}.x4-stops,.x4-bridge{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:22px 0}.x4-stop,.x4-stone{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#0c1b2e;color:#73869c;border:1px solid rgba(255,255,255,.1);font-weight:900}.x4-stop.active,.x4-stone.done{background:#5ee7ff;color:#06131c}.x4-stop.done{background:#35d49a;color:#06130d}.x4-secret{font-size:55px;letter-spacing:10px;color:#a78bfa;margin:20px}.x4-piece{aspect-ratio:1;border-radius:9px;background:#10243a;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;color:#53677d;font-size:22px}.x4-piece.on{background:linear-gradient(135deg,#5ee7ff,#8b7cff);color:#07111f}.x4-rocket{font-size:70px;margin:15px}.x4-meter{height:10px;background:#12243a;border-radius:99px;overflow:hidden;margin:15px 0}.x4-meter i{display:block;height:100%;background:linear-gradient(90deg,#5ee7ff,#8b7cff)}.x4-castle{font-size:78px}.x4-road{height:82px;border-radius:17px;background:repeating-linear-gradient(90deg,#17283a 0 35px,#22384d 35px 70px);display:flex;align-items:center;overflow:hidden}.x4-car{font-size:58px;transition:.4s}.x4-targets{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:560px;margin:auto}.x4-target{padding:18px;border-radius:50%;border:2px solid rgba(255,255,255,.13);background:#18283a;color:#fff;font-weight:900;cursor:pointer}.x4-king{font-size:70px}.x4-level{display:inline-block;padding:7px 11px;border-radius:99px;background:rgba(167,139,250,.12);color:#b8a7ff;font-size:11px;font-weight:900}@media(max-width:700px){.x4-options{grid-template-columns:1fr}.x4-cards,.x4-puzzle{grid-template-columns:repeat(2,1fr)}.x4-card{padding:21px}.x4-secret{font-size:40px}}
    `;
    document.head.appendChild(s);
  }

  function finish(){
    const box=document.getElementById('gameQuestion');
    if(box) box.innerHTML=`<div class="game-finish"><div class="finish-icon">🏆</div><h2>Жарайсың!</h2><p>Ойын аяқталды.</p><div class="game-result">Нәтиже: ${state.score} ұпай</div></div>`;
  }

  function next(value){
    const q=state.questions[state.index];
    if(String(value).trim().toLowerCase()===String(q.answer).trim().toLowerCase()) state.score+=10;
    state.index++;
    if(state.index>=state.questions.length) finish(); else render();
  }

  function render(){
    styles();
    const q=state.questions[state.index]; if(!q) return finish();
    const id=state.id, total=state.questions.length, p=Math.round(state.index/total*100), game=extraGames.find(g=>g.id===id), box=document.getElementById('gameQuestion');
    const progress=document.getElementById('gameProgress'); if(progress) progress.textContent=`${state.index+1} / ${total}`;
    let visual='';
    if(id==='math-race') visual=`<div class="x4-track"><span class="x4-runner" style="left:${Math.max(5,p)}%">🏃</span></div>`;
    if(id==='wheel') visual=`<div class="x4-wheel" id="x4Wheel">🎡</div><button class="game-primary" id="x4Spin">Айналдыру</button>`;
    if(id==='auction') visual=`<div class="x4-money">💰 ${Math.max(10,100-state.index*10)} ұпай</div><div class="x4-bids">${[10,20,30].map(v=>`<button type="button" data-x4bid="${v}">Тігу +${v}</button>`).join('')}</div>`;
    if(id==='blitz') visual=`<div class="x4-money" style="color:#ff7b8c">⚡ БЛИЦ</div>`;
    if(id==='cards') visual=`<div class="x4-cards">${[1,2,3,4].map((n,i)=>`<button class="x4-tile" type="button" data-x4card="${n}">${i===state.index%4?'❓':'🃏'}</button>`).join('')}</div>`;
    if(id==='quest') visual=`<div class="x4-stops">${Array.from({length:6},(_,i)=>`<span class="x4-stop ${i<state.index?'done':''} ${i===state.index?'active':''}">${i+1}</span>`).join('')}</div>`;
    if(id==='secret-number') visual=`<div class="x4-secret">${Array.from({length:4},(_,i)=>i<state.index?'●':'_').join(' ')}</div>`;
    if(id==='puzzle') visual=`<div class="x4-puzzle">${Array.from({length:9},(_,i)=>`<span class="x4-piece ${i<state.index?'on':''}">${i<state.index?'✓':''}</span>`).join('')}</div>`;
    if(id==='rocket') visual=`<div class="x4-rocket" style="transform:translateY(-${p/2}px)">🚀</div><div class="x4-meter"><i style="width:${p}%"></i></div>`;
    if(id==='castle') visual=`<div class="x4-castle">🏰</div><div class="x4-meter"><i style="width:${p}%"></i></div>`;
    if(id==='car-race') visual=`<div class="x4-road"><span class="x4-car" style="transform:translateX(${p*4}px)">🏎️</span></div>`;
    if(id==='target') visual=`<div class="x4-targets">${q.options.map(o=>`<button type="button" class="x4-target" data-x4="${esc(o)}">🎯 ${esc(o)}</button>`).join('')}</div>`;
    if(id==='bridge') visual=`<div class="x4-bridge">${Array.from({length:8},(_,i)=>`<span class="x4-stone ${i<state.index?'done':''}">${i<state.index?'✓':''}</span>`).join('')}</div>`;
    if(id==='math-king') visual=`<span class="x4-level">LEVEL ${state.index+1}</span><div class="x4-king">👑</div>`;
    const opts=(q.options||[]).map(o=>`<button type="button" data-x4="${esc(o)}">${esc(o)}</button>`).join('');
    box.innerHTML=`<div class="x4"><div class="x4-title">${esc(game.title)}</div><div class="x4-card">${visual}<div class="x4-q">${esc(q.question)}</div><div class="x4-options">${opts}</div></div></div>`;
    box.querySelectorAll('[data-x4]').forEach(b=>b.addEventListener('click',()=>next(b.dataset.x4)));
    box.querySelectorAll('[data-x4bid]').forEach(b=>b.addEventListener('click',()=>{state.score+=Number(b.dataset.x4bid);b.textContent='Тігілді ✓';}));
    box.querySelectorAll('[data-x4card]').forEach(b=>b.addEventListener('click',()=>next(q.answer)));
    const spin=document.getElementById('x4Spin');
    if(spin) spin.onclick=()=>{const w=document.getElementById('x4Wheel');w.style.transform='rotate(720deg)';setTimeout(()=>next(q.answer),800)};
  }

  const coreRender=window.renderCurrentQuestion;
  window.renderCurrentQuestion=function(){
    if(extraIds.has(state.id)) render(); else if(coreRender) coreRender();
  };

  function refresh(){
    if(typeof renderGameCards==='function') renderGameCards();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',refresh,{once:true}); else refresh();
})();
