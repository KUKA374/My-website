const supports = (id) => ["match", "find-error", "math-code"].includes(id);
async function firstStep(p, id, correct = true) {
  const s = await p.evaluate(() => GameLogic.snapshot());
  if (id === "match") {
    const i = s.qs.findIndex((_, i) => !s.solved.includes(i));
    await p.locator(`[data-match-left="${i}"]`).click();
    await p
      .locator(`[data-match-right="${correct ? i : (i + 1) % s.qs.length}"]`)
      .click();
  } else if (id === "find-error") {
    const q = s.qs[s.index];
    await p
      .locator(
        `[data-error-step="${correct ? q.firstError : (q.firstError + 1) % q.steps.length}"]`,
      )
      .click();
    await p.getByRole("button", { name: q.repair, exact: true }).click();
    await p.locator("#logicNext").click();
  } else {
    await p
      .locator("#codeAnswer")
      .fill(correct ? String(s.qs[s.index].answer) : "999999");
    await p.locator("#codeSubmit").click();
  }
}
async function play(p, id) {
  const n = await p.evaluate(() => GameLogic.snapshot().qs.length);
  for (let i = 0; i < n; i++) await firstStep(p, id);
  if (id === "math-code") {
    await p
      .locator("#lockCode")
      .fill(await p.evaluate(() => GameLogic.snapshot().parts.join("")));
    await p.locator("#unlockCode").click();
  }
  await p.locator("#logicReplay").waitFor();
}
module.exports = { supports, firstStep, play };
