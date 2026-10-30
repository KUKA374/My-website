/* Shared database bridge for the Admin Panel. */
(function () {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "true") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = function () { script.dataset.loaded = "true"; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function boot() {
    try {
      // auth.js exposes ensureFirebase(), so wait until Auth + Firestore SDKs
      // are fully ready before loading the database wrapper.
      if (typeof window.ensureFirebase === "function") {
        await window.ensureFirebase();
      }

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
