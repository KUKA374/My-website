const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  crypto = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const M = require("../lesson-materials/model.js"),
  fixture = require("./fixtures/stage8c-math-checks.json"),
  catalog = require("./fixtures/stage8c-catalog.json");
const index = JSON.parse(
  fs.readFileSync("lesson-materials/index/6/math/q1.json"),
);
const read = (n) =>
  JSON.parse(fs.readFileSync(`lesson-materials/content/6/math/q1/${n}.json`));
const tasks = (d) => [
  ...d.pairWork,
  ...d.groupWork.map((g) => g.task),
  ...Object.values(d.individualWork).flat(),
  ...d.homework,
];
const run = spawnSync("python", ["tests/check-stage8c-math.py"], {
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
});
let math;
try {
  math = JSON.parse(run.stdout);
} catch {
  math = { proofs: [], slides: [], valid: false, error: run.stderr };
}
test("official 39 IDs and ordering are preserved; exactly ten full documents and 29 unavailable entries", () => {
  assert.equal(catalog.length, 39);
  assert.deepEqual(
    index.lessons.map((r) => r.lessonId),
    catalog.map((r) => r.lessonId),
  );
  assert.equal(index.lessons.filter((r) => r.content !== null).length, 10);
  for (const row of index.lessons) {
    const n = Number(M.parseId(row.lessonId).number);
    assert.equal(row.content, n <= 10 ? `content/6/math/q1/${n}.json` : null);
  }
  assert.equal(new Set(index.lessons.map((r) => r.lessonId)).size, 39);
});
for (let n = 1; n <= 5; n++) {
  test(`lesson ${n}: schema, 45 minutes, full theory, examples, 3 pairs, 4 groups, ABC and specific rubrics`, () => {
    const d = read(n);
    M.material(d, `ktp1:6:math:1:${n}`);
    assert.equal(
      d.lessonPlan.reduce((s, r) => s + r.minutes, 0),
      45,
    );
    assert.equal(d.examples.length >= 3, true);
    assert.ok(d.examples.every((e) => e.steps.length >= 3));
    assert.ok(d.theory.filter((b) => b.kind === "heading").length >= 4);
    assert.ok(d.theory.some((b) => b.kind === "visual"));
    assert.ok(d.theory.some((b) => b.kind === "formula"));
    assert.equal(d.pairWork.length, 3);
    assert.equal(d.groupWork.length, 4);
    assert.ok(["A", "B", "C"].every((k) => d.individualWork[k].length === 2));
    assert.equal(d.homework.length, 2);
    assert.ok(
      tasks(d).every(
        (t) =>
          t.solution.length > 12 &&
          t.descriptors.length >= 2 &&
          t.criteria.length > 15,
      ),
    );
    assert.equal(d.games.topicKey, `6-math-1-${n}`);
    assert.ok(d.games.recommended.includes("cards"));
    const p = JSON.parse(
      fs.readFileSync(
        `lesson-materials/presentations/${d.presentation.id}.json`,
      ),
    );
    M.presentation(p, p.id);
    assert.ok(d.presentation.endSlide <= p.slides.length);
    assert.ok(p.slides.length >= 10 && p.slides.length <= 15);
  });
  test(`lesson ${n}: every task and worked-example answer and numerical solution equation passes independent exact arithmetic`, () => {
    const id = `ktp1:6:math:1:${n}`,
      d = read(n),
      actual = math.proofs.filter((p) => p.lessonId === id);
    const expected = [
      ...tasks(d).map((t) => "task/" + t.id),
      ...d.examples.map((e) => "example/" + e.id),
    ].sort();
    assert.deepEqual(actual.map((p) => p.kind + "/" + p.id).sort(), expected);
    assert.ok(
      actual.every((r) => r.valid),
      JSON.stringify(actual.filter((r) => !r.valid)),
    );
  });
}
test("all five presentation blocks have mathematically consistent numerical formulas and explanation steps", () => {
  assert.equal(run.status, 0, run.stderr);
  assert.equal(
    math.valid,
    true,
    JSON.stringify(math.proofs.concat(math.slides).filter((r) => !r.valid)),
  );
  assert.equal(math.proofs.length, 91);
  assert.equal(math.slides.length, 72);
  assert.ok(math.totals.solutionEqualities >= 140);
  assert.ok(math.totals.numericFormulas >= 45);
});
test("all 75 practice prompts are distinct and every task/example has exactly one audit record", () => {
  const all = [1, 2, 3, 4, 5].flatMap((n) =>
    tasks(read(n)).map((t) => t.prompt.replace(/\s+/g, "")),
  );
  assert.equal(all.length, 75);
  assert.equal(new Set(all).size, all.length);
  const keys = fixture.proofs.map(
    (p) => p.lessonId + "/" + p.kind + "/" + p.id,
  );
  assert.equal(new Set(keys).size, keys.length);
});
test("proportion theory is reused by lessons eight and nine with distinct ten-slide ranges", () => {
  const a = index.lessons[7],
    b = index.lessons[8];
  assert.equal(a.presentation.id, b.presentation.id);
  assert.deepEqual(
    [a.presentation.startSlide, a.presentation.endSlide],
    [1, 10],
  );
  assert.deepEqual(
    [b.presentation.startSlide, b.presentation.endSlide],
    [3, 12],
  );
  assert.ok(a.content && b.content);
});
test("Stage 8B interface, QMJ template, old lesson and retained presentation remain byte-identical", () => {
  const preserved = require("./fixtures/stage8c-preserved.json");
  const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
  for (const [file, expected] of Object.entries(preserved.files)) {
    const bytes = fs.readFileSync(file);
    assert.equal(
      sha(
        file === "lesson-materials/demo.js"
          ? require("./helpers/lesson-controller-contract.cjs").beforeGameAdapter(
              bytes,
            )
          : bytes,
      ),
      expected,
      file,
    );
  }
  const html = fs.readFileSync("lesson-material.html", "utf8"),
    start = html.indexOf('<dialog id="qmjDialog"');
  assert.equal(
    sha(html.slice(start, html.indexOf("</dialog>", start) + 9)),
    preserved.qmjHtmlSha256,
  );
});
test("new visual types fail closed on duplicate Venn regions, foreign fields, invalid chart scale or duplicate category", () => {
  for (const v of [
    {
      kind: "venn",
      leftLabel: "A",
      rightLabel: "B",
      leftOnly: ["1"],
      common: ["1"],
      rightOnly: [],
      outside: [],
    },
    {
      kind: "bar-chart",
      max: 20,
      categories: [
        { label: "A", value: 21 },
        { label: "B", value: 1 },
      ],
    },
    {
      kind: "bar-chart",
      max: 20,
      categories: [
        { label: "A", value: 1 },
        { label: "A", value: 2 },
      ],
    },
    {
      kind: "bar-chart",
      max: 20,
      categories: [
        { label: "A", value: 1 },
        { label: "B", value: 2 },
      ],
      html: "<script>",
    },
  ])
    assert.throws(() => M.visual(v));
});
test("the arithmetic checker rejects false identities and executable syntax and handles division by a fraction", () => {
  const r = spawnSync(
    "python",
    [
      "-B",
      "-c",
      `import sys;sys.path.insert(0,'tests');import importlib.util\ns=importlib.util.spec_from_file_location('audit','tests/check-stage8c-math.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nassert m.equality('5/6 : 5/6 = 1')==1\nassert m.equality('0,1 + 0,2 = 0,3')==1\nfor bad in ['1+1=3','1/0=2','__import__("os")=1']:\n try:m.equality(bad)\n except Exception:pass\n else:raise AssertionError(bad)`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
});
