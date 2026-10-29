```javascript
// ==========================================
// Math Teacher
// Main Script
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
// MAIN PAGE
// ==========================================

function renderClasses() {

  const container =
    document.getElementById("classGrid");

  if (!container) {
    return;
  }

  if (typeof curriculum === "undefined") {
    return;
  }

  container.innerHTML = "";

  Object.keys(curriculum).forEach(classId => {

    const classData =
      curriculum[classId];

    const card =
      document.createElement("a");

    card.href =
      `class.html?class=${classId}`;

    card.className =
      "class-card";

    card.innerHTML = `

      <div class="class-number">
        ${classId}
      </div>

      <div class="class-info">

        <h3>
          ${classData.title}
        </h3>

        <p>
          ${
            classData.subjects.length === 1
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
}


// ==========================================
// CLASS PAGE
// Сынып → Пән → Тоқсан
// ==========================================

function renderClassPageNew() {

  const container =
    document.getElementById("classPage");

  if (!container) {
    return;
  }

  if (typeof curriculum === "undefined") {
    return;
  }

  const classId =
    getClassId();

  if (!classId) {
    return;
  }

  const classData =
    curriculum[classId];

  if (!classData) {
    return;
  }


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
    document.getElementById(
      "subjectsContainer"
    );


  classData.subjects.forEach(
    subject => {

      const subjectBlock =
        document.createElement("div");

      subjectBlock.className =
        "subject-block";


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

            <h2>
              ${subject.title}
            </h2>

            <p>
              4 тоқсан
            </p>

          </div>

        </div>


        <div
          class="quarters-grid"
        ></div>

      `;


      const quartersGrid =
        subjectBlock.querySelector(
          ".quarters-grid"
        );


      subject.quarters.forEach(
        quarter => {

          const card =
            document.createElement("a");


          if (quarter.available) {

            card.href =
              `class.html?class=${classId}&subject=${subject.id}&quarter=${quarter.id}`;

            card.className =
              "quarter-card available";

          } else {

            card.href = "#";

            card.className =
              "quarter-card disabled";

            card.addEventListener(
              "click",
              event => {
                event.preventDefault();
              }
            );

          }


          card.innerHTML = `

            <span class="quarter-number">
              ${quarter.id}
            </span>

            <div>

              <strong>
                ${quarter.title}
              </strong>

              <small>
                ${
                  quarter.available
                    ? "Материалдар бар →"
                    : "Жақында қосылады"
                }
              </small>

            </div>

          `;


          quartersGrid.appendChild(card);

        }
      );


      subjectsContainer.appendChild(
        subjectBlock
      );

    }
  );

}


// ==========================================
// SUBJECT PAGE
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

  const classId =
    getClassId();

  const subjectId =
    getSubjectId();


  if (!classId || !subjectId) {
    return;
  }


  const classData =
    curriculum[classId];

  if (!classData) {
    return;
  }


  const subject =
    classData.subjects.find(
      item =>
        item.id === subjectId
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
        ${classData.title}
        бойынша тоқсанды таңдаңыз.
      </p>

    </div>


    <div
      class="quarter-grid"
      id="quarterGrid"
    ></div>

  `;


  const quarterGrid =
    document.getElementById(
      "quarterGrid"
    );


  subject.quarters.forEach(
    quarter => {

      const card =
        document.createElement("a");


      if (quarter.available) {

        card.href =
          `class.html?class=${classId}&subject=${subjectId}&quarter=${quarter.id}`;

        card.className =
          "quarter-card";

      } else {

        card.href = "#";

        card.className =
          "quarter-card disabled";

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

          <h3>
            ${quarter.title}
          </h3>

          <p>
            ${
              quarter.available
                ? "Материалдар бар →"
                : "Жақында қосылады"
            }
          </p>

        </div>

      `;


      quarterGrid.appendChild(card);

    }
  );

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


  const classId =
    getClassId();

  const subjectId =
    getSubjectId();

  const quarterId =
    getQuarterId();


  console.log(
    "QUARTER PAGE:",
    classId,
    subjectId,
    quarterId
  );


  if (
    classId !== "7" ||
    subjectId !== "algebra" ||
    quarterId !== "1"
  ) {

    console.log(
      "Quarter condition failed"
    );

    return;
  }


  if (
    typeof grade7AlgebraQ1 ===
      "undefined"
  ) {

    container.innerHTML = `

      <div class="admin-box">

        <h3>
          Мәлімет табылмады
        </h3>

        <p>
          grade7AlgebraQ1 табылмады.
        </p>

      </div>

    `;

    return;
  }


  const lessons =
    grade7AlgebraQ1.lessons;


  if (!lessons) {

    container.innerHTML = `

      <div class="admin-box">

        <h3>
          Сабақтар табылмады
        </h3>

      </div>

    `;

    return;
  }


  // ========================================
  // HEADER
  // ========================================

  container.innerHTML = `

    <a
      href="class.html?class=7&subject=algebra"
      class="back-link"
    >
      ← Алгебра
    </a>


    <div
      class="quarter-page-header"
    >

      <span
        class="quarter-page-badge"
      >
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
      id="quarterLessonList"
      class="quarter-lesson-list"
    ></div>

  `;


  // ========================================
  // LESSON LIST
  // ========================================

  const list =
    document.getElementById(
      "quarterLessonList"
    );


  lessons.forEach(
    lesson => {

      const card =
        document.createElement("a");


      card.href =
        `lesson.html?class=7&lesson=${lesson.id}`;


      card.className =
        "quarter-lesson-card";


      card.innerHTML = `

        <div
          class="quarter-lesson-number"
        >
          ${String(
            lesson.number
          ).padStart(2, "0")}
        </div>


        <div
          class="quarter-lesson-info"
        >

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


        <div
          class="quarter-lesson-arrow"
        >
          →
        </div>

      `;


      list.appendChild(card);

    }
  );

}


// ==========================================
// LESSON PAGE
// ==========================================

function renderLessonPage() {

  const container =
    document.getElementById(
      "lessonPage"
    );

  if (!container) {
    return;
  }


  const lessonId =
    getLessonId();


  if (
    typeof grade7AlgebraQ1 ===
      "undefined"
  ) {

    container.innerHTML = `
      <div class="admin-box">
        <h3>
          Сабақ табылмады
        </h3>
      </div>
    `;

    return;
  }


  const lesson =
    grade7AlgebraQ1.lessons.find(
      item =>
        String(item.id) ===
        String(lessonId)
    );


  if (!lesson) {

    container.innerHTML = `
      <div class="admin-box">

        <h3>
          Сабақ табылмады
        </h3>

        <p>
          Бұл сабақтың материалы
          әзірге жоқ.
        </p>

      </div>
    `;

    return;
  }


  const favorites =
    getFavorites();


  const isFavorite =
    favorites.includes(
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


      <h1>
        ${lesson.title}
      </h1>


      ${
        lesson.objective
          ? `
            <p>
              ${lesson.objective}
            </p>
          `
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
              Өткенді қайталау /
              Қызығушылықты ояту
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
              Үй тапсырмасы
            </span>
          </div>

        </div>

      </div>

    </div>

  `;
}


// ==========================================
// LESSON SECTION
// ==========================================

function renderLessonSection(
  title,
  content,
  emptyText
) {

  if (!content) {

    return `

      <div class="lesson-section">

        <h2>
          ${title}
        </h2>

        <p class="empty-content">
          ${emptyText}
        </p>

      </div>

    `;

  }


  if (
    typeof content === "object"
  ) {

    return `

      <div class="lesson-section">

        <h2>
          ${title}
        </h2>

        <pre class="lesson-text">
${JSON.stringify(
  content,
  null,
  2
)}
        </pre>

      </div>

    `;

  }


  return `

    <div class="lesson-section">

      <h2>
        ${title}
      </h2>

      <div class="lesson-text">
        ${content}
      </div>

    </div>

  `;

}


// ==========================================
// FAVORITES
// ==========================================

function getFavorites() {

  try {

    return (
      JSON.parse(
        localStorage.getItem(
          "mathTeacherFavorites"
        )
      ) || []
    );

  } catch (error) {

    return [];

  }

}


function saveFavorites(
  favorites
) {

  localStorage.setItem(
    "mathTeacherFavorites",
    JSON.stringify(
      favorites
    )
  );

}


function toggleFavorite(
  lessonId
) {

  const id =
    String(lessonId);

  let favorites =
    getFavorites();


  if (
    favorites.includes(id)
  ) {

    favorites =
      favorites.filter(
        item => item !== id
      );

  } else {

    favorites.push(id);

  }


  saveFavorites(
    favorites
  );


  updateFavoriteButton();

}


function updateFavoriteButton() {

  const button =
    document.getElementById(
      "favoriteButton"
    );

  if (!button) {
    return;
  }


  const lessonId =
    getLessonId();

  const favorites =
    getFavorites();


  button.innerHTML =
    favorites.includes(
      String(lessonId)
    )
      ? "⭐ Таңдаулыдан өшіру"
      : "☆ Таңдаулыға қосу";

}


// ==========================================
// INITIALIZATION
// ==========================================

function init() {

  console.log(
    "Math Teacher started"
  );


  const classId =
    getClassId();

  const subjectId =
    getSubjectId();

  const quarterId =
    getQuarterId();


  console.log(
    "URL:",
    classId,
    subjectId,
    quarterId
  );


  // lesson.html
  if (
    document.getElementById(
      "lessonPage"
    )
  ) {

    renderLessonPage();

    return;
  }


  // class.html
  if (
    document.getElementById(
      "classPage"
    )
  ) {

    if (
      classId &&
      subjectId &&
      quarterId
    ) {

      renderQuarterPage();

      return;
    }


    if (
      classId &&
      subjectId
    ) {

      renderSubjectPage();

      return;
    }


    if (classId) {

      renderClassPageNew();

      return;
    }

  }


  // index.html
  if (
    document.getElementById(
      "classGrid"
    )
  ) {

    renderClasses();

  }

}


// ==========================================
// START
// ==========================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();

}
```
