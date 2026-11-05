/* Safe projection into existing lesson/constructor field names. No storage writes. */
(function (root) {
  "use strict";
  const M =
    typeof module !== "undefined"
      ? require("./model.js")
      : root.LessonMaterialsModel;
  const esc = (v) =>
    String(v).replace(
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
  const tasks = (items) =>
    "<ol>" +
    items
      .map(
        (t) =>
          `<li>${esc(t.prompt)}<details><summary>Жауабы мен шешімі</summary><p>${esc(t.answer)}</p><p>${esc(t.solution)}</p></details></li>`,
      )
      .join("") +
    "</ol>";
  function project(input) {
    const m = M.material(input, input.lessonId);
    return {
      theory: m.theory.map((b) => `<p>${esc(b.text)}</p>`).join(""),
      examples: m.examples
        .map(
          (e) =>
            `<section><h3>${esc(e.title)}</h3><ol>${e.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p>${esc(e.answer)}</p></section>`,
        )
        .join(""),
      lessonPlan: m.lessonPlan.map((p) => [
        p.title,
        p.minutes + " минут",
        p.teacher,
        p.student,
      ]),
      pairWork: tasks(m.pairWork),
      groupWork: tasks(
        m.groupWork.map((g) => ({
          ...g.task,
          prompt: g.title + ": " + g.task.prompt,
        })),
      ),
      individualWork: tasks(
        ["A", "B", "C"].flatMap((level) =>
          m.individualWork[level].map((t) => ({
            ...t,
            prompt: level + ": " + t.prompt,
          })),
        ),
      ),
      assessment: m.assessment
        .map(
          (a) =>
            `<section><h3>${esc(a.criterion)}</h3><ul>${a.descriptors.map((d) => `<li>${esc(d.text)} — ${d.points} ұпай</li>`).join("")}</ul></section>`,
        )
        .join(""),
      homework: tasks(m.homework),
    };
  }
  const api = { project };
  if (typeof module !== "undefined") module.exports = api;
  else root.LessonMaterialsLegacy = api;
})(typeof window !== "undefined" ? window : globalThis);
