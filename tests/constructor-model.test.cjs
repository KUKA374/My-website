const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  M = require("../constructor-model.js");
test("default lesson has eight stages and exactly 45 minutes", () => {
  const x = M.create("u");
  assert.equal(x.stages.length, 8);
  assert.equal(M.total(x), 45);
  assert.equal(M.check(x, "u").ownerId, "u");
});
test("duration changes do not silently alter teacher minutes", () => {
  const x = M.create("u");
  x.duration = 80;
  assert.equal(M.total(x), 45);
  assert.match(M.warnings(x).join(" "), /80/);
  M.balance(x);
  assert.equal(M.total(x), 80);
});
test("version, owner, prototype, bounds and duplicate task IDs fail closed", () => {
  for (const change of [
    (x) => (x.ownerId = "other"),
    (x) => (x.schemaVersion = 1),
    (x) => (x.stages[0].minutes = -1),
    (x) => (x.stages[0].minutes = "3"),
    (x) => (x.extra = JSON.parse('{"__proto__":{}}')),
    (x) => x.stages.push(x.stages[0]),
  ]) {
    const x = M.create("u");
    change(x);
    assert.throws(() => M.check(x, "u"));
  }
});
test("copy creates a new lesson without mutating the source or claiming review", () => {
  const x = M.create("u");
  x.reviewed = true;
  const y = M.copy(x);
  assert.notEqual(y.id, x.id);
  assert.equal(y.reviewed, false);
  assert.equal(x.reviewed, true);
});
