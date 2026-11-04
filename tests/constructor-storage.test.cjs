const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  M = require("../constructor-model.js"),
  S = require("../constructor-storage.js");
function memory() {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) || null,
    setItem: (k, v) => m.set(k, v),
    raw: m,
  };
}
test("E: local library persists, opens, copies, renames and deletes without affecting other owner", () => {
  const m = memory(),
    a = new S.Repository(m, "a"),
    b = new S.Repository(m, "b"),
    x = M.create("a");
  x.title = "Бөлшектер";
  a.save(x);
  const copy = M.copy(x);
  a.save(copy);
  assert.equal(new S.Repository(m, "a").list().length, 2);
  assert.equal(b.list().length, 0);
  const renamed = a.get(x.id);
  renamed.title = "Жаңа атау";
  a.save(renamed);
  assert.equal(a.get(x.id).title, "Жаңа атау");
  a.remove(copy.id);
  assert.equal(a.list().length, 1);
  assert.throws(() => b.save(x));
  assert.equal(a.select(x.id).id, x.id);
});
test("E: corrupt or future data is rejected without overwriting its raw storage", () => {
  for (const change of [
    (e) => (e.schemaVersion = 99),
    (e) => (e.ownerId = "other"),
    (e) => (e.items[0].id = '\"><img src=x>'),
    (e) => (e.items[0].stages[0].minutes = "3"),
  ]) {
    const m = memory(),
      r = new S.Repository(m, "a");
    r.save(M.create("a"));
    const e = JSON.parse(m.getItem(r.key));
    change(e);
    m.setItem(r.key, JSON.stringify(e));
    const old = m.getItem(r.key);
    assert.throws(() => new S.Repository(m, "a"));
    assert.equal(m.getItem(r.key), old);
  }
});
test("E: failed quota write keeps prior data; concurrent tabs cannot silently overwrite", () => {
  const m = memory(),
    a = new S.Repository(m, "a"),
    b = new S.Repository(m, "a");
  const x = M.create("a");
  a.save(x);
  assert.throws(() => b.save(M.create("a")), /қойынды/);
  b.reload();
  b.save(M.copy(x));
  assert.equal(b.list().length, 2);
  const before = m.getItem(b.key);
  m.setItem = () => {
    throw Error("quota");
  };
  assert.throws(() => b.save(M.create("a")), /Сақтау/);
  assert.equal(m.getItem(b.key), before);
});
test("E: explicit legacy import preserves original content, hides ambiguous answers in teacher notes", () => {
  const raw = JSON.stringify({
    lessonTitle: "Ескі",
    lessonGrade: "6-сынып",
    lessonSubject: "Математика",
    lessonQuarter: "1-тоқсан",
    lessonExplain: "<script>test</script>",
    lessonPair: "1 + 1 = 2",
    lessonHomework: "x=5",
    lessonDuration: "40",
  });
  const x = S.legacy(raw, "a");
  assert.equal(x.title, "Ескі");
  assert.equal(x.duration, 40);
  assert.equal(x.blocks[0].body, "<script>test</script>");
  assert.match(x.teacherNotes, /1 \+ 1 = 2/);
  assert.equal(x.stages[3].tasks.length, 0);
  assert.equal(x.reviewed, false);
  assert.throws(() => S.legacy("{bad", "a"));
});
