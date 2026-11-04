/* Opt-in architecture preview. Existing lesson content is left intact. */
(function () {
  "use strict";
  function update() {
    const root = document.getElementById("lessonPage");
    if (
      !root?.querySelector(".lesson-title") ||
      root.querySelector("[data-modular-lesson]")
    )
      return;
    const p = new URLSearchParams(location.search),
      q = new URLSearchParams();
    for (const key of ["class", "subject", "quarter", "lesson"]) {
      if (!p.get(key)) return;
      q.set(key, p.get(key));
    }
    const link = document.createElement("a");
    link.href = "lesson-material.html?" + q;
    link.className = "action";
    link.dataset.modularLesson = "true";
    link.textContent = "Модульдік сабақ көрінісі (демо)";
    root.querySelector(".actions")?.append(link);
  }
  function start() {
    const root = document.getElementById("lessonPage");
    if (!root) return;
    new MutationObserver(update).observe(root, { childList: true });
    update();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
