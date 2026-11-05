const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const M = require("../lesson-materials/model.js"),
  { plan } = require("../lesson-materials/qmj.js"),
  { LocalHomework } = require("../lesson-materials/private.js");
const material = JSON.parse(
  fs.readFileSync("lesson-materials/content/6/math/q1/1.json"),
);
test("visual descriptors reject unsafe kinds, nonfinite/out-of-range coordinates and excessive detail", () => {
  for (const b of material.theory.filter((b) => b.kind === "visual"))
    assert.equal(M.visual(b.visual), b.visual);
  for (const bad of [
    { kind: "svg", src: "javascript:alert(1)" },
    { kind: "number-line", divisions: 0, marks: [] },
    { kind: "number-line", divisions: 4, marks: [{ tick: 5, label: "bad" }] },
    {
      kind: "coordinate-graph",
      maxX: 8,
      maxY: 6,
      xLabel: "x",
      yLabel: "y",
      points: [
        { x: 0, y: 0 },
        { x: NaN, y: 2 },
      ],
    },
    { kind: "fraction-bar", parts: 4, filled: 5 },
    { kind: "fraction-bar", parts: 4, filled: 2, onload: "alert(1)" },
  ])
    assert.throws(() => M.visual(bad));
});
test("version 1 slides remain compatible while all twelve theory slides support bounded explanation steps", () => {
  const deck = JSON.parse(
    fs.readFileSync("lesson-materials/presentations/fractions-review-v1.json"),
  );
  assert.equal(M.presentation(deck, deck.id).slides.length, 12);
  assert.ok(
    deck.slides.every((s) => s.steps.length >= 2 && s.steps.length <= 8),
  );
  const legacy = M.clone(deck);
  for (const s of legacy.slides) {
    delete s.steps;
    s.diagram = null;
  }
  assert.equal(M.presentation(legacy, legacy.id).slides.length, 12);
  const invalid = M.clone(deck);
  invalid.slides[0].steps = Array(9).fill("x");
  assert.throws(() => M.presentation(invalid, invalid.id));
});
test("old UID homework survives additive textbook fields, reload, revision conflicts and other teachers", () => {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, v),
    };
  const a = new LocalHomework(storage, "alice"),
    b = new LocalHomework(storage, "bob"),
    id = material.lessonId;
  a.save(id, { homeworkText: "Бұрынғы тапсырма", notes: "Бұрынғы жазба" }, 0);
  const old = a.read(id);
  assert.equal(old.textbook, undefined);
  a.save(
    id,
    { ...old, textbook: { paragraph: "§ 2", exercise: "№ 15, 16 (а)" } },
    1,
  );
  assert.equal(
    new LocalHomework(storage, "alice").read(id).notes,
    "Бұрынғы жазба",
  );
  assert.equal(a.read(id).textbook.exercise, "№ 15, 16 (а)");
  assert.equal(b.read(id).homeworkText, "");
  assert.throws(() => a.save(id, old, 1));
  assert.throws(() =>
    a.save(
      id,
      { ...old, textbook: { paragraph: "x".repeat(201), exercise: "" } },
      2,
    ),
  );
});
test("QMJ is a read-only 45-minute projection with exact KTP metadata and no task answers or private notes", () => {
  const catalog = {
    id: material.lessonId,
    identity: { grade: "6", quarter: "1" },
    subjectTitle: "Математика",
    lesson: {
      title: " Дәл КТП атауы ",
      section: "Бөлім",
      number: "01",
      objective: " 5.1.2.18 · бастапқы мақсат ",
    },
  };
  const original = JSON.stringify(material);
  const out = plan(
    material,
    catalog,
    {
      homeworkText: "Мұғалім тапсырмасы",
      notes: "ҚҰПИЯ ЖАЗБА",
      textbook: { paragraph: "§ 2", exercise: "№ 15" },
    },
    { title: "Карточкалар" },
  );
  assert.equal(out.title, catalog.lesson.title);
  assert.equal(out.objective, catalog.lesson.objective);
  assert.equal(out.minutes, 45);
  assert.equal(out.stages.length, 8);
  assert.equal(out.game, "Карточкалар");
  assert.deepEqual(out.homework, [
    "Оқулық: § 2",
    "Жаттығу: № 15",
    "Мұғалім тапсырмасы",
  ]);
  assert.doesNotMatch(JSON.stringify(out), /ҚҰПИЯ ЖАЗБА|"answer"|"solution"/);
  out.stages[0].title = "changed";
  out.assessment[0].descriptors[0].text = "changed";
  assert.equal(JSON.stringify(material), original);
});
