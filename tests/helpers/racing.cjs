const supports = (id) => ["tug-of-war", "math-race", "car-race"].includes(id);
async function teamStep(p, correct = true) {
  let s = await p.evaluate(() => GameRacing.snapshot());
  if (s.match.phase === "review") {
    await p.locator("#nextRacingRound").click();
    s = await p.evaluate(() => GameRacing.snapshot());
  }
  if (s.match.phase === "handover") await p.locator("#racingReady").click();
  s = await p.evaluate(() => GameRacing.snapshot());
  if (typeof correct === "function") correct = correct(s);
  const q = s.qs[s.index];
  if (q._racing.kind === "input") {
    await p
      .locator("#racingAnswer")
      .fill(correct ? String(q.answer) : "999999");
    await p.locator("#racingSubmit").click();
  } else {
    const index = correct
      ? q.options.indexOf(String(q.answer))
      : q.options.findIndex((x) => x !== String(q.answer));
    await p.locator(`[data-racing-answer="${index}"]`).click();
  }
}
async function firstStep(p, id, correct = true) {
  const s = await p.evaluate(() => GameRacing.snapshot());
  if (!s.car) return teamStep(p, correct);
  const q = s.qs[s.index];
  if (q._racing?.kind === "input") {
    await p.locator("#carAnswer").fill(correct ? String(q.answer) : "99999");
    await p.locator("#carSubmit").click();
  } else {
    const index = correct
      ? q.options.indexOf(String(q.answer))
      : q.options.findIndex((x) => x !== String(q.answer));
    await p.locator(`[data-car-answer="${index}"]`).click();
  }
  if (await p.locator("#carContinue").count())
    await p.locator("#carContinue").click();
}
async function play(p, id, strategy) {
  for (let guard = 0; guard < 40; guard++) {
    const s = await p.evaluate(() => GameRacing.snapshot());
    if (s.finished) break;
    const correct =
      id === "car-race" ? (strategy ? strategy(s) : true) : strategy || true;
    await firstStep(p, id, correct);
  }
  await p.locator("#racingReplay").waitFor();
}
module.exports = { supports, firstStep, teamStep, play };
