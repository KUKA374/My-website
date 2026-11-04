const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { fixture } = require("./helpers/iustaz.cjs");
const source = process.env.IUSTAZ_AXE_PATH;
for (const page of [
  "index.html",
  "constructor.html",
  "class.html?class=6",
  "lesson.html?class=6&subject=math&quarter=1&lesson=1",
  "games.html",
  "qmj.html",
  "admin.html",
  "login.html",
])
  test("F: WCAG A/AA automated audit " + page, async (t) => {
    assert.ok(
      source && fs.existsSync(source),
      "IUSTAZ_AXE_PATH must point to axe-core 4.10.3 axe.min.js",
    );
    const p = await fixture(t, { page, role: "admin" });
    await p.waitForLoadState("networkidle");
    if (page === "constructor.html")
      await p.waitForSelector('#builderApp[data-ready="true"]');
    await p.addScriptTag({ path: source });
    const result = await p.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      }),
    );
    const dir = "/workspace/audit-math-ai/stage7-iustaz/axe-final";
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      dir + "/" + page.split(".")[0] + ".json",
      JSON.stringify(result, null, 2),
    );
    assert.deepEqual(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
    );
  });
