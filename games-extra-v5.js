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

  // Important: mathGames is a top-level const in games-data.js, so mutate it directly.
  if (typeof mathGames !== 'undefined') mathGames.push(...games);

  const ids=new Set(games.map(g=>g.id));
  const coreGet=window.getGameQuestions;
  let state={id:null,qs:[],i:0,score:0};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  window.getGameQuestions=function(id,key){
    if(!ids.has(id)) return coreGet?coreGet(id,key):[];
    const src=(window.gameQuestionBank?.[key]?.quickAnswer)||[];
    state={id,qs:src.map(q=>({question:q.question,answer:String(q.answer),options:q.options||[String(q.answer),'5','8','10'].filter((v,j,a)=>a.indexOf(v)===j).slice(0,4)})),i:0,score:0};
    return state.qs;
  };

  function css(){
    if(document.getElementById('extra-v5-css'))return;
    const s=document.createElement('style');s.id='extra-v5-css';s.textContent=`
      .v5{max-width:900px;margin:auto;text-align:center}.v5-card{padding:30px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:#0b1727}.v5-q{font-size:clamp(25px,5vw,44px);font-weight:900;margin:24px 0}.v5-opts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:680px;margin:auto}.v5-opts button{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#10253d;color:white;font:inherit;font-weight:900;cursor:pointer}.v5-opts button:hover{border-color:#5ee7ff;transform:translateY(-2px)}.v5-title{color:#5ee7ff;font-size:12px;font-weight:900;letter-spacing:1.5px}.v5-race{height:90px;border-radius:18px;background:linear-gradient(90deg,rgba(53,212,154,.12),rgba(94,231,255,.12));border:1px solid rgba(255,255,255,.1);position:relative;margin:20px 0}.v5-run{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:38px}.v5-wheel{width:180px;height:180px;border-radius:50%;margin:10px auto 20px;display:grid;place-items:center;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);border:8px solid #10233b;font-size:42px}.v5-money{font-size:34px;font-weight:900;color:#f7c873;margin:15px}.v5-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:600px;margin:20px auto}.v5-card-tile{aspect-ratio:3/4;border-radius:14px;background:#162f50;border:1px solid rgba(94,231,255,.2);display:grid;place-items:center;font-size:30px;cursor:pointer}.v5-stops,.v5-bridge{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:20px}.v5-stop,.v5-stone{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#0c1b2e;color:#73869c;border:1px solid rgba(255,255,255,.1);font-weight:900}.v5-stop.active,.v5-stone.done{background:#5ee7ff;color:#06131c}.v5-stop.done{background:#35d49a;color:#06130d}.v5-secret{font-size:55px;letter-spacing:10px;color:#a78bfa;margin:20px}.v5-puzzle{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:300px;margin:20px auto}.v5-piece{aspect-ratio:1;border-radius:9px;background:#10243a;display:grid;place-items:center;color:#53677d;font-size:22px}.v5-piece.on{background:linear-gradient(135deg,#5ee7ff,#8b7cff);color:#07111f}.v5-icon{font-size:75px;margin:12px}.v5-meter{height:10px;background:#12243a;border-radius:99px;overflow:hidden;margin:15px 0}.v5-meter i{display:block;height:100%;background:linear-gradient(90deg,#5ee7ff,#8b7cff)}.v5-road{height:82px;border-radius:17px;background:repeating-linear-gradient(90deg,#17283a 0 35px,#22384d 35px 70px);display:flex;align-items:center;overflow:hidden}.v5-car{font-size:58px}.v5-targets{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:560px;margin:auto}.v5-target{padding:18px;border-radius:50%;border:2px solid rgba(255,255,255,.13);background:#18283a;color:#fff;font-weight:900;cursor:pointer}.v5-level{display:inline-block;padding:7px 11px;border-radius:99px;background:rgba(167,139,250,.12);color:#b8a7ff;font-size:11px;font-weight:900}@media(max-width:700px){.v5-opts{grid-template-columns:1fr}.v5-cards{grid-template-columns:repeat(2,1fr)}.v5-card{padding:20px}.v5-secret{font-size:40px}}
    `;document.head.appendChild(s);
  }

  function finish(){const b=document.getElementById('gameQuestion');if(b)b.innerHTML=`<div class="game-finish"><div class="finish-icon">🏆</div><h2>Жарайсың!</h2><p>Ойын аяқталды.</p><div class="game-result">Нәтиже: ${state.score} ұпай</div></div>`;}
  function next(v){const q=state.qs[state.i];if(String(v).trim().toLowerCase()===String(q.answer).trim().toLowerCase())state.score+=10;state.i++;state.i>=state.qs.length?finish():render();}

  function render(){
    css();const q=state.qs[state.i];if(!q)return finish();const id=state.id,total=state.qs.length,p=Math.round(state.i/total*100),g=games.find(x=>x.id===id),b=document.getElementById('gameQuestion');
    const gp=document.getElementById('gameProgress');if(gp)gp.textContent=`${state.i+1} / ${total}`;
    let visual='';
    if(id==='math-race')visual=`<div class="v5-race"><span class="v5-run" style="left:${Math.max(5,p)}%">🏃</span></div>`;
    if(id==='wheel')visual=`<div class="v5-wheel">🎡</div><button class="game-primary" id="v5spin">Айналдыру</button>`;
    if(id==='auction')visual=`<div class="v5-money">💰 ${Math.max(10,100-state.i*10)} ұпай</div>`;
    if(id==='blitz')visual=`<div class="v5-money" style="color:#ff7b8c">⚡ БЛИЦ</div>`;
    if(id==='cards')visual=`<div class="v5-cards">${[1,2,3,4].map((n,i)=>`<button class="v5-card-tile" data-v5card="${n}">${i===state.i%4?'❓':'🃏'}</button>`).join('')}</div>`;
    if(id==='quest')visual=`<div class="v5-stops">${Array.from({length:6},(_,i)=>`<span class="v5-stop ${i<state.i?'done':''} ${i===state.i?'active':''}">${i+1}</span>`).join('')}</div>`;
    if(id==='secret-number')visual=`<div class="v5-secret">${Array.from({length:4},(_,i)=>i<state.i?'●':'_').join(' ')}</div>`;
    if(id==='puzzle')visual=`<div class="v5-puzzle">${Array.from({length:9},(_,i)=>`<span class="v5-piece ${i<state.i?'on':''}">${i<state.i?'✓':''}</span>`).join('')}</div>`;
    if(id==='rocket')visual=`<div class="v5-icon" style="transform:translateY(-${p/2}px)">🚀</div><div class="v5-meter"><i style="width:${p}%"></i></div>`;
    if(id==='castle')visual=`<div class="v5-icon">🏰</div><div class="v5-meter"><i style="width:${p}%"></i></div>`;
    if(id==='car-race')visual=`<div class="v5-road"><span class="v5-car" style="transform:translateX(${p*4}px)">🏎️</span></div>`;
    if(id==='target')visual=`<div class="v5-targets">${q.options.map(o=>`<button class="v5-target" data-v5="${esc(o)}">🎯 ${esc(o)}</button>`).join('')}</div>`;
    if(id==='bridge')visual=`<div class="v5-bridge">${Array.from({length:8},(_,i)=>`<span class="v5-stone ${i<state.i?'done':''}">${i<state.i?'✓':''}</span>`).join('')}</div>`;
    if(id==='math-king')visual=`<span class="v5-level">LEVEL ${state.i+1}</span><div class="v5-icon">👑</div>`;
    const opts=q.options.map(o=>`<button type="button" data-v5="${esc(o)}">${esc(o)}</button>`).join('');
    b.innerHTML=`<div class="v5"><div class="v5-title">${esc(g.title)}</div><div class="v5-card">${visual}<div class="v5-q">${esc(q.question)}</div><div class="v5-opts">${opts}</div></div></div>`;
    b.querySelectorAll('[data-v5]').forEach(x=>x.onclick=()=>next(x.dataset.v5));
    b.querySelectorAll('[data-v5card]').forEach(x=>x.onclick=()=>next(q.answer));
    if(id==='auction')b.querySelector('.v5-card').insertAdjacentHTML('beforeend',`<div class="v5-opts" style="margin-top:12px">${[10,20,30].map(v=>`<button data-v5bid="${v}">Тігу +${v}</button>`).join('')}</div>`);
    b.querySelectorAll('[data-v5bid]').forEach(x=>x.onclick=()=>{state.score+=Number(x.dataset.v5bid);x.textContent='Тігілді ✓';});
    const spin=document.getElementById('v5spin');if(spin)spin.onclick=()=>setTimeout(()=>next(q.answer),500);
  }

  const coreRender=window.renderCurrentQuestion;
  window.renderCurrentQuestion=function(){if(ids.has(state.id))render();else if(coreRender)coreRender();};
  if(typeof renderGameCards==='function')renderGameCards();
})();
