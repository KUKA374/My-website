// ==========================================
// MATH TEACHER — ІЗДЕУ ЖҮЙЕСІ
// ==========================================

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ә/g, "а")
    .replace(/ғ/g, "г")
    .replace(/қ/g, "к")
    .replace(/ң/g, "н")
    .replace(/ө/g, "о")
    .replace(/ұ/g, "у")
    .replace(/ү/g, "у")
    .replace(/һ/g, "х")
    .replace(/і/g, "и")
    .trim();
}

function searchLessons() {
  const input = document.getElementById("searchInput");
  const resultsSection = document.getElementById("searchResults");
  const resultsList = document.getElementById("searchResultsList");

  if (!input || !resultsSection || !resultsList) return;

  const query = normalizeSearchText(input.value);

  resultsSection.style.display = "block";

  if (!query) {
    resultsList.innerHTML = `
      <div class="admin-box">
        <h3>Іздеу сөзін жазыңыз</h3>
        <p>Мысалы: дәреже, теңдеу, көпмүше немесе стандарт түрі.</p>
      </div>
    `;
    return;
  }

  const lessons = [];

  // Қазір қолжетімді нақты сабақтар: 7-сынып Алгебра, 1-тоқсан.
  if (typeof grade7AlgebraQ1 !== "undefined" && Array.isArray(grade7AlgebraQ1.lessons)) {
    grade7AlgebraQ1.lessons.forEach(function (lesson) {
      const searchableText = normalizeSearchText([
        lesson.title,
        lesson.objective,
        "7 сынып",
        "алгебра",
        "1 тоқсан"
      ].join(" "));

      if (searchableText.includes(query)) {
        lessons.push({
          lesson: lesson,
          classId: "7",
          subjectId: "algebra",
          quarterId: "1",
          subjectTitle: "Алгебра",
          quarterTitle: "1-тоқсан"
        });
      }
    });
  }

  if (lessons.length === 0) {
    resultsList.innerHTML = `
      <div class="admin-box">
        <h3>Нәтиже табылмады</h3>
        <p>«${input.value.trim()}» бойынша сабақ табылмады. Басқа сөзбен іздеп көріңіз.</p>
      </div>
    `;
    return;
  }

  resultsList.innerHTML = `
    <p style="margin:0 0 14px;color:#667085;">
      ${lessons.length} сабақ табылды
    </p>
    ${lessons.map(function (item) {
      const lesson = item.lesson;
      return `
        <a
          href="lesson.html?class=${item.classId}&subject=${item.subjectId}&quarter=${item.quarterId}&lesson=${lesson.id}"
          class="lesson-card"
        >
          <div class="lesson-number">${lesson.number}</div>
          <div class="lesson-info">
            <span style="font-size:13px;color:#667085;">${item.classId}-сынып • ${item.subjectTitle} • ${item.quarterTitle}</span>
            <h3>${lesson.title}</h3>
            ${lesson.objective ? `<p style="margin:6px 0 0;color:#667085;">${lesson.objective}</p>` : ""}
          </div>
          <div class="lesson-arrow">→</div>
        </a>
      `;
    }).join("")}
  `;
}

document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLessons();
    }
  });
});
