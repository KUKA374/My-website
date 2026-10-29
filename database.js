/*
  Math Teacher — shared lesson database layer.

  The site is currently hosted on GitHub Pages, so a real shared database
  cannot be written directly from the page without an external backend.
  This file prepares Firestore integration and keeps a local fallback until
  Firebase is configured.
*/

(function () {
  const LOCAL_KEY = "mathTeacherLessonMaterials";
  let firestore = null;

  function localRead() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function localWrite(data) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }

  function localGet(lessonId) {
    return localRead()[String(lessonId)] || null;
  }

  function localSave(lessonId, material) {
    const all = localRead();
    all[String(lessonId)] = material;
    localWrite(all);
    return material;
  }

  async function initFirebase() {
    if (typeof FIREBASE_CONFIGURED === "undefined" || !FIREBASE_CONFIGURED) return false;
    if (typeof firebase === "undefined") return false;

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    firestore = firebase.firestore();
    return true;
  }

  async function getLessonMaterial(lessonId) {
    if (await initFirebase()) {
      const snap = await firestore.collection("lessonMaterials").doc(String(lessonId)).get();
      return snap.exists ? snap.data() : null;
    }
    return localGet(lessonId);
  }

  async function saveLessonMaterial(lessonId, material) {
    if (await initFirebase()) {
      const payload = Object.assign({}, material, {
        lessonId: String(lessonId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await firestore.collection("lessonMaterials").doc(String(lessonId)).set(payload, { merge: true });
      return payload;
    }
    return localSave(lessonId, material);
  }

  async function getAllLessonMaterials() {
    if (await initFirebase()) {
      const snap = await firestore.collection("lessonMaterials").get();
      const result = {};
      snap.forEach(function (doc) { result[doc.id] = doc.data(); });
      return result;
    }
    return localRead();
  }

  window.MathTeacherDB = {
    isCloudConfigured: function () { return !!firestore || !!(typeof FIREBASE_CONFIGURED !== "undefined" && FIREBASE_CONFIGURED); },
    getLessonMaterial: getLessonMaterial,
    saveLessonMaterial: saveLessonMaterial,
    getAllLessonMaterials: getAllLessonMaterials
  };
})();
