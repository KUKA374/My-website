/* Run only against the explicit demo Firestore emulator, never a production project. */
"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawnSync } = require("node:child_process");
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8187") {
  console.error(
    "Start security/firebase.emulator.json on 127.0.0.1:8187 first.",
  );
  process.exit(1);
}
const outputDir =
  process.env.IUSTAZ_SECURITY_REPORT_DIR ||
  path.join(os.tmpdir(), "iustaz-stage8a-security");
fs.mkdirSync(outputDir, { recursive: true });
const run = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=tap", "tests/lesson-material-rules.test.cjs"],
  {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  },
);
const output = (run.stdout || "") + (run.stderr || "");
process.stdout.write(output);
const counts = Object.fromEntries(
  [
    ...output.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm),
  ].map((match) => [match[1], Number(match[2])]),
);
const valid =
  run.status === 0 &&
  counts.tests === 7 &&
  counts.pass === 7 &&
  ["fail", "cancelled", "skipped", "todo"].every((key) => counts[key] === 0);
fs.writeFileSync(path.join(outputDir, "firestore-security.tap"), output);
fs.writeFileSync(
  path.join(outputDir, "summary.json"),
  JSON.stringify(
    {
      emulator: "127.0.0.1:8187",
      project: "demo-iustaz-stage8a",
      expectedTests: 7,
      exitCode: run.status,
      error: run.error?.message || null,
      valid,
      ...counts,
    },
    null,
    2,
  ) + "\n",
);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\nFirestore emulator: ${valid ? "PASS" : "FAIL"}; ${counts.pass || 0}/7 passed, ${counts.fail || 0} failed. See the TAP artifact for details.\n`,
  );
if (!valid) process.exit(1);
