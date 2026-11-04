const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  M = require("../constructor-model.js"),
  P = require("../constructor-planning.js");
test("C: reorder and removal preserve the remaining task identities", () => {
  const x = M.create("u"),
    s = x.stages[3];
  P.addTask(x, s.id, { ...M.task(), prompt: "1+1", answer: "2" });
  assert.equal(P.move(x, s.id, -1), true);
  assert.equal(x.stages[2].id, s.id);
  P.remove(x, x.stages[0].id);
  assert.equal(M.tasks(x).length, 1);
  while (x.stages.length > 1) P.remove(x, x.stages[0].id);
  assert.throws(() => P.remove(x, x.stages[0].id));
});
test("C: every template balances 40, 45 and 80 minutes including separate game minutes", () => {
  for (const duration of [40, 45, 80])
    for (const name of Object.keys(P.templates)) {
      const x = M.create("u");
      x.duration = duration;
      x.games = [{ minutes: 5 }];
      const t = P.addTask(x, x.stages[3].id, M.task());
      P.template(x, name);
      assert.equal(M.total(x), duration);
      assert.equal(M.tasks(x)[0].id, t.id);
    }
});
test("C: invalid times rejected; descriptor totals include pair, group, individual and homework", () => {
  const x = M.create("u");
  for (const v of [-1, 1.5, Infinity, "5", 181])
    assert.throws(() => P.minutes(x, x.stages[0].id, v));
  for (const target of [
    x.stages[3].id,
    x.stages[4].id,
    x.stages[5].id,
    "homework",
  ])
    P.addTask(x, target, {
      ...M.task(),
      descriptors: [{ text: "Дәлелдейді", points: 2 }],
    });
  assert.equal(M.points(x), 8);
  assert.equal(M.tasks(x).length, 4);
  assert.equal(M.check(x, "u").homework.length, 1);
});
