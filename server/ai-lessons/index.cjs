"use strict";
const { Store, dataPath } = require("./store.cjs"),
  { app } = require("./app.cjs"),
  { ROOT } = require("./catalog.cjs"),
  { gemini } = require("./provider.cjs"),
  { firebaseVerifier } = require("./auth.cjs"),
  { roleDatabase } = require("./roles.cjs");
function bounded(value, fallback, max) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max)
    throw Error("Сервердің сандық баптауы жарамсыз.");
  return n;
}
async function start(env = process.env) {
  process.umask(0o077);
  const port = bounded(env.PORT, 8787, 65535),
    host = env.AI_BIND_HOST || "127.0.0.1",
    origin = env.AI_PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
  const u = new URL(origin);
  if (
    u.origin !== origin ||
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.protocol === "http:" && !["localhost", "127.0.0.1"].includes(u.hostname))
  )
    throw Error(
      "AI_PUBLIC_ORIGIN HTTPS немесе жергілікті localhost болуы тиіс.",
    );
  if (
    !["127.0.0.1", "localhost", "::1"].includes(host) &&
    u.protocol !== "https:"
  )
    throw Error("Сыртқы bind адресіне HTTPS origin қажет.");
  if (!env.FIREBASE_PROJECT_ID)
    throw Error(
      "FIREBASE_PROJECT_ID және сервердің ADC credentials бапталуы қажет.",
    );
  if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST)
    throw Error(
      "Нақты серверде emulator token қабылданбайды. Оқшау demo.cjs қолданыңыз.",
    );
  const mode = env.AI_GENERATION_MODE || "off";
  if (!["off", "fixture", "gemini"].includes(mode))
    throw Error("AI_GENERATION_MODE жарамсыз.");
  let generate = null,
    source = mode === "fixture" ? "fixture" : "gemini",
    model = mode === "fixture" ? "fixture-no-api" : env.GEMINI_MODEL || "";
  if (mode === "gemini") generate = gemini({ key: env.GEMINI_API_KEY, model });
  if (mode === "fixture")
    generate = async () => ({
      content: require("./fixtures/quadratic-response.json"),
      usage: null,
      source: "fixture",
      model,
    });
  const { initializeApp, applicationDefault } = require("firebase-admin/app"),
    { getAuth } = require("firebase-admin/auth");
  const credential = applicationDefault(),
    sdk = initializeApp({ credential, projectId: env.FIREBASE_PROJECT_ID });
  const store = new Store(dataPath(env.AI_DATA_DIR, ROOT), {
    daily: bounded(env.AI_DAILY_USER_LIMIT, 3, 100),
    globalDaily: bounded(env.AI_DAILY_GLOBAL_LIMIT, 30, 1000),
  });
  const server = app({
    verify: firebaseVerifier({
      auth: getAuth(sdk),
      db: roleDatabase({ credential, projectId: env.FIREBASE_PROJECT_ID }),
    }),
    store,
    generate,
    source,
    model,
    origin,
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise((yes, no) => {
    server.once("error", no);
    server.listen(port, host, yes);
  });
  console.log(
    "iUSTAZ AI сабақ зертханасы:",
    origin + "/admin.html",
    "| режим:",
    mode,
    "| жариялау өшірулі",
  );
  const stop = () =>
    server.close(() => {
      store.close();
      process.exit(0);
    });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return server;
}
if (require.main === module)
  start().catch((e) => {
    console.error(
      e?.code === "CONFIG_MISSING"
        ? e.message
        : "AI сервері іске қосылмады. Сервер айнымалылары, ADC credentials және жеке сақтау қалтасын тексеріңіз.",
    );
    process.exitCode = 1;
  });
module.exports = { start };
