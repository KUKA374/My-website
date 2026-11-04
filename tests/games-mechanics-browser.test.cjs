const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, start } = require("./helpers/browser.cjs"),
  H = require("./helpers/mechanics.cjs");
test("detective: complete evidence and supported conclusion on all screens and grades", async (t) => {
  const p = await fixture(t);
  for (const width of [390, 768, 1440])
    for (const grade of ["5", "6", "7"])
      await t.test(width + " / " + grade, async () => {
        await p.setViewportSize({ width, height: 900 });
        if (await p.locator("#gameStage").isVisible())
          await p.locator("#backToGamesButton").click();
        await p.locator('.game-card[data-game-id="detective"]').click();
        await p.selectOption("#gradeSelect", grade);
        await p.locator("#startGameButton").click();
        assert.equal(await p.locator(".candidate").count(), 5);
        await H.play(p, "detective");
        assert.match(
          await p.locator("#gameQuestion").textContent(),
          /Істің шешімі негізделді/,
        );
        assert.equal(
          await p.evaluate(() => GameSession.current().summary().correct),
          4,
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      });
});
test("detective: wrong math opens no evidence; unsupported conclusion cannot finish; state survives reload", async (t) => {
  const p = await fixture(t);
  await start(p, "detective");
  await H.answer(p, false);
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().evidence.length),
    0,
  );
  await p.locator("#mechanicNext").click();
  await H.answer(p);
  await p.locator("#mechanicNext").click();
  await p.locator("#pauseGameButton").click();
  const saved = await p.evaluate(() => GameMechanics.snapshot().evidence);
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(
    await p.evaluate(() => GameMechanics.snapshot().evidence),
    saved,
  );
  await p.locator("#resumePausedButton").click();
  for (let i = 1; i < 4; i++) {
    await H.answer(p);
    await p.locator("#mechanicNext").click();
  }
  await p.locator("#caseConclude").click();
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  assert.match(
    await p.locator(".case-conclusion").textContent(),
    /жеткіліксіз/,
  );
  await p.selectOption(
    "#caseCandidate",
    String(await p.evaluate(() => GameMechanics.snapshot().case.target)),
  );
  for (const el of await p.locator("[data-proof]").all()) await el.check();
  await p.locator("#caseConclude").click();
  assert.equal(await p.locator("#sharedSummary").count(), 1);
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().independent),
    3,
  );
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().assisted),
    1,
  );
});
test("cards: full self-assessment deck on mobile, tablet and desktop, all grades", async (t) => {
  const p = await fixture(t);
  for (const width of [390, 768, 1440])
    for (const grade of ["5", "6", "7"])
      await t.test(width + " / " + grade, async () => {
        await p.setViewportSize({ width, height: 900 });
        if (await p.locator("#gameStage").isVisible())
          await p.locator("#backToGamesButton").click();
        await p.locator('.game-card[data-game-id="cards"]').click();
        await p.selectOption("#gradeSelect", grade);
        await p.locator("#startGameButton").click();
        assert.equal(await p.locator("[data-card]").count(), 4);
        await H.play(p, "cards");
        assert.equal(
          await p.evaluate(
            () => Object.keys(GameSession.current().records).length,
          ),
          0,
        );
        assert.match(
          await p.locator("#sharedSummary").textContent(),
          /Автоматты тексерілген дұрыс жауап/,
        );
        assert.equal(
          await p.evaluate(() => GameSession.current().summary().graded),
          false,
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      });
});
test("cards: scratchwork, reveal, hints and review are preserved without duplicate ratings", async (t) => {
  const p = await fixture(t);
  await start(p, "cards");
  await p.locator('[data-card="0"]').click();
  await p.locator("#cardWork").fill("Ортақ бөлім 4");
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  assert.equal(await p.locator("#cardWork").inputValue(), "Ортақ бөлім 4");
  assert.equal(await p.locator("[data-rating]").count(), 0);
  await p.locator("#revealCard").click();
  await p.locator('[data-rating="repeat"]').evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(
    await p.evaluate(() => Object.keys(GameMechanics.snapshot().rated).length),
    1,
  );
  await p.locator("#reviewCards").click();
  assert.equal(await p.locator("[data-card]").count(), 1);
  await p.locator('[data-card="0"]').click();
  await p.locator("#sharedHintButton").click();
  await p.locator("#revealCard").click();
  await p.locator('[data-rating="independent"]').click();
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().assisted),
    1,
  );
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().review.length),
    0,
  );
  await p.locator("#finishCards").click();
  assert.equal(await p.locator("#sharedSummary").count(), 1);
  assert.equal(
    await p.evaluate(() => Object.keys(GameSession.current().records).length),
    0,
  );
});
test("secret number: complete unique-constraint puzzle on all screens and grades", async (t) => {
  const p = await fixture(t);
  for (const width of [390, 768, 1440])
    for (const grade of ["5", "6", "7"])
      await t.test(width + " / " + grade, async () => {
        await p.setViewportSize({ width, height: 900 });
        if (await p.locator("#gameStage").isVisible())
          await p.locator("#backToGamesButton").click();
        await p.locator('.game-card[data-game-id="secret-number"]').click();
        await p.selectOption("#gradeSelect", grade);
        await p.locator("#startGameButton").click();
        await H.play(p, "secret-number");
        assert.match(
          await p.locator("#gameQuestion").textContent(),
          /Барлық шартқа сай келетін сан біреу/,
        );
        assert.equal(
          await p.evaluate(() => GameSession.current().summary().correct),
          4,
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      });
});
test("secret number: no early win, duplicate guess, pause and reload preserve hidden number and history", async (t) => {
  const p = await fixture(t);
  await start(p, "secret-number");
  const hidden = await p.evaluate(() => GameMechanics.snapshot().secret.number);
  await p.locator("#secretGuess").fill(String(hidden));
  await p.locator("#submitGuess").evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().guesses.length),
    1,
  );
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().secret.number),
    hidden,
  );
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().guesses.length),
    1,
  );
  await p.locator("#resumePausedButton").click();
  await p.locator("#secretGuess").fill(String(hidden));
  await p.locator("#submitGuess").click();
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().guesses.length),
    1,
  );
  for (let i = 0; i < 4; i++) {
    await H.answer(p);
    await p.locator("#mechanicNext").click();
  }
  await p.locator("#secretGuess").fill(String(hidden));
  await p.locator("#submitGuess").click();
  assert.equal(await p.locator("#sharedSummary").count(), 1);
});

test("cards: result review survives a new game and reload, then clears after independent practice", async (t) => {
  const p = await fixture(t);
  await start(p, "cards");
  for (let i = 0; i < 4; i++) {
    await p.locator(`[data-card="${i}"]`).click();
    await p.locator("#revealCard").click();
    await p
      .locator(`[data-rating="${i === 0 ? "repeat" : "independent"}"]`)
      .click();
  }
  await p.locator("#finishCards").click();
  assert.equal(await p.locator("#resultReviewCards").isEnabled(), true);
  await p.locator("#resultReviewCards").click();
  assert.equal(await p.locator("[data-card]").count(), 1);
  await p.locator('[data-card="0"]').click();
  await p.locator("#revealCard").click();
  await p.locator('[data-rating="repeat"]').click();
  await p.locator("#finishCards").click();
  await p.locator("#mechanicsReplay").click();
  assert.equal(await p.locator("[data-card]").count(), 4);
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().review.length),
    1,
  );
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  await p.locator("#reviewCards").click();
  await H.play(p, "cards");
  assert.equal(
    await p.evaluate(() => GameMechanics.snapshot().review.length),
    0,
  );
  assert.equal(await p.locator("#resultReviewCards").isDisabled(), true);
});

test("all three: pause rejects direct actions, exit freezes time, replay invalidates stale handlers", async (t) => {
  const p = await fixture(t);
  for (const id of ["detective", "cards", "secret-number"]) {
    await start(p, id);
    if (id !== "cards")
      await p
        .locator("#mechanicAnswer")
        .fill(
          await p.evaluate(() =>
            String(GameSession.current().questions[0].answer),
          ),
        );
    const selector = id === "cards" ? '[data-card="0"]' : "#mechanicSubmit";
    await p
      .locator(selector)
      .evaluate((el) => (window.oldMechanicAction = el.onclick));
    await p.locator("#pauseGameButton").click();
    const snapshot = await p.evaluate(() => GameMechanics.snapshot());
    const elapsed = await p.evaluate(() => GameSession.clock().time());
    await p.evaluate(() => window.oldMechanicAction());
    await p.clock.fastForward(90000);
    assert.deepEqual(
      await p.evaluate(() => GameMechanics.snapshot()),
      snapshot,
    );
    assert.equal(await p.evaluate(() => GameSession.clock().time()), elapsed);
    await p.locator("#resumePausedButton").click();
    await p.locator("#backToGamesButton").click();
    const stopped = await p.evaluate(() => GameSession.clock().time());
    await p.clock.fastForward(60000);
    assert.equal(await p.evaluate(() => GameSession.clock().time()), stopped);
    await start(p, id);
    await p.evaluate(() => window.oldMechanicAction());
    assert.equal(
      await p.evaluate(() => Object.keys(GameSession.current().records).length),
      0,
    );
    assert.equal(
      await p.evaluate(() => GameMechanics.snapshot().open ?? null),
      null,
    );
  }
});

test("legacy snapshots of changed mechanics show a clear explanation instead of restoring incompatible state", async (t) => {
  const p = await fixture(t);
  for (const id of ["detective", "cards", "secret-number"]) {
    await start(p, id);
    await p.evaluate(() => {
      GameSession.save();
      const key = "math-ai-game-progress-v1",
        saved = JSON.parse(localStorage.getItem(key));
      // Simulate a prior version after stopping the active session, so pagehide
      // cannot overwrite the fixture with a fresh snapshot from this version.
      GameSession.stop(false);
      saved.active = "core";
      localStorage.setItem(key, JSON.stringify(saved));
    });
    await p.reload();
    assert.equal(await p.locator("#resumeGameBanner button").count(), 0);
    assert.match(
      await p.locator("#resumeGameBanner").textContent(),
      /механикасы жаңартылды/,
    );
  }
});

test("all three mechanics complete every available grade and topic without changing the bank", async (t) => {
  const p = await fixture(t, 768);
  const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
  const keys = Object.keys(JSON.parse(bank));
  for (const id of ["detective", "cards", "secret-number"])
    for (const key of keys) {
      if (await p.locator("#gameStage").isVisible())
        await p.locator("#backToGamesButton").click();
      await p.locator(`[data-game-id="${id}"]`).click();
      const [grade, subject, quarter, ...lesson] = key.split("-");
      await p.selectOption("#gradeSelect", grade);
      await p.selectOption("#subjectSelect", subject);
      await p.selectOption("#quarterSelect", quarter);
      await p.selectOption("#lessonSelect", lesson.join("-"));
      await p.locator("#startGameButton").click();
      assert.equal(await p.evaluate(() => GameSession.current().lesson), key);
      await H.play(p, id);
    }
  assert.equal(await p.evaluate(() => JSON.stringify(gameQuestionBank)), bank);
});
