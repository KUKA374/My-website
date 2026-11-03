const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const M = require("../games-racing-models.js"),
  C = require("../games-racing-content.js");
function topics() {
  const c = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../games-data.js"), "utf8"),
    c,
  );
  return Object.keys(c.window.gameQuestionBank);
}
function turn(s, ok) {
  M.enter(s);
  assert.equal(M.settle(s, `${s.round}:${s.turn}`, ok), true);
}
function pair(s, blue, red) {
  turn(s, s.turn === 0 ? blue : red);
  turn(s, s.turn === 0 ? blue : red);
}
function expected(q) {
  const f = q.facts;
  switch (f.type) {
    case "add":
      return f.a + f.b;
    case "subtract":
      return f.a - f.b;
    case "multiply":
      return f.a * f.b;
    case "divide":
      return f.a / f.b;
    case "fraction-add":
      return `${f.a + f.b}/${f.den}`;
    case "fraction-subtract":
      return `${f.a - f.b}/${f.den}`;
    case "fraction-multiply":
      return `${f.a}/${f.x * f.y}`;
    case "fraction-divide":
      return `${f.a * f.b}/${f.den}`;
    case "decimal-add":
      return (f.a + f.b) / 100;
    case "intersection":
      return "{" + f.A.filter((x) => f.B.includes(x)).join(",") + "}";
    case "union":
      return (
        "{" +
        [...new Set([...f.A, ...f.B])].sort((a, b) => a - b).join(",") +
        "}"
      );
    case "percent":
      return (f.n * f.p) / 100;
    case "ratio": {
      const gcd = (a, b) => (b ? gcd(b, a % b) : a),
        d = gcd(f.a, f.b);
      return `${f.a / d}:${f.b / d}`;
    }
    case "inverse":
      return `${f.b}:${f.a}`;
    case "proportion":
      return (f.a * f.d) / f.b;
    case "equation":
      return (f.c - f.b) / f.a;
    case "square":
      return f.a ** 2;
    default:
      throw Error(f.type);
  }
}
test("paired tasks: all topics, independent answer keys, structural difficulty, unique exercises and unambiguous choices", () => {
  for (const lesson of topics())
    for (const id of ["tug-of-war", "math-race"]) {
      const seen = new Set();
      for (let round = 0; round < 7; round++) {
        const pair = C.pair(lesson, round, id);
        assert.equal(pair[0].difficulty, pair[1].difficulty);
        assert.equal(pair[0].facts.type, pair[1].facts.type);
        assert.notEqual(pair[0].mathAnswer, pair[1].mathAnswer);
        for (const q of pair) {
          assert.equal(
            M.same(q.mathAnswer, expected(q)),
            true,
            lesson + " / " + round + " " + JSON.stringify(q),
          );
          assert.equal(
            seen.has(q.question),
            false,
            lesson + " duplicate: " + q.question,
          );
          seen.add(q.question);
          const choices = M.choices(q);
          assert.equal(choices.length, q._racing.kind === "verify" ? 2 : 4);
          assert.equal(choices.filter((x) => M.same(x, q.answer)).length, 1);
          assert.equal(new Set(choices.map(M.canonical)).size, choices.length);
          if (q.claim !== undefined)
            assert.equal(
              q.answer,
              M.same(q.claim, q.mathAnswer) ? "Дұрыс" : "Қате",
            );
          if (q.facts.type === "ratio")
            assert.equal(C.gcd(q.facts.a, q.facts.b), q.facts.k);
        }
        const [a, b] = pair.map((q) => q.facts);
        for (const key of ["a", "b", "c", "d", "n"])
          if (typeof a[key] === "number")
            assert.equal(
              String(Math.abs(a[key])).length,
              String(Math.abs(b[key])).length,
              lesson + " digit class " + key,
            );
      }
    }
});
test("tug: equal pulls, no wrong-answer movement, duplicate guard, boundary confirmed only after equal turns", () => {
  const s = M.createTeam("tug-of-war");
  turn(s, true);
  assert.equal(s.rope, -1);
  assert.equal(M.settle(s, "0:0", true), false);
  turn(s, false);
  assert.equal(s.rope, -1);
  assert.deepEqual(s.turns, [1, 1]);
  M.next(s);
  pair(s, true, false);
  M.next(s);
  turn(s, true);
  assert.equal(s.rope, -3);
  assert.equal(s.finished, false);
  turn(s, false);
  assert.equal(s.finished, true);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.scores, [3, 0]);
  assert.deepEqual(s.turns, [3, 3]);
  assert.equal(M.settle(s, "3:0", true), false);
  const r = M.createTeam("tug-of-war", 1);
  for (let i = 0; i < 3; i++) {
    pair(r, false, true);
    if (!r.finished) M.next(r);
  }
  assert.equal(r.rope, 3);
  assert.equal(r.winner, 1);
});
test("tug: a responding team can cancel a provisional boundary before confirmation", () => {
  const s = M.createTeam("tug-of-war");
  for (let i = 0; i < 2; i++) {
    pair(s, true, false);
    M.next(s);
  }
  turn(s, true);
  assert.equal(s.rope, -3);
  turn(s, true);
  assert.equal(s.rope, -2);
  assert.equal(s.finished, false);
});
test("team ties: overtime is paired and bounded, no random winner is manufactured", () => {
  for (const id of ["tug-of-war", "math-race"]) {
    const s = M.createTeam(id, 1);
    let guard = 0;
    while (!s.finished && guard++ < 10) {
      pair(s, true, true);
      if (!s.finished) M.next(s);
    }
    assert.equal(s.finished, true);
    assert.equal(s.winner, null);
    assert.equal(s.extra, 3);
    assert.equal(s.turns[0], s.turns[1]);
    const decisive = M.createTeam(id);
    while (!decisive.nextExtra) {
      pair(decisive, true, true);
      if (!decisive.nextExtra) M.next(decisive);
    }
    M.next(decisive);
    turn(decisive, true);
    assert.equal(decisive.finished, false);
    turn(decisive, false);
    assert.equal(decisive.winner, 0);
  }
});
test("relay: separate lanes, equal-turn victory, changing stations and rotating members", () => {
  const s = M.createTeam("math-race", 0, 2);
  for (let i = 0; i < 2; i++) {
    pair(s, true, false);
    M.next(s);
  }
  turn(s, true);
  assert.deepEqual(s.positions, [3, 0]);
  assert.equal(s.finished, false);
  turn(s, false);
  assert.equal(s.winner, 0);
  assert.deepEqual(
    s.history.filter((r) => r.team === 0).map((r) => r.member),
    [0, 1, 0],
  );
  assert.deepEqual(s.turns, [3, 3]);
  assert.deepEqual(
    [0, 1, 2].map((r) => C.pair("6-math-1-1", r, "math-race")[0]._racing.kind),
    ["choice", "input", "verify"],
  );
});
test("teams with no finishing score end without falsely announcing a winner", () => {
  for (const id of ["tug-of-war", "math-race"]) {
    const s = M.createTeam(id);
    let guard = 0;
    while (!s.finished && guard++ < 10) {
      pair(s, false, false);
      if (!s.finished) M.next(s);
    }
    assert.equal(s.finished, true);
    assert.equal(s.winner, null);
    assert.equal(s.extra, 3);
    assert.deepEqual(s.scores, [0, 0]);
  }
});
test("car: fixed speed is independent of answers and remains linear at every level", () => {
  for (const profile of ["slow", "medium", "fast"]) {
    const a = M.createCar(profile),
      b = M.createCar(profile);
    M.carAnswer(a, "a", false, 1000);
    M.carAnswer(b, "a", true, 1000);
    M.carTick(a, 7000);
    M.carTick(b, 7000);
    assert.equal(a.computer, b.computer);
    assert.equal(a.computer, 7000 / a.stepMs);
    assert.deepEqual(a.player, 0);
    assert.deepEqual(b.player, 1);
    M.carTick(a, a.finishAt);
    assert.equal(a.finished, true);
    assert.equal(a.winner, "computer");
    assert.equal(a.computer, a.goal);
  }
});
test("car: one move per key, player finish, deadline validation and opponent-free practice", () => {
  const s = M.createCar("fast");
  for (let i = 0; i < 4; i++) {
    assert.equal(M.carAnswer(s, String(i), true, 1000 * (i + 1)), true);
    assert.equal(M.carAnswer(s, String(i), true, 1000 * (i + 1)), false);
  }
  assert.equal(s.player, 4);
  assert.equal(s.winner, "player");
  const late = M.createCar("fast");
  assert.equal(M.carAnswer(late, "q", true, late.finishAt), false);
  assert.equal(late.player, 0);
  assert.equal(late.winner, "computer");
  const practice = M.createCar("practice");
  M.carTick(practice, 999999);
  assert.equal(practice.computer, 0);
  assert.equal(practice.finished, false);
  for (let i = 0; i < 4; i++)
    M.carAnswer(practice, String(i), true, 1000000 + i);
  assert.equal(practice.winner, "player");
});
