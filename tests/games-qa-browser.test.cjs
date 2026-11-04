const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture, start } = require("./helpers/browser.cjs");
const helpers = ["final", "timed", "racing", "logic", "mechanics"].map((n) =>
  require("./helpers/" + n + ".cjs"),
);
const helper = (id) => helpers.find((h) => (h.supports || h.supported)(id));
const KEY = "math-ai-game-progress-v1";
async function ready(t, width = 390) {
  const p = await fixture(t, width);
  await p.clock.pauseAt(new Date((await p.evaluate(() => Date.now())) + 1000));
  return p;
}
async function tamper(p, fn) {
  await p.evaluate(
    ({ key, source }) => {
      GameSession.save();
      const s = JSON.parse(localStorage.getItem(key));
      GameSession.stop(false);
      Function("s", source)(s);
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key: KEY, source: fn },
  );
  await p.reload();
}
test("QA: all 20 adapters reject forged numeric progress before rendering and remain playable", async (t) => {
  const p = await ready(t);
  const ids = await p.evaluate(() => mathGames.map((g) => g.id));
  for (const id of ids)
    await t.test(id, async () => {
      await start(p, id);
      await tamper(
        p,
        's.engine.score = \'<img src="/qa-missing.png" onerror="window.qaXss=1">\';',
      );
      assert.equal(await p.locator("#resumeGameBanner button").count(), 0);
      assert.match(
        await p.locator("#resumeGameBanner").innerText(),
        /оқылмады/,
      );
      assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
      await start(p, id);
      assert.equal(await p.evaluate(() => GameSession.canAnswer()), true);
    });
});
test("QA: target saved score cannot execute HTML on resume (confirmed regression)", async (t) => {
  const p = await ready(t);
  await start(p, "target");
  await tamper(
    p,
    's.engine.game.score = \'<img src="/qa-missing.png" onerror="window.qaXss=1">\';',
  );
  assert.equal(await p.locator("#resumeGameBanner button").count(), 0);
  assert.equal(await p.locator('img[src="/qa-missing.png"]').count(), 0);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
test("QA: code slot text cannot break out of its accessible label", async (t) => {
  const p = await ready(t);
  await start(p, "math-code");
  await tamper(
    p,
    's.engine.parts[0] = \'"><img src="/qa-missing.png" onerror="window.qaXss=1">\';',
  );
  await p.locator("#resumeGameBanner button").click();
  assert.equal(await p.locator("#sharedPauseOverlay").isVisible(), true);
  assert.equal(await p.locator('img[src="/qa-missing.png"]').count(), 0);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
  assert.match(
    await p.locator(".logic-code-slot").first().getAttribute("aria-label"),
    /<img/,
  );
});
test("QA: unchanged elapsed labels are not rewritten at twenty frames per second", async (t) => {
  const p = await ready(t);
  await start(p, "target");
  await p.clock.runFor(40);
  await p.evaluate(() => {
    window.qaWrites = 0;
    new MutationObserver((ms) => (window.qaWrites += ms.length)).observe(
      document.getElementById("sharedElapsed"),
      { childList: true, characterData: true, subtree: true },
    );
  });
  await p.clock.runFor(1100);
  const writes = await p.evaluate(() => window.qaWrites);
  assert.ok(
    writes >= 1 && writes <= 2,
    "one update per elapsed second, got " + writes,
  );
  assert.match(await p.locator("#sharedElapsed").textContent(), /^1 секунд$/);
  await p.locator("#pauseGameButton").click();
  const n = await p.evaluate(() => window.qaWrites);
  await p.clock.runFor(2000);
  assert.equal(await p.evaluate(() => window.qaWrites), n);
  await p.locator("#backToGamesButton").click();
  await p.clock.runFor(1000);
  assert.equal(await p.evaluate(() => window.qaWrites), n);
});
test("QA: all 20 games finish with keyboard activation of controls", async (t) => {
  const p = await ready(t, 768);
  const ids = await p.evaluate(() => mathGames.map((g) => g.id));
  const proto = Object.getPrototypeOf(p.locator("body")),
    click = proto.click,
    check = proto.check;
  // Exercise native key activation, not synthetic click dispatch. Helpers still
  // inspect task answers, as in the existing deterministic gameplay tests.
  proto.click = async function () {
    await this.waitFor({ state: "visible" });
    assert.equal(await this.isEnabled(), true);
    await this.focus();
    await this.press("Enter");
  };
  proto.check = async function () {
    if (!(await this.isChecked())) {
      await this.focus();
      await this.press("Space");
    }
    assert.equal(await this.isChecked(), true);
  };
  try {
    for (const id of ids)
      await t.test(id, async () => {
        await start(p, id);
        await helper(id).play(p, id);
        assert.equal(await p.locator("#sharedSummary").isVisible(), true);
      });
  } finally {
    proto.click = click;
    proto.check = check;
  }
});
test("QA: Tab reaches the start, pause and resume controls at 320 px", async (t) => {
  const p = await ready(t, 320);
  await p.locator('[data-game-id="target"]').focus();
  await p.keyboard.press("Enter");
  await p.locator("#startGameButton").focus();
  await p.keyboard.press("Enter");
  await p.locator("#pauseGameButton").focus();
  await p.keyboard.press("Tab");
  assert.equal(
    await p.evaluate(() => document.activeElement.id),
    "sharedHintButton",
  );
  await p.keyboard.press("Shift+Tab");
  await p.keyboard.press("Enter");
  assert.equal(await p.locator("#sharedPauseOverlay").isVisible(), true);
  await p.locator("#resumePausedButton").focus();
  await p.keyboard.press("Enter");
  assert.equal(await p.evaluate(() => GameSession.canAnswer()), true);
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
});

test("QA: code answers and final lock submit on Enter, stale input handlers stay invalid", async (t) => {
  const p = await ready(t);
  await start(p, "math-code");
  await p.evaluate(
    () => (window.qaOldInput = document.getElementById("codeAnswer").onkeydown),
  );
  await p.locator("#backToGamesButton").click();
  await start(p, "math-code");
  await p
    .locator("#codeAnswer")
    .fill(String(await p.evaluate(() => GameLogic.snapshot().qs[0].answer)));
  await p.evaluate(() =>
    window.qaOldInput(new KeyboardEvent("keydown", { key: "Enter" })),
  );
  assert.equal(
    await p.evaluate(() => GameLogic.snapshot().awarded.length),
    0,
    "old session key handler is inert",
  );
  const n = await p.evaluate(() => GameLogic.snapshot().qs.length);
  for (let i = 0; i < n; i++) {
    await p.locator(`[data-code-task="${i}"]`).click();
    await p.locator("#codeAnswer").fill(
      String(
        await p.evaluate(() => {
          const s = GameLogic.snapshot();
          return s.qs[s.index].answer;
        }),
      ),
    );
    await p.locator("#codeAnswer").press("Enter");
    assert.equal(
      await p.evaluate(() => GameLogic.snapshot().awarded.length),
      i + 1,
      "Enter collects a part once",
    );
  }
  await p
    .locator("#lockCode")
    .fill(await p.evaluate(() => GameLogic.snapshot().parts.join("")));
  await p.locator("#lockCode").press("Enter");
  assert.equal(await p.locator("#sharedSummary").isVisible(), true);
});

test("QA: a forged error-step number remains text, not markup", async (t) => {
  const p = await ready(t);
  await start(p, "find-error");
  await tamper(
    p,
    'const q=s.engine.qs[0];q.firstError=\'<img src="/qa-missing.png" onerror="window.qaXss=1">\';s.engine.parts[q._sessionKey]={find:{correct:false,value:0}};',
  );
  await p.locator("#resumeGameBanner button").click();
  assert.equal(await p.locator("#sharedPauseOverlay").isVisible(), true);
  assert.equal(await p.locator('img[src="/qa-missing.png"]').count(), 0);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
  assert.match(await p.locator(".logic-repair").textContent(), /<img/);
});
