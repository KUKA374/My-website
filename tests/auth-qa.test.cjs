// Run the real auth module; only Firebase/network and browser storage are controlled.
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const source = fs.readFileSync(require.resolve("../auth.js"), "utf8");
function fixture({
  role = "teacher",
  user = { uid: "qa", email: "qa@example.invalid" },
  exists = true,
  lookupError = false,
  sdkError = false,
} = {}) {
  const store = new Map([
      [
        "mathTeacherUser",
        JSON.stringify({ uid: "forged", role: "super_admin" }),
      ],
    ]),
    links = [{ style: {} }];
  let listener,
    signouts = 0,
    reads = 0;
  const auth = {
    onAuthStateChanged(fn) {
      listener = fn;
    },
    async signOut() {
      signouts++;
    },
  };
  const db = {
    collection(name) {
      assert.equal(name, "users");
      return {
        doc(uid) {
          assert.equal(uid, "qa");
          return {
            async get() {
              reads++;
              if (lookupError) throw Error("offline");
              return { exists, data: () => ({ role, name: "Тест" }) };
            },
          };
        },
      };
    },
  };
  const ctx = {
    console: { error() {} },
    window: { location: { pathname: "/games.html", href: "games.html" } },
    sessionStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
    document: { querySelectorAll: () => links, getElementById: () => null },
    FIREBASE_CONFIG: {},
    firebase: { apps: [{}], auth: () => auth, firestore: () => db },
  };
  if (sdkError) {
    ctx.firebase = undefined;
    ctx.document.querySelector = () => null;
    ctx.document.createElement = () => ({});
    ctx.document.head = { appendChild: (s) => s.onerror(Error("blocked")) };
  }
  vm.runInNewContext(source, ctx, { filename: "auth.js" });
  return {
    ctx,
    store,
    links,
    get signouts() {
      return signouts;
    },
    get reads() {
      return reads;
    },
    async verify(allowed = ["teacher", "admin", "super_admin"]) {
      const initial = ctx.window.requireRole(allowed);
      await new Promise((r) => setImmediate(r));
      if (listener) await listener(user);
      await new Promise((r) => setImmediate(r));
      return initial;
    },
  };
}
for (const role of ["teacher", "admin", "super_admin"])
  test(`auth: Firebase profile ${role} replaces forged local role`, async () => {
    const f = fixture({ role });
    await f.verify();
    assert.equal(f.ctx.window.location.href, "games.html");
    assert.equal(JSON.parse(f.store.get("mathTeacherUser")).role, role);
    assert.equal(f.reads, 1);
    assert.equal(f.signouts, 0);
    assert.equal(f.links[0].style.display, role === "teacher" ? "none" : "");
  });
test("auth: forged super-admin session cannot pass a server teacher role gate", async () => {
  const f = fixture();
  await f.verify(["super_admin"]);
  assert.equal(f.ctx.window.location.href, "index.html");
  assert.equal(JSON.parse(f.store.get("mathTeacherUser")).role, "teacher");
});
for (const state of [
  { role: "student" },
  { exists: false },
  { lookupError: true },
])
  test(`auth: invalid or unavailable profile fails closed ${JSON.stringify(state)}`, async () => {
    const f = fixture(state);
    await f.verify();
    assert.equal(f.ctx.window.location.href, "login.html");
    assert.equal(f.store.has("mathTeacherUser"), false);
    assert.equal(f.signouts, 1);
  });
test("auth: absent Firebase user discards a forged browser session", async () => {
  const f = fixture({ user: null });
  await f.verify();
  assert.equal(f.ctx.window.location.href, "login.html");
  assert.equal(f.reads, 0);
  assert.equal(f.store.size, 0);
});
test("auth: SDK loading failure clears the role cache and redirects", async () => {
  const f = fixture({ sdkError: true });
  await f.verify();
  assert.equal(f.ctx.window.location.href, "login.html");
  assert.equal(f.store.size, 0);
});
