const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  baseline = require("./fixtures/iustaz-protected-sha256.json");
test("iUSTAZ: game mechanics, constructor logic, curriculum, auth, rules and original styles stay byte-identical", () => {
  for (const [file, hash] of Object.entries(baseline.files))
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(root, file)))
        .digest("hex"),
      hash,
      file,
    );
});
test("iUSTAZ: protected pages retain their auth and existing application scripts", () => {
  for (const file of [
    "class.html",
    "lesson.html",
    "constructor.html",
    "games.html",
    "admin.html",
    "qmj.html",
  ]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(html, /src=["']auth\.js/);
    assert.match(html, /requireRole\(/);
  }
  assert.match(
    fs.readFileSync(path.join(root, "constructor.html"), "utf8"),
    /constructor-library\.js/,
  );
  assert.match(
    fs.readFileSync(path.join(root, "games.html"), "utf8"),
    /games-final\.js/,
  );
});
