const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { GameClock, LearningSession } = require("../games-runtime.js");
test("paused time and deferred actions do not advance; expired actions fire once", () => {
  let now = 0,
    fired = 0;
  const c = new GameClock(() => now);
  c.resume();
  c.after(1000, () => fired++);
  now = 400;
  c.pause();
  now = 10000;
  c.tick();
  assert.equal(c.time(), 400);
  assert.equal(fired, 0);
  c.resume();
  now = 10600;
  c.tick();
  c.tick();
  assert.equal(fired, 1);
  assert.equal(c.time(), 1000);
});
test("exit clears pending animations and active time", () => {
  let n = 0,
    fired = 0;
  const c = new GameClock(() => n);
  c.resume();
  c.after(20, () => fired++);
  c.clear();
  n = 100;
  c.resume();
  c.tick();
  assert.equal(fired, 0);
});
test("duplicate answer, timeout and assisted learning are kept separate", () => {
  const s = new LearningSession("blitz", "6-math-1-1", [1, 2, 3, 4], {});
  s.assist("a");
  s.record("a", true, "3/4");
  s.record("a", true, "3/4");
  s.record("b", false, "", true);
  s.record("b", true, "2");
  s.record("c", false, "1");
  assert.deepEqual(s.summary(), {
    total: 4,
    correct: 1,
    wrong: 1,
    timeout: 1,
    unanswered: 1,
    independent: 0,
    assisted: 1,
    accuracy: 0,
  });
});
test("matching corrections retain first-attempt errors", () => {
  const s = new LearningSession("match", "x", [1], {});
  s.record("a", false, "x");
  s.record("a", true, "y");
  assert.equal(s.summary().correct, 1);
  assert.equal(s.summary().accuracy, 0);
  assert.equal(s.records.a.attempts, 2);
});

test("shared delay handles cannot cancel native browser polling timers", () => {
  const clock = new GameClock(() => 0);
  const id = clock.after(1, () => {});
  assert.equal(typeof id, "string");
  assert.ok(Number.isNaN(Number(id)));
});
