/* Seven individual mechanics, one adapter for the existing shared learning session. */
(function () {
  "use strict";
  const S = GameSession,
    M = MathFinalModels,
    C = MathFinalContent,
    R = MathRacingModels;
  const $ = (id) => document.getElementById(id),
    esc = escapeGameHtml,
    box = () => $("gameQuestion"),
    supports = (id) => M.ids.includes(id);
  let state = null,
    epoch = 0,
    revision = 0,
    pendingPractice = null;
  const stations = [
    "Есептеу бұлағы",
    "Жұптар өткелі",
    "Қателер үңгірі",
    "Білім қақпасы",
  ];
  function prepare(qs, id, lesson, review = false) {
    return qs.map((q, i) => ({
      ...q,
      options: R.shuffle(R.choices(q)),
      _sessionKey: `final:${id}:${lesson}:${review ? "review:" : ""}${i}`,
    }));
  }
  function source(id, lesson) {
    if (!window.gameQuestionBank[lesson]) return [];
    const review = id === "bridge" && pendingPractice?.lesson === lesson;
    return prepare(
      review
        ? pendingPractice.qs
        : C.deck(id, lesson, {
            grid: Number($("finalPuzzleGrid")?.value || 2),
          }),
      id,
      lesson,
      review,
    );
  }
  function setup(id) {
    if (!supports(id)) return;
    if (id === "puzzle") {
      const e = document.createElement("div");
      e.className = "final-setup";
      e.innerHTML =
        '<label for="finalPuzzleGrid">Сурет торының көлемі</label><select id="finalPuzzleGrid"><option value="2">Жеңіл — 2 × 2, 4 бөлік</option><option value="3">Орта — 3 × 3, 9 бөлік</option><option value="4">Күрделі — 4 × 4, 16 бөлік</option></select>';
      $("sharedSetupInfo").append(e);
    }
    if (id === "math-king") {
      $("sharedModeField").hidden = true;
      $("sharedFixedMode").hidden = false;
      $("sharedFixedMode").textContent =
        "Әр міндетті деңгейде кемінде 4/5 (80%) дұрыс жауап. Сынақта алдын ала шешім жабық; аралық жаттығуда көмек бар.";
    }
  }
  function configure(opts, id) {
    if (!supports(id)) return;
    opts.seconds = 0;
    if (id === "puzzle") opts.grid = Number($("finalPuzzleGrid")?.value || 2);
    if (id === "math-king") opts.mode = "challenge";
    opts.review = id === "bridge" && pendingPractice?.lesson === getLessonKey();
    if (opts.review) opts.mode = "practice";
  }
  function start(id, lesson, qs) {
    epoch++;
    revision++;
    state = null;
    if (!supports(id)) return;
    state = {
      version: 1,
      id,
      lesson,
      qs,
      game: M.create(
        id,
        qs.map((q) => q._finalMeta),
        S.clock().time(),
      ),
      value: "",
      message: "",
      orders: {},
      serial: qs.length,
      reused: false,
      review: !!S.current().settings.review,
      last: null,
      motion: null,
    };
    if (id === "quest")
      for (const station of [1, 3]) {
        const keys = qs
          .map((q, i) =>
            q._finalMeta.kind === "match" && q._finalMeta.station === station
              ? i
              : -1,
          )
          .filter((i) => i >= 0);
        state.orders[station] = {
          left: R.shuffle(keys),
          right: R.shuffle(keys),
        };
      }
    if (id === "bridge") pendingPractice = null;
  }
  function allowed() {
    return (
      !!state &&
      S.current()?.id === state.id &&
      S.canAnswer() &&
      !state.game.finished
    );
  }
  function bind(selector, fn) {
    const e = epoch,
      r = revision;
    box()
      .querySelectorAll(selector)
      .forEach(
        (el) =>
          (el.onclick = () => {
            if (e !== epoch || r !== revision || !allowed()) return;
            tick(S.clock().time());
            if (allowed() && r === revision) fn(el);
          }),
      );
  }
  function typing() {
    const el = $("finalAnswer"),
      e = epoch,
      r = revision;
    if (!el) return;
    el.oninput = () => {
      if (e === epoch && r === revision && allowed()) {
        state.value = el.value;
        S.queueSave();
      }
    };
    el.onkeydown = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (!ev.repeat && e === epoch && r === revision && allowed())
          answer(state.value);
      }
    };
  }
  function terminal(fn) {
    const e = epoch;
    let used = false;
    return () => {
      if (
        used ||
        e !== epoch ||
        !state?.game.finished ||
        S.current()?.id !== state.id
      )
        return;
      used = true;
      fn();
    };
  }
  function syncRecords() {
    const model = S.current(),
      g = state.game;
    for (const key of [...new Set(g.history.map((r) => r.key))]) {
      const rows = g.history.filter((r) => r.key === key),
        first = rows[0],
        last = rows.at(-1),
        q = state.qs[key];
      if (!model.records[q._sessionKey])
        S.record(key, first.correct, first.value);
      if (rows.some((r) => !r.correct)) model.assist(q._sessionKey);
      Object.assign(model.records[q._sessionKey], {
        correct: last.correct,
        firstCorrect: first.correct,
        assisted: !!model.help[q._sessionKey],
        attempts: rows.length,
        value: last.value,
        responseMs: rows.reduce((n, r) => n + r.ms, 0),
        points: rows.reduce((n, r) => n + r.points, 0),
        level: last.level,
        mode: last.mode,
      });
    }
    currentScore = g.score;
    currentIndex = M.current(g) ?? g.index;
  }
  function settle() {
    syncRecords();
    state.value = "";
    state.message = "";
    state.last = state.game.history.at(-1) || null;
    render();
    if (state.game.finished) S.finish();
    else S.queueSave();
  }
  function answer(value) {
    if (!allowed()) return;
    const v = String(value).trim();
    if (!v) {
      state.message = "Жауабыңызды енгізіңіз.";
      if ($("finalMessage")) $("finalMessage").textContent = state.message;
      return;
    }
    const key = M.current(state.game),
      q = state.qs[key],
      before = state.game.completed.length;
    const outcome = M.answer(
      state.game,
      R.same(v, q.answer),
      v,
      S.clock().time(),
    );
    if (outcome) {
      state.motion = outcome.correct ? { from: before } : null;
      settle();
    }
  }
  function next() {
    if (M.next(state.game, S.clock().time())) {
      state.motion = null;
      settle();
    }
  }
  function tick(now) {
    if (!allowed()) return;
    if (M.tick(state.game, now)) {
      settle();
      return;
    }
    updateMotion();
  }
  function landscape() {
    return '<svg class="final-landscape" viewBox="0 0 400 400" role="img" aria-label="Күн, таулар, өзен және үйі бар біртұтас табиғат суреті"><defs><linearGradient id="finalSky" x2="0" y2="1"><stop stop-color="#66c7ef"/><stop offset="1" stop-color="#d5f6f0"/></linearGradient></defs><rect width="400" height="400" fill="url(#finalSky)"/><circle cx="300" cy="72" r="34" fill="#ffe18a"/><path d="M0 265L105 90L225 265Z" fill="#627c9b"/><path d="M61 163L105 90L154 162L124 148L103 164L83 148Z" fill="#f2fbff"/><path d="M137 267L261 111L400 268Z" fill="#7e9db1"/><path d="M225 157L261 111L306 163L273 151L254 161L244 147Z" fill="#f5fcff"/><path d="M0 261Q130 209 219 271T400 253V400H0Z" fill="#68a96b"/><path d="M220 259Q129 303 229 335T151 400H286Q316 352 252 323T268 266Z" fill="#5ebede"/><path d="M55 318V262H128V318Z" fill="#ecc290"/><path d="M43 263L91 224L140 263Z" fill="#a75e65"/><rect x="80" y="284" width="20" height="34" fill="#735d59"/><rect x="106" y="277" width="14" height="15" fill="#c5effa"/><path d="M329 309V247M299 278L329 216L359 278ZM304 257L329 198L354 257Z" stroke="#416d53" stroke-width="8" fill="#367f62"/><path d="M20 362Q70 337 120 361M305 354Q348 333 389 357" fill="none" stroke="#c8df83" stroke-width="7"/></svg>';
  }
  function puzzleScene() {
    const g = state.game,
      grid = Math.sqrt(g.count);
    return `<section class="final-puzzle-scene"><h3>Ашылған бөлік: ${g.completed.length}/${g.count}</h3><div class="final-picture ${g.completed.length === g.count ? "picture-complete" : ""}">${landscape()}<div class="final-puzzle-grid" style="--grid:${grid}">${state.qs.map((_, i) => `<button type="button" data-final-piece="${i}" class="${g.completed.includes(i) ? "piece-open" : i === g.index ? "piece-current" : ""}" ${g.completed.includes(i) || g.phase !== "task" ? "disabled" : ""} aria-label="${i + 1}-бөлік ${g.completed.includes(i) ? "ашылды" : "жабық"}">${g.completed.includes(i) ? "✓" : "?"}<small>${i + 1}</small></button>`).join("")}</div></div><p>Жабық бөлікті таңдап, есепті дұрыс шешіңіз. Барлық бөлік ашылғанда тұтас сурет көрінеді.</p></section>`;
  }
  function questScene() {
    const g = state.game;
    return `<section class="final-quest-map"><div class="final-map-ends"><strong>🚩 Бастау</strong><strong>🏁 Соңғы мақсат</strong></div><div class="final-map-nodes">${stations
      .map((name, i) => {
        const done = g.plan.every(
            (q, n) => q.station !== i || g.completed.includes(n),
          ),
          open = i === g.station && !done;
        return `<button type="button" data-final-station="${i}" class="map-node ${done ? "node-done" : open ? "node-open" : "node-locked"}" ${!open || g.phase !== "map" ? "disabled" : ""}><span>${done ? "✓" : open ? "📍" : "🔒"}</span><strong>${i + 1}. ${name}</strong><small>${done ? "Аяқталды" : open ? "Қолжетімді" : "Алдыңғы бекетті аяқтаңыз"}</small></button>`;
      })
      .join(
        "",
      )}</div><div class="final-station-skills">${stations.map((n, i) => `<p><strong>${i + 1}. ${n}:</strong> ${esc(i === 3 ? "Есептеу, сәйкестендіру және қатені түзетуді біріктіру" : C.skills[state.lesson][i === 0 ? 0 : 1])}. Ашылуы: ${i === 0 ? "ойынның басталуы" : "алдыңғы бекеттің барлық есебі дұрыс орындалуы"}.</p>`).join("")}</div></section>`;
  }
  function rocketScene() {
    const g = state.game,
      p = g.completed.length / g.count,
      dock = g.animation?.kind === "docking" ? g.animation.progress : 0;
    return `<section class="final-rocket-scene" style="background:linear-gradient(0deg,hsl(205 65% ${60 - p * 50}%),hsl(235 70% ${40 - p * 35}%))"><div class="final-stars" style="opacity:${p}">✦ · ✧ · ✦<br>· ✦ · ✧<br>✧ · ✦ ·</div><div class="final-altitude">${Array.from({ length: g.count + 1 }, (_, i) => `<span style="bottom:${12 + (i / g.count) * 72}%">${i * 100} км</span>`).join("")}</div><span class="final-station" aria-label="Ғарыш станциясы">🛰️</span><span id="finalRocketShip" class="final-rocket-ship ${state.motion && !g.animation ? "rocket-step" : ""}" style="bottom:${12 + p * 72 + dock * 2}%;left:${45 + dock * 12}%;--from-bottom:${12 + ((state.motion?.from ?? g.completed.length) / g.count) * 72}%" aria-label="Зымыран биіктігі ${g.completed.length * 100} км">🚀</span><span class="final-earth">🌎</span><p class="final-height-label">${g.completed.length * 100} км · ${g.completed.length}/${g.count} кезең</p></section>`;
  }
  function castleScene() {
    const g = state.game;
    return `<section class="final-castle-scene ${state.last?.correct ? "defense-success" : state.last ? "defense-damage" : ""}"><div class="final-castle-art"><span>🏰</span><span class="final-shield">🛡️</span><span class="final-attack">➶</span></div><h3>Қорғаныс: ${g.health}/100</h3><div class="final-health"><i style="width:${g.health}%"></i></div><p>Шабуыл кезеңі: ${Math.min(3, Math.floor(g.index / 2) + 1)}/3 · Қате жауап зияны: ${35 - g.armor * 10}.</p><p>Жөндеуге қолжетімді: ${g.wallet} ұпай · Бекініс деңгейі: ${g.armor}/2.</p><p>Ойланып отырған кезде қорғаныс өздігінен азаймайды.</p></section>`;
  }
  function bridgeScene() {
    const g = state.game,
      p = g.animation?.kind === "crossing" ? g.animation.progress : 0;
    return `<section class="final-bridge-scene"><h3>Қалған бөлік: ${g.count - g.completed.length}</h3><div class="final-river"><div class="river-bank bank-left">Бастау<br>жағасы</div><div class="river-bank bank-right">Мақсат<br>жағасы</div><div class="final-planks" style="--pieces:${g.count}">${state.qs.map((_, i) => `<span class="${g.completed.includes(i) ? "plank-built" : "plank-missing"}" aria-label="${i + 1}-бөлік ${g.completed.includes(i) ? "салынды" : "жетіспейді"}"></span>`).join("")}</div><span id="finalBridgeWalker" class="final-walker" style="left:${5 + p * 90}%" aria-label="Кейіпкер ${p === 1 ? "арғы жағалауда" : "бастау жағасында"}">🚶</span></div><p>Барлық бөлік салынғанда ғана кейіпкер арғы бетке өтеді.</p></section>`;
  }
  function kingScene() {
    const g = state.game;
    return `<section class="final-king-map"><div id="finalCrown" class="${g.finished && g.won ? "crown-awarded" : "crown-locked"}" aria-label="${g.finished && g.won ? "Тәж берілді" : "Тәж әлі берілген жоқ"}">${g.finished && g.won ? "👑" : "🔒"}</div><div class="final-levels">${[0, 1, 2, 3].map((i) => `<button type="button" data-final-level="${i}" class="${g.passed[i] ? "level-passed" : i === g.level ? "level-open" : "level-locked"}" ${i !== g.level || g.phase !== "map" || g.passed[i] ? "disabled" : ""}><strong>${i === 3 ? "Соңғы сынақ" : i + 1 + "-деңгей"}</strong><span>${esc(i === 3 ? "Барлық үш дағды" : C.skills[state.lesson][i])}</span><small>${g.passed[i] ? "✓ Шарт орындалды" : "Өту шарты: кемінде 4/5 (80%) дұрыс жауап"}</small></button>`).join("")}</div><p>Деңгейлер ретімен ашылады. Жалпы ұпай өту шартын алмастырмайды.</p></section>`;
  }
  function scene() {
    return (
      {
        quest: questScene,
        puzzle: puzzleScene,
        rocket: rocketScene,
        castle: castleScene,
        bridge: bridgeScene,
        "math-king": kingScene,
      }[state.id] || (() => "")
    )();
  }
  function choiceView(q, disabled = false) {
    const target = state.id === "target",
      last = state.last;
    return `<div class="${target ? "final-target-grid" : "final-answer-choices"}">${q.options.map((v, i) => `<button type="button" data-final-answer="${i}" ${disabled ? "disabled" : ""} class="${target ? "final-target-button " : ""}${target && disabled && R.same(v, last?.value) ? (last.correct ? "final-target-hit" : "final-target-miss") : ""}">${target ? '<span class="target-rings" aria-hidden="true">◎</span>' : ""}<strong>${esc(v)}</strong></button>`).join("")}</div>`;
  }
  function inputView() {
    return `<label for="finalAnswer">Жауабыңыз</label><input id="finalAnswer" autocomplete="off" inputmode="text" value="${esc(state.value)}"><button id="finalSubmit" type="button" class="game-primary">Жауап беру · Enter</button>`;
  }
  function matchView() {
    const g = state.game,
      order = state.orders[g.station];
    return `<p>Сол бағаннан есепті, оң бағаннан оның жауабын таңдаңыз.</p><div class="final-match-columns"><section><h3>Есептер</h3>${order.left.map((i) => `<button type="button" data-final-left="${i}" class="${g.completed.includes(i) ? "match-done" : g.selectedLeft === i ? "match-selected" : ""}" ${g.completed.includes(i) ? "disabled" : ""}>${esc(state.qs[i].question)}</button>`).join("")}</section><section><h3>Жауаптар</h3>${order.right.map((i) => `<button type="button" data-final-right="${i}" class="${g.completed.includes(i) ? "match-done" : ""}" ${g.completed.includes(i) ? "disabled" : ""}>${esc(state.qs[i].answer)}</button>`).join("")}</section></div>`;
  }
  function errorView(q, key) {
    const g = state.game,
      bad = C.variants(q.answer)[1];
    return `<h3>Алғашқы қате қадамды тап</h3><ol class="final-error-steps">${[`Берілгені: ${q.question}`, `Есептеу нәтижесі: ${bad}`, `Жауабы: ${bad}`].map((s, i) => `<li>${g.detected[key] ? esc(s) : `<button type="button" data-final-error="${i}">${i + 1}-қадам: ${esc(s)}</button>`}</li>`).join("")}</ol>${g.detected[key] ? "<p>2-қадамда есептеу қатесі бар. Есепті дұрыс шығарып, түзетілген жауапты енгізіңіз.</p>" + inputView() : ""}`;
  }
  function taskView() {
    const g = state.game,
      key = M.current(g),
      q = state.qs[key],
      feedback = g.phase === "feedback";
    if (!q) return "";
    let body;
    if (feedback) {
      const row = g.history.at(-1);
      body =
        (state.id === "target" ? choiceView(q, true) : "") +
        `<div class="final-feedback" role="status"><h3>${row.correct ? (state.id === "target" ? "🎯 Дәл тиді!" : "✓ Дұрыс орындалды") : "✕ Қате жауап"}</h3><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p>${!row.correct && !(state.id === "math-king" && g.kingMode === "test") && !["castle", "target"].includes(state.id) ? "<p>Шешімді көрдіңіз. Қатені түзету көмекпен тіркеледі; жол автоматты түрде ашылмайды.</p>" : ""}<button id="finalContinue" type="button" class="game-primary">${row.correct || ["castle", "target"].includes(state.id) || (state.id === "math-king" && g.kingMode === "test") ? "Жалғастыру" : "Қайта орындау"}</button></div>`;
    } else if (q._finalMeta.kind === "match" && state.id === "quest")
      body = matchView();
    else if (q._finalMeta.kind === "error" && state.id === "quest")
      body = errorView(q, key);
    else
      body = ["puzzle", "castle", "target"].includes(state.id)
        ? choiceView(q)
        : inputView();
    return `<section class="final-task"><h3>${state.id === "math-king" ? (g.kingMode === "practice" ? `Ұқсас есептермен жаттығу · ${g.roundIndex + 1}/${g.roundIds.length}` : `Деңгей сынағы · ${g.roundIndex + 1}/${g.roundIds.length}`) : "Математикалық тапсырма"}</h3><p class="final-skill">Дағды: ${esc(q._finalMeta.skill)}</p>${q._finalMeta.kind === "match" && state.id === "quest" ? "" : `<p class="final-prompt">${esc(q.question)}</p>`}${body}<p id="finalMessage" role="status">${esc(state.message)}</p></section>`;
  }
  function maintenance() {
    const g = state.game;
    return `<section class="final-maintenance"><h3>Кезеңаралық үзіліс</h3><p>Бір үзілісте бір жөндеу не күшейту таңдауға болады. Қолдағы ұпай: ${g.wallet}.</p><button type="button" id="finalRepair" ${g.maintenanceUsed || g.wallet < 10 || g.health === 100 ? "disabled" : ""}>10 ұпай: қорғанысқа +25 (ең көбі 100)</button><button type="button" id="finalArmor" ${g.maintenanceUsed || g.wallet < 20 || g.armor === 2 ? "disabled" : ""}>20 ұпай: келесі қате зиянын 10-ға азайту</button><button type="button" id="finalNextWave" class="game-primary">Келесі шабуыл кезеңі</button></section>`;
  }
  function analogs(keys) {
    return keys.map((key, i) =>
      C.task(state.lesson, 100 + i, state.qs[key]._finalMeta.tier),
    );
  }
  function gateView() {
    const g = state.game,
      gate = g.lastGate;
    return `<section class="final-gate"><h3>${gate.passed ? "Деңгей шарты орындалды" : "Қайталау қажет"}</h3><p>Дұрыс: ${gate.correct}/${gate.total} — ${(gate.correct / gate.total) * 100}%. Шек: 80%.</p><p>${gate.passed ? "Келесі деңгей картасы ашылады." : "Жалпы ұпайға қарамастан келесі деңгей жабық. Алдымен ұқсас қате есептерді жаттықтырыңыз, кейін жаңа сынақ тапсырыңыз."}</p>${analogs(
      gate.errors,
    )
      .map(
        (q) =>
          `<details><summary>Ұқсас жаттығу: ${esc(q.question)}</summary><p>${esc(q._logicExplain.solution)}</p></details>`,
      )
      .join(
        "",
      )}<button type="button" id="${gate.passed ? "finalAdvanceLevel" : "finalPracticeLevel"}" class="game-primary">${gate.passed ? "Келесі деңгей картасы" : "Ұқсас есептермен жаттығу"}</button></section>`;
  }
  function mintRound(practice) {
    const g = state.game,
      tiers = practice
        ? g.lastGate.errors.map((i) => state.qs[i]._finalMeta.tier)
        : g.level === 3
          ? [0, 1, 2, 1, 2]
          : Array(5).fill(g.level),
      keys = [],
      seen = new Set(state.qs.map((q) => q.question));
    state.reused = false;
    for (const tier of tiers) {
      let q,
        tries = 0;
      do {
        q = C.task(state.lesson, state.serial++, tier);
        tries++;
      } while (seen.has(q.question) && tries < 250);
      if (seen.has(q.question)) {
        state.reused = true;
        let local = 0;
        while (
          keys.some((i) => state.qs[i].question === q.question) &&
          local++ < 250
        )
          q = C.task(state.lesson, state.serial++, tier);
      }
      const i = state.qs.length;
      q = {
        ...q,
        options: R.shuffle(R.choices(q)),
        _sessionKey: `final:king:${state.lesson}:${i}`,
        _finalMeta: { ...q._finalMeta, kind: "solve", level: g.level },
      };
      seen.add(q.question);
      state.qs.push(q);
      g.plan.push(q._finalMeta);
      keys.push(i);
    }
    S.current().questions = state.qs;
    currentQuestions = state.qs;
    if (M.addRound(g, keys, practice, S.clock().time())) {
      S.current().settings.mode = practice ? "practice" : "challenge";
      state.value = "";
      state.message = "";
      state.last = null;
      render();
      S.queueSave();
    }
  }
  function updateMotion() {
    const g = state?.game;
    if (!g?.animation) return;
    const p = g.animation.progress;
    if (g.animation.kind === "crossing" && $("finalBridgeWalker"))
      $("finalBridgeWalker").style.left = 5 + p * 90 + "%";
    if (g.animation.kind === "docking" && $("finalRocketShip")) {
      $("finalRocketShip").style.left = 45 + p * 12 + "%";
      $("finalRocketShip").style.bottom = 84 + p * 2 + "%";
    }
    if ($("finalAnimationProgress"))
      $("finalAnimationProgress").textContent = Math.round(p * 100) + "%";
  }
  function render() {
    if (!state) return;
    revision++;
    const g = state.game,
      key = M.current(g),
      q = state.qs[key];
    const progress =
      state.id === "math-king"
        ? `${g.completed.length} / ${state.qs.length}`
        : g.phase === "map"
          ? `${g.completed.length} / ${g.count}`
          : `${Math.min(g.count, g.index + 1)} / ${g.count}`;
    $("gameProgress").textContent = g.finished ? "Нәтиже" : progress;
    let body = "";
    if (g.finished)
      body = `<section class="final-finish"><h2>${state.id === "target" ? "Нысана жаттығуы аяқталды" : g.won ? "Мақсатқа жеттіңіз!" : "Ойын аяқталды"}</h2><p>${esc(g.reason)}</p><button type="button" id="finalReplay" class="game-primary">Қайта ойнау</button></section>`;
    else if (g.animation)
      body = `<section class="final-celebration" role="status"><h3>${g.animation.kind === "crossing" ? "Кейіпкер арғы бетке өтіп жатыр" : g.animation.kind === "docking" ? "Ғарыш станциясына қону" : "Тәжді табыстау рәсімі"}</h3><strong id="finalAnimationProgress">${Math.round(g.animation.progress * 100)}%</strong><p>Барлық міндетті тапсырма шарты орындалды.</p></section>`;
    else if (g.phase === "maintenance") body = maintenance();
    else if (g.phase === "gate") body = gateView();
    else if (g.phase === "retest")
      body =
        '<section class="final-gate"><h3>Жаттығу аяқталды</h3><p>Жаттығу нәтижесі деңгейді автоматты түрде ашпайды. Енді жаңа бес есеппен кемінде 80% дұрыс жауап беріңіз.</p><button type="button" id="finalRetest" class="game-primary">Жаңа есептермен қайта сынақ</button></section>';
    else if (g.phase !== "map") body = taskView();
    box().innerHTML = `<article class="final-game final-${state.id}"><header><h2>${esc(mathGames.find((x) => x.id === state.id).title)}</h2><p>${state.review ? "Қате есептерді бөлек жаттықтыру" : state.id === "math-king" && g.kingMode === "practice" ? "Деңгейге дайындық жаттығуы" : "Таңдалған тақырыптың оқу ойыны"}</p><p>Ойын ұпайы: <strong>${g.score}</strong>${state.id === "math-king" ? ` · Өтілген деңгей: ${g.passed.filter(Boolean).length}/4` : ""}</p>${state.reused ? '<p class="final-note">Осы үлгінің жаңа есептері таусылды; ұқсас есеп қайта қолданылды.</p>' : ""}</header>${scene()}${body}</article>`;
    if (g.finished) {
      $("finalReplay").onclick = terminal(startSelectedGame);
      return;
    }
    if (["task", "feedback"].includes(g.phase)) {
      S.present(key);
    } else {
      $("sharedHelpButtons").hidden = true;
      $("sharedHelpText").hidden = true;
      $("sharedHelpText").textContent = "";
    }
    bind("[data-final-station]", (el) => {
      if (M.visit(g, Number(el.dataset.finalStation), S.clock().time())) {
        state.last = null;
        render();
        S.queueSave();
      }
    });
    bind("[data-final-level]", (el) => {
      if (M.visit(g, Number(el.dataset.finalLevel), S.clock().time())) {
        S.current().settings.mode = "challenge";
        state.last = null;
        render();
        S.queueSave();
      }
    });
    bind("[data-final-piece]", (el) => {
      if (M.selectPiece(g, Number(el.dataset.finalPiece), S.clock().time())) {
        state.value = "";
        state.message = "";
        render();
        S.queueSave();
      }
    });
    bind("[data-final-answer]", (el) =>
      answer(q.options[Number(el.dataset.finalAnswer)]),
    );
    bind("#finalSubmit", () => answer(state.value));
    typing();
    bind("#finalContinue", next);
    bind("[data-final-left]", (el) => {
      g.selectedLeft = Number(el.dataset.finalLeft);
      state.message = "Енді оң жақтан сәйкес жауапты таңдаңыз.";
      render();
      S.queueSave();
    });
    bind("[data-final-right]", (el) => {
      if (g.selectedLeft === null) {
        state.message = "Алдымен сол бағаннан есепті таңдаңыз.";
        $("finalMessage").textContent = state.message;
        return;
      }
      const right = Number(el.dataset.finalRight);
      if (M.match(g, g.selectedLeft, right, S.clock().time())) {
        g.history.at(-1).value = state.qs[right].answer;
        settle();
      }
    });
    bind("[data-final-error]", (el) => {
      if (M.detect(g, Number(el.dataset.finalError), S.clock().time()))
        settle();
    });
    bind("#finalRepair", () => {
      if (M.maintain(g, "repair")) render();
      S.queueSave();
    });
    bind("#finalArmor", () => {
      if (M.maintain(g, "armor")) render();
      S.queueSave();
    });
    bind("#finalNextWave", () => {
      if (M.nextWave(g, S.clock().time())) {
        state.last = null;
        render();
        S.queueSave();
      }
    });
    bind("#finalAdvanceLevel", () => {
      if (M.advanceLevel(g)) {
        state.last = null;
        render();
        S.queueSave();
      }
    });
    bind("#finalPracticeLevel", () => mintRound(true));
    bind("#finalRetest", () => mintRound(false));
    if ($("finalAnswer")) $("finalAnswer").focus({ preventScroll: true });
    S.queueSave();
  }
  function renderSummary(elapsed) {
    const g = state.game,
      model = S.current(),
      rows = Object.values(model.records),
      errors = state.qs.filter(
        (q) => !model.records[q._sessionKey]?.firstCorrect,
      ),
      correct = rows.filter((r) => r.correct).length,
      independent = rows.filter((r) => r.firstCorrect && !r.assisted).length;
    const panel = document.createElement("section");
    panel.id = "sharedSummary";
    panel.className = "shared-summary";
    panel.innerHTML = `<h2>Оқу нәтижесі</h2><p>Бұл нәтиже тек осы браузерде. Серверде сақталған баға емес. Қате түзету алғашқы әрекетті өшірмейді.</p><dl class="shared-metrics">${[
      ["Жауап берілген есеп", rows.length],
      ["Қазір дұрыс орындалған", correct],
      ["Қате қалған", rows.length - correct],
      ["Алғашқы қате есеп", rows.filter((r) => !r.firstCorrect).length],
      ["Жауапсыз", Math.max(0, state.qs.length - rows.length)],
      ["Бірінші әрекетте, көмексіз", independent],
      [
        "Көмексіз алғашқы дәлдік",
        Math.round((independent / (rows.length || 1)) * 100) + "%",
      ],
      ["Көмек қолданылған", rows.filter((r) => r.assisted).length],
      ["Қате әрекеттер", g.history.filter((r) => !r.correct).length],
      [
        "Белсенді уақыт",
        (elapsed / 1000).toFixed(1).replace(".", ",") + " секунд",
      ],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
      .join(
        "",
      )}</dl><p>Қаралған тақырып: ${esc(GameLearning.lessons[state.lesson]?.[0])}. Қайталау қажет: ${errors.length} есеп. Бұл бүкіл тақырып меңгерілді деген қорытынды емес.</p>${state.id === "math-king" ? `<section><h3>Деңгей сынақтары</h3>${g.gates.map((a) => `<p>${a.level + 1}-деңгей: ${a.correct}/${a.total} (${(a.correct / a.total) * 100}%) · ${a.passed ? "Шарт орындалды" : "Қайта сынақ қажет болды"}.</p>`).join("")}</section>` : ""}<div class="shared-review">${state.qs
      .map((q) => {
        const r = model.records[q._sessionKey];
        return `<details><summary>${esc(q.question)} — ${r ? (r.correct ? "Дұрыс" : "Қате") : "Жауап берілмеді"}${r?.assisted ? " · көмекпен" : ""}</summary><p>Жауабыңыз: ${esc(r?.value || "—")}. Әрекет саны: ${r?.attempts || 0}.</p><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p></details>`;
      })
      .join(
        "",
      )}</div><button id="finalRetryMistakes" type="button" class="game-primary" ${errors.length ? "" : "disabled"}>Қате және аяқталмаған есептерді жаттықтыру</button><button id="finalOtherGame" type="button" class="presentation-back">Басқа ойын таңдау</button>`;
    box().append(panel);
    $("finalOtherGame").onclick = terminal(backToGames);
    $("finalRetryMistakes").onclick = terminal(() => {
      const lesson = state.lesson;
      pendingPractice = {
        lesson,
        qs: errors
          .map((q, i) =>
            state.id === "math-king"
              ? C.task(lesson, 200 + i, q._finalMeta.tier)
              : { ...q },
          )
          .map((q) => ({
            ...q,
            _finalMeta: { ...q._finalMeta, kind: "solve" },
          }))
          .sort((a, b) => a._finalMeta.tier - b._finalMeta.tier),
      };
      selectGame("bridge");
      const [grade, subject, quarter, ...n] = lesson.split("-");
      $("gradeSelect").value = grade;
      $("gradeSelect").dispatchEvent(new Event("change"));
      $("subjectSelect").value = subject;
      $("quarterSelect").value = quarter;
      $("quarterSelect").dispatchEvent(new Event("change"));
      $("lessonSelect").value = n.join("-");
      $("sharedMode").value = "practice";
      startSelectedGame();
    });
  }
  const oldGet = window.getGameQuestions,
    oldRender = window.renderCurrentQuestion;
  window.getGameQuestions = function (id, lesson) {
    const old = oldGet(id, lesson);
    return supports(id) ? source(id, lesson) : old;
  };
  window.renderCurrentQuestion = function () {
    return supports(currentGameMode) && state?.id === currentGameMode
      ? render()
      : oldRender();
  };
  S.adapters.final = {
    setQuestions() {},
    tick,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    restore(saved) {
      if (
        saved?.version !== 1 ||
        saved.id !== S.current().id ||
        !supports(saved.id) ||
        !saved.game ||
        !Array.isArray(saved.qs) ||
        saved.qs.length !== S.current().questions.length
      )
        throw Error("Сақталған ойын жарамсыз.");
      state = saved;
      state.motion = null;
      epoch++;
      revision++;
      S.clock().pause();
      S.current().questions = state.qs;
      currentQuestions = state.qs;
      syncRecords();
      render();
      if (state.game.finished) S.finish();
    },
  };
  window.GameFinal = {
    supports,
    source,
    setup,
    configure,
    start,
    renderSummary,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    restoreSettings(model) {
      if (model.id === "puzzle" && $("finalPuzzleGrid"))
        $("finalPuzzleGrid").value = String(model.settings.grid || 2);
    },
    description(id) {
      return {
        quest:
          "Картадағы бекеттерді аш. Есептеу, сәйкестендіру және қатені түзету арқылы соңғы қақпаға жет.",
        puzzle:
          "Әр дұрыс есеп суреттің бір бөлігін ашады. Тор көлемін таңдап, тұтас көріністі жина.",
        rocket:
          "Күрделене түсетін есептерді орындап, зымыранды аспаннан ғарыш станциясына көтер.",
        castle:
          "Математикалық жауаппен қамалды қорға. Кезеңдер арасында жөндеу не күшейту таңда.",
        target:
          "Қозғалмайтын жауап нысанасын таңда. Ұпай дәл математикалық жауап үшін беріледі.",
        bridge:
          "Әр дұрыс есеппен бір көпір бөлігін сал. Барлық бөлік дайын болғанда арғы бетке өт.",
        "math-king":
          "Әр деңгейде кемінде 80% дұрыс жауап бер. Барлық міндетті сынақ пен финалды өтіп, тәжге жет.",
      }[id];
    },
  };
})();
