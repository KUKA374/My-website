const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture } = require("./helpers/iustaz.cjs");
test("F: 8 final pages × 5 widths, screenshots and no page overflow", async (t) => {
  const p = await fixture(t, { role: "admin" });
  const out = "/workspace/audit-math-ai/stage7-iustaz/after";
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  for (const page of [
    "index.html",
    "class.html?class=6",
    "lesson.html?class=6&subject=math&quarter=1&lesson=1",
    "constructor.html",
    "games.html",
    "qmj.html",
    "admin.html",
    "login.html",
  ]) {
    await p.goto(new URL(page, p.url()).href);
    await p.waitForLoadState("networkidle");
    if (page === "constructor.html")
      await p.waitForSelector('#builderApp[data-ready="true"]');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      const layout = await p.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(layout.scroll <= width + 1, page + " " + width);
      assert.match(await p.title(), /iUSTAZ/);
      const smallButtons = await p
        .locator("button:visible")
        .evaluateAll((es) =>
          es
            .map((e) => ({
              id: e.id,
              text: e.textContent.trim(),
              width: e.getBoundingClientRect().width,
              height: e.getBoundingClientRect().height,
            }))
            .filter((x) => x.height < 43.9 || x.width < 43.9),
        );
      assert.deepEqual(smallButtons, [], page + " touch targets " + width);
      if (page !== "login.html") {
        const control = await p.locator("#iuSectionSearch").evaluate((x) => ({
          border: getComputedStyle(x).borderWidth,
          font: getComputedStyle(x).fontSize,
          height: x.getBoundingClientRect().height,
        }));
        assert.equal(control.border, "0px");
        assert.equal(control.font, "13px");
        assert.ok(control.height >= 44);
        assert.ok(
          (await p.locator(".iu-profile summary").boundingBox()).height >= 44,
        );
      }
      const logo = p
        .locator('img[src="assets/iustaz/logo-light.svg"]:visible')
        .first();
      if (await logo.count())
        assert.equal(
          await logo.evaluate((im) => im.complete && im.naturalWidth > 0),
          true,
          "brand SVG renders",
        );
      await p.screenshot({
        path: `${out}/${page.split(".")[0]}-${width}.png`,
        fullPage: true,
      });
      results.push({ page, ...layout });
    }
  }
  fs.writeFileSync(
    out + "/layout-results.json",
    JSON.stringify(results, null, 2),
  );
});
