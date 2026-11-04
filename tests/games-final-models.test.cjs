const { test } = require("node:test"),
  assert = require("node:assert/strict");
const M = require("../games-final-models.js"),
  C = require("../games-final-content.js"),
  R = require("../games-racing-models.js");
function create(id, lesson = "6-math-1-1", opts = {}) {
  const qs = C.deck(id, lesson, opts);
  return {
    s: M.create(
      id,
      qs.map((q) => q._finalMeta),
    ),
    qs,
  };
}
function answer(s, ok = true) {
  return M.answer(s, ok, ok ? "дұрыс" : "қате", 1000);
}
function expected(q) {
  const f = q.facts;
  switch (f.type) {
    case "add":
      return f.a + f.b;
    case "multiply":
      return f.a * f.b;
    case "combined":
      return (f.a + f.b) * f.k;
    case "fraction":
      return f.num / f.den;
    case "decimal":
      return ((f.a + f.b) * f.k) / 100;
    case "sets":
      return (
        "{" +
        (f.op === 0
          ? f.A.filter((v) => f.B.includes(v))
          : f.op === 1
            ? [...new Set([...f.A, ...f.B])]
            : [...new Set([...f.A, ...f.B])].filter((v) => f.C.includes(v))
        ).join(",") +
        "}"
      );
    case "percent":
      return f.mode === 0 ? f.n / 4 : f.mode === 1 ? f.n : f.n * 1.2;
    case "ratio":
      return f.a / f.b;
    case "share":
      return (f.total * f.a) / (f.a + f.b);
    case "part-percent":
      return (f.part / f.whole) * 100;
    case "inverse":
      return f.b / f.a;
    case "inverse-share":
      return (f.total * f.b) / (f.a + f.b);
    case "proportion":
      return (f.a * f.d) / f.b;
    case "proportion-middle":
      return (f.a * f.d) / f.c;
    case "cost":
      return (f.total / f.count) * f.newCount;
    case "equation":
      return (f.c - f.b) / (f.a - f.d);
    case "bracket":
      return f.c / f.a - f.b;
    case "power":
      return (f.a ** f.e + f.add) * f.k;
    default:
      throw Error(f.type);
  }
}
test("content: all twelve topics, three structured tiers, independent keys, unambiguous choices and canonical match pairs", () => {
  assert.equal(Object.keys(C.skills).length, 12);
  for (const lesson of Object.keys(C.skills)) {
    for (const tier of [0, 1, 2])
      for (let n = 0; n < 35; n++) {
        const q = C.task(lesson, n, tier);
        assert.ok(R.same(q.answer, expected(q)), lesson + " " + q.question);
        const opts = R.choices(q);
        assert.equal(opts.length, 4);
        assert.equal(new Set(opts.map(R.canonical)).size, 4);
        assert.equal(opts.filter((v) => R.same(v, q.answer)).length, 1);
        assert.equal(q._finalMeta.skill, C.skills[lesson][tier]);
        assert.ok(q._logicExplain.solution.length > 5);
      }
    for (const tier of [0, 1, 2])
      assert.ok(
        new Set(
          Array.from({ length: 35 }, (_, n) =>
            R.canonical(C.task(lesson, n, tier).answer),
          ),
        ).size >= 3,
        lesson + " answers vary at tier " + tier,
      );
    const qs = C.deck("quest", lesson);
    for (const pair of [
      [1, 2],
      [5, 6],
    ])
      assert.equal(R.same(qs[pair[0]].answer, qs[pair[1]].answer), false);
    for (const id of M.ids) {
      const deck = C.deck(id, lesson);
      assert.ok(deck.length >= 4);
      assert.ok(
        deck.every((q) => q._finalMeta.tier >= 0 && q._finalMeta.tier <= 2),
      );
    }
  }
});
test("quest: map locks, distinct station actions, wrong answers never unlock; final integrates multiple skills", () => {
  const { s } = create("quest");
  assert.equal(M.visit(s, 3, 0), false);
  M.visit(s, 0, 0);
  answer(s, false);
  M.next(s, 0);
  assert.equal(s.station, 0);
  answer(s);
  M.next(s, 0);
  assert.equal(s.phase, "map");
  assert.equal(s.station, 1);
  M.visit(s, 1, 0);
  M.match(s, 1, 2, 0);
  assert.equal(s.completed.includes(1), false);
  M.next(s, 0);
  M.match(s, 1, 1, 0);
  assert.equal(s.phase, "task");
  assert.equal(M.match(s, 1, 1, 0), false);
  M.match(s, 2, 2, 0);
  M.next(s, 0);
  assert.equal(s.station, 2);
  M.visit(s, 2, 0);
  assert.equal(answer(s), null);
  M.detect(s, 0, 0);
  M.next(s, 0);
  M.detect(s, 1, 0);
  assert.equal(M.detect(s, 1, 0), false);
  answer(s);
  M.next(s, 0);
  assert.equal(s.station, 3);
  M.visit(s, 3, 0);
  answer(s);
  M.next(s, 0);
  M.match(s, 5, 5, 0);
  M.match(s, 6, 6, 0);
  M.next(s, 0);
  M.detect(s, 1, 0);
  answer(s);
  M.next(s, 0);
  assert.equal(s.finished, true);
  assert.equal(s.completed.length, 8);
});
test("puzzle: each grid has exactly one task per tile; wrong and stale answers reveal no extra tiles", () => {
  for (const grid of [2, 3, 4]) {
    const { s, qs } = create("puzzle", undefined, { grid });
    assert.equal(qs.length, grid * grid);
    M.selectPiece(s, qs.length - 1, 0);
    answer(s, false);
    assert.equal(s.completed.length, 0);
    M.next(s, 0);
    answer(s);
    assert.equal(answer(s), null);
    assert.equal(s.completed.length, 1);
    M.next(s, 0);
    assert.equal(M.selectPiece(s, qs.length - 1, 0), false);
    while (!s.finished) {
      answer(s);
      M.next(s, 0);
    }
    assert.equal(s.completed.length, grid * grid);
  }
});
test("rocket: six upward stages, increasing task tiers and no launch on wrong answer; docking waits for its clock", () => {
  const { s, qs } = create("rocket");
  assert.deepEqual(
    qs.map((q) => q._finalMeta.tier),
    [0, 0, 1, 1, 2, 2],
  );
  answer(s, false);
  M.next(s, 0);
  assert.equal(s.completed.length, 0);
  for (let i = 0; i < 6; i++) {
    answer(s);
    if (i < 5) M.next(s, 0);
  }
  assert.equal(s.phase, "docking");
  assert.equal(s.finished, false);
  M.tick(s, 1600);
  assert.equal(s.finished, false);
  M.tick(s, 2200);
  assert.equal(s.won, true);
  M.tick(s, 999999);
  assert.equal(s.completed.length, 6);
});
test("castle: thinking time does not damage health, purchases are bounded, waves and defeat are independent", () => {
  const { s } = create("castle");
  M.tick(s, 600000);
  assert.equal(s.health, 100);
  answer(s);
  M.next(s, 0);
  answer(s);
  M.next(s, 0);
  assert.equal(s.phase, "maintenance");
  assert.equal(s.wallet, 20);
  assert.equal(M.maintain(s, "armor"), true);
  assert.equal(s.armor, 1);
  assert.equal(M.maintain(s, "armor"), false);
  M.nextWave(s, 0);
  answer(s, false);
  assert.equal(s.health, 75);
  M.next(s, 0);
  answer(s);
  M.next(s, 0);
  assert.equal(M.maintain(s, "repair"), true);
  assert.equal(s.health, 100);
  M.nextWave(s, 0);
  answer(s);
  M.next(s, 0);
  answer(s);
  M.next(s, 0);
  assert.equal(s.won, true);
  const dead = create("castle").s;
  for (let i = 0; i < 3; i++) {
    answer(dead, false);
    if (!dead.finished) {
      M.next(dead, 0);
      if (dead.phase === "maintenance") M.nextWave(dead, 0);
    }
  }
  assert.equal(dead.health, 0);
  assert.equal(dead.finished, true);
  assert.equal(answer(dead), null);
});
test("target: one mathematical grade per question, wrong hits earn zero and points do not depend on coordinates", () => {
  const { s } = create("target");
  answer(s, false);
  assert.equal(answer(s), null);
  M.next(s, 0);
  for (let i = 1; i < 4; i++) {
    answer(s);
    M.next(s, 0);
  }
  assert.equal(s.score, 30);
  assert.equal(s.history.length, 4);
  assert.equal(s.finished, true);
});
test("bridge: wrong answers preserve built segments, all six segments required before crossing, deadline is idempotent", () => {
  const { s } = create("bridge");
  answer(s);
  M.next(s, 0);
  answer(s, false);
  assert.equal(s.completed.length, 1);
  M.next(s, 0);
  for (let i = 1; i < 6; i++) {
    answer(s);
    if (i < 5) M.next(s, 0);
  }
  assert.equal(s.phase, "crossing");
  assert.equal(s.finished, false);
  assert.equal(answer(s), null);
  M.tick(s, 2200);
  assert.equal(s.won, true);
  const count = s.history.length;
  M.tick(s, 99999);
  assert.equal(s.history.length, count);
});
test("king: 80 percent is per level; global points cannot skip gates; a failed retest cannot inherit prior correct rows", () => {
  const { s } = create("math-king");
  s.score = 999999;
  assert.equal(M.visit(s, 3, 0), false);
  M.visit(s, 0, 0);
  for (let i = 0; i < 5; i++) {
    answer(s, i < 4);
    M.next(s, 0);
  }
  assert.equal(s.lastGate.passed, true);
  assert.equal(M.advanceLevel(s), true);
  M.visit(s, 1, 0);
  for (let i = 0; i < 5; i++) {
    answer(s, false);
    M.next(s, 0);
  }
  assert.equal(s.lastGate.correct, 0);
  assert.equal(s.lastGate.passed, false);
  assert.equal(M.advanceLevel(s), false);
  assert.equal(s.passed[1], false);
  assert.equal(s.finished, false);
});
test("king: similar practice cannot pass a level; a fresh five-question retest and all mandatory levels precede the crown", () => {
  const { s } = create("math-king");
  M.visit(s, 0, 0);
  for (let i = 0; i < 5; i++) {
    answer(s, i < 3);
    M.next(s, 0);
  }
  assert.equal(s.phase, "gate");
  s.plan.push(
    { level: 0, tier: 0, kind: "solve" },
    { level: 0, tier: 0, kind: "solve" },
  );
  assert.equal(M.addRound(s, [20, 21], true, 0), true);
  answer(s, false);
  M.next(s, 0);
  assert.equal(s.roundIndex, 0);
  answer(s);
  M.next(s, 0);
  answer(s);
  M.next(s, 0);
  assert.equal(s.phase, "retest");
  assert.equal(s.passed[0], false);
  const fresh = [22, 23, 24, 25, 26];
  s.plan.push(...fresh.map(() => ({ level: 0, tier: 0, kind: "solve" })));
  M.addRound(s, fresh, false, 0);
  for (let i = 0; i < 5; i++) {
    answer(s);
    M.next(s, 0);
  }
  assert.equal(s.passed[0], true);
  M.advanceLevel(s);
  for (let level = 1; level < 4; level++) {
    M.visit(s, level, 0);
    for (let i = 0; i < 5; i++) {
      answer(s);
      M.next(s, 0);
    }
    if (level < 3) M.advanceLevel(s);
  }
  assert.equal(s.phase, "coronation");
  assert.equal(s.finished, false);
  assert.ok(s.passed.every(Boolean));
  M.tick(s, 1200);
  assert.equal(s.won, true);
});
