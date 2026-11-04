/* Version-1 local progress is untrusted data, never an authorization or grade. */
(function (root) {
  "use strict";
  const fail = () => {
    throw Error("Сақталған ойын деректерінің түрі жарамсыз.");
  };
  const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const object = (o) => !!o && typeof o === "object" && !Array.isArray(o);
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const index = (v) => Number.isSafeInteger(v) && v >= 0;
  const forbidden = new Set(["__proto__", "prototype", "constructor"]);
  const modelKeys = new Set([
    "id",
    "lesson",
    "questions",
    "settings",
    "records",
    "help",
    "index",
    "finished",
    "selfAssessments",
    "logicParts",
  ]);
  const numberKeys = new Set([
    "after",
    "armor",
    "at",
    "before",
    "bestStreak",
    "computer",
    "count",
    "digits",
    "divisor",
    "duration",
    "elapsed",
    "extra",
    "finishAt",
    "first",
    "goal",
    "health",
    "hi",
    "index",
    "leg",
    "level",
    "lo",
    "member",
    "ms",
    "nextExtra",
    "number",
    "player",
    "points",
    "progress",
    "questionStarted",
    "responseMs",
    "gamePoints",
    "rope",
    "rotation",
    "round",
    "roundId",
    "roundIndex",
    "score",
    "seconds",
    "serial",
    "size",
    "spinFrom",
    "spinTarget",
    "started",
    "station",
    "stepMs",
    "streak",
    "target",
    "team",
    "tier",
    "time",
    "total",
    "wallet",
  ]);
  const nullableNumbers = new Set([
    "bid",
    "deadline",
    "sector",
    "spinStart",
    "spinEnd",
    "selectedLeft",
    "selectedRight",
    "open",
    "winner",
  ]);
  const numberLists = new Set(["scores", "capital", "positions"]);
  const indexLists = new Set([
    "awarded",
    "completed",
    "proof",
    "roundIds",
    "errors",
  ]);
  function plainData(value) {
    let nodes = 0;
    function walk(v, depth) {
      if (++nodes > 50000 || depth > 24) fail();
      if (v === null || typeof v === "string" || typeof v === "boolean") return;
      if (typeof v === "number") {
        if (!Number.isFinite(v)) fail();
        return;
      }
      if (!object(v) && !Array.isArray(v)) fail();
      if (Array.isArray(v) && v.length > 1000) fail();
      for (const [k, child] of Object.entries(v)) {
        if (forbidden.has(k)) fail();
        walk(child, depth + 1);
      }
    }
    walk(value, 0);
  }
  function numericState(value, parent = "") {
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value)) {
      // Authored questions and typed answers are text; renderers escape them.
      if (k === "qs" || k === "questions") continue;
      if (numberKeys.has(k) && !finite(v)) fail();
      if (k === "count" && (!index(v) || v < 1 || v > 1000)) fail();
      if (nullableNumbers.has(k) && v !== null && !finite(v)) fail();
      if (k === "correct" && typeof v !== "boolean" && !finite(v)) fail();
      if (k === "attempts" && !Array.isArray(v) && !index(v)) fail();
      if (numberLists.has(k) && (!Array.isArray(v) || !v.every(finite))) fail();
      if (indexLists.has(k) && (!Array.isArray(v) || !v.every(index))) fail();
      if (
        k === "solved" &&
        (!Array.isArray(v) ||
          !v.every(parent === "car" ? (x) => typeof x === "string" : index))
      )
        fail();
      if (parent === "orders" && Array.isArray(v) && !v.every(index)) fail();
      numericState(
        v,
        k === "orders" || k === "repairOrders"
          ? k
          : parent === "orders"
            ? parent
            : k,
      );
    }
  }
  function records(model) {
    if (!object(model.records) || !object(model.help)) fail();
    for (const r of Object.values(model.records)) {
      if (
        !object(r) ||
        typeof r.key !== "string" ||
        typeof r.value !== "string" ||
        !index(r.attempts) ||
        r.attempts < 1
      )
        fail();
      for (const k of ["correct", "firstCorrect", "assisted", "timeout"])
        if (typeof r[k] !== "boolean") fail();
      for (const k of ["responseMs", "points", "gamePoints", "level"])
        if (own(r, k) && !finite(r[k])) fail();
    }
    if (!Object.values(model.help).every((v) => typeof v === "boolean")) fail();
    if (
      model.selfAssessments &&
      (!object(model.selfAssessments) ||
        !Object.values(model.selfAssessments).every((v) =>
          ["independent", "assisted", "repeat"].includes(v),
        ))
    )
      fail();
  }
  function envelope(data, bank, rules) {
    plainData(data);
    const m = data?.model;
    if (
      !object(data) ||
      data.version !== 1 ||
      !object(m) ||
      !own(rules, m.id) ||
      !own(bank, m.lesson)
    )
      fail();
    if (!Object.keys(m).every((k) => modelKeys.has(k))) fail();
    if (
      !Array.isArray(m.questions) ||
      !m.questions.length ||
      m.questions.length > 1000 ||
      !index(m.index) ||
      m.index > m.questions.length ||
      typeof m.finished !== "boolean"
    )
      fail();
    if (
      !object(m.settings) ||
      !["practice", "challenge"].includes(m.settings.mode) ||
      !finite(m.settings.seconds) ||
      m.settings.seconds < 0
    )
      fail();
    if (
      !finite(data.elapsed) ||
      data.elapsed < 0 ||
      !object(data.timers) ||
      !Object.values(data.timers).every((v) => finite(v) && v >= 0)
    )
      fail();
    if (typeof data.active !== "string" || !object(data.engine)) fail();
    records(m);
    if (
      data.engine.id !== m.id ||
      data.engine.lesson !== m.lesson ||
      !Array.isArray(data.engine.qs) ||
      data.engine.qs.length !== m.questions.length
    )
      fail();
    numericState(data.engine);
    return true;
  }
  function types(saved, expected, path = "") {
    if (expected === null || expected === undefined) return;
    if (typeof expected !== "object") {
      if (typeof saved !== typeof expected) fail();
      return;
    }
    if (Array.isArray(expected)) {
      if (!Array.isArray(saved)) fail();
      if (expected.length)
        for (let i = 0; i < saved.length; i++)
          types(saved[i], expected[i] ?? expected[0], path);
      return;
    }
    if (!object(saved)) fail();
    for (const [k, v] of Object.entries(expected)) {
      if (k === "qs" || k === "questions" || k === "facts") continue;
      // Empty dictionaries and nullable fields legitimately grow during play.
      if (own(saved, k)) types(saved[k], v, path + "." + k);
    }
  }
  function engine(saved, expected) {
    plainData(saved);
    numericState(saved);
    types(saved, expected);
    if (
      saved.id === "math-code" &&
      (!Array.isArray(saved.parts) ||
        !saved.parts.every((v) => v === null || typeof v === "string"))
    )
      fail();
    return true;
  }
  const api = { envelope, engine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameProgress = api;
})(typeof window !== "undefined" ? window : globalThis);
