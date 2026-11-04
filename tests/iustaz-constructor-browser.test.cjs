const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, editor } = require("./helpers/constructor.cjs");
async function save(p, title, grade) {
  await editor(p);
  await p.locator("#meta-title").fill(title);
  await p.locator("#meta-grade").fill(grade);
  await p.locator("#saveLesson").click();
  await p.waitForFunction(() =>
    document.querySelector("#savedLessons .saved-lesson[data-iu-decorated]"),
  );
}
test("D: local library search, grade, metadata, copy and delete use existing storage", async (t) => {
  const p = await fixture(t);
  await save(p, "Сандық зерттеу", "6");
  await p.locator("#newLesson").click();
  await save(p, "Геометрия сабағы", "7");
  await p.locator("#iuLibraryGrade").selectOption("6");
  assert.equal(await p.locator(".saved-lesson:visible").count(), 1);
  await p.locator("#iuLibrarySearch").fill("табылмайды");
  assert.equal(await p.locator(".saved-lesson:visible").count(), 0);
  await p.locator("#iuLibrarySearch").fill("Сандық");
  await p.locator("[data-iu-copy]:visible").click();
  await p.waitForFunction(
    () => document.querySelectorAll(".saved-lesson").length === 3,
  );
  assert.equal(await p.evaluate(() => ConstructorApp.doc.meta.grade), "6");
  await p.locator("#iuLibrarySearch").fill("");
  await p.locator("#iuLibraryGrade").selectOption("");
  p.once("dialog", (d) => d.accept());
  await p.locator("[data-delete-lesson]").last().click();
  assert.equal(await p.locator(".saved-lesson").count(), 2);
});
test("D: constructor menu anchors expose existing panels and new lesson stays distinct", async (t) => {
  const p = await fixture(t, 390);
  await save(p, "Бұрынғы сабақ", "6");
  const id = await p.evaluate(() => ConstructorApp.doc.id);
  await p.evaluate(() => (location.hash = "taskLibrary"));
  await p.waitForFunction(() => document.activeElement.id === "taskLibrary");
  await p.evaluate(() => (location.hash = "newLesson"));
  await p.waitForFunction((old) => ConstructorApp.doc.id !== old, id);
  assert.equal(await p.locator(".saved-lesson").count(), 1);
  await p.evaluate((id) => (location.hash = "saved=" + id), id);
  await p.waitForFunction((old) => ConstructorApp.doc.id === old, id);
  assert.equal(await p.locator("#meta-title").inputValue(), "Бұрынғы сабақ");
});
test("D: library filters reset when verified owner changes", async (t) => {
  const p = await fixture(t);
  await save(p, "Бірінші мұғалім", "6");
  await p.locator("#iuLibrarySearch").fill("құпия");
  await p.evaluate(() => qaNotify({ uid: "other-teacher" }));
  await p.waitForFunction(
    () =>
      ConstructorApp.owner?.uid === "other-teacher" &&
      document.querySelector("#builderApp").dataset.ready === "true",
  );
  assert.equal(await p.locator(".saved-lesson").count(), 0);
  assert.equal(await p.locator("#iuLibrarySearch").inputValue(), "");
  assert.equal(await p.locator("#iuProfileName").textContent(), "Мұғалім");
});
for (const width of [320, 390, 768, 1024, 1440])
  test("D: constructor chrome and panel scroll " + width, async (t) => {
    const p = await fixture(t, width);
    assert.equal(
      await p.locator(".iu-builder-heading h1").textContent(),
      "Сабақ конструкторы",
    );
    for (const panel of ["context", "editor", "preview"]) {
      if (width <= 1100) await p.locator(`[data-panel="${panel}"]`).click();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    if (width > 1100) {
      assert.equal(
        await p
          .locator("#editorPanel")
          .evaluate((x) => getComputedStyle(x).overflowY),
        "auto",
      );
      assert.ok((await p.locator("#editorPanel").boundingBox()).height < 1000);
    }
    await p.screenshot({
      path: `/workspace/audit-math-ai/stage7-iustaz/D-constructor-${width}.png`,
    });
  });
test("D: curriculum deep link selects a new plan without rewriting a saved lesson", async (t) => {
  const p = await fixture(t);
  await save(p, "Сақталған түпнұсқа", "6");
  const id = await p.evaluate(() => ConstructorApp.doc.id);
  await p.evaluate(
    () => (location.hash = "lesson=" + encodeURIComponent("7|algebra|1|1")),
  );
  await p.waitForFunction(
    () =>
      ConstructorApp.doc.meta.grade === "7" &&
      ConstructorApp.doc.meta.topicId === "1",
  );
  assert.notEqual(await p.evaluate(() => ConstructorApp.doc.id), id);
  assert.equal(await p.locator("#catalogSubject").inputValue(), "algebra");
  const original = await p.evaluate(
    (id) =>
      new ConstructorStorage.Repository(
        localStorage,
        ConstructorApp.owner.uid,
      ).get(id),
    id,
  );
  assert.equal(original.title, "Сақталған түпнұсқа");
});
