const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture } = require("./helpers/iustaz.cjs");
test("E: class cards keep all seven grades and subject/quarter URLs", async (t) => {
  const p = await fixture(t);
  assert.equal(await p.locator("#classGrid .class-card").count(), 7);
  await p.locator('.class-card[href="class.html?class=10"]').click();
  await p.waitForSelector(".quarter-card");
  assert.equal(await p.locator(".subject-block").count(), 4);
  assert.equal(await p.locator(".quarter-card").count(), 16);
  assert.match(
    await p.locator(".available-label").first().textContent(),
    /КТП тақырыптарын/,
  );
});
test("E: real topic retains content, honest placeholders and constructor deep link", async (t) => {
  const p = await fixture(t, {
    page: "lesson.html?class=6&subject=math&quarter=1&lesson=1",
  });
  await p.waitForSelector(".lesson-title");
  assert.equal(await p.locator(".lesson-page>.block").count(), 9);
  const link = p.locator('a[href^="constructor.html#lesson="]');
  assert.equal(await link.count(), 1);
  assert.match(
    decodeURIComponent(await link.getAttribute("href")),
    /6\|math\|1\|1/,
  );
});
test("E: catalogue retains 20 games, work formats, CTA and real topic controls", async (t) => {
  const p = await fixture(t, { page: "games.html" });
  await p.waitForSelector(".iu-game-launch");
  assert.equal(await p.locator(".game-card").count(), 20);
  assert.equal(await p.locator(".iu-game-launch").count(), 20);
  assert.equal(await p.locator("#iuGameGrade option").count(), 4);
  await p.locator("#iuGameGrade").selectOption("6");
  assert.equal(await p.locator("#iuGameTopic option").count(), 8);
  await p.locator("#iuGameTopic").selectOption("6-math-1-4");
  await p.locator('[data-game-id="match"]').click();
  assert.equal(await p.locator("#gradeSelect").inputValue(), "6");
  assert.equal(await p.locator("#lessonSelect").inputValue(), "4");
  assert.equal(await p.locator(".iu-header").isVisible(), false);
  await p.locator("#backToGamesButton").click();
  await p.locator("#designSearch").fill("Детектив");
  assert.equal(await p.locator(".game-card:visible").count(), 1);
  await p.locator("#designSearchClear").click();
  assert.equal(await p.locator(".game-card:visible").count(), 20);
});
for (const width of [320, 390, 768, 1024, 1440])
  test("E: catalogue surfaces fit " + width, async (t) => {
    const p = await fixture(t, { width, page: "games.html" });
    await p.waitForSelector(".iu-game-launch");
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await p.screenshot({
      path: `/workspace/audit-math-ai/stage7-iustaz/E-games-${width}.png`,
    });
    for (const file of [
      "class.html?class=11",
      "lesson.html?class=6&subject=math&quarter=1&lesson=1",
      "qmj.html",
      "admin.html",
    ]) {
      await p.goto(new URL(file, p.url()).href);
      await p.waitForLoadState("networkidle");
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        file,
      );
    }
  });
test("E: examples are safe and existing teacher notes are not labelled missing", async (t) => {
  const p = await fixture(t, {
    page: "lesson.html?class=6&subject=math&quarter=1&lesson=1",
  });
  await p.waitForSelector(".iu-examples");
  await p.evaluate(() => {
    window.lessonContent["6_math_1_1"].examples =
      '<script>window.qaXss=1</script><img src=x onerror="window.qaXss=1"><p>12 + 8 = 20</p>';
    window.lessonContent["6_math_1_1"].theory =
      '<p class="note">Мұғалімнің математикалық ескертуі</p>';
    render();
  });
  await p.waitForFunction(() =>
    document.querySelector(".iu-examples")?.textContent.includes("12 + 8"),
  );
  assert.equal(
    await p.locator(".iu-examples img,.iu-examples script").count(),
    0,
  );
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
  assert.equal(
    await p.locator(".lesson-page>.block").first().locator(".iu-badge").count(),
    0,
  );
});
test("F: grade 7 legacy short-key examples remain visible", async (t) => {
  const p = await fixture(t, {
    page: "lesson.html?class=7&subject=algebra&quarter=1&lesson=1",
  });
  await p.waitForSelector(".iu-examples");
  assert.match(await p.locator(".iu-examples").textContent(), /x = 8/);
  assert.equal(await p.locator(".iu-examples .iu-badge").count(), 0);
});
test("F: administrator labels and save feedback are Kazakh without changing role codes", async (t) => {
  const p = await fixture(t, { page: "admin.html", role: "super_admin" });
  assert.equal(await p.locator("#roleLabel").textContent(), "Бас әкімші");
  assert.equal(
    await p.locator("#panelTitle").textContent(),
    "Бас әкімші панелі",
  );
  await p
    .locator(".editor-help")
    .evaluate(
      (x) =>
        (x.textContent =
          "Сақталды. Teacher аккаунты да осы материалды көре алады."),
    );
  await p.waitForFunction(() =>
    document.querySelector(".editor-help").textContent.includes("Мұғалім"),
  );
  assert.equal(await p.evaluate(() => qaAuth.profile.role), "super_admin");
});
