/* Matching, step diagnosis and a manually entered lock code. */
(function () {
  "use strict";
  const S = GameSession,
    M = MathLogicModels,
    C = MathLogicContent,
    ids = new Set(["match", "find-error", "math-code"]);
  const $ = (id) => document.getElementById(id),
    esc = escapeGameHtml;
  let state = null,
    epoch = 0,
    revision = 0;
  const box = () => $("gameQuestion");
  const supports = (id) => ids.has(id);
  function source(id, lesson, format = "answers") {
    const bank = window.gameQuestionBank[lesson];
    if (!bank) return [];
    if (id === "find-error") return C.errors(lesson, bank.quickAnswer || []);
    if (id === "math-code")
      return (bank.mathCode || []).map((q, i) => ({
        ...q,
        code: String(q.code ?? i + 1).padStart(2, "0"),
        _sessionKey: `logic:math-code:${lesson}:${i}`,
      }));
    if (id !== "match") return [];
    const raw =
      format === "concepts"
        ? C.concepts(lesson)
        : format === "diagrams"
          ? C.diagrams(lesson)
          : (bank.match || []).map((q) => ({
              ...q,
              _logicExplain: GameLearning.explain(lesson, q),
            }));
    return M.uniquePairs(raw).map((q) => ({
      ...q,
      _sessionKey: `logic:match:${lesson}:${format}:${q.sourceIndices.join("-")}`,
    }));
  }
  function setup(id) {
    if (id !== "match") return;
    const field = document.createElement("div");
    field.id = "logicFormatField";
    field.innerHTML =
      '<label for="logicMatchFormat">Карточкалардың байланысы</label><select id="logicMatchFormat"></select>';
    $("sharedSetupInfo").append(field);
    syncFormat();
  }
  function syncFormat() {
    const select = $("logicMatchFormat");
    if (!select) return;
    const previous = select.value,
      options = [
        ["answers", "Есеп – жауап"],
        ["concepts", "Ұғым – анықтама"],
      ];
    if (C.diagrams(getLessonKey()).length)
      options.push(["diagrams", "Формула – сызба"]);
    const markup = options
      .map(([v, t]) => `<option value="${v}">${t}</option>`)
      .join("");
    if (select.dataset.options !== markup) {
      select.innerHTML = markup;
      select.dataset.options = markup;
      select.value = options.some((x) => x[0] === previous)
        ? previous
        : "answers";
    }
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
      phase: "task",
      finished: false,
      message: "",
    };
    if (id === "match")
      Object.assign(state, {
        orders: M.orders(qs.length),
        solved: [],
        selectedLeft: null,
        selectedRight: null,
        wrong: null,
      });
    if (id === "find-error") {
      state.parts = {};
      state.repairOrders = qs.map((q) => M.shuffle(q.repairOptions));
      S.current().logicParts = state.parts;
    }
    if (id === "math-code")
      Object.assign(state, {
        parts: Array(qs.length).fill(null),
        awarded: [],
        value: "",
        entry: "",
        attempts: [],
        lastCode: "",
        review: false,
      });
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
  function inputSubmit(selector, fn) {
    const e = epoch,
      r = revision,
      el = box().querySelector(selector);
    if (el)
      el.onkeydown = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (e === epoch && r === revision && allowed()) fn();
        }
      };
  }
  function drawDiagram(q) {
    const d = q.diagram;
    if (!d) return esc(q.right);
    const count = d.parts === 1 ? d.filled : d.parts,
      cols = d.square
        ? Math.sqrt(count)
        : count === 100
          ? 10
          : Math.min(count, 6),
      rows = Math.ceil(count / cols);
    return `<svg class="logic-diagram" viewBox="0 0 ${cols * 22} ${rows * 22}" role="img" aria-label="${esc(d.parts === 1 ? `${d.filled} бірлік шаршы` : `${d.parts} тең бөліктің ${d.filled} бөлігі боялған`)}">${Array.from({ length: count }, (_, i) => `<rect x="${(i % cols) * 22 + 1}" y="${Math.floor(i / cols) * 22 + 1}" width="19" height="19" rx="2" fill="${i < d.filled ? "#68e2d0" : "#173450"}" stroke="#9cb6ca"/>`).join("")}</svg><small>${d.parts === 1 ? "Әр шаршы — бір бірлік." : "Барлық шаршы бірге — бір бүтін."}</small>`;
  }
  function matching() {
    const tile = (i, side) => {
      const solved = state.solved.includes(i),
        selected =
          state[side === "left" ? "selectedLeft" : "selectedRight"] === i,
        wrong = state.wrong?.[side] === i;
      return `<button type="button" data-match-${side}="${i}" class="logic-pair ${solved ? "is-solved" : ""} ${selected ? "is-selected" : ""} ${wrong ? "is-wrong" : ""}" ${solved ? "disabled" : ""} aria-pressed="${selected}">${solved ? '<span class="logic-check">✓</span>' : ""}${side === "left" ? esc(state.qs[i].left) : drawDiagram(state.qs[i])}</button>`;
    };
    return `<article class="logic-game logic-matching"><header><h2>🧩 Байланысты тап</h2><p>Екі бағаннан бір-бір карточка таңда. Оң жақтан да бастауға болады.</p><p>Табылған жұп: ${state.solved.length}/${state.qs.length} · Ұпай: ${state.solved.length}</p><p>Бірінші әрекетте дұрыс: ${Object.values(S.current().records).filter((r) => r.firstCorrect).length} · Бірінші әрекетте, көмексіз: ${S.current().summary().independent}</p><p>Бірдей мәні бар есептер бір карточкаға біріктірілген. Ондағы есептердің ортақ жауабын тап.</p></header><div class="logic-pair-columns"><section><h3>Тапсырма немесе ұғым</h3>${state.orders.left.map((i) => tile(i, "left")).join("")}</section><section><h3>Жауап немесе анықтама</h3>${state.orders.right.map((i) => tile(i, "right")).join("")}</section></div><p class="logic-status" role="status">${esc(state.message || "Бірінші карточканы таңдаңыз.")}</p>${state.wrong ? '<button type="button" id="clearWrongPair" class="game-primary">Қайта таңдау</button>' : ""}</article>`;
  }
  function resetPair() {
    if (!allowed() || !state.wrong) return;
    S.cancelTimer("logic-mismatch");
    state.wrong = null;
    state.selectedLeft = state.selectedRight = null;
    state.message =
      "Жұп бастапқы күйіне қайтты. Ережені тексеріп, қайта таңдаңыз.";
    render();
    S.queueSave();
  }
  function mismatchTimer() {
    S.timer("logic-mismatch", 0.8, () => {}, resetPair);
  }
  function choosePair(side, i) {
    if (state.wrong || state.solved.includes(i)) return;
    state[side === "left" ? "selectedLeft" : "selectedRight"] = i;
    if (state.selectedLeft === null || state.selectedRight === null) {
      state.message = "Екінші бағаннан сәйкес карточканы таңдаңыз.";
      render();
      return;
    }
    const left = state.selectedLeft,
      right = state.selectedRight,
      ok = left === right;
    S.record(left, ok, state.qs[right].right);
    if (ok) {
      state.solved.push(left);
      state.selectedLeft = state.selectedRight = null;
      state.message = "✓ Дұрыс жұп бекітілді.";
      currentScore = state.solved.length;
      if (state.solved.length === state.qs.length) {
        finish();
        return;
      }
    } else {
      state.wrong = { left, right };
      state.message =
        "✕ Бұл карточкалар бір жұп емес. Бекітілген жұптар өзгермейді.";
    }
    render();
    if (state.wrong) mismatchTimer();
    S.queueSave();
  }
  function errorTask() {
    const q = state.qs[state.index],
      row = state.parts[q._sessionKey] || {},
      found = row.find,
      fix = row.fix;
    const rows = Object.values(state.parts),
      foundCount = rows.filter((r) => r.find?.correct).length,
      fixedCount = rows.filter((r) => r.fix?.correct).length;
    return `<article class="logic-game logic-errors"><header><h2>❌ Алғашқы қатені зертте</h2><p>Қатені табу: ${foundCount}/${state.qs.length} · Түзету: ${fixedCount}/${state.qs.length} · Ұпай: ${foundCount + fixedCount}</p><p>Алдымен алғашқы қате қадамды таңда, содан кейін сол қадамды түзет. Екі әрекет бөлек бағаланады.</p><p class="logic-prompt">${esc(q.question)}</p></header><ol class="logic-steps">${q.steps.map((step, i) => `<li><button type="button" data-error-step="${i}" ${found ? "disabled" : ""} class="logic-step ${found && i === q.firstError ? "step-actual-error" : ""} ${found?.value === i ? "step-chosen" : ""}"><span>${i + 1}-қадам</span>${esc(step)}</button></li>`).join("")}</ol>${!found ? "<p>Кейінгі қадамдар алғашқы қатенің салдары болуы мүмкін. Ең алғашқы қате қадамды таңдаңыз.</p>" : `<section class="logic-repair"><h3>1. Қатені табу: ${found.correct ? "✓ Дұрыс" : "✕ Дұрыс емес"}</h3><p>Алғашқы қате — ${esc(q.firstError + 1)}-қадам. Таңдау бекітілді.</p><h3>2. Осы қадамды қалай түзетеміз?</h3>${state.repairOrders[state.index].map((v, i) => `<button type="button" data-repair="${i}" ${fix ? "disabled" : ""}>${esc(v)}</button>`).join("")}</section>`}${fix ? `<section class="logic-explanation" role="status"><h3>Түзету: ${fix.correct ? "✓ Дұрыс" : "✕ Дұрыс емес"}</h3><p><strong>Қате себебі (${esc(q.errorKind)}):</strong> ${esc(q.reason)}</p><h3>Толық дұрыс шешім</h3><ol>${q.correctSteps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><button type="button" id="logicNext" class="game-primary">${state.index + 1 < state.qs.length ? "Келесі талдау →" : "Нәтижені көру"}</button></section>` : ""}</article>`;
  }
  function findStep(i) {
    const q = state.qs[state.index];
    if (!M.part(state.parts, q._sessionKey, "find", i === q.firstError, i))
      return;
    if (i !== q.firstError) S.current().assist(q._sessionKey);
    state.phase = "repair";
    render();
    S.queueSave();
  }
  function repairStep(i) {
    const q = state.qs[state.index],
      row = state.parts[q._sessionKey];
    if (!row?.find || row.fix) return;
    const value = state.repairOrders[state.index][i];
    M.part(state.parts, q._sessionKey, "fix", value === q.repair, value);
    S.record(
      state.index,
      row.find.correct && row.fix.correct,
      `Қадам: ${row.find.value + 1}; түзету: ${value}`,
    );
    state.phase = "feedback";
    currentScore = Object.values(state.parts).reduce(
      (n, r) => n + Number(!!r.find?.correct) + Number(!!r.fix?.correct),
      0,
    );
    render();
    S.queueSave();
  }
  function codeView() {
    const q = state.qs[state.index],
      complete = state.parts.every((p) => p !== null),
      info = GameLearning.explain(state.lesson, q);
    return `<article class="logic-game logic-code"><header><div class="logic-lock" role="img" aria-label="Құлып жабық"><span class="lock-shackle"></span><span class="lock-body">🔑</span></div><h2>🔐 Математикалық құлып</h2><p>Әр есепке екі таңбалы кілт бекітілген. Дұрыс шешім ғана сол кілтті өз ұяшығына орналастырады. Алғашқы нөл — кодтың бір бөлігі.</p><div class="logic-code-slots">${state.parts.map((p, i) => `<span class="logic-code-slot ${p !== null ? "slot-filled" : ""}" aria-label="${i + 1}-ұяшық: ${esc(p ?? "бос")}">${esc(p ?? "••")}<small>${i + 1}-бөлік</small></span>`).join("")}</div><p>Жиналған бөлік: ${state.parts.filter((x) => x !== null).length}/${state.qs.length}. Ұпай: ${state.awarded.length}.</p></header><nav class="logic-code-tasks" aria-label="Код бөліктеріне өту">${state.qs.map((_, i) => `<button type="button" data-code-task="${i}" aria-pressed="${state.index === i}">${i + 1}-есеп ${state.parts[i] !== null ? "✓" : ""}</button>`).join("")}</nav><section class="logic-code-question"><h3>${state.index + 1}-есеп → ${state.index + 1}-ұяшық</h3><p>Бұл тапсырманың кілті: «${esc(q.code)}». Есептің жауабы мен кілт екі түрлі болуы мүмкін.</p><p class="logic-prompt">${esc(q.question)}</p>${state.parts[state.index] !== null ? `<p>✓ Бөлік өз ұяшығында: ${esc(state.parts[state.index])}.</p><details ${state.review ? "open" : ""}><summary>Есеп пен шешімді қайта қарау</summary><p>${esc(info.solution)}</p></details><button id="codeRework" type="button" class="presentation-back">Осы есепті қайта шығару</button>` : state.phase === "feedback" ? `<div class="logic-explanation" role="status"><p>${esc(state.message)}</p><p>${esc(info.solution)}</p><button id="retryCodeTask" type="button" class="game-primary">Осы есепті қайта шығару</button></div>` : `<label for="codeAnswer">Есептің жауабы</label><input id="codeAnswer" autocomplete="off" value="${esc(state.value)}"><button id="codeSubmit" type="button" class="game-primary">Бөлікті алу</button><p role="status">${esc(state.message)}</p>`}</section>${complete ? `<section class="logic-code-entry"><h3>Барлық бөлік жиналды. Құлып кодын енгізіңіз</h3><p>Ұяшықтарды солдан оңға қарай оқып, аралықсыз жазыңыз. Бастапқы нөлдерді сақтаңыз.</p><label for="lockCode">Толық код</label><input id="lockCode" inputmode="${/^\d+$/.test(state.parts.join("")) ? "numeric" : "text"}" type="text" autocomplete="off" value="${esc(state.entry)}"><button id="unlockCode" type="button" class="game-primary">Құлыпты ашу</button><p role="status">${esc(state.codeMessage || "")}</p><ol>${state.attempts.map((x) => `<li>${esc(x.value)} — ${x.correct ? "дұрыс" : "қате"}</li>`).join("")}</ol></section>` : '<p class="logic-status">Барлық міндетті бөлік жиналмайынша құлып ашылмайды.</p>'}</article>`;
  }
  function submitCodeTask() {
    if (
      !allowed() ||
      state.phase !== "task" ||
      state.parts[state.index] !== null
    )
      return;
    const q = state.qs[state.index],
      value = state.value.trim();
    if (!value) {
      state.message = "Есептің жауабын енгізіңіз.";
      render();
      return;
    }
    const ok = answersMatch(value, q.answer);
    S.record(state.index, ok, value);
    if (ok) {
      state.parts[state.index] = String(q.code);
      if (!state.awarded.includes(state.index)) state.awarded.push(state.index);
      currentScore = state.awarded.length;
      state.message = "✓ Кілт өз ұяшығына орналасты.";
      state.phase = "task";
      const next = state.parts.findIndex((x) => x === null);
      if (next >= 0) state.index = next;
      state.value = "";
    } else {
      S.current().assist(q._sessionKey);
      S.current().records[q._sessionKey].assisted = true;
      state.phase = "feedback";
      state.message =
        "✕ Бөлік ашылмады. Шешімді талдап, қайта орындаңыз. Келесі әрекет көмекпен тіркеледі.";
    }
    render();
    S.queueSave();
  }
  function unlock() {
    if (!allowed() || !state.parts.every((x) => x !== null)) return;
    const value = state.entry.trim();
    if (!value) {
      state.codeMessage = "Кодты енгізіңіз.";
      render();
      return;
    }
    if (state.lastCode === value) {
      state.codeMessage =
        "Бұл код тексерілді. Бөліктерді қайта қарап, басқа код енгізіңіз.";
      render();
      return;
    }
    const ok = M.canUnlock(state.qs, state.parts, value);
    state.attempts.push({ value, correct: ok });
    state.lastCode = value;
    if (ok) finish();
    else {
      state.review = true;
      state.codeMessage =
        "✕ Код сәйкес келмейді. Нөлдер мен ұяшықтардың ретін тексеріңіз; есептерді қайта қарап, қажет болса қайта шығарыңыз.";
      render();
      S.queueSave();
    }
  }
  function finish() {
    state.finished = true;
    render();
    S.finish();
  }
  function render() {
    if (!state) return;
    revision++;
    $("gameProgress").textContent = state.finished
      ? "Нәтиже"
      : state.id === "match"
        ? `${state.solved.length} / ${state.qs.length} жұп`
        : `${state.index + 1} / ${state.qs.length}`;
    if (state.finished) {
      box().innerHTML = `<section class="logic-game logic-finish ${state.id === "math-code" ? "logic-code" : ""}">${state.id === "math-code" ? '<div class="logic-lock unlocked" role="img" aria-label="Құлып ашылды"><span class="lock-shackle"></span><span class="lock-body">✓</span><i>✦</i><i>✧</i><i>✦</i></div>' : ""}<h2>${state.id === "match" ? "Барлық жұп табылды" : state.id === "find-error" ? "Қадамдық талдау аяқталды" : "Құлып ашылды!"}</h2>${state.id === "math-code" ? `<p>Сіз енгізген код: <strong>${esc(state.entry.trim())}</strong>. Барлық бөлік тексерілді.</p>` : ""}<button id="logicReplay" type="button" class="game-primary">Қайта ойнау</button></section>`;
      $("logicReplay").onclick = startSelectedGame;
      return;
    }
    box().innerHTML =
      state.id === "match"
        ? matching()
        : state.id === "find-error"
          ? errorTask()
          : codeView();
    const index =
      state.id === "match"
        ? (state.selectedLeft ??
          state.qs.findIndex((_, i) => !state.solved.includes(i)))
        : state.index;
    S.present(Math.max(0, index));
    if (state.id === "match") {
      bind("[data-match-left]", (el) =>
        choosePair("left", Number(el.dataset.matchLeft)),
      );
      bind("[data-match-right]", (el) =>
        choosePair("right", Number(el.dataset.matchRight)),
      );
      bind("#clearWrongPair", resetPair);
      if (state.selectedLeft === null) $("sharedHelpButtons").hidden = true;
    } else if (state.id === "find-error") {
      bind("[data-error-step]", (el) => findStep(Number(el.dataset.errorStep)));
      bind("[data-repair]", (el) => repairStep(Number(el.dataset.repair)));
      bind("#logicNext", () => {
        if (!state.parts[state.qs[state.index]._sessionKey]?.fix) return;
        state.index++;
        if (state.index === state.qs.length) finish();
        else {
          state.phase = "task";
          render();
          S.queueSave();
        }
      });
    } else {
      typing("#codeAnswer", "value");
      inputSubmit("#codeAnswer", submitCodeTask);
      bind("#codeSubmit", submitCodeTask);
      typing("#lockCode", "entry");
      inputSubmit("#lockCode", unlock);
      bind("#unlockCode", unlock);
      bind("[data-code-task]", (el) => {
        state.index = Number(el.dataset.codeTask);
        state.phase = "task";
        state.message = "";
        state.value = "";
        render();
        S.queueSave();
      });
      bind("#retryCodeTask", () => {
        state.phase = "task";
        state.value = "";
        state.message = "";
        render();
        S.queueSave();
      });
      bind("#codeRework", () => {
        state.parts[state.index] = null;
        state.phase = "task";
        state.value = "";
        state.review = false;
        state.lastCode = "";
        state.entry = "";
        render();
        S.queueSave();
      });
    }
    S.queueSave();
  }
  function appendSummary(panel) {
    if (!state?.finished || !supports(S.current()?.id)) return;
    const extra = document.createElement("section");
    extra.className = "logic-result-detail";
    if (state.id === "find-error") {
      const rows = Object.values(state.parts),
        found = rows.filter((r) => r.find?.correct).length,
        fixed = rows.filter((r) => r.fix?.correct).length;
      extra.innerHTML = `<h3>Екі бөлек дағды</h3><p>Алғашқы қатені дұрыс табу: ${found}/${state.qs.length}. Дұрыс түзету: ${fixed}/${state.qs.length}. Ойын ұпайы: ${found + fixed}/${state.qs.length * 2}.</p><p>Оқу есебі екі әрекет те дұрыс болғанда ғана толық дұрыс деп саналады. Бір тапсырмадағы таңдаулар бір рет бекітіледі.</p>`;
    } else if (state.id === "match")
      extra.innerHTML = `<h3>Жұптар қорытындысы</h3><p>Бекітілген жұптар: ${state.solved.length}. Бірінші әрекетте дұрыс: ${Object.values(S.current().records).filter((r) => r.firstCorrect).length}. Бірінші әрекетте, көмексіз: ${S.current().summary().independent}. Біріктірілген карточка бірнеше бірдей мәнді есепті қамтуы мүмкін.</p>`;
    else
      extra.innerHTML = `<h3>Құлыпты ашу</h3><p>Жиналған бөліктер: ${state.parts.length}. Код енгізу әрекеттері: ${state.attempts.length}. Код мәтін ретінде тексерілді; бастапқы нөлдер сақталды.</p>`;
    panel.append(extra);
  }
  const oldGet = window.getGameQuestions,
    oldRender = window.renderCurrentQuestion;
  window.getGameQuestions = function (id, lesson) {
    const qs = oldGet(id, lesson);
    return supports(id)
      ? source(id, lesson, $("logicMatchFormat")?.value || "answers")
      : qs;
  };
  window.renderCurrentQuestion = function () {
    return supports(currentGameMode) && state?.id === currentGameMode
      ? render()
      : oldRender();
  };
  S.adapters.logic = {
    setQuestions() {},
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    restore(saved) {
      if (
        saved?.version !== 1 ||
        !supports(saved.id) ||
        !Array.isArray(saved.qs) ||
        !saved.qs.length
      )
        throw Error("Логикалық ойын күйі жарамсыз.");
      state = saved;
      epoch++;
      currentScore =
        state.id === "match"
          ? state.solved.length
          : state.id === "math-code"
            ? state.awarded.length
            : Object.values(state.parts).reduce(
                (n, r) =>
                  n + Number(!!r.find?.correct) + Number(!!r.fix?.correct),
                0,
              );
      if (state.id === "find-error") S.current().logicParts = state.parts;
      if (state.id === "match" && state.solved.length === state.qs.length) {
        finish();
        return;
      }
      render();
      if (state.id === "match" && state.wrong) mismatchTimer();
    },
  };
  window.GameLogic = {
    supports,
    description(id) {
      return {
        match:
          "Екі бағандағы карточкаларды жұптастыр. Есеп–жауап, ұғым–анықтама және қолжетімді сызбаларды зертте.",
        "find-error":
          "Шешімдегі алғашқы қате қадамды тап, содан кейін оны түзет. Екі әрекет бөлек бағаланады.",
        "math-code":
          "Есептердің кілттерін жинап, толық кодты өзің енгіз. Барлық бөлік жиналмайынша құлып ашылмайды.",
      }[id];
    },
    start,
    setup,
    syncFormat,
    source,
    appendSummary,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    restoreSettings(model) {
      syncFormat();
      if (model.id === "match" && $("logicMatchFormat"))
        $("logicMatchFormat").value = model.settings.format || "answers";
    },
  };
})();
