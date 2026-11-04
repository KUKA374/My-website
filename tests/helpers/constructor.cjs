const { chromium } = require("playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
async function fixture(
  t,
  width = 1440,
  {
    role = "teacher",
    uid = "qa-owner",
    denied = false,
    storageFail = false,
  } = {},
) {
  const root = path.resolve(__dirname, "../..");
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
      const ext = path.extname(f);
      res.writeHead(e ? 404 : 200, {
        "Content-Type":
          {
            ".js": "application/javascript",
            ".css": "text/css",
            ".woff2": "font/woff2",
            ".woff": "font/woff",
            ".ttf": "font/ttf",
            ".html": "text/html",
          }[ext] || "application/octet-stream",
      });
      res.end(e ? "" : d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(async () => {
    await browser.close();
    await new Promise((r) => server.close(r));
  });
  const p = await browser.newPage({
      viewport: { width, height: 950 },
      hasTouch: width < 600,
      reducedMotion: "reduce",
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/auth.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `window.requireRole=()=>{};window.qaAuth={role:${JSON.stringify(role)},uid:${JSON.stringify(uid)},denied:${denied}};window.ensureFirebase=async()=>({auth:()=>({onAuthStateChanged(fn){window.qaNotify=fn;Promise.resolve().then(()=>fn(qaAuth.uid?{uid:qaAuth.uid}:null));return ()=>{};}}),firestore:()=>({collection:()=>({doc:()=>({get:async()=>({exists:!qaAuth.denied,data:()=>({role:qaAuth.role})})})})})});`,
    }),
  );
  if (storageFail)
    await p.addInitScript(
      () =>
        (Storage.prototype.setItem = function () {
          throw Error("quota");
        }),
    );
  await p.goto(`http://127.0.0.1:${server.address().port}/constructor.html`);
  if (!denied && ["teacher", "admin", "super_admin"].includes(role) && uid) {
    await p.locator("#builderApp").waitFor({ state: "visible" });
    await p
      .locator('#catalogTopic option[value="1"]')
      .waitFor({ state: "attached" });
  }
  t.after(() => assert.deepEqual(errors, []));
  return p;
}
async function editor(p) {
  if (p.viewportSize().width <= 1100)
    await p.locator('[data-panel="editor"]').click();
}
async function preview(p) {
  if (p.viewportSize().width <= 1100)
    await p.locator('[data-panel="preview"]').click();
}
module.exports = { fixture, editor, preview };
