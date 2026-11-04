const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, editor, preview } = require("./helpers/constructor.cjs");
test("C: add, reorder, time edit, explicit balancing and safe delete", async (t) => {
  const p = await fixture(t, 390);
  await editor(p);
  await p.locator("#stageMinutes").fill("8");
  assert.equal(
    await p.evaluate(() => LessonModel.total(ConstructorApp.doc)),
    50,
  );
  const before = await p.evaluate(() =>
    ConstructorApp.doc.stages.map((s) => s.id),
  );
  await p.locator("#addStage").click();
  await p.locator("#stageTitle").fill("Қосымша талдау");
  await p.locator("#stageUp").click();
  assert.equal(
    await p.evaluate(() => ConstructorApp.doc.stages[7].title),
    "Қосымша талдау",
  );
  p.once("dialog", (d) => d.dismiss());
  await p.locator("#balanceTime").click();
  assert.equal(
    await p.evaluate(() => LessonModel.total(ConstructorApp.doc)),
    50,
  );
  p.once("dialog", (d) => d.accept());
  await p.locator("#balanceTime").click();
  assert.equal(
    await p.evaluate(() => LessonModel.total(ConstructorApp.doc)),
    45,
  );
  p.once("dialog", (d) => d.accept());
  await p.locator("#deleteStage").click();
  assert.equal(
    await p.evaluate(() => ConstructorApp.doc.stages.length),
    before.length,
  );
});
test("C: real bank filters, manual work kinds, descriptor points and homework", async (t) => {
  const p = await fixture(t);
  assert.ok((await p.locator("[data-bank]").count()) > 0);
  await p.locator("#bankLevel").selectOption("C");
  assert.equal(await p.locator("[data-bank]").count(), 0);
  await p.locator("#bankLevel").selectOption("");
  await p.locator('[data-bank][data-target="stage"]').first().click();
  const stages = await p.evaluate(() =>
    ConstructorApp.doc.stages.map((s) => ({ id: s.id, kind: s.kind })),
  );
  for (const kind of ["pair", "group", "individual"]) {
    await p
      .locator("#stageChoice")
      .selectOption(stages.find((s) => s.kind === kind).id);
    await p.locator("#manualTask").click();
    const card = p.locator(".task-edit").last();
    await card.locator('[data-key="prompt"]').fill("3x + 7 = 22");
    await card.locator('[data-key="answer"]').fill("x = 5");
    await card.locator('[data-key="solution"]').fill("3x = 15; x = 5");
    await card.locator('[data-key="level"]').selectOption("A");
    await card.locator("[data-add-desc]").click();
    await p
      .locator(".task-edit")
      .last()
      .locator('[data-key="text"]')
      .fill("Теңдеуді шешеді");
    await p
      .locator(".task-edit")
      .last()
      .locator('[data-key="points"]')
      .fill("2");
  }
  assert.equal(
    await p.evaluate(() => LessonModel.points(ConstructorApp.doc)),
    6,
  );
  await p.locator("#addHomework").click();
  await p.locator('#homeworkEditor [data-key="prompt"]').fill("3x + 7 = 22");
  await p.locator('#homeworkEditor [data-key="optional"]').check();
  assert.equal(
    await p.evaluate(() => ConstructorApp.doc.homework[0].optional),
    true,
  );
  const bank = await p.evaluate(() => JSON.stringify(window.ktpD));
  await p.locator("#lessonTemplate").selectOption("Топтық сабақ");
  p.once("dialog", (d) => d.accept());
  await p.locator("#applyTemplate").click();
  assert.equal(await p.evaluate(() => JSON.stringify(window.ktpD)), bank);
});
test("C: groups receive independent assignments; incomplete work stays draft", async (t) => {
  const p = await fixture(t);
  const group = await p.evaluate(
    () => ConstructorApp.doc.stages.find((s) => s.kind === "group").id,
  );
  await p.locator("#stageChoice").selectOption(group);
  await p.locator("#groupCount").selectOption("3");
  await p.locator("#groupMode").selectOption("different");
  for (let n = 1; n <= 3; n++) {
    await p.locator("#manualTask").click();
    await p
      .locator(".task-edit")
      .last()
      .locator('[data-key="group"]')
      .selectOption(String(n));
  }
  assert.deepEqual(
    await p.evaluate(() =>
      ConstructorApp.doc.stages
        .find((s) => s.kind === "group")
        .tasks.map((t) => t.group),
    ),
    [1, 2, 3],
  );
  await p.locator("#reviewed").check();
  assert.match(
    await p.locator("#lessonWarnings").innerText(),
    /толық|енгізілмеген/,
  );
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
});
