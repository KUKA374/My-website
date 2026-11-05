const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture } = require("./helpers/iustaz.cjs");
const artifacts = "/workspace/audit-math-ai/stage8b";
fs.mkdirSync(artifacts, { recursive: true });
const ready = (p) =>
  p.waitForFunction(
    () => window.LessonMaterialDemo?.currentId() === "ktp1:6:math:1:1",
  );
async function open(t, width = 1440) {
  const p = await fixture(t, { width, page: "lesson-material.html" });
  await ready(p);
  return p;
}
test("video leads the lesson, missing video is honest and no external media auto-loads", async (t) => {
  const p = await open(t);
  assert.equal(
    await p.locator("#materialBody>section").first().getAttribute("id"),
    "lesson-video",
  );
  assert.equal(
    await p.locator("#videoStatus").textContent(),
    "Видеосабақ жақын арада енгізіледі",
  );
  assert.equal(await p.locator("iframe,video").count(), 0);
  assert.equal(await p.locator("#playVideo").isVisible(), false);
  assert.equal(
    await p.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => /youtube|\.mp4/.test(r.name)),
    ),
    false,
  );
});
test("teacher controls gate answers, three sequential pairs, four groups and ABC selection", async (t) => {
  const p = await open(t, 390);
  assert.equal(await p.locator("#materialPairs .material-task").count(), 1);
  assert.equal(await p.locator("#materialGroups .material-task").count(), 4);
  assert.equal(await p.locator('[data-work-level="A"]').isVisible(), true);
  assert.equal(await p.locator('[data-work-level="B"]').isVisible(), false);
  assert.equal(await p.locator('[data-work-level="C"]').isVisible(), false);
  assert.equal(await p.locator("[data-task-answer]:visible").count(), 0);
  await p.locator('[data-level-select="B"]').click();
  assert.equal(await p.locator('[data-work-level="A"]').isVisible(), false);
  assert.equal(await p.locator('[data-work-level="B"]').isVisible(), true);
  await p.locator("#toggleAnswers").click();
  assert.equal(
    await p.locator("#toggleAnswers").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await p.locator("#materialPairs [data-task-answer]:visible").count(),
    1,
  );
  await p.locator("#nextPair").click();
  await p.locator("#nextPair").click();
  assert.equal(await p.locator("#materialPairs .material-task").count(), 3);
  assert.equal(
    await p.locator("#materialPairs [data-task-answer]:visible").count(),
    3,
  );
  assert.equal(await p.locator("#nextPair").isVisible(), false);
  await p.locator("#toggleAnswers").click();
  assert.equal(await p.locator("[data-task-answer]:visible").count(), 0);
  await p.locator("#nextLesson").click();
  await p.waitForFunction(() => LessonMaterialDemo.currentId()?.endsWith(":2"));
  assert.equal(
    await p.locator("#toggleAnswers").getAttribute("aria-pressed"),
    "false",
  );
});
test("worked examples reveal one step at a time and share safe mathematical visual components", async (t) => {
  const p = await open(t);
  assert.equal(await p.locator("#materialTheory [data-visual]").count(), 3);
  assert.equal(
    await p
      .locator('#materialTheory [data-visual="number-line"] svg')
      .getAttribute("role"),
    "img",
  );
  const example = p.locator("#materialExamples .material-task").first();
  assert.equal(await example.locator("li").count(), 1);
  assert.equal(await example.locator("strong").isVisible(), false);
  await example.locator("button").click();
  await example.locator("button").click();
  assert.equal(await example.locator("li").count(), 3);
  assert.equal(await example.locator("strong").isVisible(), true);
  assert.equal(await example.locator("button").isVisible(), false);
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  assert.equal(
    await p.locator('#slideBody [data-visual="fraction-bar"]').count(),
    1,
  );
  await p.locator("#nextSlideStep").click();
  assert.equal(await p.locator("#slideSteps li").count(), 1);
  await p.locator("#nextSlideStep").click();
  assert.equal(await p.locator("#nextSlideStep").isVisible(), false);
  await p.keyboard.press("ArrowRight");
  assert.match(await p.locator("#slidePosition").textContent(), /^2 \/ 12/);
  assert.equal(await p.locator("#slideSteps li").count(), 0);
  assert.equal(
    await p.locator('#slideBody [data-visual="number-line"]').count(),
    1,
  );
  await p.keyboard.press("End");
  assert.match(await p.locator("#slidePosition").textContent(), /^12 \/ 12/);
  await p.keyboard.press("ArrowRight");
  assert.match(await p.locator("#slidePosition").textContent(), /^12 \/ 12/);
  await p.keyboard.press("Home");
  assert.match(await p.locator("#slidePosition").textContent(), /^1 \/ 12/);
});
test("presentation uses real fullscreen, exits safely and keeps navigation keyboard accessible", async (t) => {
  const p = await open(t);
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  await p.locator("#fullscreenSlides").click();
  await p.waitForFunction(
    () => document.fullscreenElement?.id === "presentationScreen",
  );
  await p.keyboard.press("PageDown");
  assert.match(await p.locator("#slidePosition").textContent(), /^2 \/ 12/);
  await p.locator("#fullscreenSlides").click();
  await p.waitForFunction(() => !document.fullscreenElement);
  await p.keyboard.press("Escape");
  await p.waitForFunction(
    () => document.activeElement.id === "openPresentation",
  );
  assert.equal(await p.locator("#presentationDialog").isVisible(), false);
});
test("unsupported fullscreen has an honest expanded fallback and closes cleanly", async (t) => {
  const p = await open(t, 390);
  await p.evaluate(() => (HTMLElement.prototype.requestFullscreen = undefined));
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  await p.locator("#fullscreenSlides").click();
  assert.match(
    await p.locator("#fullscreenStatus").textContent(),
    /қолдамайды/,
  );
  assert.equal(
    await p
      .locator("#presentationDialog")
      .evaluate((e) => e.classList.contains("presentation-expanded")),
    true,
  );
  await p.locator("#closePresentation").click();
  await p.waitForFunction(
    () => !document.getElementById("presentationDialog").open,
  );
  assert.equal(
    await p
      .locator("#presentationDialog")
      .evaluate((e) => e.classList.contains("presentation-expanded")),
    false,
  );
});
test("textbook references save with existing homework and QMJ uses exact lesson data without revealing answers", async (t) => {
  const p = await open(t);
  await p.locator("#personalHomework").fill("Бұрынғы жеке үй жұмысы");
  await p.locator("#personalNotes").fill("Жеке мұғалім жазбасы");
  await p.locator("#textbookParagraph").fill("§ 2");
  await p.locator("#textbookExercise").fill("№ 15, 16 (а)");
  await p.locator("#savePersonal").click();
  await p.reload();
  await ready(p);
  assert.equal(
    await p.locator("#textbookExercise").inputValue(),
    "№ 15, 16 (а)",
  );
  assert.equal(
    await p.locator("#personalNotes").inputValue(),
    "Жеке мұғалім жазбасы",
  );
  assert.equal(await p.locator("#chooseGame option").count(), 20);
  assert.equal(await p.locator("[data-game-link]").count(), 20);
  await p.locator("#chooseGame").selectOption("cards");
  assert.match(await p.locator("#gameChoice").textContent(), /Карточкалар/);
  assert.equal(
    await p.locator("#launchSelectedGame").getAttribute("href"),
    "games.html",
  );
  const title = await p.locator("#materialTitle").textContent(),
    objective = await p.locator("#materialObjective").textContent();
  await p.locator("#toggleAnswers").click();
  await p.locator("#openQmj").click();
  await p.waitForSelector("#qmjDialog[open]");
  assert.equal(await p.locator("#qmjPreview h3").textContent(), title);
  const text = await p.locator("#qmjPreview").textContent();
  assert.ok(text.includes(objective));
  assert.match(text, /§ 2/);
  assert.match(text, /№ 15, 16 \(а\)/);
  assert.match(text, /Карточкалар/);
  assert.doesNotMatch(text, /Жеке мұғалім жазбасы|Жауабы:/);
  assert.equal(await p.locator("#qmjPreview tbody tr").count(), 8);
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.locator("#materialBody").isVisible(), false);
  assert.equal(await p.locator("#qmjPreview").isVisible(), true);
  const pdf = await p.pdf({ format: "A4", printBackground: true });
  assert.ok(pdf.length > 1000);
  fs.writeFileSync(artifacts + "/qmj-demo.pdf", pdf);
  const bbox = require("node:child_process").execFileSync(
    "pdftotext",
    ["-bbox", artifacts + "/qmj-demo.pdf", "-"],
    { encoding: "utf8" },
  );
  let words = 0;
  for (const page of bbox.matchAll(
    /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g,
  )) {
    const width = Number(page[1]),
      height = Number(page[2]);
    for (const word of page[3].matchAll(
      /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)">/g,
    )) {
      const [x1, y1, x2, y2] = word.slice(1).map(Number);
      assert.ok(
        x1 >= 0 && y1 >= 0 && x2 <= width + 0.1 && y2 <= height + 0.1,
        "PDF text must stay within the page",
      );
      words++;
    }
  }
  assert.ok(words > 150, "PDF contains the actual plan, not an empty page");
  await p.emulateMedia({ media: "screen" });
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => document.activeElement.id === "openQmj");
  await p.locator("#nextLesson").click();
  await p.waitForFunction(() => LessonMaterialDemo.currentId()?.endsWith(":2"));
  assert.equal(await p.locator("#textbookParagraph").inputValue(), "");
  await p.evaluate(() => qaEmit(null));
  assert.equal(await p.locator("#privateHomework").isVisible(), false);
});
test("signout clears personal preview and also exits a real fullscreen presentation", async (t) => {
  const p = await open(t);
  await p.locator("#textbookParagraph").fill("Жеке параграф");
  await p.locator("#openQmj").click();
  await p.waitForSelector("#qmjDialog[open]");
  await p.evaluate(() => qaEmit(null));
  assert.equal(await p.locator("#qmjPreview").textContent(), "");
  assert.equal(await p.locator("#textbookParagraph").inputValue(), "");
  assert.equal(await p.locator("#teacherControls").isVisible(), false);
  await p.evaluate(() =>
    qaEmit({ uid: "iustaz-test-owner", displayName: "Мұғалім" }),
  );
  await ready(p);
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  await p.locator("#fullscreenSlides").click();
  await p.waitForFunction(
    () => document.fullscreenElement?.id === "presentationScreen",
  );
  await p.evaluate(() => qaEmit(null));
  await p.waitForFunction(() => !document.fullscreenElement);
  assert.equal(await p.locator("#presentationDialog").isVisible(), false);
});
for (const width of [320, 390, 768, 1440])
  test(`lesson, teacher controls and QMJ fit ${width}px`, async (t) => {
    const p = await open(t, width);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await p.screenshot({ path: artifacts + `/lesson-${width}-viewport.png` });
    await p.screenshot({
      path: artifacts + `/lesson-${width}.png`,
      fullPage: true,
    });
    await p.locator("#openQmj").click();
    await p.waitForSelector("#qmjDialog[open]");
    assert.ok(
      await p
        .locator("#qmjDialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    );
    await p.screenshot({ path: artifacts + `/qmj-${width}.png` });
    await p.keyboard.press("Escape");
    await p.locator("#openPresentation").click();
    await p.waitForSelector("#presentationDialog[open]");
    assert.ok(
      await p
        .locator("#presentationDialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    );
    await p.screenshot({ path: artifacts + `/presentation-${width}.png` });
  });
test("lesson and QMJ remain free of automated WCAG A/AA violations", async (t) => {
  const p = await open(t, 390);
  await p.addScriptTag({
    path:
      process.env.IUSTAZ_AXE_PATH ||
      "/tmp/math-ai-axe/extracted/package/axe.min.js",
  });
  for (const dialog of [null, "#openQmj"]) {
    if (dialog) {
      await p.locator(dialog).click();
      await p.waitForSelector("#qmjDialog[open]");
    }
    const r = await p.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      }),
    );
    assert.deepEqual(
      r.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
    );
  }
});
