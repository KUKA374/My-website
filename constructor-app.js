(function () {
  "use strict";
  const M = LessonModel,
    V = ConstructorView,
    $ = (id) => document.getElementById(id),
    E = V.esc;
  const A = {
    authTicket: 0,
    doc: null,
    owner: null,
    features: [],
    mode: "teacher",
    answers: false,
    stageId: null,
    notify(message) {
      $("saveStatus").textContent = message;
    },
    panel(name) {
      document.querySelector(".builder-grid").dataset.activePanel = name;
      document
        .querySelectorAll("[data-panel]")
        .forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.panel === name)),
        );
    },
    changed(structure = false) {
      if (!A.doc) return;
      A.doc.reviewed = false;
      A.doc.updatedAt = new Date().toISOString();
      if (structure) A.render();
      else A.refresh();
      A.persist?.();
    },
    refresh() {
      if (!A.doc) return;
      const x = A.doc,
        w = M.warnings(x);
      $("lessonMetrics").innerHTML =
        `<span>${M.total(x)} / ${x.duration} минут</span><span>${M.tasks(x).length} тапсырма</span><span>${M.points(x)} ұпай</span><span>${w.length ? "Тексеру қажет" : "Толық жоспар"}</span>`;
      $("lessonWarnings").replaceChildren(
        ...w.map((s) => {
          const li = document.createElement("li");
          li.textContent = s;
          return li;
        }),
      );
      $("reviewed").checked = x.reviewed;
      $("preview").innerHTML = V.render(x, A.mode, A.answers);
    },
    render() {
      if (!A.doc) return;
      metadata();
      blocks();
      $("reflectionMethod").value = A.doc.reflection.method;
      $("reflectionQuestions").value = A.doc.reflection.questions;
      $("teacherNotes").value = A.doc.teacherNotes;
      for (const f of A.features) f.render?.();
      A.refresh();
    },
    load(doc) {
      A.doc = M.check(doc, A.owner.uid);
      A.stageId = A.doc.stages[0].id;
      A.render();
    },
    field(label, id, value, extra = "") {
      return `<label for="${id}">${E(label)}</label><textarea id="${id}" ${extra}>${E(value)}</textarea>`;
    },
  };
  window.ConstructorApp = A;
  const fields = [
    ["title", "Сабақ тақырыбы — міндетті"],
    ["grade", "Сынып — міндетті"],
    ["subject", "Пән — міндетті"],
    ["quarter", "Тоқсан"],
    ["section", "Бөлім"],
    ["number", "Сабақ нөмірі"],
    ["objective", "Оқу мақсаттары — міндетті"],
    ["goal", "Сабақ мақсаттары — міндетті"],
    ["criteria", "Бағалау критерийлері"],
    ["values", "Құндылықтармен байланыс"],
    ["connections", "Пәнаралық байланыс"],
    ["resources", "Қажетті ресурстар"],
    ["previous", "Алдыңғы білім"],
  ];
  function metadata() {
    const x = A.doc;
    $("metadataFields").innerHTML =
      fields
        .map(
          ([k, label]) =>
            `<div class="${["title", "objective", "goal", "criteria"].includes(k) ? "wide" : ""}"><label for="meta-${k}">${label}</label>${["title", "grade", "subject", "quarter", "number"].includes(k) ? `<input id="meta-${k}" data-meta="${k}" maxlength="500" value="${E(k === "title" ? x.title : x.meta[k])}">` : `<textarea id="meta-${k}" data-meta="${k}" maxlength="20000">${E(x.meta[k])}</textarea>`}</div>`,
        )
        .join("") +
      `<div><label for="lessonDuration">Сабақ ұзақтығы</label><select id="lessonDuration">${[40, 45, 80].map((n) => `<option value="${n}" ${x.duration === n ? "selected" : ""}>${n} минут</option>`).join("")}</select></div>`;
  }
  function blocks() {
    $("blockEditor").innerHTML = A.doc.blocks
      .map(
        (b, i) =>
          `<article class="edit-card"><header><h3>${E(M.blockTypes[b.type])}</h3><button data-remove-block="${b.id}" type="button">Блокты алып тастау</button></header>${A.field(b.type === "image" ? "Суреттің HTTPS мекенжайы" : b.type === "table" ? "Бағандарды | белгісімен, жолдарды жаңа жолмен бөліңіз" : b.type === "formula" ? "LaTeX формуласы" : "Мазмұны", "block-" + b.id, b.body, `data-block="${b.id}"`)}${b.type === "image" ? A.field("Суреттің сипаттамасы — міндетті", "alt-" + b.id, b.aux, `data-alt="${b.id}"`) : ""}</article>`,
      )
      .join("");
  }
  function options(el, rows, selected) {
    el.replaceChildren(
      ...rows.map(([v, t]) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = t;
        return o;
      }),
    );
    if (rows.some(([v]) => String(v) === String(selected))) el.value = selected;
  }
  function subjects() {
    const g = $("catalogGrade").value;
    options(
      $("catalogSubject"),
      (curriculum[g]?.subjects || []).map((s) => [s.id, s.title]),
    );
  }
  async function topics() {
    const g = $("catalogGrade").value,
      s = $("catalogSubject").value,
      q = $("catalogQuarter").value;
    const ticket = ++topics.serial;
    $("catalogStatus").textContent = "Оқу деректері оқылуда…";
    try {
      await LessonCatalog.grade(g);
      if (ticket !== topics.serial || !A.doc) return;
      const rows = LessonCatalog.rows(g, s, q);
      options($("catalogSection"), [
        ["", "Барлық бөлімдер"],
        ...[...new Set(rows.map((r) => r.section))]
          .filter(Boolean)
          .map((v) => [v, v]),
      ]);
      topicOptions(rows);
      if (!rows.length) {
        A.doc.meta.grade = g;
        A.doc.meta.subjectId = s;
        A.doc.meta.subject =
          curriculum[g].subjects.find((x) => x.id === s)?.title || "";
        A.doc.meta.quarter = q;
        A.doc.meta.topicId = "";
        A.doc.meta.objective = "";
        A.changed(true);
        $("catalogStatus").textContent =
          "КТП тақырыбы табылмады. Тақырып пен мақсатты өзіңіз енгізіңіз.";
      }
    } catch {
      $("catalogStatus").textContent =
        "Оқу дерегі жүктелмеді. Тақырыпты қолмен енгізуге болады.";
    }
  }
  topics.serial = 0;
  function topicOptions(rows) {
    const section = $("catalogSection").value;
    options($("catalogTopic"), [
      ["", "Қолмен енгізу"],
      ...rows
        .filter((r) => !section || r.section === section)
        .map((r) => [r.number, r.number + ". " + r.title]),
    ]);
    $("catalogTopic").value =
      rows.find((r) => !section || r.section === section)?.number || "";
    chooseTopic();
  }
  function chooseTopic() {
    const g = $("catalogGrade").value,
      s = $("catalogSubject").value,
      q = $("catalogQuarter").value,
      n = $("catalogTopic").value;
    const row = LessonCatalog.rows(g, s, q).find((r) => r.number === n);
    if (row) {
      Object.assign(A.doc.meta, {
        grade: g,
        subjectId: s,
        subject: curriculum[g].subjects.find((x) => x.id === s)?.title || "",
        quarter: q,
        topicId: n,
        number: n,
        section: row.section,
        objective: row.objective,
      });
      A.doc.title = row.title;
      A.changed(true);
    }
    const c = LessonCatalog.content(g, s, q, n);
    $("catalogStatus").textContent = c
      ? "Қолданыстағы авторлық материал бар. Қоспас бұрын мазмұнын тексеріңіз."
      : "Дайын материал жоқ. Мазмұнды өзіңіз енгізіңіз.";
    $("useMaterial").disabled = !c;
  }
  async function ready(owner) {
    if (A.owner?.uid === owner.uid) return;
    const ticket = ++A.authTicket;
    A.owner = owner;
    A.doc = M.create(owner.uid);
    $("builderApp").hidden = false;
    $("authGate").hidden = true;
    options(
      $("catalogGrade"),
      Object.entries(curriculum).map(([g, c]) => [g, c.title]),
      "6",
    );
    subjects();
    options($("blockType"), Object.entries(M.blockTypes));
    await LessonCatalog.legacyContent();
    if (ticket !== A.authTicket) return;
    await topics();
    if (ticket !== A.authTicket) return;
    for (const f of A.features) await f.init?.();
    A.render();
  }
  function blocked(message) {
    A.authTicket++;
    A.owner = null;
    A.doc = null;
    $("builderApp").hidden = true;
    $("authGate").hidden = false;
    $("authMessage").textContent = message;
    $("preview").replaceChildren();
    for (const f of A.features) f.lock?.();
  }
  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll("[data-panel]")
      .forEach((b) => (b.onclick = () => A.panel(b.dataset.panel)));
    document.querySelectorAll(".section-nav a").forEach(
      (a) =>
        (a.onclick = () => {
          A.panel("editor");
          setTimeout(
            () =>
              document.querySelector(a.getAttribute("href")).scrollIntoView(),
            0,
          );
        }),
    );
    $("catalogGrade").onchange = () => {
      subjects();
      topics();
    };
    $("catalogSubject").onchange = topics;
    $("catalogQuarter").onchange = topics;
    $("catalogSection").onchange = () =>
      topicOptions(
        LessonCatalog.rows(
          $("catalogGrade").value,
          $("catalogSubject").value,
          $("catalogQuarter").value,
        ),
      );
    $("catalogTopic").onchange = chooseTopic;
    $("useMaterial").onclick = () => {
      const c = LessonCatalog.content(
        $("catalogGrade").value,
        $("catalogSubject").value,
        $("catalogQuarter").value,
        $("catalogTopic").value,
      );
      if (!c) return;
      A.doc.blocks.push(...LessonCatalog.blocks(c));
      const notes = [
        "pairWork",
        "groupWork",
        "individualWork",
        "assessment",
        "homework",
      ]
        .filter((k) => c[k])
        .map((k) => LessonCatalog.text(c[k]))
        .join("\n\n");
      A.doc.teacherNotes = [A.doc.teacherNotes, notes]
        .filter(Boolean)
        .join("\n\n");
      A.changed(true);
      A.panel("editor");
    };
    $("addBlock").onclick = () => {
      A.doc.blocks.push({
        id: M.id(),
        type: $("blockType").value,
        body: "",
        aux: "",
      });
      A.changed(true);
    };
    $("metadataFields").addEventListener("input", (e) => {
      const k = e.target.dataset.meta;
      if (!k) return;
      if (k === "title") A.doc.title = e.target.value;
      else {
        A.doc.meta[k] = e.target.value;
        if (k === "subject") A.doc.meta.subjectId = "";
      }
      A.changed();
    });
    $("metadataFields").addEventListener("change", (e) => {
      if (e.target.id === "lessonDuration") {
        A.doc.duration = Number(e.target.value);
        A.changed();
      }
    });
    $("blockEditor").addEventListener("input", (e) => {
      const id = e.target.dataset.block || e.target.dataset.alt,
        b = A.doc.blocks.find((x) => x.id === id);
      if (b) {
        b[e.target.dataset.alt ? "aux" : "body"] = e.target.value;
        A.changed();
      }
    });
    $("blockEditor").addEventListener("click", (e) => {
      const id = e.target.closest("[data-remove-block]")?.dataset.removeBlock;
      if (id && confirm("Бұл мазмұн блогын алып тастайсыз ба?")) {
        A.doc.blocks = A.doc.blocks.filter((b) => b.id !== id);
        A.changed(true);
      }
    });
    $("reflectionMethod").onchange = (e) => {
      A.doc.reflection.method = e.target.value;
      A.changed();
    };
    $("reflectionQuestions").oninput = (e) => {
      A.doc.reflection.questions = e.target.value;
      A.changed();
    };
    $("teacherNotes").oninput = (e) => {
      A.doc.teacherNotes = e.target.value;
      A.changed();
    };
    $("reviewed").onchange = (e) => {
      A.doc.reviewed = e.target.checked;
      A.refresh();
      A.persist?.();
    };
    ConstructorAuth.watch(ready, blocked);
  });
})();
