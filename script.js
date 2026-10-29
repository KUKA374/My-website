// ==========================================
// MATH TEACHER — MAIN SCRIPT
// ==========================================


// ==========================================
// URL PARAMETERS
// ==========================================

function getClassId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("class");
}

function getSubjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("subject");
}

function getQuarterId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("quarter");
}

function getLessonId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lesson");
}


// ==========================================
// FAVORITES
// ==========================================

function getFavorites() {
  try {
    return JSON.parse(
      localStorage.getItem("mathTeacherFavorites") || "[]"
    );
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
    favorites = favorites.filter(item => item !== id);
  } else {
    favorites.push(id);
  }

  saveFavorites(favorites);

  updateFavoriteButton();
  renderFavorites();
}

function updateFavoriteButton() {
  const button = document.getElementById("favoriteButton");

  if (!button) {
    return;
  }

  const lessonId = getLessonId();
  const favorites = getFavorites();

  if (favorites.includes(String(lessonId))) {
    button.innerHTML = "⭐ Таңдаулыдан өшіру";
  } else {
    button.innerHTML = "☆ Таңдаулыға қосу";
  }
}


// ==========================================
// MAIN PAGE
// Сыныптар
// ==========================================

function renderClasses() {
  const container = document.getElementById("classGrid");

  if (!container) {
    console.log("classGrid табылмады");
    return;
  }

  if (typeof curriculum === "undefined") {
    console.error("curriculum табылмады");
    return;
  }

  container.innerHTML = "";

  Object.keys(curriculum).forEach(classId => {
    const classData = curriculum[classId];

    const card = document.createElement("a");

    card.href = `class.html?class=${classId}`;
    card.className = "class-card";

    card.innerHTML = `
      <div class="class-number">
        ${classId}
      </div>

      <div class="class-info">
        <h3>${classData.title}</h3>

        <p>
          ${
            classId === "5" || classId === "6"
              ? "Математика"
              : "Алгебра және Геометрия"
          }
        </p>
      </div>

      <div class="class-arrow">
        →
      </div>
    `;

    container.appendChild(card);
  });

  console.log("Сыныптар шығарылды:", Object.keys(curriculum));
}

function renderCurriculumClassPage() {
  const container = document.getElementById("classPage");

  if (!container) {
    return;
  }

  if (typeof curriculum === "undefined") {
    console.error("curriculum табылмады");
    return;
  }

  const classId = getClassId();

  if (!classId || !curriculum[classId]) {
    return;
  }

  const classData = curriculum[classId];

  container.innerHTML = `
    <a
      href="index.html#classes"
      class="back-link"
    >
      ← Сыныптарға қайту
    </a>

    <div class="page-heading">
      <span class="badge">
        ${classData.title}
      </span>

      <h1>
        ${classData.title}
      </h1>

      <p>
        Пәнді және қажетті тоқсанды таңдаңыз.
      </p>
    </div>

    <div
      class="subjects-container"
      id="subjectsContainer"
    ></div>
  `;

  const subjectsContainer =
    document.getElementById("subjectsContainer");

  classData.subjects.forEach(subject => {
    const subjectBlock =
      document.createElement("div");

    subjectBlock.className = "subject-block";

    subjectBlock.innerHTML = `
      <div class="subject-header">
        <div class="subject-icon">
          ${
            subject.id === "algebra"
              ? "📐"
              : subject.id === "geometry"
              ? "📏"
              : "🔢"
          }
        </div>

        <div>
          <h2>${subject.title}</h2>
          <p>4 тоқсан</p>
        </div>
      </div>

      <div class="quarters-grid"></div>
    `;

    const quartersGrid =
      subjectBlock.querySelector(".quarters-grid");

    subject.quarters.forEach(quarter => {
      const quarterCard =
        document.createElement("a");

      if (quarter.available) {
        quarterCard.href =
          `class.html?class=${classId}&subject=${subject.id}&quarter=${quarter.id}`;

        quarterCard.className =
          "quarter-card available";
      } else {
        quarterCard.href = "#";

        quarterCard.className =
          "quarter-card disabled";

        quarterCard.addEventListener(
          "click",
          event => {
            event.preventDefault();
          }
        );
      }

      quarterCard.innerHTML = `
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

      quartersGrid.appendChild(quarterCard);
    });

    subjectsContainer.appendChild(subjectBlock);
  });
}


// ==========================================
// SUBJECT PAGE
// Пән → Тоқсан
// ==========================================

function renderSubjectPage() {
  const container =
    document.getElementById("classPage");

  if (!container) {
    return;
  }

  if (typeof curriculum === "undefined") {
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
    <a
      href="class.html?class=${classId}"
      class="back-link"
    >
      ← ${classData.title}
    </a>

    <div class="page-heading">
      <span class="badge">
        ${subject.title}
      </span>

      <h1>
        ${subject.title}
      </h1>

      <p>
        ${classData.title} бойынша тоқсанды таңдаңыз.
      </p>
    </div>

    <div
      class="quarter-grid"
      id="quarterGrid"
    ></div>
  `;

  const quarterGrid =
    document.getElementById("quarterGrid");

  subject.quarters.forEach(quarter => {
    const card =
      document.createElement("a");

    if (quarter.available) {
      card.href =
        `class.html?class=${classId}&subject=${subjectId}&quarter=${quarter.id}`;

      card.className = "quarter-card";
    } else {
      card.href = "#";
      card.className = "quarter-card disabled";

      card.addEventListener(
        "click",
        event => {
          event.preventDefault();
        }
      );
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
// QUARTER PAGE
// 7-сынып → Алгебра → 1-тоқсан
// ==========================================

function renderQuarterPage() {
  const container =
    document.getElementById("classPage");

  if (!container) {
    return;
  }

  const classId = getClassId();
  const subjectId = getSubjectId();
  const quarterId = getQuarterId();

  console.log(
    "Quarter page:",
    classId,
    subjectId,
    quarterId
  );

  if (
    classId !== "7" ||
    subjectId !== "algebra" ||
    quarterId !== "1"
  ) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>
          Материал әзірге жоқ
        </h3>

        <p>
          Бұл тоқсанның материалдары жақында қосылады.
        </p>
      </div>
    `;

    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined" ||
    !grade7AlgebraQ1.lessons
  ) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>
          Мәлімет табылмады
        </h3>

        <p>
          7-сынып Алгебра 1-тоқсан мәліметтері табылмады.
        </p>
      </div>
    `;

    return;
  }

  const lessons =
    grade7AlgebraQ1.lessons;

  container.innerHTML = `
    <a
      href="class.html?class=7&subject=algebra"
      class="back-link"
    >
      ← Алгебра
    </a>

    <div class="quarter-page-header">
      <span class="quarter-page-badge">
        7-сынып • Алгебра • 1-тоқсан
      </span>

      <h1>
        Алгебра
      </h1>

      <p>
        ${lessons.length} сабақ
      </p>
    </div>

    <div
      class="quarter-lesson-list"
      id="quarterLessonList"
    ></div>
  `;

  const lessonList =
    document.getElementById(
      "quarterLessonList"
    );

  lessons.forEach(lesson => {
    const card =
      document.createElement("a");

    card.href =
      `lesson.html?class=${classId}&subject=${subjectId}&quarter=${quarterId}&lesson=${lesson.id}`;

    card.className =
      "quarter-lesson-card";

    card.innerHTML = `
      <div class="quarter-lesson-number">
        ${String(lesson.number).padStart(2, "0")}
      </div>

      <div class="quarter-lesson-info">
        <h3>
          ${lesson.title}
        </h3>

        ${
          lesson.objective
            ? `
              <p>
                ${lesson.objective}
              </p>
            `
            : ""
        }
      </div>

      <div class="quarter-lesson-arrow">
        →
      </div>
    `;

    lessonList.appendChild(card);
  });
}


// ==========================================
// LESSON PAGE
// Сабақтың ішкі беті
// ==========================================

function renderLessonPage() {
  const container =
    document.getElementById("lessonPage");

  if (!container) {
    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined" ||
    !grade7AlgebraQ1.lessons
  ) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>
          Сабақтар табылмады
        </h3>

        <p>
          Сабақ мәліметтері жүктелмеді.
        </p>
      </div>
    `;

    return;
  }

  const lessonId = getLessonId();

  const lesson =
    grade7AlgebraQ1.lessons.find(
      item => String(item.id) === String(lessonId)
    );

  if (!lesson) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>
          Сабақ табылмады
        </h3>

        <p>
          Мұндай сабақ жоқ.
        </p>
      </div>
    `;

    return;
  }

  const favorites =
    getFavorites();

  const isFavorite =
    favorites.includes(String(lesson.id));

  container.innerHTML = `
    <a
      href="class.html?class=7&subject=algebra&quarter=1"
      class="back-link"
    >
      ← Сабақтарға қайту
    </a>

    <div class="page-heading">
      <span class="badge">
        7-сынып • Алгебра • 1-тоқсан
      </span>

      <h1>
        ${lesson.title}
      </h1>

      ${
        lesson.objective
          ? `<p>${lesson.objective}</p>`
          : ""
      }

      <button
        id="favoriteButton"
        class="favorite-button"
        onclick="toggleFavorite('${lesson.id}')"
      >
        ${
          isFavorite
            ? "⭐ Таңдаулыдан өшіру"
            : "☆ Таңдаулыға қосу"
        }
      </button>
    </div>

    <div class="lesson-content">

      ${renderLessonSection(
        "📚 Тақырыпты түсіндіру",
        lesson.lesson?.explanation
      )}

      ${renderLessonSection(
        "👥 Жұптық жұмыс",
        lesson.lesson?.pairWork
      )}

      ${renderLessonSection(
        "👨‍👩‍👧‍👦 Топтық жұмыс",
        lesson.lesson?.groupWork
      )}

      ${renderLessonSection(
        "✏️ Жеке жұмыс",
        lesson.lesson?.individualWork
      )}

      ${renderLessonSection(
        "🎮 Ойын",
        lesson.lesson?.game
      )}

      ${renderLessonSection(
        "✅ Бағалау",
        lesson.lesson?.assessment
      )}

      ${renderLessonSection(
        "🏠 Үй тапсырмасы",
        lesson.lesson?.homework
      )}

      <div class="lesson-section">
        <h2>
          ⏱️ 45 минуттық сабақ жоспары
        </h2>

        <div class="timeline">

          <div class="timeline-item">
            <strong>00–05 мин</strong>
            <span>Ұйымдастыру</span>
          </div>

          <div class="timeline-item">
            <strong>05–10 мин</strong>
            <span>
              Өткенді қайталау / Қызығушылықты ояту
            </span>
          </div>

          <div class="timeline-item">
            <strong>10–20 мин</strong>
            <span>
              Жаңа тақырыпты түсіндіру
            </span>
          </div>

          <div class="timeline-item">
            <strong>20–28 мин</strong>
            <span>
              Жұптық жұмыс
            </span>
          </div>

          <div class="timeline-item">
            <strong>28–35 мин</strong>
            <span>
              Топтық жұмыс
            </span>
          </div>

          <div class="timeline-item">
            <strong>35–40 мин</strong>
            <span>
              Жеке жұмыс
            </span>
          </div>

          <div class="timeline-item">
            <strong>40–43 мин</strong>
            <span>
              Бағалау
            </span>
          </div>

          <div class="timeline-item">
            <strong>43–45 мин</strong>
            <span>
              Үй тапсырмасын беру
            </span>
          </div>

        </div>
      </div>

    </div>
  `;

  updateFavoriteButton();
}


// ==========================================
// LESSON SECTION
// ==========================================

function renderLessonSection(title, content) {
  if (
    content === null ||
    content === undefined ||
    content === ""
  ) {
    return `
      <div class="lesson-section">
        <h2>${title}</h2>

        <p class="empty-content">
          Бұл бөлім әзірге қосылмаған.
        </p>
      </div>
    `;
  }

  if (typeof content === "string") {
    return `
      <div class="lesson-section">
        <h2>${title}</h2>

        <div class="lesson-text">
          ${content}
        </div>
      </div>
    `;
  }

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


// ==========================================
// SEARCH
// ==========================================

function searchLessons() {
  const input =
    document.getElementById("searchInput");

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

  const query =
    input.value.trim().toLowerCase();

  if (!query) {
    resultsSection.style.display = "none";
    return;
  }

  let results = [];

  if (
    typeof grade7AlgebraQ1 !== "undefined" &&
    grade7AlgebraQ1.lessons
  ) {
    results =
      grade7AlgebraQ1.lessons.filter(
        lesson =>
          lesson.title
            .toLowerCase()
            .includes(query) ||

          (lesson.objective || "")
            .toLowerCase()
            .includes(query)
      );
  }

  resultsSection.style.display = "block";

  if (results.length === 0) {
    resultsList.innerHTML = `
      <div class="admin-box">
        <h3>
          Нәтиже табылмады
        </h3>

        <p>
          Басқа тақырып атауын жазып көріңіз.
        </p>
      </div>
    `;

    return;
  }

  resultsList.innerHTML =
    results
      .map(
        lesson => `
          <a
            href="lesson.html?class=7&subject=algebra&quarter=1&lesson=${lesson.id}"
            class="lesson-card"
          >

            <div class="lesson-number">
              ${lesson.number}
            </div>

            <div class="lesson-info">
              <h3>
                ${lesson.title}
              </h3>

              <p>
                ${lesson.objective || ""}
              </p>
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
// ENTER → SEARCH
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
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
  }
);


// ==========================================
// FAVORITES PAGE
// ==========================================

function renderFavorites() {
  const container =
    document.getElementById("favoritesList");

  if (!container) {
    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined" ||
    !grade7AlgebraQ1.lessons
  ) {
    return;
  }

  const favorites =
    getFavorites();

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
        <h3>
          Әзірге таңдаулы сабақ жоқ
        </h3>

        <p>
          Ұнаған сабақтың ішінен ⭐ батырмасын басып,
          оны осы жерге сақтай аласыз.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    lessons
      .map(
        lesson => `
          <a
            href="lesson.html?class=7&subject=algebra&quarter=1&lesson=${lesson.id}"
            class="lesson-card"
          >

            <div class="lesson-number">
              ${lesson.number}
            </div>

            <div class="lesson-info">
              <h3>
                ${lesson.title}
              </h3>

              <p>
                ${lesson.objective || ""}
              </p>
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
// INITIALIZATION
// ==========================================

function initPage() {

  console.log("Math Teacher started");

  // Басты бет
  renderClasses();

  renderFavorites();

  const classId = getClassId();
  const subjectId = getSubjectId();
  const quarterId = getQuarterId();

  // ----------------------------------------
  // Сабақ беті
  // ----------------------------------------

  if (
    document.getElementById("lessonPage")
  ) {
    renderLessonPage();
    return;
  }

  // ----------------------------------------
  // class.html
  // ----------------------------------------

  if (
    document.getElementById("classPage")
  ) {

    // Сынып + пән + тоқсан
    if (
      classId &&
      subjectId &&
      quarterId
    ) {
      renderQuarterPage();
      return;
    }

    // Сынып + пән
    if (
      classId &&
      subjectId
    ) {
      renderSubjectPage();
      return;
    }

    // Тек сынып
    if (classId) {
      renderCurriculumClassPage();
      return;
    }
  }
}


// ==========================================
// START
// ==========================================

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initPage
  );
} else {
  initPage();
}
