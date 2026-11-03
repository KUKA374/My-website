const assert = require("node:assert/strict");
const supports = (id) =>
  ["quick-answer", "blitz", "wheel", "auction"].includes(id);
async function firstStep(p, id, correct = true) {
  let s = await p.evaluate(() => GameTimed.snapshot());
  if (s.game.phase === "ready") {
    await p.locator("#spinTeamWheel").click();
    await p.clock.fastForward(1600);
  }
  if (s.game.phase === "bid") {
    await p.locator("#timedBid").fill("10");
    await p.locator("#timedConfirmBid").click();
  }
  s = await p.evaluate(() => GameTimed.snapshot());
  const q = s.qs[s.game.recovery ? s.game.count + s.game.index : s.game.index],
    value = correct ? q.answer : "999999";
  if (id === "quick-answer") {
    await p.locator("#quickAnswerInput").fill(String(value));
    await p.locator("#quickAnswerInput").press("Enter");
  } else {
    const i = correct
      ? q.options.indexOf(q.answer)
      : q.options.findIndex((v) => v !== q.answer);
    await p.locator(`[data-timed-answer="${i}"]`).click();
    if (await p.locator("#timedContinue").count())
      await p.locator("#timedContinue").click();
  }
}
async function play(p, id) {
  if (id === "quick-answer") {
    for (
      let i = 0;
      i < 4 && !(await p.evaluate(() => GameTimed.snapshot().game.finished));
      i++
    )
      await firstStep(p, id);
    const s = await p.evaluate(() => GameTimed.snapshot());
    if (!s.game.finished)
      await p.clock.fastForward(s.game.seconds * 1000 + 100);
  } else
    for (let i = 0; i < 40; i++) {
      if (await p.evaluate(() => GameTimed.snapshot().game.finished)) break;
      await firstStep(p, id);
    }
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.finished),
    true,
    id + " completed",
  );
  await p.locator("#sharedSummary").waitFor();
}
module.exports = { supports, firstStep, play };
