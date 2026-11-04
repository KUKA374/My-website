const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const M = require("../games-mechanics-models.js");
function bank() {
  const c = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../games-data.js"), "utf8"),
    c,
  );
  return c.window.gameQuestionBank;
}
test("detective evidence narrows every topic to exactly one supported conclusion", () => {
  for (const b of Object.values(bank()))
    for (let target = 0; target < 5; target++) {
      const c = M.detective(b.quickAnswer, 1, target),
        all = b.quickAnswer.map((q, index) => ({ index, answer: q.answer }));
      let size = c.candidates.length;
      for (const e of all) {
        const n = M.compatible(c, all.slice(0, e.index + 1)).length;
        assert.ok(n < size);
        size = n;
      }
      assert.deepEqual(M.compatible(c, all), [target]);
      assert.equal(
        M.conclude(
          c,
          all,
          target,
          all.map((e) => e.index),
        ),
        true,
      );
      assert.equal(
        M.conclude(
          c,
          all,
          (target + 1) % 5,
          all.map((e) => e.index),
        ),
        false,
      );
      assert.equal(M.conclude(c, all, target, []), false);
    }
});
test("secret constraints uniquely determine every two and three digit number", () => {
  for (let n = 10; n <= 999; n++) {
    const s = M.secret(n, 4);
    assert.deepEqual(s.candidates, [n]);
    assert.equal(s.groups.length, 4);
    assert.ok(s.groups.flat().every((c) => M.satisfies(n, c)));
  }
});
test("review subsets still have valid unique evidence and secret clues", () => {
  for (let count = 1; count <= 4; count++) {
    const qs = Array.from({ length: count }, (_, i) => ({
        answer: String(i + 2),
      })),
      c = M.detective(qs, 0, 1),
      e = qs.map((q, index) => ({ index, answer: q.answer }));
    assert.deepEqual(M.compatible(c, e), [1]);
    assert.equal(M.secret(326, count).groups.flat().length, 4);
  }
  assert.throws(() => M.secret(0, 4));
});
test("self-assessment is idempotent and help cannot be labeled independent", () => {
  const s = { rated: {} };
  assert.equal(M.rateCard(s, "a", "independent", true), "assisted");
  assert.equal(M.rateCard(s, "a", "independent"), false);
  assert.equal(M.rateCard(s, "b", "repeat"), "repeat");
  assert.equal(M.rateCard(s, "c", "nonsense"), false);
});
