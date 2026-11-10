/* Test-only admin feature. No Gemini key, publishing or writes to legacy material controls. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    el = (tag, text) => {
      const x = document.createElement(tag);
      if (text !== undefined) x.textContent = text;
      return x;
    };
  let mathReady = null;
  function formula(target, text) {
    target.textContent = text;
    if (!text) return;
    mathReady ??= Promise.all([
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
      mathReady = null;
    });
    mathReady.then(() => {
      if (target.isConnected && window.katex)
        katex.render(text, target, {
          throwOnError: false,
          trust: false,
          strict: "error",
          maxExpand: 100,
          maxSize: 10,
        });
    });
  }
  let epoch = 0,
    owner = null,
    opened = false,
    busy = false,
    current = null,
    position = 0,
    sessionKey = null,
    enabled = false;
  const root = $("aiLessonLab"),
    open = $("aiOpenLab");
  if (!root || !open) return;
  const status = (text) => {
    $("aiLabStatus").textContent = text;
  };
  function clear() {
    epoch++;
    owner = null;
    current = null;
    sessionKey = null;
    busy = false;
    enabled = false;
    $("aiSlides").hidden = true;
    $("aiSlide").replaceChildren();
    $("aiLessonContext").textContent = "";
    $("aiLimit").textContent = "";
    open.hidden = true;
    root.hidden = true;
    $("aiDraftContent").replaceChildren();
    $("aiDraftList").replaceChildren();
    $("aiUsage").replaceChildren();
    $("aiGenerate").disabled = true;
  }
  let serviceReady = null;
  async function availability() {
    serviceReady ??= fetch("/api/ai-lessons/availability", {
      cache: "no-store",
      credentials: "omit",
    })
      .then(async (r) => {
        const v = await r.json();
        if (!r.ok || v.service !== "iustaz-ai-lesson-lab" || v.version !== 1)
          throw Error();
      })
      .catch(() => {
        serviceReady = null;
        throw Error(
          "AI сервері қосылмаған. GitHub Pages бұл API-ді өзі орындамайды.",
        );
      });
    return serviceReady;
  }
  async function call(path, options = {}) {
    const version = epoch,
      user = owner;
    if (!user) throw Error("Админ сессиясын растаңыз.");
    // Probe without a Firebase token: an ordinary static host must never receive it.
    await availability();
    if (version !== epoch || owner !== user)
      throw Error("Кіру сессиясы өзгерді.");
    const token = await user.getIdToken();
    if (version !== epoch || owner !== user)
      throw Error("Кіру сессиясы өзгерді.");
    let response;
    try {
      response = await fetch("/api/ai-lessons/" + path, {
        ...options,
        cache: "no-store",
        credentials: "omit",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + token,
        },
      });
    } catch {
      throw Error(
        "AI серверіне қосылу мүмкін емес. Серверді іске қосу нұсқаулығын қараңыз.",
      );
    }
    if (version !== epoch || owner !== user)
      throw Error("Кіру сессиясы өзгерді.");
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error(
        "AI сервері қосылмаған. GitHub Pages бұл API-ді өзі орындамайды.",
      );
    }
    if (version !== epoch || owner !== user)
      throw Error("Кіру сессиясы өзгерді.");
    if (!response.ok)
      throw Error(data.error?.message || "AI сервері сұрауды қабылдамады.");
    return data;
  }
  function usage(data) {
    const box = $("aiUsage");
    box.replaceChildren();
    const labels = {
      requests: "Сервер сұрауы",
      totalLatencyMs: "Жалпы жауап уақыты, мс",
      completed: "Сақталған жоба",
      failed: "Сәтсіз сұрау",
      pending: "Орындалуда",
      geminiRequests: "Gemini сұрауы",
      fixtureRequests: "Сынақ дерегі",
      usageReported: "Токен есебі бар",
      usageUnknown: "Токені белгісіз",
      promptTokens: "Кіріс токендері",
      outputTokens: "Жауап токендері",
      totalTokens: "Белгілі жалпы токен",
      cachedTokens: "Кэш токендері",
      thoughtTokens: "Ойлау токендері",
    };
    for (const [k, label] of Object.entries(labels)) {
      const card = el("div");
      card.append(el("strong", String(data[k])), el("span", label));
      box.append(card);
    }
    $("aiLimit").textContent =
      `Бүгін: ${data.today}/${data.dailyLimit} (UTC тәулік). Сәтсіз/үзіліп қалған сұраулар лимиттен алынады. Токені белгісіз сұрау тегін деген сөз емес. Ақшалай құны есептелмейді.`;
  }
  function task(t) {
    const box = el("article");
    box.className = "ai-task";
    box.append(
      el("h4", t.prompt),
      el("p", "Жауап: " + t.answer),
      el("p", "Шешімі: " + t.solution),
      el("p", "Критерий: " + t.criteria),
    );
    const ul = el("ul");
    for (const d of t.descriptors)
      ul.append(el("li", d.text + ` (${d.points} балл)`));
    box.append(ul);
    return box;
  }
  function section(title) {
    const details = el("details"),
      summary = el("summary", title);
    details.append(summary);
    $("aiDraftContent").append(details);
    return details;
  }
  function slide() {
    if (!current) return;
    const s = current.presentation.slides[position],
      box = $("aiSlide");
    box.replaceChildren(el("h4", s.title), el("p", s.text));
    const f = el("div");
    box.append(f);
    formula(f, s.formula);
    const ol = el("ol");
    for (const step of s.steps) ol.append(el("li", step));
    box.append(ol);
    $("aiSlideCount").textContent = `${position + 1} / 12 слайд`;
    $("aiPrevSlide").disabled = position === 0;
    $("aiNextSlide").disabled = position === 11;
  }
  function render(draft) {
    current = draft;
    position = 0;
    const m = draft.material,
      box = $("aiDraftContent");
    box.replaceChildren();
    box.append(
      el("h3", draft.catalog.lesson.title),
      el("p", draft.catalog.lesson.objective),
      el(
        "p",
        "Күйі: тек админге арналған жоба. Математикалық және педагогикалық тексеру міндетті. Жариялау өшірулі.",
      ),
      el(
        "p",
        draft.source === "fixture"
          ? "Сынақ деректері. Gemini шақырылмаған."
          : "Gemini жасаған жоба. Бұл автоматты мақұлдау емес.",
      ),
    );
    const theory = section("Теория");
    for (const b of m.theory)
      theory.append(el(b.kind === "heading" ? "h4" : "p", b.text));
    const examples = section("Шығарылған мысалдар");
    for (const e of m.examples) {
      examples.append(el("h4", e.title));
      const ol = el("ol");
      for (const s of e.steps) ol.append(el("li", s));
      examples.append(ol, el("p", "Жауап: " + e.answer));
    }
    const pairs = section("3 жұптық тапсырма");
    m.pairWork.forEach((t) => pairs.append(task(t)));
    const groups = section("4 топтық тапсырма");
    for (const g of m.groupWork) groups.append(el("h4", g.title), task(g.task));
    for (const level of ["A", "B", "C"]) {
      const group = section(level + " деңгейі");
      m.individualWork[level].forEach((t) => group.append(task(t)));
    }
    const assessment = section("Бағалау және дескрипторлар");
    for (const a of m.assessment) {
      assessment.append(el("h4", a.criterion));
      for (const d of a.descriptors)
        assessment.append(el("p", d.text + ` (${d.points} балл)`));
    }
    const home = section("Үй тапсырмасы");
    m.homework.forEach((t) => home.append(task(t)));
    const q = section("ҚМЖ алдын ала көрінісі (45 минут)"),
      plan = LessonQmj.plan(m, draft.catalog);
    q.append(
      el("h4", plan.title),
      el("p", plan.context),
      el("p", "Оқу мақсаты: " + plan.objective),
      el("p", "Мақсат: " + plan.goal),
      el("p", "Алдыңғы білім: " + plan.priorKnowledge),
      el("p", "Ресурстар: " + plan.resources.join(" · ")),
    );
    const wrap = el("div");
    wrap.className = "ai-table";
    const table = el("table"),
      head = el("tr");
    for (const s of ["Кезең", "Минут", "Мұғалім", "Оқушы"])
      head.append(el("th", s));
    table.append(head);
    for (const s of plan.stages) {
      const row = el("tr");
      for (const v of [s.title, String(s.minutes), s.teacher, s.student])
        row.append(el("td", v));
      table.append(row);
    }
    wrap.append(table);
    q.append(wrap);
    $("aiSlides").hidden = false;
    slide();
  }
  async function refresh() {
    const version = epoch,
      [stats, list] = await Promise.all([call("stats"), call("drafts")]);
    if (version !== epoch) return;
    usage(stats);
    const box = $("aiDraftList");
    box.replaceChildren();
    for (const d of list.drafts) {
      const b = el(
        "button",
        `${new Date(d.createdAt).toLocaleString("kk-KZ")} · ${d.source === "fixture" ? "Сынақ" : "Gemini"}`,
      );
      b.type = "button";
      b.onclick = async () => {
        try {
          render((await call("drafts/" + d.id)).draft);
        } catch (e) {
          status(e.message);
        }
      };
      box.append(b);
    }
    if (!list.drafts.length)
      box.append(el("p", "Осы админнің сақталған жобалары жоқ."));
  }
  async function load() {
    try {
      const data = await call("context");
      enabled = data.enabled;
      $("aiLessonContext").textContent =
        `${data.catalog.identity.grade}-сынып · ${data.catalog.subjectTitle} · ${data.catalog.identity.quarter}-тоқсан · №${data.catalog.lesson.number} · ${data.catalog.lesson.title}. Мақсат: ${data.catalog.lesson.objective}`;
      $("aiGenerate").disabled = !data.enabled || busy;
      status(
        !data.enabled
          ? "Сервердегі генерация өшірулі. Құпия айнымалылар мен credentials баптауын қараңыз."
          : data.source === "fixture"
            ? "Сынақ режимі: Gemini API шақырылмайды, токен қолданылмайды."
            : "Gemini режимі: бір сұрау ақылы болуы мүмкін. Нәтиже тек жеке админ жобасы ретінде сақталады.",
      );
      await refresh();
    } catch (e) {
      $("aiGenerate").disabled = true;
      status(e.message);
    }
  }
  open.onclick = () => {
    opened = !opened;
    root.hidden = !opened;
    if (opened) {
      root.scrollIntoView({ block: "start" });
      load();
    }
  };
  $("aiRefresh").onclick = () => load();
  $("aiGenerate").onclick = async () => {
    if (busy || !owner) return;
    busy = true;
    sessionKey ??= crypto.randomUUID();
    $("aiGenerate").disabled = true;
    status("Жоба дайындалуда. Қайта баспаңыз; нәтижесі шыққанша күтіңіз.");
    try {
      const { draft } = await call("drafts", {
        method: "POST",
        body: JSON.stringify({
          lessonId: "ktp1:8:algebra:2:3",
          requestId: sessionKey,
        }),
      });
      render(draft);
      sessionKey = null;
      status(
        "Жоба тек жеке сервер қоймасында сақталды. Математиканы админ тексеруі қажет.",
      );
    } catch (e) {
      status(
        e.message +
          " Қайта жіберу алдыңғы сұрау ID-ін сақтайды. Жаңа әрекет үшін «Жаңа сұрау» таңдаңыз.",
      );
    } finally {
      busy = false;
      await refresh().catch(() => {});
      $("aiGenerate").disabled = !owner || !enabled;
    }
  };
  $("aiNewRequest").onclick = () => {
    if (busy) return;
    sessionKey = null;
    status(
      "Жаңа сұрау ID-і келесі әрекетте жасалады. Лимит пен Gemini қолдану шығынын ескеріңіз.",
    );
  };
  $("aiPrevSlide").onclick = () => {
    if (position > 0) {
      position--;
      slide();
    }
  };
  $("aiNextSlide").onclick = () => {
    if (position < 11) {
      position++;
      slide();
    }
  };
  $("aiSlides").onkeydown = (e) => {
    if (e.key === "ArrowRight" && position < 11) {
      position++;
      slide();
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && position > 0) {
      position--;
      slide();
      e.preventDefault();
    }
  };
  clear();
  Promise.resolve()
    .then(() => ensureFirebase())
    .then((sdk) =>
      sdk.auth().onAuthStateChanged(async (user) => {
        clear();
        const version = epoch;
        if (!user?.uid) return;
        try {
          const snap = await sdk
            .firestore()
            .collection("users")
            .doc(user.uid)
            .get();
          if (version !== epoch) return;
          const role = snap.exists ? snap.data().role : null;
          if (!["admin", "super_admin"].includes(role)) return;
          owner = user;
          open.hidden = false;
        } catch {
          clear();
        }
      }, clear),
    )
    .catch(clear);
})();
