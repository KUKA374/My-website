const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, editor, preview } = require("./helpers/constructor.cjs");
test("B: actual curriculum topic and objective, live metadata preview and 45 minute model", async (t) => {
  const p = await fixture(t);
  await p.locator("#catalogTopic").selectOption("2");
  assert.match(await p.locator("#meta-objective").inputValue(), /5\.1\.2\.28/);
  await editor(p);
  await p.locator("#meta-goal").fill("Ондық бөлшектерге амалдар орындайды");
  await p.locator("#lessonDuration").selectOption("80");
  await preview(p);
  assert.match(await p.locator("#preview").textContent(), /Ондық бөлшектерге/);
  assert.match(await p.locator("#lessonWarnings").textContent(), /80/);
});
test("B: formula uses local KaTeX and hostile text remains inert", async (t) => {
  const p = await fixture(t);
  await editor(p);
  await p.locator("#meta-title").fill('<img src=x onerror="window.qaXss=1">');
  await p.locator("#blockType").selectOption("formula");
  await p.locator("#addBlock").click();
  await p.locator("[data-block]").fill("x^2+5x+6=0");
  await preview(p);
  assert.equal(await p.locator("#preview .katex").count(), 1);
  assert.equal(await p.locator("#preview img").count(), 0);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
for (const width of [320, 390, 768, 1440])
  test("B: three panels fit " + width, async (t) => {
    const p = await fixture(t, width);
    for (const panel of ["context", "editor", "preview"]) {
      if (width <= 1100) await p.locator(`[data-panel="${panel}"]`).click();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
  });
