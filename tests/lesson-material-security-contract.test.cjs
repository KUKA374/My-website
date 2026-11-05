/* Structural preservation check, not a replacement for executing Firestore Rules. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  crypto = require("node:crypto");
test("active rules/config stay identical and the candidate preserves every old permission outside new namespaces", () => {
  const hashes = require("./fixtures/stage8a-preserved.json").files;
  for (const file of ["firestore.rules", "firebase-config.js"])
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      hashes[file],
      file,
    );
  const active = fs.readFileSync("firestore.rules", "utf8"),
    candidate = fs.readFileSync("security/lesson-materials-v1.rules", "utf8"),
    fallback = "    match /{document=**} {",
    marker = "    // Stage 8A candidate.";
  assert.equal(
    candidate.slice(0, candidate.indexOf(marker)).trim(),
    active.slice(0, active.indexOf(fallback)).trim(),
  );
  assert.equal(
    candidate.slice(candidate.indexOf(fallback)).trim(),
    active.slice(active.indexOf(fallback)).trim(),
  );
  const added = candidate.slice(
    candidate.indexOf(marker),
    candidate.indexOf(fallback),
  );
  assert.deepEqual(
    [...added.matchAll(/match\s+(\S+)\s*\{/g)].map((x) => x[1]),
    [
      "/curriculumLessonRefs/{lessonId}",
      "/lessonPresentations/{presentationId}",
      "/lessonContentV1/{lessonId}",
      "/lessonVideoMetadata/{lessonId}",
      "/teacherLessonOverrides/{ownerId}/lessons/{lessonId}",
    ],
  );
});
test("the CLI emulator config references the candidate inside its project directory and only localhost", () => {
  const path = require("node:path"),
    root = path.resolve("security"),
    config = JSON.parse(
      fs.readFileSync("security/firebase.emulator.json", "utf8"),
    ),
    rules = path.resolve(root, config.firestore.rules);
  assert.equal(rules, path.join(root, "lesson-materials-v1.rules"));
  assert.ok(!path.relative(root, rules).startsWith(".."));
  assert.ok(fs.existsSync(rules));
  assert.deepEqual(config.emulators.firestore, {
    host: "127.0.0.1",
    port: 8187,
  });
  assert.deepEqual(config.emulators.ui, { enabled: false });
  assert.equal(config.emulators.singleProjectMode, true);
  assert.deepEqual(Object.keys(config).sort(), ["emulators", "firestore"]);
});
