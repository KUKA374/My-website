const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { randomUUID, createHash } = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const { context, ROOT } = require("../server/ai-lessons/catalog.cjs"),
  C = require("../server/ai-lessons/content.cjs"),
  P = require("../server/ai-lessons/provider.cjs"),
  { Store, dataPath } = require("../server/ai-lessons/store.cjs"),
  { app } = require("../server/ai-lessons/app.cjs"),
  { firebaseVerifier } = require("../server/ai-lessons/auth.cjs"),
  { Fault } = require("../server/ai-lessons/errors.cjs");
const fixture = require("../server/ai-lessons/fixtures/quadratic-response.json"),
  copy = () => structuredClone(fixture),
  usage = {
    promptTokenCount: 100,
    candidatesTokenCount: 200,
    totalTokenCount: 350,
    thoughtsTokenCount: 50,
  },
  reply = () => ({ content: copy(), usage });
async function setup(
  t,
  { generate = async () => reply(), verify, storeOptions } = {},
) {
  const store = new Store(":memory:", storeOptions);
  verify ??= async (header) => {
    if (header === "Bearer admin-a") return { uid: "a", role: "admin" };
    if (header === "Bearer admin-b") return { uid: "b", role: "super_admin" };
    if (header === "Bearer teacher") return { uid: "t", role: "teacher" };
    throw new Fault(401, "AUTH_REQUIRED", "Кіру қажет.");
  };
  const server = app({
    store,
    generate,
    verify,
    source: "gemini",
    model: "gemini-test-model",
    origin: "http://localhost.test",
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(
    () =>
      new Promise((r) =>
        server.close(() => {
          store.close();
          r();
        }),
      ),
  );
  async function req(url, options = {}, token = "admin-a") {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}` + url,
      {
        ...options,
        headers: {
          ...(token ? { authorization: "Bearer " + token } : {}),
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...options.headers,
        },
      },
    );
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
  const post = (
    payload = { lessonId: context().id, requestId: randomUUID() },
    token = "admin-a",
  ) =>
    req(
      "/api/ai-lessons/drafts",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
  return { store, req, post };
}
const generated = (data) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(data) }] },
        },
      ],
      usageMetadata: usage,
    }),
    { headers: { "content-type": "application/json" } },
  );
test("canonical KTP picks grade 8 algebra Q2 lesson 3, preserving exact title, objective and source hash", () => {
  const c = context();
  assert.equal(c.id, "ktp1:8:algebra:2:3");
  assert.equal(c.lesson.title, "Квадрат теңдеулерді шешу");
  assert.equal(c.lesson.objective, "8.2.2.3квадрат теңдеулерді шешу;");
  assert.equal(
    c.sourceSha256,
    createHash("sha256").update(fs.readFileSync(c.source)).digest("hex"),
  );
  assert.equal(c.lesson.number, 3);
});
test("fixture covers full 45-minute model, 4 examples, 15 assessed tasks, QMJ and exactly 12 slides with explicit review", () => {
  const d = C.validate(copy(), context());
  assert.equal(
    d.material.lessonPlan.reduce((s, p) => s + p.minutes, 0),
    45,
  );
  assert.equal(d.presentation.slides.length, 12);
  assert.equal(d.material.examples.length, 4);
  assert.equal(d.material.pairWork.length, 3);
  assert.equal(d.material.groupWork.length, 4);
  for (const l of "ABC") assert.equal(d.material.individualWork[l].length, 2);
  assert.equal(d.material.homework.length, 2);
  assert.equal(d.review.mathematics, "not-automatically-certified");
  assert.equal(d.review.publication, "disabled");
  assert.equal(d.material.reviewRequired, true);
  assert.equal(d.material.video, null);
});
test("independent rational arithmetic verifies all 19 fixture answers and discriminant cases", () => {
  const r = spawnSync(
    "python",
    [
      "-B",
      "-c",
      `import json
from fractions import Fraction as F
rows=json.load(open('tests/fixtures/ai-quadratic-math.json'));assert len(rows)==19
for r in rows:
 a,b,c=r['a'],r['b'],r['c'];D=b*b-4*a*c;assert a!=0 and D==r['discriminant']
 roots=list(map(F,r['roots']));assert len(roots)==(0 if D<0 else 1 if D==0 else 2)
 for x in roots:assert a*x*x+b*x+c==0
 if len(roots)==2:assert roots[0]+roots[1]==F(-b,a) and roots[0]*roots[1]==F(c,a)
`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  const proof = require("./fixtures/ai-quadratic-math.json"),
    items = [
      ...fixture.examples,
      ...fixture.pairWork,
      ...fixture.groupWork.map((g) => g.task),
      ...Object.values(fixture.individualWork).flat(),
      ...fixture.homework,
    ];
  for (const p of proof)
    assert.equal(items.find((i) => i.id === p.id).answer, p.answer);
});
test("invalid/partial content, altered metadata, duplicate tasks and incorrect minute/slide counts fail closed", () => {
  for (const mutate of [
    (x) => (x.lessonId = "other"),
    (x) => (x.theory = []),
    (x) => x.examples.splice(1),
    (x) => x.lessonPlan[0].minutes++,
    (x) => x.pairWork.pop(),
    (x) => x.slides.pop(),
    (x) => (x.groupWork[1].task.id = x.pairWork[0].id),
    (x) => (x.homework[0].prompt = x.pairWork[0].prompt),
    (x) => (x.pairWork[0].descriptors = []),
  ]) {
    const d = copy();
    mutate(d);
    assert.throws(() => C.validate(d, context()));
  }
});
test("provider uses fixed official endpoint and server header, structured JSON, one candidate, no tools or key in body/URL", async () => {
  let calls = 0;
  const secret = "test-only-placeholder-key";
  const send = P.gemini({
    key: secret,
    model: "gemini-test",
    fetcher: async (url, opts) => {
      calls++;
      assert.equal(url, P.ENDPOINT + "gemini-test:generateContent");
      assert.equal(opts.headers["x-goog-api-key"], secret);
      assert.equal(opts.redirect, "error");
      assert.ok(!url.includes(secret));
      const b = JSON.parse(opts.body);
      assert.equal(b.generationConfig.responseMimeType, "application/json");
      assert.equal(b.generationConfig.candidateCount, 1);
      assert.ok(b.generationConfig.responseSchema);
      assert.ok(!opts.body.includes(secret));
      assert.equal(b.tools, undefined);
      assert.match(b.contents[0].parts[0].text, /8\.2\.2\.3/);
      return generated(copy());
    },
  });
  const result = await send(context());
  assert.equal(calls, 1);
  assert.deepEqual(result.usage, usage);
  C.validate(result.content, context());
});
test("provider errors never expose upstream bodies or keys and are never retried automatically", async () => {
  let calls = 0;
  const send = P.gemini({
    key: "test-only-placeholder-key",
    model: "gemini-test",
    fetcher: async () => {
      calls++;
      return new Response("provider echoes test-only-placeholder-key", {
        status: 400,
      });
    },
  });
  await assert.rejects(
    () => send(context()),
    (e) =>
      e.code === "PROVIDER_UNAVAILABLE" && !e.message.includes("placeholder"),
  );
  assert.equal(calls, 1);
});
test("truncated, blocked, non-JSON, oversized and network responses never become saved lessons; known usage remains available", async () => {
  for (const candidate of [
    { finishReason: "MAX_TOKENS" },
    { finishReason: "SAFETY" },
  ]) {
    const send = P.gemini({
      key: "test-only-placeholder-key",
      model: "gemini-test",
      fetcher: async () =>
        new Response(
          JSON.stringify({ candidates: [candidate], usageMetadata: usage }),
        ),
    });
    await assert.rejects(
      () => send(context()),
      (e) =>
        e.code === "PROVIDER_INCOMPLETE" && e.usage.totalTokenCount === 350,
    );
  }
  for (const response of [
    new Response("bad json"),
    new Response("x".repeat(1024 * 1024 + 1)),
  ]) {
    const send = P.gemini({
      key: "test-only-placeholder-key",
      model: "gemini-test",
      fetcher: async () => response,
    });
    await assert.rejects(() => send(context()));
  }
  const send = P.gemini({
    key: "test-only-placeholder-key",
    model: "gemini-test",
    fetcher: async () => {
      throw Error("secret network detail");
    },
  });
  await assert.rejects(
    () => send(context()),
    (e) => e.code === "PROVIDER_NETWORK" && !e.message.includes("secret"),
  );
});
test("missing key/model, endpoint injection and invalid usage counters are rejected without provider access", () => {
  for (const input of [
    {},
    { key: "test-only-placeholder-key", model: "../evil" },
    { key: "test-only-placeholder-key", model: "gemini-test/other" },
  ])
    assert.throws(() => P.gemini(input));
  assert.equal(P.usage({ totalTokenCount: -1 }), null);
  assert.equal(P.usage({ promptTokenCount: 5 }), null);
  assert.deepEqual(
    P.usage({
      totalTokenCount: 20,
      promptTokenCount: NaN,
      candidatesTokenCount: 5,
    }),
    { totalTokenCount: 20, candidatesTokenCount: 5 },
  );
});
test("Firebase verifier checks revocation and users/{decoded UID}.role on every request, not browser roles", async () => {
  let checks = 0,
    reads = 0,
    role = "admin";
  const verify = firebaseVerifier({
    auth: {
      verifyIdToken: async (token, revoked) => {
        assert.equal(token, "valid-token-123");
        assert.equal(revoked, true);
        checks++;
        return { uid: "trusted-user" };
      },
    },
    db: {
      collection: (name) => {
        assert.equal(name, "users");
        return {
          doc: (id) => {
            assert.equal(id, "trusted-user");
            return {
              get: async () => {
                reads++;
                return { exists: true, data: () => ({ role }) };
              },
            };
          },
        };
      },
    },
  });
  assert.equal((await verify("Bearer valid-token-123")).role, "admin");
  role = "teacher";
  await assert.rejects(
    () => verify("Bearer valid-token-123"),
    (e) => e.status === 403,
  );
  assert.equal(checks, 2);
  assert.equal(reads, 2);
  await assert.rejects(
    () => verify(""),
    (e) => e.status === 401,
  );
});
test("unverifiable/deleted Firebase users and SDK failures fail closed without exposing SDK details", async () => {
  const verify = firebaseVerifier({
    auth: {
      verifyIdToken: async () => {
        throw Error("credential value");
      },
    },
    db: {},
  });
  await assert.rejects(
    () => verify("Bearer valid-token-123"),
    (e) => e.status === 401 && !e.message.includes("credential"),
  );
  const absent = firebaseVerifier({
    auth: { verifyIdToken: async () => ({ uid: "u" }) },
    db: {
      collection: () => ({
        doc: () => ({ get: async () => ({ exists: false }) }),
      }),
    },
  });
  await assert.rejects(
    () => absent("Bearer valid-token-123"),
    (e) => e.status === 403,
  );
});
test("API rejects guests and teachers; storage has no public data or publishing route", async (t) => {
  const { req } = await setup(t);
  for (const token of ["", "teacher"]) {
    const r = await req("/api/ai-lessons/drafts", {}, token);
    assert.equal(r.status, token ? 403 : 401);
  }
  assert.equal(
    (await req("/api/ai-lessons/publish", { method: "POST" })).status,
    404,
  );
});
test("complete draft is admin/owner-only, immutable KTP-bound and saved only in private SQL; stats show real supplied usage", async (t) => {
  const { post, req } = await setup(t),
    r = await post();
  assert.equal(r.status, 201);
  const d = r.data.draft;
  assert.equal(d.status, "draft");
  assert.equal(d.catalog.id, context().id);
  assert.equal(d.presentation.slides.length, 12);
  assert.equal((await req("/api/ai-lessons/drafts/" + d.id)).status, 200);
  assert.equal(
    (await req("/api/ai-lessons/drafts/" + d.id, {}, "admin-b")).status,
    404,
  );
  assert.equal(
    (await req("/api/ai-lessons/drafts", {}, "admin-b")).data.drafts.length,
    0,
  );
  const stats = (await req("/api/ai-lessons/stats")).data;
  assert.equal(stats.requests, 1);
  assert.equal(stats.completed, 1);
  assert.equal(stats.totalTokens, 350);
  assert.equal(stats.thoughtTokens, 50);
  assert.equal(stats.usageUnknown, 0);
});
test("concurrent double-submit calls provider once; retry of the completed request replays without extra billing", async (t) => {
  let release,
    calls = 0;
  const wait = new Promise((r) => (release = r));
  const { post, req } = await setup(t, {
    generate: async () => {
      calls++;
      await wait;
      return reply();
    },
  });
  const data = { lessonId: context().id, requestId: randomUUID() };
  const first = post(data);
  for (let i = 0; i < 100 && !calls; i++)
    await new Promise((r) => setTimeout(r, 2));
  assert.equal(calls, 1);
  assert.equal((await post(data)).status, 409);
  release();
  const done = await first;
  assert.equal(done.status, 201);
  const replay = await post(data);
  assert.equal(replay.status, 200);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.draft.id, done.data.draft.id);
  assert.equal(calls, 1);
  assert.equal((await req("/api/ai-lessons/stats")).data.requests, 1);
});
test("request caps count failures and separate IDs; invalid requests never reserve provider budget", async (t) => {
  let calls = 0;
  const { post, store } = await setup(t, {
    generate: async () => {
      calls++;
      throw new Fault(502, "PROVIDER_NETWORK", "Желі жоқ.");
    },
    storeOptions: { daily: 1, globalDaily: 2 },
  });
  assert.equal(
    (
      await post({
        lessonId: context().id,
        requestId: randomUUID(),
        prompt: "override",
      })
    ).status,
    400,
  );
  assert.equal(calls, 0);
  assert.equal((await post()).status, 502);
  assert.equal((await post()).status, 429);
  assert.equal(calls, 1);
  assert.equal(store.stats("a").failed, 1);
  assert.equal(store.stats("a").usageUnknown, 1);
});
test("role revoked during generation discards content but still records known token usage", async (t) => {
  let checks = 0;
  const verify = async () => {
    if (++checks === 1) return { uid: "a", role: "admin" };
    throw new Fault(403, "ADMIN_REQUIRED", "Рөл өзгерді.");
  };
  const { post, store } = await setup(t, { verify });
  assert.equal((await post()).status, 403);
  assert.equal(store.list("a").length, 0);
  assert.equal(store.stats("a").failed, 1);
  assert.equal(store.stats("a").totalTokens, 350);
});
test("disabled generation makes no provider request; malformed generated content is not stored", async (t) => {
  const off = await setup(t, { generate: null });
  assert.equal((await off.post()).status, 503);
  assert.equal(off.store.stats("a").requests, 0);
  const bad = await setup(t, {
    generate: async () => ({ content: { bad: true }, usage }),
  });
  assert.equal((await bad.post()).status, 502);
  assert.equal(bad.store.list("a").length, 0);
  assert.equal(bad.store.stats("a").totalTokens, 350);
});
test("API enforces exact origin, JSON media type, 4 KiB body bound, canonical lesson and safe same-origin paths", async (t) => {
  const { post, req } = await setup(t);
  assert.equal(
    (
      await req("/api/ai-lessons/context", {
        headers: { origin: "https://attacker.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await req("/api/ai-lessons/drafts", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "{}",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await req("/api/ai-lessons/drafts", {
        method: "POST",
        body: "x".repeat(4097),
      })
    ).status,
    413,
  );
  assert.equal(
    (await post({ lessonId: "ktp1:8:algebra:2:7", requestId: randomUUID() }))
      .status,
    400,
  );
  for (const url of [
    "/server/ai-lessons/.env",
    "/server/ai-lessons/package.json",
    "/tests/fixtures/ai-quadratic-math.json",
    "/.git/config",
  ])
    assert.equal((await req(url)).status, 404);
});
test("private SQLite is persistent, rejects a public data directory and marks interrupted old requests without retrying", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "iustaz-ai-unit-"));
  try {
    const filename = dataPath(tmp, ROOT);
    assert.throws(() =>
      dataPath(path.join(ROOT, "server", "ai-lessons"), ROOT),
    );
    let now = 1000000;
    const s = new Store(filename, { now: () => now });
    const key = randomUUID(),
      ticket = s.reserve("a", key, "gemini", "gemini-test");
    s.close();
    now += 130000;
    const restored = new Store(filename, { now: () => now });
    assert.equal(restored.stats("a").failed, 1);
    assert.equal(restored.stats("a").usageUnknown, 1);
    assert.throws(
      () => restored.reserve("a", key, "gemini", "gemini-test"),
      (e) => e.status === 409,
    );
    assert.equal(restored.get("b", ticket.id), null);
    restored.close();
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
test("existing KTP, Auth, Firebase rules, constructor, games and lesson content remain unchanged", () => {
  const { execFileSync } = require("node:child_process");
  const names = execFileSync("git", ["diff", "--name-only", "94085c9"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.ok(
    names.every(
      (n) =>
        n === "admin.html" ||
        n.startsWith("server/ai-lessons/") ||
        n.startsWith("ai-lesson-admin.") ||
        n.startsWith("tests/ai-") ||
        n === "tests/run-ai-lesson-qa.py" ||
        n.startsWith("tests/fixtures/ai-") ||
        n.startsWith("docs/gemini-ai/"),
    ),
    names.join("\n"),
  );
  for (const f of [
    "firestore.rules",
    "auth.js",
    "firebase-config.js",
    "ktp-8-algebra-q2.js",
    "constructor-app.js",
    "games.js",
    "lesson-materials/qmj.js",
  ])
    assert.deepEqual(
      fs.readFileSync(f),
      execFileSync("git", ["show", "94085c9:" + f]),
    );
});
test("Firestore REST role reader sends ADC access token only to the fixed endpoint and requests only the role field", async () => {
  const { roleDatabase } = require("../server/ai-lessons/roles.cjs");
  let calls = 0;
  const db = roleDatabase({
    projectId: "demo-iustaz-ai",
    credential: {
      getAccessToken: async () => ({ access_token: "test-adc-placeholder" }),
    },
    fetcher: async (url, o) => {
      calls++;
      assert.equal(
        url,
        "https://firestore.googleapis.com/v1/projects/demo-iustaz-ai/databases/(default)/documents/users/a%2Fb?mask.fieldPaths=role",
      );
      assert.equal(o.headers.authorization, "Bearer test-adc-placeholder");
      return new Response(
        JSON.stringify({
          fields: {
            role: { stringValue: "admin" },
            private: { stringValue: "never returned" },
          },
        }),
      );
    },
  });
  const snap = await db.collection("users").doc("a/b").get();
  assert.deepEqual(snap.data(), { role: "admin" });
  assert.equal(calls, 1);
  assert.throws(() => db.collection("lessonMaterials"));
});
test("missing/error Firestore role reads never grant access and cannot redirect ADC tokens", async () => {
  const { roleDatabase } = require("../server/ai-lessons/roles.cjs");
  assert.throws(() => roleDatabase({ projectId: "../attacker" }));
  for (const status of [404, 403]) {
    const db = roleDatabase({
      projectId: "demo-iustaz-ai",
      credential: {
        getAccessToken: async () => ({ access_token: "test-adc-placeholder" }),
      },
      fetcher: async () => new Response("", { status }),
    });
    if (status === 404)
      assert.equal((await db.collection("users").doc("u").get()).exists, false);
    else await assert.rejects(() => db.collection("users").doc("u").get());
  }
});
test("production entry refuses missing settings and emulator tokens; fixture-only demo refuses production mode", async () => {
  const { start } = require("../server/ai-lessons/index.cjs");
  await assert.rejects(() => start({}), /FIREBASE_PROJECT_ID/);
  await assert.rejects(
    () =>
      start({
        FIREBASE_PROJECT_ID: "demo-iustaz-ai",
        AI_GENERATION_MODE: "gemini",
      }),
    (e) => e.code === "CONFIG_MISSING",
  );
  await assert.rejects(
    () =>
      start({
        FIREBASE_PROJECT_ID: "demo-iustaz-ai",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    /emulator/,
  );
  const r = spawnSync("node", ["server/ai-lessons/demo.cjs"], {
    env: { ...process.env, NODE_ENV: "production" },
    encoding: "utf8",
  });
  assert.notEqual(r.status, 0);
  assert.ok(!r.stdout.includes("http://"));
});
test("unauthenticated availability discloses only protocol identity and no project, secret, statistics or draft", async (t) => {
  const { req } = await setup(t);
  const r = await req("/api/ai-lessons/availability", {}, "");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { service: "iustaz-ai-lesson-lab", version: 1 });
  assert.equal((await req("/api/ai-lessons/context", {}, "")).status, 401);
});
