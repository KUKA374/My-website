const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  L = require("../constructor-game-links.js");
const ctx = { window: {} };
vm.runInNewContext(
  fs.readFileSync(require.resolve("../games-learning.js"), "utf8"),
  ctx,
);
const metadata = ctx.window.GameLearning;
test("D: all 20 existing games use real goals/rules and only existing lesson metadata", () => {
  const list = L.list(metadata);
  assert.equal(list.length, 20);
  assert.equal(new Set(list.map((g) => g.id)).size, 20);
  for (const g of list) {
    assert.ok(g.purpose && g.rule);
    assert.equal(g.rule, metadata.rules[g.id][1]);
  }
  assert.equal(L.topics(metadata, 8).length, 0);
  assert.equal(L.topics(metadata, 6).length, 7);
});
test("D: game links never invent launcher query parameters", () => {
  for (const game of L.list(metadata))
    assert.equal(L.link(game.id, "6-math-1-1", 5), "games.html");
});
