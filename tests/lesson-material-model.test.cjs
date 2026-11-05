const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs");
const M = require("../lesson-materials/model.js"),
  { LocalHomework } = require("../lesson-materials/private.js");
const demo = JSON.parse(
  fs.readFileSync("lesson-materials/content/6/math/q1/1.json"),
);
const slides = JSON.parse(
  fs.readFileSync("lesson-materials/presentations/fractions-review-v1.json"),
);
test("KTP identity is deterministic, preserves raw number, supports directions and round trips", () => {
  for (const subject of ["math", "algebra", "algebra_ЖМБ", "geometry_ҚГБ"])
    for (const grade of ["5", "6", "10", "11"]) {
      const c = { grade, subject, quarter: "1", number: "01" };
      assert.deepEqual(M.parseId(M.id(c)), c);
      assert.notEqual(M.id(c), M.id({ ...c, number: "1" }));
    }
  assert.throws(() => M.parseId("ktp1:6:math:01:1"));
  assert.throws(() => M.parseId("ktp1:6:math:1:%31"));
  assert.notEqual(
    M.id({ grade: 6, subject: "math", quarter: 1, number: 1 }),
    M.id({ grade: 6, subject: "math", quarter: 2, number: 1 }),
  );
});
test("empty content is valid and never fabricates a theory, video or tasks", () => {
  const d = M.empty(demo.lessonId);
  assert.deepEqual(M.material(d, d.lessonId), d);
  assert.equal(d.video, null);
  assert.equal(d.theory.length, 0);
  assert.equal(d.pairWork.length, 0);
});
test("demo has 45 minutes, three pairs, four groups, ABC and all model sections", () => {
  const d = M.material(demo, demo.lessonId);
  assert.equal(
    d.lessonPlan.reduce((n, p) => n + p.minutes, 0),
    45,
  );
  assert.equal(d.pairWork.length, 3);
  assert.equal(d.groupWork.length, 4);
  assert.deepEqual(Object.keys(d.individualWork), ["A", "B", "C"]);
  assert.equal(d.reviewRequired, true);
});
test("invalid schemas, unknown KTP authoring fields, IDs, video, bounds and duplicate task IDs fail closed", () => {
  for (const edit of [
    (x) => (x.schemaVersion = 2),
    (x) => (x.title = "Өзгертілген КТП"),
    (x) => (x.lessonId = "ktp1:6:math:1:2"),
    (x) => x.pairWork.pop(),
    (x) => (x.pairWork[1].id = x.pairWork[0].id),
    (x) => (x.lessonPlan[0].minutes = 4),
    (x) => (x.presentation.endSlide = 16),
    (x) =>
      (x.video = {
        provider: "youtube",
        id: "javascript:",
        title: "x",
        publication: "published",
      }),
  ]) {
    const x = M.clone(demo);
    edit(x);
    assert.throws(() => M.material(x, demo.lessonId));
  }
});
test("one 12-slide block can be used by two lessons with distinct ranges", () => {
  const p = M.presentation(slides, slides.id);
  assert.equal(p.slides.length, 12);
  const index = JSON.parse(
    fs.readFileSync("lesson-materials/index/6/math/q1.json"),
  );
  assert.equal(
    index.lessons[4].presentation.id,
    index.lessons[5].presentation.id,
  );
  assert.notEqual(index.lessons[4].lessonId, index.lessons[5].lessonId);
  assert.equal(index.lessons[5].content, null);
});
test("personal homework is bound to UID and lesson and never changes constructor storage", () => {
  const data = new Map([["math-ai-lessons-v2:alice", "existing"]]);
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
  const a = new LocalHomework(storage, "alice"),
    b = new LocalHomework(storage, "bob");
  a.save(demo.lessonId, { homeworkText: "Алия тапсырмасы", notes: "жеке" }, 0);
  assert.equal(b.read(demo.lessonId).homeworkText, "");
  assert.equal(a.read("ktp1:6:math:1:2").homeworkText, "");
  assert.equal(data.get("math-ai-lessons-v2:alice"), "existing");
  assert.throws(() =>
    a.save(demo.lessonId, { homeworkText: "overwrite", notes: "" }, 0),
  );
  data.set(b.key(demo.lessonId), JSON.stringify(a.read(demo.lessonId)));
  assert.throws(() => b.read(demo.lessonId));
});
test("all protected KTP, existing materials, games, constructor, auth and rules stay byte-identical", () => {
  const crypto = require("crypto"),
    baseline = require("./fixtures/stage8a-preserved.json");
  for (const [file, hash] of Object.entries(baseline.files))
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      hash,
      file,
    );
});
test("legacy projection keeps current content field names, exact tasks and escapes authored text", () => {
  const { project } = require("../lesson-materials/legacy.js");
  const x = M.clone(demo);
  x.theory[0].text = "<img src=x onerror=alert(1)>";
  const out = project(x);
  assert.match(out.theory, /&lt;img/);
  assert.doesNotMatch(out.theory, /<img/);
  assert.equal(out.lessonPlan.length, 8);
  assert.equal((out.pairWork.match(/<li>/g) || []).length, 3);
  assert.equal((out.groupWork.match(/<li>/g) || []).length, 4);
  assert.equal((out.individualWork.match(/<li>/g) || []).length, 6);
  assert.equal("ownerId" in out, false);
  assert.equal("personalHomework" in out, false);
});
test("demo arithmetic is independently verified with reduced rational calculations", () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a)),
    f = (a, b = 1) => {
      const d = gcd(a, b);
      return [a / d, b / d];
    },
    add = (a, b) => f(a[0] * b[1] + b[0] * a[1], a[1] * b[1]),
    sub = (a, b) => f(a[0] * b[1] - b[0] * a[1], a[1] * b[1]),
    mul = (a, b) => f(a[0] * b[0], a[1] * b[1]),
    div = (a, b) => mul(a, [b[1], b[0]]),
    str = (a) => (a[1] === 1 ? String(a[0]) : a.join("/"));
  const all = [
    ...demo.pairWork,
    ...demo.groupWork.map((g) => g.task),
    ...Object.values(demo.individualWork).flat(),
    ...demo.homework,
  ];
  for (const [id, value] of [
    ["pair-1", add(f(1, 2), f(1, 4))],
    ["pair-2", sub(f(3, 4), f(1, 6))],
    ["pair-3", div(f(2, 3), f(4, 5))],
    ["group-task-1", add(f(1, 3), f(1, 6))],
    ["group-task-3", mul(f(2, 5), f(3, 4))],
    ["group-task-4", div(add(f(1, 2), f(1, 3)), f(5, 6))],
    ["a1", add(f(1, 4), f(1, 4))],
    ["a2", sub(f(3, 5), f(1, 5))],
    ["b1", sub(f(5, 6), f(1, 4))],
    ["b2", mul(f(2, 3), f(9, 10))],
    ["c1", div(sub(f(3, 4), f(1, 6)), f(7, 8))],
    ["homework-1", add(f(2, 3), f(1, 6))],
    ["homework-2", div(f(3, 5), f(9, 10))],
  ])
    assert.equal(all.find((t) => t.id === id).answer, str(value), id);
  assert.equal(
    all.find((t) => t.id === "group-task-2").answer,
    `${(12 * 3) / 4} км`,
  );
  assert.equal(
    all.find((t) => t.id === "c2").answer,
    `${12 / gcd(12, 8)}:${8 / gcd(12, 8)}`,
  );
});
