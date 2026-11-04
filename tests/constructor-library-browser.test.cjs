const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture, editor, preview } = require("./helpers/constructor.cjs");
const ready = (p) => p.locator('#builderApp[data-ready="true"]').waitFor();
test("E: save, rename, copy, reopen, confirmed delete and reload", async (t) => {
  const p = await fixture(t);
  await p.locator("#meta-title").fill("Менің бөлшек сабағым");
  await p.locator("#saveLesson").click();
  assert.equal(await p.locator(".saved-lesson").count(), 1);
  await p.locator("#copyLesson").click();
  assert.equal(await p.locator(".saved-lesson").count(), 2);
  await p.locator("#meta-title").fill("Көшірменің жаңа атауы");
  await p.locator("#saveLesson").click();
  await p.locator("#newLesson").click();
  assert.equal(await p.locator("#meta-title").inputValue(), "Жаңа сабақ");
  await p.locator("[data-open-lesson]").first().click();
  assert.equal(
    await p.locator("#meta-title").inputValue(),
    "Менің бөлшек сабағым",
  );
  p.once("dialog", (d) => d.dismiss());
  await p.locator("[data-delete-lesson]").first().click();
  assert.equal(await p.locator(".saved-lesson").count(), 2);
  p.once("dialog", (d) => d.accept());
  await p.locator("[data-delete-lesson]").first().click();
  assert.equal(await p.locator(".saved-lesson").count(), 1);
  await p.reload();
  await ready(p);
  assert.equal(
    await p.locator("#meta-title").inputValue(),
    "Көшірменің жаңа атауы",
  );
  assert.match(
    await p.locator("#saveStatus").textContent(),
    /қалпына|Сақталды/,
  );
});
test("E: autosave and synchronous pagehide flush preserve latest text", async (t) => {
  const p = await fixture(t, 390);
  await editor(p);
  await p.locator("#meta-title").fill("Автоматты сақталым");
  await p.waitForFunction(() =>
    document.getElementById("saveStatus").textContent.startsWith("Сақталды:"),
  );
  await p.locator("#meta-goal").fill("Бет жабылғанға дейінгі соңғы өзгеріс");
  await p.reload();
  await ready(p);
  await editor(p);
  assert.equal(
    await p.locator("#meta-goal").inputValue(),
    "Бет жабылғанға дейінгі соңғы өзгеріс",
  );
  assert.match(await p.locator("#saveStatus").textContent(), /браузер/);
});
test("E: worksheets hide answer, solution, descriptors with answers and teacher notes; actual print/PDF", async (t) => {
  const p = await fixture(t);
  await p.locator("#manualTask").click();
  const task = p.locator(".task-edit").first();
  await task.locator('[data-key="prompt"]').fill("3x + 7 = 22");
  await task.locator('[data-key="answer"]').fill("ЖАУАП_ҚҰПИЯ_5");
  await task.locator('[data-key="solution"]').fill("ШЕШІМ_ҚҰПИЯ");
  await task.locator("[data-add-desc]").click();
  await p.locator('[data-key="text"]').fill("ДЕСКРИПТОР_ҚҰПИЯ");
  await p.locator("#teacherNotes").fill("МҰҒАЛІМ_ҚҰПИЯ");
  await p.locator("#showAnswers").check();
  assert.match(await p.locator("#preview").innerText(), /ЖАУАП_ҚҰПИЯ/);
  await p.locator("#previewMode").selectOption("student");
  assert.equal(await p.locator("#showAnswers").isChecked(), false);
  assert.doesNotMatch(
    await p.locator("#preview").innerText(),
    /ЖАУАП_ҚҰПИЯ|ШЕШІМ_ҚҰПИЯ|ДЕСКРИПТОР_ҚҰПИЯ|МҰҒАЛІМ_ҚҰПИЯ/,
  );
  await p.evaluate(() => (window.print = () => (window.qaPrint = true)));
  await p.locator("#printLesson").click();
  assert.equal(await p.evaluate(() => window.qaPrint), true);
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.locator("#editorPanel").isVisible(), false);
  assert.equal(await p.locator("#previewControls").isVisible(), false);
  assert.equal(await p.locator("#preview").isVisible(), true);
  const pdf = await p.pdf({ format: "A4" });
  assert.ok(pdf.length > 1000);
  fs.mkdirSync("/workspace/audit-math-ai/stage6-constructor/artifacts", {
    recursive: true,
  });
  fs.writeFileSync(
    "/workspace/audit-math-ai/stage6-constructor/artifacts/student-lesson.pdf",
    pdf,
  );
});
test("E: verified UID switch cannot view or overwrite prior owner drafts", async (t) => {
  const p = await fixture(t);
  await p.locator("#meta-title").fill("ЖЕКЕ_БІРІНШІ");
  await p.locator("#saveLesson").click();
  await p.evaluate(async () => {
    qaAuth.uid = "qa-other";
    await qaNotify({ uid: "qa-other" });
  });
  await ready(p);
  assert.equal(await p.evaluate(() => ConstructorApp.owner.uid), "qa-other");
  assert.doesNotMatch(
    await p.locator("#builderApp").innerText(),
    /ЖЕКЕ_БІРІНШІ/,
  );
  assert.equal(await p.locator(".saved-lesson").count(), 0);
  await p.locator("#meta-title").fill("ЖЕКЕ_ЕКІНШІ");
  await p.locator("#saveLesson").click();
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("math-ai-lessons-v2:qa-owner")).items[0]
          .title,
    ),
    "ЖЕКЕ_БІРІНШІ",
  );
  await p.evaluate(async () => {
    qaAuth.role = "student";
    await qaNotify({ uid: "qa-other" });
  });
  assert.equal(await p.locator("#builderApp").isVisible(), false);
  assert.equal(await p.locator("#preview").textContent(), "");
});
test("E: storage quota failure stays explicit and does not claim save success", async (t) => {
  const p = await fixture(t, 1440, { storageFail: true });
  await p.locator("#meta-title").fill("Сақтау қатесі");
  await p.locator("#saveLesson").click();
  assert.match(await p.locator("#saveStatus").textContent(), /орындалмады/);
  assert.equal(await p.locator(".saved-lesson").count(), 0);
});
test("E: explicit legacy copy preserves the old key and inert teacher content", async (t) => {
  const p = await fixture(t);
  const old = JSON.stringify({
    lessonTitle: "Ескі жоспар",
    lessonGrade: "6-сынып",
    lessonSubject: "Математика",
    lessonQuarter: "1-тоқсан",
    lessonExplain: '<img src=x onerror="window.qaXss=1">',
    lessonPair: "Ескі жауап_7",
    lessonDuration: "45",
  });
  await p.evaluate(
    (v) => localStorage.setItem("mathTeacherCustomLesson", v),
    old,
  );
  p.once("dialog", (d) => d.accept());
  await p.locator("#importLegacy").click();
  assert.equal(await p.locator("#meta-title").inputValue(), "Ескі жоспар");
  assert.equal(
    await p.evaluate(() => localStorage.getItem("mathTeacherCustomLesson")),
    old,
  );
  assert.equal(await p.locator("#preview img").count(), 0);
  await p.locator("#previewMode").selectOption("student");
  assert.doesNotMatch(await p.locator("#preview").innerText(), /жауап_7/);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
test("E: corrupt saved IDs cannot inject HTML; raw library survives rejection", async (t) => {
  const p = await fixture(t);
  await p.locator("#saveLesson").click();
  const raw = await p.evaluate(() => {
    const key = "math-ai-lessons-v2:qa-owner",
      s = JSON.parse(localStorage.getItem(key));
    s.items[0].blocks = [
      {
        id: '"><img src=x onerror="window.qaXss=1">',
        type: "text",
        body: "мәтін",
        aux: "",
      },
    ];
    const raw = JSON.stringify(s);
    localStorage.setItem(key, raw);
    return raw;
  });
  await p.reload();
  await ready(p);
  assert.equal(await p.locator("#saveLesson").isDisabled(), true);
  assert.match(await p.locator("#saveStatus").innerText(), /оқылмады/);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("math-ai-lessons-v2:qa-owner")),
    raw,
  );
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
