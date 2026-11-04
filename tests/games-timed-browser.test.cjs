const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, start } = require("./helpers/browser.cjs"),
  H = require("./helpers/timed.cjs");
async function freeze(p) {
  await p.clock.pauseAt(new Date((await p.evaluate(() => Date.now())) + 1000));
}
async function open(p, id, grade = "6", opts = {}) {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator(`[data-game-id="${id}"]`).click();
  await p.selectOption("#gradeSelect", grade);
  if (opts.mode) {
    await p.selectOption("#sharedMode", opts.mode);
  }
  if (opts.seconds !== undefined)
    await p.selectOption("#sharedTime", String(opts.seconds));
  if (opts.teams) await p.selectOption("#timedWheelMode", "teams");
  await p.locator("#startGameButton").click();
}
async function correct(p) {
  return p.evaluate(() => {
    const s = GameTimed.snapshot();
    return s.qs[s.game.recovery ? s.game.count + s.game.index : s.game.index]
      .answer;
  });
}
async function choose(p, good = true) {
  const i = await p.evaluate((good) => {
    const s = GameTimed.snapshot(),
      q = s.qs[s.game.recovery ? s.game.count + s.game.index : s.game.index];
    return good
      ? q.options.indexOf(q.answer)
      : q.options.findIndex((v) => v !== q.answer);
  }, good);
  await p.locator(`[data-timed-answer="${i}"]`).click();
}
for (const id of ["quick-answer", "blitz", "wheel", "auction"])
  test(
    id +
      ": setup to result, replay, local results and layout at all grades and widths",
    async (t) => {
      for (const width of [390, 768, 1440]) {
        const p = await fixture(t, width);
        await freeze(p);
        for (const grade of ["5", "6", "7"])
          await t.test(width + " / " + grade, async () => {
            await open(p, id, grade);
            await H.play(p, id);
            assert.equal(
              await p.locator("#gameProgress").textContent(),
              "Нәтиже",
            );
            assert.equal(await p.locator("#sharedSummary").count(), 1);
            assert.match(
              await p.locator("#sharedSummary").textContent(),
              /серверде сақталған баға емес/,
            );
            assert.equal(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
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
                        r.width &&
                        r.height &&
                        (r.left < -1 || r.right > innerWidth + 1)
                      );
                    })
                    .map((e) => e.id),
                ),
              [],
            );
            await p.locator("#timedReplay").click();
            const s = await p.evaluate(() => GameTimed.snapshot());
            assert.equal(s.game.history.length, 0);
            assert.equal(s.game.score, 0);
            assert.deepEqual(s.game.capital, [100, 100]);
            assert.equal(s.game.index, 0);
          });
      }
    },
  );
test("quick: keyboard, fresh focus, empty input, immutable duplicate handlers, bounded bonus and wrong streak reset", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "quick-answer");
  await p.locator("#quickAnswerButton").click();
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.history.length),
    0,
  );
  for (let i = 0; i < 8; i++) {
    await p.locator("#quickAnswerInput").fill(await correct(p));
    if (i === 0)
      await p.locator("#quickAnswerButton").evaluate((b) => {
        window.oldQuick = b.onclick;
        b.click();
        b.click();
      });
    else await p.locator("#quickAnswerInput").press("Enter");
    await p.evaluate(() => window.oldQuick());
    assert.equal(
      await p.evaluate(() => GameTimed.snapshot().game.history.length),
      i + 1,
    );
    assert.equal(await p.locator("#quickAnswerInput").inputValue(), "");
    assert.equal(
      await p
        .locator("#quickAnswerInput")
        .evaluate((e) => e === document.activeElement),
      true,
    );
  }
  assert.equal(await p.evaluate(() => GameTimed.snapshot().game.score), 130);
  await p.locator("#quickAnswerInput").fill("999999");
  await p.locator("#quickAnswerInput").press("Enter");
  assert.equal(await p.evaluate(() => GameTimed.snapshot().game.streak), 0);
  const s = await p.evaluate(() => GameTimed.snapshot());
  assert.equal(
    new Set(s.qs.map((q) => q.question.replace(/\s/g, ""))).size,
    s.qs.length,
  );
});
test("quick: all time choices, exact deadline beats a simultaneous answer and pauses preserve remaining time", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const seconds of [30, 60, 90]) {
    await open(p, "quick-answer", "6", { seconds });
    assert.equal(await p.locator("#quickTimer").textContent(), String(seconds));
    await p.clock.fastForward(1000);
    await p.locator("#pauseGameButton").click();
    const left = await p.locator("#quickTimer").textContent();
    await p.clock.fastForward(90000);
    assert.equal(await p.locator("#quickTimer").textContent(), left);
    await p.locator("#resumePausedButton").click();
    await p.locator("#quickAnswerInput").fill(await correct(p));
    await p
      .locator("#quickAnswerButton")
      .evaluate((b) => (window.lateQuick = b.onclick));
    await p.clock.fastForward(seconds * 1000 - 1000);
    await p.evaluate(() => window.lateQuick());
    const g = await p.evaluate(() => GameTimed.snapshot().game);
    assert.equal(g.finished, true);
    assert.equal(g.history.length, 1);
    assert.equal(g.history[0].timeout, true);
    assert.equal(g.score, 0);
    await p.clock.fastForward(50000);
    assert.equal(await p.locator("#sharedSummary").count(), 1);
  }
});
test("quick: answer timing and half-typed progress survive reload without turning local results into server grades", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "quick-answer", "6", { seconds: 60 });
  await p.clock.fastForward(2000);
  await H.firstStep(p, "quick-answer");
  await p.locator("#quickAnswerInput").fill("1/");
  await p.locator("#pauseGameButton").click();
  const before = await p.evaluate(() => GameTimed.snapshot());
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), before);
  assert.equal(await p.locator("#quickAnswerInput").inputValue(), "1/");
  await p.clock.fastForward(10000);
  assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), before);
  await p.locator("#resumePausedButton").click();
  await p.clock.fastForward(1000);
  await H.firstStep(p, "quick-answer");
  await p.clock.fastForward(60000);
  const g = await p.evaluate(() => GameTimed.snapshot().game);
  assert.deepEqual(
    g.history.filter((r) => !r.timeout).map((r) => r.ms),
    [2000, 1000],
  );
  assert.match(await p.locator("#sharedSummary").textContent(), /1,50 секунд/);
});
test("blitz: timeout is recorded once, feedback stops time, each next question gets a full twelve seconds", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "blitz");
  await p
    .locator('[data-timed-answer="0"]')
    .evaluate((b) => (window.expiredBlitz = b.onclick));
  await p.clock.fastForward(12000);
  await p.evaluate(() => window.expiredBlitz());
  await p.clock.fastForward(60000);
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.history.length),
    1,
  );
  assert.match(
    await p.locator(".timed-feedback").textContent(),
    /Уақыт аяқталды/,
  );
  assert.equal(await p.locator("[data-timed-answer]").count(), 0);
  await p.locator("#timedContinue").click();
  assert.equal(await p.locator("#scene-seconds").textContent(), "12");
  await p.clock.fastForward(11999);
  await choose(p);
  const g = await p.evaluate(() => GameTimed.snapshot().game);
  assert.equal(g.history[1].correct, true);
  assert.equal(g.deadline, null);
  await p.clock.fastForward(60000);
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.history.length),
    2,
  );
  await p.locator("#timedContinue").click();
  assert.equal(await p.locator("#scene-seconds").textContent(), "12");
});
test("blitz: practice can change or disable time and is explicitly separated from fixed-time challenge", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const seconds of [0, 20]) {
    await open(p, "blitz", "6", { mode: "practice", seconds });
    await p.clock.fastForward(seconds ? 19000 : 90000);
    assert.equal(
      await p.evaluate(() => GameTimed.snapshot().game.history.length),
      0,
    );
    await H.play(p, "blitz");
    assert.match(await p.locator("#sharedSummary").textContent(), /Жаттығу/);
  }
  await open(p, "blitz");
  assert.equal(await p.locator("#scene-seconds").textContent(), "12");
});
test("blitz: saved per-question remainder is restored paused and feedback cannot restart its old timer", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "blitz");
  await p.clock.fastForward(5000);
  await p.locator("#pauseGameButton").click();
  const before = await p.evaluate(() => GameTimed.snapshot());
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), before);
  await p.locator("#resumePausedButton").click();
  assert.equal(await p.locator("#scene-seconds").textContent(), "7");
  await p.clock.fastForward(7000);
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.history.length),
    1,
  );
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  await p.locator("#resumePausedButton").click();
  await p.clock.fastForward(50000);
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.history.length),
    1,
  );
});
test("wheel: labelled sector, physical pointer, question and awarded points agree for every outcome", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  await open(p, "wheel");
  for (let i = 0; i < 4; i++) {
    await p.evaluate((i) => (Math.random = () => (i + 0.5) / 4), i);
    await p.locator("#spinTeamWheel").evaluate((b) => {
      window.oldSpin = b.onclick;
      b.click();
      b.click();
    });
    await p.evaluate(() => window.oldSpin());
    assert.equal(await p.locator("[data-timed-answer]").count(), 0);
    const chosen = await p.evaluate(() => GameTimed.snapshot().game.sector);
    assert.equal(chosen, i);
    await p.clock.fastForward(1600);
    const expected = [10, 20, 30, 40][i];
    assert.match(
      await p.locator("#timedSector").textContent(),
      new RegExp(String(expected)),
    );
    const geometry = await p.locator("#timedWheelRotor").evaluate((g) => {
      const text = [...g.querySelectorAll("text")].find(
        (t) =>
          Number(t.textContent) ===
          MathTimedModels.sectors[GameTimed.snapshot().game.sector],
      );
      const c = text.getBBox(),
        pt = new DOMPoint(
          c.x + c.width / 2,
          c.y + c.height / 2,
        ).matrixTransform(text.getCTM()),
        center = new DOMPoint(150, 150).matrixTransform(
          g.ownerSVGElement.getCTM(),
        );
      return { dx: pt.x - center.x, dy: pt.y - center.y };
    });
    assert.ok(Math.abs(geometry.dx) < 10, JSON.stringify(geometry));
    assert.ok(geometry.dy < -40);
    await choose(p, i !== 1);
    const g = await p.evaluate(() => GameTimed.snapshot().game);
    assert.equal(g.history[i].sector, i);
    assert.equal(g.history[i].points, i === 1 ? 0 : expected);
    await p.locator("#timedContinue").click();
  }
  assert.equal(await p.evaluate(() => GameTimed.snapshot().game.score), 80);
});
test("wheel: paused and saved intermediate angle resumes the same chosen sector; team turns and exit are safe", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "wheel", "6", { teams: true });
  await p.locator("#spinTeamWheel").click();
  await p.clock.fastForward(600);
  await p.locator("#pauseGameButton").click();
  const before = await p.evaluate(() => GameTimed.snapshot());
  const angle = await p.locator("#timedWheelRotor").getAttribute("style");
  await p.clock.fastForward(5000);
  assert.equal(
    await p.locator("#timedWheelRotor").getAttribute("style"),
    angle,
  );
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), before);
  await p.locator("#resumePausedButton").click();
  await p.clock.fastForward(1000);
  assert.equal(await p.evaluate(() => GameTimed.snapshot().game.phase), "task");
  await choose(p);
  await p.locator("#timedContinue").click();
  assert.match(
    await p.locator(".timed-game header").textContent(),
    /Кезек: Қызыл команда/,
  );
  await H.play(p, "wheel");
  const g = await p.evaluate(() => GameTimed.snapshot().game);
  assert.equal(g.history.length, 8);
  assert.equal(
    g.scores[0],
    g.history.filter((r) => r.team === 0).reduce((n, r) => n + r.points, 0),
  );
  await open(p, "wheel");
  await p.locator("#spinTeamWheel").click();
  await p.locator("#backToGamesButton").click();
  await start(p, "detective");
  await p.clock.fastForward(5000);
  assert.equal(await p.locator(".detective-game").count(), 1);
  assert.equal(await p.locator(".timed-game").count(), 0);
});
test("auction: bid stage is mandatory, invalid stakes rejected, committed stake cannot change, journal and teams stay separate", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "auction");
  assert.equal(await p.locator("[data-timed-answer]:enabled").count(), 0);
  for (const v of ["", "-1", "0", "1.2", "abc", "1e1", "101", "51"]) {
    await p.locator("#timedBid").fill(v);
    await p.locator("#timedConfirmBid").click();
    assert.equal(
      await p.evaluate(() => GameTimed.snapshot().game.phase),
      "bid",
    );
  }
  await p.locator("#timedBid").fill("30");
  await p.locator("#timedConfirmBid").evaluate((b) => {
    window.oldBid = b.onclick;
    b.click();
    b.click();
  });
  await p.evaluate(() => window.oldBid());
  assert.equal(await p.locator("#timedBid").count(), 0);
  assert.equal(await p.evaluate(() => GameTimed.snapshot().game.bid), 30);
  const i = await p.evaluate(() => {
    const s = GameTimed.snapshot();
    return s.qs[0].options.indexOf(s.qs[0].answer);
  });
  await p.locator(`[data-timed-answer="${i}"]`).evaluate((b) => {
    window.oldAuction = b.onclick;
    b.click();
    b.click();
  });
  await p.evaluate(() => window.oldAuction());
  assert.deepEqual(
    await p.evaluate(() => GameTimed.snapshot().game.capital),
    [130, 100],
  );
  await p.locator("#timedContinue").click();
  await p.locator("#timedBid").fill("50");
  await p.locator("#timedConfirmBid").click();
  await choose(p, false);
  assert.deepEqual(
    await p.evaluate(() => GameTimed.snapshot().game.capital),
    [130, 50],
  );
  assert.match(
    await p.locator(".timed-journal").textContent(),
    /100 → ставка 30; дұрыс \(\+30\) → 130/,
  );
  await p.locator("#timedContinue").click();
  await H.play(p, "auction");
});
test("auction: zero capital offers a separate stake-free recovery, including on the final turn", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "auction");
  for (let i = 0; i < 8; i++) {
    const s = await p.evaluate(() => GameTimed.snapshot());
    if (s.game.phase === "bid") {
      await p
        .locator("#timedBid")
        .fill(String(Math.min(50, s.game.capital[s.game.index % 2])));
      await p.locator("#timedConfirmBid").click();
      await choose(p, false);
      await p.locator("#timedContinue").click();
    }
    if (await p.locator(".timed-recovery").count()) {
      assert.equal(await p.locator("#timedBid").count(), 0);
      const q = await p.locator(".timed-prompt").textContent();
      const s2 = await p.evaluate(() => GameTimed.snapshot());
      assert.notEqual(q, s2.qs[s2.game.index].question);
      await choose(p, i % 2 === 1);
      await p.locator("#timedContinue").click();
    }
  }
  const s = await p.evaluate(() => GameTimed.snapshot());
  assert.equal(s.game.finished, true);
  assert.ok(s.game.history.some((r) => r.recovery));
  assert.ok(
    s.game.history
      .filter((r) => r.recovery)
      .every((r) => r.bid === 0 && r.points >= 0),
  );
  assert.ok(s.game.capital.every((n) => n >= 0));
  assert.equal(await p.locator("#sharedSummary").count(), 1);
});
test("auction: half-entered and committed bids restore without charging or permitting a second commitment", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "auction");
  await p.locator("#timedBid").fill("25");
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(await p.locator("#timedBid").inputValue(), "25");
  await p.locator("#resumePausedButton").click();
  await p.locator("#timedConfirmBid").click();
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(await p.locator("#timedBid").count(), 0);
  assert.deepEqual(
    await p.evaluate(() => GameTimed.snapshot().game.capital),
    [100, 100],
  );
  await p.locator("#resumePausedButton").click();
  await choose(p);
  assert.deepEqual(
    await p.evaluate(() => GameTimed.snapshot().game.capital),
    [125, 100],
  );
});
test("all timed mechanics: paused handlers and old handlers cannot change a fresh game; exit stops time", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ["quick-answer", "blitz", "wheel", "auction"]) {
    await open(p, id);
    const selector =
      id === "quick-answer"
        ? "#quickAnswerButton"
        : id === "wheel"
          ? "#spinTeamWheel"
          : id === "auction"
            ? "#timedConfirmBid"
            : '[data-timed-answer="0"]';
    await p.locator(selector).evaluate((b) => (window.staleTimed = b.onclick));
    await p.locator("#pauseGameButton").click();
    const before = await p.evaluate(() => GameTimed.snapshot());
    await p.evaluate(() => window.staleTimed());
    await p.clock.fastForward(200000);
    assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), before);
    await p.locator("#resumePausedButton").click();
    await p.locator("#backToGamesButton").click();
    const elapsed = await p.evaluate(() => GameSession.clock().time());
    await p.clock.fastForward(50000);
    assert.equal(await p.evaluate(() => GameSession.clock().time()), elapsed);
    await open(p, id);
    const fresh = await p.evaluate(() => GameTimed.snapshot());
    await p.evaluate(() => window.staleTimed());
    assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), fresh);
  }
});
test("all timed mechanics: mistakes become a separate untimed practice with assistance tracked", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  await open(p, "blitz");
  await choose(p, false);
  await p.locator("#timedContinue").click();
  await H.play(p, "blitz");
  await p.locator("#timedRetryMistakes").click();
  const s = await p.evaluate(() => GameTimed.snapshot());
  assert.equal(s.review, true);
  assert.equal(s.game.count, 1);
  assert.equal(s.game.seconds, 0);
  await p.locator("#sharedHintButton").click();
  await H.play(p, "blitz");
  assert.equal(
    await p.evaluate(() => GameSession.current().summary().assisted),
    1,
  );
  assert.match(
    await p.locator("#sharedSummary").textContent(),
    /Жаттығу · уақытсыз/,
  );
});
test("all timed mechanics: all twelve topics finish without mutating the existing bank", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
  for (const id of ["quick-answer", "blitz", "wheel", "auction"])
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
  assert.equal(await p.evaluate(() => JSON.stringify(gameQuestionBank)), bank);
});
test("all timed mechanics: incompatible legacy sessions show a localized restart explanation", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ["quick-answer", "blitz", "wheel", "auction"]) {
    await open(p, id);
    await p.evaluate(() => {
      GameSession.save();
      const key = "math-ai-game-progress-v1",
        s = JSON.parse(localStorage.getItem(key));
      GameSession.stop(false);
      s.active = "core";
      localStorage.setItem(key, JSON.stringify(s));
    });
    await p.reload();
    assert.equal(await p.locator("#resumeGameBanner button").count(), 0);
    assert.match(
      await p.locator("#resumeGameBanner").textContent(),
      /механикасы жаңартылды/,
    );
  }
});

test("wheel: visible motion follows the active clock and reduced-motion preference avoids continuous rotation", async (t) => {
  const p = await fixture(t, 768);
  await freeze(p);
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await open(p, "wheel");
  await p.locator("#spinTeamWheel").click();
  await p.clock.fastForward(600);
  let g = await p.evaluate(() => GameTimed.snapshot().game);
  assert.ok(g.rotation > g.spinFrom && g.rotation < g.spinTarget);
  // CSSOM serializes angles with fewer decimals; 0.01° is under 0.03px at this radius.
  const angle = await p
    .locator("#timedWheelRotor")
    .evaluate((el) =>
      Number(el.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1]),
    );
  assert.ok(Math.abs(angle - g.rotation) < 0.01);
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.clock.fastForward(50);
  g = await p.evaluate(() => GameTimed.snapshot().game);
  assert.equal(
    await p.locator("#timedWheelRotor").evaluate((el) => el.style.transform),
    `rotate(${g.spinTarget}deg)`,
  );
  await p.clock.fastForward(1000);
  assert.equal(await p.evaluate(() => GameTimed.snapshot().game.phase), "task");
});

test("terminal controls: an old replay cannot reset a new round and a repeated retry creates only one practice", async (t) => {
  const p = await fixture(t);
  await freeze(p);
  for (const id of ["quick-answer", "blitz", "wheel", "auction"]) {
    await open(p, id);
    await H.play(p, id);
    await p.locator("#timedReplay").evaluate((b) => {
      window.oldTimedReplay = b.onclick;
      b.click();
    });
    if (id === "quick-answer") await p.locator("#quickAnswerInput").fill("1/");
    if (id === "auction") await p.locator("#timedBid").fill("25");
    if (["blitz", "wheel"].includes(id)) await H.firstStep(p, id);
    const fresh = await p.evaluate(() => GameTimed.snapshot());
    await p.evaluate(() => window.oldTimedReplay());
    assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), fresh);
  }
  await open(p, "blitz");
  await choose(p, false);
  await p.locator("#timedContinue").click();
  await H.play(p, "blitz");
  await p.locator("#timedRetryMistakes").evaluate((b) => {
    window.oldTimedRetry = b.onclick;
    b.click();
  });
  const practice = await p.evaluate(() => GameTimed.snapshot());
  assert.equal(practice.review, true);
  assert.equal(practice.game.count, 1);
  assert.equal(practice.qs[0].question.length > 0, true);
  await choose(p);
  const answered = await p.evaluate(() => GameTimed.snapshot());
  await p.evaluate(() => window.oldTimedRetry());
  assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), answered);
  await p.locator("#timedContinue").click();
  assert.equal(await p.locator("#sharedSummary").count(), 1);
});
