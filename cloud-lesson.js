/* Load shared lesson content after the lesson page has rendered. */
(function () {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function boot() {
    try {
      await loadScript("firebase-config.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js");
      await loadScript("database.js");
    } catch (error) {
      console.warn("Cloud lesson loader unavailable.", error);
      return;
    }

    if (!window.MathTeacherDB || typeof grade7AlgebraQ1 === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("lesson");
    if (!lessonId) return;

    try {
      const material = await window.MathTeacherDB.getLessonMaterial(lessonId);
      if (!material) return;

      window.lessonContent = window.lessonContent || {};
      window.lessonContent[lessonId] = Object.assign({}, window.lessonContent[lessonId] || {}, material);

      if (typeof renderCompactLessonPage === "function") {
        renderCompactLessonPage();
      }
    } catch (error) {
      console.error("Unable to load shared lesson material", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
