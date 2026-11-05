/* Versioned content contracts. KTP titles, order and objectives are never authored here. */
(function (root) {
  "use strict";
  const fail = (message) => {
    throw new Error(message);
  };
  const plain = (x) =>
    x !== null &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(x));
  function text(x, max = 12000) {
    if (typeof x !== "string" || x.length > max)
      fail("Мәтін пішімі немесе көлемі жарамсыз.");
    return x;
  }
  function record(x, keys) {
    if (!plain(x) || Object.keys(x).some((k) => !keys.includes(k)))
      fail("Құжатта белгісіз өріс бар.");
    return x;
  }
  function list(x, max = 40) {
    if (!Array.isArray(x) || x.length > max)
      fail("Тізім пішімі немесе көлемі жарамсыз.");
    return x;
  }
  function integer(x, min, max) {
    if (!Number.isSafeInteger(x) || x < min || x > max)
      fail("Сан рұқсат етілген аралықта емес.");
    return x;
  }
  function key(x) {
    text(x, 120);
    if (!/^[a-zA-Z0-9_-]+$/.test(x)) fail("Мазмұн идентификаторы жарамсыз.");
    return x;
  }
  function identity(c) {
    const g = String(c.grade ?? c.classId ?? ""),
      s = c.subject ?? c.subjectId,
      q = String(c.quarter ?? ""),
      n = String(c.number ?? c.lesson ?? "");
    if (
      !/^(?:[1-9]|1[01])$/.test(g) ||
      typeof s !== "string" ||
      !s ||
      s.length > 80 ||
      !/[1-4]/.test(q) ||
      q.length !== 1 ||
      !n ||
      n.length > 100 ||
      /[\u0000-\u001f]/.test(s + n)
    )
      fail("КТП сабағының сәйкестендіргіші жарамсыз.");
    return { grade: g, subject: s, quarter: q, number: n };
  }
  function id(c) {
    const x = identity(c);
    return "ktp1:" + Object.values(x).map(encodeURIComponent).join(":");
  }
  function parseId(value) {
    text(value, 600);
    const p = value.split(":");
    if (p.length !== 5 || p[0] !== "ktp1") fail("КТП ID нұсқасы белгісіз.");
    let x;
    try {
      x = identity({
        grade: decodeURIComponent(p[1]),
        subject: decodeURIComponent(p[2]),
        quarter: decodeURIComponent(p[3]),
        number: decodeURIComponent(p[4]),
      });
    } catch {
      fail("КТП ID оқылмады.");
    }
    if (id(x) !== value) fail("КТП ID канондық пішімде емес.");
    return x;
  }
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function ref(x) {
    if (x === null) return null;
    record(x, ["id", "startSlide", "endSlide"]);
    key(x.id);
    integer(x.startSlide, 1, 15);
    integer(x.endSlide, x.startSlide, 15);
    return x;
  }
  function task(x) {
    record(x, [
      "id",
      "prompt",
      "answer",
      "solution",
      "criteria",
      "descriptors",
    ]);
    key(x.id);
    for (const k of ["prompt", "answer", "solution", "criteria"]) text(x[k]);
    for (const d of list(x.descriptors, 12)) {
      record(d, ["text", "points"]);
      text(d.text, 1000);
      integer(d.points, 0, 100);
    }
    return x;
  }
  function tasks(x, max = 40) {
    list(x, max).forEach(task);
    if (new Set(x.map((t) => t.id)).size !== x.length)
      fail("Тапсырма ID қайталанды.");
    return x;
  }
  function empty(lessonId) {
    parseId(lessonId);
    return {
      schemaVersion: 1,
      lessonId,
      reviewRequired: true,
      video: null,
      theory: [],
      examples: [],
      lessonPlan: [],
      pairWork: [],
      groupWork: [],
      individualWork: { A: [], B: [], C: [] },
      games: { topicKey: "", recommended: [] },
      assessment: [],
      homework: [],
      qmj: { lessonGoal: "", resources: [], priorKnowledge: "" },
      presentation: null,
    };
  }
  function material(x, expectedId) {
    record(x, Object.keys(empty(expectedId || x?.lessonId)));
    if (
      x.schemaVersion !== 1 ||
      x.lessonId !== expectedId ||
      typeof x.reviewRequired !== "boolean"
    )
      fail("Сабақ мазмұны басқа ID-ге не нұсқаға арналған.");
    parseId(x.lessonId);
    if (x.video !== null) {
      record(x.video, ["provider", "id", "title", "publication"]);
      if (
        x.video.provider !== "youtube" ||
        !/^[A-Za-z0-9_-]{11}$/.test(x.video.id) ||
        !["draft", "published"].includes(x.video.publication)
      )
        fail("Видео метадерегі жарамсыз.");
      text(x.video.title, 500);
    }
    for (const b of list(x.theory, 40)) {
      record(b, ["kind", "text", "visual"]);
      if (!["text", "formula", "visual", "heading"].includes(b.kind))
        fail("Теория блогы белгісіз.");
      text(b.text);
      if (b.kind === "visual") visual(b.visual);
      else if (b.visual !== undefined)
        fail("Көрнекілік блогының түрі сәйкес емес.");
    }
    for (const e of list(x.examples, 20)) {
      record(e, ["id", "title", "steps", "answer"]);
      key(e.id);
      text(e.title);
      list(e.steps, 20).forEach((v) => text(v));
      text(e.answer);
    }
    for (const p of list(x.lessonPlan, 12)) {
      record(p, ["title", "minutes", "teacher", "student"]);
      text(p.title, 500);
      integer(p.minutes, 1, 45);
      text(p.teacher);
      text(p.student);
    }
    if (
      x.lessonPlan.length &&
      x.lessonPlan.reduce((n, p) => n + p.minutes, 0) !== 45
    )
      fail("Сабақ жоспары 45 минут болуы тиіс.");
    tasks(x.pairWork, 3);
    if (x.pairWork.length && x.pairWork.length !== 3)
      fail("Жұптық жұмысқа 3 тапсырма қажет.");
    list(x.groupWork, 4);
    if (x.groupWork.length && x.groupWork.length !== 4)
      fail("Топтық жұмысқа 4 топ қажет.");
    for (const g of x.groupWork) {
      record(g, ["id", "title", "task"]);
      key(g.id);
      text(g.title, 300);
      task(g.task);
    }
    if (new Set(x.groupWork.map((g) => g.id)).size !== x.groupWork.length)
      fail("Топ ID қайталанды.");
    record(x.individualWork, ["A", "B", "C"]);
    for (const k of ["A", "B", "C"]) tasks(x.individualWork[k], 20);
    record(x.games, ["topicKey", "recommended"]);
    text(x.games.topicKey, 120);
    list(x.games.recommended, 20).forEach(key);
    for (const a of list(x.assessment, 20)) {
      record(a, ["criterion", "descriptors"]);
      text(a.criterion);
      for (const d of list(a.descriptors, 20)) {
        record(d, ["text", "points"]);
        text(d.text);
        integer(d.points, 0, 100);
      }
    }
    tasks(x.homework, 20);
    record(x.qmj, ["lessonGoal", "resources", "priorKnowledge"]);
    text(x.qmj.lessonGoal);
    text(x.qmj.priorKnowledge);
    list(x.qmj.resources, 20).forEach((v) => text(v, 1000));
    ref(x.presentation);
    return clone(x);
  }
  function presentation(x, expectedId) {
    record(x, ["schemaVersion", "id", "title", "slides"]);
    if (x.schemaVersion !== 1 || x.id !== expectedId)
      fail("Презентация ID не нұсқасы сәйкес емес.");
    key(x.id);
    text(x.title, 500);
    list(x.slides, 15);
    if (x.slides.length < 10)
      fail("Ортақ презентация 10–15 слайдтан тұруы тиіс.");
    for (const s of x.slides) {
      record(s, ["id", "title", "text", "formula", "diagram", "steps"]);
      key(s.id);
      text(s.title, 500);
      text(s.text);
      text(s.formula, 2000);
      if (s.diagram !== null) visual(s.diagram);
      if (s.steps !== undefined)
        list(s.steps, 8).forEach((step) => text(step, 1000));
    }
    if (new Set(x.slides.map((s) => s.id)).size !== x.slides.length)
      fail("Слайд ID қайталанды.");
    return clone(x);
  }
  function privateDoc(x, uid, lessonId) {
    record(x, [
      "schemaVersion",
      "ownerId",
      "lessonId",
      "homeworkText",
      "notes",
      "revision",
      "textbook",
    ]);
    if (x.schemaVersion !== 1 || x.ownerId !== uid || x.lessonId !== lessonId)
      fail("Жеке деректің иесі немесе сабағы сәйкес емес.");
    text(uid, 200);
    if (!uid) fail("Пайдаланушы расталмаған.");
    parseId(lessonId);
    text(x.homeworkText, 10000);
    text(x.notes, 10000);
    integer(x.revision, 0, 1000000000);
    if (x.textbook !== undefined) {
      record(x.textbook, ["paragraph", "exercise"]);
      text(x.textbook.paragraph, 200);
      text(x.textbook.exercise, 200);
    }
    return clone(x);
  }
  function visual(x) {
    if (x?.kind === "fraction-bar") {
      record(x, ["kind", "parts", "filled"]);
      integer(x.parts, 1, 20);
      integer(x.filled, 0, x.parts);
    } else if (x?.kind === "number-line") {
      record(x, ["kind", "divisions", "marks"]);
      integer(x.divisions, 2, 16);
      for (const mark of list(x.marks, 8)) {
        record(mark, ["tick", "label"]);
        integer(mark.tick, 0, x.divisions);
        text(mark.label, 80);
      }
    } else if (x?.kind === "coordinate-graph") {
      record(x, ["kind", "maxX", "maxY", "points", "xLabel", "yLabel"]);
      integer(x.maxX, 1, 20);
      integer(x.maxY, 1, 20);
      text(x.xLabel, 80);
      text(x.yLabel, 80);
      list(x.points, 20);
      if (x.points.length < 2) fail("Графикке кемінде екі нүкте қажет.");
      let previous = -1;
      for (const point of x.points) {
        record(point, ["x", "y"]);
        integer(point.x, 0, x.maxX);
        integer(point.y, 0, x.maxY);
        if (point.x <= previous) fail("График нүктелерінің реті жарамсыз.");
        previous = point.x;
      }
    } else fail("Сызба түрі белгісіз.");
    return x;
  }
  const api = {
    identity,
    id,
    parseId,
    empty,
    material,
    presentation,
    ref,
    privateDoc,
    clone,
    key,
    visual,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.LessonMaterialsModel = api;
})(typeof window !== "undefined" ? window : globalThis);
