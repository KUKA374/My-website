(() => {
  const extraGames = [
    { id:'math-race', title:'🏆 Математикалық жарыс', description:'Екі ойыншы немесе команда дұрыс жауап арқылы жарыста алға жылжиды.', formats:['Жұптық','Топтық'], skills:['Жылдамдық','Есептеу','Бәсеке'] },
    { id:'wheel', title:'🎡 Сәттілік дөңгелегі', description:'Дөңгелек кездейсоқ тапсырманы таңдайды, ойыншы есепті шешеді.', formats:['Сыныппен','Жеке'], skills:['Қайталау','Жылдам ойлау','Белсенділік'] },
    { id:'auction', title:'💰 Математикалық аукцион', description:'Команда жауапқа сенімділігіне қарай ұпай тігіп, дұрыс шешіммен ұтысын арттырады.', formats:['Топтық'], skills:['Тәуекелді бағалау','Есептеу','Стратегия'] },
    { id:'blitz', title:'🧠 Блиц', description:'Қысқа уақыт ішінде бірнеше математикалық тапсырманы қатарынан орында.', formats:['Жеке','Жұптық'], skills:['Жылдам есептеу','Назар','Қайталау'] },
    { id:'cards', title:'🃏 Математикалық карточкалар', description:'Карточканы ашып, оның ішіндегі есепті орында.', formats:['Жеке','Жұптық'], skills:['Қайталау','Есептеу','Есте сақтау'] },
    { id:'quest', title:'🗺️ Математикалық квест', description:'Бірнеше бекеттен өтіп, соңғы математикалық мақсатқа жет.', formats:['Топтық','Жұптық'], skills:['Логика','Командалық жұмыс','Талдау'] },
    { id:'secret-number', title:'🔑 Құпия сан', description:'Математикалық тапсырмаларды шешіп, жасырылған санды анықта.', formats:['Жеке','Жұптық'], skills:['Логика','Талдау','Болжам'] },
    { id:'puzzle', title:'🧩 Пазл жина', description:'Әр дұрыс жауап пазлдың бір бөлігін ашады.', formats:['Жеке','Топтық'], skills:['Есептеу','Шыдамдылық','Логика'] },
    { id:'rocket', title:'🚀 Зымыран жарысы', description:'Әр дұрыс жауап зымыранды келесі деңгейге көтереді.', formats:['Жеке','Сыныппен'], skills:['Жылдамдық','Прогресс','Қайталау'] },
    { id:'castle', title:'🏰 Қамалды қорғау', description:'Дұрыс есептермен математикалық қамалды қорғайсың.', formats:['Топтық','Сыныппен'], skills:['Стратегия','Есептеу','Командалық жұмыс'] },
    { id:'car-race', title:'🏎️ Математикалық жарыс', description:'Әр дұрыс жауап машинаға жылдамдық береді.', formats:['Жеке','Жұптық'], skills:['Жылдам есептеу','Назар','Бәсеке'] },
    { id:'target', title:'🎯 Нысанаға дәл тигіз', description:'Тапсырманы шешіп, нысанадағы дұрыс жауапты таңда.', formats:['Жеке','Жұптық'], skills:['Дәлдік','Есептеу','Назар'] },
    { id:'bridge', title:'🌉 Көпірден өт', description:'Әр дұрыс жауап көпірдің келесі тасын ашады.', formats:['Жеке','Топтық'], skills:['Логика','Қайталау','Төзімділік'] },
    { id:'math-king', title:'👑 Математика патшасы', description:'Деңгейлерден өтіп, финалдық тапсырманы орындап, математиканың патшасы атан.', formats:['Жеке','Сыныппен'], skills:['Жинақтау','Логика','Есептеу'] }
  ];

  window.mathGames = Array.isArray(window.mathGames) ? window.mathGames.concat(extraGames) : extraGames;

  const extraIds = new Set(extraGames.map(g => g.id));
  const originalGetQuestions = window.getGameQuestions;
  const originalRender = window.renderCurrentQuestion;

  function baseQuestions(lessonKey) {
    let qs = originalGetQuestions ? originalGetQuestions('quick-answer', lessonKey) : [];
    if (!qs.length && window.gameQuestionBank && window.gameQuestionBank[lessonKey]) {
      const lesson = window.gameQuestionBank[lessonKey];
      qs = lesson.quickAnswer || [];
    }
    return qs.map((q, i) => ({
      question: q.question || q.left || q.clue || `Тапсырма ${i + 1}`,
      answer: String(q.answer ?? q.right ?? ''),
      options: q.options || [String(q.answer ?? ''), '5', '8', '10'].filter((v, j, a) => a.indexOf(v) === j).slice(0,4)
    }));
  }

  window.getGameQuestions = function(gameId, lessonKey) {
    if (!extraIds.has(gameId)) return originalGetQuestions ? originalGetQuestions(gameId, lessonKey) : [];
    return baseQuestions(lessonKey);
  };

  function styles() {
    if (document.getElementById('extra-game-styles')) return;
    const s = document.createElement('style');
    s.id = 'extra-game-styles';
    s.textContent = `
      .extra-game{max-width:900px;margin:auto}.extra-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.extra-head span{font-size:12px;font-weight:900;letter-spacing:1.5px}.extra-head b{font-size:11px;color:#9fb1c7;padding:7px 10px;border:1px solid rgba(255,255,255,.1);border-radius:999px}.extra-card{padding:34px;border-radius:24px;border:1px solid rgba(255,255,255,.1);background:#0b1727;text-align:center;box-shadow:0 20px 55px rgba(0,0,0,.2)}.extra-question{font-size:clamp(25px,5vw,44px);font-weight:900;margin:22px 0}.extra-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:680px;margin:auto}.extra-options button{padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#10253d;color:#fff;font:inherit;font-weight:900;cursor:pointer}.extra-options button:hover{transform:translateY(-2px);border-color:rgba(94,231,255,.5)}.extra-meter{height:12px;background:#10243a;border-radius:99px;overflow:hidden;margin:20px 0}.extra-meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#5ee7ff,#8b7cff);transition:.4s}.extra-small{color:#8fa3bb;font-size:12px;margin-top:13px}.race-track{height:90px;border-radius:18px;background:linear-gradient(90deg,rgba(62,220,140,.12),rgba(94,231,255,.08));border:1px solid rgba(255,255,255,.1);position:relative;margin:20px 0}.race-player{position:absolute;left:0;top:50%;transform:translate(-50%,-50%);font-size:38px;transition:left .45s}.wheel{width:190px;height:190px;border-radius:50%;margin:10px auto 22px;display:grid;place-items:center;background:conic-gradient(#5ee7ff 0 25%,#8b7cff 25% 50%,#f7c873 50% 75%,#ff7b8c 75%);border:8px solid #10233b;box-shadow:0 15px 40px rgba(0,0,0,.3);font-size:44px}.wheel.spinning{animation:wheelSpin .8s ease}.auction-money{font-size:34px;font-weight:900;color:#f7c873}.bid-row{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:18px 0}.bid-row button{padding:10px 15px;border-radius:10px;border:1px solid rgba(247,200,115,.25);background:#332b16;color:#f7d68e;font-weight:900;cursor:pointer}.card-deck{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px auto;max-width:620px}.math-card{aspect-ratio:3/4;border-radius:14px;background:linear-gradient(145deg,#162f50,#09172a);border:1px solid rgba(94,231,255,.2);display:grid;place-items:center;font-size:32px;font-weight:900;cursor:pointer}.math-card.open{background:#15263c}.quest-map{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:22px 0}.quest-stop{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.1);background:#0c1b2e;color:#73869c;font-weight:900}.quest-stop.active{background:#5ee7ff;color:#05111f;box-shadow:0 0 25px rgba(94,231,255,.3)}.quest-stop.done{background:#35d49a;color:#06130d}.secret-display{font-size:64px;font-weight:900;letter-spacing:14px;color:#a78bfa;margin:20px 0}.puzzle-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:330px;margin:20px auto}.puzzle-piece{aspect-ratio:1;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0d2035;display:grid;place-items:center;font-size:24px;color:#4e6278}.puzzle-piece.on{background:linear-gradient(135deg,#5ee7ff,#8b7cff);color:#07111f}.rocket-scene{font-size:70px;height:130px;display:flex;align-items:end;justify-content:center;transition:.4s}.rocket-scene.up{transform:translateY(-12px)}.castle{font-size:80px;margin:10px}.castle.shake{animation:castleShake .35s}.car{font-size:65px;transition:left .45s;position:relative;left:0}.car-road{height:85px;border-radius:18px;background:repeating-linear-gradient(90deg,#17283a 0 35px,#22384d 35px 70px);display:flex;align-items:center;padding:0 18px;overflow:hidden}.target-board{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:560px;margin:auto}.target{padding:18px;border-radius:50%;border:2px solid rgba(255,255,255,.12);background:#18283a;color:#fff;font-weight:900;cursor:pointer}.bridge{display:flex;justify-content:center;align-items:end;gap:4px;height:130px;margin:10px 0}.bridge-stone{width:42px;height:42px;border-radius:8px;background:#172b41;border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;color:#64788e}.bridge-stone.done{background:#5ee7ff;color:#07111f}.king{font-size:70px}.level-badge{display:inline-block;padding:7px 11px;border-radius:99px;background:rgba(167,139,250,.12);color:#b8a7ff;font-size:11px;font-weight:900}.blitz-timer{font-size:48px;font-weight:900;color:#ff7b8c}.extra-note{color:#8fa3bb;font-size:11px;margin-top:12px}@keyframes wheelSpin{to{transform:rotate(720deg)}}@keyframes castleShake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@media(max-width:700px){.extra-options{grid-template-columns:1fr}.card-deck{grid-template-columns:repeat(2,1fr)}.extra-card{padding:22px}.secret-display{font-size:42px;letter-spacing:8px}}
    `;
    document.head.appendChild(s);
  }

  function answerButton(q, label, value) {
    return `<button type="button" data-extra-answer="${escapeGameHtml(String(value))}">${escapeGameHtml(label)}</button>`;
  }

  function scoreAndNext(value) {
    const q = currentQuestions[currentIndex];
    const correct = String(value).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    if (correct) currentScore += 10;
    const box = document.getElementById('gameQuestion');
    const msg = document.createElement('div');
    msg.className = 'extra-small';
    msg.textContent = correct ? '✅ Дұрыс! +10 ұпай' : `❌ Дұрыс жауап: ${q.answer}`;
    box.appendChild(msg);
    setTimeout(() => { currentIndex++; renderCurrentQuestion(); }, 500);
  }

  function renderExtra() {
    const q = currentQuestions[currentIndex];
    const total = currentQuestions.length;
    const box = document.getElementById('gameQuestion');
    document.getElementById('gameProgress').textContent = `${currentIndex + 1} / ${total}`;
    const id = currentGameMode;
    const progress = Math.round((currentIndex / total) * 100);
    let inner = '';

    if (id === 'math-race') inner = `<div class="race-track"><div class="race-player" style="left:${Math.max(5,progress)}%">🏃</div></div>`;
    if (id === 'wheel') inner = `<div class="wheel" id="extraWheel">🎡</div><button class="game-primary" id="spinExtra">Айналдыру</button>`;
    if (id === 'auction') inner = `<div class="auction-money">💰 ${Math.max(10,100-currentIndex*10)} ұпай</div><div class="bid-row">${[10,20,30].map(v=>`<button data-bid="${v}">+${v}</button>`).join('')}</div>`;
    if (id === 'blitz') inner = `<div class="blitz-timer" id="blitzTimer">⚡</div>`;
    if (id === 'cards') inner = `<div class="card-deck">${[1,2,3,4].map((n,i)=>`<button class="math-card" data-card="${i}">${i===currentIndex%4?'?':'🃏'}</button>`).join('')}</div>`;
    if (id === 'quest') inner = `<div class="quest-map">${Array.from({length:6},(_,i)=>`<span class="quest-stop ${i<currentIndex?'done':''} ${i===currentIndex?'active':''}">${i+1}</span>`).join('')}</div>`;
    if (id === 'secret-number') inner = `<div class="secret-display">${Array.from({length:4},(_,i)=>i<currentIndex?'●':'_').join(' ')}</div>`;
    if (id === 'puzzle') inner = `<div class="puzzle-grid">${Array.from({length:9},(_,i)=>`<span class="puzzle-piece ${i<currentIndex?'on':''}">${i<currentIndex?'✓':''}</span>`).join('')}</div>`;
    if (id === 'rocket') inner = `<div class="rocket-scene ${currentIndex%2?'up':''}" style="transform:translateY(-${progress/2}px)">🚀</div><div class="extra-meter"><i style="width:${progress}%"></i></div>`;
    if (id === 'castle') inner = `<div class="castle" id="castleIcon">🏰</div><div class="extra-meter"><i style="width:${progress}%"></i></div>`;
    if (id === 'car-race') inner = `<div class="car-road"><span class="car" style="left:${progress}%">🏎️</span></div>`;
    if (id === 'target') inner = `<div class="target-board">${q.options.map(o=>answerButton(q,o,o)).join('')}</div>`;
    if (id === 'bridge') inner = `<div class="bridge">${Array.from({length:8},(_,i)=>`<span class="bridge-stone ${i<currentIndex?'done':''}">${i<currentIndex?'✓':''}</span>`).join('')}</div>`;
    if (id === 'math-king') inner = `<span class="level-badge">LEVEL ${currentIndex+1}</span><div class="king">👑</div>`;

    let controls = '';
    if (id === 'wheel') controls = `<div class="extra-question">${escapeGameHtml(q.question)}</div><div class="extra-options">${q.options.map(o=>answerButton(q,o,o)).join('')}</div>`;
    else if (id === 'auction') controls = `<div class="extra-question">${escapeGameHtml(q.question)}</div><div class="extra-options">${q.options.map(o=>answerButton(q,o,o)).join('')}</div>`;
    else if (id === 'cards') controls = `<div class="extra-question">${escapeGameHtml(q.question)}</div><div class="extra-options">${q.options.map(o=>answerButton(q,o,o)).join('')}</div>`;
    else controls = `<div class="extra-question">${escapeGameHtml(q.question)}</div><div class="extra-options">${q.options.map(o=>answerButton(q,o,o)).join('')}</div>`;

    box.innerHTML = `<div class="extra-game"><div class="extra-head"><span>${escapeGameHtml(mathGames.find(g=>g.id===id)?.title || '')}</span><b>${currentIndex+1}/${total}</b></div><div class="extra-card">${inner}${controls}<div class="extra-note">Дұрыс жауап келесі кезеңді ашады.</div></div></div>`;

    if (id === 'wheel') {
      const spin = document.getElementById('spinExtra');
      spin.addEventListener('click', () => { const w=document.getElementById('extraWheel'); w.classList.add('spinning'); setTimeout(()=>w.classList.remove('spinning'),800); });
    }
    box.querySelectorAll('[data-bid]').forEach(b=>b.addEventListener('click',()=>{ currentScore += Number(b.dataset.bid); }));
    box.querySelectorAll('[data-extra-answer]').forEach(b=>b.addEventListener('click',()=>scoreAndNext(b.dataset.extraAnswer)));
  }

  const originalRenderCurrentQuestion = originalRender;
  window.renderCurrentQuestion = function() {
    if (extraIds.has(window.currentGameMode)) {
      renderExtra();
      return;
    }
    return originalRenderCurrentQuestion ? originalRenderCurrentQuestion() : undefined;
  };

  function refresh() {
    styles();
    if (typeof window.renderGameCards === 'function') window.renderGameCards();
    const stats = document.querySelectorAll('.game-stat strong');
    if (stats.length) stats[0].textContent = String(window.mathGames.length);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, {once:true});
  else refresh();
})();
