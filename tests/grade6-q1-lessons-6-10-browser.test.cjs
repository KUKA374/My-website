const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture } = require("./helpers/iustaz.cjs");
const catalog = require("./fixtures/stage8c-catalog.json");
const artifacts = "/workspace/audit-math-ai/stage8d";
fs.mkdirSync(artifacts, { recursive: true });
const pathFor = (n) =>
  `lesson-material.html?class=6&subject=math&quarter=1&lesson=${n}`;
async function open(t, n, width = 1440) {
  const p = await fixture(t, { width, page: pathFor(n) });
  await p.waitForFunction(
    (id) => window.LessonMaterialDemo?.currentId() === id,
    `ktp1:6:math:1:${n}`,
  );
  return p;
}
for (const n of [6, 7, 8, 9, 10])
  for (const width of [320, 390, 768, 1440])
    test(`KTP lesson ${n}: complete content, tasks, slides and QMJ at ${width}px`, async (t) => {
      const p = await open(t, n, width),
        d = JSON.parse(
          fs.readFileSync(`lesson-materials/content/6/math/q1/${n}.json`),
        ),
        row = catalog[n - 1];
      assert.equal(await p.locator("#materialTitle").textContent(), row.title);
      assert.equal(
        await p.locator("#materialObjective").textContent(),
        row.objective,
      );
      assert.ok(
        (await p.locator("#materialContext").textContent()).includes(
          row.section,
        ),
      );
      assert.match(
        await p.locator("#videoStatus").textContent(),
        /Видеосабақ жақын арада енгізіледі/,
      );
      assert.equal(await p.locator("video, iframe").count(), 0);
      assert.equal(
        await p.locator("#materialExamples .material-task").count(),
        4,
      );
      const resources = await p.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .filter((r) => r.name.endsWith(".json"))
          .map((r) => new URL(r.name).pathname),
      );
      assert.deepEqual(resources, [
        "/lesson-materials/index/6/math/q1.json",
        `/lesson-materials/content/6/math/q1/${n}.json`,
      ]);
      assert.equal(
        await p.locator("#materialGroups .material-task").count(),
        4,
      );
      assert.equal(await p.locator("#materialPairs .material-task").count(), 1);
      assert.equal(await p.locator("[data-task-answer]:visible").count(), 0);
      await p.locator("#nextPair").click();
      await p.locator("#nextPair").click();
      assert.equal(await p.locator("#materialPairs .material-task").count(), 3);
      assert.equal(await p.locator("#nextPair").isVisible(), false);
      for (const level of ["A", "B", "C"]) {
        await p.locator(`[data-level-select="${level}"]`).click();
        assert.equal(
          await p.locator(`[data-work-level="${level}"]`).isVisible(),
          true,
        );
        assert.equal(
          await p
            .locator(`[data-work-level="${level}"] .material-task`)
            .count(),
          2,
        );
      }
      assert.equal(await p.locator("#chooseGame option").count(), 20);
      await p.locator("#toggleAnswers").click();
      assert.equal(
        await p.locator("#materialPairs [data-task-answer]:visible").count(),
        3,
      );
      for (const game of d.games.recommended)
        assert.equal(
          await p.locator(`#chooseGame option[value="${game}"]`).count(),
          1,
        );
      const example = p.locator("#materialExamples .material-task").first();
      for (let step = 1; step < d.examples[0].steps.length; step++)
        await example.locator("button").click();
      assert.equal(
        await example.locator("strong").textContent(),
        "Нәтиже: " + d.examples[0].answer,
      );
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const visual = p.locator("#materialTheory [data-visual]").first();
      await visual.scrollIntoViewIfNeeded();
      await p.screenshot({ path: artifacts + `/lesson-${n}-${width}.png` });
      await p.locator("#openQmj").click();
      await p.waitForSelector("#qmjDialog[open]");
      assert.equal(await p.locator("#qmjPreview h3").textContent(), row.title);
      assert.ok(
        (await p.locator("#qmjPreview").textContent()).includes(row.objective),
      );
      assert.equal(await p.locator("#qmjPreview tbody tr").count(), 8);
      await p.locator("#closeQmj").click();
      await p.waitForFunction(() => !document.getElementById("qmjDialog").open);
      await p.locator("#openPresentation").click();
      await p.waitForSelector("#presentationDialog[open]");
      assert.match(
        await p.locator("#slidePosition").textContent(),
        new RegExp(`^${d.presentation.startSlide} / 12`),
      );
      for (
        let number = d.presentation.startSlide;
        number <= d.presentation.endSlide;
        number++
      ) {
        assert.equal(await p.locator("#slideBody .katex-error").count(), 0);
        assert.ok(
          (await p.locator("#slideBody").textContent()).trim().length > 0,
        );
        assert.ok(
          await p
            .locator("#presentationDialog")
            .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        );
        const deck = JSON.parse(
          fs.readFileSync(
            `lesson-materials/presentations/${d.presentation.id}.json`,
          ),
        );
        for (const step of deck.slides[number - 1].steps || [])
          await p.locator("#nextSlideStep").click();
        assert.equal(await p.locator("#nextSlideStep").isVisible(), false);
        if (number < d.presentation.endSlide)
          await p.locator("#nextSlide").click();
      }
      assert.equal(await p.locator("#nextSlide").isDisabled(), true);
      await p.screenshot({ path: artifacts + `/slides-${n}-${width}.png` });
    });
test("all five lessons retain personal homework on reload and isolate it from the other lesson", async (t) => {
  const p = await open(t, 6, 390);
  for (const n of [6, 7, 8, 9, 10]) {
    await p.goto(new URL(pathFor(n), p.url()).href);
    await p.waitForFunction(
      (id) => LessonMaterialDemo.currentId() === id,
      `ktp1:6:math:1:${n}`,
    );
    assert.equal(await p.locator("#personalHomework").inputValue(), "");
    await p.locator("#personalHomework").fill(`№${n}: жеке мұғалім жазбасы`);
    await p.locator("#savePersonal").click();
    await p.reload();
    await p.waitForFunction(
      (id) => LessonMaterialDemo.currentId() === id,
      `ktp1:6:math:1:${n}`,
    );
    assert.equal(
      await p.locator("#personalHomework").inputValue(),
      `№${n}: жеке мұғалім жазбасы`,
    );
    assert.equal(await p.locator("[data-task-answer]:visible").count(), 0);
  }
  await p.goto(new URL(pathFor(6), p.url()).href);
  await p.waitForFunction(
    () => LessonMaterialDemo.currentId() === "ktp1:6:math:1:6",
  );
  assert.equal(
    await p.locator("#personalHomework").inputValue(),
    "№6: жеке мұғалім жазбасы",
  );
});
test("lessons 8–10 expose the real proportion-bank source, all 20 games, and a working catalogue link", async (t) => {
  const p = await open(t, 8);
  for (const n of [8, 9, 10]) {
    if (n !== 8) {
      await p.goto(new URL(pathFor(n), p.url()).href);
      await p.waitForFunction(
        (id) => LessonMaterialDemo.currentId() === id,
        `ktp1:6:math:1:${n}`,
      );
    }
    assert.equal(await p.locator("#chooseGame").isDisabled(), false);
    assert.equal(await p.locator("[data-game-link]").count(), 20);
    assert.match(
      await p.locator("[data-game-context]").textContent(),
      /Пропорция/,
    );
    assert.match(
      await p.locator("[data-game-context]").textContent(),
      /автоматты көшірілмейді/,
    );
    await p.locator("#chooseGame").selectOption("cards");
    assert.equal(await p.locator("[data-game-context]").count(), 1);
    assert.equal(
      await p.locator("#launchSelectedGame").getAttribute("href"),
      "games.html",
    );
  }
  const [popup] = await Promise.all([
    p.waitForEvent("popup"),
    p.locator("#launchSelectedGame").click(),
  ]);
  await popup.waitForURL("**/games.html");
  await popup.waitForSelector("#startGameButton", { state: "attached" });
  assert.equal(await popup.locator("#startGameButton").count(), 1);
  await popup.close();
});
test("all 48 authored slides render formulas and reusable visuals without KaTeX errors", async (t) => {
  const p = await open(t, 10);
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  const names = [
    "inverse-ratios-v1",
    "proportion-definition-v1",
    "proportion-properties-v1",
    "direct-proportionality-v1",
  ];
  for (const name of names) {
    const d = JSON.parse(
      fs.readFileSync(`lesson-materials/presentations/${name}.json`),
    );
    for (const s of d.slides) {
      const r = await p.evaluate(async (s) => {
        const root = document.createElement("div");
        document.body.append(root);
        katex.render(s.formula, root, {
          throwOnError: true,
          trust: false,
          strict: "error",
          maxExpand: 100,
        });
        if (s.diagram) root.append(LessonVisuals.figure(s.diagram));
        const result = {
          errors: root.querySelectorAll(".katex-error").length,
          math: root.querySelectorAll(".katex").length,
          figures: root.querySelectorAll("[data-visual]").length,
        };
        root.remove();
        return result;
      }, s);
      assert.equal(r.errors, 0, `${name}/${s.id}`);
      assert.equal(r.math, 1, `${name}/${s.id}`);
      assert.equal(r.figures, s.diagram ? 1 : 0);
    }
  }
});
test("new lesson QMJ keeps exact KTP, 45-minute plan and hides answers in print layout at phone and desktop sizes", async (t) => {
  const p = await open(t, 6, 390);
  for (const n of [6, 7, 8, 9, 10]) {
    await p.goto(new URL(pathFor(n), p.url()).href);
    await p.waitForFunction(
      (id) => LessonMaterialDemo.currentId() === id,
      `ktp1:6:math:1:${n}`,
    );
    await p.locator("#toggleAnswers").click();
    await p.locator("#openQmj").click();
    await p.waitForSelector("#qmjDialog[open]");
    const text = await p.locator("#qmjPreview").textContent();
    assert.ok(text.includes(catalog[n - 1].objective));
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.emulateMedia({ media: "print" });
      assert.ok(
        await p
          .locator("#qmjPreview")
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      );
      assert.equal(await p.locator("[data-task-answer]:visible").count(), 0);
      if (width === 1440)
        await p.pdf({
          path: `${artifacts}/qmj-${n}.pdf`,
          format: "A4",
          printBackground: true,
        });
      await p.emulateMedia({ media: "screen" });
    }
  }
});
