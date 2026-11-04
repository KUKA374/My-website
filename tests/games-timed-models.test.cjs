const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const M = require("../games-timed-models.js"),
  C = require("../games-timed-content.js");
const R = require("../games-racing-models.js");
test("quick: a fixed global deadline, immediate next question, bounded streak and idempotent expiry", () => {
  const s = M.create("quick-answer", 50, { seconds: 60 });
  for (let i = 0; i < 10; i++) M.answer(s, true, "7", 1000 * (i + 1));
  assert.equal(s.score, 170);
  assert.equal(s.bestStreak, 10);
  assert.equal(s.deadline, 60000);
  M.answer(s, false, "0", 11000);
  assert.equal(s.streak, 0);
  assert.equal(M.answer(s, true, "7", 60000), null);
  M.tick(s, 90000);
  assert.equal(s.history.length, 12);
  assert.equal(s.history.at(-1).timeout, true);
  assert.equal(s.finished, true);
  assert.deepEqual(M.stats(s), {
    correct: 10,
    wrong: 1,
    timeouts: 1,
    accuracy: 91,
    averageMs: 1000,
  });
  for (const seconds of [30, 60, 90])
    assert.equal(
      M.create("quick-answer", 4, { seconds }).deadline,
      seconds * 1000,
    );
});
test("blitz: independent deadlines, deadline wins a tie, feedback freezes time and each result is unique", () => {
  const s = M.create("blitz", 3, { mode: "challenge", seconds: 20 });
  assert.equal(s.seconds, 12);
  M.tick(s, 12000);
  M.tick(s, 99000);
  assert.equal(s.history.length, 1);
  assert.equal(M.answer(s, true, "1", 12000), null);
  M.next(s, 99000);
  assert.equal(s.deadline, 111000);
  M.answer(s, true, "1", 110999);
  assert.equal(s.deadline, null);
  assert.equal(M.answer(s, true, "1", 111000), null);
  M.next(s, 200000);
  assert.equal(s.deadline, 212000);
  const practice = M.create("blitz", 1, { mode: "practice", seconds: 0 });
  M.tick(practice, 999999);
  assert.equal(practice.history.length, 0);
});
test("wheel: all four selected sectors stop under the pointer after arbitrary prior turns; pause uses active time", () => {
  const s = M.create("wheel", 8, { teams: true });
  for (let i = 0; i < 8; i++) {
    const at = i * 5000;
    assert.equal(M.spin(s, ((i % 4) + 0.5) / 4, at), true);
    const target = s.spinTarget;
    assert.equal(M.spin(s, 0.8, at), false);
    assert.equal(s.spinTarget, target);
    M.tick(s, at + 800);
    assert.equal(s.phase, "spinning");
    const angle = s.rotation;
    M.tick(s, at + 800);
    assert.equal(s.rotation, angle);
    M.tick(s, at + 1600);
    assert.equal(M.sectorAt(s.rotation), i % 4);
    const row = M.answer(s, i !== 2, "x", at + 1700);
    assert.equal(row.points, i === 2 ? 0 : M.sectors[i % 4]);
    assert.equal(M.answer(s, true, "x", at + 1701), null);
    M.next(s, at + 1800);
  }
  assert.deepEqual(s.scores, [50, 120]);
  assert.equal(s.finished, true);
});
test("auction: strict bid range, immutable commitment, separate teams and immutable capital journal", () => {
  const s = M.create("auction", 4);
  assert.equal(M.answer(s, true, "1", 0), null);
  for (const v of ["", -1, 0, "1.5", "abc", "1e1", "Infinity", 51])
    assert.equal(M.bid(s, v), false, String(v));
  assert.equal(M.bid(s, "50"), true);
  assert.equal(M.bid(s, "10"), false);
  assert.equal(M.answer(s, true, "1", 1000).after, 150);
  assert.equal(M.answer(s, true, "1", 1001), null);
  M.next(s, 1002);
  assert.equal(M.turn(s), 1);
  M.bid(s, 50);
  M.answer(s, false, "1", 2000);
  assert.deepEqual(s.capital, [150, 50]);
  assert.deepEqual(
    s.history.map((r) => [r.before, r.bid, r.points, r.after]),
    [
      [100, 50, 50, 150],
      [100, 50, -50, 50],
    ],
  );
});
test("auction: bankrupt teams get a distinct stake-free recovery including the final lot", () => {
  const s = M.create("auction", 4);
  for (let i = 0; i < 4; i++) {
    M.bid(s, 50);
    M.answer(s, false, "0", i * 1000);
    M.next(s, i * 1000 + 1);
    if (i >= 2) {
      assert.equal(s.phase, "recovery");
      assert.equal(M.questionIndex(s), 4 + i);
      assert.equal(M.bid(s, 1), false);
      const r = M.answer(s, i === 3, "1", i * 1000 + 2);
      assert.equal(r.bid, 0);
      assert.equal(r.after, i === 3 ? 20 : 0);
      M.next(s, i * 1000 + 3);
    }
  }
  assert.equal(s.finished, true);
  assert.deepEqual(s.capital, [0, 20]);
  assert.equal(s.history.length, 6);
});
test("all 12 topics: supplemental pools are non-mutating, unique, topic scoped and independently correct", () => {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(require.resolve("../games-data.js"), "utf8"),
    ctx,
  );
  const bank = ctx.window.gameQuestionBank,
    before = JSON.stringify(bank);
  assert.equal(Object.keys(bank).length, 12);
  for (const [key, b] of Object.entries(bank)) {
    const pool = C.pool(key, b);
    assert.ok(pool.length >= 27, key);
    assert.equal(
      new Set(pool.map((q) => q.question.replace(/\s/g, ""))).size,
      pool.length,
    );
    for (const q of pool.filter((q) => q.facts)) {
      const choices = R.choices(q);
      assert.equal(choices.length, 4);
      assert.equal(new Set(choices.map(R.canonical)).size, 4);
      assert.equal(choices.filter((v) => R.same(v, q.answer)).length, 1);
      const f = q.facts;
      let answer;
      switch (f.type) {
        case "add":
          answer = f.a + f.b;
          break;
        case "fraction":
          answer = f.a / f.b;
          break;
        case "decimal":
          answer = (f.a + f.b) / 100;
          break;
        case "intersection":
          answer = "{" + f.A.filter((n) => f.B.includes(n)).join(",") + "}";
          break;
        case "percent":
          answer = f.n / 4;
          break;
        case "ratio":
          answer = f.a / f.b;
          break;
        case "inverse":
          answer = f.b / f.a;
          break;
        case "proportion":
          answer = (f.a * f.d) / f.b;
          break;
        case "equation":
          answer = (f.c - f.b) / f.a;
          break;
        case "power":
          answer = f.a ** f.e;
          break;
        default:
          throw Error(f.type);
      }
      assert.ok(R.same(q.answer, answer), key + " " + q.question);
    }
  }
  assert.equal(JSON.stringify(bank), before);
});
