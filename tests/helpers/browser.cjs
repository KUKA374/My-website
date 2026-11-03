const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
async function fixture(t, width = 390) {
  const server = http.createServer((req, res) => {
    const f = path.resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!f.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(f, (e, d) => {
      res.writeHead(e ? 404 : 200, {
        "Content-Type": f.endsWith(".js")
          ? "application/javascript"
          : f.endsWith(".css")
            ? "text/css"
            : "text/html",
      });
      res.end(e ? "" : d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(async () => {
    await browser.close();
    await new Promise((r) => server.close(r));
  });
  const p = await browser.newPage({
      viewport: { width, height: 900 },
      isMobile: width < 600,
      hasTouch: width < 600,
      reducedMotion: "reduce",
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/auth.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: "window.requireRole=()=>{};",
    }),
  );
  await p.clock.install();
  await p.goto(`http://127.0.0.1:${server.address().port}/games.html`);
  t.after(() => assert.deepEqual(errors, []));
  return p;
}
async function start(p, id) {
  if (await p.locator("#gameStage").isVisible())
    await p.locator("#backToGamesButton").click();
  await p.locator(`[data-game-id="${id}"]`).click();
  await p.locator("#startGameButton").click();
}

module.exports = { fixture, start };
