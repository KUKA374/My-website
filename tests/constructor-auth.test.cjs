const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const source = fs.readFileSync(
  require.resolve("../constructor-auth.js"),
  "utf8",
);
async function boot(get) {
  let listener;
  const ready = [],
    blocked = [],
    window = {
      getCurrentUser: () => ({ uid: "forged", role: "super_admin" }),
      ensureFirebase: async () => ({
        auth: () => ({ onAuthStateChanged: (fn) => (listener = fn) }),
        firestore: () => ({
          collection: () => ({ doc: (uid) => ({ get: () => get(uid) }) }),
        }),
      }),
    };
  vm.runInNewContext(source, { window });
  await window.ConstructorAuth.watch(
    (u) => ready.push(u),
    (m) => blocked.push(m),
  );
  return { ready, blocked, notify: (u) => listener(u) };
}
for (const role of ["teacher", "admin", "super_admin"])
  test("F auth: verified role " + role, async () => {
    const f = await boot(async () => ({
      exists: true,
      data: () => ({ role }),
    }));
    await f.notify({ uid: "real" });
    assert.equal(f.ready[0].uid, "real");
    assert.equal(f.ready[0].role, role);
  });
test("F auth: cached role cannot bypass absent/invalid profiles or signed-out state", async () => {
  for (const profile of [
    { exists: false },
    { exists: true, data: () => ({ role: "student" }) },
  ]) {
    const f = await boot(async () => profile);
    await f.notify({ uid: "real" });
    assert.equal(f.ready.length, 0);
    assert.ok(f.blocked.length);
  }
  const f = await boot(async () => {
    throw Error("offline");
  });
  await f.notify(null);
  await f.notify({ uid: "real" });
  assert.equal(f.ready.length, 0);
});
test("F auth: late profile response cannot reopen a previous user library", async () => {
  let finishA;
  const a = new Promise((r) => (finishA = r)),
    f = await boot((uid) =>
      uid === "a"
        ? a
        : Promise.resolve({ exists: true, data: () => ({ role: "teacher" }) }),
    );
  const pending = f.notify({ uid: "a" });
  await f.notify({ uid: "b" });
  finishA({ exists: true, data: () => ({ role: "admin" }) });
  await pending;
  assert.deepEqual(
    f.ready.map((x) => x.uid),
    ["b"],
  );
});
