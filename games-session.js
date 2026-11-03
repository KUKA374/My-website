/* Shared UI/session coordinator. Mechanics remain in the three game adapters. */
(function () {
  "use strict";
  const { GameClock, LearningSession } = MathGameRuntime;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const KEY = "math-ai-game-progress-v1";
  let model = null,
    clock = new GameClock(),
    active = null,
    paused = false,
    timers = {},
    retry = null,
    storageError = "",
    restoring = false,
    saveQueued = false;
  const adapters = {};
  const byId = (id) => document.getElementById(id);
  function adapter() {
    return adapters[active] || adapters.core;
  }
  function settings() {
    return {
      mode: byId("sharedMode")?.value || "practice",
      seconds: Number(byId("sharedTime")?.value || 0),
    };
  }
  function safeSaved() {
    try {
      const text = localStorage.getItem(KEY);
      if (!text) return null;
      if (text.length > 2000000) throw Error();
      const data = JSON.parse(text);
      if (
        data.version !== 1 ||
        !GameLearning.rules[data.model?.id] ||
        !/^([567])-(math|algebra)-[1-4]-\d+$/.test(data.model.lesson) ||
        !Array.isArray(data.model.questions) ||
        data.model.questions.length > 1000 ||
        !data.engine ||
        data.bank !== JSON.stringify(window.gameQuestionBank[data.model.lesson])
      )
        throw Error();
      if (
        (window.GameMechanics?.supports(data.model.id) &&
          data.active !== "mechanics") ||
        (window.GameLogic?.supports(data.model.id) &&
          (data.active !== "logic" || data.engine.version !== 1)) ||
        (window.GameRacing?.supports(data.model.id) &&
          (data.active !== "racing" || data.engine.version !== 1))
      ) {
        storageError =
          "Бұл ойынның механикасы жаңартылды. Бұрынғы сессияны жаңа механикада жалғастыру мүмкін емес; жаңа ойын бастаңыз.";
        return null;
      }
      return data;
    } catch {
      storageError = "Сақталған прогресс оқылмады. Жаңа ойын бастауға болады.";
      return null;
    }
  }
  function save() {
    if (!model || model.finished || restoring) return;
    try {
      const a = adapter();
      a.tick?.(clock.time());
      if (!model || model.finished) return;
      const engine = a.snapshot();
      localStorage.setItem(
        KEY,
        JSON.stringify({
          version: 1,
          bank: JSON.stringify(window.gameQuestionBank[model.lesson]),
          model,
          active,
          engine,
          elapsed: clock.time(),
          timers: Object.fromEntries(
            Object.entries(timers).map(([k, t]) => [
              k,
              Math.max(0, t.end - clock.time()),
            ]),
          ),
        }),
      );
      storageError = "";
    } catch {
      storageError =
        "Бұл браузерде прогресті сақтау мүмкін болмады. Ойын жалғаса береді.";
    }
    status();
  }
  function queueSave() {
    if (saveQueued) return;
    saveQueued = true;
    queueMicrotask(() => {
      saveQueued = false;
      save();
    });
  }
  function status() {
    const e = byId("localSaveStatus");
    if (e)
      e.textContent =
        storageError ||
        "Соңғы аяқталмаған ойын тек осы браузерде сақталады. Серверге жіберілмейді.";
  }
  function banner() {
    const e = byId("resumeGameBanner");
    if (!e) return;
    const saved = safeSaved();
    e.hidden = !saved && !storageError;
    e.replaceChildren();
    if (saved) {
      const text = document.createElement("p");
      text.textContent =
        "Осы браузерде аяқталмаған ойын бар: " +
        (GameLearning.rules[saved.model.id]?.[0] || "Ойын");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-primary";
      b.textContent = "Сақталған ойынды жалғастыру";
      b.onclick = resumeSaved;
      e.append(text, b);
    } else e.textContent = storageError;
  }
  function stop(saveFirst = true) {
    if (model && !model.finished && saveFirst) save();
    clock.clear();
    timers = {};
    model = null;
    active = null;
    paused = false;
    showPaused();
  }
  function begin(id, lesson, questions) {
    stop(false);
    GameSession.restoreTimers = {};
    const opts = settings();
    if (!["quick-answer", "blitz"].includes(id)) opts.seconds = 0;
    if (["math-race", "tug-of-war"].includes(id)) opts.mode = "challenge";
    if (id === "cards") opts.mode = "practice";
    if (id === "match")
      opts.format = byId("logicMatchFormat")?.value || "answers";
    window.GameRacing?.configure(opts, id);
    model = new LearningSession(id, lesson, questions, opts);
    clock = new GameClock();
    lastSaved = 0;
    clock.resume();
    active = window.GameRacing?.supports(id)
      ? "racing"
      : window.GameLogic?.supports(id)
        ? "logic"
        : window.GameMechanics?.supports(id)
          ? "mechanics"
          : ["math-race", "wheel", "tug-of-war"].includes(id)
            ? "teams"
            : GameLearning.rules[id] &&
                ![
                  "match",
                  "find-error",
                  "quick-answer",
                  "math-code",
                  "detective",
                ].includes(id)
              ? "extra"
              : "core";
    for (const a of Object.values(adapters)) a.setQuestions?.(questions);
    paused = false;
    byId("sharedSummary")?.remove();
    showPaused();
    byId("sharedToolbar").hidden = false;
    status();
    queueSave();
  }
  function prepare(qs, id, lesson) {
    const bank = window.gameQuestionBank[lesson],
      aliases = {
        "find-error": "findError",
        "quick-answer": "quickAnswer",
        "math-code": "mathCode",
      },
      base = bank?.[aliases[id] || id] || bank?.quickAnswer || [];
    const prompt = (q) =>
      String(q.question || q.left || q.clue || q.statement || "");
    const picked = qs.map((q, i) => {
      const sourceIndex = base.findIndex((x) => prompt(x) === prompt(q));
      return {
        ...q,
        ...(q.options ? { options: [...q.options] } : {}),
        _sessionKey:
          q._sessionKey ||
          `${id}:${lesson}:${sourceIndex < 0 ? i : sourceIndex}`,
      };
    });
    if (retry && retry.id === id && retry.lesson === lesson) {
      const keys = new Set(retry.keys);
      retry = null;
      return picked.filter((q) => keys.has(q._sessionKey));
    }
    return picked;
  }
  function present(index, helpAvailable = true) {
    if (!model || model.finished) return;
    model.index = index;
    byId("sharedHelpText").textContent = "";
    byId("sharedHelpText").hidden = true;
    byId("sharedHelpButtons").hidden = model.id === "cards" && !helpAvailable;
    byId("sharedSolutionButton").hidden = model.id === "cards";
    renderFeedback(index);
    queueSave();
  }
  function key(index) {
    return model?.questions[index]?._sessionKey;
  }
  function record(index, correct, value, timeout = false) {
    if (!model || model.finished || paused) return;
    const k = key(index);
    if (!k) return;
    model.record(k, correct, value, timeout);
    queueSave();
    renderFeedback(index);
  }
  function currentIndex() {
    if (model?.id === "match" && !window.GameLogic?.supports(model.id))
      return matchState.selected ?? model.index;
    return model?.index || 0;
  }
  function help(full) {
    if (!model || model.finished || paused || (full && model.id === "cards"))
      return;
    const i = currentIndex(),
      q = model.questions[i];
    if (!q) return;
    const row = model.records[q._sessionKey];
    if (
      !row ||
      (["match", "detective", "secret-number"].includes(model.id) &&
        !row.correct)
    ) {
      if (model.settings.mode === "challenge" && !row) return;
      model.assist(q._sessionKey);
      if (row) row.assisted = true;
    }
    const info = GameLearning.explain(model.lesson, q);
    const p = byId("sharedHelpText");
    p.hidden = false;
    p.textContent =
      (full ? "Шешімі: " : "Ишара: ") + (full ? info.solution : info.hint);
    queueSave();
  }
  function renderFeedback(index) {
    const q = model?.questions[index];
    if (!q) return;
    const row = model.records[q._sessionKey];
    const locked = model.settings.mode === "challenge" && !row;
    byId("sharedHintButton").disabled = locked;
    byId("sharedSolutionButton").disabled = locked;
    if (!row) return;
    const p = byId("sharedHelpText");
    p.hidden = false;
    const info = GameLearning.explain(model.lesson, q);
    p.textContent =
      (row.timeout
        ? "Уақыт аяқталды. "
        : row.correct
          ? "✓ Жауап қабылданды. "
          : "✕ Бұл жауап шартты қанағаттандырмайды. ") +
      info.hint +
      " Толық шешімін төмендегі батырмамен қарауға болады.";
  }
  function showPaused() {
    const shield = byId("sharedPauseOverlay");
    if (shield) shield.hidden = !paused;
    const area = byId("gameQuestion");
    if (area) {
      area.inert = paused;
      area.setAttribute("aria-hidden", String(paused));
    }
    const b = byId("pauseGameButton");
    if (b) b.textContent = paused ? "Жалғастыру" : "Үзіліс";
    document.body.classList.toggle("game-paused", paused);
  }
  function pause() {
    if (!model || model.finished) return;
    adapter().tick?.(clock.time());
    if (!model || model.finished) return;
    paused = true;
    clock.pause();
    showPaused();
    save();
    byId("resumePausedButton").focus();
  }
  function resume() {
    if (!model || model.finished) return;
    paused = false;
    clock.resume();
    showPaused();
    byId("pauseGameButton").focus();
  }
  function timer(name, seconds, tick, expire) {
    if (!model || model.finished) return;
    if (!seconds) {
      tick(0);
      return;
    }
    if (timers[name]) {
      timers[name].tick = tick;
      timers[name].expire = expire;
      tick(Math.max(0, timers[name].end - clock.time()) / 1000);
      return;
    }
    const restored = GameSession.restoreTimers?.[name];
    if (restored !== undefined) delete GameSession.restoreTimers[name];
    timers[name] = {
      end: clock.time() + (restored ?? seconds * 1000),
      tick,
      expire,
    };
    tick((restored ?? seconds * 1000) / 1000);
  }
  function cancelTimer(name) {
    delete timers[name];
  }
  function expired(name) {
    return !!timers[name] && clock.time() >= timers[name].end;
  }
  function expireNow(name) {
    const t = timers[name];
    if (!t) return;
    delete timers[name];
    t.tick(0);
    t.expire();
  }
  function finish() {
    if (!model || model.finished) return;
    model.finished = true;
    clock.clear();
    timers = {};
    paused = false;
    showPaused();
    try {
      localStorage.removeItem(KEY);
    } catch {}
    byId("sharedToolbar").hidden = true;
    renderSummary();
  }
  function renderSummary() {
    if (window.GameRacing?.supports(model.id)) {
      window.GameRacing.renderSummary(clock.time());
      return;
    }
    if (model.id === "cards" && window.GameMechanics) {
      window.GameMechanics.renderCardSummary(clock.time());
      return;
    }
    const s = model.summary(),
      topic = GameLearning.lessons[model.lesson]?.[0] || "Таңдалған тақырып";
    byId("sharedSummary")?.remove();
    const panel = document.createElement("section");
    panel.id = "sharedSummary";
    panel.className = "shared-summary";
    const missed = model.questions.filter((q) => {
      const r = model.records[q._sessionKey];
      return !r || !r.firstCorrect || r.assisted;
    });
    panel.innerHTML = `<h2>Оқу нәтижесі</h2><p>Бұл — осы сессияның жергілікті нәтижесі. Серверде сақталған баға емес.</p><dl class="shared-metrics">${[
      ["Тапсырма", s.total],
      ["Дұрыс жауап", s.correct],
      ["Қате жауап", s.wrong],
      [
        "Алғашқы әрекеттегі қателер",
        Object.values(model.records).filter(
          (r) => !r.firstCorrect && !r.timeout,
        ).length,
      ],
      ["Уақытсыз қалған", s.timeout],
      ["Жауап берілмеген", s.unanswered],
      ["Бірінші әрекетте, көмексіз", s.independent],
      [
        "Көмекпен дұрыс орындалған",
        Object.values(model.records).filter((r) => r.assisted && r.correct)
          .length,
      ],
      ["Көмек қолданылған барлығы", s.assisted],
      ["Көмексіз алғашқы дәлдік", s.accuracy + "%"],
      [
        "Жалпы дұрыс жауап үлесі",
        Math.round((s.correct / (s.total || 1)) * 100) + "%",
      ],
      ["Белсенді уақыт", Math.round(clock.time() / 1000) + " секунд"],
    ]
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
      .join(
        "",
      )}</dl><p><strong>Осы сессияда өздігінен орындалған дағды:</strong> ${s.independent ? esc(topic) + ` (${s.independent} тапсырма)` : "Әзірге тіркелмеді."}</p><p><strong>Қайталау қажет:</strong> ${missed.length ? esc(topic) + ` — ${missed.length} тапсырманы қайта қара.` : "Осы сессиядағы тапсырмалар көмексіз орындалды."} Бұл толық тақырып меңгерілді деген қорытынды емес.</p><h3>Жауаптар мен шешімдер</h3><div class="shared-review">${model.questions
      .map((q, i) => {
        const row = model.records[q._sessionKey];
        return `<details><summary>${i + 1}. ${esc(q.question || q.left || q.statement || q.clue)} — ${row ? (row.timeout ? "Уақыт аяқталды" : row.correct ? "Дұрыс" : "Қате") : "Жауап берілмеді"}${row?.assisted ? " · көмекпен" : ""}</summary><p>Сіздің жауабыңыз: ${esc(row?.value || "—")}</p><p>Бірінші әрекет: ${row?.firstCorrect ? "дұрыс" : "дұрыс емес немесе жауапсыз"}; әрекет саны: ${row?.attempts || 0}.</p><p>${esc(GameLearning.explain(model.lesson, q).solution)}</p></details>`;
      })
      .join(
        "",
      )}</div><div class="shared-actions"><button id="retryMistakesButton" class="game-primary" type="button">Қате есептерді қайта орындау</button><button id="chooseAnotherGame" class="presentation-back" type="button">Басқа ойын таңдау</button></div>`;
    byId("gameQuestion").append(panel);
    window.GameLogic?.appendSummary(panel);
    const retryButton = byId("retryMistakesButton");
    const errors = model.questions.filter((q) => {
      const r = model.records[q._sessionKey];
      return !r || !r.firstCorrect;
    });
    retryButton.disabled = !errors.length;
    retryButton.onclick = () => {
      retry = {
        id: model.id,
        lesson: model.lesson,
        keys: errors.map((q) => q._sessionKey),
      };
      startSelectedGame();
    };
    byId("chooseAnotherGame").onclick = backToGames;
  }
  function resumeSaved() {
    const saved = safeSaved();
    if (!saved) {
      banner();
      return;
    }
    restoring = true;
    try {
      stop(false);
      selectGame(saved.model.id);
      const [grade, subject, quarter, ...lesson] =
        saved.model.lesson.split("-");
      byId("gradeSelect").value = grade;
      byId("gradeSelect").dispatchEvent(new Event("change"));
      byId("subjectSelect").value = subject;
      byId("quarterSelect").value = quarter;
      byId("quarterSelect").dispatchEvent(new Event("change"));
      byId("lessonSelect").value = lesson.join("-");
      byId("sharedMode").value = saved.model.settings.mode;
      byId("sharedTime").value = String(saved.model.settings.seconds);
      window.GameLogic?.restoreSettings(saved.model);
      window.GameRacing?.restoreSettings(saved.model);
      startSelectedGame();
      if (!model) throw Error();
      model = Object.assign(new LearningSession(), saved.model);
      active = saved.active;
      clock.clear();
      clock = new GameClock();
      clock.elapsed = Number(saved.elapsed) || 0;
      timers = {};
      GameSession.restoreTimers = saved.timers || {};
      clock.resume();
      byId("sharedSummary")?.remove();
      adapter().restore(saved.engine);
      if (!model.finished) {
        paused = true;
        clock.pause();
      }
      showPaused();
      status();
    } catch {
      stop(false);
      try {
        localStorage.removeItem(KEY);
      } catch {}
      backToGames();
      storageError =
        "Бұл прогресті жалғастыру мүмкін болмады. Жаңа ойын бастауға болады.";
      banner();
    } finally {
      restoring = false;
    }
  }
  function setup(id) {
    const e = byId("sharedSetupInfo");
    if (!e) return;
    const r = GameLearning.rules[id];
    const scoreRule =
      id === "find-error"
        ? "Ойын ұпайы: қатені табуға 1, дұрыс түзетуге 1 ұпай. Таңдау әр бөлімде бір рет бекітіледі."
        : id === "cards"
          ? "Өзіндік бағалау автоматты тексерілген ұпайға айналмайды."
          : ["auction", "wheel", "quick-answer"].includes(id)
            ? ""
            : [
                  "match",
                  "find-error",
                  "math-code",
                  "detective",
                  "math-race",
                  "tug-of-war",
                  "car-race",
                ].includes(id)
              ? "Ойын ұпайы: әр дұрыс жауапқа 1 ұпай."
              : "Ойын ұпайы: әр дұрыс жауапқа 10 ұпай.";
    e.innerHTML = `<p>Жаңа ойын басталса, бұрынғы сақталған сессияның орнына осы ойын сақталады.</p><h3>Ойынның мақсаты</h3><p>${esc(r[0])}</p><h3>Қалай ойнаймыз?</h3><p>${esc(r[1])}</p><h3>Жеңіс және ұпай шарты</h3><p>${esc(r[2])} ${esc(scoreRule)}</p><p>${id === "cards" ? "Өзіндік белгілер бөлек қорытындыланады. Автоматты дұрыс/қате жауап және дәлдік пайызы есептелмейді." : "Оқу нәтижесі ойын ұпайынан бөлек есептеледі. Әр дұрыс жауапқа, арнайы ереже көрсетілмесе, 1 дұрыс тапсырма тіркеледі."}</p>`;
    const team = ["math-race", "tug-of-war", "cards"].includes(id);
    byId("sharedModeField").hidden = team;
    byId("sharedFixedMode").hidden = !team;
    byId("sharedFixedMode").textContent =
      id === "cards"
        ? "Режим: өзіндік жаттығу. Шешімді карточканың арнайы батырмасымен ашыңыз."
        : "Режим: екі команда, бір құрылғыда кезекпен. Шешімді жауаптан кейін көруге болады.";
    byId("sharedMode").value = "practice";
    const timed = ["quick-answer", "blitz"].includes(id);
    byId("sharedTimeField").hidden = !timed;
    byId("sharedTime").innerHTML = (
      id === "quick-answer"
        ? [
            [30, "30 секунд"],
            [60, "60 секунд"],
            [90, "90 секунд"],
          ]
        : [
            [12, "Әр есепке 12 секунд"],
            [20, "Әр есепке 20 секунд"],
            [0, "Уақытсыз жаттығу"],
          ]
    )
      .map(([v, t]) => `<option value="${v}">${t}</option>`)
      .join("");
    window.GameLogic?.setup(id);
    window.GameRacing?.setup(id);
    updateCount();
  }
  function updateCount() {
    if (!byId("sharedQuestionCount") || !selectedGameId) return;
    window.GameLogic?.syncFormat();
    const bank = window.gameQuestionBank?.[getLessonKey()],
      aliases = {
        "quick-answer": "quickAnswer",
        "math-code": "mathCode",
        "find-error": "findError",
      };
    const qs =
      (window.GameLogic?.supports(selectedGameId)
        ? window.GameLogic.source(
            selectedGameId,
            getLessonKey(),
            byId("logicMatchFormat")?.value || "answers",
          )
        : window.GameMechanics?.supports(selectedGameId)
          ? bank?.quickAnswer
          : bank?.[aliases[selectedGameId] || selectedGameId]) ||
      bank?.quickAnswer ||
      [];
    if (window.GameRacing?.supports(selectedGameId)) {
      byId("sharedQuestionCount").textContent =
        selectedGameId === "car-race"
          ? `Қордағы тапсырма саны: ${window.gameQuestionBank[getLessonKey()]?.quickAnswer?.length || 0}. Мақсат — әр есепті дұрыс шешіп, мәреге жету.`
          : `Негізгі кезең: 4 жұп раунд, әр командаға 4 есеп. Қажет болса, 3 қосымша жұп раундқа дейін. Қиындық бір үлгідегі есептермен теңестірілген.`;
      return;
    }
    byId("sharedQuestionCount").textContent = window.GameLogic?.supports(
      selectedGameId,
    )
      ? `Осы ойындағы ${selectedGameId === "match" ? "жұп" : "тапсырма"} саны: ${qs.length}. Мазмұн таңдалған сынып пен тақырыпқа сай.${selectedGameId === "match" ? " Бірдей жауаптары бар есептер бір карточкаға біріктіріледі." : ""}`
      : `Қордағы тапсырма саны: ${qs.length}. Деңгей: таңдалған тақырыптың қолданыстағы есептері.${qs.length < 10 ? " Қор шағын; есептер біткенде ойын аяқталады." : ""}`;
  }
  window.GameSession = {
    adapters,
    prepare,
    begin,
    present,
    record,
    finish,
    setup,
    stop,
    pause,
    resume,
    timer,
    cancelTimer,
    expired,
    expireNow,
    save,
    queueSave,
    banner,
    restoreTimers: {},
    defer: (fn, ms) => clock.after(ms, fn),
    clearDelay: (id) => clock.cancel(id),
    canAnswer: () => !!model && !model.finished && !paused,
    current: () => model,
    clock: () => clock,
    help,
  };
  setInterval(() => {
    if (!model || paused || model.finished) return;
    clock.tick();
    if (!model || model.finished) return;
    adapter().tick?.(clock.time());
    if (!model || model.finished) return;
    for (const [name, t] of Object.entries(timers)) {
      if (timers[name] !== t) continue;
      const left = Math.max(0, t.end - clock.time());
      t.tick(left / 1000);
      if (left <= 0) expireNow(name);
    }
    const e = byId("sharedElapsed");
    if (e) e.textContent = Math.floor(clock.time() / 1000) + " секунд";
  }, 50);
  let lastSaved = 0;
  setInterval(() => {
    if (model && !model.finished && clock.time() - lastSaved >= 1000) {
      lastSaved = clock.time();
      save();
    }
  }, 1000);
  document.addEventListener("DOMContentLoaded", () => {
    byId("pauseGameButton").onclick = () => (paused ? resume() : pause());
    byId("resumePausedButton").onclick = resume;
    byId("sharedHintButton").onclick = () => help(false);
    byId("sharedSolutionButton").onclick = () => help(true);
    byId("gameSetup").addEventListener("change", updateCount);
    byId("sharedTime").addEventListener("change", () => {
      if (byId("sharedTime").value === "0")
        byId("sharedMode").value = "practice";
    });
    byId("sharedMode").addEventListener("change", () => {
      if (
        byId("sharedMode").value === "challenge" &&
        byId("sharedTime").value === "0"
      )
        byId("sharedTime").value = "12";
    });
    banner();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  window.addEventListener("pagehide", () => {
    if (model && !model.finished) {
      clock.pause();
      save();
    }
  });
})();
