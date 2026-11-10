const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { chromium } = require("playwright"),
  { startDemo } = require("../server/ai-lessons/demo.cjs");
const artifacts = "/workspace/audit-math-ai/gemini-ai";
fs.mkdirSync(artifacts, { recursive: true });
async function fixture(t, { width = 1440, role = "admin" } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "iustaz-ai-browser-"));
  const demo = await startDemo({ port: 0, dataDir, role });
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const c = await b.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 600,
      reducedMotion: "reduce",
    }),
    p = await c.newPage(),
    errors = [],
    external = [];
  p.on("pageerror", (e) => errors.push(e.message));
  c.on("request", (r) => {
    if (!r.url().startsWith(demo.origin)) external.push(r.url());
  });
  t.after(async () => {
    await b.close();
    await demo.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
  });
  await p.goto(demo.origin + "/admin.html");
  return { p, demo };
}
for (const width of [390, 768, 1440])
  test(`admin AI fixture: complete generation, private save, 12 slides, QMJ and stats at ${width}px`, async (t) => {
    const { p, demo } = await fixture(t, { width });
    await p.waitForSelector("#aiOpenLab:not([hidden])");
    await p.locator("#aiOpenLab").click();
    await p.waitForFunction(
      () => !document.getElementById("aiGenerate").disabled,
    );
    assert.match(await p.locator("#aiLabStatus").textContent(), /Сынақ режимі/);
    assert.match(
      await p.locator("#aiLessonContext").textContent(),
      /8-сынып.*2-тоқсан.*№3/,
    );
    await p.locator("#aiGenerate").evaluate((b) => {
      b.click();
      b.click();
    });
    await p.waitForSelector("#aiDraftContent h3");
    await p.waitForFunction(
      () => !document.getElementById("aiGenerate").disabled,
    );
    assert.equal(demo.store.stats("local-ai-demo-admin").requests, 1);
    assert.equal(demo.store.stats("local-ai-demo-admin").geminiRequests, 0);
    assert.equal(demo.store.stats("local-ai-demo-admin").fixtureRequests, 1);
    assert.match(
      await p.locator("#aiDraftContent").textContent(),
      /Gemini шақырылмаған/,
    );
    assert.equal(await p.locator("#aiDraftContent .ai-task").count(), 15);
    const q = p.locator("#aiDraftContent details").filter({
      has: p.locator("summary", { hasText: "ҚМЖ алдын ала көрінісі" }),
    });
    await q.locator("summary").click();
    assert.equal(await q.locator("tr").count(), 9);
    assert.match(await q.textContent(), /8\.2\.2\.3/);
    await p.locator("#aiSlides").scrollIntoViewIfNeeded();
    await p.waitForFunction(() => !!window.katex);
    assert.equal(await p.locator("#aiSlide .katex-error").count(), 0);
    for (let n = 1; n <= 12; n++) {
      assert.equal(
        await p.locator("#aiSlideCount").textContent(),
        `${n} / 12 слайд`,
      );
      if (n < 12) await p.locator("#aiNextSlide").click();
    }
    assert.equal(await p.locator("#aiNextSlide").isDisabled(), true);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await p.screenshot({
      path: `${artifacts}/admin-draft-${width}.png`,
      fullPage: true,
    });
    await p.reload();
    await p.waitForSelector("#aiOpenLab:not([hidden])");
    await p.locator("#aiOpenLab").click();
    await p.waitForSelector("#aiDraftList button");
    await p.locator("#aiDraftList button").first().click();
    await p.waitForSelector("#aiDraftContent h3");
    assert.equal(demo.store.stats("local-ai-demo-admin").requests, 1);
  });
test("teacher role sees no AI button and cannot read stored admin draft or token statistics", async (t) => {
  const { p } = await fixture(t, { role: "teacher" });
  await p.waitForTimeout(100);
  assert.equal(await p.locator("#aiOpenLab").isVisible(), false);
  assert.equal(await p.locator("#aiLessonLab").isVisible(), false);
  const status = await p.evaluate(async () => {
    const t = await firebase.auth().currentUser.getIdToken();
    return (
      await fetch("/api/ai-lessons/stats", {
        headers: { authorization: "Bearer " + t },
      })
    ).status;
  });
  assert.equal(status, 403);
});
test("generated HTML stays inert and signing out clears the entire preview including slides", async (t) => {
  const { p, demo } = await fixture(t);
  await p.waitForSelector("#aiOpenLab:not([hidden])");
  await p.locator("#aiOpenLab").click();
  await p.waitForFunction(
    () => !document.getElementById("aiGenerate").disabled,
  );
  await p.locator("#aiGenerate").click();
  await p.waitForSelector("#aiDraftContent h3");
  const row = demo.store.db
    .prepare("SELECT id,body FROM requests WHERE status='complete'")
    .get();
  const body = JSON.parse(row.body);
  body.material.theory[1].text =
    '<img src=x onerror="window.aiXss=1"><script>window.aiXss=2</script>';
  demo.store.db
    .prepare("UPDATE requests SET body=? WHERE id=?")
    .run(JSON.stringify(body), row.id);
  await p.locator("#aiRefresh").click();
  await p.locator("#aiDraftList button").first().click();
  await p.waitForFunction(() =>
    document.getElementById("aiDraftContent").textContent.includes("<img"),
  );
  assert.equal(
    await p.locator("#aiDraftContent img,#aiDraftContent script").count(),
    0,
  );
  assert.equal(await p.evaluate(() => window.aiXss || 0), 0);
  await p.evaluate(() => firebase.auth().signOut());
  await p.waitForFunction(() => document.getElementById("aiOpenLab").hidden);
  assert.equal(await p.locator("#aiDraftContent").textContent(), "");
  assert.equal(await p.locator("#aiSlide").textContent(), "");
  assert.equal(await p.locator("#aiSlides").isVisible(), false);
});
test("static-host fallback checks availability without sending a Firebase ID token", async (t) => {
  const { p } = await fixture(t);
  const requests = [];
  p.on("request", (r) => {
    if (r.url().includes("/api/ai-lessons/"))
      requests.push({ url: r.url(), authorization: r.headers().authorization });
  });
  await p.route("**/api/ai-lessons/availability", (r) =>
    r.fulfill({
      status: 404,
      contentType: "text/html",
      body: "not an API server",
    }),
  );
  await p.waitForSelector("#aiOpenLab:not([hidden])");
  await p.locator("#aiOpenLab").click();
  await p.waitForFunction(() =>
    document
      .getElementById("aiLabStatus")
      .textContent.includes("AI сервері қосылмаған"),
  );
  assert.equal(await p.locator("#aiGenerate").isDisabled(), true);
  assert.ok(requests.length > 0);
  assert.ok(
    requests.every((r) => r.url.endsWith("/availability") && !r.authorization),
  );
});
