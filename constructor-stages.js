(function () {
  "use strict";
  const A = ConstructorApp,
    M = LessonModel,
    P = LessonPlanning,
    V = ConstructorView,
    E = V.esc,
    $ = (id) => document.getElementById(id);
  let filters = { level: "", type: "", search: "" };
  function current() {
    return A.doc.stages.find((s) => s.id === A.stageId) || A.doc.stages[0];
  }
  function taskCard(t, stage) {
    const fields = [
      ["prompt", "Тапсырманың шарты"],
      ["answer", "Дұрыс жауап — мұғалімге"],
      ["solution", "Шешу жолы — мұғалімге"],
      ["objective", "Оқу мақсатымен байланысы"],
      ["criteria", "Бағалау критерийі"],
      ["instruction", "Орындау нұсқаулығы"],
    ];
    return `<article class="edit-card task-edit" data-task-card="${t.id}"><header><h3>Тапсырма</h3><button type="button" data-delete-task="${t.id}" class="danger">Тапсырманы жою</button></header><p class="source-note">${E(t.source)}</p><label for="level-${t.id}">Қиындық деңгейі</label><select id="level-${t.id}" data-task="${t.id}" data-key="level">${[
      ["unclassified", "Деңгейі белгіленбеген"],
      ["A", "A — базалық"],
      ["B", "B — орта"],
      ["C", "C — күрделі"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${t.level === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select><label for="type-${t.id}">Тапсырма түрі</label><select id="type-${t.id}" data-task="${t.id}" data-key="type">${Object.entries(
      M.types,
    )
      .map(
        ([v, l]) =>
          `<option value="${v}" ${t.type === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select>${fields.map(([k, l]) => A.field(l, k + "-" + t.id, t[k], `data-task="${t.id}" data-key="${k}"`)).join("")}${stage?.kind === "group" ? `<label for="group-${t.id}">Қай топ орындайды?</label><select id="group-${t.id}" data-task="${t.id}" data-key="group"><option value="0">Барлық топ</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${t.group === n ? "selected" : ""}>${n}-топ</option>`).join("")}</select>` : ""}${!stage ? `<label class="check-line"><input type="checkbox" data-task="${t.id}" data-key="optional" ${t.optional ? "checked" : ""}>Қосымша үй тапсырмасы</label>` : ""}<h4>Бағалау дескрипторлары</h4>${t.descriptors.map((d, i) => `<div class="descriptor-row"><label for="desc-${t.id}-${i}">Дескриптор ${i + 1}</label><input id="desc-${t.id}-${i}" data-desc="${t.id}" data-index="${i}" data-key="text" value="${E(d.text)}"><label for="points-${t.id}-${i}">Ұпай</label><input id="points-${t.id}-${i}" type="number" min="0" max="100" step="1" data-desc="${t.id}" data-index="${i}" data-key="points" value="${d.points}"><button type="button" data-delete-desc="${t.id}" data-index="${i}">Дескрипторды жою</button></div>`).join("")}<button type="button" data-add-desc="${t.id}">Дескриптор қосу</button></article>`;
  }
  function render() {
    const x = A.doc,
      s = current();
    A.stageId = s.id;
    $("stageControls").innerHTML =
      `<label for="stageChoice">Өңделетін кезең</label><select id="stageChoice">${x.stages.map((s, i) => `<option value="${s.id}" ${s.id === A.stageId ? "selected" : ""}>${i + 1}. ${E(s.title)} — ${s.minutes} минут</option>`).join("")}</select><div class="actions"><button id="stageUp" type="button">Кезеңді жоғары</button><button id="stageDown" type="button">Кезеңді төмен</button><button id="addStage" type="button">Жаңа кезең</button><button id="deleteStage" type="button" class="danger">Кезеңді жою</button></div><label for="lessonTemplate">Сабақ үлгісі</label><select id="lessonTemplate">${Object.keys(
        P.templates,
      )
        .map((t) => `<option>${E(t)}</option>`)
        .join(
          "",
        )}</select><div class="actions"><button id="applyTemplate" type="button">Үлгі уақыттарын қолдану</button><button id="balanceTime" type="button">Уақытты үйлестіру</button></div><p>Үлгі мен үйлестіру тек батырманы басып, растағаннан кейін уақыттарды өзгертеді. Ойын минуттары да жалпы уақытқа кіреді.</p>`;
    $("stageEditor").innerHTML =
      `<article class="edit-card"><label for="stageTitle">Кезең атауы</label><input id="stageTitle" data-stage-key="title" value="${E(s.title)}"><label for="stageKind">Жұмыс түрі</label><select id="stageKind" data-stage-key="kind">${M.kinds.map((k, i) => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${M.titles[i]}</option>`).join("")}</select><label for="stageMinutes">Уақыты, минут</label><input id="stageMinutes" data-stage-key="minutes" type="number" min="0" max="180" step="1" value="${s.minutes}">${[
        ["goal", "Кезең мақсаты"],
        ["instructions", "Нұсқаулық"],
        ["teacher", "Мұғалім әрекеті"],
        ["pupil", "Оқушы әрекеті"],
      ]
        .map(([k, l]) =>
          A.field(l, "stage-" + k, s[k], `data-stage-key="${k}"`),
        )
        .join("")}${
        s.kind === "group"
          ? `<label for="groupCount">Топтар саны</label><select id="groupCount" data-stage-key="groupCount">${[2, 3, 4, 5].map((n) => `<option value="${n}" ${s.groupCount === n ? "selected" : ""}>${n} топ</option>`).join("")}</select><label for="groupMode">Топтарға тапсырма беру</label><select id="groupMode" data-stage-key="groupMode"><option value="same" ${s.groupMode === "same" ? "selected" : ""}>Бірдей тапсырма</option><option value="different" ${s.groupMode === "different" ? "selected" : ""}>Әртүрлі тапсырма</option></select>${s.groups
              .slice(0, s.groupCount)
              .map((g, i) =>
                A.field(
                  i + 1 + "-топ нұсқаулығы",
                  "group-note-" + i,
                  g,
                  `data-group-note="${i}"`,
                ),
              )
              .join("")}`
          : ""
      }<button id="manualTask" type="button" class="primary">Кезеңге тапсырма қосу</button></article>${s.tasks.map((t) => taskCard(t, s)).join("")}`;
    $("homeworkEditor").innerHTML =
      '<button id="addHomework" type="button">Үй тапсырмасын қосу</button>' +
      x.homework.map((t) => taskCard(t, null)).join("");
    $("taskLibrary").innerHTML =
      `<h3>Тапсырмалар кітапханасы</h3><p>Іріктеу: ${E(x.meta.grade)}-сынып · ${E(x.meta.subject)} · ${E(x.title)}. Сынып пен тақырып сол жақтағы КТП таңдауымен беріледі.</p><label for="bankLevel">Деңгей бойынша</label><select id="bankLevel">${[
        ["", "Барлық деңгей"],
        ["A", "A"],
        ["B", "B"],
        ["C", "C"],
        ["unclassified", "Деңгейі белгіленбеген"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${filters.level === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select><label for="bankType">Түрі бойынша</label><select id="bankType"><option value="">Барлық түрі</option>${Object.entries(
        M.types,
      )
        .map(
          ([v, l]) =>
            `<option value="${v}" ${filters.type === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select><label for="bankSearch">Шарттан іздеу</label><input id="bankSearch" value="${E(filters.search)}"><p>Банк деңгейі мен толық шешімі расталмаған есептерді мұғалім өзі тексеріп толықтырады. Бос қор басқа тақырыппен толтырылмайды.</p><div id="bankResults"></div>`;
    bank();
  }
  function pool() {
    const m = A.doc.meta;
    return LessonCatalog.bank(
      m.grade,
      m.subjectId,
      m.quarter,
      m.topicId,
    ).filter(
      (t) =>
        (!filters.level || t.level === filters.level) &&
        (!filters.type || t.type === filters.type) &&
        t.prompt
          .toLocaleLowerCase("kk")
          .includes(filters.search.toLocaleLowerCase("kk")),
    );
  }
  function bank() {
    const tasks = pool();
    $("bankResults").innerHTML = tasks.length
      ? tasks
          .map(
            (t, i) =>
              `<article class="edit-card"><p>${E(t.prompt)}</p><p class="source-note">${E(t.source)}</p><button type="button" data-bank="${i}" data-target="stage">Кезеңге қосу</button><button type="button" data-bank="${i}" data-target="homework">Үй жұмысына қосу</button></article>`,
          )
          .join("")
      : '<p role="status">Осы сүзгіге сай дайын тапсырма жоқ. Қолмен қосуға болады.</p>';
  }
  function findTask(id) {
    return M.tasks(A.doc).find((t) => t.id === id);
  }
  function update(e) {
    if (!A.doc) return;
    const el = e.target,
      s = current();
    try {
      if (el.dataset.stageKey) {
        const k = el.dataset.stageKey;
        let value = el.value;
        if (["minutes", "groupCount"].includes(k)) {
          value = Number(value);
          if (el.value === "" || !Number.isInteger(value))
            throw Error("Бүтін сан енгізіңіз.");
        }
        if (k === "minutes") P.minutes(A.doc, s.id, value);
        else s[k] = value;
        A.changed(["kind", "groupCount", "groupMode"].includes(k));
        return;
      }
      if (el.dataset.groupNote !== undefined) {
        s.groups[Number(el.dataset.groupNote)] = el.value;
        A.changed();
        return;
      }
      if (el.dataset.task) {
        const t = findTask(el.dataset.task),
          k = el.dataset.key;
        t[k] =
          k === "optional"
            ? el.checked
            : k === "group"
              ? Number(el.value)
              : el.value;
        A.changed();
        return;
      }
      if (el.dataset.desc) {
        const d = findTask(el.dataset.desc).descriptors[
          Number(el.dataset.index)
        ];
        if (el.dataset.key === "points") {
          if (
            el.value === "" ||
            !Number.isInteger(Number(el.value)) ||
            Number(el.value) < 0 ||
            Number(el.value) > 100
          )
            throw Error("Дескриптор ұпайы 0–100 аралығында болуы керек.");
          d.points = Number(el.value);
        } else d.text = el.value;
        A.changed();
        return;
      }
    } catch (err) {
      A.notify(err.message);
    }
  }
  function click(e) {
    if (!A.doc) return;
    const b = e.target.closest("button");
    if (!b) return;
    const x = A.doc,
      s = current();
    try {
      if (b.id === "addStage") {
        if (x.stages.length >= 30) throw Error("Кезең саны шекке жетті.");
        const n = M.stage();
        x.stages.push(n);
        A.stageId = n.id;
      } else if (b.id === "deleteStage") {
        if (!confirm("Кезең мен оның тапсырмаларын жоясыз ба?")) return;
        P.remove(x, s.id);
        A.stageId = x.stages[0].id;
      } else if (b.id === "stageUp" || b.id === "stageDown") {
        P.move(x, s.id, b.id === "stageUp" ? -1 : 1);
      } else if (b.id === "balanceTime" || b.id === "applyTemplate") {
        if (!confirm("Барлық кезеңнің уақытын қайта есептеуге келісесіз бе?"))
          return;
        if (b.id === "balanceTime") M.balance(x);
        else P.template(x, $("lessonTemplate").value);
      } else if (b.id === "manualTask" || b.id === "addHomework") {
        P.addTask(x, b.id === "addHomework" ? "homework" : s.id, {
          ...M.task(),
          topic: [
            x.meta.grade,
            x.meta.subjectId,
            x.meta.quarter,
            x.meta.topicId,
          ].join("_"),
        });
      } else if (b.dataset.deleteTask) {
        if (!confirm("Тапсырманы жоясыз ба?")) return;
        x.stages.forEach(
          (s) =>
            (s.tasks = s.tasks.filter((t) => t.id !== b.dataset.deleteTask)),
        );
        x.homework = x.homework.filter((t) => t.id !== b.dataset.deleteTask);
      } else if (b.dataset.addDesc) {
        const t = findTask(b.dataset.addDesc);
        if (t.descriptors.length >= 30)
          throw Error("Дескриптор саны шекке жетті.");
        t.descriptors.push({ text: "", points: 1 });
      } else if (b.dataset.deleteDesc) {
        if (!confirm("Дескрипторды жоясыз ба?")) return;
        findTask(b.dataset.deleteDesc).descriptors.splice(
          Number(b.dataset.index),
          1,
        );
      } else if (b.dataset.bank !== undefined) {
        const t = pool()[Number(b.dataset.bank)];
        if (!t) return;
        P.addTask(x, b.dataset.target === "homework" ? "homework" : s.id, t);
      } else return;
      A.changed(true);
    } catch (err) {
      A.notify(err.message);
    }
  }
  A.features.push({ render });
  document.addEventListener("DOMContentLoaded", () => {
    for (const id of [
      "stageControls",
      "stageEditor",
      "homeworkEditor",
      "taskLibrary",
    ]) {
      $(id).addEventListener("click", click);
      $(id).addEventListener("input", (e) => {
        if (e.target.tagName !== "SELECT") update(e);
      });
      $(id).addEventListener("change", (e) => {
        if (e.target.id === "stageChoice") {
          A.stageId = e.target.value;
          render();
          return;
        }
        if (e.target.tagName === "SELECT") update(e);
      });
    }
    $("taskLibrary").addEventListener("input", (e) => {
      if (e.target.id === "bankSearch") {
        filters.search = e.target.value;
        bank();
      }
    });
    $("taskLibrary").addEventListener("change", (e) => {
      if (e.target.id === "bankLevel" || e.target.id === "bankType") {
        filters[e.target.id === "bankLevel" ? "level" : "type"] =
          e.target.value;
        bank();
      }
    });
  });
})();
