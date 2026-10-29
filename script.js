// ==========================================
// MATH TEACHER
// ==========================================

// URL параметрлері
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
// БАСТЫ БЕТ — СЫНЫПТАР
// ==========================================

function renderClasses() {

  const classGrid = document.getElementById("classGrid");

  if (!classGrid) {
    return;
  }

  // curriculum бар ма?
  if (typeof curriculum === "undefined") {

    classGrid.innerHTML = `
      <div class="admin-box">
        <h3>Қате</h3>
        <p>Сыныптар туралы мәлімет жүктелмеді.</p>
      </div>
    `;

    console.error("curriculum табылмады");
    return;
  }

  // Ескі мәліметті тазалау
  classGrid.innerHTML = "";

  // 5, 6, 7, 8, 9, 10, 11
  Object.keys(curriculum).forEach(function(classId) {

    const classData = curriculum[classId];

    const card = document.createElement("a");

    card.href = "class.html?class=" + classId;

    card.className = "class-card";

    card.innerHTML = `
      <div class="class-number">
        ${classId}
      </div>

      <div class="class-info">
        <h3>${classData.title}</h3>

        <p>
          ${
            classId == "5" || classId == "6"
              ? "Математика"
              : "Алгебра және Геометрия"
          }
        </p>
      </div>

      <div class="class-arrow">
        →
      </div>
    `;

    classGrid.appendChild(card);

  });

}


// ==========================================
// ТАҢДАУЛЫ САБАҚТАР
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

    favorites = favorites.filter(function(item) {
      return item !== id;
    });

  } else {

    favorites.push(id);

  }

  saveFavorites(favorites);

  renderFavorites();

  updateFavoriteButton();

}


function updateFavoriteButton() {

  const button =
    document.getElementById("favoriteButton");

  if (!button) {
    return;
  }

  const lessonId = getLessonId();

  const favorites = getFavorites();

  if (favorites.includes(String(lessonId))) {

    button.innerHTML =
      "⭐ Таңдаулыдан өшіру";

  } else {

    button.innerHTML =
      "☆ Таңдаулыға қосу";

  }

}


// ==========================================
// СЫНЫП БЕТІ
// ==========================================

function renderClassPage() {

  const container =
    document.getElementById("classPage");

  if (!container) {
    return;
  }

  if (typeof curriculum === "undefined") {
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
        Пәнді таңдаңыз.
      </p>

    </div>

    <div
      class="subjects-container"
      id="subjectsContainer"
    ></div>

  `;

  const subjectsContainer =
    document.getElementById("subjectsContainer");


  classData.subjects.forEach(function(subject) {

    const subjectBlock =
      document.createElement("div");

    subjectBlock.className =
      "subject-block";


    let quartersHTML = "";

    subject.quarters.forEach(function(quarter) {

      if (quarter.available) {

        quartersHTML += `

          <a
            href="class.html?class=${classId}&subject=${subject.id}&quarter=${quarter.id}"
            class="quarter-card available"
          >

            <div class="quarter-number">
              ${quarter.id}
            </div>

            <div>

              <h3>
                ${quarter.title}
              </h3>

              <p class="available-label">
                Материалдар бар →
              </p>

            </div>

          </a>

        `;

      } else {

        quartersHTML += `

          <div class="quarter-card disabled">

            <div class="quarter-number">
              ${quarter.id}
            </div>

            <div>

              <h3>
                ${quarter.title}
              </h3>

              <p>
                Жақында қосылады
              </p>

            </div>

          </div>

        `;

      }

    });


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

      <div class="quarters-grid">

        ${quartersHTML}

      </div>

    `;


    subjectsContainer.appendChild(
      subjectBlock
    );

  });

}


// ==========================================
// 7-СЫНЫП АЛГЕБРА 1-ТОҚСАН
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
    typeof grade7AlgebraQ1 === "undefined"
  ) {

    container.innerHTML = `

      <div class="admin-box">

        <h3>
          Мәлімет табылмады
        </h3>

        <p>
          Сабақ мәліметтері жүктелмеді.
        </p>

      </div>

    `;

    return;
  }


  const lessons =
    grade7AlgebraQ1.lessons;


  container.innerHTML = `

    <a
      href="class.html?class=7"
      class="back-link"
    >
      ← 7-сынып
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


  const list =
    document.getElementById(
      "quarterLessonList"
    );


  lessons.forEach(function(lesson) {

    const card =
      document.createElement("a");

    card.href =
      `lesson.html?class=7&subject=algebra&quarter=1&lesson=${lesson.id}`;

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

      </div>

      <div class="quarter-lesson-arrow">
        →
      </div>

    `;


    list.appendChild(card);

  });

}


// ==========================================
// САБАҚ БЕТІ
// ==========================================

function renderLessonPage() {

  const container =
    document.getElementById("lessonPage");

  if (!container) {
    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined"
  ) {
    return;
  }

  const lessonId = getLessonId();

  const lesson =
    grade7AlgebraQ1.lessons.find(
      function(item) {
        return String(item.id) === String(lessonId);
      }
    );


  if (!lesson) {

    container.innerHTML = `
      <div class="admin-box">
        <h3>Сабақ табылмады</h3>
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
      ← Сабақтарға қайту
    </a>

    <div class="page-heading">

      <span class="badge">
        7-сынып • Алгебра • 1-тоқсан
      </span>

      <h1>
        ${lesson.title}
      </h1>

      <p>
        ${lesson.objective || ""}
      </p>

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
        lesson.lesson.explanation
      )}

      ${renderLessonSection(
        "👥 Жұптық жұмыс",
        lesson.lesson.pairWork
      )}

      ${renderLessonSection(
        "👨‍👩‍👧‍👦 Топтық жұмыс",
        lesson.lesson.groupWork
      )}

      ${renderLessonSection(
        "✏️ Жеке жұмыс",
        lesson.lesson.individualWork
      )}

      ${renderLessonSection(
        "🎮 Ойын",
        lesson.lesson.game
      )}

      ${renderLessonSection(
        "✅ Бағалау",
        lesson.lesson.assessment
      )}

      ${renderLessonSection(
        "🏠 Үй тапсырмасы",
        lesson.lesson.homework
      )}

    </div>

  `;

}


function renderLessonSection(title, content) {
  if (
    content === null ||
    content === undefined ||
    content === ""
  ) {
    return "";
  }

  if (typeof content === "string") {
    return `
      <section class="lesson-section">
        <h2>${title}</h2>
        <div class="lesson-text">
          ${content}
        </div>
      </section>
    `;
  }

  return `
    <section class="lesson-section">
      <h2>${title}</h2>
      <pre class="lesson-text">${JSON.stringify(
        content,
        null,
        2
      )}</pre>
    </section>
  `;
}

// ==========================================
// ІЗДЕУ
// ==========================================

function searchLessons() {

  const input =
    document.getElementById(
      "searchInput"
    );

  const resultsSection =
    document.getElementById(
      "searchResults"
    );

  const resultsList =
    document.getElementById(
      "searchResultsList"
    );


  if (!input) {
    return;
  }

  const query =
    input.value.trim().toLowerCase();


  if (!query) {
    return;
  }


  let results = [];


  if (
    typeof grade7AlgebraQ1 !== "undefined"
  ) {

    results =
      grade7AlgebraQ1.lessons.filter(
        function(lesson) {

          return (
            lesson.title
              .toLowerCase()
              .includes(query)
          );

        }
      );

  }


  if (resultsSection) {
    resultsSection.style.display = "block";
  }


  if (resultsList) {

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

    } else {

      resultsList.innerHTML =
        results.map(function(lesson) {

          return `

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

              </div>

              <div class="lesson-arrow">
                →
              </div>

            </a>

          `;

        }).join("");

    }

  }

}


// ==========================================
// ТАҢДАУЛЫЛАР
// ==========================================

function renderFavorites() {

  const container =
    document.getElementById(
      "favoritesList"
    );

  if (!container) {
    return;
  }

  if (
    typeof grade7AlgebraQ1 === "undefined"
  ) {
    return;
  }

  const favorites =
    getFavorites();


  const lessons =
    grade7AlgebraQ1.lessons.filter(
      function(lesson) {

        return favorites.includes(
          String(lesson.id)
        );

      }
    );


  if (lessons.length === 0) {

    return;

  }


  container.innerHTML =
    lessons.map(function(lesson) {

      return `

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

          </div>

          <div class="lesson-arrow">
            →
          </div>

        </a>

      `;

    }).join("");

}


// ==========================================
// БЕТТІ ІСКЕ ҚОСУ
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    console.log(
      "Math Teacher іске қосылды"
    );


    // Басты бет
    renderClasses();

    renderFavorites();


    const classId =
      getClassId();

    const subjectId =
      getSubjectId();

    const quarterId =
      getQuarterId();


    // Сабақ беті
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

      // 7-сынып + Алгебра + 1-тоқсан
      if (
        classId &&
        subjectId &&
        quarterId
      ) {

        renderQuarterPage();

        return;

      }


      // Сынып
      if (classId) {

        renderClassPage();

        return;

      }

    }

  }
);
