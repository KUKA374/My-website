const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture } = require("./helpers/browser.cjs"),
  H = require("./helpers/final.cjs");
const ids = [
  "quest",
  "puzzle",
  "rocket",
  "castle",
  "target",
  "bridge",
  "math-king",
];
async function freeze(p) {
  await p.clock.pauseAt(new Date((await p.evaluate(() => Date.now())) + 1000));
}
async function open(p, id, grade = "6", grid = 2) {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator(`[data-game-id="${id}"]`).click();
  await p.selectOption("#gradeSelect", grade);
  if (id === "puzzle") await p.selectOption("#finalPuzzleGrid", String(grid));
  await p.locator("#startGameButton").click();
}
async function fits(p) {
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(
    await p
      .locator("#gameStage button,#gameStage input,#gameStage select")
      .evaluateAll((es) =>
        es
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.width && r.height && (r.left < -1 || r.right > innerWidth + 1)
            );
          })
          .map((e) => e.outerHTML.slice(0, 100)),
      ),
    [],
  );
}
for (const id of ids)
  test(
    id +
      ": setup to result, grades 5–7, three widths, replay and local learning results",
    async (t) => {
      for (const width of [390, 768, 1440]) {
        const p = await fixture(t, width);
        await freeze(p);
        for (const grade of ["5", "6", "7"])
          await t.test(width + " / " + grade, async () => {
            await open(p, id, grade);
            await fits(p);
            await H.play(p, id);
            await fits(p);
            if (id === "rocket") {
              const bounds = await p.evaluate(() => {
                const scene = document
                  .querySelector(".final-rocket-scene")
                  .getBoundingClientRect();
                const ship = document
                  .querySelector("#finalRocketShip")
                  .getBoundingClientRect();
                return {
                  top: ship.top - scene.top,
                  bottom: scene.bottom - ship.bottom,
                  left: ship.left - scene.left,
                  right: scene.right - ship.right,
                };
              });
              assert.ok(
                Object.values(bounds).every((n) => n >= 0),
                JSON.stringify(bounds),
              );
            }
            assert.equal(
              await p.locator("#gameProgress").textContent(),
              "Нәтиже",
            );
            assert.equal(await p.locator("#sharedSummary").count(), 1);
            assert.match(
              await p.locator("#sharedSummary").textContent(),
              /Серверде сақталған баға емес/,
            );
            if (id !== "target")
              assert.equal(
                await p.evaluate(() => GameFinal.snapshot().game.won),
                true,
              );
            await p.locator("#finalReplay").click();
            const g = await p.evaluate(() => GameFinal.snapshot().game);
            assert.equal(g.score, 0);
            assert.equal(g.history.length, 0);
            assert.equal(g.completed.length, 0);
            assert.equal(g.health, 100);
            assert.deepEqual(g.passed, [false, false, false, false]);
          });
      }
    },
  );
test("quest: locked routes, wrong solution, independent match columns and first-error correction do not unlock stations early", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "quest");
  assert.equal(await p.locator("[data-final-station]:enabled").count(), 1);
  await p.locator('[data-final-station="0"]').click();
  await H.firstStep(p, "quest", false);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.station), 0);
  await H.firstStep(p, "quest");
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.station), 1);
  await p.locator('[data-final-station="1"]').click();
  const orders = await p.evaluate(() => GameFinal.snapshot().orders);
  assert.equal(orders[1].left.length, 2);
  await H.firstStep(p, "quest", false);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.station), 1);
  await H.firstStep(p, "quest");
  assert.equal(await p.locator("[data-final-left]:disabled").count(), 1);
  await H.firstStep(p, "quest");
  await p.locator('[data-final-station="2"]').click();
  await p.locator('[data-final-error="0"]').click();
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.station), 2);
  await p.locator("#finalContinue").click();
  await p.locator('[data-final-error="1"]').click();
  assert.equal(await p.locator("[data-final-error]").count(), 0);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.completed.length),
    3,
  );
  await H.play(p, "quest");
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.completed.length),
    8,
  );
});
test("quest: selected pair and station locks persist through pause/reload without a free completion", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "quest");
  await H.firstStep(p, "quest");
  await p.locator('[data-final-station="1"]').click();
  await p.locator('[data-final-left="1"]').click();
  await p.locator("#pauseGameButton").click();
  const before = await p.evaluate(() => GameFinal.snapshot());
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  const after = await p.evaluate(() => GameFinal.snapshot());
  assert.deepEqual(after.game, before.game);
  assert.deepEqual(after.orders, before.orders);
  assert.equal(await p.locator(".match-selected").count(), 1);
  await p.locator("#resumePausedButton").click();
  await H.play(p, "quest");
});
test("puzzle: every grid maps one task to one unrepeated tile, wrong answers keep tiles shut and image requests are unnecessary", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  await p.route(/\.(png|jpg|jpeg|webp|svg)(\?|$)/, (r) => r.abort());
  for (const grid of [2, 3, 4]) {
    await open(p, "puzzle", "6", grid);
    assert.equal(await p.locator("[data-final-piece]").count(), grid * grid);
    assert.equal(await p.locator(".final-landscape").count(), 1);
    assert.ok((await p.locator(".final-landscape path").count()) > 6);
    await p.locator(`[data-final-piece="${grid * grid - 1}"]`).click();
    await H.firstStep(p, "puzzle", false);
    assert.equal(await p.locator(".piece-open").count(), 0);
    await H.firstStep(p, "puzzle");
    assert.equal(await p.locator(".piece-open").count(), 1);
    assert.equal(
      await p.locator(`[data-final-piece="${grid * grid - 1}"]`).isDisabled(),
      true,
    );
    await H.play(p, "puzzle");
    assert.equal(await p.locator(".piece-open").count(), grid * grid);
    assert.equal(await p.locator(".picture-complete").count(), 1);
    await fits(p);
  }
});
test("rocket: altitude never moves on wrong answers, tiers increase and docking has a pauseable terminal deadline", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "rocket");
  const start = await p.locator("#finalRocketShip").getAttribute("style");
  await H.firstStep(p, "rocket", false);
  assert.equal(
    await p.locator("#finalRocketShip").getAttribute("style"),
    start,
  );
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.completed.length),
    0,
  );
  for (let i = 0; i < 5; i++) await H.firstStep(p, "rocket");
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.completed.length),
    5,
  );
  await H.firstStep(p, "rocket", true, false);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.phase),
    "docking",
  );
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  await p.clock.fastForward(600);
  await p.locator("#pauseGameButton").click();
  const g = await p.evaluate(() => GameFinal.snapshot().game);
  await p.clock.fastForward(60000);
  assert.deepEqual(await p.evaluate(() => GameFinal.snapshot().game), g);
  await p.locator("#resumePausedButton").click();
  await p.clock.fastForward(600);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.won), true);
  assert.equal(await p.locator("#sharedSummary").count(), 1);
});
test("castle: no passive damage; repairs and armor spend only earned points once; all three waves can be defended", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "castle");
  await p.clock.fastForward(600000);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.health), 100);
  await H.firstStep(p, "castle");
  await H.firstStep(p, "castle", false);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.phase),
    "maintenance",
  );
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.health), 65);
  await p.locator("#finalRepair").evaluate((b) => {
    window.oldRepair = b.onclick;
    b.click();
    b.click();
  });
  await p.evaluate(() => window.oldRepair());
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.health), 90);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.wallet), 0);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.purchases.length),
    1,
  );
  await H.play(p, "castle");
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.won), true);
  await open(p, "castle");
  await H.firstStep(p, "castle");
  await H.firstStep(p, "castle");
  await p.locator("#finalArmor").click();
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.armor), 1);
  await H.firstStep(p, "castle", false);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.health), 75);
});
test("castle: zero defense ends once, ignores later answers and starts a separate correction practice", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "castle");
  for (let i = 0; i < 3; i++) await H.firstStep(p, "castle", false);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.health), 0);
  assert.equal(await p.locator("#sharedSummary").count(), 1);
  await p.clock.fastForward(60000);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.history.length),
    3,
  );
  await p.locator("#finalRetryMistakes").click();
  const s = await p.evaluate(() => GameFinal.snapshot());
  assert.equal(s.id, "bridge");
  assert.equal(s.review, true);
  assert.equal(s.game.count, 6);
  await H.play(p, "bridge");
});
test("target: real labelled targets stay stationary, hits are mathematical and duplicate handlers cannot add points", async (t) => {
  const p = await fixture(t, 390);
  await freeze(p);
  await open(p, "target");
  assert.equal(await p.locator(".final-target-button").count(), 4);
  await p.clock.runFor(40); // Flush the initial decorative banner before measuring a settled target.
  const b = p.locator(".final-target-button").first();
  await b.scrollIntoViewIfNeeded();
  const before = await b.boundingBox();
  await p.mouse.move(before.x + before.width / 2, before.y + before.height - 2);
  await p.clock.fastForward(10000);
  assert.deepEqual(await b.boundingBox(), before);
  const i = await p.evaluate(() => {
    const s = GameFinal.snapshot(),
      q = s.qs[0];
    return q.options.indexOf(q.answer);
  });
  await p.locator(`[data-final-answer="${i}"]`).evaluate((b) => {
    window.oldHit = b.onclick;
    b.click();
    b.click();
  });
  await p.evaluate(() => window.oldHit());
  assert.equal(await p.locator(".final-target-hit").count(), 1);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.score), 10);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.history.length),
    1,
  );
  await p.locator("#finalContinue").click();
  await H.firstStep(p, "target", false, false);
  assert.equal(await p.locator(".final-target-miss").count(), 1);
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.score), 10);
  await H.play(p, "target");
});
test("bridge: every correct answer adds one segment, wrong answers preserve construction, crossing waits for all pieces and restores midway", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  await open(p, "bridge");
  await H.firstStep(p, "bridge");
  await H.firstStep(p, "bridge", false);
  assert.equal(await p.locator(".plank-built").count(), 1);
  assert.equal(
    await p.locator("#finalBridgeWalker").evaluate((e) => e.style.left),
    "5%",
  );
  for (let i = 1; i < 5; i++) await H.firstStep(p, "bridge");
  assert.equal(await p.locator(".plank-built").count(), 5);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.animation),
    null,
  );
  await H.firstStep(p, "bridge", true, false);
  assert.equal(await p.locator(".plank-built").count(), 6);
  await p.clock.fastForward(600);
  await p.locator("#pauseGameButton").click();
  const before = await p.evaluate(() => GameFinal.snapshot().game),
    position = await p
      .locator("#finalBridgeWalker")
      .evaluate((e) => e.style.left);
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(await p.evaluate(() => GameFinal.snapshot().game), before);
  assert.equal(
    await p.locator("#finalBridgeWalker").evaluate((e) => e.style.left),
    position,
  );
  await p.clock.fastForward(60000);
  assert.equal(await p.locator("#sharedSummary").count(), 0);
  await p.locator("#resumePausedButton").click();
  await p.clock.fastForward(600);
  assert.equal(
    await p.locator("#finalBridgeWalker").evaluate((e) => e.style.left),
    "95%",
  );
  assert.equal(await p.locator("#sharedSummary").count(), 1);
});
test("king: no score bypass, 3/5 fails, practice cannot unlock a level, fresh retest passes only its own answers and all levels precede the crown", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  await open(p, "math-king");
  assert.equal(await p.locator('[data-final-level="3"]').isDisabled(), true);
  await p.evaluate(() => {
    currentScore = 99999;
  });
  await p.locator('[data-final-level="0"]').click();
  for (let i = 0; i < 5; i++) await H.firstStep(p, "math-king", i < 3);
  let s = await p.evaluate(() => GameFinal.snapshot());
  assert.equal(s.game.phase, "gate");
  assert.equal(s.game.lastGate.correct, 3);
  assert.equal(s.game.passed[0], false);
  assert.equal(await p.locator(".crown-awarded").count(), 0);
  const original = s.game.roundIds.map((i) => s.qs[i].question);
  await p.locator("#finalPracticeLevel").click();
  s = await p.evaluate(() => GameFinal.snapshot());
  assert.equal(s.game.kingMode, "practice");
  assert.equal(s.game.roundIds.length, 2);
  assert.equal(await p.locator("#sharedHintButton").isEnabled(), true);
  for (let i = 0; i < 2; i++) await H.firstStep(p, "math-king");
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.phase),
    "retest",
  );
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.passed[0]),
    false,
  );
  await p.locator("#finalRetest").click();
  s = await p.evaluate(() => GameFinal.snapshot());
  assert.equal(
    s.game.roundIds.some((i) => original.includes(s.qs[i].question)),
    false,
  );
  assert.equal(await p.locator("#sharedHintButton").isDisabled(), true);
  for (let i = 0; i < 5; i++) await H.firstStep(p, "math-king", i < 4);
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.passed[0]),
    true,
  );
  assert.equal(await p.locator(".crown-awarded").count(), 0);
  await H.play(p, "math-king");
  s = await p.evaluate(() => GameFinal.snapshot());
  assert.ok(s.game.passed.every(Boolean));
  assert.equal(await p.locator(".crown-awarded").count(), 1);
  assert.ok(s.game.gates.every((g) => (g.passed ? g.correct >= 4 : true)));
});
test("king: failed gate, generated practice and partial retest survive reload without unlocking any extra level", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "math-king");
  for (let i = 0; i < 5; i++) await H.firstStep(p, "math-king", i < 3);
  await p.locator("#finalPracticeLevel").click();
  await H.firstStep(p, "math-king");
  await p.locator("#finalAnswer").fill("1/");
  await p.locator("#pauseGameButton").click();
  const before = await p.evaluate(() => GameFinal.snapshot());
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  const after = await p.evaluate(() => GameFinal.snapshot());
  assert.deepEqual(after.game, before.game);
  assert.deepEqual(after.qs, before.qs);
  assert.equal(after.value, "1/");
  assert.equal(await p.locator("#sharedHintButton").isEnabled(), true);
  await p.locator("#resumePausedButton").click();
  await H.play(p, "math-king");
  assert.equal(await p.locator(".crown-awarded").count(), 1);
});
test("all seven: submitted progress, assistance and wrong-first records restore; paused or stale handlers and old replay cannot change a new game", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ids) {
    await open(p, id);
    await H.firstStep(p, id, false);
    await p.locator("#pauseGameButton").click();
    const before = await p.evaluate(() => GameFinal.snapshot());
    await p.reload();
    await p.locator("#resumeGameBanner button").click();
    const after = await p.evaluate(() => GameFinal.snapshot());
    assert.deepEqual(after.game, before.game);
    assert.equal(await p.locator("#sharedPauseOverlay").isVisible(), true);
    await p.clock.fastForward(60000);
    assert.deepEqual(
      await p.evaluate(() => GameFinal.snapshot().game),
      before.game,
    );
    await p.locator("#resumePausedButton").click();
    const selector =
      id === "quest" || !["puzzle", "castle", "target"].includes(id)
        ? "#finalSubmit"
        : '[data-final-answer="0"]';
    await p.locator(selector).evaluate((b) => (window.oldFinal = b.onclick));
    await p.locator("#pauseGameButton").click();
    const frozen = await p.evaluate(() => GameFinal.snapshot().game);
    await p.evaluate(() => window.oldFinal());
    assert.deepEqual(await p.evaluate(() => GameFinal.snapshot().game), frozen);
    await p.locator("#resumePausedButton").click();
    await p.locator("#backToGamesButton").click();
    const elapsed = await p.evaluate(() => GameSession.clock().time());
    await p.clock.fastForward(60000);
    assert.equal(await p.evaluate(() => GameSession.clock().time()), elapsed);
    await open(p, id);
    const fresh = await p.evaluate(() => GameFinal.snapshot());
    await p.evaluate(() => window.oldFinal());
    assert.deepEqual(await p.evaluate(() => GameFinal.snapshot()), fresh);
    await H.play(p, id);
    await p.locator("#finalReplay").evaluate((b) => {
      window.oldFinalReplay = b.onclick;
      b.click();
    });
    await H.firstStep(p, id);
    const progressed = await p.evaluate(() => GameFinal.snapshot().game);
    await p.evaluate(() => window.oldFinalReplay());
    assert.deepEqual(
      await p.evaluate(() => GameFinal.snapshot().game),
      progressed,
    );
  }
});
for (const id of ids)
  test(
    id +
      ": every available topic completes without modifying the 5–7 question bank",
    async (t) => {
      const p = await fixture(t, 768);
      await freeze(p);
      const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
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
        await H.play(p, id);
      }
      assert.equal(
        await p.evaluate(() => JSON.stringify(gameQuestionBank)),
        bank,
      );
    },
  );
test("all seven: old legacy snapshots show a localized restart explanation", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ids) {
    await open(p, id);
    await p.evaluate(() => {
      GameSession.save();
      const key = "math-ai-game-progress-v1",
        saved = JSON.parse(localStorage.getItem(key));
      GameSession.stop(false);
      saved.active = "extra";
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

test("target: elapsed-time digit transitions preserve both page and viewport coordinates at three widths", async (t) => {
  for (const width of [390, 768, 1440])
    await t.test(String(width), async (t) => {
      const p = await fixture(t, width);
      await freeze(p);
      await open(p, "target");
      await p.clock.runFor(40);
      const target = p.locator(".final-target-button").first();
      await target.scrollIntoViewIfNeeded();
      const sample = () =>
        target.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            pageY: r.y + scrollY,
            toolbarHeight: document
              .querySelector("#sharedToolbar")
              .getBoundingClientRect().height,
          };
        });
      const before = await sample();
      for (const advance of [10000, 90000]) {
        await p.clock.fastForward(advance);
        assert.deepEqual(await sample(), before);
      }
      assert.equal(
        await p.evaluate(() => GameFinal.snapshot().game.history.length),
        0,
      );
      await fits(p);
    });
});
