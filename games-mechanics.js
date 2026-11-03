/* Dedicated adapters: investigation, self-assessment deck, constraint puzzle. */
(function () {
  "use strict";
  const M = MathGameMechanics,
    S = GameSession,
    ids = new Set(["detective", "cards", "secret-number"]);
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
  let state = null,
    epoch = 0,
    revision = 0;
  const box = () => document.getElementById("gameQuestion");
  const question = (q) => q.question || q.clue || q.left || q.statement;
  const signature = (q) => question(q) + "|" + String(q.answer);
  const reviewKey = (lesson) => "math-ai-card-review-v1:" + lesson;
  function reviewLoad(lesson) {
    try {
      const d = JSON.parse(localStorage.getItem(reviewKey(lesson)) || "null");
      return d?.bank === JSON.stringify(window.gameQuestionBank[lesson]) &&
        Array.isArray(d.keys)
        ? d.keys.filter((x) => typeof x === "string").slice(0, 1000)
        : [];
    } catch {
      return [];
    }
  }
  function reviewSave() {
    try {
      localStorage.setItem(
        reviewKey(state.lesson),
        JSON.stringify({
          bank: JSON.stringify(window.gameQuestionBank[state.lesson]),
          keys: state.review,
        }),
      );
    } catch {
      state.notice = "Қайталау қорын осы браузерде сақтау мүмкін болмады.";
    }
  }
  function start(id, lesson, qs) {
    epoch++;
    revision++;
    state = null;
    if (!ids.has(id)) return;
    const variant = Number(lesson.split("-").at(-1)) + (Number(lesson[0]) - 5);
    state = {
      id,
      lesson,
      qs,
      index: 0,
      phase: "task",
      solved: [],
      value: "",
      feedback: "",
      finished: false,
    };
    if (id === "detective") {
      state.case = M.detective(
        qs,
        variant,
        Math.floor(Math.random() * Math.min(5, qs.length + 1)),
      );
      state.evidence = [];
      state.proof = [];
      state.candidate = null;
      state.conclusions = [];
    }
    if (id === "secret-number") {
      const digits = lesson[0] === "5" ? 2 : 3,
        lo = 10 ** (digits - 1),
        number = lo + Math.floor(Math.random() * 9 * lo);
      state.secret = M.secret(number, qs.length);
      state.guesses = [];
      state.guess = "";
    }
    if (id === "cards") {
      state.rated = {};
      state.revealed = {};
      state.open = null;
      state.work = {};
      state.review = reviewLoad(lesson);
      state.notice = "";
      S.current().selfAssessments = {};
    }
  }
  function allowed(done = false) {
    return (
      !!state &&
      S.current()?.id === state.id &&
      ((done && state.finished && S.current().finished) || S.canAnswer())
    );
  }
  function bind(selector, fn, done = false) {
    const e = epoch,
      r = revision;
    box()
      .querySelectorAll(selector)
      .forEach(
        (el) =>
          (el.onclick = () => {
            if (e !== epoch || r !== revision || !allowed(done)) return;
            fn(el);
          }),
      );
  }
  function input(selector, field) {
    const el = box().querySelector(selector);
    if (el)
      el.oninput = () => {
        if (!allowed()) return;
        state[field] = el.value;
        S.queueSave();
      };
  }
  function finish() {
    state.finished = true;
    render();
    S.finish();
  }
  function answer() {
    if (
      state.phase !== "task" ||
      !allowed() ||
      state.solved.includes(state.index)
    )
      return;
    const value = String(state.value).trim();
    if (!value) {
      state.feedback = "Жауабыңызды енгізіңіз.";
      render();
      return;
    }
    const q = state.qs[state.index],
      ok = answersMatch(value, q.answer);
    S.record(state.index, ok, value);
    // A retry after the worked solution is practice with assistance.
    if (!ok) {
      S.current().assist(q._sessionKey);
      S.current().records[q._sessionKey].assisted = true;
    }
    state.phase = "feedback";
    state.feedback = ok
      ? "✓ Есеп дұрыс шешілді."
      : "✕ Жауап дұрыс емес. Шешімді талдап, қайта байқап көріңіз. Келесі әрекет көмекпен орындалған болып тіркеледі.";
    if (ok) {
      state.solved.push(state.index);
      if (state.id === "detective")
        state.evidence.push({ index: state.index, answer: String(q.answer) });
    }
    render();
    S.queueSave();
  }
  function task() {
    const q = state.qs[state.index];
    if (!q) return "";
    const info = GameLearning.explain(state.lesson, q);
    return `<section class="mechanic-task"><h3>${state.id === "detective" ? "Дәлелді тексеру" : "Жаңа шартты ашу"} · ${state.index + 1}/${state.qs.length}</h3><p class="mechanic-prompt">${esc(question(q))}</p>${state.phase === "task" ? `<label for="mechanicAnswer">Есептің жауабы</label><input id="mechanicAnswer" autocomplete="off" value="${esc(state.value)}"><button type="button" id="mechanicSubmit" class="game-primary">Тексеру</button>` : `<p role="status">${esc(state.feedback)}</p><details open><summary>Математикалық түсіндірме</summary><p>${esc(info.solution)}</p></details><button type="button" id="mechanicNext" class="game-primary">${state.solved.includes(state.index) ? "Дәлелдерге өту →" : "Осы есепті қайта орындау"}</button>`}${state.phase === "task" && state.feedback ? `<p role="status">${esc(state.feedback)}</p>` : ""}</section>`;
  }
  function wireTask() {
    input("#mechanicAnswer", "value");
    bind("#mechanicSubmit", answer);
    const el = box().querySelector("#mechanicAnswer");
    if (el)
      el.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          answer();
        }
      };
    bind("#mechanicNext", () => {
      if (state.solved.includes(state.index)) {
        state.index++;
        if (state.index >= state.qs.length) state.phase = "final";
        else state.phase = "task";
      } else state.phase = "task";
      state.value = "";
      state.feedback = "";
      render();
      S.queueSave();
    });
  }
  function detectiveView() {
    const c = state.case,
      remaining = M.compatible(c, state.evidence);
    return `<article class="mechanic detective-game"><header><span class="mechanic-emblem" aria-hidden="true">🕵️</span><h2>${esc(c.title)}</h2><p>${esc(c.story)}</p><p>Мақсат: дұрыс нұсқаны таңдап, математикалық дәлелмен негіздеу.</p></header><section class="case-candidates"><h3>Ықтимал қорытындылар · ${remaining.length} нұсқа сәйкес</h3><p>Журналдарда әр бақылау есебіне күтілетін нәтиже берілген. Ашылған дәлелге қайшы нұсқалар белгіленеді.</p><div class="candidate-grid">${c.candidates.map((x) => `<div class="candidate ${remaining.includes(x.id) ? "candidate-compatible" : "candidate-excluded"}"><strong>${esc(x.title)}</strong><p>${remaining.includes(x.id) ? "✓ Ашылған дәлелдерге сәйкес" : "✕ Дәлелге қайшы"}</p><ul>${x.values.map((v, i) => `<li>${i + 1}-бақылау: ${esc(v)}</li>`).join("")}</ul></div>`).join("")}</div></section><section class="evidence-panel"><h3>Жиналған дәлелдер · ${state.evidence.length}/${state.qs.length}</h3>${state.evidence.length ? state.evidence.map((e) => `<p>🔎 ${e.index + 1}-дәлел: ${esc(question(state.qs[e.index]))} → ${esc(e.answer)}</p>`).join("") : "<p>Дұрыс шешілген әр есеп бір дәлел ашады.</p>"}</section>${state.phase === "final" ? `<section class="case-conclusion"><h3>Қорытындыны негізде</h3><label for="caseCandidate">Қай нұсқа дұрыс?</label><select id="caseCandidate"><option value="">Қорытынды таңдаңыз</option>${c.candidates.map((x) => `<option value="${x.id}" ${state.candidate === x.id ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select><fieldset><legend>Оны бірмәнді анықтайтын дәлелдерді таңдаңыз</legend>${state.evidence.map((e) => `<label class="proof-option"><input type="checkbox" data-proof="${e.index}" ${state.proof.includes(e.index) ? "checked" : ""}> ${e.index + 1}-дәлел: ${esc(e.answer)}</label>`).join("")}</fieldset><button id="caseConclude" class="game-primary" type="button">Қорытындыны дәлелдеу</button><p role="status">${esc(state.feedback)}</p></section>` : task()}</article>`;
  }
  function detectiveWire() {
    wireTask();
    const select = box().querySelector("#caseCandidate");
    if (select)
      select.onchange = () => {
        if (!allowed()) return;
        state.candidate = select.value === "" ? null : Number(select.value);
        S.queueSave();
      };
    box()
      .querySelectorAll("[data-proof]")
      .forEach(
        (el) =>
          (el.onchange = () => {
            if (!allowed()) return;
            const i = Number(el.dataset.proof);
            state.proof = el.checked
              ? [...new Set([...state.proof, i])]
              : state.proof.filter((x) => x !== i);
            S.queueSave();
          }),
      );
    bind("#caseConclude", () => {
      const ok = M.conclude(
        state.case,
        state.evidence,
        state.candidate,
        state.proof,
      );
      state.conclusions.push({
        candidate: state.candidate,
        proof: [...state.proof],
        correct: ok,
      });
      if (ok) finish();
      else {
        state.feedback =
          "Қорытынды не дәлелдер жеткіліксіз. Таңдалған дәлелдер тек бір нұсқаны қалдыруы тиіс.";
        render();
        S.queueSave();
      }
    });
  }
  function conditions() {
    return state.solved.flatMap((i) => state.secret.groups[i]);
  }
  function secretView() {
    const cs = conditions();
    return `<article class="mechanic secret-game"><header><span class="mechanic-emblem" aria-hidden="true">🔎</span><h2>Жасырын санды зертте</h2><p>Жасырын сан — ${state.secret.digits} таңбалы. Цифр жинамай, ашылған шарттарды біріктіріп санды табыңыз.</p></header><section class="number-conditions"><h3>Ашылған шарттар</h3>${cs.length ? `<ul>${cs.map((c) => `<li>🔑 ${esc(c.text)}</li>`).join("")}</ul>` : "<p>Шарт ашу үшін тақырыптың есебін шешіңіз.</p>"}</section>${state.phase !== "final" ? task() : "<p>Барлық шарт ашылды. Оларға сәйкес келетін жалғыз санды енгізіңіз.</p>"}<section class="guess-panel"><h3>Сан туралы болжам</h3><label for="secretGuess">${state.secret.digits} таңбалы бүтін сан</label><input id="secretGuess" inputmode="numeric" autocomplete="off" value="${esc(state.guess)}"><button id="submitGuess" type="button" class="game-primary">Болжамды тексеру</button><p id="guessFeedback" role="status">${esc(state.guessFeedback || "")}</p><h3>Болжамдар тарихы</h3><ol>${state.guesses.map((g) => `<li>${g.number}: ${esc(g.message)}</li>`).join("") || "<li>Әзірге болжам жоқ.</li>"}</ol></section></article>`;
  }
  function guess() {
    if (!allowed()) return;
    const v = state.guess.trim();
    if (
      !new RegExp("^\\d{" + state.secret.digits + "}$").test(v) ||
      Number(v) < 10 ** (state.secret.digits - 1)
    ) {
      state.guessFeedback =
        "Көрсетілген таңба санына сай оң бүтін сан енгізіңіз.";
      render();
      return;
    }
    const n = Number(v);
    if (state.guesses.some((g) => g.number === n)) {
      if (
        state.solved.length === state.qs.length &&
        n === state.secret.number
      ) {
        state.guesses.find((g) => g.number === n).message =
          "✓ Барлық шартқа сәйкес жалғыз сан.";
        finish();
        return;
      }
      state.guessFeedback = "Бұл болжам тарихта бар. Басқа санды тексеріңіз.";
      render();
      return;
    }
    const cs = conditions(),
      fits = cs.every((c) => M.satisfies(n, c)),
      complete = state.solved.length === state.qs.length;
    const message =
      complete && fits
        ? "✓ Барлық шартқа сәйкес жалғыз сан."
        : fits
          ? "Ашылған шарттарға сәйкес. Қалған шарттарды да ашыңыз."
          : "Ашылған шарттардың кемінде біреуіне сәйкес емес.";
    state.guesses.push({ number: n, message });
    state.guessFeedback = message;
    if (complete && fits && n === state.secret.number) finish();
    else {
      render();
      S.queueSave();
    }
  }
  function secretWire() {
    wireTask();
    input("#secretGuess", "guess");
    bind("#submitGuess", guess);
    const el = box().querySelector("#secretGuess");
    if (el)
      el.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          guess();
        }
      };
  }
  function cardsView() {
    const counts = { independent: 0, assisted: 0, repeat: 0 };
    Object.values(state.rated).forEach((v) => counts[v]++);
    const open = state.open,
      q = state.qs[open],
      revealed = !!state.revealed[open];
    return `<article class="mechanic cards-game"><header><span class="mechanic-emblem" aria-hidden="true">🃏</span><h2>Есепті өзің орында, кейін салыстыр</h2><p>Бұл — өзіндік бағалау. Белгіңіз автоматты тексерілген дұрыс жауап болып есептелмейді.</p><p>Бағаланған карточка: ${Object.keys(state.rated).length}/${state.qs.length}. Сақталған қайталау қоры: ${state.review.length}.</p></header><div class="card-deck">${state.qs.map((q, i) => `<button type="button" data-card="${i}" class="deck-card ${state.rated[i] ? "card-rated" : ""}" aria-label="${i + 1}-карточканы ашу"><span aria-hidden="true">${state.rated[i] ? "✓" : "?"}</span>${i + 1}-карточка${state.rated[i] ? ` · ${ratingLabel(state.rated[i])}` : ""}</button>`).join("")}</div>${q ? `<section class="open-card"><h3>${open + 1}-карточка</h3><p class="mechanic-prompt">${esc(question(q))}</p><label for="cardWork">Өз шешіміңіз (міндетті емес, тек өзіңізге)</label><textarea id="cardWork" ${revealed ? "readonly" : ""}>${esc(state.work[open] || "")}</textarea>${!revealed ? '<p>Алдымен өзіңіз шешіңіз. Дайын болғанда жауапты ашыңыз.</p><button type="button" id="revealCard" class="game-primary">Жауабын көрсету</button>' : `<div class="card-solution"><h3>Жауап: ${esc(q.answer)}</h3><p>${esc(GameLearning.explain(state.lesson, q).solution)}</p></div><fieldset><legend>Өз жұмысыңызды бағалаңыз</legend>${["independent", "assisted", "repeat"].map((v) => `<button type="button" data-rating="${v}" ${state.rated[open] ? "disabled" : ""}>${ratingLabel(v)}</button>`).join("")}</fieldset><p>Ишара қолданылса, «Өзім шығардым» таңдауы «Көмекпен шығардым» деп тіркеледі.</p>`}</section>` : ""}<div class="mechanic-actions"><button id="reviewCards" type="button" class="presentation-back" ${state.qs.some((q) => state.review.includes(signature(q))) ? "" : "disabled"}>Қайталау айналымы</button><button id="finishCards" type="button" class="game-primary" ${Object.keys(state.rated).length === state.qs.length ? "" : "disabled"}>Оқу нәтижесін көру</button></div><p role="status">${esc(state.notice)}</p></article>`;
  }
  function ratingLabel(v) {
    return {
      independent: "Өзім шығардым",
      assisted: "Көмекпен шығардым",
      repeat: "Қайталау керек",
    }[v];
  }
  function cardsWire() {
    bind("[data-card]", (el) => {
      state.open = Number(el.dataset.card);
      state.index = state.open;
      render();
      S.queueSave();
    });
    const work = box().querySelector("#cardWork");
    if (work)
      work.oninput = () => {
        if (!allowed() || state.revealed[state.open]) return;
        state.work[state.open] = work.value;
        S.queueSave();
      };
    bind("#revealCard", () => {
      if (state.open === null || state.revealed[state.open]) return;
      state.revealed[state.open] = true;
      render();
      S.queueSave();
    });
    bind("[data-rating]", (el) => {
      const i = state.open;
      if (i === null || !state.revealed[i]) return;
      const q = state.qs[i],
        rating = M.rateCard(
          state,
          String(i),
          el.dataset.rating,
          !!S.current().help[q._sessionKey],
        );
      if (!rating) return;
      S.current().selfAssessments[q._sessionKey] = rating;
      const sig = signature(q);
      state.review = state.review.filter((x) => x !== sig);
      if (rating === "repeat") state.review.push(sig);
      reviewSave();
      state.open = null;
      state.index = state.qs.findIndex((_, i) => !state.rated[i]);
      if (state.index < 0) state.index = 0;
      render();
      S.queueSave();
    });
    bind("#reviewCards", review);
    bind("#finishCards", finish);
  }
  function review() {
    const qs = state.qs.filter((q) => state.review.includes(signature(q)));
    if (!qs.length) return;
    const lesson = state.lesson;
    S.begin("cards", lesson, qs);
    start("cards", lesson, qs);
    render();
    S.queueSave();
  }
  function render() {
    if (!state) return;
    revision++;
    document.getElementById("gameProgress").textContent = state.finished
      ? "Нәтиже"
      : state.id === "cards"
        ? `${Object.keys(state.rated).length} / ${state.qs.length} карточка`
        : `${Math.min(state.qs.length, state.index + 1)} / ${state.qs.length}`;
    if (state.finished) {
      const detail =
        state.id === "detective"
          ? `<h3>${esc(state.case.candidates[state.case.target].title)}</h3><p>Таңдалған дәлелдер басқа нұсқаларды жоққа шығарады: ${state.proof.map((i) => i + 1).join(", ")}.</p>${state.evidence.map((e) => `<p>${esc(GameLearning.explain(state.lesson, state.qs[e.index]).solution)}</p>`).join("")}`
          : state.id === "secret-number"
            ? `<h3>Жасырын сан: ${state.secret.number}</h3><ul>${state.secret.groups
                .flat()
                .map((c) => `<li>✓ ${esc(c.text)}</li>`)
                .join(
                  "",
                )}</ul><p>Цифрлар қосындысы: ${String(state.secret.number).split("").join(" + ")} = ${M.digitSum(state.secret.number)}. ${state.secret.number} = 11 × ${Math.floor(state.secret.number / 11)} + ${state.secret.number % 11}.</p><p>Барлық шартқа сай келетін сан біреу ғана. Болжам саны: ${state.guesses.length}.</p><h3>Болжамдар тарихы</h3><ol>${state.guesses.map((g) => `<li>${g.number}: ${esc(g.message)}</li>`).join("")}</ol>`
            : "<p>Өзіндік бағалау аяқталды. Қайталау карточкалары осы браузерде бөлек сақталады.</p>";
      box().innerHTML = `<section class="mechanic mechanic-finish"><h2>${state.id === "detective" ? "Істің шешімі негізделді" : state.id === "secret-number" ? "Құпия сан табылды" : "Карточкалар қаралды"}</h2>${detail}<button type="button" id="mechanicsReplay" class="game-primary">Қайта ойнау</button></section>`;
      document.getElementById("mechanicsReplay").onclick = startSelectedGame;
      return;
    }
    box().innerHTML =
      state.id === "detective"
        ? detectiveView()
        : state.id === "cards"
          ? cardsView()
          : secretView();
    S.present(state.index, true);
    if (
      state.phase === "final" ||
      (state.id === "cards" && state.open === null)
    )
      document.getElementById("sharedHelpButtons").hidden = true;
    if (state.id === "detective") detectiveWire();
    else if (state.id === "cards") cardsWire();
    else secretWire();
  }
  function renderCardSummary(elapsed) {
    const model = S.current(),
      rated = Object.values(model.selfAssessments || {}),
      panel = document.createElement("section");
    panel.id = "sharedSummary";
    panel.className = "shared-summary";
    panel.innerHTML = `<h2>Өзіндік бағалау нәтижесі</h2><p>Бұл белгілерді оқушы өзі таңдады. Автоматты тексерілген дұрыс жауап пен дәлдік пайызы есептелмейді. Нәтиже тек осы браузерде.</p><dl class="shared-metrics">${[["Карточкалар", model.questions.length], ...["independent", "assisted", "repeat"].map((v) => [ratingLabel(v), rated.filter((x) => x === v).length]), ["Белсенді уақыт", Math.round(elapsed / 1000) + " секунд"]].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl><p>Қаралған тақырып: ${esc(GameLearning.lessons[model.lesson]?.[0])}. Белгілер тақырыпты толық меңгеруді растамайды.</p><button type="button" id="resultReviewCards" class="game-primary" ${state.review.length ? "" : "disabled"}>Қайталау карточкаларын орындау</button><button type="button" id="cardsOther" class="presentation-back">Басқа ойын таңдау</button>`;
    box().append(panel);
    bind("#resultReviewCards", review, true);
    document.getElementById("cardsOther").onclick = backToGames;
  }
  const originalGet = window.getGameQuestions,
    originalRender = window.renderCurrentQuestion;
  window.getGameQuestions = function (id, lesson) {
    const old = originalGet(id, lesson);
    if (!ids.has(id)) return old;
    return (window.gameQuestionBank[lesson]?.quickAnswer || []).map((q) => ({
      ...q,
      options: q.options ? [...q.options] : undefined,
    }));
  };
  window.renderCurrentQuestion = function () {
    if (ids.has(currentGameMode) && state?.id === currentGameMode)
      return render();
    return originalRender();
  };
  S.adapters.mechanics = {
    setQuestions() {},
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    },
    restore(saved) {
      if (!saved || !ids.has(saved.id) || !Array.isArray(saved.qs))
        throw Error("Ойын күйі жарамсыз.");
      epoch++;
      state = saved;
      if (state.id === "cards")
        S.current().selfAssessments = { ...S.current().selfAssessments };
      if (state.id === "secret-number")
        M.secret(state.secret.number, state.qs.length);
      render();
    },
  };
  window.GameMechanics = {
    supports: (id) => ids.has(id),
    start,
    renderCardSummary,
    snapshot: () => JSON.parse(JSON.stringify(state)),
  };
})();
