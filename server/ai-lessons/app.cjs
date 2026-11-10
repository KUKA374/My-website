"use strict";
const http = require("node:http"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { Fault } = require("./errors.cjs"),
  { context, ROOT } = require("./catalog.cjs"),
  { validate } = require("./content.cjs");
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function body(req) {
  if (
    !/^application\/json(?:\s*;.*)?$/i.test(req.headers["content-type"] || "")
  )
    throw new Fault(415, "JSON_REQUIRED", "JSON сұрауы қажет.");
  let size = 0;
  const chunks = [];
  for await (const part of req) {
    size += part.length;
    if (size > 4096) throw new Fault(413, "BODY_LIMIT", "Сұрау тым үлкен.");
    chunks.push(part);
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Fault(400, "BAD_JSON", "JSON сұрауы оқылмады.");
  }
  if (
    !data ||
    Array.isArray(data) ||
    typeof data !== "object" ||
    Object.keys(data).some((k) => !["lessonId", "requestId"].includes(k)) ||
    !UUID.test(data.requestId || "") ||
    data.lessonId !== context().id
  )
    throw new Fault(
      400,
      "BAD_REQUEST",
      "Тек таңдалған КТП сабағы мен бірегей сұрау ID-і қабылданады.",
    );
  return data;
}
function send(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
async function staticFile(req, res, pathname, root) {
  if (!["GET", "HEAD"].includes(req.method))
    throw new Fault(405, "METHOD", "Әдіс қолжетімсіз.");
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Fault(400, "PATH", "Жол жарамсыз.");
  }
  const parts = decoded.split("/").filter(Boolean);
  if (
    parts.some(
      (x) =>
        x.startsWith(".") ||
        ["server", "tests", "security", "node_modules"].includes(x),
    ) ||
    /[\\\x00]/.test(decoded)
  )
    throw new Fault(404, "NOT_FOUND", "Бет табылмады.");
  const target = path.resolve(
    root,
    "." + (decoded === "/" ? "/index.html" : decoded),
  );
  if (!target.startsWith(root + path.sep))
    throw new Fault(404, "NOT_FOUND", "Бет табылмады.");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
  };
  const type = types[path.extname(target)];
  if (!type) throw new Fault(404, "NOT_FOUND", "Файл табылмады.");
  let data;
  try {
    const real = await fs.realpath(target);
    if (!real.startsWith(root + path.sep)) throw Error();
    data = await fs.readFile(real);
  } catch {
    throw new Fault(404, "NOT_FOUND", "Файл табылмады.");
  }
  res.writeHead(200, {
    "content-type": type,
    "content-length": data.byteLength,
  });
  res.end(req.method === "HEAD" ? undefined : data);
}
function app({
  verify,
  store,
  generate = null,
  source = "gemini",
  model = "",
  origin,
  staticRoot = ROOT,
  staticOverride = null,
}) {
  if (
    typeof verify !== "function" ||
    !store ||
    !(typeof origin === "function" || /^https?:\/\//.test(origin))
  )
    throw Error("AI сервері бапталмаған.");
  return http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      const pathname = new URL(req.url, "http://localhost").pathname;
      if (!pathname.startsWith("/api/ai-lessons")) {
        if (staticOverride && (await staticOverride(req, res, pathname)))
          return;
        return await staticFile(req, res, pathname, staticRoot);
      }
      if (
        req.headers.origin &&
        req.headers.origin !==
          (typeof origin === "function" ? origin() : origin)
      )
        throw new Fault(403, "ORIGIN", "Сұраудың шығу тегі қабылданбады.");
      if (req.method === "GET" && pathname === "/api/ai-lessons/availability")
        return send(res, 200, { service: "iustaz-ai-lesson-lab", version: 1 });
      const owner = await verify(req.headers.authorization);
      if (!owner?.uid || !["admin", "super_admin"].includes(owner.role))
        throw new Fault(403, "ADMIN_REQUIRED", "Тек админге қолжетімді.");
      if (req.method === "GET" && pathname === "/api/ai-lessons/context")
        return send(res, 200, {
          catalog: context(),
          enabled: !!generate,
          source,
          model,
          storage: "private-server-sqlite",
          publication: "disabled",
        });
      if (req.method === "GET" && pathname === "/api/ai-lessons/stats")
        return send(res, 200, store.stats(owner.uid));
      if (req.method === "GET" && pathname === "/api/ai-lessons/drafts")
        return send(res, 200, { drafts: store.list(owner.uid) });
      if (
        req.method === "GET" &&
        /^\/api\/ai-lessons\/drafts\/[a-f0-9-]+$/i.test(pathname)
      ) {
        const id = pathname.split("/").at(-1),
          draft = UUID.test(id) ? store.get(owner.uid, id) : null;
        if (!draft) throw new Fault(404, "NOT_FOUND", "Жоба табылмады.");
        return send(res, 200, { draft });
      }
      if (req.method === "POST" && pathname === "/api/ai-lessons/drafts") {
        const request = await body(req);
        if (!generate)
          throw new Fault(
            503,
            "CONFIG_MISSING",
            "AI сервері дайын емес. Сервер құпия айнымалылары мен credentials бапталуы қажет.",
          );
        const ticket = store.reserve(
          owner.uid,
          request.requestId,
          source,
          model,
        );
        if (ticket.replay)
          return send(res, 200, { draft: ticket.draft, replayed: true });
        let measured = null;
        try {
          const result = await generate(context());
          measured = result.usage;
          let safe;
          try {
            safe = validate(result.content, context());
          } catch {
            throw new Fault(
              502,
              "CONTENT_INVALID",
              "AI мазмұны құрылым тексеруінен өтпеді. Толық емес жоба сақталмады.",
              measured,
            );
          }
          // Re-check revocation and the current role after a potentially long paid request.
          const still = await verify(req.headers.authorization);
          if (
            still.uid !== owner.uid ||
            !["admin", "super_admin"].includes(still.role)
          )
            throw new Fault(
              403,
              "ROLE_CHANGED",
              "Сұрау кезінде админ рөлі өзгерді.",
            );
          const draft = store.complete(
            owner.uid,
            ticket.id,
            { catalog: context(), status: "draft", ...safe },
            measured,
          );
          return send(res, 201, { draft, replayed: false });
        } catch (e) {
          store.fail(
            owner.uid,
            ticket.id,
            e instanceof Fault ? e.code : "GENERATION_FAILED",
            e.usage || measured,
          );
          throw e instanceof Fault
            ? e
            : new Fault(
                502,
                "GENERATION_FAILED",
                "AI сұрауы аяқталмады. Құпия деректер журналға жазылған жоқ.",
              );
        }
      }
      throw new Fault(404, "NOT_FOUND", "API әрекеті табылмады.");
    } catch (e) {
      if (!res.headersSent)
        send(res, e instanceof Fault ? e.status : 500, {
          error: {
            code: e instanceof Fault ? e.code : "SERVER_ERROR",
            message:
              e instanceof Fault
                ? e.message
                : "Сервер қатесі. Жариялау орындалған жоқ.",
          },
        });
      else res.end();
    }
  });
}
module.exports = { app, staticFile };
