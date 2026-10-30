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
      if (typeof window.ensureFirebase === "function") await window.ensureFirebase();
      if (!window.MathTeacherDB) await loadScript("database.js");
    } catch (error) {
      console.warn("Cloud database loader failed; local storage remains available.", error);
      return;
    }

    const select = document.getElementById("lessonSelect");
    const saveButton = document.getElementById("saveMaterial");
    if (!select || !saveButton || !window.MathTeacherDB) return;

    const fields = ["videoUrl","theory","examples","commonMistakes","pairWork","groupWork","individualWork","game","assessment","homework"];
    const help = document.querySelector(".editor-help");
    const message = document.getElementById("saveMessage");

    function setMessage(text, ok) {
      if (!message) return;
      message.textContent = text;
      message.style.display = "block";
      message.style.background = ok ? "#ecfdf3" : "#fff7ed";
      message.style.color = ok ? "#166534" : "#9a3412";
    }

    async function cloudLoad() {
      if (help) help.textContent = "☁️ Материал жүктелуде...";
      const material = await window.MathTeacherDB.getLessonMaterial(select.value);
      fields.forEach(function (field) {
        const element = document.getElementById(field);
        if (element) element.value = material && material[field] ? material[field] : "";
      });
      if (help) help.textContent = window.MathTeacherDB.isCloudConfigured()
        ? "☁️ Firebase ортақ базасы қосылған. Бұл материалды барлық рөлдер көре алады."
        : "💾 Firebase қосылмаған: материал тек осы браузерде сақталады.";
    }

    select.addEventListener("change", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      cloudLoad().catch(function (error) { console.error(error); if (help) help.textContent = "⚠️ Материалды жүктеу мүмкін болмады."; });
    }, true);

    saveButton.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (saveButton.dataset.saving === "true") return;
      const material = {};
      fields.forEach(function (field) {
        const element = document.getElementById(field);
        material[field] = element ? element.value.trim() : "";
      });
      saveButton.dataset.saving = "true";
      saveButton.disabled = true;
      const oldText = saveButton.textContent;
      saveButton.textContent = "⏳ Сақталуда...";
      if (message) message.style.display = "none";
      try {
        await window.MathTeacherDB.saveLessonMaterial(select.value, material);
        setMessage(window.MathTeacherDB.isCloudConfigured() ? "☁️ Материал ортақ базаға сақталды!" : "💾 Материал осы браузерге сақталды.", true);
        if (help) help.textContent = window.MathTeacherDB.isCloudConfigured()
          ? "✓ Сақталды. Teacher аккаунты да осы материалды көре алады."
          : "💾 Firebase қосылмаған: материал тек осы браузерде сақталды.";
      } catch (error) {
        console.error(error);
        setMessage("⚠️ Материалды сақтау мүмкін болмады. Firebase баптауын тексеріңіз.", false);
      } finally {
        saveButton.dataset.saving = "false";
        saveButton.disabled = false;
        saveButton.textContent = oldText;
      }
    }, true);

    await cloudLoad();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
