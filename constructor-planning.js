(function (root) {
  "use strict";
  const M =
    typeof module !== "undefined"
      ? require("./constructor-model.js")
      : root.LessonModel;
  const templates = {
    "Жаңа тақырыпты меңгеру": [3, 5, 10, 7, 8, 7, 3, 2],
    Қайталау: [3, 12, 5, 6, 6, 8, 3, 2],
    Бекіту: [3, 6, 5, 7, 8, 11, 3, 2],
    "Практикалық сабақ": [3, 4, 5, 6, 12, 10, 3, 2],
    "Топтық сабақ": [3, 5, 5, 5, 17, 5, 3, 2],
    "Ойын арқылы оқыту": [3, 5, 5, 7, 8, 12, 3, 2],
    "Қайталау және бағалау": [3, 8, 4, 4, 5, 16, 3, 2],
  };
  function minutes(doc, id, value) {
    if (!Number.isInteger(value) || value < 0 || value > 180)
      throw Error("Уақыт 0–180 аралығындағы бүтін сан болуы керек.");
    const s = doc.stages.find((s) => s.id === id);
    if (!s) throw Error("Кезең табылмады.");
    s.minutes = value;
  }
  function move(doc, id, delta) {
    const i = doc.stages.findIndex((s) => s.id === id),
      j = i + delta;
    if (![-1, 1].includes(delta) || i < 0 || j < 0 || j >= doc.stages.length)
      return false;
    [doc.stages[i], doc.stages[j]] = [doc.stages[j], doc.stages[i]];
    return true;
  }
  function remove(doc, id) {
    if (doc.stages.length < 2)
      throw Error("Сабақта кемінде бір кезең қалуы керек.");
    doc.stages = doc.stages.filter((s) => s.id !== id);
  }
  function template(doc, name) {
    if (!Object.hasOwn(templates, name)) throw Error("Үлгі табылмады.");
    doc.stages.forEach((s) => {
      const i = M.kinds.indexOf(s.kind);
      s.minutes = templates[name][i] || 1;
    });
    M.balance(doc);
    return doc;
  }
  function addTask(doc, target, source) {
    const t = { ...M.task(), ...M.clone(source), id: M.id() };
    delete t.workKind;
    const list =
      target === "homework"
        ? doc.homework
        : doc.stages.find((s) => s.id === target)?.tasks;
    if (!list) throw Error("Тапсырма бөлімі табылмады.");
    if (list.length >= 200)
      throw Error("Бұл бөлімдегі тапсырмалар саны шекке жетті.");
    list.push(t);
    return t;
  }
  const api = { templates, minutes, move, remove, template, addTask };
  if (typeof module !== "undefined") module.exports = api;
  else root.LessonPlanning = api;
})(typeof window !== "undefined" ? window : globalThis);
