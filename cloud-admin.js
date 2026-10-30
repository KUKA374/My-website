/* Shared database bridge for the Admin Panel. */
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
      // auth.js already initializes Firebase for this page.
      // Only load the database wrapper here to avoid declaring FIREBASE_CONFIG
      // and the Firebase SDK more than once.
      if (!window.MathTeacherDB) {
        await loadScript("database.js");
      }
    } catch (error) {
      console.warn("Cloud database loader failed; local storage remains available.", error);
      return;
    }

    const select = document.getElementById("lessonSelect");
    const saveButton = document.getElementById("saveMaterial");
    if (!select || !saveButton || !window.MathTeacherDB) return;

    const fields = ["videoUrl","theory","examples","commonMistakes","pairWork","groupWork","individualWork","game","assessment","homework"];

    async function cloudLoad() {
      const material = await window.MathTeacherDB.getLessonMaterial(select.value);
      if (!material) return;
      fields.forEach(function (field) {
        const element = document.getElementById(field);
        if (element) element.value = material[field] || "";
      });
      if (typeof updateStatus === "function") updateStatus();
      const help = document.querySelector(".editor-help");
      if (help && window.MathTeacherDB.isCloudConfigured()) {
        help.textContent = "☁️ Материал ортақ Firebase Database-тан жүктелді. Admin енгізген өзгеріс басқа қолданушыларға да беріледі.";
      }
    }

    select.addEventListener("change", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      cloudLoad().catch(console.error);
    }, true);

    saveButton.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const material = {};
      fields.forEach(function (field) {
        const element = document.getElementById(field);
        material[field] = element ? element.value.trim() : "";
      });
      try {
        await window.MathTeacherDB.saveLessonMaterial(select.value, material);
        const msg = document.getElementById("saveMessage");
        if (msg) {
          msg.textContent = window.MathTeacherDB.isCloudConfigured()
            ? "☁️ Материал ортақ базаға сақталды."
            : "💾 Firebase әлі қосылмаған, сондықтан материал осы браузерде сақталды.";
          msg.style.display = "block";
          setTimeout(function () { msg.style.display = "none"; }, 3500);
        }
        if (typeof updateStatus === "function") updateStatus();
      } catch (error) {
        console.error(error);
        alert("Материалды сақтау кезінде қате шықты. Firebase баптауын тексеріңіз.");
      }
    }, true);

    await cloudLoad();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
