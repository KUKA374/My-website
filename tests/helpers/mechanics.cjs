const supported = (id) => ["detective", "cards", "secret-number"].includes(id);
async function answer(p, correct = true) {
  const q = await p.evaluate(
    () => GameSession.current().questions[GameMechanics.snapshot().index],
  );
  await p
    .locator("#mechanicAnswer")
    .fill(correct ? String(q.answer) : "999999");
  await p.locator("#mechanicSubmit").click();
}
async function firstStep(p, id) {
  if (id === "cards") {
    await p.locator('[data-card="0"]').click();
    await p.locator("#revealCard").click();
    await p.locator('[data-rating="independent"]').click();
  } else {
    await answer(p);
    await p.locator("#mechanicNext").click();
  }
}
async function play(p, id) {
  const n = await p.evaluate(() => GameSession.current().questions.length);
  if (id === "cards") {
    for (let i = 0; i < n; i++) {
      await p.locator(`[data-card="${i}"]`).click();
      await p.locator("#revealCard").click();
      await p.locator('[data-rating="independent"]').click();
    }
    await p.locator("#finishCards").click();
  } else {
    for (let i = 0; i < n; i++) {
      await answer(p);
      await p.locator("#mechanicNext").click();
    }
    if (id === "detective") {
      await p.selectOption(
        "#caseCandidate",
        String(await p.evaluate(() => GameMechanics.snapshot().case.target)),
      );
      for (const el of await p.locator("[data-proof]").all()) await el.check();
      await p.locator("#caseConclude").click();
    } else {
      await p
        .locator("#secretGuess")
        .fill(
          String(
            await p.evaluate(() => GameMechanics.snapshot().secret.number),
          ),
        );
      await p.locator("#submitGuess").click();
    }
  }
  await p.locator("#mechanicsReplay").waitFor();
}
module.exports = { supported, answer, firstStep, play };
