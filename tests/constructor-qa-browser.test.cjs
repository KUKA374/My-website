const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture, editor, preview } = require("./helpers/constructor.cjs");
test("F: actual KTP loads each grade 5–11 without fabricating missing content", async (t) => {
  const p = await fixture(t);
  for (const grade of ["5", "6", "7", "8", "9", "10", "11"]) {
    await p.locator("#catalogGrade").selectOption(grade);
    await p.waitForFunction(
      (g) =>
        ConstructorApp.doc.meta.grade === g &&
        document.getElementById("catalogStatus").textContent !==
          "Оқу деректері оқылуда…",
      grade,
    );
    assert.ok(
      (await p.locator("#catalogTopic option").count()) > 1,
      "real rows for grade " + grade,
    );
    assert.equal(await p.locator("#meta-grade").inputValue(), grade);
  }
  assert.match(
    await p.locator("#catalogStatus").innerText(),
    /материал жоқ|дерек|материал бар/,
  );
});
test("F: manual topic selection clears the previous verified task bank", async (t) => {
  const p = await fixture(t);
  await p.locator("#catalogTopic").selectOption("");
  assert.equal(await p.evaluate(() => ConstructorApp.doc.meta.topicId), "");
  assert.equal(await p.locator("[data-bank]").count(), 0);
});
test("F: keyboard stage/game selectors and section navigation retain usable focus", async (t) => {
  const p = await fixture(t, 390);
  await p.locator('.section-nav a[href="#stagesSection"]').focus();
  await p.keyboard.press("Enter");
  assert.equal(await p.locator("#editorPanel").isVisible(), true);
  // Section navigation focuses its target in setTimeout(..., 0).
  // Wait for that observable result rather than racing the next event-loop task.
  await p.waitForFunction(
    () => document.activeElement.id === "stagesSection",
  );
  assert.equal(
    await p.evaluate(() => document.activeElement.id),
    "stagesSection",
  );
  await p.locator("#stageChoice").focus();
  await p.locator("#stageChoice").press("ArrowDown");
  await p.locator("#stageChoice").press("Enter");
  assert.equal(
    await p.evaluate(() => document.activeElement.id),
    "stageChoice",
  );
  await p.locator("#builderGame").focus();
  await p.locator("#builderGame").press("ArrowDown");
  await p.locator("#builderGame").press("Enter");
  assert.equal(
    await p.evaluate(() => document.activeElement.id),
    "builderGame",
  );
});
test("F: unsafe formula, URL, table and imported HTML remain inert", async (t) => {
  const p = await fixture(t);
  await p.locator("#stageMinutes").fill("-1");
  await p.locator("#saveLesson").click();
  assert.match(await p.locator("#saveStatus").innerText(), /Сандық/);
  assert.equal(
    await p.evaluate(() => LessonModel.total(ConstructorApp.doc)),
    45,
  );
  await p.locator("#stageMinutes").fill("3");
  for (const type of ["formula", "image", "table", "text"]) {
    await p.locator("#blockType").selectOption(type);
    await p.locator("#addBlock").click();
    const input = p.locator("[data-block]").last();
    await input.fill(
      type === "formula"
        ? "\\href{javascript:alert(1)}{x}"
        : type === "image"
          ? "javascript:alert(1)"
          : '<img src=x onerror="window.qaXss=1">',
    );
  }
  assert.equal(
    await p
      .locator('#preview [onerror],#preview a[href^="javascript:"]')
      .count(),
    0,
  );
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
  assert.equal(
    await p.evaluate(() =>
      ConstructorView.imageURL("data:image/svg+xml,<svg onload=alert(1)>"),
    ),
    "",
  );
  const text = await p.evaluate(() =>
    LessonCatalog.text("<script>window.qaXss=1</script><p>Қауіпсіз мәтін</p>"),
  );
  assert.equal(text, "Қауіпсіз мәтін");
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
for (const width of [320, 390, 768, 1440])
  test("F: complete editing and worksheet layout at " + width, async (t) => {
    const p = await fixture(t, width);
    await editor(p);
    await p.locator("#meta-title").fill("Жай бөлшектерге арналған толық сабақ");
    await p.locator("#manualTask").click();
    await p.locator('.task-edit [data-key="prompt"]').fill("1/2 + 1/4 = ?");
    await p.locator('.task-edit [data-key="answer"]').fill("3/4");
    await p.locator("#saveLesson").click();
    if (width === 1440)
      assert.ok(
        await p
          .locator("#editorPanel")
          .evaluate((e) => e.getBoundingClientRect().height < innerHeight),
        "desktop editor stays within a working viewport",
      );
    await preview(p);
    await p.locator("#previewMode").selectOption("student");
    assert.doesNotMatch(await p.locator("#preview").innerText(), /3\/4/);
    assert.equal(await p.locator("#preview .plan-stage").count(), 1);
    for (const panel of ["context", "editor", "preview"]) {
      if (width <= 1100) await p.locator(`[data-panel="${panel}"]`).click();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await preview(p);
    const bad = await p.locator("button:visible").evaluateAll((es) =>
      es
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width < 43.9 || r.height < 43.9;
        })
        .map((e) => e.id || e.textContent),
    );
    assert.deepEqual(bad, []);
    fs.mkdirSync("/workspace/audit-math-ai/stage6-constructor/artifacts", {
      recursive: true,
    });
    await p.screenshot({
      path: `/workspace/audit-math-ai/stage6-constructor/artifacts/constructor-${width}.png`,
      fullPage: true,
    });
  });
test("F: projector and motion toggles preserve the lesson and remain escapable on mobile", async (t) => {
  const p = await fixture(t, 390);
  await preview(p);
  const before = await p.evaluate(() => JSON.stringify(ConstructorApp.doc));
  await p.locator("#projectLesson").click();
  assert.equal(
    await p.locator("body").evaluate((e) => e.classList.contains("projector")),
    true,
  );
  await editor(p);
  assert.equal(await p.locator("#editorPanel").isVisible(), true);
  await preview(p);
  await p.locator("#reduceMotion").click();
  assert.equal(
    await p
      .locator("body")
      .evaluate((e) => e.classList.contains("reduce-motion")),
    true,
  );
  assert.equal(
    await p.evaluate(() => JSON.stringify(ConstructorApp.doc)),
    before,
  );
});

test("F: real second-tab storage events block overwrite and preserve both versions as copies", async (t) => {
  const p = await fixture(t);
  await p.locator("#meta-title").fill("Негізгі нұсқа");
  await p.locator("#saveLesson").click();
  const q = await p.context().newPage();
  await q.goto(p.url());
  await q.locator('#builderApp[data-ready="true"]').waitFor();
  await q.clock.install();
  await q.clock.pauseAt(new Date((await q.evaluate(() => Date.now())) + 100));
  await q.locator("#meta-title").fill("Екінші қойынды нұсқасы");
  await p.locator("#meta-title").fill("Бірінші қойынды сақтады");
  await p.locator("#saveLesson").click();
  await q.waitForFunction(() =>
    document.getElementById("saveStatus").textContent.includes("қойынды"),
  );
  await q.locator("#saveLesson").click();
  assert.match(await q.locator("#saveStatus").innerText(), /қойынды/);
  await q.locator("#copyLesson").click();
  const titles = await q.evaluate(() =>
    JSON.parse(localStorage.getItem("math-ai-lessons-v2:qa-owner")).items.map(
      (x) => x.title,
    ),
  );
  assert.ok(titles.includes("Бірінші қойынды сақтады"));
  assert.ok(titles.includes("Екінші қойынды нұсқасы — көшірме"));
  await q.close();
});
test("F: separate homework and clipboard fallback do not expose structured answers", async (t) => {
  const p = await fixture(t);
  await p.locator("#addHomework").click();
  await p.locator('#homeworkEditor [data-key="prompt"]').fill("1/2 + 1/4 = ?");
  await p.locator('#homeworkEditor [data-key="answer"]').fill("ЖАСЫРЫН_ЖАУАП");
  await p.locator('#homeworkEditor [data-key="optional"]').check();
  await p.locator("#previewMode").selectOption("homework");
  assert.match(await p.locator("#preview").innerText(), /Қосымша/);
  assert.doesNotMatch(await p.locator("#preview").innerText(), /ЖАСЫРЫН_ЖАУАП/);
  await p.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    }),
  );
  await p.locator("#copyLessonText").click();
  assert.match(await p.locator("#saveStatus").innerText(), /Ctrl\+C/);
  assert.ok(await p.evaluate(() => getSelection().toString().includes("1/2")));
});
