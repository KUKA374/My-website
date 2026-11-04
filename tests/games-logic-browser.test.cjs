const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, start } = require("./helpers/browser.cjs"),
  H = require("./helpers/logic.cjs");
async function lesson(p, id, key, format) {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator(`[data-game-id="${id}"]`).click();
  const [grade, subject, quarter, ...n] = key.split("-");
  await p.selectOption("#gradeSelect", grade);
  await p.selectOption("#subjectSelect", subject);
  await p.selectOption("#quarterSelect", quarter);
  await p.selectOption("#lessonSelect", n.join("-"));
  if (format) await p.selectOption("#logicMatchFormat", format);
  await p.locator("#startGameButton").click();
}
async function codeAnswer(p, correct = true) {
  const s = await p.evaluate(() => GameLogic.snapshot());
  await p
    .locator("#codeAnswer")
    .fill(correct ? String(s.qs[s.index].answer) : "999999");
  await p.locator("#codeSubmit").click();
}
for (const id of ["match", "find-error", "math-code"])
  test(
    id + ": complete from setup to result at three widths and grades",
    async (t) => {
      for (const width of [390, 768, 1440]) {
        const p = await fixture(t, width);
        for (const grade of [5, 6, 7])
          await t.test(width + " / " + grade, async () => {
            await lesson(
              p,
              id,
              grade === 7 ? "7-algebra-1-1" : `${grade}-math-1-1`,
            );
            const n = await p.evaluate(
              () => GameSession.current().questions.length,
            );
            assert.equal(
              await p.locator("#sharedTimeField").isVisible(),
              false,
            );
            await H.play(p, id);
            assert.equal(
              await p.locator("#gameProgress").textContent(),
              "Нәтиже",
            );
            assert.equal(
              await p.evaluate(() => GameSession.current().summary().correct),
              n,
            );
            assert.equal(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
            );
            if (id === "math-code")
              assert.equal(await p.locator(".logic-lock.unlocked").count(), 1);
            await p.locator("#logicReplay").click();
            assert.equal(await p.locator("#sharedSummary").count(), 0);
            await p.locator("#backToGamesButton").click();
          });
      }
    },
  );
test("matching: either column first, wrong pair resets on the shared clock, pause/reload keeps attempts and blocks duplicates", async (t) => {
  const p = await fixture(t);
  await start(p, "match");
  await p.locator('[data-match-right="1"]').click();
  await p.locator('[data-match-left="0"]').click();
  assert.equal(await p.locator(".logic-pair.is-wrong").count(), 2);
  await p.clock.fastForward(300);
  await p.locator("#pauseGameButton").click();
  const saved = await p.evaluate(() => GameLogic.snapshot());
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(await p.evaluate(() => GameLogic.snapshot()), saved);
  await p.clock.fastForward(5000);
  assert.equal(await p.locator(".is-wrong").count(), 2);
  await p.locator("#resumePausedButton").click();
  await p.clock.fastForward(1000);
  assert.equal(await p.locator(".is-wrong").count(), 0);
  await p.locator('[data-match-right="0"]').click();
  await p.locator('[data-match-left="0"]').evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(await p.locator('[data-match-left="0"]').isDisabled(), true);
  assert.equal(await p.locator('[data-match-right="0"]').isDisabled(), true);
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().independent),
    0,
  );
  assert.equal(
    await p.evaluate(
      () => Object.values(GameSession.current().records)[0].attempts,
    ),
    2,
  );
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  for (let i = 1; i < 4; i++) {
    await p.locator(`[data-match-left="${i}"]`).click();
    if (i === 1) await p.locator("#sharedHintButton").click();
    await p.locator(`[data-match-right="${i}"]`).click();
  }
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().independent),
    2,
  );
  assert.match(
    await p.locator(".logic-result-detail").textContent(),
    /Бірінші әрекетте дұрыс: 3/,
  );
});
test("matching: displayed orders, selected card and diagram format survive reload and replay", async (t) => {
  const p = await fixture(t);
  await lesson(p, "match", "7-algebra-1-4", "diagrams");
  const s = await p.evaluate(() => GameLogic.snapshot());
  assert.deepEqual(
    await p
      .locator("[data-match-left]")
      .evaluateAll((bs) => bs.map((b) => Number(b.dataset.matchLeft))),
    s.orders.left,
  );
  assert.deepEqual(
    await p
      .locator("[data-match-right]")
      .evaluateAll((bs) => bs.map((b) => Number(b.dataset.matchRight))),
    s.orders.right,
  );
  assert.equal(await p.locator("svg.logic-diagram").count(), 4);
  await p.locator('[data-match-right="2"]').click();
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(
    await p.locator('[data-match-right="2"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await p.locator("#logicMatchFormat").inputValue(), "diagrams");
  await p.locator("#resumePausedButton").click();
  await p.locator('[data-match-left="2"]').click();
  for (const i of [0, 1, 3]) {
    await p.locator(`[data-match-left="${i}"]`).click();
    await p.locator(`[data-match-right="${i}"]`).click();
  }
  await p.locator("#logicReplay").click();
  assert.equal(await p.locator("svg.logic-diagram").count(), 4);
});
test("matching: equivalent answers merge all original problems without ambiguity", async (t) => {
  const p = await fixture(t);
  const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
  for (const [key, count] of [
    ["6-math-1-3", 3],
    ["6-math-1-4", 2],
  ]) {
    await lesson(p, "match", key);
    assert.equal(await p.locator("[data-match-left]").count(), count);
    assert.equal(
      await p.evaluate(() =>
        GameLogic.snapshot().qs.reduce((n, q) => n + q.sourceIndices.length, 0),
      ),
      4,
    );
    await H.play(p, "match");
  }
  assert.equal(await p.evaluate(() => JSON.stringify(gameQuestionBank)), bank);
});
test("matching: all topic concept boards and only applicable formula diagrams complete", async (t) => {
  const p = await fixture(t, 768),
    keys = await p.evaluate(() => Object.keys(gameQuestionBank));
  for (const key of keys) {
    await lesson(p, "match", key, "concepts");
    await H.play(p, "match");
  }
  for (const key of ["6-math-1-1", "6-math-1-4", "7-algebra-1-4"]) {
    await lesson(p, "match", key, "diagrams");
    assert.equal(await p.locator("svg.logic-diagram").count(), 4);
    await H.play(p, "match");
  }
  await lesson(p, "match", "5-math-1-1");
  assert.equal(
    await p.locator('#logicMatchFormat option[value="diagrams"]').count(),
    0,
  );
});
test("find error: wrong detection and correct repair receive separate immutable grades; error retry is scoped", async (t) => {
  const p = await fixture(t);
  await start(p, "find-error");
  const s = await p.evaluate(() => GameLogic.snapshot()),
    q = s.qs[0];
  await p
    .locator(`[data-error-step="${(q.firstError + 1) % 3}"]`)
    .evaluate((b) => {
      b.click();
      b.click();
    });
  assert.equal(await p.locator("[data-error-step]:enabled").count(), 0);
  assert.equal(await p.locator(".logic-explanation").count(), 0);
  await p.getByRole("button", { name: q.repair, exact: true }).evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(await p.evaluate(() => currentScore), 1);
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().correct),
    0,
  );
  assert.match(
    await p.locator(".logic-explanation").textContent(),
    new RegExp(q.errorKind),
  );
  await p.locator("#logicNext").click();
  for (let i = 1; i < 4; i++) await H.firstStep(p, "find-error");
  assert.match(
    await p.locator(".logic-result-detail").textContent(),
    /3\/4.*4\/4.*7\/8/,
  );
  await p.locator("#retryMistakesButton").click();
  assert.equal(await p.evaluate(() => GameLogic.snapshot().qs.length), 1);
  await H.play(p, "find-error");
});
test("find error: selection before repair persists, so reloading cannot award detection again", async (t) => {
  const p = await fixture(t);
  await start(p, "find-error");
  const q = await p.evaluate(() => GameLogic.snapshot().qs[0]);
  await p.locator(`[data-error-step="${q.firstError}"]`).click();
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  assert.equal(await p.locator("[data-error-step]:enabled").count(), 0);
  await p.getByRole("button", { name: q.repair, exact: true }).click();
  assert.equal(await p.evaluate(() => currentScore), 2);
  assert.equal(
    await p.evaluate(() => Object.keys(GameSession.current().records).length),
    1,
  );
});
test("code: wrong math opens no part, repeated actions add no points, leading zeros and manual entry are required", async (t) => {
  const p = await fixture(t);
  await start(p, "math-code");
  assert.equal(await p.locator("#lockCode").count(), 0);
  await codeAnswer(p, false);
  assert.equal(
    await p.evaluate(
      () => GameLogic.snapshot().parts.filter((x) => x !== null).length,
    ),
    0,
  );
  await p.locator("#retryCodeTask").click();
  await p.locator("#codeAnswer").fill("0.75");
  await p.locator("#codeSubmit").evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(await p.evaluate(() => currentScore), 1);
  assert.equal(await p.evaluate(() => GameLogic.snapshot().awarded.length), 1);
  for (let i = 1; i < 4; i++) await codeAnswer(p);
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  assert.equal(await p.locator("#lockCode").inputValue(), "");
  const code = await p.evaluate(() => GameLogic.snapshot().parts.join(""));
  assert.equal(code[0], "0");
  await p.locator("#lockCode").fill(String(Number(code)));
  await p.locator("#unlockCode").click();
  assert.equal(await p.locator(".unlocked").count(), 0);
  assert.match(
    await p.locator(".logic-code-entry").textContent(),
    /Код сәйкес келмейді/,
  );
  await p.locator('[data-code-task="0"]').click();
  await p.locator("#codeRework").click();
  assert.equal(await p.locator("#lockCode").count(), 0);
  assert.equal(await p.evaluate(() => currentScore), 4);
  await codeAnswer(p);
  assert.equal(await p.evaluate(() => currentScore), 4);
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await p.locator("#lockCode").fill(code);
  await p.locator("#unlockCode").evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(await p.locator("#sharedSummary").count(), 1);
  assert.equal(await p.evaluate(() => GameLogic.snapshot().attempts.length), 2);
  assert.equal(
    await p
      .locator(".unlocked .lock-shackle")
      .evaluate((el) => getComputedStyle(el).animationName),
    "logicUnlock",
  );
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().independent),
    3,
  );
});
test("code: partial work and final entry survive pause and reload without opening the lock", async (t) => {
  const p = await fixture(t);
  await start(p, "math-code");
  await p.locator("#codeAnswer").fill("3/");
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  assert.equal(await p.locator("#codeAnswer").inputValue(), "3/");
  for (let i = 0; i < 4; i++) await codeAnswer(p);
  const code = await p.evaluate(() => GameLogic.snapshot().parts.join(""));
  await p.locator("#lockCode").fill(code.slice(0, 3));
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(await p.locator("#lockCode").inputValue(), code.slice(0, 3));
  assert.equal(await p.locator(".unlocked").count(), 0);
  await p.locator("#resumePausedButton").click();
  await p.locator("#lockCode").fill(code);
  await p.locator("#unlockCode").click();
});
test("all logic games: pause rejects direct handlers and stale handlers after restart do not alter a new game", async (t) => {
  const p = await fixture(t);
  for (const id of ["match", "find-error", "math-code"]) {
    await start(p, id);
    const selector =
      id === "match"
        ? '[data-match-left="0"]'
        : id === "find-error"
          ? '[data-error-step="0"]'
          : "#codeSubmit";
    await p
      .locator(selector)
      .evaluate((el) => (window.staleLogicAction = el.onclick));
    await p.locator("#pauseGameButton").click();
    const before = await p.evaluate(() => GameLogic.snapshot()),
      time = await p.evaluate(() => GameSession.clock().time());
    await p.evaluate(() => window.staleLogicAction());
    await p.clock.fastForward(60000);
    assert.deepEqual(await p.evaluate(() => GameLogic.snapshot()), before);
    assert.equal(await p.evaluate(() => GameSession.clock().time()), time);
    await p.locator("#resumePausedButton").click();
    await p.locator("#backToGamesButton").click();
    const stopped = await p.evaluate(() => GameSession.clock().time());
    await p.clock.fastForward(5000);
    assert.equal(await p.evaluate(() => GameSession.clock().time()), stopped);
    await start(p, id);
    const fresh = await p.evaluate(() => GameLogic.snapshot());
    await p.evaluate(() => window.staleLogicAction());
    assert.deepEqual(await p.evaluate(() => GameLogic.snapshot()), fresh);
  }
});
test("all logic games: every available topic completes without mutating the original bank", async (t) => {
  const p = await fixture(t, 768),
    bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
  for (const id of ["match", "find-error", "math-code"])
    for (const key of Object.keys(JSON.parse(bank))) {
      await lesson(p, id, key);
      await H.play(p, id);
    }
  assert.equal(await p.evaluate(() => JSON.stringify(gameQuestionBank)), bank);
});

test("find error: correct detection with wrong repair keeps one point and the locked feedback after reload", async (t) => {
  const p = await fixture(t);
  await start(p, "find-error");
  const q = await p.evaluate(() => GameLogic.snapshot().qs[0]);
  await p.locator(`[data-error-step="${q.firstError}"]`).click();
  await p
    .getByRole("button", { name: q.steps[q.firstError], exact: true })
    .evaluate((b) => {
      b.click();
      b.click();
    });
  const parts = await p.evaluate(
    () => Object.values(GameLogic.snapshot().parts)[0],
  );
  assert.equal(parts.find.correct, true);
  assert.equal(parts.fix.correct, false);
  assert.equal(await p.evaluate(() => currentScore), 1);
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().correct),
    0,
  );
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  assert.equal(await p.evaluate(() => currentScore), 1);
  assert.equal(await p.locator("[data-repair]:enabled").count(), 0);
  assert.equal(await p.locator(".logic-explanation ol li").count(), 3);
});

test("old snapshots of changed logic mechanics are rejected with a localized restart explanation", async (t) => {
  const p = await fixture(t);
  for (const id of ["match", "find-error", "math-code"]) {
    await start(p, id);
    await p.evaluate(() => {
      GameSession.save();
      const k = "math-ai-game-progress-v1",
        saved = JSON.parse(localStorage.getItem(k));
      GameSession.stop(false);
      saved.active = "core";
      localStorage.setItem(k, JSON.stringify(saved));
    });
    await p.reload();
    assert.equal(await p.locator("#resumeGameBanner button").count(), 0);
    assert.match(
      await p.locator("#resumeGameBanner").textContent(),
      /механикасы жаңартылды/,
    );
  }
});
