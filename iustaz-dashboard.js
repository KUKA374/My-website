(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  function library(e) {
    const user = e.detail,
      box = $("#iuRecentLessons");
    box.replaceChildren();
    if (!user) {
      $("#iuLessonCount").textContent = "Кіру қажет";
      box.textContent =
        "Жеке сабақтарыңызды көру үшін жүйеге кіріңіз. Жоспарлар осы браузерде ғана сақталады.";
      return;
    }
    try {
      const docs = new ConstructorStorage.Repository(localStorage, user.uid)
        .list()
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      $("#iuLessonCount").textContent = String(docs.length);
      if (!docs.length)
        box.textContent = "Сақталған сабақ жоқ. Алғашқы жоспарыңызды құрыңыз.";
      for (const d of docs.slice(0, 4)) {
        const a = document.createElement("a");
        a.className = "iu-recent-row";
        a.href = "constructor.html#saved=" + encodeURIComponent(d.id);
        const title = document.createElement("strong"),
          date = document.createElement("span");
        title.textContent = d.title;
        date.textContent = [
          d.meta.grade ? d.meta.grade + "-сынып" : "Сынып көрсетілмеген",
          new Date(d.updatedAt).toLocaleDateString("kk-KZ"),
        ].join(" · ");
        a.append(title, date);
        box.append(a);
      }
    } catch {
      $("#iuLessonCount").textContent = "Оқылмады";
      box.textContent =
        "Жергілікті кітапхананы оқу мүмкін болмады. Бұрынғы деректер өзгертілмеді.";
    }
  }
  window.addEventListener("iu-auth", library);
  library({ detail: window.IustazOwner || null });
  async function catalog() {
    const files = [
      "ktp-data.js",
      "ktp-5-q1.js",
      "ktp-5-q2.js",
      "ktp-5-q2-loader.js",
      "ktp-5-q3.js",
      "ktp-5-q4.js",
      "ktp-6-q1.js",
      "ktp-6-q2.js",
      "ktp-6-q3.js",
      "ktp-6-q4-topics.js",
      "ktp-7.js",
      "ktp-7-q2.js",
      "ktp-7-q3.js",
      "ktp-7-q4.js",
      "ktp-upper-tools.js",
    ];
    try {
      for (const src of files)
        await new Promise((yes, no) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = yes;
          s.onerror = no;
          document.head.append(s);
        });
      const keys = new Set();
      let rows = 0,
        contexts = 0;
      for (const [g, grade] of Object.entries(window.curriculum)) {
        await LessonCatalog.grade(g);
        for (const subject of grade.subjects)
          for (let q = 1; q <= 4; q++) {
            const list = LessonCatalog.rows(g, subject.id, q);
            if (list.length) contexts++;
            for (const row of list) {
              rows++;
              keys.add([g, subject.id, q, row.title].join("|"));
            }
          }
      }
      $("#iuTopicCount").textContent = String(keys.size);
      $("#iuTopicCount").dataset.rows = String(rows);
      $("#iuTopicCount").dataset.contexts = String(contexts);
      $("#iuCatalogNote").textContent =
        `${contexts} КТП контекстінен есептелді. Тақырып саны толық дайын сабақтар санын білдірмейді.`;
    } catch {
      $("#iuTopicCount").textContent = "Қолжетімсіз";
      $("#iuCatalogNote").textContent =
        "КТП деректері толық жүктелмеді. Бетті қайта ашыңыз.";
    }
  }
  function start() {
    $("#iuGameCount").textContent = window.GameLearning?.rules
      ? String(Object.keys(GameLearning.rules).length)
      : "Қолжетімсіз";
    catalog();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
