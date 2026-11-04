/* Four distinct timed/score mechanics sharing GameSession's active clock and local persistence. */
(function () {
  "use strict";
  const S = GameSession,
    M = MathTimedModels,
    C = MathTimedContent,
    R = MathRacingModels;
  const ids = new Set(["quick-answer", "blitz", "wheel", "auction"]),
    $ = (id) => document.getElementById(id),
    esc = escapeGameHtml,
    box = () => $("gameQuestion"),
    names = ["Көк команда", "Қызыл команда"];
  let state = null,
    epoch = 0,
    revision = 0,
    pendingPractice = null;
  const supports = (id) => ids.has(id);
  function source(id, lesson) {
    const bank = window.gameQuestionBank[lesson];
    if (!bank) return [];
    const review = id === "blitz" && pendingPractice?.lesson === lesson;
    let qs = review
      ? pendingPractice.qs
      : C.pool(
          lesson,
          bank,
          id === "quick-answer"
            ? 100
            : id === "auction"
              ? 16
              : id === "wheel" && $("timedWheelMode")?.value === "teams"
                ? 8
                : 4,
        );
    return qs.map((q, i) => ({
      ...q,
      options: R.shuffle(R.choices(q)),
      _logicExplain: q._logicExplain || GameLearning.explain(lesson, q),
      _sessionKey: `timed:${id}:${lesson}:${review ? "review:" : ""}${i}`,
    }));
  }
  function syncSettings() {
    if (selectedGameId !== "blitz") return;
    const challenge = $("sharedMode").value === "challenge";
    if (challenge) $("sharedTime").value = "12";
    for (const o of $("sharedTime").options)
      o.disabled = challenge && o.value !== "12";
  }
  function setup(id) {
    if (!supports(id)) return;
    if (id === "quick-answer" || id === "blitz")
      $("sharedMode").value = "challenge";
    if (id === "blitz") {
      $("sharedMode").addEventListener("change", syncSettings);
      syncSettings();
      const note = document.createElement("p");
      note.className = "timed-note";
      note.textContent =
        "Жарыста әр қысқа есепке 12 секунд. Жаттығуда 12/20 секунд не уақытсыз режим таңдаңыз. Нәтижеде режим бөлек көрсетіледі.";
      $("sharedSetupInfo").append(note);
    }
    if (id === "auction") {
      $("sharedModeField").hidden = true;
      $("sharedFixedMode").hidden = false;
      $("sharedFixedMode").textContent =
        "Режим: екі команда, тек виртуалды оқу ұпайлары. Алдын ала шешім жабық.";
    }
    if (id === "wheel") {
      const field = document.createElement("div");
      field.className = "timed-setup";
      field.innerHTML =
        '<label for="timedWheelMode">Қатысу түрі</label><select id="timedWheelMode"><option value="solo">Жеке ойын — 4 айналым</option><option value="teams">Екі команда — әрқайсысына 4 айналым</option></select>';
      $("sharedSetupInfo").append(field);
    }
  }
  function configure(opts, id) {
    if (!supports(id)) return;
    if (id === "quick-answer")
      opts.seconds = [30, 60, 90].includes(opts.seconds) ? opts.seconds : 30;
    if (id === "blitz") {
      opts.review = pendingPractice?.lesson === getLessonKey();
      if (opts.review) {
        opts.mode = "practice";
        opts.seconds = 0;
      }
      if (opts.mode === "challenge") opts.seconds = 12;
    }
    if (id === "wheel") opts.teams = $("timedWheelMode")?.value === "teams";
    if (id === "auction") {
      opts.mode = "challenge";
      opts.seconds = 0;
    }
  }
  function start(id, lesson, qs) {
    epoch++;
    revision++;
    state = null;
    if (!supports(id)) return;
    const opts = S.current().settings;
    state = {
      version: 1,
      id,
      lesson,
      qs,
      game: M.create(
        id,
        id === "auction" ? qs.length / 2 : qs.length,
        opts,
        S.clock().time(),
      ),
      value: "",
      bidValue: "10",
      message: "",
      last: null,
      review: !!opts.review,
    };
    if (id === "blitz") pendingPractice = null;
  }
  function allowed() {
    return (
      !!state &&
      S.current()?.id === state.id &&
      S.canAnswer() &&
      !state.game.finished
    );
  }
  function action(selector, fn) {
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
  function input(selector, key, submit) {
    const e = epoch,
      r = revision,
      el = box().querySelector(selector);
    if (!el) return;
    el.oninput = () => {
      if (e === epoch && r === revision && allowed()) {
        state[key] = el.value;
        S.queueSave();
      }
    };
    el.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!event.repeat && e === epoch && r === revision && allowed())
          submit();
      }
    };
  }
  function question() {
    return state.qs[M.questionIndex(state.game)];
  }
  function recordNew() {
    for (const row of state.game.history)
      if (!S.current().records[state.qs[row.index]._sessionKey]) {
        S.record(row.index, row.correct, row.value, row.timeout);
        const rec = S.current().records[state.qs[row.index]._sessionKey];
        rec.responseMs = row.ms;
        rec.team = row.team;
        rec.gamePoints = row.points;
        rec.recovery = !!row.recovery;
      }
    currentScore =
      state.id === "auction"
        ? state.game.capital[0] + state.game.capital[1]
        : state.game.score;
    currentIndex = state.game.index;
  }
  function finish() {
    recordNew();
    state.value = "";
    render();
    S.finish();
  }
  function tick(now) {
    if (!allowed()) return;
    const changed = M.tick(state.game, now);
    if (changed) {
      recordNew();
      if (state.game.finished) finish();
      else render();
      S.queueSave();
    } else updateTime(now);
  }
  function answer(value) {
    if (!allowed()) return;
    tick(S.clock().time());
    if (!allowed()) return;
    const v = String(value).trim();
    if (!v) {
      state.message = "Жауабыңызды енгізіңіз.";
      const e = $("timedMessage");
      if (e) e.textContent = state.message;
      return;
    }
    const q = question(),
      row = M.answer(state.game, R.same(v, q.answer), v, S.clock().time());
    if (!row) return;
    state.last = {
      ...row,
      question: q.question,
      solution: GameLearning.explain(state.lesson, q).solution,
    };
    state.value = "";
    state.message = "";
    recordNew();
    if (state.game.finished) finish();
    else render();
    S.queueSave();
  }
  function next() {
    if (!allowed()) return;
    if (M.next(state.game, S.clock().time())) {
      state.value = "";
      state.message = "";
      state.bidValue = "10";
      state.last = null;
      recordNew();
      if (state.game.finished) finish();
      else render();
      S.queueSave();
    }
  }
  function visualRotation(g) {
    return matchMedia("(prefers-reduced-motion: reduce)").matches &&
      g.phase === "spinning"
      ? g.spinTarget
      : g.rotation;
  }
  function wheelScene() {
    const colors = ["#137d9b", "#6953ab", "#a46a12", "#9d3b63"];
    const g = state.game;
    const wedges = M.sectors
      .map((p, i) => {
        const a = (i * Math.PI) / 2,
          b = ((i + 1) * Math.PI) / 2,
          mid = (a + b) / 2,
          xy = (t) => [150 + 140 * Math.sin(t), 150 - 140 * Math.cos(t)];
        const [x1, y1] = xy(a),
          [x2, y2] = xy(b);
        return `<path d="M150 150 L${x1} ${y1} A140 140 0 0 1 ${x2} ${y2} Z" fill="${colors[i]}" stroke="#dbe6f5" stroke-width="2"/><text x="${150 + 91 * Math.sin(mid)}" y="${156 - 91 * Math.cos(mid)}" text-anchor="middle" fill="white" font-size="26" font-weight="800">${p}</text>`;
      })
      .join("");
    return `<section class="timed-wheel-scene"><div class="timed-pointer" aria-label="Сектор көрсеткіші">▼</div><svg viewBox="0 0 300 300" class="timed-wheel-disc" role="img" aria-label="10, 20, 30, 40 ұпай секторлары"><g id="timedWheelRotor" style="transform:rotate(${visualRotation(g)}deg);transform-origin:150px 150px">${wedges}</g><circle cx="150" cy="150" r="21" fill="#10243b" stroke="#c4e0ff" stroke-width="3"/></svg><p id="timedSector" role="status">${g.phase === "spinning" ? "Дөңгелек айналып жатыр…" : g.sector === null ? "Бір рет айналдырып, секторды таңдаңыз." : `Таңдалған сектор: ${M.sectors[g.sector]} ұпай`}</p>${g.phase === "ready" ? '<button id="spinTeamWheel" type="button" class="game-primary">Дөңгелекті айналдыру</button>' : g.phase === "spinning" ? '<button type="button" class="game-primary" disabled>Айналып жатыр…</button>' : ""}</section>`;
  }
  function timeView() {
    const g = state.game;
    if (!["quick-answer", "blitz"].includes(state.id)) return "";
    return `<section class="timed-clock-panel"><span>${state.id === "quick-answer" ? "Жалпы қалған уақыт" : "Осы есептің уақыты"}</span><strong id="${state.id === "quick-answer" ? "quickTimer" : "scene-seconds"}"></strong><div class="timed-bar" role="progressbar" aria-label="Қалған уақыт" aria-valuemin="0" aria-valuemax="100"><i id="timedBarFill"></i></div></section>`;
  }
  function scoreboard() {
    const g = state.game;
    if (state.id === "auction")
      return `<div class="timed-capitals">${names.map((n, i) => `<section class="capital-${i} ${!g.finished && M.turn(g) === i ? "timed-active" : ""}"><strong>${n}</strong><span>${g.capital[i]} ұпай</span></section>`).join("")}</div><p>${g.finished ? "Қорытынды капиталдар." : "Кезек: " + names[M.turn(g)] + "."} Тек виртуалды оқу ұпайлары.</p>`;
    if (state.id === "wheel")
      return g.teams
        ? `<div class="timed-capitals">${names.map((n, i) => `<section class="capital-${i}"><strong>${n}</strong><span>${g.scores[i]} ұпай</span></section>`).join("")}</div><p>${g.finished ? "Командалардың қорытындысы." : "Кезек: " + names[M.turn(g)] + "."} Әр командаға 4 айналым.</p>`
        : `<p class="timed-score">Жиналған ұпай: ${g.score}</p>`;
    return `<div class="timed-score-row"><span>Ұпай <strong>${g.score}</strong></span>${state.id === "quick-answer" ? `<span>Серия <strong>${g.streak}</strong></span><span>Үздік серия <strong>${g.bestStreak}</strong></span>` : ""}</div>`;
  }
  function answersView(q) {
    if (state.id === "quick-answer")
      return `<label for="quickAnswerInput">Жауабыңыз</label><input id="quickAnswerInput" autocomplete="off" inputmode="text" value="${esc(state.value)}"><button id="quickAnswerButton" type="button" class="game-primary">Жауап беру · Enter</button>`;
    return `<div class="timed-choices">${q.options.map((v, i) => `<button type="button" data-timed-answer="${i}" ${state.game.phase === "bid" ? "disabled" : ""}>${esc(v)}</button>`).join("")}</div>`;
  }
  function bidView() {
    const g = state.game;
    if (g.recovery)
      return '<p class="timed-recovery">Капитал таусылды. Бұл бөлек қалпына келтіру есебі: ставка жоқ, дұрыс жауапқа +20 виртуалды ұпай, қате жауапта 0. Бір рет жауап беріңіз.</p>';
    if (g.phase !== "bid")
      return `<p class="timed-locked-bid">Бекітілген ставка: ${g.bid ?? state.last?.bid ?? 0} ұпай. Оны өзгертуге болмайды.</p>`;
    return `<section class="timed-bid-panel"><label for="timedBid">Ставка: 1–${Math.min(50, g.capital[M.turn(g)])} бүтін ұпай</label><input id="timedBid" inputmode="numeric" autocomplete="off" value="${esc(state.bidValue)}"><div class="timed-bid-shortcuts">${[10, 20, 30, 50].map((n) => `<button type="button" data-timed-bid="${n}" ${n > g.capital[M.turn(g)] ? "disabled" : ""}>${n}</button>`).join("")}</div><button id="timedConfirmBid" type="button" class="game-primary">Ставканы бекіту</button><p>Есепті оқып, ставканы бекіткеннен кейін ғана жауап беріңіз.</p></section>`;
  }
  function journal() {
    if (state.id !== "auction") return "";
    return `<section class="timed-journal"><h3>Раунд журналы</h3>${state.game.history.length ? state.game.history.map((r) => `<p>${names[r.team]} · ${r.index >= state.game.count ? "Қалпына келтіру" : "Лот " + (r.index + 1)}: ${r.before} → ставка ${r.bid}; ${r.correct ? "дұрыс" : "қате"} (${r.points >= 0 ? "+" : ""}${r.points}) → ${r.after} ұпай.</p>`).join("") : "<p>Әзірге бекітілген нәтиже жоқ.</p>"}</section>`;
  }
  function terminalAction(fn) {
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
  function render() {
    if (!state) return;
    revision++;
    const g = state.game,
      q = question(),
      title = mathGames.find((x) => x.id === state.id).title;
    $("gameProgress").textContent = g.finished
      ? "Нәтиже"
      : `${g.index + 1} / ${g.count}`;
    if (g.finished) {
      let result = g.reason;
      if (state.id === "auction" || (state.id === "wheel" && g.teams)) {
        const scores = state.id === "auction" ? g.capital : g.scores;
        result =
          scores[0] === scores[1]
            ? "Тең нәтиже"
            : names[scores[0] > scores[1] ? 0 : 1] + " жеңді!";
      }
      box().innerHTML = `<article class="timed-game timed-${state.id}"><header><h2>${esc(title)}</h2>${scoreboard()}</header>${state.id === "wheel" ? wheelScene() : ""}<section class="timed-finish"><h2 class="${state.id === "quick-answer" ? "quick-result-label" : ""}">${esc(result)}</h2><p>${esc(g.reason)}</p><button id="timedReplay" type="button" class="game-primary">Қайта ойнау</button></section>${journal()}</article>`;
      $("timedReplay").onclick = terminalAction(startSelectedGame);
      return;
    }
    const feedback = g.phase === "feedback",
      hiddenQuestion =
        state.id === "wheel" && ["ready", "spinning"].includes(g.phase);
    const row = g.history.at(-1);
    box().innerHTML = `<article class="timed-game timed-${state.id}"><header><h2>${esc(title)}</h2><p>${state.review ? "Қате есептерді уақытсыз қайта орындау" : S.current().settings.mode === "practice" ? "Жаттығу нәтижесі" : "Жарыс нәтижесі"}</p>${scoreboard()}</header>${timeView()}${state.id === "wheel" ? wheelScene() : ""}${hiddenQuestion ? "" : `<section class="timed-task"><h3>${g.recovery ? "Қалпына келтіру есебі" : `Тапсырма ${g.index + 1}`}</h3><p class="timed-prompt">${esc(q.question)}</p>${state.id === "auction" ? bidView() : ""}${feedback ? `<div class="timed-feedback" role="status"><h3>${row.timeout ? "Уақыт аяқталды" : row.correct ? "✓ Дұрыс жауап" : "✕ Қате жауап"}</h3><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p><p>Осы әрекеттің ұпайы: ${row.points >= 0 ? "+" : ""}${row.points}.</p><button id="timedContinue" type="button" class="game-primary">${g.needsRecovery ? "Қалпына келтіру есебіне өту" : "Жалғастыру"}</button></div>` : answersView(q)}<p id="timedMessage" role="status">${esc(state.message)}</p>${state.id === "quick-answer" && state.last ? `<div class="timed-last" role="status">${state.last.correct ? "✓ Дұрыс" : "✕ Қате"} · ${esc(state.last.question)}<br>${esc(state.last.solution)}</div>` : ""}</section>`}${journal()}</article>`;
    if (hiddenQuestion) {
      $("sharedHelpButtons").hidden = true;
      $("sharedHelpText").hidden = true;
      $("sharedHelpText").textContent = "";
    } else S.present(M.questionIndex(g));
    action("#quickAnswerButton", () => answer(state.value));
    input("#quickAnswerInput", "value", () => answer(state.value));
    action("[data-timed-answer]", (el) =>
      answer(q.options[Number(el.dataset.timedAnswer)]),
    );
    action("#timedContinue", next);
    action("#spinTeamWheel", () => {
      if (M.spin(g, Math.random(), S.clock().time())) {
        render();
        S.queueSave();
      }
    });
    const confirm = () => {
      if (!M.bid(g, state.bidValue)) {
        state.message =
          "Ставка 1 мен рұқсат етілген шектің арасындағы бүтін сан болуы керек.";
        $("timedMessage").textContent = state.message;
        return;
      }
      state.message = "";
      render();
      S.queueSave();
    };
    action("#timedConfirmBid", confirm);
    input("#timedBid", "bidValue", confirm);
    action("[data-timed-bid]", (el) => {
      state.bidValue = el.dataset.timedBid;
      $("timedBid").value = state.bidValue;
      S.queueSave();
    });
    updateTime(S.clock().time());
    if (state.id === "quick-answer")
      $("quickAnswerInput")?.focus({ preventScroll: true });
    S.queueSave();
  }
  function updateTime(now) {
    if (!state) return;
    const g = state.game;
    if (state.id === "wheel") {
      const rotor = $("timedWheelRotor");
      if (rotor) rotor.style.transform = `rotate(${visualRotation(g)}deg)`;
      return;
    }
    const el = $(state.id === "quick-answer" ? "quickTimer" : "scene-seconds");
    if (!el) return;
    const left = g.deadline === null ? 0 : Math.max(0, g.deadline - now);
    el.textContent =
      g.seconds === 0
        ? "Уақытсыз жаттығу"
        : g.phase === "feedback"
          ? "Тоқтады"
          : String(Math.ceil(left / 1000));
    el.closest(".timed-clock-panel").classList.toggle(
      "timed-danger",
      g.seconds > 0 && left <= 3000 && g.phase === "task",
    );
    const bar = $("timedBarFill"),
      pct = g.seconds ? Math.min(100, left / (g.seconds * 10)) : 100;
    if (bar) {
      bar.style.width = pct + "%";
      bar.parentElement.setAttribute("aria-valuenow", String(Math.round(pct)));
    }
  }
  function renderSummary(elapsed) {
    const g = state.game,
      stats = M.stats(g),
      model = S.current(),
      errors = g.history.filter((r) => !r.correct),
      records = Object.values(model.records),
      independent = records.filter((r) => r.firstCorrect && !r.assisted).length;
    const panel = document.createElement("section");
    panel.id = "sharedSummary";
    panel.className = "shared-summary";
    panel.innerHTML = `<h2>Оқу нәтижесі</h2><p>${model.settings.mode === "practice" ? "Жаттығу" : "Жарыс"}${g.seconds === 0 && state.id === "blitz" ? " · уақытсыз" : ""}. Нәтиже тек осы браузерде; серверде сақталған баға емес.</p><dl class="shared-metrics">${[
      ["Дұрыс жауап", stats.correct],
      ["Қате жауап", stats.wrong],
      ["Уақыт аяқталған есеп", stats.timeouts],
      ["Жауаптардың дәлдігі", stats.accuracy + "%"],
      [
        "Орташа жауап беру уақыты",
        (stats.averageMs / 1000).toFixed(2).replace(".", ",") + " секунд",
      ],
      ["Бірінші әрекетте, көмексіз", independent],
      ["Көмек қолданылған", records.filter((r) => r.assisted).length],
      [
        "Белсенді уақыт",
        (elapsed / 1000).toFixed(1).replace(".", ",") + " секунд",
      ],
      ...(state.id === "quick-answer" ? [["Үздік серия", g.bestStreak]] : []),
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
      .join(
        "",
      )}</dl><p>Дәлдік = дұрыс жауап / жіберілген жауап. Уақыты біткен есептер бөлек көрсетіледі. Орташа уақыт жіберілген жауаптардың белсенді уақытымен есептеледі.</p><p>Қаралған дағды: ${esc(GameLearning.lessons[state.lesson]?.[0])} (${independent} есеп көмексіз). Қайталау қажет: ${errors.length} есеп. Бұл бүкіл тақырып меңгерілді деген қорытынды емес.</p><div class="shared-review">${g.history
      .map((r) => {
        const q = state.qs[r.index],
          rec = model.records[q._sessionKey];
        return `<details><summary>${esc(q.question)} — ${r.timeout ? "Уақыт аяқталды" : r.correct ? "Дұрыс" : "Қате"}${rec?.assisted ? " · көмекпен" : ""}</summary><p>Жауабыңыз: ${esc(r.value || "—")}. Уақыт: ${(r.ms / 1000).toFixed(2)} секунд.</p><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p></details>`;
      })
      .join(
        "",
      )}</div><button id="timedRetryMistakes" type="button" class="game-primary" ${errors.length ? "" : "disabled"}>Қате есептерді уақытсыз қайталау</button><button id="timedOtherGame" type="button" class="presentation-back">Басқа ойын таңдау</button>`;
    box().append(panel);
    $("timedOtherGame").onclick = terminalAction(backToGames);
    $("timedRetryMistakes").onclick = terminalAction(() => {
      const lesson = state.lesson;
      pendingPractice = {
        lesson,
        qs: errors.map((r) => ({ ...state.qs[r.index] })),
      };
      selectGame("blitz");
      const [grade, subject, quarter, ...n] = lesson.split("-");
      $("gradeSelect").value = grade;
      $("gradeSelect").dispatchEvent(new Event("change"));
      $("subjectSelect").value = subject;
      $("quarterSelect").value = quarter;
      $("quarterSelect").dispatchEvent(new Event("change"));
      $("lessonSelect").value = n.join("-");
      $("sharedMode").value = "practice";
      syncSettings();
      $("sharedTime").value = "0";
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
  S.adapters.timed = {
    tick,
    setQuestions() {},
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
      epoch++;
      revision++;
      S.clock().pause();
      currentQuestions = state.qs;
      S.current().questions = state.qs;
      recordNew();
      render();
      if (state.game.finished) S.finish();
    },
  };
  window.GameTimed = {
    supports,
    source,
    setup,
    configure,
    start,
    renderSummary,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    syncSettings,
    restoreSettings(model) {
      if (!supports(model.id)) return;
      if (model.id === "blitz") {
        syncSettings();
        $("sharedTime").value = String(model.settings.seconds);
      }
      if (model.id === "wheel" && $("timedWheelMode"))
        $("timedWheelMode").value = model.settings.teams ? "teams" : "solo";
    },
    description(id) {
      return {
        "quick-answer":
          "Жалпы 30, 60 не 90 секундта қайталанбайтын қысқа есептерді шығар. Серия жинап, шектеулі бонус ал.",
        blitz:
          "Әр қысқа есепке жеке 12 секунд. Жаттығуда уақытты өзгертуге немесе өшіруге болады.",
        wheel:
          "Нақты секторға тоқтайтын дөңгелекті айналдыр. Дұрыс жауапқа ғана сектор ұпайын ал.",
        auction:
          "Екі команда виртуалды капиталға ставка тігеді. Ставканы бекіт, есепті шеш және капитал журналын бақыла.",
      }[id];
    },
  };
})();
