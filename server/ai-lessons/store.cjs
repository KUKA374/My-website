"use strict";
const { DatabaseSync } = require("node:sqlite"),
  { randomUUID } = require("node:crypto"),
  fs = require("node:fs"),
  path = require("node:path");
const { Fault } = require("./errors.cjs");
class Store {
  constructor(
    filename,
    { daily = 3, globalDaily = 30, now = () => Date.now() } = {},
  ) {
    this.daily = daily;
    this.globalDaily = globalDaily;
    this.now = now;
    this.db = new DatabaseSync(filename);
    if (filename !== ":memory:") fs.chmodSync(filename, 0o600);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY,owner TEXT NOT NULL,request_key TEXT NOT NULL,created INTEGER NOT NULL,status TEXT NOT NULL,source TEXT NOT NULL,model TEXT NOT NULL,body TEXT,usage TEXT,error_code TEXT,latency INTEGER,UNIQUE(owner,request_key));",
    );
    this.db
      .prepare(
        "UPDATE requests SET status='failed',error_code='INTERRUPTED' WHERE status='pending' AND created<?",
      )
      .run(this.now() - 120000);
  }
  reserve(owner, requestKey, source, model) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.db
        .prepare("SELECT * FROM requests WHERE owner=? AND request_key=?")
        .get(owner, requestKey);
      if (prior) {
        if (prior.status === "complete") {
          this.db.exec("COMMIT");
          return { replay: true, draft: this.get(owner, prior.id) };
        }
        throw new Fault(
          409,
          "REQUEST_ALREADY_USED",
          "Бұл сұрау орындалуда немесе аяқталған. Статистиканы тексеріп, жаңа сұрауды саналы түрде бастаңыз.",
        );
      }
      this.db
        .prepare(
          "UPDATE requests SET status='failed',error_code='INTERRUPTED' WHERE status='pending' AND created<?",
        )
        .run(this.now() - 120000);
      if (
        this.db
          .prepare("SELECT 1 FROM requests WHERE owner=? AND status='pending'")
          .get(owner)
      )
        throw new Fault(409, "BUSY", "Осы админнің бір сұрауы орындалуда.");
      const day = new Date(this.now()).toISOString().slice(0, 10),
        start = Date.parse(day + "T00:00:00Z");
      const count = this.db
        .prepare(
          "SELECT count(*) AS n FROM requests WHERE owner=? AND created>=?",
        )
        .get(owner, start).n;
      const global = this.db
        .prepare("SELECT count(*) AS n FROM requests WHERE created>=?")
        .get(start).n;
      if (count >= this.daily || global >= this.globalDaily)
        throw new Fault(
          429,
          "DAILY_LIMIT",
          "Сервердің тәуліктік сұрау шегі аяқталды.",
        );
      const id = randomUUID(),
        created = this.now();
      this.db
        .prepare(
          "INSERT INTO requests(id,owner,request_key,created,status,source,model) VALUES(?,?,?,?,'pending',?,?)",
        )
        .run(id, owner, requestKey, created, source, model);
      this.db.exec("COMMIT");
      return { id, created, replay: false };
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  complete(owner, id, body, usage) {
    const r = this.db
      .prepare(
        "UPDATE requests SET status='complete',body=?,usage=?,latency=? WHERE id=? AND owner=? AND status='pending'",
      )
      .run(
        JSON.stringify(body),
        usage ? JSON.stringify(usage) : null,
        this.elapsed(owner, id),
        id,
        owner,
      );
    if (r.changes !== 1)
      throw new Fault(
        409,
        "REQUEST_EXPIRED",
        "Сұрау күйі өзгерген; жауап қайта сақталмайды.",
      );
    return this.get(owner, id);
  }
  elapsed(owner, id) {
    return Math.max(
      0,
      this.now() -
        (this.db
          .prepare("SELECT created FROM requests WHERE id=? AND owner=?")
          .get(id, owner)?.created || this.now()),
    );
  }
  fail(owner, id, code, usage) {
    this.db
      .prepare(
        "UPDATE requests SET status='failed',error_code=?,usage=?,latency=? WHERE id=? AND owner=? AND status='pending'",
      )
      .run(
        code,
        usage ? JSON.stringify(usage) : null,
        this.elapsed(owner, id),
        id,
        owner,
      );
  }
  get(owner, id) {
    const r = this.db
      .prepare(
        "SELECT id,created,source,model,body,usage,latency FROM requests WHERE owner=? AND id=? AND status='complete'",
      )
      .get(owner, id);
    return r
      ? {
          id: r.id,
          createdAt: new Date(r.created).toISOString(),
          source: r.source,
          model: r.model,
          usage: r.usage ? JSON.parse(r.usage) : null,
          latencyMs: r.latency,
          ...JSON.parse(r.body),
        }
      : null;
  }
  list(owner) {
    return this.db
      .prepare(
        "SELECT id,created,source,model FROM requests WHERE owner=? AND status='complete' ORDER BY created DESC LIMIT 50",
      )
      .all(owner)
      .map((r) => ({
        id: r.id,
        createdAt: new Date(r.created).toISOString(),
        source: r.source,
        model: r.model,
      }));
  }
  stats(owner) {
    const rows = this.db
        .prepare(
          "SELECT status,source,usage,latency,created,error_code FROM requests WHERE owner=?",
        )
        .all(owner),
      sum = {
        requests: rows.length,
        completed: 0,
        failed: 0,
        pending: 0,
        geminiRequests: 0,
        fixtureRequests: 0,
        usageReported: 0,
        usageUnknown: 0,
        promptTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedTokens: 0,
        thoughtTokens: 0,
        totalLatencyMs: 0,
        today: 0,
        dailyLimit: this.daily,
      };
    const day = new Date(this.now()).toISOString().slice(0, 10);
    for (const r of rows) {
      sum[r.status === "complete" ? "completed" : r.status]++;
      sum[r.source === "gemini" ? "geminiRequests" : "fixtureRequests"]++;
      if (new Date(r.created).toISOString().startsWith(day)) sum.today++;
      sum.totalLatencyMs += r.latency || 0;
      if (r.source === "gemini") {
        if (r.usage) {
          const u = JSON.parse(r.usage);
          sum.usageReported++;
          for (const [k, v] of Object.entries({
            promptTokens: "promptTokenCount",
            outputTokens: "candidatesTokenCount",
            totalTokens: "totalTokenCount",
            cachedTokens: "cachedContentTokenCount",
            thoughtTokens: "thoughtsTokenCount",
          }))
            sum[k] += u[v] || 0;
        } else sum.usageUnknown++;
      }
    }
    return sum;
  }
  close() {
    this.db.close();
  }
}
function dataPath(dir, staticRoot) {
  if (!dir || !path.isAbsolute(dir))
    throw Error("AI_DATA_DIR сервердің абсолютті жеке қалтасы болуы тиіс.");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const real = fs.realpathSync(dir),
    root = fs.realpathSync(staticRoot);
  if (real === root || real.startsWith(root + path.sep))
    throw Error("AI_DATA_DIR сайттың жарияланатын қалтасында болмауы тиіс.");
  fs.chmodSync(real, 0o700);
  return path.join(real, "ai-drafts.sqlite");
}
module.exports = { Store, dataPath };
