const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture } = require("./helpers/iustaz.cjs");
test("C: dashboard shows real catalogs and verified empty library", async (t) => {
  const p = await fixture(t);
  await p.waitForFunction(
    () => document.querySelector("#iuTopicCount")?.dataset.contexts,
  );
  assert.equal(await p.locator("#iuGameCount").textContent(), "20");
  assert.equal(await p.locator("#iuLessonCount").textContent(), "0");
  assert.equal(
    Number(await p.locator("#iuTopicCount").getAttribute("data-contexts")),
    64,
  );
  assert.ok(Number(await p.locator("#iuTopicCount").textContent()) > 100);
  assert.match(
    await p.locator("#iuCatalogNote").textContent(),
    /толық дайын сабақтар санын білдірмейді/,
  );
  assert.equal(await p.locator(".iu-nav-future a").count(), 0);
  assert.equal(await p.locator(".iu-nav-item[aria-current]").count(), 1);
});
test("C: guest view does not read private drafts or claim fake stats", async (t) => {
  const p = await fixture(t, { guest: true });
  await p.waitForSelector("#iuProfileName");
  assert.equal(await p.locator("#iuProfileName").textContent(), "Қонақ");
  assert.equal(await p.locator("#iuLessonCount").textContent(), "Кіру қажет");
  assert.equal(await p.locator("#favorites").isVisible(), false);
  assert.equal(await p.locator("#my-lessons").isVisible(), false);
  assert.equal(await p.locator("#iuAdmin").isVisible(), false);
  await p.route("**/games-learning.js", (r) => r.abort());
  await p.reload();
  await p.waitForSelector("#iuGameCount");
  assert.equal(await p.locator("#iuGameCount").textContent(), "Қолжетімсіз");
});
test("C: real section search supports keyboard and safe results", async (t) => {
  const p = await fixture(t);
  await p.locator("#iuSectionSearch").fill("сабақ");
  assert.equal(await p.locator("#iuSearchResults a").count(), 2);
  await p.locator("#iuSectionSearch").press("ArrowDown");
  assert.match(
    await p.evaluate(() => document.activeElement.href),
    /constructor.html/,
  );
  await p.locator("#iuSectionSearch").fill('<img onerror="window.qaXss=1">');
  assert.equal(await p.locator("#iuSearchResults img").count(), 0);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
test("C: lesson search no-results XSS regression", async (t) => {
  const p = await fixture(t);
  await p.locator("#searchInput").fill('<img src=x onerror="window.qaXss=1">');
  await p.locator("#searchInput").press("Enter");
  assert.equal(await p.locator("#searchResultsList img").count(), 0);
  assert.match(await p.locator("#searchResultsList").textContent(), /<img/);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
});
for (const width of [320, 390, 768, 1024, 1440])
  test("C: responsive dashboard and menu " + width, async (t) => {
    const p = await fixture(t, { width });
    await p.waitForSelector(".iu-sidebar", { state: "attached" });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (width <= 1200) {
      await p.locator(".iu-menu-toggle").click();
      assert.equal(
        await p.locator(".iu-sidebar").getAttribute("aria-modal"),
        "true",
      );
      assert.equal(
        await p.locator(".iu-content").evaluate((x) => x.inert),
        true,
      );
      await p.keyboard.press("Shift+Tab");
      assert.equal(
        await p
          .locator(".iu-sidebar")
          .evaluate((x) => x.contains(document.activeElement)),
        true,
      );
      await p.keyboard.press("Escape");
      assert.equal(
        await p
          .locator(".iu-menu-toggle")
          .evaluate((x) => x === document.activeElement),
        true,
      );
      assert.equal(
        await p.locator(".iu-content").evaluate((x) => x.inert),
        false,
      );
    }
    await p.screenshot({
      path: `/workspace/audit-math-ai/stage7-iustaz/C-home-${width}.png`,
      fullPage: true,
    });
  });
