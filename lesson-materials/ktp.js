/* Read the existing canonical KTP adapter. Never copies or rewrites catalogue records. */
(function () {
  "use strict";
  const pending = new Map();
  function script(src) {
    if (!pending.has(src))
      pending.set(
        src,
        new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = resolve;
          s.onerror = () => {
            pending.delete(src);
            reject(Error("КТП жүктелмеді. Қайта көріңіз."));
          };
          document.head.append(s);
        }),
      );
    return pending.get(src);
  }
  async function rows(context) {
    const c = LessonMaterialsModel.identity(context);
    if (!window.curriculum[c.grade]?.subjects.some((s) => s.id === c.subject))
      throw Error("КТП пәні табылмады.");
    if (c.grade === "5") await script(`ktp-5-q${c.quarter}.js`);
    else if (c.grade === "6")
      await script(
        c.quarter === "4" ? "ktp-6-q4-topics.js" : `ktp-6-q${c.quarter}.js`,
      );
    else if (c.grade === "7")
      await script(c.quarter === "1" ? "ktp-7.js" : `ktp-7-q${c.quarter}.js`);
    else if (c.grade === "8")
      await script(`ktp-8-${c.subject}-q${c.quarter}.js`);
    if (Number(c.grade) >= 9) await LessonCatalog.grade(c.grade);
    await Promise.resolve(window.ktpReady);
    return LessonCatalog.rows(c.grade, c.subject, c.quarter);
  }
  async function resolve(context) {
    const c = LessonMaterialsModel.identity(context),
      all = await rows(c),
      row = all.find((x) => x.number === c.number);
    if (!row) throw Error("КТП сабағы табылмады.");
    const subject = curriculum[c.grade].subjects.find(
      (s) => s.id === c.subject,
    );
    return {
      identity: c,
      id: LessonMaterialsModel.id(c),
      subjectTitle: subject.title,
      lesson: structuredClone(row),
    };
  }
  window.LessonMaterialsKtp = { rows, resolve };
})();
