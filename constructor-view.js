(function () {
  "use strict";
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
  function imageURL(s) {
    try {
      if (
        /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) &&
        s.length < 1500000
      )
        return s;
      const u = new URL(s, location.href);
      if (
        u.username ||
        u.password ||
        (!s.startsWith("https://") &&
          !s.startsWith("./") &&
          !s.startsWith("images/"))
      )
        return "";
      return u.protocol === "https:" || u.origin === location.origin
        ? u.href
        : "";
    } catch {
      return "";
    }
  }
  function formula(s) {
    if (!window.katex) return "<p>Формула: " + esc(s) + "</p>";
    try {
      return katex.renderToString(s, {
        throwOnError: true,
        trust: false,
        strict: "error",
        maxExpand: 1000,
        maxSize: 10,
        displayMode: true,
      });
    } catch {
      return (
        '<p class="formula-error">Формуланы тексеріңіз: ' + esc(s) + "</p>"
      );
    }
  }
  function block(b) {
    if (b.type === "formula") return formula(b.body);
    if (b.type === "image") {
      const url = imageURL(b.body);
      return url && b.aux.trim()
        ? `<figure><img src="${esc(url)}" alt="${esc(b.aux)}"><figcaption>${esc(b.aux)}</figcaption></figure>`
        : "<p>Сурет үшін қауіпсіз мекенжай мен сипаттама қажет.</p>";
    }
    if (b.type === "table")
      return (
        '<div class="table-wrap"><table><tbody>' +
        b.body
          .split("\n")
          .map(
            (line) =>
              "<tr>" +
              line
                .split("|")
                .map((s) => "<td>" + esc(s) + "</td>")
                .join("") +
              "</tr>",
          )
          .join("") +
        "</tbody></table></div>"
      );
    if (b.type === "heading") return "<h3>" + esc(b.body) + "</h3>";
    return `<section class="content-block block-${b.type}"><h4>${esc(LessonModel.blockTypes[b.type])}</h4><p>${esc(b.body)}</p></section>`;
  }
  function task(t, answers, assessment = true) {
    return `<article class="print-task"><h4>${esc(t.level === "unclassified" ? "Деңгейі белгіленбеген" : t.level + " деңгейі")} · ${esc(LessonModel.types[t.type])}${t.optional ? " · Қосымша" : ""}${t.group ? " · " + t.group + "-топ" : ""}</h4><p>${esc(t.prompt)}</p>${t.instruction ? "<p>" + esc(t.instruction) + "</p>" : ""}${assessment && t.criteria ? "<p>Бағалау критерийі: " + esc(t.criteria) + "</p>" : ""}${assessment && t.descriptors.length ? "<ul>" + t.descriptors.map((d) => "<li>" + esc(d.text) + " — " + d.points + " ұпай</li>").join("") + "</ul>" : ""}${answers ? "<details open><summary>Мұғалімге: жауап және шешім</summary><p>" + esc(t.answer) + "</p><p>" + esc(t.solution || "Шешу жолы енгізілмеген.") + "</p></details>" : '<div class="answer-space" aria-label="Жауап жазу орны"></div>'}</article>`;
  }
  function render(x, mode = "teacher", answers = false) {
    const pupil = mode === "student",
      home = mode === "homework";
    let h = `<header><p class="document-status">${LessonModel.warnings(x).length ? "Жоба — тексеру қажет" : "Мұғалім тексерген жоспар"}</p><h1>${esc(x.title)}</h1><p>${esc(x.meta.grade)}-сынып · ${esc(x.meta.subject)} · ${esc(x.meta.quarter)}-тоқсан · ${x.duration} минут</p></header>`;
    if (home)
      return (
        h +
        "<h2>Үй тапсырмасы</h2>" +
        x.homework
          .map((t) => task(t, answers, (!pupil && !home) || answers))
          .join("")
      );
    if (!pupil) {
      h +=
        "<dl>" +
        [
          ["Бөлім", x.meta.section],
          ["Сабақ нөмірі", x.meta.number],
          ["Оқу мақсаттары", x.meta.objective],
          ["Сабақ мақсаттары", x.meta.goal],
          ["Бағалау критерийлері", x.meta.criteria],
          ["Құндылықтар", x.meta.values],
          ["Пәнаралық байланыс", x.meta.connections],
          ["Ресурстар", x.meta.resources],
          ["Алдыңғы білім", x.meta.previous],
        ]
          .filter((v) => v[1])
          .map(([k, v]) => "<dt>" + k + "</dt><dd>" + esc(v) + "</dd>")
          .join("") +
        "</dl>" +
        x.blocks.map(block).join("");
    }
    h += x.stages
      .map(
        (s) =>
          `<section class="plan-stage"><h2>${esc(s.title)} <small>${s.minutes} минут</small></h2>${!pupil ? "<p>" + esc(s.goal) + "</p>" : ""}<p>${esc(s.instructions)}</p>${!pupil && s.teacher ? "<p>Мұғалім: " + esc(s.teacher) + "</p>" : ""}${s.pupil ? "<p>Оқушы: " + esc(s.pupil) + "</p>" : ""}${
            s.kind === "group"
              ? "<p>" +
                s.groupCount +
                " топ · " +
                (s.groupMode === "same"
                  ? "Ортақ тапсырма"
                  : "Әртүрлі тапсырма") +
                "</p>" +
                s.groups
                  .slice(0, s.groupCount)
                  .map((g, i) =>
                    g ? "<p>" + (i + 1) + "-топ: " + esc(g) + "</p>" : "",
                  )
                  .join("")
              : ""
          }${s.tasks.map((t) => task(t, answers, (!pupil && !home) || answers)).join("")}</section>`,
      )
      .join("");
    if (!pupil)
      h += x.games
        .map(
          (g) =>
            `<section><h2>${esc(g.title)} · ${g.minutes} минут</h2><p>${esc(g.purpose)}</p><p>${esc(g.rule)}</p><p>${esc(g.grade)}-сынып · ${esc(g.topic)} · ${esc(g.format)}</p><a href="games.html" target="_blank" rel="noopener">Ойындар каталогын ашу</a><p>Каталогта осы ойын, сынып және тақырыпты қолмен таңдаңыз.</p></section>`,
        )
        .join("");
    h +=
      "<h2>Үй тапсырмасы</h2>" +
      x.homework
        .map((t) => task(t, answers, (!pupil && !home) || answers))
        .join("") +
      "<section><h2>Рефлексия: " +
      esc(x.reflection.method) +
      "</h2><p>" +
      esc(x.reflection.questions) +
      "</p></section>";
    if (!pupil && x.teacherNotes)
      h +=
        "<section><h2>Мұғалім жазбалары</h2><p>" +
        esc(x.teacherNotes) +
        "</p></section>";
    return h;
  }
  window.ConstructorView = { esc, imageURL, formula, block, task, render };
})();
