/* Session adapter for fair paired turns and racing scenes. */
(function () {
  "use strict";
  const S = GameSession,
    M = MathRacingModels,
    C = MathRacingContent,
    ids = new Set(["tug-of-war", "math-race", "car-race"]);
  const $ = (id) => document.getElementById(id),
    esc = escapeGameHtml,
    box = () => $("gameQuestion");
  const names = ["Көк команда", "Қызыл команда"];
  // Presentation metadata only; gameQuestionBank is left untouched.
  const carMetadata = mathGames.find((g) => g.id === "car-race");
  if (carMetadata) carMetadata.title = "🏎️ Көлік жарысы";
  let state = null,
    epoch = 0,
    revision = 0;
  let pendingPractice = null;
  const supports = (id) => ids.has(id);
  function pair(id, lesson, round) {
    return C.pair(lesson, round, id).map((q) => ({
      ...q,
      options: M.shuffle(M.choices(q)),
    }));
  }
  function source(id, lesson) {
    if (!window.gameQuestionBank[lesson]) return [];
    if (id === "car-race") {
      const review = pendingPractice?.lesson === lesson;
      return (
        review
          ? pendingPractice.qs
          : window.gameQuestionBank[lesson].quickAnswer || []
      ).map((q, i) => ({
        ...q,
        options: M.shuffle(M.choices(q)),
        _logicExplain: q._logicExplain || GameLearning.explain(lesson, q),
        _sessionKey: `racing:car:${lesson}:${review ? "review:" : ""}${i}`,
      }));
    }
    return Array.from({ length: 4 }, (_, r) => pair(id, lesson, r)).flat();
  }
  function configure(opts, id) {
    if (!supports(id)) return;
    if (id === "car-race") {
      opts.review = pendingPractice?.lesson === getLessonKey();
      opts.opponent = opts.review
        ? "practice"
        : $("racingOpponent")?.value || "medium";
      opts.mode = opts.opponent === "practice" ? "practice" : "challenge";
      return;
    }
    opts.mode = "challenge";
    opts.teamSize =
      id === "math-race" ? Number($("racingTeamSize")?.value || 2) : 1;
  }
  function setup(id) {
    if (!supports(id)) return;
    if (id === "car-race") {
      const field = document.createElement("div");
      field.className = "racing-setup";
      field.innerHTML =
        '<label for="racingOpponent">Қарсылас және жылдамдық</label><select id="racingOpponent">' +
        Object.entries(M.profiles)
          .map(
            ([id, p]) =>
              `<option value="${id}" ${id === "medium" ? "selected" : ""}>${p.label}${p.seconds ? " — " + p.seconds + " секундта 1 бекет" : ""}</option>`,
          )
          .join("") +
        '</select><p id="racingOpponentRule" class="racing-rule-note"></p>';
      $("sharedSetupInfo").append(field);
      $("racingOpponent").onchange = syncSetup;
      syncSetup();
      return;
    }
    if (id === "math-race") {
      const field = document.createElement("div");
      field.className = "racing-setup";
      field.innerHTML =
        '<label for="racingTeamSize">Әр командадағы қатысушы саны</label><select id="racingTeamSize"><option value="1">1 қатысушы</option><option value="2" selected>2 қатысушы</option><option value="3">3 қатысушы</option><option value="4">4 қатысушы</option></select>';
      $("sharedSetupInfo").append(field);
    }
    const info = document.createElement("p");
    info.className = "racing-rule-note";
    info.textContent =
      "Алғашқы команда тең ықтималдықпен анықталады. Бір жұп раундта екі команда бір үлгідегі, сандары әртүрлі есеп алады. Жеңіс екі команданың тең жүрісінен кейін бекітіледі. Қосымша раунд — ең көбі үшеу; одан кейін тең не аяқталмаған нәтиже ашық көрсетіледі.";
    $("sharedSetupInfo").append(info);
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
      index: 0,
      finished: false,
      match:
        id === "car-race"
          ? null
          : M.createTeam(
              id,
              Math.random() < 0.5 ? 0 : 1,
              S.current().settings.teamSize,
            ),
      value: "",
      message: "",
      motion: null,
    };
    if (id === "car-race") {
      state.car = M.createCar(S.current().settings.opponent, qs.length);
      state.phase = "task";
      state.attempts = [];
      state.practice = !!S.current().settings.review;
      pendingPractice = null;
    } else syncIndex();
  }
  function syncIndex() {
    if (!state) return;
    state.index = state.match.round * 2 + state.match.turn;
  }
  function allowed() {
    return (
      !!state &&
      S.current()?.id === state.id &&
      S.canAnswer() &&
      !state.finished
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
            fn(el);
          }),
      );
  }
  function typing(selector, key) {
    const e = epoch,
      r = revision,
      el = box().querySelector(selector);
    if (el)
      el.oninput = () => {
        if (e !== epoch || r !== revision || !allowed()) return;
        state[key] = el.value;
        S.queueSave();
      };
  }
  function ropeScene(m) {
    const pct = 50 + (m.rope / 3) * 34,
      from = 50 + ((state.motion?.rope ?? m.rope) / 3) * 34;
    return `<section class="racing-rope-scene" aria-label="Арқанның орны ${m.rope}; жеңіс шегі ${m.goal}"><div class="rope-side-labels"><strong>← Көк жақ · −${m.goal}</strong><strong>Қызыл жақ · +${m.goal} →</strong></div><div class="rope-ground"><span class="rope-goal rope-goal-left" style="left:${50 - (m.goal / 3) * 34}%"></span><span class="rope-center" aria-label="Орта сызық"></span><span class="rope-goal rope-goal-right" style="left:${50 + (m.goal / 3) * 34}%"></span><div class="rope-cable" style="transform:translateX(${(m.rope / 3) * 12}%)"></div><span class="rope-knot ${state.motion ? "rope-moving" : ""}" style="left:${pct}%;--racing-from:${from}%" aria-label="Орталық белгі">◆</span><span class="rope-pull rope-blue" aria-hidden="true">← 🧍🧍</span><span class="rope-pull rope-red" aria-hidden="true">🧍🧍 →</span></div><p>Орталық белгі: ${m.rope}. Бір дұрыс жауап = өз жағына 1 қадам. Қате жауап = 0 қозғалыс.</p>${Math.abs(m.rope) >= m.goal && !m.finished ? '<p class="racing-status">Шекке жетті. Екінші команданың тең жүрісі аяқталғанша жеңіс бекітілмейді.</p>' : ""}</section>`;
  }
  function stadium(m) {
    return `<section class="racing-stadium"><h3>🏟️ Бекеттер эстафетасы · мәре ${m.goal}-бекет</h3>${names.map((n, i) => `<div class="racing-lane team-${i}"><div class="racing-lane-label">${n}: ${m.positions[i]} / ${m.goal}</div><div class="racing-road"><span class="racing-finish-line" aria-label="Мәре">🏁</span><div class="racing-stations">${Array.from({ length: m.goal + 1 }, (_, k) => `<span>${k}</span>`).join("")}</div><span class="racing-vehicle ${state.motion?.team === i ? "runner-moving" : ""}" style="left:${5 + Math.min(1, m.positions[i] / m.goal) * 84}%;--racing-from:${5 + Math.min(1, (state.motion?.positions[i] ?? m.positions[i]) / m.goal) * 84}%" aria-label="${n}, ${m.positions[i]}-бекет">${i ? "🏃" : "🏃‍♀️"}</span></div></div>`).join("")}</section>`;
  }
  function teamHeader() {
    const m = state.match;
    return `<header><h2>${state.id === "tug-of-war" ? "🪢 Арқандағы тепе-теңдік" : "🏆 Математикалық эстафета"}</h2><p>${m.extra ? `Қосымша жұп раунд ${m.extra}/3` : `Негізгі жұп раунд ${m.round + 1}/4`}. Жеңіс шегі: ${m.goal}. Бір құрылғыда кезектесіп ойнаңыз.</p><div class="racing-team-scores">${names.map((name, i) => `<div class="team-${i} ${m.turn === i && !m.finished && m.phase !== "review" ? "racing-active-team" : ""}"><strong>${name}</strong><span>${m.scores[i]} ұпай</span><small>${m.turns[i]} жүріс</small></div>`).join("")}</div></header>`;
  }
  function questionView() {
    const m = state.match,
      q = state.qs[state.index],
      kind = q._racing.kind;
    return `<section class="racing-task"><h3>${names[m.turn]}${state.id === "math-race" ? ` · ${(m.turns[m.turn] % m.size) + 1}-қатысушы` : ""}</h3><p class="racing-station-kind">${{ choice: "Таңдау бекеті", input: "Өзің есептеу бекеті", verify: "Тұжырымды тексеру бекеті" }[kind]}</p><p class="racing-prompt">${esc(q.question)}</p>${kind === "input" ? `<label for="racingAnswer">Есептің жауабы</label><input id="racingAnswer" autocomplete="off" value="${esc(state.value)}"><button type="button" id="racingSubmit" class="game-primary">Жауап беру</button>` : `<div class="racing-answers">${q.options.map((v, i) => `<button type="button" data-racing-answer="${i}">${esc(v)}</button>`).join("")}</div>`}<p role="status">${esc(state.message)}</p></section>`;
  }
  function teamBody() {
    const m = state.match;
    if (m.phase === "handover")
      return `<section class="racing-handover"><h3>Құрылғыны ${names[m.turn].toLowerCase()}ға беріңіз</h3><p>Есеп тек кезегі келген командаға ашылады.${state.id === "math-race" ? ` Қазір ${(m.turns[m.turn] % m.size) + 1}-қатысушы ойнайды.` : ""}</p><button type="button" id="racingReady" class="game-primary">Дайынмын — есепті ашу</button></section>`;
    if (m.phase === "task") return questionView();
    const rows = m.history.filter((r) => r.round === m.round);
    return `<section class="racing-round-review"><h3>Жұп раунд аяқталды</h3><p>Екі команда да жүріс жасады. Енді шешімдерді бірге талдауға болады.</p>${rows
      .map((r) => {
        const q = state.qs[r.round * 2 + r.team];
        return `<div><h4>${names[r.team]}: ${r.correct ? "✓ Дұрыс" : "✕ Қате"}</h4><p>${esc(q.question)}</p><p>${esc(q._logicExplain.solution)}</p></div>`;
      })
      .join(
        "",
      )}${m.nextExtra ? `<p>${m.extra ? "Тең не аяқталмаған нәтиже сақталды." : "Негізгі кезеңде жеңімпаз анықталмады."} Қосымша жұп раунд ${m.nextExtra}/3 өтеді.</p>` : ""}<button type="button" id="nextRacingRound" class="game-primary">${m.nextExtra ? "Қосымша раундты бастау" : "Келесі жұп раунд"}</button></section>`;
  }
  function answer(value) {
    if (!allowed() || state.match.phase !== "task") return;
    const q = state.qs[state.index],
      v = String(value).trim();
    if (!v) {
      state.message = "Жауабыңызды енгізіңіз.";
      render();
      return;
    }
    const token = `${state.match.round}:${state.match.turn}`,
      ok = M.same(v, q.answer),
      index = state.index,
      team = state.match.turn;
    const before = {
      rope: state.match.rope,
      positions: [...state.match.positions],
      team,
    };
    if (!M.settle(state.match, token, ok)) return;
    state.motion = ok ? before : null;
    S.record(index, ok, v);
    const row = S.current().records[q._sessionKey];
    row.team = team;
    state.value = "";
    state.message = "";
    currentScore = state.match.scores[0] + state.match.scores[1];
    if (state.match.finished) {
      finish();
      return;
    }
    syncIndex();
    render();
    S.queueSave();
  }
  function ensureRound() {
    while (state.qs.length < state.match.round * 2 + 2) {
      const more = pair(state.id, state.lesson, state.qs.length / 2);
      state.qs.push(...more);
    }
    S.current().questions = state.qs;
    currentQuestions = state.qs;
  }
  function finish() {
    state.finished = true;
    render();
    S.finish();
  }
  function render() {
    if (!state) return;
    revision++;
    if (state.car) return renderCar();
    const m = state.match;
    $("gameProgress").textContent = state.finished
      ? "Нәтиже"
      : `${m.phase === "review" ? m.history.length : Math.min(state.qs.length, m.history.length + 1)} / ${state.qs.length}`;
    const scene = state.id === "tug-of-war" ? ropeScene(m) : stadium(m);
    if (state.finished) {
      box().innerHTML = `<article class="racing-game ${state.id === "tug-of-war" ? "racing-tug" : "racing-relay"}">${teamHeader()}${scene}<section class="racing-finish"><h2>${m.winner === null ? "Жеңімпаз анықталмады" : names[m.winner] + " жеңді!"}</h2><p>${esc(m.reason)}</p><button type="button" id="racingReplay" class="game-primary">Қайта ойнау</button></section></article>`;
      $("racingReplay").onclick = startSelectedGame;
      return;
    }
    box().innerHTML = `<article class="racing-game ${state.id === "tug-of-war" ? "racing-tug" : "racing-relay"}">${teamHeader()}${scene}${teamBody()}</article>`;
    if (m.phase === "task") S.present(state.index);
    else {
      $("sharedHelpButtons").hidden = true;
      $("sharedHelpText").hidden = true;
      $("sharedHelpText").textContent = "";
    }
    bind("#racingReady", () => {
      if (M.enter(m)) {
        state.motion = null;
        render();
        S.queueSave();
      }
    });
    bind("[data-racing-answer]", (el) =>
      answer(state.qs[state.index].options[Number(el.dataset.racingAnswer)]),
    );
    typing("#racingAnswer", "value");
    bind("#racingSubmit", () => answer(state.value));
    const input = $("racingAnswer"),
      e = epoch,
      r = revision;
    if (input)
      input.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (e === epoch && r === revision) answer(state.value);
        }
      };
    bind("#nextRacingRound", () => {
      if (M.next(m)) {
        state.motion = null;
        ensureRound();
        syncIndex();
        render();
        S.queueSave();
      }
    });
    S.queueSave();
  }
  function renderSummary(elapsed) {
    if (state.car) return renderCarSummary(elapsed);
    const model = S.current(),
      m = state.match,
      rows = m.history,
      played = rows.length,
      correct = rows.filter((x) => x.correct).length;
    const panel = document.createElement("section");
    panel.id = "sharedSummary";
    panel.className = "shared-summary";
    panel.innerHTML = `<h2>Командалардың оқу нәтижесі</h2><p>Бұл тек осы браузердегі сессия. Серверде сақталған баға емес. Ойналмаған есептер қате ретінде саналмайды.</p><dl class="shared-metrics">${[
      ["Жауап берілген есеп", played],
      ["Дұрыс жауап", correct],
      ["Қате жауап", played - correct],
      ["Дәлдік", Math.round((correct / (played || 1)) * 100) + "%"],
      ["Белсенді уақыт", Math.round(elapsed / 1000) + " секунд"],
      ["Қосымша раунд", m.extra],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("")}</dl><div class="racing-result-teams">${names
      .map((name, i) => {
        const own = rows.filter((x) => x.team === i);
        return `<section><h3>${name}</h3><p>Дұрыс: ${own.filter((x) => x.correct).length}; қате: ${own.filter((x) => !x.correct).length}; жүріс: ${m.turns[i]}; ұпай: ${m.scores[i]}.</p>${state.id === "math-race" ? Array.from({ length: m.size }, (_, member) => `<p>${member + 1}-қатысушы: ${own.filter((x) => x.member === member).length} жүріс, ${own.filter((x) => x.member === member && x.correct).length} дұрыс.</p>`).join("") : ""}</section>`;
      })
      .join(
        "",
      )}</div><p>Қаралған тақырып: ${esc(GameLearning.lessons[state.lesson]?.[0])}. Қате жауаптары бар тақырыпты шешімдер арқылы қайталаңыз. Бұл бүкіл тақырып меңгерілді деген қорытынды емес.</p><div class="shared-review">${rows
      .map((row) => {
        const q = state.qs[row.round * 2 + row.team],
          record = model.records[q._sessionKey];
        return `<details><summary>${names[row.team]} · ${row.round + 1}-раунд · ${row.correct ? "Дұрыс" : "Қате"}</summary><p>${esc(q.question)}</p><p>Жауабыңыз: ${esc(record?.value)}</p><p>${esc(q._logicExplain.solution)}</p></details>`;
      })
      .join(
        "",
      )}</div><button id="racingOtherGame" type="button" class="presentation-back">Басқа ойын таңдау</button>`;
    box().append(panel);
    const errors = rows
      .filter((r) => !r.correct)
      .map((r) => state.qs[r.round * 2 + r.team]);
    const practice = document.createElement("button");
    practice.id = "racingPracticeMistakes";
    practice.type = "button";
    practice.className = "game-primary";
    practice.textContent = "Қате есептерді қарсылассыз қайта орындау";
    practice.disabled = !errors.length;
    practice.onclick = () => practiceMistakes(errors);
    panel.append(practice);
    $("racingOtherGame").onclick = backToGames;
  }
  function syncSetup() {
    const select = $("racingOpponent");
    if (!select) return;
    const p = M.profiles[select.value];
    $("sharedModeField").hidden = true;
    $("sharedFixedMode").hidden = false;
    $("sharedMode").value =
      select.value === "practice" ? "practice" : "challenge";
    $("sharedFixedMode").textContent =
      select.value === "practice"
        ? "Режим: қарсылассыз жаттығу. Алдын ала көмек алуға болады."
        : "Режим: қарсыласпен жарыс. Шешім жауап берілгеннен кейін ашылады.";
    $("racingOpponentRule").textContent = p.seconds
      ? `Қарсылас белсенді уақыттың әр ${p.seconds} секундында 1 бекет жүреді. Қарсылас сіздің дұрыс не қате жауабыңызға қарай жылдамдығын өзгертпейді. Түсіндірмені оқу уақыты да есептеледі; үзілісте қозғалыс тоқтайды. Мерзім біткен сәтте кеш жауап қабылданбайды.`
      : "Қарсылас және уақыт шегі жоқ. Мақсат — барлық есепті дұрыс шығарып, мәреге жету.";
  }
  function practiceMistakes(qs) {
    const lesson = state.lesson;
    pendingPractice = { lesson, qs: qs.map((q) => ({ ...q })) };
    selectGame("car-race");
    const [grade, subject, quarter, ...n] = lesson.split("-");
    $("gradeSelect").value = grade;
    $("gradeSelect").dispatchEvent(new Event("change", { bubbles: true }));
    $("subjectSelect").value = subject;
    $("quarterSelect").value = quarter;
    $("quarterSelect").dispatchEvent(new Event("change", { bubbles: true }));
    $("lessonSelect").value = n.join("-");
    $("racingOpponent").value = "practice";
    syncSetup();
    startSelectedGame();
  }
  function carTrack(c) {
    const lane = (role, label, pos, icon) =>
      `<div class="racing-lane car-${role}"><div class="racing-lane-label" id="car-${role}-label">${label}: ${pos.toFixed(2).replace(".", ",")} / ${c.goal}</div><div class="racing-road"><span class="racing-finish-line" aria-label="Мәре">🏁</span><div class="racing-stations">${Array.from({ length: c.goal + 1 }, (_, i) => `<span>${i}</span>`).join("")}</div><span id="car-${role}-vehicle" class="racing-vehicle ${role === "player" && state.motion ? "runner-moving" : ""}" style="left:${5 + (pos / c.goal) * 84}%;--racing-from:${5 + ((state.motion?.player ?? pos) / c.goal) * 84}%" aria-label="${label}, ${pos.toFixed(2)} бекет">${icon}</span></div></div>`;
    return `<section class="racing-car-road"><h3>Жол және мәре · ${c.goal} бекет</h3>${lane("player", "Ойыншы", c.player, "🏎️")}${c.profile === "practice" ? "" : lane("computer", "Компьютер", c.computer, "🚙")}</section>`;
  }
  function carPositions() {
    const c = state.car;
    for (const [role, label, pos] of [
      ["player", "Ойыншы", c.player],
      ["computer", "Компьютер", c.computer],
    ]) {
      const v = $("car-" + role + "-vehicle"),
        text = $("car-" + role + "-label");
      if (v) {
        v.style.left = 5 + (pos / c.goal) * 84 + "%";
        v.setAttribute("aria-label", label + ", " + pos.toFixed(2) + " бекет");
      }
      if (text)
        text.textContent =
          label + ": " + pos.toFixed(2).replace(".", ",") + " / " + c.goal;
    }
    const left = $("carDeadline");
    if (left)
      left.textContent =
        c.profile === "practice"
          ? "Қарсылассыз жаттығу; кері санақ жоқ."
          : "Қарсылас мәреге дейін: " +
            Math.max(0, Math.ceil((c.finishAt - c.elapsed) / 1000)) +
            " секунд.";
  }
  function tick(now) {
    if (!allowed() || !state.car) return;
    M.carTick(state.car, now);
    if (state.car.finished) {
      finish();
      return;
    }
    carPositions();
  }
  function carAnswer(value) {
    if (!allowed() || !state.car || state.phase !== "task") return;
    tick(S.clock().time());
    if (!allowed()) return;
    const q = state.qs[state.index],
      v = String(value).trim();
    if (!v) {
      state.message = "Жауабыңызды енгізіңіз.";
      render();
      return;
    }
    const ok = M.same(v, q.answer),
      before = state.car.player;
    if (!M.carAnswer(state.car, q._sessionKey, ok, S.clock().time())) {
      if (state.car.finished) finish();
      return;
    }
    S.record(state.index, ok, v);
    state.attempts.push({
      index: state.index,
      value: v,
      correct: ok,
      time: S.clock().time(),
    });
    if (!ok) {
      S.current().assist(q._sessionKey);
      S.current().records[q._sessionKey].assisted = true;
    }
    state.motion = ok ? { player: before } : null;
    state.feedback = { correct: ok, value: v };
    state.phase = "feedback";
    currentScore = state.car.player;
    if (state.car.finished) finish();
    else {
      render();
      S.queueSave();
    }
  }
  function renderCar() {
    const c = state.car,
      q = state.qs[state.index];
    $("gameProgress").textContent = state.finished
      ? "Нәтиже"
      : `${Math.min(state.qs.length, c.player + 1)} / ${state.qs.length}`;
    const header = `<header><h2>${state.practice ? "Қате есептерді қайта орындау" : "🏎️ Көлік жарысы"}</h2><p>${esc(M.profiles[c.profile].label)} · Дұрыс жауап: 1 бекет. Қате жауап: 0 қозғалыс. Ұпай: ${c.player}.</p><p id="carDeadline"></p>${c.profile !== "practice" ? `<p>Қарсылас тұрақты: ${c.stepMs / 1000} секундта 1 бекет. Жауап нәтижесі жылдамдықты өзгертпейді.</p>` : "<p>Бұл жаттығуда қарсылас жоқ; есептерді көмекпен қайта орындауға болады.</p>"}</header>`;
    if (state.finished) {
      box().innerHTML = `<article class="racing-game racing-car">${header}${carTrack(c)}<section class="racing-finish"><h2>${c.winner === "computer" ? "Компьютер мәреге жетті" : c.profile === "practice" ? "Жаттығу аяқталды — мәреге жеттіңіз!" : "Сіз мәреге бірінші жеттіңіз!"}</h2><button id="racingReplay" type="button" class="game-primary">Қайта ойнау</button></section></article>`;
      $("racingReplay").onclick = startSelectedGame;
      carPositions();
      return;
    }
    const input = q._racing?.kind === "input";
    box().innerHTML = `<article class="racing-game racing-car">${header}${carTrack(c)}<section class="racing-task"><h3>${state.index + 1}-есеп</h3><p class="racing-prompt">${esc(q.question)}</p>${state.phase === "feedback" ? `<div class="racing-car-feedback" role="status"><h3>${state.feedback.correct ? "✓ Ойыншы 1 бекет алға жылжыды." : "✕ Ойыншы орнында қалды."}</h3><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p>${!state.feedback.correct ? "<p>Шешім көрсетілді. Қайта орындау көмекпен тіркеледі.</p>" : ""}<button id="carContinue" type="button" class="game-primary">${state.feedback.correct ? "Келесі есеп" : "Осы есепті қайта орындау"}</button></div>` : input ? `<label for="carAnswer">Жауабыңыз</label><input id="carAnswer" autocomplete="off" value="${esc(state.value)}"><button id="carSubmit" type="button" class="game-primary">Жауап беру</button>` : `<div class="racing-answers">${q.options.map((v, i) => `<button type="button" data-car-answer="${i}">${esc(v)}</button>`).join("")}</div>`}<p role="status">${esc(state.message)}</p></section></article>`;
    S.present(state.index);
    carPositions();
    bind("[data-car-answer]", (el) =>
      carAnswer(state.qs[state.index].options[Number(el.dataset.carAnswer)]),
    );
    typing("#carAnswer", "value");
    bind("#carSubmit", () => carAnswer(state.value));
    const e = epoch,
      r = revision,
      el = $("carAnswer");
    if (el)
      el.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (e === epoch && r === revision) carAnswer(state.value);
        }
      };
    bind("#carContinue", () => {
      if (state.phase !== "feedback") return;
      if (state.feedback.correct) state.index++;
      state.phase = "task";
      state.motion = null;
      state.value = "";
      state.message = "";
      render();
      S.queueSave();
    });
    S.queueSave();
  }
  function renderCarSummary(elapsed) {
    const model = S.current(),
      c = state.car,
      summary = model.summary(),
      rows = Object.values(model.records),
      errors = state.qs.filter(
        (q) => !model.records[q._sessionKey]?.firstCorrect,
      );
    const panel = document.createElement("section");
    panel.id = "sharedSummary";
    panel.className = "shared-summary";
    panel.innerHTML = `<h2>Жарыстың оқу нәтижесі</h2><p>Тек осы браузердегі сессия; серверде сақталған баға емес.</p><dl class="shared-metrics">${[
      ["Есеп", state.qs.length],
      ["Дұрыс орындалған", summary.correct],
      ["Қате әрекет", state.attempts.filter((x) => !x.correct).length],
      ["Жауапсыз", summary.unanswered],
      ["Бірінші әрекетте, көмексіз", summary.independent],
      ["Көмек қолданылған", summary.assisted],
      ["Көмексіз алғашқы дәлдік", summary.accuracy + "%"],
      ["Белсенді уақыт", Math.round(elapsed / 1000) + " секунд"],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join(
        "",
      )}</dl><p>Қаралған тақырып: ${esc(GameLearning.lessons[state.lesson]?.[0])}. Қайталау қажет: ${errors.length} есеп. Бұл бүкіл тақырып меңгерілді деген қорытынды емес.</p><div class="shared-review">${state.qs
      .map((q) => {
        const row = model.records[q._sessionKey];
        return `<details><summary>${esc(q.question)} — ${row ? (row.correct ? "Дұрыс" : "Қате") : "Жауап берілмеді"}</summary><p>Жауабыңыз: ${esc(row?.value || "—")}. Әрекеттер: ${row?.attempts || 0}.${row?.assisted ? " Көмекпен." : ""}</p><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p></details>`;
      })
      .join(
        "",
      )}</div><button id="racingPracticeMistakes" type="button" class="game-primary" ${errors.length ? "" : "disabled"}>Қате және орындалмаған есептерді қарсылассыз қайталау</button><button id="racingOtherGame" type="button" class="presentation-back">Басқа ойын таңдау</button>`;
    box().append(panel);
    $("racingPracticeMistakes").onclick = () => practiceMistakes(errors);
    $("racingOtherGame").onclick = backToGames;
  }
  const oldGet = window.getGameQuestions,
    oldRender = window.renderCurrentQuestion;
  window.getGameQuestions = function (id, lesson) {
    const original = oldGet(id, lesson);
    return supports(id) ? source(id, lesson) : original;
  };
  window.renderCurrentQuestion = function () {
    return supports(currentGameMode) && state?.id === currentGameMode
      ? render()
      : oldRender();
  };
  S.adapters.racing = {
    setQuestions() {},
    tick,
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    restore(saved) {
      if (
        saved?.version !== 1 ||
        saved.id !== S.current().id ||
        !supports(saved.id) ||
        !Array.isArray(saved.qs) ||
        (saved.id === "car-race" ? !saved.car : !saved.match)
      )
        throw Error("Жарыстың сақталған күйі жарамсыз.");
      state = saved;
      state.motion = null;
      epoch++;
      S.current().questions = state.qs;
      currentQuestions = state.qs;
      if (state.car) {
        S.clock().pause();
        M.carTick(state.car, S.clock().time());
        currentScore = state.car.player;
        if (state.car.finished) {
          finish();
          return;
        }
      } else currentScore = state.match.scores.reduce((a, b) => a + b, 0);
      render();
    },
  };
  window.GameRacing = {
    supports,
    source,
    start,
    setup,
    configure,
    renderSummary,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    restoreSettings(model) {
      if (model.id === "math-race" && $("racingTeamSize"))
        $("racingTeamSize").value = String(model.settings.teamSize);
      if (model.id === "car-race" && $("racingOpponent")) {
        $("racingOpponent").value = model.settings.opponent || "medium";
        syncSetup();
      }
    },
    description(id) {
      return {
        "tug-of-war":
          "Екі команда арқанды өз жағына тартады. Әр жұп раундта тең күрделіліктегі есептер беріледі.",
        "math-race":
          "Жеке жолдармен бекеттерден өт. Қатысушылар кезектеседі, жеңіс тең жүрістерден кейін анықталады.",
        "car-race":
          "Ойыншы мен тұрақты жылдамдықтағы қарсылас бөлек жолақтарда жарысады. Қарсылассыз жаттығу да бар.",
      }[id];
    },
  };
})();
