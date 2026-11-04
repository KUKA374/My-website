const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const M = require("../games-logic-models.js"),
  C = require("../games-logic-content.js");
function bank() {
  const c = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      require("path").join(__dirname, "../games-data.js"),
      "utf8",
    ),
    c,
  );
  return c.window.gameQuestionBank;
}
test("equivalent fractions, decimals, ratios and sets cannot create ambiguous pairs", () => {
  for (const [a, b] of [
    ["3/4", "0,75"],
    ["1/2", "2/4"],
    ["2 : 3", "4:6"],
    ["x = 8", "8"],
    ["{1,2,3}", "{3,2,1}"],
    ["∅", "{}"],
  ])
    assert.equal(M.canonical(a), M.canonical(b));
  const qs = [
      { left: "1/2+1/4", right: "3/4" },
      { left: "0.5+0.25", right: "0,75" },
    ],
    copy = JSON.stringify(qs),
    out = M.uniquePairs(qs);
  assert.equal(out.length, 1);
  assert.equal(out[0].sourceIndices.length, 2);
  assert.equal(JSON.stringify(qs), copy);
  for (const b of Object.values(bank())) {
    const pairs = M.uniquePairs(b.match);
    assert.equal(
      new Set(pairs.map((q) => M.canonical(q.right))).size,
      pairs.length,
    );
    assert.equal(
      pairs.reduce((s, q) => s + q.sourceIndices.length, 0),
      b.match.length,
    );
  }
});
test("both columns are independently randomized and contain each index exactly once", () => {
  let calls = 0;
  const rng = () => [0.1, 0.2, 0.3, 0.8, 0.7, 0.6][calls++];
  const orders = M.orders(4, rng);
  assert.equal(calls, 6);
  assert.notDeepEqual(orders.left, orders.right);
  for (const order of Object.values(orders))
    assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
});
test("each topic has explicit first-error diagnosis, a single correct repair and a complete solution", () => {
  const kinds = new Set(),
    positions = new Set();
  for (const [lesson, b] of Object.entries(bank())) {
    const before = JSON.stringify(b),
      qs = C.errors(lesson, b.quickAnswer);
    assert.equal(qs.length, b.quickAnswer.length);
    for (const q of qs) {
      assert.equal(q.steps.length, 3);
      assert.equal(q.correctSteps.length, 3);
      assert.equal(q.steps[q.firstError] === q.repair, false);
      assert.equal(q.repairOptions.filter((x) => x === q.repair).length, 1);
      for (let i = 0; i < q.firstError; i++)
        assert.equal(q.steps[i], q.correctSteps[i]);
      assert.ok(q.reason.length > 20);
      kinds.add(q.errorKind);
      positions.add(q.firstError);
    }
    assert.equal(JSON.stringify(b), before);
  }
  for (const kind of ["Таңба", "Жақша", "Амалдар реті", "Бөлшек", "Формула"])
    assert.ok(kinds.has(kind));
  assert.deepEqual([...positions].sort(), [0, 1, 2]);
});
test("step detection and repair are independent, immutable assessments", () => {
  const rows = {};
  assert.equal(M.part(rows, "q", "find", false, 0), true);
  assert.equal(M.part(rows, "q", "find", true, 1), false);
  assert.equal(M.part(rows, "q", "fix", true, "x=5"), true);
  assert.equal(M.part(rows, "q", "fix", false, "x=4"), false);
  assert.equal(rows.q.find.correct, false);
  assert.equal(rows.q.fix.correct, true);
});
test("the lock requires every correct part and exact text, retaining leading zeros", () => {
  const qs = [{ code: "0" }, { code: "07" }, { code: "12" }];
  const parts = M.codeParts(qs);
  assert.deepEqual(parts, ["00", "07", "12"]);
  assert.equal(M.canUnlock(qs, parts, "000712"), true);
  assert.equal(M.canUnlock(qs, parts, "712"), false);
  assert.equal(M.canUnlock(qs, [null, "07", "12"], "000712"), false);
  assert.equal(M.canUnlock(qs, ["00", "07", "99"], "000799"), false);
});
test("supplemental concept and applicable diagram modes are unique and topic-scoped", () => {
  for (const lesson of Object.keys(bank())) {
    const qs = C.concepts(lesson);
    assert.equal(qs.length, 4);
    assert.equal(M.uniquePairs(qs).length, 4);
  }
  assert.equal(C.diagrams("5-math-1-1").length, 0);
  for (const lesson of ["6-math-1-1", "6-math-1-4", "7-algebra-1-4"]) {
    const qs = C.diagrams(lesson);
    assert.equal(qs.length, 4);
    assert.equal(M.uniquePairs(qs).length, 4);
    assert.ok(qs.every((q) => q.diagram.filled > 0 && q.diagram.parts > 0));
  }
});
