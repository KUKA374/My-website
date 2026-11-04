const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture } = require("./helpers/iustaz.cjs");
test("B: original logo variants render and Kazakh Inter loads locally", async (t) => {
  const p = await fixture(t);
  await p.evaluate(async () => {
    for (const name of [
      "logo-light",
      "logo-dark",
      "mark-light",
      "mark-dark",
      "favicon",
    ]) {
      const im = new Image();
      im.src = "assets/iustaz/" + name + ".svg";
      document.body.append(im);
      await im.decode();
    }
    await document.fonts.load("600 16px Inter", "ӘҒҚҢӨҰҮҺІәғқңөұүһі");
  });
  assert.equal(
    await p
      .locator('img[src^="assets/iustaz/"]')
      .evaluateAll((imgs) =>
        imgs.every((x) => x.complete && x.naturalWidth > 0),
      ),
    true,
  );
  assert.equal(
    await p.evaluate(() => document.fonts.check("600 16px Inter", "ӘҒҚҢӨҰҮҺІ")),
    true,
  );
  assert.match(await p.title(), /iUSTAZ/);
});
test("B: login uses new brand while keeping credential inputs", async (t) => {
  const p = await fixture(t, { page: "login.html" });
  assert.equal(await p.locator('.login-logo img[alt="iUSTAZ"]').count(), 1);
  assert.equal(
    await p.locator("#password").getAttribute("autocomplete"),
    "current-password",
  );
  assert.equal(
    await p.locator('link[rel="icon"]').getAttribute("href"),
    "assets/iustaz/favicon.svg",
  );
});
