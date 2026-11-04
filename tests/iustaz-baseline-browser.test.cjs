const { test } = require("node:test"),
  fs = require("node:fs");
const { fixture } = require("./helpers/iustaz.cjs");
test("A: original screens captured at five widths", async (t) => {
  const p = await fixture(t, { role: "admin" });
  const dir =
    process.env.IUSTAZ_CAPTURE_DIR ||
    "/workspace/audit-math-ai/stage7-iustaz/before";
  fs.mkdirSync(dir, { recursive: true });
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
    for (const width of [320, 390, 768, 1024, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.screenshot({
        path: `${dir}/${page.split(".")[0]}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
