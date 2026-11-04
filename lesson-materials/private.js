/* Local prototype only. Firestore policies are proposed separately; no cloud writes. */
(function (root) {
  "use strict";
  const M =
    typeof module !== "undefined"
      ? require("./model.js")
      : root.LessonMaterialsModel;
  class LocalHomework {
    constructor(storage, uid) {
      if (typeof uid !== "string" || !uid || uid.length > 200)
        throw Error("Firebase пайдаланушысы расталмаған.");
      this.storage = storage;
      this.uid = uid;
    }
    key(id) {
      M.parseId(id);
      return `iustaz-homework-v1:${encodeURIComponent(this.uid)}:${encodeURIComponent(id)}`;
    }
    read(id) {
      let raw;
      try {
        raw = this.storage.getItem(this.key(id));
      } catch {
        throw Error("Браузер сақтауы қолжетімсіз. Жеке дерек оқылмады.");
      }
      if (raw === null)
        return {
          schemaVersion: 1,
          ownerId: this.uid,
          lessonId: id,
          homeworkText: "",
          notes: "",
          revision: 0,
        };
      if (raw.length > 25000)
        throw Error("Жеке дерек көлемі жарамсыз. Бұрынғы дерек өзгермейді.");
      try {
        return M.privateDoc(JSON.parse(raw), this.uid, id);
      } catch {
        throw Error("Жеке дерек оқылмады. Бұрынғы дерек өзгертілмейді.");
      }
    }
    save(id, input, expectedRevision) {
      const old = this.read(id);
      if (old.revision !== expectedRevision)
        throw Error("Жеке тапсырма басқа қойындыда өзгерді. Қайта ашыңыз.");
      const next = M.privateDoc(
        {
          ...input,
          schemaVersion: 1,
          ownerId: this.uid,
          lessonId: id,
          revision: old.revision + 1,
        },
        this.uid,
        id,
      );
      try {
        this.storage.setItem(this.key(id), JSON.stringify(next));
      } catch {
        throw Error("Жеке тапсырма сақталмады. Браузер сақтауын тексеріңіз.");
      }
      return next;
    }
  }
  if (typeof module !== "undefined") module.exports = { LocalHomework };
  else root.LessonMaterialsPrivate = { LocalHomework };
})(typeof window !== "undefined" ? window : globalThis);
