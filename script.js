// ==========================================
// Math Teacher — Main Script
// ==========================================


// ---------- URL параметрлерін алу ----------

function getClassId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("class");
}

function getLessonId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lesson");
}

function getSubjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("subject");
}

function getQuarterId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("quarter");
}


// ==========================================
// Файлға сілтеме
// ==========================================

function fileLink(file, title) {
  if (!file) {
    return `<span class="empty-content">${title} әзірге қосылмаған</span>`;
  }

  return `
    <a href="${file}" target="_blank" class="button">
      ${title}
    </a>
  `;
}


// ==========================================
// Басты бет — сыныптарды көрсету
// ==========================================

function renderClasses() {
  const container = document.getElementById("classGrid");

  if (!container || typeof curriculum === "undefined") {
    return;
  }

  container.innerHTML = "";

  Object.keys(curriculum).forEach(classId => {
    const classData = curriculum[classId];

    const card = document.createElement("a");

    card.href = `class.html?class=${classId}`;
    card.className = "class-card";

    card.innerHTML = `
      <div class="class-number">${classId}</div>
      <div class="class-info">
        <h3>${classData.title}</h3>
        <p>
          ${classData.subjects.length === 1
            ? "Математика"
            : "Алгебра және Геометрия"}
        </p>
      </div>
      <div class="class-arrow">→</div>
    `;

    container.appendChild(card);
  });
}


// ==========================================
// Жаңа сынып беті
// Сынып → Пән
// ==========================================

function renderCurriculumClassPage() {
  const container = document.getElementById("classPage");

  if (!container || typeof curriculum === "undefined") {
    return;
  }

  const classId = getClassId();

  if (!classId || !curriculum[classId]) {
    return;
  }

  const classData = curriculum[classId];

  container.innerHTML = `
    <a href="index.html#classes" class="back-link">
      ← Сыныптарға қайту
    </a>

    <div class="page-heading">
      <span class="badge">${classData.title}</span>
      <h1>${classData.title}</h1>
      <p>Қажетті пәнді таңдаңыз.</p>
    </div>

    <div class="subject-grid" id="subjectGrid"></div>
  `;

  const subjectGrid = document.getElementById("subjectGrid");

  classData.subjects.forEach(subject => {
    const card = document.createElement("a");

    card.href =
      `class.html?class=${classId}&subject=${subject.id}`;

    card.className = "subject-card";

    const availableCount =
      subject.quarters.filter(q => q.available).length;

    card.innerHTML = `
      <div class="subject-icon">
        ${subject.id === "algebra" ? "📐" : "📏"}
      </div>

      <div>
        <h3>${subject.title}</h3>
        <p>4 тоқсан</p>
        ${
          availableCount > 0
            ? `<span class="available-label">
                ${availableCount} тоқсан дайын
              </span>`
            : ""
        }
      </div>

      <div class="class-arrow">→</div>
    `;

    subjectGrid.appendChild(card);
  });
}


// ==========================================
// Пән беті
// Пән → Тоқсан
// ==========================================

function renderSubjectPage() {
  const container = document.getElementById("classPage");

  if (!container || typeof curriculum === "undefined") {
    return;
  }

  const classId = getClassId();
  const subjectId = getSubjectId();

  if (
    !classId ||
    !subjectId ||
    !curriculum[classId]
  ) {
    return;
  }

  const classData = curriculum[classId];

  const subject = classData.subjects.find(
    item => item.id === subjectId
  );

  if (!subject) {
    return;
  }

  container.innerHTML = `
    <a href="class.html?class=${classId}" class="back-link">
      ← ${classData.title}
    </a>

    <div class="page-heading">
      <span class="badge">${subject.title}</span>
      <h1>${subject.title}</h1>
      <p>${classData.title} бойынша тоқсанды таңдаңыз.</p>
    </div>

    <div class="quarter-grid" id="quarterGrid"></div>
  `;

  const quarterGrid = document.getElementById("quarterGrid");

  subject.quarters.forEach(quarter => {
    const card = document.createElement("a");

    if (quarter.available) {
      card.href =
        `class.html?class=${classId}&subject=${subjectId}&quarter=${quarter.id}`;

      card.className = "quarter-card";
    } else {
      card.href = "javascript:void(0)";
      card.className = "quarter-card disabled";
    }

    card.innerHTML = `
      <div class="quarter-number">
        ${quarter.id}
      </div>

      <div>
        <h3>${quarter.title}</h3>

        ${
          quarter.available
            ? `<p class="available-label">Материалдар бар →</p>`
            : `<p>Жақында қосылады</p>`
        }
      </div>
    `;

    quarterGrid.appendChild(card);
  });
}


// ==========================================
// Тоқсан беті
// Тоқсан → Тақырыптар
// ==========================================

function renderQuarterPage() {
  const container = document.getElementById("classPage");

  if (!container) {
    return;
  }

  const classId = getClassId();
  const subjectId = getSubjectId();
  const quarterId = getQuarterId();

  if (
    classId !== "7" ||
    subjectId !== "algebra" ||
    quarterId !== "1"
  ) {
    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined" ||
    !grade7AlgebraQ1.lessons
  ) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>Материал табылмады</h3>
        <p>Бұл тоқсанның материалдары әзірге қосылмаған.</p>
      </div>
    `;

    return;
  }

  const lessons = grade7AlgebraQ1.lessons;

  container.innerHTML = `
    <a
      href="class.html?class=${classId}&subject=${subjectId}"
      class="back-link"
    >
      ← ${grade7AlgebraQ1.subject}
    </a>

    <div class="page-heading">
      <span class="badge">
        ${grade7AlgebraQ1.grade}-сынып •
        ${grade7AlgebraQ1.quarter}-тоқсан
      </span>

      <h1>
        ${grade7AlgebraQ1.subject}
      </h1>

      <p>
        ${lessons.length} сабақ
      </p>
    </div>

    <div class="lesson-list" id="lessonList"></div>
  `;

  const lessonList = document.getElementById("lessonList");

  lessons.forEach(lesson => {
    const card = document.createElement("a");

    card.href =
      `lesson.html?class=7&lesson=${lesson.id}`;

    card.className = "lesson-card";

    card.innerHTML = `
      <div class="lesson-number">
        ${lesson.number}
      </div>

      <div class="lesson-info">
        <h3>${lesson.title}</h3>

        ${
          lesson.objective
            ? `<p>${lesson.objective}</p>`
            : ""
        }
      </div>

      <div class="lesson-arrow">
        →
      </div>
    `;

    lessonList.appendChild(card);
  });
}


// ==========================================
// Ескі class жүйесі
// Басқа материалдар үшін сақталады
// ==========================================

function renderClassPage() {
  const container = document.getElementById("classPage");

  if (!container) {
    return;
  }

  // Егер жаңа curriculum жүйесі қолданылса,
  // ескі жүйені іске қоспаймыз.
  if (
    typeof curriculum !== "undefined" &&
    getClassId() &&
    curriculum[getClassId()]
  ) {
    return;
  }

  if (typeof classes === "undefined") {
    return;
  }

  const id = getClassId();

  const classData = classes.find(
    item => String(item.id) === String(id)
  );

  if (!classData) {
    return;
  }

  container.innerHTML = `
    <a href="index.html#classes" class="back-link">
      ← Артқа
    </a>

    <div class="page-heading">
      <span class="badge">${classData.title}</span>
      <h1>${classData.title}</h1>
      <p>${classData.description || ""}</p>
    </div>

    ${
      classData.textbook
        ? `
        <div class="admin-box">
          <h3>📚 Оқулық</h3>
          <p>${classData.textbook.title || ""}</p>
          ${
            classData.textbook.file
              ? fileLink(
                  classData.textbook.file,
                  "Оқулықты ашу"
                )
              : ""
          }
        </div>
        `
        : ""
    }

    <div class="lesson-list">
      ${
        (classData.topics || [])
          .map((topic, index) => `
            <div class="lesson-card">
              <div class="lesson-number">
                ${index + 1}
              </div>

              <div class="lesson-info">
                <h3>${topic.title}</h3>
                <p>${topic.objective || ""}</p>
              </div>
            </div>
          `)
          .join("")
      }
    </div>
  `;
}


// ==========================================
// 7-сыныптың ескі арнайы беті
// Қазір жаңа жүйе қолданылатындықтан
// тоқсан беті арқылы ашылады
// ==========================================

function renderNewGrade7Page() {
  // Бұл функция бұрынғы кодпен үйлесімді болу үшін
  // сақталып тұр.

  const container = document.getElementById("classPage");

  if (!container) {
    return;
  }

  const classId = getClassId();

  if (classId !== "7") {
    return;
  }

  // Жаңа curriculum жүйесі бар болса,
  // жаңа навигация қолданылады.
  if (typeof curriculum !== "undefined") {
    return;
  }
}


// ==========================================
// Сабақ беті
// ==========================================

function renderLessonPage() {
  const container = document.getElementById("lessonPage");

  if (!container) {
    return;
  }

  const lessonId = getLessonId();

  if (
    typeof grade7AlgebraQ1 === "undefined" ||
    !grade7AlgebraQ1.lessons
  ) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>Сабақ табылмады</h3>
      </div>
    `;

    return;
  }

  const lesson = grade7AlgebraQ1.lessons.find(
    item => String(item.id) === String(lessonId)
  );

  if (!lesson) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>Сабақ табылмады</h3>
        <p>Бұл сабақтың материалы әзірге жоқ.</p>
      </div>
    `;

    return;
  }

  const isFavorite = getFavorites().includes(
    String(lesson.id)
  );

  container.innerHTML = `
    <a
      href="class.html?class=7&subject=algebra&quarter=1"
      class="back-link"
    >
      ← 1-тоқсанға қайту
    </a>

    <div class="page-heading">
      <span class="badge">
        7-сынып • Алгебра • 1-тоқсан
      </span>

      <h1>${lesson.title}</h1>

      ${
        lesson.objective
          ? `<p>${lesson.objective}</p>`
          : ""
      }

      <button
        class="favorite-button"
        onclick="toggleFavorite('${lesson.id}')"
        id="favoriteButton"
      >
        ${isFavorite ? "⭐ Таңдаулыдан өшіру" : "☆ Таңдаулыға қосу"}
      </button>
    </div>

    <div class="lesson-content">

      ${renderLessonSection(
        "📄 ҚМЖ",
        lesson.kmj,
        "ҚМЖ әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "📚 Тақырыпты түсіндіру",
        lesson.lesson?.explanation,
        "Түсіндіру материалы әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "👥 Жұптық жұмыс",
        lesson.lesson?.pairWork,
        "Жұптық жұмыс әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "👨‍👩‍👧‍👦 Топтық жұмыс",
        lesson.lesson?.groupWork,
        "Топтық жұмыс әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "✏️ Жеке жұмыс",
        lesson.lesson?.individualWork,
        "Жеке жұмыс әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "🎮 Ойын",
        lesson.lesson?.game,
        "Ойын әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "✅ Бағалау",
        lesson.lesson?.assessment,
        "Бағалау материалы әзірге қосылмаған."
      )}

      ${renderLessonSection(
        "🏠 Үй тапсырмасы",
        lesson.lesson?.homework,
        "Үй тапсырмасы әзірге қосылмаған."
      )}

      <div class="lesson-section">
        <h2>⏱️ 45 минуттық сабақ жоспары</h2>

        <div class="timeline">

          <div class="timeline-item">
            <strong>00–05 мин</strong>
            <span>Ұйымдастыру</span>
          </div>

          <div class="timeline-item">
            <strong>05–10 мин</strong>
            <span>Өткенді қайталау / Қызығушылықты ояту</span>
          </div>

          <div class="timeline-item">
            <strong>10–20 мин</strong>
            <span>Жаңа тақырыпты түсіндіру</span>
          </div>

          <div class="timeline-item">
            <strong>20–28 мин</strong>
            <span>Жұптық жұмыс</span>
          </div>

          <div class="timeline-item">
            <strong>28–35 мин</strong>
            <span>Топтық жұмыс</span>
          </div>

          <div class="timeline-item">
            <strong>35–40 мин</strong>
            <span>Жеке жұмыс</span>
          </div>

          <div class="timeline-item">
            <strong>40–43 мин</strong>
            <span>Бағалау</span>
          </div>

          <div class="timeline-item">
            <strong>43–45 мин</strong>
            <span>Үй тапсырмасы</span>
          </div>

        </div>
      </div>

    </div>
  `;
}


// ==========================================
// Сабақ бөлімін жасау
// ==========================================

function renderLessonSection(title, content, emptyText) {
  if (!content) {
    return `
      <div class="lesson-section">
        <h2>${title}</h2>
        <p class="empty-content">
          ${emptyText}
        </p>
      </div>
    `;
  }

  if (typeof content === "object") {
    return `
      <div class="lesson-section">
        <h2>${title}</h2>
        <pre class="lesson-text">${JSON.stringify(
          content,
          null,
          2
        )}</pre>
      </div>
    `;
  }

  return `
    <div class="lesson-section">
      <h2>${title}</h2>
      <div class="lesson-text">
        ${content}
      </div>
    </div>
  `;
}


// ==========================================
// Іздеу
// ==========================================

function searchLessons() {
  const input = document.getElementById("searchInput");
  const resultsSection =
    document.getElementById("searchResults");
  const resultsList =
    document.getElementById("searchResultsList");

  if (
    !input ||
    !resultsSection ||
    !resultsList
  ) {
    return;
  }

  const query = input.value
    .trim()
    .toLowerCase();

  if (!query) {
    resultsSection.style.display = "none";
    return;
  }

  let results = [];

  if (
    typeof grade7AlgebraQ1 !== "undefined" &&
    grade7AlgebraQ1.lessons
  ) {
    results = grade7AlgebraQ1.lessons.filter(
      lesson =>
        lesson.title
          .toLowerCase()
          .includes(query) ||
        (
          lesson.objective || ""
        )
          .toLowerCase()
          .includes(query)
    );
  }

  resultsSection.style.display = "block";

  if (results.length === 0) {
    resultsList.innerHTML = `
      <div class="admin-box">
        <h3>Нәтиже табылмады</h3>
        <p>
          Басқа тақырып атауын жазып көріңіз.
        </p>
      </div>
    `;

    return;
  }

  resultsList.innerHTML = results
    .map(
      lesson => `
        <a
          href="lesson.html?class=7&lesson=${lesson.id}"
          class="lesson-card"
        >
          <div class="lesson-number">
            ${lesson.number}
          </div>

          <div class="lesson-info">
            <h3>${lesson.title}</h3>
            <p>${lesson.objective || ""}</p>
          </div>

          <div class="lesson-arrow">
            →
          </div>
        </a>
      `
    )
    .join("");

  resultsSection.scrollIntoView({
    behavior: "smooth"
  });
}


// ==========================================
// Enter арқылы іздеу
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const searchInput =
    document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          searchLessons();
        }
      }
    );
  }
});


// ==========================================
// Таңдаулылар
// ==========================================

function getFavorites() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "mathTeacherFavorites"
      )
    ) || [];
  } catch (error) {
    return [];
  }
}


function saveFavorites(favorites) {
  localStorage.setItem(
    "mathTeacherFavorites",
    JSON.stringify(favorites)
  );
}


function toggleFavorite(lessonId) {
  const id = String(lessonId);

  let favorites = getFavorites();

  if (favorites.includes(id)) {
    favorites = favorites.filter(
      item => item !== id
    );
  } else {
    favorites.push(id);
  }

  saveFavorites(favorites);

  updateFavoriteButton();
  renderFavorites();
}


function updateFavoriteButton() {
  const button =
    document.getElementById("favoriteButton");

  if (!button) {
    return;
  }

  const lessonId = getLessonId();

  const favorites = getFavorites();

  if (
    favorites.includes(String(lessonId))
  ) {
    button.innerHTML =
      "⭐ Таңдаулыдан өшіру";
  } else {
    button.innerHTML =
      "☆ Таңдаулыға қосу";
  }
}


function renderFavorites() {
  const container =
    document.getElementById("favoritesList");

  if (!container) {
    return;
  }

  const favorites = getFavorites();

  if (
    favorites.length === 0
  ) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>Әзірге таңдаулы сабақ жоқ</h3>

        <p>
          Ұнаған сабақтың ішінен ⭐ батырмасын
          басып, оны осы жерге сақтай аласыз.
        </p>
      </div>
    `;

    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined"
  ) {
    return;
  }

  const lessons =
    grade7AlgebraQ1.lessons.filter(
      lesson =>
        favorites.includes(
          String(lesson.id)
        )
    );

  if (lessons.length === 0) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>Таңдаулы сабақтар жоқ</h3>
      </div>
    `;

    return;
  }

  container.innerHTML = lessons
    .map(
      lesson => `
        <a
          href="lesson.html?class=7&lesson=${lesson.id}"
          class="lesson-card"
        >
          <div class="lesson-number">
            ${lesson.number}
          </div>

          <div class="lesson-info">
            <h3>${lesson.title}</h3>
            <p>${lesson.objective || ""}</p>
          </div>

          <div class="lesson-arrow">
            →
          </div>
        </a>
      `
    )
    .join("");
}


// ==========================================
// Барлық функцияларды іске қосу
// ==========================================

renderFavorites();

renderClasses();

const currentClassId = getClassId();
const currentSubjectId = getSubjectId();
const currentQuarterId = getQuarterId();

if (currentClassId && currentSubjectId && currentQuarterId) {
  renderQuarterPage();
} 
else if (currentClassId && currentSubjectId) {
  renderSubjectPage();
} 
else if (currentClassId) {
  renderCurriculumClassPage();
} 
else {
  renderClassPage();
}

renderLessonPage();
