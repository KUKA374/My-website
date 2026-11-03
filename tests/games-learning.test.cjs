const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
function load() {
  const c = vm.createContext({ window: {} });
  for (const file of ["games-data.js", "games-learning.js"])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      c,
    );
  return c;
}
test("all 20 games have an explicit purpose, instructions and outcome rule", () => {
  const c = load(),
    rules = c.window.GameLearning.rules;
  assert.equal(Object.keys(rules).length, 20);
  for (const rows of Object.values(rules))
    assert.ok(rows.length === 3 && rows.every((s) => s.length > 15));
});
test("all preserved topics have hints and worked solutions, not generic answer reveals", () => {
  const c = load(),
    l = c.window.GameLearning;
  const result = vm.runInContext("Object.entries(gameQuestionBank)", c);
  for (const [lesson, bank] of result) {
    assert.ok(l.lessons[lesson]);
    for (const qs of Object.values(bank).filter(Array.isArray))
      for (const q of qs) {
        const info = l.explain(lesson, q);
        assert.ok(info.hint.length > 20);
        assert.ok(info.solution.length > 12, lesson + " " + JSON.stringify(q));
        assert.ok(!info.solution.includes("әзірленбеген"));
      }
  }
});
test("duplicate answers use the actual question, not the first matching answer", () => {
  const c = load(),
    l = c.window.GameLearning,
    bank = c.window.gameQuestionBank;
  assert.match(
    l.explain("6-math-1-4", bank["6-math-1-4"].quickAnswer[1]).solution,
    /80/,
  );
  assert.match(
    l.explain("6-math-1-3", bank["6-math-1-3"].quickAnswer[3]).solution,
    /5/,
  );
  assert.match(
    l.explain("7-algebra-1-1", bank["7-algebra-1-1"]["tug-of-war"][4]).solution,
    /4x = 60/,
  );
});
