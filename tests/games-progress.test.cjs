const { test } = require("node:test");
const assert = require("node:assert/strict");
const G = require("../games-progress.js");
const snapshot = () => ({
  version: 1,
  bank: "{}",
  active: "final",
  elapsed: 100,
  timers: {},
  model: {
    id: "target",
    lesson: "6-math-1-1",
    questions: [{ question: "1+1", answer: "2" }],
    settings: { mode: "practice", seconds: 0 },
    records: {},
    help: {},
    index: 0,
    finished: false,
  },
  engine: {
    id: "target",
    lesson: "6-math-1-1",
    version: 1,
    qs: [{ question: "1+1", answer: "2" }],
    index: 0,
    game: { score: 0, attempts: [], completed: [] },
  },
});
const validate = (s) => G.envelope(s, { "6-math-1-1": {} }, { target: {} });
test("progress: valid version-1 data and growing assessment dictionaries remain resumable", () => {
  const s = snapshot();
  s.model.records.a = {
    key: "a",
    value: "<2",
    attempts: 1,
    correct: false,
    firstCorrect: false,
    assisted: true,
    timeout: false,
  };
  s.model.help.a = true;
  s.engine.game.attempts.push({ points: 0, ms: 10 });
  assert.equal(validate(s), true);
  assert.equal(G.engine(s.engine, snapshot().engine), true);
});
test("progress: numeric HTML payloads cannot reach a restore renderer", () => {
  for (const field of [
    "score",
    "points",
    "elapsed",
    "rotation",
    "health",
    "rope",
    "responseMs",
  ]) {
    const s = snapshot();
    s.engine.game[field] = "<img src=x onerror=alert(1)>";
    assert.throws(() => validate(s));
  }
  for (const field of ["capital", "scores", "positions"]) {
    const s = snapshot();
    s.engine.game[field] = [0, "<svg onload=alert(1)>"];
    assert.throws(() => validate(s));
  }
});
test("progress: inherited identifiers, method shadowing and prototype keys are rejected", () => {
  for (const id of ["constructor", "__proto__", "toString"]) {
    const s = snapshot();
    s.model.id = id;
    assert.throws(() => validate(s));
  }
  for (const key of ["summary", "record", "missed"]) {
    const s = snapshot();
    s.model[key] = "overridden";
    assert.throws(() => validate(s));
  }
  const s = snapshot();
  s.engine.extra = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => validate(s));
  assert.equal({}.polluted, undefined);
});
test("progress: elapsed time, timers, records and finite ranges are checked before restoration", () => {
  for (const change of [
    (s) => (s.elapsed = -1),
    (s) => (s.elapsed = Infinity),
    (s) => (s.timers.a = "0"),
    (s) => (s.model.settings.seconds = -1),
    (s) => (s.model.index = 2),
    (s) => (s.engine.qs = []),
    (s) => (s.model.records.a = { attempts: "1" }),
    (s) => (s.model.help.a = "yes"),
    (s) => (s.model.finished = "false"),
  ]) {
    const s = snapshot();
    change(s);
    assert.throws(() => validate(s));
  }
});
test("progress: adapter template rejects strings replacing booleans and arrays", () => {
  for (const bad of [
    { phase: true },
    { done: "false" },
    { turns: "0,0" },
    { journal: [] },
  ]) {
    assert.throws(() =>
      G.engine(
        { id: "test", ...bad },
        {
          id: "test",
          phase: "question",
          done: false,
          turns: [0, 0],
          journal: {},
        },
      ),
    );
  }
});
test("progress: legitimate car keys, correction text and nullable code slots stay compatible", () => {
  assert.equal(
    G.engine(
      { id: "car-race", car: { solved: ["racing:car:6:0"] } },
      { id: "car-race", car: { solved: [] } },
    ),
    true,
  );
  assert.equal(
    G.engine(
      { id: "find-error", repairOrders: [["x = −2", "x = 2"]] },
      { id: "find-error", repairOrders: [["y = 3"]] },
    ),
    true,
  );
  assert.equal(
    G.engine(
      { id: "math-code", parts: ["03", null] },
      { id: "math-code", parts: [null, null] },
    ),
    true,
  );
  assert.throws(() =>
    G.engine(
      { id: "math-code", parts: [{}] },
      { id: "math-code", parts: [null] },
    ),
  );
});
test("progress: bounded JSON graphs fail closed without recursion overflow", () => {
  const s = snapshot();
  s.engine.extra = Array(1001).fill(0);
  assert.throws(() => validate(s));
  let deep = {};
  for (let n = 0; n < 26; n++) deep = { child: deep };
  s.engine.extra = deep;
  assert.throws(() => validate(s));
});
