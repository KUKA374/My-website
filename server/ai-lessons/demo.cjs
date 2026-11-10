/* Explicit loopback-only fixture demo. NEVER used by index.cjs or deployed as an API. */
"use strict";
const crypto = require("node:crypto"),
  path = require("node:path"),
  os = require("node:os");
const { Store, dataPath } = require("./store.cjs"),
  { app } = require("./app.cjs"),
  { Fault } = require("./errors.cjs"),
  { ROOT } = require("./catalog.cjs");
async function startDemo({
  port = 8787,
  dataDir = path.join(os.tmpdir(), "iustaz-ai-demo"),
  role = "admin",
} = {}) {
  if (process.env.NODE_ENV === "production")
    throw Error("Сынақ demo сервері production режимінде іске қосылмайды.");
  process.umask(0o077);
  const token = crypto.randomBytes(32).toString("hex"),
    uid = "local-ai-demo-admin",
    store = new Store(dataPath(dataDir, ROOT));
  const profile = { uid, role, name: "AI сынақ админі" };
  const authCode = `(()=>{const profile=${JSON.stringify(profile)},token=${JSON.stringify(token)};const user={uid:profile.uid,displayName:profile.name,getIdToken:async()=>token};const listeners=new Set();let current=user;const auth={get currentUser(){return current;},onAuthStateChanged(fn){listeners.add(fn);queueMicrotask(()=>fn(current));return()=>listeners.delete(fn);},async signOut(){current=null;for(const fn of listeners)await fn(null);}};window.firebase={apps:[{}],auth:()=>auth,firestore:()=>({collection:name=>({doc:id=>({get:async()=>({exists:name==='users'&&id===profile.uid,data:()=>profile}),set:async()=>{throw Error('Сынақта Firebase жазуы өшірулі.');}})})})};window.FIREBASE_CONFIG={};window.FIREBASE_CONFIGURED=false;window.ensureFirebase=async()=>firebase;window.requireRole=allowed=>allowed.includes(profile.role)?profile:null;window.requireAuth=()=>profile;window.getCurrentUser=()=>profile;window.getRoleName=()=>profile.role;window.logoutUser=()=>{location.href='admin.html';};window.loginUser=async()=>({success:false});window.routeAfterLogin=()=>{};})();`;
  const server = app({
    origin: () => `http://127.0.0.1:${server.address().port}`,
    store,
    source: "fixture",
    model: "fixture-no-api",
    verify: async (header) => {
      if (header !== "Bearer " + token)
        throw new Fault(401, "AUTH_REQUIRED", "Сынақ сессиясы қажет.");
      return { uid, role };
    },
    generate: async () => ({
      content: structuredClone(require("./fixtures/quadratic-response.json")),
      usage: null,
    }),
    staticOverride: async (req, res, name) => {
      if (["/auth.js", "/firebase-config.js"].includes(name)) {
        res.writeHead(200, {
          "content-type": "application/javascript; charset=utf-8",
        });
        res.end(
          name === "/auth.js"
            ? authCode
            : "window.FIREBASE_CONFIG={};window.FIREBASE_CONFIGURED=false;",
        );
        return true;
      }
      return false;
    },
  });
  await new Promise((yes, no) => {
    server.once("error", no);
    server.listen(port, "127.0.0.1", yes);
  });
  return {
    server,
    store,
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          store.close();
          resolve();
        }),
      ),
  };
}
if (require.main === module)
  startDemo()
    .then((d) => {
      console.log(
        "СЫНАҚ ДЕРЕГІ: Gemini API шақырылмайды. Firebase production қосылмайды.\n" +
          d.origin +
          "/admin.html",
      );
      const stop = () => d.close().then(() => process.exit(0));
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    })
    .catch(() => {
      console.error(
        "Жергілікті сынақ сервері іске қосылмады. 8787 портын және жеке сақтау қалтасын тексеріңіз.",
      );
      process.exitCode = 1;
    });
module.exports = { startDemo };
