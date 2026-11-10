"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "../.."),
  relative = "ktp-8-algebra-q2.js";
function context() {
  const source = fs.readFileSync(path.join(ROOT, relative), "utf8");
  const match = source.match(
    /window\.ktpD\["8_algebra_q2"\]\s*=\s*(\[[\s\S]*\]);?\s*$/,
  );
  if (!match) throw Error("КТП пішімі өзгерді; AI тәжірибесі тоқтатылды.");
  const rows = JSON.parse(match[1]);
  const lesson = rows.find(
    (r) =>
      r.number === 3 &&
      r.title === "Квадрат теңдеулерді шешу" &&
      r.objective === "8.2.2.3квадрат теңдеулерді шешу;",
  );
  if (!lesson)
    throw Error("Ресми КТП сабағы табылмады; жаңа мақсат ойдан жасалмайды.");
  return {
    id: "ktp1:8:algebra:2:3",
    identity: { grade: "8", subject: "algebra", quarter: "2", number: "3" },
    subjectTitle: "Алгебра",
    lesson: structuredClone(lesson),
    source: relative,
    sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
  };
}
module.exports = { ROOT, context };
