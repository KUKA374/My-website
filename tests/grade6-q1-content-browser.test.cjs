const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture } = require("./helpers/iustaz.cjs");
const catalog = require("./fixtures/stage8c-catalog.json");
const artifacts = "/workspace/audit-math-ai/stage8c";
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
for (const n of [1, 2, 3, 4, 5])
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
test("the live canonical catalogue still matches all 39 original records including IDs and objectives", async (t) => {
  const p = await open(t, 1);
  const rows = await p.evaluate(async () => {
    const c = { grade: "6", subject: "math", quarter: "1", number: "1" };
    return (await LessonMaterialsKtp.rows(c)).map((r) => ({
      ...r,
      lessonId: LessonMaterialsModel.id({ ...c, number: r.number }),
    }));
  });
  assert.deepEqual(rows, catalog);
});
test("unprepared lesson eleven has no content fetch, invented tasks or presentation", async (t) => {
  const p = await open(t, 11, 390);
  assert.equal(await p.locator("#materialPairs .material-task").count(), 0);
  assert.equal(await p.locator("#materialGroups .material-task").count(), 0);
  assert.match(
    await p.locator("#materialStatus").textContent(),
    /бос бөлімдер қате емес/,
  );
  assert.equal(
    await p.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => r.name.endsWith("/content/6/math/q1/11.json")),
    ),
    false,
  );
  assert.equal(await p.locator("#openPresentation").isVisible(), false);
});
test("all 72 new and retained slide formulas and diagrams render safely with the shared components", async (t) => {
  const p = await open(t, 1);
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  const names = [
    "fractions-review-v1",
    "fractions-operations-v2",
    "decimal-operations-v1",
    "sets-union-intersection-v1",
    "percent-charts-v1",
    "ratios-percent-v1",
  ];
  const decks = names.map((name) =>
    JSON.parse(fs.readFileSync(`lesson-materials/presentations/${name}.json`)),
  );
  const errors = await p.evaluate((decks) => {
    const errors = [];
    for (const deck of decks)
      for (const s of deck.slides) {
        try {
          const el = document.createElement("div");
          if (s.formula) {
            katex.render(s.formula, el, {
              throwOnError: true,
              trust: false,
              strict: "error",
              maxExpand: 100,
            });
          }
          if (s.diagram) LessonVisuals.figure(s.diagram);
        } catch (e) {
          errors.push(deck.id + "/" + s.id + ":" + e.message);
        }
      }
    return errors;
  }, decks);
  assert.deepEqual(errors, []);
});
