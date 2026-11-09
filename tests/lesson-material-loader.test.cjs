const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs");
const { Repository } = require("../lesson-materials/loader.js"),
  M = require("../lesson-materials/model.js");
const base = "https://example.invalid/lesson-materials/",
  ctx = { grade: "6", subject: "math", quarter: "1", number: "1" },
  read = (p) => JSON.parse(fs.readFileSync("lesson-materials/" + p));
function setup(options = {}) {
  const requests = [];
  const fetcher = async (url) => {
    requests.push(url);
    const path = url.slice(base.length);
    try {
      return new Response(JSON.stringify(read(path)), {
        headers: { "content-type": "application/json" },
      });
    } catch {
      return new Response("", { status: 404 });
    }
  };
  return {
    repo: new Repository({ baseURL: base, fetcher, ...options }),
    requests,
  };
}
test("one lesson fetches only its quarter index and one content file; media and slides stay lazy", async () => {
  const { repo, requests } = setup();
  const d = await repo.load(ctx);
  assert.equal(d.material.lessonId, M.id(ctx));
  assert.deepEqual(
    requests.map((x) => x.slice(base.length)),
    ["index/6/math/q1.json", "content/6/math/q1/1.json"],
  );
  assert.equal(repo.stats().entries, 2);
  await repo.load(ctx);
  assert.equal(requests.length, 2);
});
test("one presentation serves both lessons and response clones prevent cache mutation", async () => {
  const { repo, requests } = setup();
  const first = await repo.load(ctx);
  first.material.theory[0].text = "changed";
  assert.notEqual((await repo.load(ctx)).material.theory[0].text, "changed");
  const fifth = await repo.load({ ...ctx, number: "8" });
  const a = await repo.slides(fifth.material.presentation);
  const second = await repo.load({ ...ctx, number: "9" });
  assert.equal(second.available, true);
  assert.ok(second.material.theory.length > 0);
  const b = await repo.slides(second.material.presentation);
  assert.equal(a.id, b.id);
  assert.equal(a.total, 12);
  assert.equal(b.start, 3);
  assert.equal(b.end, 12);
  assert.equal(requests.filter((x) => x.includes("/presentations/")).length, 1);
});
test("missing content entry or quarter is an empty lesson, not fabricated material or a bulk fallback", async () => {
  const { repo, requests } = setup();
  assert.equal((await repo.load({ ...ctx, number: "11" })).available, false);
  assert.equal((await repo.load({ ...ctx, quarter: "2" })).available, false);
  assert.equal(
    requests.some((x) => /lesson-content|database|games.js/.test(x)),
    false,
  );
});
test("bad content retries, bad MIME and mismatched lesson ID fail closed without caching", async () => {
  let count = 0;
  const repo = new Repository({
    baseURL: base,
    fetcher: async (url) => {
      count++;
      return new Response(
        count === 1
          ? "not-json"
          : JSON.stringify(read("content/6/math/q1/1.json")),
        { headers: { "content-type": "application/json" } },
      );
    },
  });
  await assert.rejects(
    repo.read("content/6/math/q1/1.json", {
      validate: (x) => M.material(x, M.id(ctx)),
    }),
  );
  assert.equal(repo.stats().entries, 0);
  await repo.read("content/6/math/q1/1.json", {
    validate: (x) => M.material(x, M.id(ctx)),
  });
  await assert.rejects(
    repo.read("content/6/math/q1/1.json", {
      validate: (x) => M.material(x, M.id({ ...ctx, number: "2" })),
    }),
  );
  assert.equal(repo.stats().entries, 0);
  const bad = new Repository({
    baseURL: base,
    fetcher: async () =>
      new Response("{}", { headers: { "content-type": "text/html" } }),
  });
  await assert.rejects(bad.read("anything.json"), /JSON/);
});
test("timeout and caller abort are explicit and cannot restore stale cached work", async () => {
  const fetcher = (url, { signal }) =>
    new Promise((resolve, reject) =>
      signal.addEventListener("abort", () =>
        reject(new DOMException("abort", "AbortError")),
      ),
    );
  const repo = new Repository({ baseURL: base, fetcher, timeoutMs: 20 });
  await assert.rejects(repo.read("x.json"), /уақыты/);
  const c = new AbortController();
  const task = repo.read("x.json", { signal: c.signal });
  c.abort();
  await assert.rejects(task, { name: "AbortError" });
  assert.equal(repo.stats().entries, 0);
});
test("cache entries and bytes are bounded; oversized streamed JSON and unsafe paths are rejected", async () => {
  const repo = new Repository({
    baseURL: base,
    maxEntries: 2,
    maxCacheBytes: 1024,
    maxDocumentBytes: 128,
    fetcher: async () =>
      new Response(JSON.stringify({ text: "a".repeat(40) }), {
        headers: { "content-type": "application/json" },
      }),
  });
  for (let i = 0; i < 8; i++) await repo.read("x" + i + ".json");
  assert.equal(repo.stats().entries, 2);
  assert.ok(repo.stats().cacheBytes <= 1024);
  for (const p of [
    "https://evil.invalid/x.json",
    "../x.json",
    "content/%2e%2e/%2e%2e/x.json",
    "content/%2f..%2fx.json",
    "x.json?leak=1",
    "x.js",
  ])
    assert.throws(() => repo.url(p));
  const huge = new Repository({
    baseURL: base,
    maxDocumentBytes: 128,
    fetcher: async () =>
      new Response('"' + "a".repeat(200) + '"', {
        headers: { "content-type": "application/json" },
      }),
  });
  await assert.rejects(huge.read("large.json"), /көлемі/);
  assert.equal(huge.stats().entries, 0);
});
