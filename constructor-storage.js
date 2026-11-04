/* Local drafts only. The caller must supply a Firebase-verified owner UID. */
(function (root) {
  "use strict";
  const M =
    typeof module !== "undefined"
      ? require("./constructor-model.js")
      : root.LessonModel;
  const prefix = "math-ai-lessons-v2:";
  class Repository {
    constructor(storage, owner) {
      if (typeof owner !== "string" || !owner || owner.length > 200)
        throw Error("Сабақ иесі расталмаған.");
      this.storage = storage;
      this.owner = owner;
      this.key = prefix + encodeURIComponent(owner);
      this.state = this.read();
    }
    read() {
      let raw;
      try {
        raw = this.storage.getItem(this.key);
      } catch {
        throw Error("Браузер сақтауы қолжетімсіз.");
      }
      if (!raw)
        return {
          schemaVersion: 2,
          ownerId: this.owner,
          revision: 0,
          currentId: null,
          items: [],
        };
      try {
        if (raw.length > 5000000) throw Error();
        const x = JSON.parse(raw);
        if (
          x.schemaVersion !== 2 ||
          x.ownerId !== this.owner ||
          !Number.isSafeInteger(x.revision) ||
          x.revision < 0 ||
          !Array.isArray(x.items) ||
          x.items.length > 50 ||
          !(x.currentId === null || typeof x.currentId === "string")
        )
          throw Error();
        const ids = new Set();
        x.items = x.items.map((d) => {
          const valid = M.check(d, this.owner);
          if (ids.has(valid.id)) throw Error();
          ids.add(valid.id);
          return valid;
        });
        if (x.currentId !== null && !ids.has(x.currentId)) throw Error();
        return x;
      } catch {
        throw Error(
          "Сақталған кітапхана оқылмады. Бұрынғы дерек өзгертілмейді.",
        );
      }
    }
    write(next) {
      const current = this.read();
      if (current.revision !== this.state.revision)
        throw Error(
          "Басқа қойындыда өзгеріс бар. Өз жұмысыңызды көшірме ретінде сақтаңыз.",
        );
      next.revision = current.revision + 1;
      const raw = JSON.stringify(next);
      if (raw.length > 5000000)
        throw Error(
          "Кітапхана көлемі шекке жетті. Маңызды жоспарды PDF етіп сақтаңыз.",
        );
      try {
        this.storage.setItem(this.key, raw);
      } catch {
        throw Error(
          "Сақтау орындалмады. Жад толған не сақтау бұғатталған. Жоспарды көшіріңіз немесе PDF етіп сақтаңыз.",
        );
      }
      this.state = next;
      return M.clone(next);
    }
    list() {
      return M.clone(this.state.items);
    }
    get(id) {
      const d = this.state.items.find((x) => x.id === id);
      if (!d) throw Error("Сақталған сабақ табылмады.");
      return M.clone(d);
    }
    save(doc) {
      const valid = M.check(doc, this.owner),
        next = M.clone(this.state),
        i = next.items.findIndex((d) => d.id === valid.id);
      if (i < 0) {
        if (next.items.length >= 50)
          throw Error("Кітапханада ең көбі 50 сабақ сақталады.");
        next.items.push(valid);
      } else next.items[i] = valid;
      next.currentId = valid.id;
      this.write(next);
      return valid;
    }
    select(id) {
      this.get(id);
      const next = M.clone(this.state);
      next.currentId = id;
      this.write(next);
      return this.get(id);
    }
    remove(id) {
      this.get(id);
      const next = M.clone(this.state);
      next.items = next.items.filter((x) => x.id !== id);
      if (next.currentId === id) next.currentId = next.items[0]?.id || null;
      this.write(next);
    }
    reload() {
      this.state = this.read();
      return this.list();
    }
  }
  function legacy(raw, owner) {
    if (typeof raw !== "string" || raw.length > 500000)
      throw Error("Ескі сабақ пішімі жарамсыз.");
    let x;
    try {
      x = JSON.parse(raw);
    } catch {
      throw Error("Ескі сабақ оқылмады.");
    }
    if (
      !x ||
      Array.isArray(x) ||
      typeof x !== "object" ||
      !Object.values(x).every((v) => typeof v === "string")
    )
      throw Error("Ескі сабақ пішімі жарамсыз.");
    const d = M.create(owner),
      v = (k) => x[k] || "";
    d.title = v("lessonTitle") || "Ескі сабақ көшірмесі";
    Object.assign(d.meta, {
      grade: v("lessonGrade").replace(/-сынып/g, ""),
      subject: v("lessonSubject"),
      quarter: v("lessonQuarter").replace(/-тоқсан/g, ""),
      number: v("lessonNumber"),
      objective: v("lessonObjective"),
      goal: v("lessonGoal"),
    });
    const minutes = Number(v("lessonDuration"));
    if ([40, 45, 80].includes(minutes)) d.duration = minutes;
    for (const [k, type] of [
      ["lessonExplain", "text"],
      ["lessonExamples", "example"],
      ["lessonMistakes", "mistake"],
    ])
      if (v(k)) d.blocks.push({ id: M.id(), type, body: v(k), aux: "" });
    d.teacherNotes = [
      "lessonPair",
      "lessonGroup",
      "lessonIndividual",
      "lessonGame",
      "lessonAssessment",
      "lessonHomework",
    ]
      .filter((k) => v(k))
      .map(
        (k) =>
          ({
            lessonPair: "Жұптық жұмыс",
            lessonGroup: "Топтық жұмыс",
            lessonIndividual: "Жеке жұмыс",
            lessonGame: "Ойын",
            lessonAssessment: "Бағалау",
            lessonHomework: "Үй тапсырмасы",
          })[k] +
          ":\n" +
          v(k),
      )
      .join("\n\n");
    return M.check(d, owner);
  }
  const api = { Repository, legacy, prefix };
  if (typeof module !== "undefined") module.exports = api;
  else root.ConstructorStorage = api;
})(typeof window !== "undefined" ? window : globalThis);
