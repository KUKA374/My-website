const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  crypto = require("crypto");
const { fixture } = require("./helpers/iustaz.cjs");
const ready = (p) =>
  p.waitForFunction(
    () => window.LessonMaterialDemo?.currentId() === "ktp1:6:math:1:1",
  );
async function demo(t, width = 390) {
  const p = await fixture(t, { width, page: "lesson-material.html" });
  await ready(p);
  return p;
}
test("initial real HTTP loads one material, one small index and zero slide/video/image/game engines", async (t) => {
  const p = await demo(t);
  const resources = await p.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => new URL(r.name).pathname),
  );
  assert.deepEqual(
    resources.filter((x) => x.endsWith(".json")),
    [
      "/lesson-materials/index/6/math/q1.json",
      "/lesson-materials/content/6/math/q1/1.json",
    ],
  );
  assert.equal(
    resources.some((x) =>
      /lesson-content|presentations\/|katex|games\.js|games-data|youtube|\.png$|\.jpg$/.test(
        x,
      ),
    ),
    false,
  );
  assert.equal(await p.locator("[data-game-link]").count(), 20);
  assert.equal(await p.locator("#materialGroups .material-task").count(), 4);
  assert.equal(await p.locator("#materialPairs .material-task").count(), 1);
  await p.locator("#nextPair").click();
  await p.locator("#nextPair").click();
  assert.equal(await p.locator("#materialPairs .material-task").count(), 3);
  assert.equal(await p.locator("#nextPair").isVisible(), false);
  assert.equal(
    await p.locator("[data-game-link]").first().getAttribute("href"),
    "games.html",
  );
});
test("presentation opens only on demand, respects ranges and reuses one 12-slide resource for two lessons", async (t) => {
  const p = await demo(t);
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  assert.match(await p.locator("#slidePosition").textContent(), /^1 \/ 12/);
  assert.equal(await p.locator("#slideBody .katex").count(), 0);
  await p.locator("#nextSlide").click();
  assert.equal(await p.locator("#slideBody .katex").count(), 1);
  for (let number = 3; number <= 8; number++) {
    await p.locator("#nextSlide").click();
    assert.match(
      await p.locator("#slidePosition").textContent(),
      new RegExp(`^${number} / 12`),
    );
    assert.ok((await p.locator("#slideBody").textContent()).trim().length > 0);
  }
  assert.equal(await p.locator("#nextSlide").isDisabled(), true);
  await p.keyboard.press("Escape");
  await p.waitForFunction(
    () => document.activeElement.id === "openPresentation",
  );
  assert.equal(
    await p
      .locator("#openPresentation")
      .evaluate((x) => x === document.activeElement),
    true,
  );
  await p.locator("#nextLesson").click();
  await p.waitForFunction(
    () => LessonMaterialDemo.currentId() === "ktp1:6:math:1:2",
  );
  assert.match(
    await p.locator("#materialStatus").textContent(),
    /бос бөлімдер қате емес/,
  );
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  assert.match(await p.locator("#slidePosition").textContent(), /^9 \/ 12/);
  for (let number = 10; number <= 12; number++) {
    await p.locator("#nextSlide").click();
    assert.match(
      await p.locator("#slidePosition").textContent(),
      new RegExp(`^${number} / 12`),
    );
    assert.ok((await p.locator("#slideBody").textContent()).trim().length > 0);
  }
  assert.equal(await p.locator("#nextSlide").isDisabled(), true);
  assert.equal(
    await p.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((r) => r.name.endsWith("fractions-review-v1.json")).length,
    ),
    1,
  );
});
test("verified UID and lesson isolate personal homework; reload persists and constructor library remains byte-identical", async (t) => {
  const p = await demo(t);
  await p.evaluate(() =>
    localStorage.setItem(
      "math-ai-lessons-v2:iustaz-test-owner",
      "untouched legacy library",
    ),
  );
  await p.locator("#personalHomework").fill("Бірінші мұғалімнің үй жұмысы");
  await p.locator("#savePersonal").click();
  assert.match(
    await p.locator("#personalStatus").textContent(),
    /серверге жіберілген жоқ/,
  );
  await p.reload();
  await ready(p);
  assert.equal(
    await p.locator("#personalHomework").inputValue(),
    "Бірінші мұғалімнің үй жұмысы",
  );
  await p.locator("#nextLesson").click();
  await p.waitForFunction(() => LessonMaterialDemo.currentId()?.endsWith(":2"));
  assert.equal(await p.locator("#personalHomework").inputValue(), "");
  await p.evaluate(() =>
    qaEmit({ uid: "different-owner", displayName: "Басқа мұғалім" }),
  );
  await p.waitForFunction(
    () =>
      !document.getElementById("privateHomework").hidden &&
      document.getElementById("personalHomework").value === "",
  );
  await p.locator("#previousLesson").click();
  await ready(p);
  assert.equal(await p.locator("#personalHomework").inputValue(), "");
  assert.equal(
    await p.evaluate(() =>
      localStorage.getItem("math-ai-lessons-v2:iustaz-test-owner"),
    ),
    "untouched legacy library",
  );
  await p.evaluate(() => qaEmit(null));
  assert.equal(await p.locator("#privateHomework").isVisible(), false);
  assert.equal(await p.locator("#personalHomework").inputValue(), "");
});
test("failed fetch retries without bulk fallback; authored XSS stays text and dangerous video cannot load", async (t) => {
  const p = await fixture(t);
  let broken = true;
  await p.route("**/lesson-materials/content/6/math/q1/1.json", async (r) => {
    if (broken)
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    const d = JSON.parse(
      fs.readFileSync("lesson-materials/content/6/math/q1/1.json"),
    );
    d.theory[0].text = '<img src=x onerror="window.qaXss=1">';
    await r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(d),
    });
  });
  await p.goto(new URL("lesson-material.html", p.url()).href);
  await p.locator("#retryMaterial").waitFor();
  assert.equal(await p.locator("#materialBody").isVisible(), false);
  broken = false;
  await p.locator("#retryMaterial").click();
  await ready(p);
  assert.match(await p.locator("#materialTheory").textContent(), /<img/);
  assert.equal(await p.locator("#materialTheory img").count(), 0);
  assert.equal(await p.evaluate(() => window.qaXss || 0), 0);
  assert.equal(await p.locator("iframe").count(), 0);
});
test("all 64 KTP contexts and 1,526 row names/order/numbers/sections/objectives match untouched main", async (t) => {
  const p = await demo(t);
  const baseline = require("./fixtures/stage8a-ktp-contexts.json");
  const actual = await p.evaluate(async (contexts) => {
    const result = [];
    for (const c of contexts) {
      const rows = await LessonMaterialsKtp.rows({ ...c, number: "1" });
      result.push({
        grade: c.grade,
        subject: c.subject,
        quarter: c.quarter,
        rows,
        ids: rows.map((r) =>
          LessonMaterialsModel.id({ ...c, number: r.number }),
        ),
      });
    }
    return result;
  }, baseline.contexts);
  const ids = new Set();
  let count = 0;
  for (let i = 0; i < actual.length; i++) {
    const row = actual[i];
    count += row.rows.length;
    assert.equal(
      crypto
        .createHash("sha256")
        .update(JSON.stringify(row.rows))
        .digest("hex"),
      baseline.contexts[i].sha256,
      JSON.stringify(baseline.contexts[i]),
    );
    for (const id of row.ids) {
      assert.equal(ids.has(id), false, id);
      ids.add(id);
    }
  }
  assert.equal(count, 1526);
  assert.equal(ids.size, count);
});
test("legacy projection is read by the original constructor catalogue without mutating source or titles", async (t) => {
  const p = await fixture(t, { page: "constructor.html" });
  await p.waitForSelector('#builderApp[data-ready="true"]');
  await p.addScriptTag({ path: "lesson-materials/model.js" });
  await p.addScriptTag({ path: "lesson-materials/legacy.js" });
  const result = await p.evaluate(async () => {
    const m = await (
      await fetch("lesson-materials/content/6/math/q1/1.json")
    ).json();
    const previous = window.lessonContent["6_math_1_1"];
    window.lessonContent["6_math_1_1"] = LessonMaterialsLegacy.project(m);
    const bank = LessonCatalog.bank("6", "math", "1", "1"),
      blocks = LessonCatalog.blocks(window.lessonContent["6_math_1_1"]);
    window.lessonContent["6_math_1_1"] = previous;
    return {
      tasks: bank.length,
      pair: bank.filter((t) => t.workKind === "pair").length,
      group: bank.filter((t) => t.workKind === "group").length,
      blocks: blocks.length,
    };
  });
  assert.equal(result.tasks, 15);
  assert.equal(result.pair, 3);
  assert.equal(result.group, 4);
  assert.ok(result.blocks >= 2);
});
for (const width of [320, 390, 768, 1440])
  test(
    "demo and slide dialog are keyboard/touch accessible and fit " + width,
    async (t) => {
      const p = await demo(t, width);
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.locator("#openPresentation").focus();
      await p.keyboard.press("Enter");
      await p.waitForSelector("#presentationDialog[open]");
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.keyboard.press("Escape");
      await p.waitForFunction(
        () => document.activeElement.id === "openPresentation",
      );
      assert.equal(
        await p
          .locator("#openPresentation")
          .evaluate((x) => x === document.activeElement),
        true,
      );
      await p.screenshot({
        path: `/workspace/audit-math-ai/stage8a/demo-${width}.png`,
        fullPage: true,
      });
    },
  );
test("measured transfer and Chromium JS heap stay bounded across repeated lesson switches", async (t) => {
  const p = await demo(t);
  const initialPage = await p.evaluate(() => {
    const entries = [
      ...performance.getEntriesByType("navigation"),
      ...performance.getEntriesByType("resource"),
    ];
    return {
      responseBodyBytes: entries.reduce((n, r) => n + r.encodedBodySize, 0),
      transferBytes: entries.reduce((n, r) => n + r.transferSize, 0),
      entries: entries.length,
    };
  });
  assert.ok(initialPage.responseBodyBytes > 13333);
  assert.ok(initialPage.responseBodyBytes < 2 * 1024 * 1024);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const metric = async () =>
    Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((x) => [
        x.name,
        x.value,
      ]),
    );
  const before = (await metric()).JSHeapUsedSize;
  for (let i = 0; i < 12; i++) {
    await p.locator("#nextLesson").click();
    await p.waitForFunction(
      () => LessonMaterialDemo.currentId() === "ktp1:6:math:1:2",
    );
    await p.locator("#previousLesson").click();
    await ready(p);
  }
  await cdp.send("HeapProfiler.collectGarbage");
  const after = (await metric()).JSHeapUsedSize;
  const resources = await p.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((r) => r.name.endsWith(".json"))
      .map((r) => ({
        url: new URL(r.name).pathname,
        bytes: r.encodedBodySize,
        transfer: r.transferSize,
      })),
  );
  assert.equal(resources.length, 2);
  assert.ok(resources.every((r) => r.bytes > 0));
  const stats = await p.evaluate(() => LessonMaterialDemo.stats());
  assert.ok(stats.cacheBytes <= 524288);
  assert.ok(stats.entries <= 8);
  assert.ok(after - before < 5 * 1024 * 1024);
  assert.ok(resources.reduce((n, r) => n + r.bytes, 0) < 40000);
  fs.writeFileSync(
    "/workspace/audit-math-ai/stage8a/performance.json",
    JSON.stringify(
      {
        browser: "Chromium",
        initialPage,
        heapBeforeBytes: before,
        heapAfterBytes: after,
        heapGrowthBytes: after - before,
        jsonResources: resources,
        loader: stats,
        scope:
          "Local HTTP + mocked auth boundary; JS heap, not total OS/browser memory.",
      },
      null,
      2,
    ),
  );
});
test("the original lesson keeps its nine sections and offers an opt-in link with the exact KTP context", async (t) => {
  const p = await fixture(t, {
    page: "lesson.html?class=6&subject=math&quarter=1&lesson=1",
  });
  const link = p.locator("[data-modular-lesson]");
  await link.waitFor();
  assert.equal(await p.locator(".lesson-page>.block").count(), 9);
  assert.equal(await link.count(), 1);
  const target = new URL(await link.getAttribute("href"), p.url());
  assert.equal(target.pathname, "/lesson-material.html");
  assert.equal(target.search, "?class=6&subject=math&quarter=1&lesson=1");
  await link.click();
  await ready(p);
  assert.match(
    await p.locator("#materialTitle").textContent(),
    /Жай бөлшектерге/,
  );
  assert.equal(
    await p.locator("#legacyMaterial").getAttribute("href"),
    "lesson.html?class=6&subject=math&quarter=1&lesson=1",
  );
});
test("a second tab cannot silently overwrite a newer private homework revision", async (t) => {
  const p = await demo(t);
  await p.locator("#personalHomework").fill("Алғашқы нұсқа");
  await p.locator("#savePersonal").click();
  const second = await p.context().newPage();
  await second.goto(p.url());
  await ready(second);
  await second.locator("#personalHomework").fill("Екінші қойындының нұсқасы");
  await second.locator("#savePersonal").click();
  await p.locator("#personalHomework").fill("Сақталмаған өз мәтінім");
  await p.locator("#savePersonal").click();
  assert.match(
    await p.locator("#personalStatus").textContent(),
    /басқа қойындыда/,
  );
  assert.equal(
    await p.locator("#personalHomework").inputValue(),
    "Сақталмаған өз мәтінім",
  );
  await second.reload();
  await ready(second);
  assert.equal(
    await second.locator("#personalHomework").inputValue(),
    "Екінші қойындының нұсқасы",
  );
  await second.close();
});
test("late content from a cancelled lesson cannot replace the currently opened KTP lesson", async (t) => {
  const p = await fixture(t);
  let startedResolve, release;
  const started = new Promise((r) => (startedResolve = r)),
    gate = new Promise((r) => (release = r));
  await p.route("**/lesson-materials/content/6/math/q1/1.json", async (r) => {
    startedResolve();
    await gate;
    try {
      await r.fulfill({
        contentType: "application/json",
        body: fs.readFileSync(
          "lesson-materials/content/6/math/q1/1.json",
          "utf8",
        ),
      });
    } catch {
      /* A cancelled request has no response consumer. */
    }
  });
  await p.goto(new URL("lesson-material.html", p.url()).href);
  await started;
  await p.evaluate(() => {
    history.pushState(
      null,
      "",
      "lesson-material.html?class=6&subject=math&quarter=1&lesson=2",
    );
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await p.waitForFunction(
    () => LessonMaterialDemo.currentId() === "ktp1:6:math:1:2",
  );
  release();
  await p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  assert.equal(
    await p.evaluate(() => LessonMaterialDemo.currentId()),
    "ktp1:6:math:1:2",
  );
  assert.match(
    await p.locator("#materialTitle").textContent(),
    /Ондық бөлшектер/,
  );
});
test("demo page and its open presentation have no automated WCAG A/AA violations", async (t) => {
  const p = await demo(t);
  const axe =
    process.env.IUSTAZ_AXE_PATH ||
    "/tmp/math-ai-axe/extracted/package/axe.min.js";
  assert.ok(fs.existsSync(axe), "Provide axe-core 4.10.3 via IUSTAZ_AXE_PATH");
  await p.addScriptTag({ path: axe });
  const check = async () => {
    const r = await p.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      }),
    );
    assert.deepEqual(
      r.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
    );
  };
  await check();
  await p.locator("#openPresentation").click();
  await p.waitForSelector("#presentationDialog[open]");
  await check();
});
