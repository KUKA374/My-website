const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  crypto = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const M = require("../lesson-materials/model.js"),
  G = require("../lesson-materials/game-context.js");
const preserved = require("./fixtures/stage8d-preserved.json"),
  catalog = require("./fixtures/stage8c-catalog.json"),
  fixture = require("./fixtures/stage8d-math-checks.json");
const read = (n) =>
  JSON.parse(fs.readFileSync(`lesson-materials/content/6/math/q1/${n}.json`));
const tasks = (d) => [
  ...d.pairWork,
  ...d.groupWork.map((g) => g.task),
  ...Object.values(d.individualWork).flat(),
  ...d.homework,
];
const run = spawnSync("python", ["-B", "tests/check-stage8d-math.py"], {
  encoding: "utf8",
});
const math = JSON.parse(run.stdout);
for (let n = 6; n <= 10; n++) {
  test(`lesson ${n}: canonical identity, complete schema, four worked examples, 45 minutes and 15 assessed tasks`, () => {
    const d = read(n);
    M.material(d, `ktp1:6:math:1:${n}`);
    assert.equal(d.lessonId, catalog[n - 1].lessonId);
    assert.equal(
      d.lessonPlan.reduce((s, r) => s + r.minutes, 0),
      45,
    );
    assert.equal(d.examples.length, 4);
    assert.ok(d.examples.every((e) => e.steps.length >= 3));
    assert.equal(d.pairWork.length, 3);
    assert.equal(d.groupWork.length, 4);
    for (const k of ["A", "B", "C"])
      assert.equal(d.individualWork[k].length, 2);
    assert.equal(d.homework.length, 2);
    assert.equal(tasks(d).length, 15);
    assert.ok(
      tasks(d).every(
        (t) =>
          t.answer &&
          t.solution.length > 25 &&
          t.descriptors.length >= 2 &&
          t.criteria.length > 20,
      ),
    );
    assert.ok(d.theory.filter((b) => b.kind === "heading").length >= 4);
    assert.ok(
      d.theory
        .filter((b) => b.kind === "text")
        .map((b) => b.text)
        .join("").length >= 1000,
    );
    assert.ok(d.theory.some((b) => b.kind === "visual"));
    assert.ok(d.theory.some((b) => b.kind === "formula"));
    assert.ok(d.assessment.every((a) => a.descriptors.length >= 2));
    assert.equal(d.video, null);
    assert.equal(d.reviewRequired, true);
    const p = JSON.parse(
      fs.readFileSync(
        `lesson-materials/presentations/${d.presentation.id}.json`,
      ),
    );
    M.presentation(p, p.id);
    assert.equal(p.slides.length, 12);
    assert.ok(d.presentation.endSlide <= 12);
    assert.ok(d.presentation.endSlide - d.presentation.startSlide + 1 >= 10);
    assert.ok(p.slides.every((s) => s.steps.length >= 2));
  });
  test(`lesson ${n}: all 19 answers and numeric/symbolic solution equations pass the independent rational checker`, () => {
    const d = read(n),
      actual = math.proofs.filter((p) => p.lessonId === d.lessonId);
    assert.deepEqual(
      actual.map((p) => p.kind + "/" + p.id).sort(),
      [
        ...tasks(d).map((t) => "task/" + t.id),
        ...d.examples.map((e) => "example/" + e.id),
      ].sort(),
    );
    assert.ok(
      actual.every((p) => p.valid),
      JSON.stringify(actual.filter((p) => !p.valid)),
    );
  });
}
test("all 95 answers, five theories and 48 new slides pass exact arithmetic including symbolic substitution", () => {
  assert.equal(run.status, 0, run.stderr);
  assert.equal(math.valid, true, JSON.stringify(math));
  assert.equal(math.proofs.length, 95);
  assert.equal(math.slides.length, 48);
  assert.ok(math.totals.symbolicEqualities >= 60);
  assert.ok(math.totals.solutionEqualities >= 220);
  assert.equal(
    new Set(fixture.proofs.map((p) => p.lessonId + "/" + p.kind + "/" + p.id))
      .size,
    95,
  );
});
test("all 150 practice prompts across lessons 1–10 are distinct; IDs stay local and unique", () => {
  const prompts = [];
  for (let n = 1; n <= 10; n++) {
    const d = read(n),
      ts = tasks(d);
    prompts.push(...ts.map((t) => t.prompt.replace(/\s+/g, "")));
    assert.equal(new Set(ts.map((t) => t.id)).size, 15);
  }
  assert.equal(prompts.length, 150);
  assert.equal(new Set(prompts).size, 150);
});
test("all protected KTP/QMJ/Firebase/constructor/old content files and old slide blocks remain byte-identical", () => {
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
  for (const [file, expected] of Object.entries(preserved.files))
    assert.equal(sha(fs.readFileSync(file)), expected, file);
  const html = fs.readFileSync("lesson-material.html", "utf8"),
    start = html.indexOf('<dialog id="qmjDialog"');
  assert.equal(
    sha(html.slice(start, html.indexOf("</dialog>", start) + 9)),
    preserved.qmjHtmlSha256,
  );
  assert.equal(
    sha(
      require("./helpers/lesson-controller-contract.cjs").beforeGameAdapter(
        fs.readFileSync("lesson-materials/demo.js"),
      ),
    ),
    preserved.controllerSha256,
  );
});
test("game adapter uses only a real same-grade/subject/quarter bank and explicitly identifies fallback source", () => {
  const metadata = {
      lessons: { "6-math-1-6": ["Кері қатынас"], "6-math-1-7": ["Пропорция"] },
    },
    context = { grade: "6", subject: "math", quarter: "1", number: "10" };
  assert.equal(G.key(read(10), context, metadata), "6-math-1-7");
  assert.match(G.description(read(10), context, metadata), /Пропорция/);
  assert.match(
    G.description(read(10), context, metadata),
    /автоматты көшірілмейді/,
  );
  assert.equal(
    G.description(read(6), { ...context, number: "6" }, metadata),
    "",
  );
  for (const topicKey of [
    "5-math-1-7",
    "6-algebra-1-7",
    "6-math-2-7",
    "6-math-1-999",
    "__proto__",
  ])
    assert.equal(G.key({ games: { topicKey } }, context, metadata), null);
  assert.match(
    G.description({ games: { topicKey: "6-math-1-999" } }, context, metadata),
    /тіркелмеген/,
  );
});
test("four shared theory blocks, no duplicate decks for identical objectives, and only lessons 1–10 are ready", () => {
  const index = JSON.parse(
    fs.readFileSync("lesson-materials/index/6/math/q1.json"),
  );
  assert.deepEqual(
    index.lessons.map((r) => r.lessonId),
    catalog.map((r) => r.lessonId),
  );
  assert.equal(index.lessons.filter((r) => r.content).length, 10);
  const ids = new Set([6, 7, 8, 9, 10].map((n) => read(n).presentation.id));
  assert.equal(ids.size, 4);
  assert.equal(read(8).presentation.id, read(9).presentation.id);
  assert.deepEqual(
    [read(8).presentation.startSlide, read(8).presentation.endSlide],
    [1, 10],
  );
  assert.deepEqual(
    [read(9).presentation.startSlide, read(9).presentation.endSlide],
    [3, 12],
  );
  assert.ok(
    index.lessons
      .slice(10)
      .every((r) => r.content === null && r.presentation === null),
  );
});
test("independent solver covers all four unknown positions, rejects zero denominators, nonlinear and executable syntax", () => {
  const r = spawnSync(
    "python",
    [
      "-B",
      "-c",
      `
import importlib.util
s=importlib.util.spec_from_file_location('audit','tests/check-stage8d-math.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
assert m.solve_proportion(['x','15','4','5'])==12
assert m.solve_proportion(['14','x','7','9'])==18
assert m.solve_proportion(['.6','1.5','x','10'])==4
assert m.solve_proportion(['16','24','10','x'])==15
assert m.result({'op':'inverse','a':'2/3','b':'5/6'})=='5:4'
assert m.result({'op':'valid-proportion','terms':['0','5','0','8']})=='Пропорция'
assert m.result({'op':'valid-proportion','terms':['1','0','2','0']})=='Пропорция емес'
assert m.result({'op':'direct','rule':'4*x+6'})=='Тура пропорционал емес'
assert m.result({'op':'direct','rule':'3*x'})=='Тура пропорционал'
for terms in [['x','0','4','5'],['1','x','0','5'],['x','1','2','0']]:
 try:m.solve_proportion(terms)
 except Exception:pass
 else:raise AssertionError(terms)
for source in ['x*x','__import__("os")','x/(x+1)']:
 try:m.affine(source)
 except Exception:pass
 else:raise AssertionError(source)
try:m.symbolic_equations('3 × x = 12.',m.Fraction(5))
except Exception:pass
else:raise AssertionError('False equation accepted')
try:m.numeric_text('1+1=3.')
except Exception:pass
else:raise AssertionError('False identity accepted')
`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
});
