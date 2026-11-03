const mechanics = require("./helpers/mechanics.cjs");
const logic = require("./helpers/logic.cjs");
const racing = require("./helpers/racing.cjs");
const timed = require("./helpers/timed.cjs");
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
async function fixture(t, width = 390) {
  const server = http.createServer((req, res) => {
    const f = path.resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!f.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(f, (e, d) => {
      res.writeHead(e ? 404 : 200, {
        "Content-Type": f.endsWith(".js")
          ? "application/javascript"
          : f.endsWith(".css")
            ? "text/css"
            : "text/html",
      });
      res.end(e ? "" : d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(async () => {
    await browser.close();
    await new Promise((r) => server.close(r));
  });
  const p = await browser.newPage({
      viewport: { width, height: 900 },
      isMobile: width < 600,
      hasTouch: width < 600,
      reducedMotion: "reduce",
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/auth.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: "window.requireRole=()=>{};",
    }),
  );
  await p.clock.install();
  await p.goto(`http://127.0.0.1:${server.address().port}/games.html`);
  t.after(() => assert.deepEqual(errors, []));
  return p;
}
async function start(p, id) {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator(`[data-game-id="${id}"]`).click();
  await p.locator("#startGameButton").click();
}
async function firstAnswer(p, id, correct = true) {
  if (timed.supports(id)) return timed.firstStep(p, id, correct);
  if (racing.supports(id)) return racing.firstStep(p, id, correct);
  if (logic.supports(id)) return logic.firstStep(p, id, correct);
  if (mechanics.supported(id)) return mechanics.firstStep(p, id);
  if (id === "match") {
    await p.locator('[data-match-left="0"]').click();
    const pos = await p.evaluate(() => matchState.order.indexOf(0));
    await p.locator(`[data-match-right="${pos}"]`).click();
    return;
  }
  if (id === "wheel") {
    await p.locator("#spinTeamWheel").click();
    await p.locator("[data-wheel-team]").first().waitFor();
  }
  if (id === "cards") await p.locator("#scene-flip").click();
  const value = await p.evaluate(
    ({ id, correct }) => {
      const q = GameSession.current().questions[0];
      if (id === "wheel") {
        const prompt = document.querySelector(
          "#wheelTask .race-question",
        ).textContent;
        return GameSession.current().questions.find(
          (q) => q.question === prompt,
        ).answer;
      }
      return correct ? String(q.answer ?? q.correction) : "999999";
    },
    { id, correct },
  );
  if (["find-error", "math-code", "detective", "quick-answer"].includes(id)) {
    await p
      .locator(id === "quick-answer" ? "#quickAnswerInput" : "#gameTextAnswer")
      .fill(value);
    await p.evaluate((id) => {
      (id === "quick-answer" ? submitQuickAnswer : submitTextAnswer)();
      GameSession.pause();
    }, id);
  } else {
    const attr =
      {
        "math-race": "data-race-team",
        "tug-of-war": "data-tug-team",
        wheel: "data-wheel-team",
      }[id] || "data-scene-answer";
    await p.locator(`[${attr}=${JSON.stringify(value)}]`).click();
  }
}

test("all 20 games save and resume their mechanics after a submitted answer", async (t) => {
  const p = await fixture(t);
  const ids = await p.evaluate(() => mathGames.map((g) => g.id));
  for (const id of ids)
    await t.test(id, async () => {
      await start(p, id);
      await firstAnswer(p, id);
      await p.evaluate(() => {
        GameSession.pause();
        GameSession.save();
      });
      const before = await p.evaluate(() => ({
        rows: Object.keys(GameSession.current().records).length,
        summary: GameSession.current().summary(),
        id: GameSession.current().id,
      }));
      assert.equal(
        before.rows,
        id === "cards" ? 0 : 1,
        id + " assessed or verified separately",
      );
      await p.reload();
      await p.locator("#resumeGameBanner button").click();
      assert.equal(
        await p.locator("#sharedPauseOverlay").isVisible(),
        true,
        "restoration starts paused",
      );
      const after = await p.evaluate(() => ({
        rows: Object.keys(GameSession.current().records).length,
        summary: GameSession.current().summary(),
        id: GameSession.current().id,
      }));
      assert.deepEqual(after, before, id + " learning result preserved");
      await p.locator("#resumePausedButton").click();
      assert.equal(await p.evaluate(() => GameSession.canAnswer()), true);
      assert.ok(
        (await p.locator("#gameProgress").textContent()).includes(
          id === "quick-answer"
            ? `2 / ${await p.evaluate(() => GameTimed.snapshot().game.count)}`
            : id === "auction"
              ? "2 / 8"
              : ["match", "cards"].includes(id)
                ? "1 / 4"
                : ["tug-of-war", "math-race"].includes(id)
                  ? "2 / 8"
                  : "2 / 4",
        ),
      );
      await p.locator("#backToGamesButton").click();
    });
});

test("setup, help, results, error retry and responsive screens", async (t) => {
  const p = await fixture(t, 768);
  await t.test(
    "only relevant settings, localized rules and all three viewport widths",
    async () => {
      const ids = await p.evaluate(() => mathGames.map((g) => g.id));
      for (const width of [320, 768, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        for (const id of ids) {
          if (await p.locator("#gameStage").isVisible())
            await p.locator("#backToGamesButton").click();
          await p.locator(`[data-game-id="${id}"]`).click();
          assert.match(
            await p.locator("#sharedSetupInfo").innerText(),
            /Қалай ойнаймыз/,
          );
          assert.match(
            await p.locator("#sharedQuestionCount").innerText(),
            /\d+/,
          );
          assert.equal(
            await p.locator("#sharedTimeField").isVisible(),
            ["blitz", "quick-answer"].includes(id),
          );
          assert.equal(
            await p.locator("#sharedModeField").isVisible(),
            ![
              "math-race",
              "tug-of-war",
              "cards",
              "car-race",
              "auction",
            ].includes(id),
          );
          await p.locator("#startGameButton").click();
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            id + " " + width,
          );
        }
      }
      await p.setViewportSize({ width: 1440, height: 1000 });
      await start(p, "rocket");
      const target = p.locator("[data-scene-answer]").first();
      await target.scrollIntoViewIfNeeded();
      const before = await target.boundingBox();
      await p.mouse.move(
        before.x + before.width / 2,
        before.y + before.height - 1,
      );
      await p.waitForTimeout(100);
      const after = await target.boundingBox();
      assert.equal(
        after.y,
        before.y,
        "answer target stays stable at the pointer edge",
      );
      await p.locator("#backToGamesButton").click();
    },
  );
  await t.test(
    "cards use a dedicated reveal control and never grade self-assessment",
    async () => {
      await start(p, "cards");
      await p.locator('[data-card="0"]').click();
      assert.equal(await p.locator("#sharedSolutionButton").isVisible(), false);
      await p.locator("#sharedHintButton").click();
      await p.locator("#revealCard").click();
      await p.locator('[data-rating="independent"]').click();
      assert.equal(
        await p.evaluate(
          () => Object.keys(GameSession.current().records).length,
        ),
        0,
      );
      assert.equal(
        await p.evaluate(
          () =>
            GameSession.current().selfAssessments[
              GameSession.current().questions[0]._sessionKey
            ],
        ),
        "assisted",
      );
    },
  );
  await t.test(
    "assistance is separated; wrong answers retry without mutating bank",
    async () => {
      const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
      await start(p, "math-code");
      await p.locator("#sharedHintButton").click();
      assert.match(
        await p.locator("#sharedHelpText").textContent(),
        /ортақ бөлім/,
      );
      for (let i = 0; i < 4; i++) {
        const answer = await p.evaluate(
          (i) => String(GameSession.current().questions[i].answer),
          i,
        );
        if (i === 1) {
          await p.locator("#codeAnswer").fill("9999");
          await p.locator("#codeSubmit").click();
          await p.locator("#retryCodeTask").click();
        }
        await p.locator("#codeAnswer").fill(answer);
        await p.locator("#codeSubmit").click();
      }
      await p
        .locator("#lockCode")
        .fill(await p.evaluate(() => GameLogic.snapshot().parts.join("")));
      await p.locator("#unlockCode").click();
      assert.equal(await p.locator("#sharedSummary").count(), 1);
      const summary = await p.evaluate(() => GameSession.current().summary());
      assert.equal(summary.correct, 4);
      assert.equal(summary.wrong, 0);
      assert.equal(summary.assisted, 2);
      assert.equal(summary.independent, 2);
      assert.equal(summary.accuracy, 50);
      await p.locator("#sharedSummary details").first().click();
      assert.match(
        await p.locator("#sharedSummary details").first().innerText(),
        /2\/\d+/,
      );
      await p.locator("#retryMistakesButton").click();
      assert.equal(await p.evaluate(() => currentQuestions.length), 1);
      assert.match(
        await p.locator(".logic-code-question .logic-prompt").textContent(),
        /3\/4 - 1\/2/,
      );
      assert.equal(
        await p.evaluate(() => JSON.stringify(gameQuestionBank)),
        bank,
      );
    },
  );
  await t.test(
    "challenge mode does not reveal help before submission",
    async () => {
      await p.locator("#backToGamesButton").click();
      await p.locator('[data-game-id="math-code"]').click();
      await p.selectOption("#sharedMode", "challenge");
      await p.locator("#startGameButton").click();
      assert.equal(await p.locator("#sharedSolutionButton").isDisabled(), true);
      assert.equal(await p.locator("#sharedHelpText").isVisible(), false);
      await p.locator("#codeAnswer").fill("999");
      await p.locator("#codeSubmit").click();
      await p.locator("#sharedSolutionButton").click();
      assert.match(
        await p.locator("#sharedHelpText").textContent(),
        /1\/2 \+ 1\/\d+/,
      );
    },
  );
  await t.test(
    "broken or unavailable local storage never blocks play",
    async () => {
      await p.locator("#backToGamesButton").click();
      await p.evaluate(() =>
        localStorage.setItem("math-ai-game-progress-v1", "bad json"),
      );
      await p.reload();
      assert.match(
        await p.locator("#resumeGameBanner").innerText(),
        /оқылмады/,
      );
      await start(p, "rocket");
      await p.evaluate(() => {
        Storage.prototype.setItem = function () {
          throw Error("quota");
        };
        GameSession.save();
      });
      assert.match(
        await p.locator("#localSaveStatus").textContent(),
        /сақтау мүмкін болмады/,
      );
      assert.equal(await p.locator("[data-scene-answer]:enabled").count(), 4);
    },
  );
});

test("shared timers pause, resume, expire once and cancel animations on exit", async (t) => {
  const p = await fixture(t);
  await t.test(
    "quick round honors 60 seconds, pause and repeat expiry",
    async () => {
      await p.locator('[data-game-id="quick-answer"]').click();
      await p.selectOption("#sharedTime", "60");
      await p.locator("#startGameButton").click();
      await p.clock.fastForward(10000);
      await p.locator("#pauseGameButton").click();
      const left = await p.locator("#quickTimer").textContent();
      const elapsed = await p.evaluate(() => GameSession.clock().time());
      await p.clock.fastForward(90000);
      assert.equal(await p.locator("#quickTimer").textContent(), left);
      assert.equal(await p.evaluate(() => GameSession.clock().time()), elapsed);
      assert.equal(await p.locator("#gameQuestion").getAttribute("inert"), "");
      await p.locator("#resumePausedButton").click();
      await p.clock.fastForward(51000);
      assert.equal(await p.locator("#sharedSummary").count(), 1);
      assert.equal(
        await p.evaluate(() => GameSession.current().summary().timeout),
        1,
      );
      await p.clock.fastForward(60000);
      assert.equal(await p.locator("#sharedSummary").count(), 1);
    },
  );
  await t.test(
    "blitz can be untimed or have a 20-second per-question limit",
    async () => {
      await p.locator("#backToGamesButton").click();
      await p.locator('[data-game-id="blitz"]').click();
      await p.selectOption("#sharedMode", "practice");
      await p.selectOption("#sharedTime", "0");
      await p.locator("#startGameButton").click();
      await p.clock.fastForward(60000);
      assert.equal(await p.locator("[data-timed-answer]:enabled").count(), 4);
      assert.match(await p.locator("#scene-seconds").textContent(), /Уақытсыз/);
      await p.locator("#backToGamesButton").click();
      await p.locator('[data-game-id="blitz"]').click();
      await p.selectOption("#sharedMode", "practice");
      await p.selectOption("#sharedTime", "20");
      await p.locator("#startGameButton").click();
      await p.clock.fastForward(21000);
      assert.equal(await p.locator("[data-timed-answer]:enabled").count(), 0);
      assert.equal(
        await p.evaluate(() => GameSession.current().summary().timeout),
        1,
      );
    },
  );
  await t.test(
    "wheel animation cannot complete while paused or leak to another game",
    async () => {
      await start(p, "wheel");
      await p.locator("#spinTeamWheel").click();
      await p.locator("#pauseGameButton").click();
      await p.clock.fastForward(5000);
      assert.equal(await p.locator("[data-timed-answer]").count(), 0);
      await p.locator("#resumePausedButton").click();
      await p.clock.fastForward(1600);
      assert.equal(await p.locator("[data-timed-answer]").count(), 4);
      await p.locator("#backToGamesButton").click();
      await start(p, "detective");
      await p.clock.fastForward(10000);
      assert.equal(await p.locator(".detective-game").count(), 1);
      assert.equal(await p.locator("[data-timed-answer]").count(), 0);
    },
  );
});

test("resume at terminal checkpoints and recover corrupt state safely", async (t) => {
  const p = await fixture(t);
  await t.test(
    "last selected matching pair resumes and finishes exactly once",
    async () => {
      await start(p, "match");
      for (let i = 0; i < 3; i++) await logic.firstStep(p, "match");
      await p.locator('[data-match-left="3"]').click();
      await p.locator("#pauseGameButton").click();
      await p.reload();
      await p.locator("#resumeGameBanner button").click();
      assert.equal(await p.locator("#sharedSummary").count(), 0);
      assert.equal(
        await p.locator('[data-match-left="3"]').getAttribute("aria-pressed"),
        "true",
      );
      await p.locator("#resumePausedButton").click();
      await p.locator('[data-match-right="3"]').evaluate((b) => {
        b.click();
        b.click();
      });
      assert.equal(await p.locator("#sharedSummary").count(), 1);
      assert.equal(
        await p.evaluate(() => GameSession.current().summary().correct),
        4,
      );
      assert.equal(await p.locator("#sharedPauseOverlay").isVisible(), false);
    },
  );
  await t.test(
    "quick progress resumes once with the same deadline; a new round gets fresh time",
    async () => {
      await start(p, "quick-answer");
      for (let i = 0; i < 4; i++) await timed.firstStep(p, "quick-answer");
      await p.locator("#quickAnswerInput").fill("1/");
      await p.locator("#pauseGameButton").click();
      const before = await p.evaluate(() => GameTimed.snapshot());
      await p.reload();
      await p.locator("#resumeGameBanner button").click();
      assert.deepEqual(await p.evaluate(() => GameTimed.snapshot()), before);
      assert.equal(await p.locator("#quickAnswerInput").inputValue(), "1/");
      await p.locator("#resumePausedButton").click();
      await p.clock.fastForward(31000);
      assert.equal(await p.locator("#sharedSummary").count(), 1);
      assert.equal(
        await p.evaluate(() => GameSession.current().summary().correct),
        4,
      );
      await p.locator("#backToGamesButton").click();
      await p.locator('.game-card[data-game-id="quick-answer"]').click();
      await p.selectOption("#sharedTime", "60");
      await p.locator("#startGameButton").click();
      assert.equal(await p.locator("#quickTimer").textContent(), "60");
    },
  );
  await t.test(
    "malformed adapter data is cleared with a recoverable message",
    async () => {
      await p.evaluate(() => {
        GameSession.pause();
        GameSession.save();
      });
      await p.reload();
      await p.evaluate(() => {
        const k = "math-ai-game-progress-v1",
          d = JSON.parse(localStorage.getItem(k));
        d.engine = {};
        localStorage.setItem(k, JSON.stringify(d));
      });
      await p.reload();
      assert.equal(await p.locator("#resumeGameBanner button").count(), 0);
      assert.match(
        await p.locator("#resumeGameBanner").textContent(),
        /механикасы жаңартылды/,
      );
      await start(p, "bridge");
      assert.equal(await p.locator("[data-scene-answer]:enabled").count(), 4);
    },
  );
});
