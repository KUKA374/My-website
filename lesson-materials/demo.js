/* One demo view. Existing lessons, constructor and server settings remain untouched. */
(function () {
  "use strict";
  const M = LessonMaterialsModel,
    $ = (id) => document.getElementById(id),
    node = (tag, text, cls) => {
      const e = document.createElement(tag);
      if (text !== undefined) e.textContent = text;
      if (cls) e.className = cls;
      return e;
    };
  const repo = new LessonMaterialsLoader.Repository({
    baseURL: new URL("lesson-materials/", location.href).href,
  });
  let owner = null,
    current = null,
    request = null,
    version = 0,
    privateStore = null,
    privateRevision = 0,
    pairCount = 0,
    slides = null,
    slideIndex = 0,
    katexReady = null,
    dialogOwner = null,
    answersShown = false,
    selectedLevel = "A",
    selectedGame = null,
    slideStepCount = 0,
    qmjOwner = null;
  function message(text, error = false, quiet = false) {
    $("materialStatus").textContent = text;
    $("materialStatus").className = error ? "iu-error" : quiet ? "iu-sr" : "";
    $("retryMaterial").hidden = !error;
  }
  function closeDialogs() {
    for (const id of ["presentationDialog", "videoDialog", "qmjDialog"])
      if ($(id).open) $(id).close();
    $("videoBody").replaceChildren();
    $("slideBody").replaceChildren();
    slides = null;
    $("qmjPreview").replaceChildren();
  }
  function clearPrivate() {
    privateStore = null;
    privateRevision = 0;
    $("privateHomework").hidden = true;
    $("personalHomework").value = "";
    $("personalNotes").value = "";
    for (const id of ["textbookParagraph", "textbookExercise"]) {
      $(id).value = "";
      $(id).disabled = true;
    }
    $("personalStatus").textContent = "";
    $("savePersonal").disabled = true;
    $("personalHomework").disabled = true;
    $("personalNotes").disabled = true;
  }
  function contextFromURL() {
    const p = new URLSearchParams(location.search);
    if (p.has("id")) return M.parseId(p.get("id"));
    if (!location.search)
      return M.identity({
        grade: "6",
        subject: "math",
        quarter: "1",
        number: "1",
      });
    return M.identity({
      grade: p.get("class"),
      subject: p.get("subject"),
      quarter: p.get("quarter"),
      number: p.get("lesson"),
    });
  }
  function query(c) {
    return new URLSearchParams({
      class: c.grade,
      subject: c.subject,
      quarter: c.quarter,
      lesson: c.number,
    }).toString();
  }
  function empty(parent) {
    parent.append(node("p", "Материал әзірге қосылмаған.", "iu-muted"));
  }
  function showTask(t) {
    const box = node("article", undefined, "material-task");
    box.append(node("p", t.prompt));
    const d = node("div", undefined, "lesson-task-answer");
    d.dataset.taskAnswer = "true";
    d.hidden = !answersShown;
    d.append(
      node("strong", "Жауабы: " + t.answer),
      node("p", t.solution),
      node("p", "Критерий: " + t.criteria),
    );
    const descriptors = node("ul");
    for (const descriptor of t.descriptors)
      descriptors.append(
        node("li", `${descriptor.text} — ${descriptor.points} ұпай`),
      );
    d.append(descriptors);
    box.append(d);
    return box;
  }
  function pair() {
    const target = $("materialPairs");
    target.replaceChildren();
    const tasks = current.material.pairWork;
    if (!tasks.length) empty(target);
    else for (const t of tasks.slice(0, pairCount)) target.append(showTask(t));
    $("nextPair").hidden = pairCount >= tasks.length;
    $("pairPosition").textContent = tasks.length
      ? `${pairCount} / ${tasks.length} тапсырма ашылды`
      : "Тапсырмалар әзірге қосылмаған";
  }
  function answerVisibility() {
    document
      .querySelectorAll("[data-task-answer]")
      .forEach((e) => (e.hidden = !answersShown));
    $("toggleAnswers").setAttribute("aria-pressed", String(answersShown));
    $("toggleAnswers").textContent = answersShown
      ? "Жауаптарды жасыру"
      : "Жауаптарды көрсету";
    $("answerStatus").textContent = answersShown
      ? "Жауаптар көрсетілуде · мұғалім көрінісі"
      : "Жауаптар жасырылған";
  }
  function chooseLevel(level) {
    selectedLevel = level;
    document
      .querySelectorAll("[data-work-level]")
      .forEach((e) => (e.hidden = e.dataset.workLevel !== level));
    document
      .querySelectorAll("[data-level-select]")
      .forEach((e) =>
        e.setAttribute("aria-pressed", String(e.dataset.levelSelect === level)),
      );
  }
  function chooseGame() {
    const games = ConstructorGameLinks.list(GameLearning);
    selectedGame = games.find((g) => g.id === $("chooseGame").value) || null;
    $("gameChoice").replaceChildren();
    if (selectedGame)
      $("gameChoice").append(
        node("h3", selectedGame.title),
        node("p", selectedGame.purpose),
        node("p", selectedGame.rule),
        node("span", selectedGame.formats.join(" · "), "iu-badge"),
      );
    if (current) LessonGames.describe(current, GameLearning, $("gameChoice"));
  }
  function personalInput() {
    return {
      homeworkText: $("personalHomework").value,
      notes: $("personalNotes").value,
      textbook: {
        paragraph: $("textbookParagraph").value,
        exercise: $("textbookExercise").value,
      },
    };
  }
  function qmjPreview() {
    const p = LessonQmj.plan(
        current.material,
        current.catalog,
        personalInput(),
        selectedGame,
      ),
      out = $("qmjPreview");
    out.replaceChildren(
      node("h3", p.title),
      node("p", p.context),
      node("p", "Бөлім: " + p.section),
      node("h4", "Оқу мақсаттары · КТП"),
      node("p", p.objective),
      node("h4", "Сабақ мақсаты"),
      node("p", p.goal || "Әзірге енгізілмеген"),
      node(
        "p",
        "Алдыңғы білім: " + (p.priorKnowledge || "Әзірге енгізілмеген"),
      ),
      node("p", "Ресурстар: " + p.resources.join(", ")),
      node("p", `${p.minutes} минут · ${p.tasks}`),
    );
    const table = node("table"),
      head = node("thead"),
      row = node("tr");
    for (const title of ["Кезең / уақыт", "Мұғалім әрекеті", "Оқушы әрекеті"]) {
      const th = node("th", title);
      th.scope = "col";
      row.append(th);
    }
    head.append(row);
    const body = node("tbody");
    for (const stage of p.stages) {
      const tr = node("tr");
      tr.append(
        node("td", `${stage.title} · ${stage.minutes} мин`),
        node("td", stage.teacher),
        node("td", stage.student),
      );
      body.append(tr);
    }
    table.append(head, body);
    out.append(table, node("h4", "Бағалау критерийлері мен дескрипторлар"));
    for (const a of p.assessment) {
      out.append(node("p", a.criterion));
      const list = node("ul");
      for (const d of a.descriptors)
        list.append(node("li", `${d.text} — ${d.points} ұпай`));
      out.append(list);
    }
    out.append(
      node("p", "Таңдалған ойын: " + p.game),
      node("h4", "Ортақ үй тапсырмасы"),
    );
    for (const text of p.commonHomework) out.append(node("p", text));
    out.append(node("h4", "Мұғалім енгізген үй тапсырмасы"));
    for (const text of p.homework.length
      ? p.homework
      : ["Әзірге енгізілмеген."])
      out.append(node("p", text));
  }
  function render(material, catalog) {
    const c = catalog.identity;
    current = { material, catalog };
    answersShown = false;
    selectedLevel = "A";
    selectedGame = null;
    answerVisibility();
    $("teacherControls").hidden = false;
    $("lessonNavigation").hidden = false;
    $("materialBody").hidden = false;
    $("materialLogin").hidden = true;
    $("materialTitle").textContent = catalog.lesson.title;
    document.title = catalog.lesson.title + " · iUSTAZ";
    $("materialTitle").tabIndex = -1;
    $("materialContext").textContent =
      `${c.grade}-сынып · ${catalog.subjectTitle} · ${c.quarter}-тоқсан · №${catalog.lesson.number} · ${catalog.lesson.section}`;
    $("materialObjective").textContent = catalog.lesson.objective;
    $("materialId").textContent = catalog.id;
    $("legacyMaterial").href = "lesson.html?" + query(c);
    $("legacyMaterial").hidden = false;
    $("constructorMaterial").href =
      "constructor.html#lesson=" +
      encodeURIComponent([c.grade, c.subject, c.quarter, c.number].join("|"));
    $("constructorMaterial").hidden = false;
    $("videoStatus").textContent =
      material.video?.publication === "published"
        ? material.video.title
        : "Видеосабақ жақын арада енгізіледі";
    $("playVideo").hidden = material.video?.publication !== "published";
    for (const id of [
      "materialTheory",
      "materialExamples",
      "materialPlan",
      "materialGroups",
      "materialIndividual",
      "materialAssessment",
      "materialHomework",
      "materialQmj",
      "materialGames",
    ])
      $(id).replaceChildren();
    for (const b of material.theory)
      $("materialTheory").append(
        b.kind === "visual"
          ? LessonVisuals.figure(b.visual, b.text)
          : b.kind === "formula"
            ? LessonVisuals.formula(b.text)
            : node(b.kind === "heading" ? "h3" : "p", b.text),
      );
    if (!material.theory.length) empty($("materialTheory"));
    for (const e of material.examples) {
      const a = node("article", undefined, "material-task");
      a.append(node("h3", e.title));
      const ol = node("ol");
      let count = Math.min(1, e.steps.length);
      const result = node("strong", "Нәтиже: " + e.answer),
        next = node("button", "Келесі қадам", "iu-button");
      next.type = "button";
      const draw = () => {
        ol.replaceChildren();
        for (const step of e.steps.slice(0, count)) ol.append(node("li", step));
        result.hidden = count < e.steps.length;
        next.hidden = count >= e.steps.length;
      };
      next.onclick = () => {
        count = Math.min(count + 1, e.steps.length);
        draw();
      };
      draw();
      a.append(ol, next, result);
      $("materialExamples").append(a);
    }
    if (!material.examples.length) empty($("materialExamples"));
    const ref = material.presentation;
    $("presentationStatus").textContent = ref
      ? `Ортақ блок: ${ref.id}. Осы сабаққа ${ref.startSlide}–${ref.endSlide} слайдтары арналған.`
      : "Презентация байланыстырылмаған.";
    $("openPresentation").hidden = !ref;
    for (const p of material.lessonPlan) {
      const row = node("article", undefined, "material-plan-row");
      row.append(
        node("strong", `${p.title} · ${p.minutes} минут`),
        node("p", "Мұғалім: " + p.teacher),
        node("p", "Оқушы: " + p.student),
      );
      $("materialPlan").append(row);
    }
    if (!material.lessonPlan.length) empty($("materialPlan"));
    pairCount = material.pairWork.length ? 1 : 0;
    pair();
    for (const g of material.groupWork) {
      const card = showTask(g.task);
      card.prepend(node("h3", g.title));
      $("materialGroups").append(card);
    }
    if (!material.groupWork.length) empty($("materialGroups"));
    for (const level of ["A", "B", "C"]) {
      const section = node("section");
      section.dataset.workLevel = level;
      section.hidden = level !== selectedLevel;
      section.append(node("h3", level + " деңгейі"));
      for (const t of material.individualWork[level])
        section.append(showTask(t));
      if (!material.individualWork[level].length) empty(section);
      $("materialIndividual").append(section);
    }
    for (const a of material.assessment) {
      const block = node("article");
      block.append(node("strong", a.criterion));
      const ul = node("ul");
      for (const d of a.descriptors)
        ul.append(node("li", `${d.text} — ${d.points} ұпай`));
      block.append(ul);
      $("materialAssessment").append(block);
    }
    if (!material.assessment.length) empty($("materialAssessment"));
    for (const t of material.homework)
      $("materialHomework").append(showTask(t));
    if (!material.homework.length) empty($("materialHomework"));
    $("materialQmj").append(
      node(
        "p",
        "Сабақ мақсаты: " + (material.qmj.lessonGoal || "Әзірге енгізілмеген."),
      ),
      node(
        "p",
        "Алдыңғы білім: " +
          (material.qmj.priorKnowledge || "Әзірге енгізілмеген."),
      ),
    );
    const resources = node("ul");
    for (const r of material.qmj.resources) resources.append(node("li", r));
    $("materialQmj").append(resources);
    const topic = LessonGames.key(material, c, GameLearning);
    $("chooseGame").replaceChildren();
    $("chooseGame").disabled = !GameLearning.lessons[topic];
    $("launchSelectedGame").hidden = !GameLearning.lessons[topic];
    if (GameLearning.lessons[topic])
      for (const game of ConstructorGameLinks.list(GameLearning)) {
        const a = node("a", game.title, "iu-button");
        a.href = ConstructorGameLinks.link();
        a.dataset.gameLink = game.id;
        a.setAttribute("aria-label", game.title + " — ойындар каталогын ашу");
        $("materialGames").append(a);
        const option = node("option", game.title);
        option.value = game.id;
        $("chooseGame").append(option);
      }
    else
      $("materialGames").append(
        node(
          "p",
          "Бұл КТП сабағына ойын тапсырмаларының сәйкестігі әзірге расталмаған. Қолданыстағы ойындар банкі 5–7-сыныптарды қамтиды.",
        ),
      );
    chooseGame();
    try {
      privateStore = new LessonMaterialsPrivate.LocalHomework(
        localStorage,
        owner.uid,
      );
      const d = privateStore.read(catalog.id);
      privateRevision = d.revision;
      $("personalHomework").value = d.homeworkText;
      $("personalNotes").value = d.notes;
      $("textbookParagraph").value = d.textbook?.paragraph || "";
      $("textbookExercise").value = d.textbook?.exercise || "";
      $("textbookParagraph").disabled = false;
      $("textbookExercise").disabled = false;
      $("privateHomework").hidden = false;
      $("savePersonal").disabled = false;
      $("personalHomework").disabled = false;
      $("personalNotes").disabled = false;
      $("personalStatus").textContent =
        "Жеке өзгерістер тек осы пайдаланушы және осы сабақ үшін оқылады.";
    } catch (e) {
      clearPrivate();
      $("privateHomework").hidden = false;
      $("personalStatus").textContent = e.message;
    }
  }
  async function load(c) {
    if (!owner) return;
    const ticket = ++version,
      uid = owner.uid;
    request?.abort();
    request = new AbortController();
    const signal = request.signal;
    current = null;
    clearPrivate();
    closeDialogs();
    $("materialBody").hidden = true;
    $("teacherControls").hidden = true;
    $("lessonNavigation").hidden = true;
    for (const id of [
      "legacyMaterial",
      "constructorMaterial",
      "previousLesson",
      "nextLesson",
    ])
      $(id).hidden = true;
    message("Таңдалған КТП сабағы мен оның мазмұны жүктелуде…");
    try {
      const catalog = await LessonMaterialsKtp.resolve(c);
      if (signal.aborted || ticket !== version || owner?.uid !== uid) return;
      const data = await repo.load(c, { signal });
      if (signal.aborted || ticket !== version || owner?.uid !== uid) return;
      render(data.material, catalog);
      $("materialTitle").focus({ preventScroll: true });
      message(
        data.available
          ? "Сабақ материалы дайын."
          : "КТП сабағы бар. Бұл сабақтың мазмұны әлі модульдік қорға көшірілмеген; бос бөлімдер қате емес.",
        false,
        data.available,
      );
      const rows = await LessonMaterialsKtp.rows(c);
      if (ticket !== version || owner?.uid !== uid) return;
      const index = rows.findIndex((r) => r.number === c.number);
      for (const [id, step] of [
        ["previousLesson", -1],
        ["nextLesson", 1],
      ]) {
        const row = rows[index + step];
        $(id).hidden = !row;
        $(id).onclick = () => navigate({ ...c, number: row.number });
      }
      document
        .querySelector('.iu-nav-item[href="index.html#classes"]')
        ?.setAttribute("aria-current", "page");
    } catch (e) {
      if (e.name === "AbortError" || ticket !== version) return;
      message(e.message || "Сабақ жүктелмеді.", true);
    }
  }
  function navigate(c) {
    history.pushState(null, "", "lesson-material.html?" + query(c));
    return load(M.identity(c));
  }
  function assets() {
    if (!katexReady) {
      katexReady = Promise.all([
        new Promise((yes, no) => {
          if (window.katex) return yes();
          const s = document.createElement("script");
          s.src = "vendor/katex/katex.min.js";
          s.onload = yes;
          s.onerror = no;
          document.head.append(s);
        }),
        new Promise((yes, no) => {
          const l = document.createElement("link");
          l.rel = "stylesheet";
          l.href = "vendor/katex/katex.min.css";
          l.onload = yes;
          l.onerror = no;
          document.head.append(l);
        }),
      ]).catch(() => {
        katexReady = null;
        throw Error("Формула кітапханасы жүктелмеді. Қайта көріңіз.");
      });
    }
    return katexReady;
  }
  function drawSlide() {
    const s = slides.slides[slideIndex];
    $("slideBody").replaceChildren(node("h3", s.title), node("p", s.text));
    if (s.formula) {
      const f = node("div");
      katex.render(s.formula, f, {
        throwOnError: false,
        trust: false,
        strict: "error",
        maxExpand: 100,
        displayMode: true,
      });
      $("slideBody").append(f);
    }
    if (s.diagram) $("slideBody").append(LessonVisuals.figure(s.diagram));
    slideStepCount = 0;
    drawSlideSteps();
    $("slidePosition").textContent =
      `${slides.start + slideIndex} / ${slides.total} слайд · Осы сабақтың аралығы: ${slides.start}–${slides.end}`;
    $("previousSlide").disabled = slideIndex === 0;
    $("nextSlide").disabled = slideIndex === slides.slides.length - 1;
  }
  function drawSlideSteps() {
    const steps = slides?.slides[slideIndex].steps || [];
    $("slideSteps").replaceChildren();
    for (const text of steps.slice(0, slideStepCount))
      $("slideSteps").append(node("li", text));
    $("nextSlideStep").hidden = slideStepCount >= steps.length;
    $("slideStepPosition").textContent = steps.length
      ? `${slideStepCount} / ${steps.length} түсіндіру қадамы ашылды`
      : "";
  }
  function changeSlide(step) {
    if (!slides) return;
    slideIndex = Math.max(
      0,
      Math.min(slides.slides.length - 1, slideIndex + step),
    );
    drawSlide();
    $("slideBody").focus({ preventScroll: true });
  }
  function fullscreenState() {
    $("fullscreenSlides").setAttribute(
      "aria-pressed",
      String(
        document.fullscreenElement === $("presentationScreen") ||
          $("presentationDialog").classList.contains("presentation-expanded"),
      ),
    );
  }
  async function fullscreen() {
    const dialog = $("presentationDialog"),
      screen = $("presentationScreen");
    if (!dialog.open) return;
    if (document.fullscreenElement === screen) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (dialog.classList.contains("presentation-expanded")) {
      dialog.classList.remove("presentation-expanded");
      fullscreenState();
      return;
    }
    try {
      if (!screen.requestFullscreen) throw Error("unavailable");
      await screen.requestFullscreen();
      if (!dialog.open || !owner) await document.exitFullscreen();
    } catch {
      if (dialog.open) {
        dialog.classList.add("presentation-expanded");
        $("fullscreenStatus").textContent =
          "Браузер толық экранды қолдамайды. Кеңейтілген көрініс ашылды.";
      }
    }
    fullscreenState();
  }
  function boot() {
    // The shared shell hides profile text on narrow screens. Keep its control named here.
    document
      .querySelector(".iu-profile > summary")
      ?.setAttribute("aria-label", "Профиль мәзірі");
    requireRole(["teacher", "admin", "super_admin"]);
    $("toggleAnswers").onclick = () => {
      if (!current || !owner) return;
      answersShown = !answersShown;
      answerVisibility();
    };
    document
      .querySelectorAll("[data-level-select]")
      .forEach((b) => (b.onclick = () => chooseLevel(b.dataset.levelSelect)));
    $("chooseGame").onchange = chooseGame;
    const showQmj = (e) => {
      if (!current || !owner) return;
      qmjPreview();
      qmjOwner = { version, uid: owner.uid, opener: e.currentTarget };
      $("qmjDialog").showModal();
    };
    $("openQmj").onclick = showQmj;
    $("openQmjInline").onclick = showQmj;
    $("closeQmj").onclick = () => $("qmjDialog").close();
    $("printQmj").onclick = () => window.print();
    $("qmjDialog").addEventListener("close", () => {
      $("qmjPreview").replaceChildren();
      if (qmjOwner?.version === version && qmjOwner.uid === owner?.uid)
        qmjOwner.opener.focus();
      qmjOwner = null;
    });
    $("nextPair").onclick = () => {
      if (!current) return;
      pairCount = Math.min(pairCount + 1, current.material.pairWork.length);
      pair();
    };
    $("retryMaterial").onclick = () => {
      repo.clear();
      try {
        load(contextFromURL());
      } catch (e) {
        message(e.message, true);
      }
    };
    $("savePersonal").onclick = () => {
      if (!owner || !current || !privateStore) return;
      try {
        const d = privateStore.save(
          current.catalog.id,
          personalInput(),
          privateRevision,
        );
        privateRevision = d.revision;
        $("personalStatus").textContent =
          "Сақталды. Тек осы браузерде; серверге жіберілген жоқ.";
      } catch (e) {
        $("personalStatus").textContent = e.message;
      }
    };
    $("openPresentation").onclick = async () => {
      if (!current || !owner) return;
      const ticket = version,
        uid = owner.uid,
        ref = current.material.presentation;
      $("openPresentation").disabled = true;
      try {
        const result = await repo.slides(ref, { signal: request.signal });
        await assets();
        if (ticket !== version || owner?.uid !== uid) return;
        slides = result;
        slideIndex = 0;
        $("presentationTitle").textContent = slides.title;
        drawSlide();
        dialogOwner = { version: ticket, uid };
        $("presentationDialog").showModal();
        $("slideBody").focus({ preventScroll: true });
      } catch (e) {
        if (ticket === version && e.name !== "AbortError")
          $("presentationStatus").textContent = e.message;
      } finally {
        $("openPresentation").disabled = false;
      }
    };
    $("closePresentation").onclick = () => $("presentationDialog").close();
    $("presentationDialog").addEventListener("close", () => {
      if (document.fullscreenElement === $("presentationScreen"))
        document.exitFullscreen().catch(() => {});
      $("presentationDialog").classList.remove("presentation-expanded");
      $("fullscreenStatus").textContent = "";
      fullscreenState();
      $("slideBody").replaceChildren();
      $("slideSteps").replaceChildren();
      slides = null;
      if (
        dialogOwner?.version === version &&
        dialogOwner.uid === owner?.uid &&
        $("openPresentation").getClientRects().length
      )
        $("openPresentation").focus();
      dialogOwner = null;
    });
    $("previousSlide").onclick = () => changeSlide(-1);
    $("nextSlide").onclick = () => changeSlide(1);
    $("nextSlideStep").onclick = () => {
      if (!slides) return;
      slideStepCount = Math.min(
        slideStepCount + 1,
        (slides.slides[slideIndex].steps || []).length,
      );
      drawSlideSteps();
      if ($("nextSlideStep").hidden)
        $("slideBody").focus({ preventScroll: true });
    };
    $("fullscreenSlides").onclick = fullscreen;
    document.addEventListener("fullscreenchange", fullscreenState);
    $("presentationDialog").addEventListener("keydown", (e) => {
      if (
        !slides ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.target.matches("input,textarea,select")
      )
        return;
      if (
        [
          "ArrowRight",
          "PageDown",
          "ArrowLeft",
          "PageUp",
          "Home",
          "End",
        ].includes(e.key)
      ) {
        e.preventDefault();
        changeSlide(
          e.key === "Home"
            ? -slides.slides.length
            : e.key === "End"
              ? slides.slides.length
              : ["ArrowRight", "PageDown"].includes(e.key)
                ? 1
                : -1,
        );
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        fullscreen();
      } else if (e.key === " " && !e.target.closest("button,a,summary")) {
        e.preventDefault();
        $("nextSlideStep").click();
      }
    });
    $("playVideo").onclick = () => {
      const video = current?.material.video;
      if (!owner || video?.publication !== "published") return;
      const frame = node("iframe");
      frame.title = video.title;
      frame.src = "https://www.youtube-nocookie.com/embed/" + video.id;
      frame.referrerPolicy = "no-referrer";
      frame.allow = "fullscreen";
      frame.allowFullscreen = true;
      $("videoBody").replaceChildren(frame);
      $("videoTitle").textContent = video.title;
      $("videoDialog").showModal();
    };
    $("closeVideo").onclick = () => $("videoDialog").close();
    $("videoDialog").addEventListener("close", () =>
      $("videoBody").replaceChildren(),
    );
    window.addEventListener("popstate", () => {
      try {
        load(contextFromURL());
      } catch (e) {
        message(e.message, true);
      }
    });
    window.addEventListener("pagehide", () => {
      version++;
      request?.abort();
      closeDialogs();
      clearPrivate();
    });
    ConstructorAuth.watch(
      (user) => {
        owner = user;
        try {
          load(contextFromURL());
        } catch (e) {
          message(e.message, true);
        }
      },
      (text) => {
        version++;
        request?.abort();
        owner = null;
        current = null;
        clearPrivate();
        closeDialogs();
        $("materialBody").hidden = true;
        $("teacherControls").hidden = true;
        $("lessonNavigation").hidden = true;
        answersShown = false;
        answerVisibility();
        $("materialTitle").textContent = "Сабақ материалы";
        document.title = "Сабақ кеңістігі · iUSTAZ";
        $("materialContext").textContent = "";
        $("materialObjective").textContent = "";
        $("materialId").textContent = "";
        for (const id of [
          "legacyMaterial",
          "constructorMaterial",
          "previousLesson",
          "nextLesson",
        ])
          $(id).hidden = true;
        $("materialLogin").hidden = false;
        message(text);
      },
    );
    window.LessonMaterialDemo = {
      stats: () => repo.stats(),
      currentId: () => current?.catalog.id || null,
    };
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
