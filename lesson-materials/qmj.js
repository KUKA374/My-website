/* Read-only lesson-plan projection. No storage, KTP edits, or server operations. */
(function (root) {
  "use strict";
  function plan(material, catalog, personal = {}, game = null) {
    const M =
      typeof module !== "undefined"
        ? require("./model.js")
        : root.LessonMaterialsModel;
    const m = M.material(material, catalog.id);
    const book = personal.textbook || {};
    return {
      title: catalog.lesson.title,
      section: catalog.lesson.section,
      objective: catalog.lesson.objective,
      context: `${catalog.identity.grade}-сынып · ${catalog.subjectTitle} · ${catalog.identity.quarter}-тоқсан · №${catalog.lesson.number}`,
      goal: m.qmj.lessonGoal,
      priorKnowledge: m.qmj.priorKnowledge,
      resources: [...m.qmj.resources],
      minutes: m.lessonPlan.reduce((sum, p) => sum + p.minutes, 0),
      stages: m.lessonPlan.map((p) => ({ ...p })),
      assessment: m.assessment.map((a) => ({
        criterion: a.criterion,
        descriptors: a.descriptors.map((d) => ({ ...d })),
      })),
      tasks: `${m.pairWork.length} жұптық тапсырма · ${m.groupWork.length} топ · A/B/C жеке жұмыс`,
      game: game?.title || "Ойын таңдалмаған",
      homework: [
        book.paragraph && `Оқулық: ${book.paragraph}`,
        book.exercise && `Жаттығу: ${book.exercise}`,
        personal.homeworkText || "",
      ].filter(Boolean),
      commonHomework: m.homework.map((t) => t.prompt),
    };
  }
  const api = { plan };
  if (typeof module !== "undefined") module.exports = api;
  else root.LessonQmj = api;
})(typeof window !== "undefined" ? window : globalThis);
