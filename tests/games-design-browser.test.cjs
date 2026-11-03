const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { fixture } = require("./helpers/browser.cjs");
const helpers = [
  require("./helpers/final.cjs"),
  require("./helpers/timed.cjs"),
  require("./helpers/racing.cjs"),
  require("./helpers/logic.cjs"),
  require("./helpers/mechanics.cjs"),
];
const captureOnly = process.env.DESIGN_CAPTURE_ONLY === "1";
const shots = process.env.DESIGN_SCREENSHOT_DIR;
async function ready(t, width = 390) {
  const p = await fixture(t, width);
  await p.clock.pauseAt(new Date((await p.evaluate(() => Date.now())) + 1000));
  await p.evaluate(() => {
    let n = 731;
    Math.random = () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
  });
  return p;
}
async function open(p, id, setup = false) {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator(`[data-game-id="${id}"]`).click();
  await p.selectOption("#gradeSelect", "6");
  if (!setup) {
    await p.locator("#startGameButton").click();
    await p.clock.runFor(40);
  }
}
async function shot(p, name) {
  if (!shots) return;
  fs.mkdirSync(shots, { recursive: true });
  await p.evaluate(() => scrollTo(0, 0));
  await p.screenshot({ path: path.join(shots, name + ".png"), fullPage: true });
}
async function fits(p, label) {
  const result = await p.evaluate(() => {
    const bad = [],
      small = [],
      splitWords = [];
    document
      .querySelectorAll(
        "#gameStage button,#gameStage input,#gameStage select,#gameStage textarea",
      )
      .forEach((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || e.closest("[hidden]")) return;
        if (r.left < -1 || r.right > innerWidth + 1)
          bad.push(e.outerHTML.slice(0, 150));
        if (e.matches("button") && (r.width < 43.9 || r.height < 43.9))
          small.push(e.outerHTML.slice(0, 150));
      });
    document.querySelectorAll(".river-bank").forEach((bank) => {
      if (!bank.getBoundingClientRect().width) return;
      for (const node of bank.childNodes)
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          if (
            range.getClientRects().length > 1 ||
            bank.scrollWidth > bank.clientWidth + 1
          )
            splitWords.push(node.textContent);
        }
    });
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      bad,
      small,
      splitWords,
    };
  });
  assert.deepEqual(
    result,
    { overflow: false, bad: [], small: [], splitWords: [] },
    label,
  );
}
for (const width of [320, 390, 768, 1440]) {
  test(`design: all twenty games at ${width}px, touch targets, full results and screenshots`, async (t) => {
    const p = await ready(t, width);
    assert.equal(
      await p.locator(".games-hero h1").evaluate((e) => {
        const range = document.createRange();
        range.selectNodeContents(e.firstChild);
        return (
          range.getClientRects().length === 1 &&
          range.getBoundingClientRect().right <=
            e.getBoundingClientRect().right + 1
        );
      }),
      true,
      "The Kazakh heading word stays intact",
    );
    await fits(p, `library ${width}`);
    await shot(p, `library-${width}`);
    const bank = await p.evaluate(() => JSON.stringify(gameQuestionBank));
    const ids = await p
      .locator("[data-game-id]")
      .evaluateAll((es) => es.map((e) => e.dataset.gameId));
    assert.equal(ids.length, 20);
    for (const id of ids)
      await t.test(id, async () => {
        await open(p, id, true);
        await fits(p, `${id} setup ${width}`);
        if (id === "quest") await shot(p, `setup-${width}`);
        await p.locator("#startGameButton").click();
        await p.clock.runFor(40);
        await fits(p, `${id} play ${width}`);
        await shot(p, `${id}-${width}`);
        if (!captureOnly) {
          const helper = helpers.find((h) => (h.supports || h.supported)(id));
          assert.ok(helper, id);
          await helper.play(p, id);
          await fits(p, `${id} result ${width}`);
          if (id === "rocket") {
            const inside = await p.evaluate(() => {
              const scene = document
                .querySelector(".final-rocket-scene")
                .getBoundingClientRect();
              const ship = document
                .querySelector("#finalRocketShip")
                .getBoundingClientRect();
              return (
                ship.top >= scene.top &&
                ship.bottom <= scene.bottom &&
                ship.left >= scene.left &&
                ship.right <= scene.right
              );
            });
            assert.ok(inside, `The docked rocket fits the ${width}px scene`);
          }
          assert.equal(
            await p.locator("#gameProgress").textContent(),
            "Нәтиже",
          );
          assert.ok(await p.locator(".shared-summary").isVisible());
          assert.equal(await p.locator(".design-result-mark").count(), 1);
          await shot(p, `${id}-result-${width}`);
        }
      });
    assert.equal(
      await p.evaluate(() => JSON.stringify(gameQuestionBank)),
      bank,
    );
  });
}
test("design: Kazakh search, clear action, skip link and visible keyboard focus", async (t) => {
  const p = await ready(t);
  await p.locator("#designSearch").fill("құпия");
  assert.equal(await p.locator(".game-card:visible").count(), 1);
  await p.locator("#designSearch").fill("табылмайтын атау");
  assert.ok(await p.locator("#designSearchEmpty").isVisible());
  await p.locator("#designSearchClear").click();
  assert.equal(await p.locator(".game-card:visible").count(), 20);
  assert.ok(
    await p
      .locator("#designSearch")
      .evaluate((e) => e === document.activeElement),
  );
  await p.locator("#designSkip").focus();
  assert.equal(
    await p
      .locator("#designSkip")
      .evaluate((e) => getComputedStyle(e).transform),
    "none",
  );
  await p.keyboard.press("Enter");
  assert.ok(
    await p.locator("#gamesGrid").evaluate((e) => e === document.activeElement),
  );
  await p.keyboard.press("Tab");
  assert.equal(
    await p.evaluate(
      () => getComputedStyle(document.activeElement).outlineStyle,
    ),
    "solid",
  );
  assert.equal(
    await p.evaluate(
      () => getComputedStyle(document.activeElement).outlineWidth,
    ),
    "3px",
  );
});
test("design: projector and motion settings fit every game at four widths without changing learning state", async (t) => {
  const p = await ready(t, 1440);
  const ids = await p
    .locator("[data-game-id]")
    .evaluateAll((es) => es.map((e) => e.dataset.gameId));
  for (const width of [320, 390, 768, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    for (const id of ids) {
      await open(p, id);
      const before = await p.evaluate(() =>
        JSON.stringify(GameSession.current()),
      );
      await p.locator("#designProjector").click();
      await p.locator("#designMotion").click();
      assert.equal(
        await p.locator("#designProjector").getAttribute("aria-pressed"),
        "true",
      );
      await fits(p, `projector ${id} ${width}`);
      assert.equal(
        await p.evaluate(() => JSON.stringify(GameSession.current())),
        before,
      );
      if (
        width === 1440 &&
        ["math-race", "quick-answer", "detective"].includes(id)
      )
        await shot(p, `projector-${id}-${width}`);
      await p.locator("#designProjector").click();
      await p.locator("#designMotion").click();
    }
  }
});
test("design: native fullscreen, return to library, rejected and unavailable API are recoverable", async (t) => {
  const p = await ready(t, 1440);
  await open(p, "target");
  const before = await p.evaluate(() => JSON.stringify(GameSession.current()));
  await p.locator("#designFullscreen").click();
  assert.ok(
    await p.evaluate(() => document.fullscreenElement?.id === "gameStage"),
  );
  assert.equal(
    await p.locator("#designFullscreen").getAttribute("aria-pressed"),
    "true",
  );
  await p.locator("#designFullscreen").click();
  assert.equal(await p.evaluate(() => document.fullscreenElement), null);
  assert.equal(
    await p.evaluate(() => JSON.stringify(GameSession.current())),
    before,
  );
  await p.locator("#designFullscreen").click();
  await p.locator("#backToGamesButton").click();
  await p.waitForFunction(() => !document.fullscreenElement);
  await open(p, "target");
  await p.locator("#designFullscreen").click();
  await helpers[0].play(p, "target");
  await p.locator("#finalOtherGame").click();
  await p.waitForFunction(
    () =>
      !document.fullscreenElement &&
      document.activeElement?.dataset.gameId === "target",
  );
  assert.ok(await p.locator("#gamesLibrary").isVisible());
  await open(p, "target");
  await p.evaluate(() => {
    document.getElementById("gameStage").requestFullscreen = () =>
      Promise.reject(Error("blocked"));
  });
  await p.locator("#designFullscreen").click();
  assert.match(await p.locator("#designStatus").textContent(), /ашылмады/);
  assert.equal(await p.locator("#designFullscreen").isEnabled(), true);
  await p.evaluate(() => {
    document.getElementById("gameStage").requestFullscreen = undefined;
  });
  await p.locator("#designFullscreen").click();
  assert.match(await p.locator("#designStatus").textContent(), /Проектор/);
  await fits(p, "fullscreen fallback");
});
test("design: reduced motion persists locally, honors OS preference and keeps the wheel outcome intact", async (t) => {
  const p = await ready(t);
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await open(p, "wheel");
  await p.locator("#designMotion").click();
  await p.locator("#designProjector").click();
  await p.locator("#spinTeamWheel").click();
  assert.equal(
    await p
      .locator("#timedWheelRotor")
      .evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  await p.clock.fastForward(1600);
  assert.equal(
    await p
      .locator("#timedWheelRotor")
      .evaluate((e) => getComputedStyle(e).visibility),
    "visible",
  );
  const sector = await p.evaluate(() => GameTimed.snapshot().game.sector);
  await p.locator("#pauseGameButton").click();
  await p.reload();
  await p.locator("#resumeGameBanner button").click();
  assert.equal(
    await p.locator("#designMotion").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await p.locator("#designProjector").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await p.evaluate(() => GameTimed.snapshot().game.sector),
    sector,
  );
  await p.locator("#resumePausedButton").click();
  await p.locator("#designMotion").click();
  await p.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await p
      .locator(".game-card")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
});
test("design: keyboard pair selection retains focus after render; pause and resume stay reachable", async (t) => {
  const p = await ready(t, 768);
  await open(p, "match");
  await p.locator('[data-match-left="0"]').focus();
  await p.keyboard.press("Enter");
  assert.equal(
    await p.locator(".logic-pair.is-selected").getAttribute("aria-pressed"),
    "true",
  );
  assert.ok(
    await p
      .locator(".logic-pair.is-selected")
      .evaluate((e) => e === document.activeElement),
  );
  await p.locator("#pauseGameButton").click();
  assert.ok(
    await p
      .locator("#resumePausedButton")
      .evaluate((e) => e === document.activeElement),
  );
  await p.keyboard.press("Enter");
  assert.ok(
    await p
      .locator("#gameQuestion")
      .evaluate((e) => e === document.activeElement),
  );
  assert.equal(await p.evaluate(() => GameSession.canAnswer()), true);
});
test("design: corrupt preferences and unavailable storage never block starting or answering", async (t) => {
  const p = await ready(t);
  await p.evaluate(() =>
    localStorage.setItem("math-ai-game-display-v1", "{bad"),
  );
  await p.reload();
  await open(p, "target");
  await p.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("quota");
    };
  });
  await p.locator("#designProjector").click();
  assert.match(
    await p.locator("#designStatus").textContent(),
    /сақтау мүмкін болмады/,
  );
  await helpers[0].firstStep(p, "target");
  assert.equal(
    await p.evaluate(() => GameFinal.snapshot().game.history.length),
    1,
  );
});
test("design: readable text contrast, 16px input and feedback that does not rely on color", async (t) => {
  const p = await ready(t);
  await open(p, "target");
  const contrast = await p.evaluate(() => {
    const luminance = (color) => {
      const rgb = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const ratio = (a, b) =>
      (Math.max(luminance(a), luminance(b)) + 0.05) /
      (Math.min(luminance(a), luminance(b)) + 0.05);
    const button = getComputedStyle(document.querySelector(".game-primary"));
    const prompt = getComputedStyle(document.querySelector(".final-prompt"));
    const task = getComputedStyle(document.querySelector(".final-task"));
    return [
      ratio(button.color, button.backgroundColor),
      ratio(prompt.color, task.backgroundColor),
    ];
  });
  assert.ok(
    contrast.every((n) => n >= 4.5),
    JSON.stringify(contrast),
  );
  const wrong = await p.evaluate(() => {
    const s = GameFinal.snapshot(),
      q = s.qs[s.game.index];
    return q.options.findIndex((v) => !MathRacingModels.same(v, q.answer));
  });
  await p.locator(`[data-final-answer="${wrong}"]`).focus();
  await p.keyboard.press("Space");
  assert.match(await p.locator(".final-feedback h3").textContent(), /✕ Қате/);
  assert.equal(
    await p.locator(".final-feedback").getAttribute("role"),
    "status",
  );
  assert.equal(
    await p.locator(".final-feedback").getAttribute("aria-atomic"),
    "true",
  );
  assert.equal(
    await p.locator(".final-feedback").getAttribute("data-design-feedback"),
    "incorrect",
  );
  await p.locator("#finalContinue").click();
  const right = await p.evaluate(() => {
    const s = GameFinal.snapshot(),
      q = s.qs[s.game.index];
    return q.options.findIndex((v) => MathRacingModels.same(v, q.answer));
  });
  await p.locator(`[data-final-answer="${right}"]`).focus();
  await p.keyboard.press("Enter");
  assert.match(await p.locator(".final-feedback h3").textContent(), /Дәл тиді/);
  assert.equal(
    await p.locator(".final-feedback").getAttribute("data-design-feedback"),
    "correct",
  );
  await open(p, "quick-answer");
  assert.ok(
    await p
      .locator("#quickAnswerInput")
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16),
  );
});

test("design: a pointer at the continue-button edge never oscillates its hit area", async (t) => {
  const p = await ready(t, 1440);
  await open(p, "target");
  await helpers[0].firstStep(p, "target", false, false);
  const button = p.locator("#finalContinue");
  await button.scrollIntoViewIfNeeded();
  await p.mouse.move(0, 0);
  const before = await button.boundingBox();
  await p.mouse.move(
    before.x + before.width / 2,
    before.y + before.height - 0.2,
  );
  for (let i = 0; i < 8; i++) {
    await p.clock.runFor(16);
    assert.deepEqual(await button.boundingBox(), before);
  }
  await button.click();
  assert.equal(await p.evaluate(() => GameFinal.snapshot().game.index), 1);
});
