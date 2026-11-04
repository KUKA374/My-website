const assert = require("node:assert/strict");
const supports = (id) =>
  [
    "quest",
    "puzzle",
    "rocket",
    "castle",
    "target",
    "bridge",
    "math-king",
  ].includes(id);
async function firstStep(p, id, good = true, advance = true) {
  let s;
  for (let prep = 0; prep < 8; prep++) {
    s = await p.evaluate(() => GameFinal.snapshot());
    const g = s.game;
    if (g.finished) return;
    if (g.animation) {
      await p.clock.fastForward(1200);
      return;
    }
    if (g.phase === "map") {
      await p
        .locator(
          id === "quest"
            ? `[data-final-station="${g.station}"]`
            : `[data-final-level="${g.level}"]`,
        )
        .click();
      continue;
    }
    if (g.phase === "maintenance") {
      await p.locator("#finalNextWave").click();
      continue;
    }
    if (g.phase === "gate") {
      await p
        .locator(
          g.lastGate.passed ? "#finalAdvanceLevel" : "#finalPracticeLevel",
        )
        .click();
      continue;
    }
    if (g.phase === "retest") {
      await p.locator("#finalRetest").click();
      continue;
    }
    if (g.phase === "feedback") {
      await p.locator("#finalContinue").click();
      continue;
    }
    break;
  }
  s = await p.evaluate(() => GameFinal.snapshot());
  const g = s.game,
    key = id === "math-king" ? g.roundIds[g.roundIndex] : g.index,
    q = s.qs[key];
  if (id === "quest" && q._finalMeta.kind === "match") {
    const right = good
      ? key
      : s.qs.findIndex(
          (v, i) =>
            i !== key &&
            v._finalMeta.kind === "match" &&
            v._finalMeta.station === g.station &&
            !g.completed.includes(i),
        );
    await p.locator(`[data-final-left="${key}"]`).click();
    await p.locator(`[data-final-right="${right}"]`).click();
  } else {
    if (id === "quest" && q._finalMeta.kind === "error" && !g.detected[key])
      await p.locator('[data-final-error="1"]').click();
    if (["puzzle", "castle", "target"].includes(id))
      await p
        .locator(
          `[data-final-answer="${good ? q.options.indexOf(q.answer) : q.options.findIndex((v) => v !== q.answer)}"]`,
        )
        .click();
    else {
      await p.locator("#finalAnswer").fill(good ? String(q.answer) : "999999");
      await p.locator("#finalAnswer").press("Enter");
    }
  }
  if (advance) {
    if (await p.locator("#finalContinue").count())
      await p.locator("#finalContinue").click();
    if (
      await p.evaluate(
        () =>
          !!GameFinal.snapshot().game.animation &&
          !GameFinal.snapshot().game.finished,
      )
    )
      await p.clock.fastForward(1200);
  }
}
async function play(p, id) {
  for (let i = 0; i < 100; i++) {
    if (await p.evaluate(() => GameFinal.snapshot().game.finished)) break;
    await firstStep(p, id);
  }
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.finished),
    true,
    id + " finished through its mechanics",
  );
  await p.locator("#sharedSummary").waitFor();
}
module.exports = { supports, firstStep, play };
