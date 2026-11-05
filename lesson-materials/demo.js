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
    dialogOwner = null;
  function message(text, error = false) {
    $("materialStatus").textContent = text;
    $("materialStatus").className = error ? "iu-error" : "";
    $("retryMaterial").hidden = !error;
  }
  function closeDialogs() {
    for (const id of ["presentationDialog", "videoDialog"])
      if ($(id).open) $(id).close();
    $("videoBody").replaceChildren();
    $("slideBody").replaceChildren();
    slides = null;
  }
  function clearPrivate() {
    privateStore = null;
    privateRevision = 0;
    $("privateHomework").hidden = true;
    $("personalHomework").value = "";
    $("personalNotes").value = "";
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
    const d = node("details"),
      summary = node("summary", "Жауап пен шешімді қарау");
    d.append(
      summary,
      node("pre", [t.answer, t.solution].filter(Boolean).join("\n")),
    );
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
  }
  function render(material, catalog) {
    const c = catalog.identity;
    current = { material, catalog };
    $("materialBody").hidden = false;
    $("materialLogin").hidden = true;
    $("materialTitle").textContent = catalog.lesson.title;
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
        : "Видеосабақ жарияланбаған немесе метадерегі жоқ.";
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
        node(b.kind === "formula" ? "pre" : "p", b.text),
      );
    if (!material.theory.length) empty($("materialTheory"));
    for (const e of material.examples) {
      const a = node("article", undefined, "material-task");
      a.append(node("h3", e.title));
      const ol = node("ol");
      for (const step of e.steps) ol.append(node("li", step));
      a.append(ol, node("strong", e.answer));
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
    const topic = [c.grade, c.subject, c.quarter, c.number].join("-");
    if (GameLearning.lessons[topic])
      for (const game of ConstructorGameLinks.list(GameLearning)) {
        const a = node("a", game.title, "iu-button");
        a.href = ConstructorGameLinks.link();
        a.dataset.gameLink = game.id;
        a.setAttribute("aria-label", game.title + " — ойындар каталогын ашу");
        $("materialGames").append(a);
      }
    else
      $("materialGames").append(
        node(
          "p",
          "Бұл КТП сабағына ойын тапсырмаларының сәйкестігі әзірге расталмаған. Қолданыстағы ойындар банкі 5–7-сыныптарды қамтиды.",
        ),
      );
    try {
      privateStore = new LessonMaterialsPrivate.LocalHomework(
        localStorage,
        owner.uid,
      );
      const d = privateStore.read(catalog.id);
      privateRevision = d.revision;
      $("personalHomework").value = d.homeworkText;
      $("personalNotes").value = d.notes;
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
          ? "Демонстрациялық сабақ жүктелді. Мазмұнын мұғалім тексеруі тиіс."
          : "КТП сабағы бар. Бұл сабақтың мазмұны әлі модульдік қорға көшірілмеген; бос бөлімдер қате емес.",
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
    if (s.diagram) {
      const bar = node("div", undefined, "material-fraction-bar");
      bar.setAttribute("role", "img");
      bar.setAttribute(
        "aria-label",
        `${s.diagram.parts} тең бөліктің ${s.diagram.filled} бөлігі боялған`,
      );
      for (let i = 0; i < s.diagram.parts; i++)
        bar.append(
          node("span", undefined, i < s.diagram.filled ? "filled" : ""),
        );
      $("slideBody").append(bar);
    }
    $("slidePosition").textContent =
      `${slides.start + slideIndex} / ${slides.total} слайд · Осы сабақтың аралығы: ${slides.start}–${slides.end}`;
    $("previousSlide").disabled = slideIndex === 0;
    $("nextSlide").disabled = slideIndex === slides.slides.length - 1;
  }
  function boot() {
    // The shared shell hides profile text on narrow screens. Keep its control named here.
    document
      .querySelector(".iu-profile > summary")
      ?.setAttribute("aria-label", "Профиль мәзірі");
    requireRole(["teacher", "admin", "super_admin"]);
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
          {
            homeworkText: $("personalHomework").value,
            notes: $("personalNotes").value,
          },
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
      } catch (e) {
        if (ticket === version && e.name !== "AbortError")
          $("presentationStatus").textContent = e.message;
      } finally {
        $("openPresentation").disabled = false;
      }
    };
    $("closePresentation").onclick = () => $("presentationDialog").close();
    $("presentationDialog").addEventListener("close", () => {
      $("slideBody").replaceChildren();
      slides = null;
      if (
        dialogOwner?.version === version &&
        dialogOwner.uid === owner?.uid &&
        $("openPresentation").getClientRects().length
      )
        $("openPresentation").focus();
      dialogOwner = null;
    });
    $("previousSlide").onclick = () => {
      if (slides && slideIndex > 0) {
        slideIndex--;
        drawSlide();
      }
    };
    $("nextSlide").onclick = () => {
      if (slides && slideIndex < slides.slides.length - 1) {
        slideIndex++;
        drawSlide();
      }
    };
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
        $("materialTitle").textContent = "Сабақ материалы";
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
