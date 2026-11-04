const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, start } = require("./helpers/browser.cjs"),
  H = require("./helpers/racing.cjs");
test("tug: a complete fair match, boundary, winner and replay on phone, tablet and desktop", async (t) => {
  for (const [width, grade] of [390, 768, 1440].flatMap((w) =>
    ["5", "6", "7"].map((g) => [w, g]),
  ))
    await t.test(width + " / " + grade, async (t) => {
      const p = await fixture(t, width);
      await p.locator('[data-game-id="tug-of-war"]').click();
      await p.selectOption("#gradeSelect", grade);
      await p.locator("#startGameButton").click();
      assert.equal(await p.locator(".rope-center").count(), 1);
      assert.equal(await p.locator(".rope-knot").count(), 1);
      await H.play(p, "tug-of-war", (s) => s.match.turn === 0);
      const m = await p.evaluate(() => GameRacing.snapshot().match);
      assert.equal(m.rope, -3);
      assert.equal(m.winner, 0);
      assert.deepEqual(m.turns, [3, 3]);
      assert.deepEqual(m.scores, [3, 0]);
      assert.match(
        await p.locator(".racing-finish").textContent(),
        /Көк команда жеңді/,
      );
      assert.equal(await p.locator("#sharedSummary").count(), 1);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await p.locator("#racingReplay").click();
      assert.deepEqual(
        await p.evaluate(() => GameRacing.snapshot().match.scores),
        [0, 0],
      );
    });
});
test("tug: equal main rounds start paired overtime, and an extra round can decide the winner", async (t) => {
  const p = await fixture(t);
  await start(p, "tug-of-war");
  for (let i = 0; i < 8; i++) await H.teamStep(p, true);
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  await p.locator("#nextRacingRound").click();
  assert.equal(await p.evaluate(() => GameRacing.snapshot().match.extra), 1);
  assert.equal(await p.evaluate(() => GameRacing.snapshot().match.goal), 1);
  await H.play(p, "tug-of-war", (s) => s.match.turn === 1);
  const m = await p.evaluate(() => GameRacing.snapshot().match);
  assert.equal(m.winner, 1);
  assert.equal(m.rope, 1);
  assert.equal(m.turns[0], m.turns[1]);
});
test("tug: duplicate answer, wrong movement, pause, reload and exit preserve exactly one turn", async (t) => {
  const p = await fixture(t);
  await start(p, "tug-of-war");
  await p.locator("#racingReady").click();
  const s = await p.evaluate(() => GameRacing.snapshot()),
    q = s.qs[s.index],
    wrong = q.options.findIndex((x) => x !== q.answer);
  await p.locator(`[data-racing-answer="${wrong}"]`).evaluate((b) => {
    window.oldRacingAnswer = b.onclick;
    b.click();
    b.click();
  });
  assert.equal(
    await p.evaluate(() => GameRacing.snapshot().match.history.length),
    1,
  );
  assert.equal(await p.evaluate(() => GameRacing.snapshot().match.rope), 0);
  await p.locator("#pauseGameButton").click();
  const saved = await p.evaluate(() => GameRacing.snapshot());
  const time = await p.evaluate(() => GameSession.clock().time());
  await p.clock.fastForward(60000);
  assert.equal(await p.evaluate(() => GameSession.clock().time()), time);
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(await p.evaluate(() => GameRacing.snapshot()), saved);
  await p.locator("#resumePausedButton").click();
  await H.teamStep(p, true);
  assert.equal(
    await p.evaluate(() => GameRacing.snapshot().match.history.length),
    2,
  );
  await p.locator("#backToGamesButton").click();
  const stopped = await p.evaluate(() => GameSession.clock().time());
  await p.clock.fastForward(10000);
  assert.equal(await p.evaluate(() => GameSession.clock().time()), stopped);
});

test("relay: two separate tracks, a complete win and equal turns at each screen and grade", async (t) => {
  for (const width of [390, 768, 1440]) {
    const p = await fixture(t, width);
    for (const grade of [5, 6, 7])
      await t.test(width + " / " + grade, async () => {
        if (await p.locator("#gameStage").isVisible())
          await p.locator("#backToGamesButton").click();
        await p.locator('[data-game-id="math-race"]').click();
        await p.selectOption("#gradeSelect", String(grade));
        await p.locator("#startGameButton").click();
        assert.equal(await p.locator(".racing-lane").count(), 2);
        await H.play(p, "math-race", (s) => s.match.turn === 0);
        const m = await p.evaluate(() => GameRacing.snapshot().match);
        assert.deepEqual(m.positions, [3, 0]);
        assert.deepEqual(m.turns, [3, 3]);
        assert.equal(m.winner, 0);
        assert.match(
          await p.locator(".racing-finish").textContent(),
          /Көк команда жеңді/,
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      });
  }
});
test("relay: stations change, members alternate, simultaneous finish enters fair overtime", async (t) => {
  const p = await fixture(t);
  await start(p, "math-race");
  await H.teamStep(p, true);
  assert.equal(await p.locator(".racing-task").count(), 0);
  assert.equal(await p.locator("#sharedHelpText").isVisible(), false);
  await H.teamStep(p, true);
  await p.locator("#nextRacingRound").click();
  await p.locator("#racingReady").click();
  assert.equal(await p.locator("#racingAnswer").count(), 1);
  assert.match(await p.locator(".racing-task h3").textContent(), /2-қатысушы/);
  await H.teamStep(p, true);
  await H.teamStep(p, true);
  await p.locator("#nextRacingRound").click();
  await p.locator("#racingReady").click();
  assert.deepEqual(
    await p.locator("[data-racing-answer]").allTextContents(),
    await p.evaluate(
      () => GameRacing.snapshot().qs[GameRacing.snapshot().index].options,
    ),
  );
  assert.equal(await p.locator("[data-racing-answer]").count(), 2);
  await H.teamStep(p, true);
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  await H.teamStep(p, true);
  assert.equal(
    await p.evaluate(() => GameRacing.snapshot().match.nextExtra),
    1,
  );
  await p.locator("#nextRacingRound").click();
  assert.equal(await p.evaluate(() => GameRacing.snapshot().match.goal), 4);
  await H.play(p, "math-race", (s) => s.match.turn === 1);
  assert.equal(await p.evaluate(() => GameRacing.snapshot().match.winner), 1);
});
test("relay: saved positions, members and a partly completed pair survive reload without a free turn", async (t) => {
  const p = await fixture(t);
  await start(p, "math-race");
  await H.teamStep(p, true);
  await H.teamStep(p, false);
  await p.locator("#nextRacingRound").click();
  await p.locator("#racingReady").click();
  await p.locator("#racingAnswer").fill("1/");
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(await p.locator("#racingAnswer").inputValue(), "1/");
  const before = await p.evaluate(() => GameRacing.snapshot());
  await p.clock.fastForward(30000);
  assert.deepEqual(await p.evaluate(() => GameRacing.snapshot()), before);
  await p.locator("#resumePausedButton").click();
  await H.teamStep(p, true);
  assert.equal(
    await p.evaluate(() => GameRacing.snapshot().match.history.length),
    3,
  );
});

async function startCar(p, profile = "medium", grade = "6") {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator('[data-game-id="car-race"]').click();
  await p.selectOption("#gradeSelect", grade);
  await p.selectOption("#racingOpponent", profile);
  await p.locator("#startGameButton").click();
}
async function freeze(p) {
  await p.clock.pauseAt(new Date((await p.evaluate(() => Date.now())) + 1000));
}
test("car: player and opponent have separate lanes; full finish on each screen and grade", async (t) => {
  for (const width of [390, 768, 1440]) {
    const p = await fixture(t, width);
    await freeze(p);
    for (const grade of ["5", "6", "7"])
      await t.test(width + " / " + grade, async () => {
        await startCar(p, "medium", grade);
        assert.equal(await p.locator(".racing-car .racing-lane").count(), 2);
        await H.play(p, "car-race");
        const c = await p.evaluate(() => GameRacing.snapshot().car);
        assert.equal(c.winner, "player");
        assert.equal(c.player, c.goal);
        assert.equal(await p.locator("#sharedSummary").count(), 1);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await p.locator("#racingReplay").click();
        assert.equal(
          await p.evaluate(() => GameRacing.snapshot().car.player),
          0,
        );
      });
  }
});
test("car: all speed levels follow a fixed clock; pause and reload retain exact positions and deadline", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const [profile, step] of [
    ["slow", 30000],
    ["medium", 20000],
    ["fast", 12000],
  ]) {
    await startCar(p, profile);
    await p.clock.fastForward(step);
    assert.equal(await p.evaluate(() => GameRacing.snapshot().car.computer), 1);
    await p.locator("#pauseGameButton").click();
    const saved = await p.evaluate(() => GameRacing.snapshot().car),
      elapsed = await p.evaluate(() => GameSession.clock().time());
    await p.clock.fastForward(60000);
    assert.deepEqual(await p.evaluate(() => GameRacing.snapshot().car), saved);
    assert.equal(await p.evaluate(() => GameSession.clock().time()), elapsed);
    await p.reload();
    await p.locator("#resumeGameBanner button").click();
    assert.deepEqual(await p.evaluate(() => GameRacing.snapshot().car), saved);
    assert.equal(await p.locator("#racingOpponent").inputValue(), profile);
    await p.locator("#resumePausedButton").click();
    await p.clock.fastForward(step * 3);
    assert.equal(
      await p.evaluate(() => GameRacing.snapshot().car.winner),
      "computer",
    );
    assert.equal(await p.locator("[data-car-answer]").count(), 0);
  }
});
test("car: opponent speed cannot depend on a correct or wrong answer or a changed hidden selector", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  const positions = [];
  for (const correct of [true, false]) {
    await startCar(p);
    await p.clock.fastForward(1000);
    const q = await p.evaluate(() => GameRacing.snapshot().qs[0]),
      i = correct
        ? q.options.indexOf(q.answer)
        : q.options.findIndex((x) => x !== q.answer);
    await p.locator(`[data-car-answer="${i}"]`).click();
    await p.evaluate(
      () => (document.getElementById("racingOpponent").value = "fast"),
    );
    await p.clock.fastForward(7000);
    positions.push(await p.evaluate(() => GameRacing.snapshot().car.computer));
    assert.equal(
      await p.evaluate(() => GameRacing.snapshot().car.stepMs),
      20000,
    );
    assert.equal(
      await p.evaluate(() => GameRacing.snapshot().car.player),
      correct ? 1 : 0,
    );
  }
  assert.deepEqual(positions, [0.4, 0.4]);
});
test("car: duplicate answers and a saved correct-answer checkpoint never produce a second movement", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await startCar(p, "practice");
  let q = await p.evaluate(() => GameRacing.snapshot().qs[0]),
    wrong = q.options.findIndex((x) => x !== q.answer);
  await p.locator(`[data-car-answer="${wrong}"]`).evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal(await p.evaluate(() => GameRacing.snapshot().car.player), 0);
  assert.equal(
    await p.evaluate(() => GameRacing.snapshot().attempts.length),
    1,
  );
  await p.locator("#carContinue").click();
  q = await p.evaluate(() => GameRacing.snapshot().qs[0]);
  await p
    .locator(`[data-car-answer="${q.options.indexOf(q.answer)}"]`)
    .evaluate((b) => {
      window.staleCarSubmit = b.onclick;
      b.click();
      b.click();
    });
  assert.equal(await p.evaluate(() => GameRacing.snapshot().car.player), 1);
  assert.equal(
    await p.evaluate(() => GameRacing.snapshot().attempts.length),
    2,
  );
  await p.evaluate(() => window.staleCarSubmit());
  assert.equal(await p.evaluate(() => GameRacing.snapshot().car.player), 1);
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  assert.equal(await p.evaluate(() => GameRacing.snapshot().car.player), 1);
  await p.locator("#carContinue").click();
  assert.equal(await p.evaluate(() => GameRacing.snapshot().index), 1);
  await H.play(p, "car-race");
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().independent),
    3,
  );
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().assisted),
    1,
  );
});
test("car: practice has no opponent, no time limit and preserves pre-answer help", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await startCar(p, "practice");
  assert.equal(await p.locator("#car-computer-vehicle").count(), 0);
  await p.clock.fastForward(600000);
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  await p.locator("#sharedHintButton").click();
  await H.play(p, "car-race");
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().assisted),
    1,
  );
  assert.match(
    await p.locator(".racing-finish").textContent(),
    /Жаттығу аяқталды/,
  );
});
test("car: expiry wins before a late click; exit cancels all movement and stale actions", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await startCar(p, "fast");
  await p
    .locator('[data-car-answer="0"]')
    .evaluate((b) => (window.lateCarAnswer = b.onclick));
  await p.clock.fastForward(48000);
  await p.evaluate(() => window.lateCarAnswer());
  assert.equal(await p.evaluate(() => GameRacing.snapshot().car.player), 0);
  assert.equal(
    await p.evaluate(() => Object.keys(GameSession.current().records).length),
    0,
  );
  await startCar(p);
  await p.clock.fastForward(5000);
  await p.locator("#backToGamesButton").click();
  const before = await p.evaluate(() => GameRacing.snapshot());
  await p.clock.fastForward(90000);
  assert.deepEqual(await p.evaluate(() => GameRacing.snapshot()), before);
  await startCar(p);
  const fresh = await p.evaluate(() => GameRacing.snapshot());
  await p.evaluate(() => window.lateCarAnswer());
  assert.deepEqual(await p.evaluate(() => GameRacing.snapshot()), fresh);
});
test("car: a team match can launch only its mistakes as an opponent-free practice session", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await start(p, "math-race");
  await H.play(p, "math-race", (s) => s.match.turn === 0);
  await p.locator("#racingPracticeMistakes").click();
  const s = await p.evaluate(() => GameRacing.snapshot());
  assert.equal(s.id, "car-race");
  assert.equal(s.practice, true);
  assert.equal(s.qs.length, 3);
  assert.equal(s.car.profile, "practice");
  assert.equal(await p.locator("#car-computer-vehicle").count(), 0);
  await H.play(p, "car-race");
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().correct),
    3,
  );
  assert.equal(await p.locator("#racingPracticeMistakes").isDisabled(), true);
});

test("racing: every available topic completes and preserves the 5–7 grade bank", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
  for (const id of ["tug-of-war", "math-race", "car-race"])
    for (const key of Object.keys(JSON.parse(bank))) {
      if (await p.locator("#gameStage").isVisible())
        await p.locator("#backToGamesButton").click();
      await p.locator(`[data-game-id="${id}"]`).click();
      const [grade, subject, quarter, ...lesson] = key.split("-");
      await p.selectOption("#gradeSelect", grade);
      await p.selectOption("#subjectSelect", subject);
      await p.selectOption("#quarterSelect", quarter);
      await p.selectOption("#lessonSelect", lesson.join("-"));
      await p.locator("#startGameButton").click();
      await H.play(
        p,
        id,
        id === "car-race" ? undefined : (s) => s.match.turn === 0,
      );
    }
  assert.equal(await p.evaluate(() => JSON.stringify(gameQuestionBank)), bank);
});
test("racing: identical results exhaust three fair extra rounds and never invent a winner", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ["tug-of-war", "math-race"]) {
    await start(p, id);
    await H.play(p, id);
    const m = await p.evaluate(() => GameRacing.snapshot().match);
    assert.equal(m.extra, 3);
    assert.equal(m.winner, null);
    assert.equal(m.turns[0], m.turns[1]);
    assert.match(
      await p.locator(".racing-finish").textContent(),
      /Жеңімпаз анықталмады/,
    );
  }
});
test("racing: pause and stale handlers cannot answer in a new session", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ["tug-of-war", "math-race", "car-race"]) {
    await start(p, id);
    if (id !== "car-race") await p.locator("#racingReady").click();
    const selector =
      id === "car-race" ? '[data-car-answer="0"]' : '[data-racing-answer="0"]';
    await p
      .locator(selector)
      .evaluate((el) => (window.oldRacingControl = el.onclick));
    await p.locator("#pauseGameButton").click();
    const before = await p.evaluate(() => GameRacing.snapshot());
    await p.evaluate(() => window.oldRacingControl());
    await p.clock.fastForward(90000);
    assert.deepEqual(await p.evaluate(() => GameRacing.snapshot()), before);
    await p.locator("#resumePausedButton").click();
    await p.locator("#backToGamesButton").click();
    await start(p, id);
    const fresh = await p.evaluate(() => GameRacing.snapshot());
    await p.evaluate(() => window.oldRacingControl());
    assert.deepEqual(await p.evaluate(() => GameRacing.snapshot()), fresh);
  }
});
test("racing: old team and scene saves require an explained restart instead of a corrupt migration", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ["tug-of-war", "math-race", "car-race"]) {
    await start(p, id);
    await p.evaluate(() => {
      GameSession.save();
      const key = "math-ai-game-progress-v1",
        saved = JSON.parse(localStorage.getItem(key));
      GameSession.stop(false);
      saved.active = "teams";
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

test("tug: one correct pull covers the same screen distance in main rounds and overtime", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  await start(p, "tug-of-war");
  const center = (await p.locator(".rope-knot").boundingBox()).x;
  await H.teamStep(p, true);
  const primary = Math.abs(
    (await p.locator(".rope-knot").boundingBox()).x - center,
  );
  await H.teamStep(p, true);
  for (let i = 0; i < 6; i++) await H.teamStep(p, true);
  await p.locator("#nextRacingRound").click();
  const nextCenter = (await p.locator(".rope-knot").boundingBox()).x;
  await H.teamStep(p, true);
  const extra = Math.abs(
    (await p.locator(".rope-knot").boundingBox()).x - nextCenter,
  );
  assert.ok(primary > 20);
  assert.ok(Math.abs(primary - extra) < 1);
});
