const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const { fixture } = require("./helpers/iustaz.cjs");
const out = "/workspace/audit-math-ai/stage7-iustaz";
test("F: long student PDF prints every task and hides answers, solutions and teacher notes", async (t) => {
  const p = await fixture(t, { page: "constructor.html" });
  await p.waitForSelector('#builderApp[data-ready="true"]');
  await p.evaluate(() => {
    const A = ConstructorApp,
      d = A.doc;
    d.title = d.meta.topic = "Ұзақ оқушы сабағы";
    d.teacherNotes = "PRIVATE_TEACHER_ONLY";
    d.stages.forEach((s) => (s.tasks = []));
    const stage = d.stages.find((s) => s.type === "individual") || d.stages[0];
    for (let i = 1; i <= 60; i++) {
      const task = LessonModel.task();
      task.prompt = `TASK_MARKER_${String(i).padStart(3, "0")} — 48 + 27 есептеңіз. Қосу амалын түсіндіріп, жауабыңызды төменге жазыңыз.`;
      task.answer = "PRIVATE_ANSWER";
      task.solution = "PRIVATE_SOLUTION";
      stage.tasks.push(task);
    }
    A.mode = "student";
    A.answers = false;
    A.render();
    A.panel("preview");
  });
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.locator(".iu-header").isVisible(), false);
  assert.equal(await p.locator(".iu-sidebar").isVisible(), false);
  assert.equal(await p.locator("#preview").isVisible(), true);
  assert.equal(
    await p
      .locator("#previewPanel")
      .evaluate((x) => getComputedStyle(x).overflowY),
    "visible",
  );
  const pdf = path.join(out, "long-student-lesson.pdf");
  await p.pdf({
    path: pdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  const text = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8" });
  for (let i = 1; i <= 60; i++)
    assert.ok(
      text.includes("TASK_MARKER_" + String(i).padStart(3, "0")),
      "missing task " + i,
    );
  assert.doesNotMatch(
    text,
    /PRIVATE_ANSWER|PRIVATE_SOLUTION|PRIVATE_TEACHER_ONLY|ЖҰМЫС КЕҢІСТІГІ/,
  );
  fs.writeFileSync(
    path.join(out, "print-check.json"),
    JSON.stringify(
      {
        tasks: 60,
        allTaskMarkers: true,
        privateMarkersAbsent: true,
        pdfBytes: fs.statSync(pdf).size,
      },
      null,
      2,
    ),
  );
});
test("F: reduced motion, keyboard focus and font failure remain usable", async (t) => {
  const p = await fixture(t, { width: 390 });
  await p.route("**/*.woff2", (r) => r.abort());
  await p.reload();
  await p.locator("#iuSectionSearch").focus();
  const outline = await p
    .locator("#iuSectionSearch")
    .evaluate((x) => getComputedStyle(x).outlineStyle);
  assert.notEqual(outline, "none");
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.equal(await p.locator(".iu-loading").count(), 0);
  await p.locator(".iu-profile summary").focus();
  await p.keyboard.press("Enter");
  assert.equal(await p.locator("#iuLogout").isVisible(), true);
  await p.keyboard.press("Escape");
  assert.equal(await p.locator(".iu-profile").evaluate((x) => x.open), false);
});
test("F: stored lesson dashboard is UID scoped and survives opening", async (t) => {
  const p = await fixture(t, { page: "constructor.html" });
  await p.waitForSelector('#builderApp[data-ready="true"]');
  await p.locator("#meta-title").fill("Кітапханадағы ескі жоспар");
  await p.locator("#saveLesson").click();
  const id = await p.evaluate(() => ConstructorApp.doc.id);
  await p.goto(new URL("index.html", p.url()).href);
  await p.waitForFunction(
    () => document.querySelector("#iuLessonCount").textContent === "1",
  );
  assert.match(
    await p.locator("#iuRecentLessons").textContent(),
    /Кітапханадағы ескі жоспар/,
  );
  await p.locator("#iuRecentLessons a").click();
  await p.waitForFunction((id) => window.ConstructorApp?.doc?.id === id, id);
  assert.equal(
    await p.locator("#meta-title").inputValue(),
    "Кітапханадағы ескі жоспар",
  );
});
