const { chromium } = require("playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
async function fixture(
  t,
  {
    width = 1440,
    page = "index.html",
    role = "teacher",
    uid = "iustaz-test-owner",
    guest = false,
  } = {},
) {
  const root = path.resolve(__dirname, "../..");
  const server = http.createServer((req, res) => {
    const f = path.resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!f.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(f, (e, d) => {
      const types = {
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".ttf": "font/ttf",
        ".png": "image/png",
      };
      res.writeHead(e ? 404 : 200, {
        "Content-Type": types[path.extname(f)] || "application/octet-stream",
      });
      res.end(e ? "" : d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(async () => {
    await browser.close();
    await new Promise((r) => server.close(r));
  });
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    hasTouch: width < 600,
    reducedMotion: "reduce",
  });
  const p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await context.addInitScript(
    ({ uid, role, guest }) => {
      const listeners = [];
      const user = guest
        ? null
        : { uid, email: "test@example.invalid", displayName: "Тест мұғалімі" };
      const auth = {
        currentUser: user,
        onAuthStateChanged(fn) {
          listeners.push(fn);
          queueMicrotask(() => fn(auth.currentUser));
          return () => {};
        },
        async signOut() {
          auth.currentUser = null;
          for (const fn of listeners) await fn(null);
        },
      };
      const profile = { uid, name: "Тест мұғалімі", role };
      const sdk = {
        apps: [{}],
        initializeApp() {},
        auth: () => auth,
        firestore: () => ({
          collection: (name) => ({
            doc: (id) => ({
              async get() {
                return { exists: !guest, data: () => profile };
              },
              async set() {
                throw Error("Server writes are not enabled in UI QA");
              },
            }),
          }),
        }),
      };
      window.firebase = sdk;
      window.FIREBASE_CONFIG = {};
      window.FIREBASE_CONFIGURED = false;
      window.qaAuth = { auth, listeners, profile };
      window.qaEmit = async (u) => {
        auth.currentUser = u;
        await Promise.all(listeners.map((f) => f(u)));
      };
    },
    { uid, role, guest },
  );
  await context.route("**/www.gstatic.com/firebasejs/**", (r) =>
    r.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await context.route("**/firebase-config.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: "window.FIREBASE_CONFIG={};window.FIREBASE_CONFIGURED=false;",
    }),
  );
  await context.route(/\/auth\.js(?:\?|$)/, (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `window.requireRole=allowed=>(${guest ? "null" : JSON.stringify({ uid, name: "Тест мұғалімі", role })});window.ensureFirebase=async()=>firebase;window.getCurrentUser=()=>qaAuth.auth.currentUser?qaAuth.profile:null;window.logoutUser=async()=>{await qaAuth.auth.signOut();location.href='login.html'};window.loginUser=async()=>({success:false,message:'Тест: кіру қабылданбады.'});window.routeAfterLogin=()=>{};`,
    }),
  );
  await p.goto(`http://127.0.0.1:${server.address().port}/${page}`);
  t.after(() => assert.deepEqual(errors, []));
  return p;
}
module.exports = { fixture };
