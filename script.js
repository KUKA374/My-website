// ============================================
// CLASS ID
// ============================================

function getClassId() {
  return Number(
    new URLSearchParams(location.search).get("class")
  );
}


// ============================================
// LESSON ID
// ============================================

function getLessonId() {
  return new URLSearchParams(location.search).get("lesson");
}


// ============================================
// БАСТЫ БЕТТЕГІ СЫНЫПТАР
// ============================================

function renderClasses() {

  const grid = document.getElementById("classGrid");

  if (!grid) return;


  grid.innerHTML = classes.map(item => `

    <a
      class="class-card"
      href="class.html?class=${item.id}"
    >

      <div class="class-number">
        ${item.id}
      </div>

      <div>

        <h3>
          ${item.title}
        </h3>

        <p>
          ${item.description}
        </p>

        <span>
          Материалдарды ашу →
        </span>

      </div>

    </a>

  `).join("");
}


// ============================================
// ФАЙЛ БАТЫРМАСЫ
// ============================================

function fileLink(file, label) {

  if (!file) {

    return `
      <span class="empty-file">
        Файл әзірге қосылмаған
      </span>
    `;

  }


  return `

    <a
      class="button small"
      href="${file}"
      target="_blank"
    >
      ${label}
    </a>

  `;
}


// ============================================
// 7-СЫНЫП АЛГЕБРА 1-ТОҚСАН
// ============================================

function renderNewGrade7Page() {

  const page =
    document.getElementById("classPage");

  if (!page) return;


  if (
    typeof grade7AlgebraQ1 === "undefined"
  ) {

    page.innerHTML = `

      <div class="admin-box">

        <h1>
          Деректер табылмады
        </h1>

        <p>
          7-сыныптың Алгебра деректер
          файлы қосылмаған.
        </p>

      </div>

    `;

    return;
  }


  const current =
    grade7AlgebraQ1;


  page.innerHTML = `

    <div class="page-heading">

      <span class="badge">
        ${current.grade}
      </span>

      <h1>
        ${current.subject}
      </h1>

      <p>
        ${current.quarter}
      </p>

    </div>


    <div class="resource-row">


      <!-- ОҚУЛЫҚ -->

      <div class="resource-card">

        <div class="feature-icon">
          📚
        </div>

        <h3>
          Оқулық
        </h3>

        <p>
          ${current.textbook.title}
        </p>

        ${fileLink(
          current.textbook.file,
          "Оқулықты ашу"
        )}

      </div>


      <!-- КТП -->

      <div class="resource-card">

        <div class="feature-icon">
          📅
        </div>

        <h3>
          КТП
        </h3>

        <p>
          ${current.quarter} бойынша
          ${current.lessons.length} сабақ.
        </p>

        <p>
          Апталық жүктеме:
          ${current.weeklyHours} сағат
        </p>

      </div>

    </div>


    <h2 class="topic-title">
      КТП бойынша тақырыптар
    </h2>


    <div class="topic-list">

      ${current.lessons.map(lesson => `

        <a
          class="topic-card"
          href="lesson.html?class=7&lesson=${lesson.id}"
          style="
            text-decoration: none;
            color: inherit;
            display: block;
          "
        >

          <div class="topic-top">

            <span class="topic-number">
              ${lesson.number}
            </span>

            <div>

              <h3>
                ${lesson.title}
              </h3>

              <p>
                <strong>
                  Оқу мақсаты:
                </strong>

                ${lesson.objective}
              </p>

            </div>

          </div>


          <div
            style="
              margin-top: 15px;
              font-weight: 600;
            "
          >
            Сабақты ашу →
          </div>

        </a>

      `).join("")}

    </div>

  `;
}


// ============================================
// ЕСКІ СЫНЫПТАРДЫ КӨРСЕТУ
// ============================================

function renderClassPage() {

  const page =
    document.getElementById("classPage");

  if (!page) return;


  const id =
    getClassId();


  // 7-сыныптың жаңа жүйесі

  if (
    id === 7 &&
    typeof grade7AlgebraQ1 !== "undefined"
  ) {

    renderNewGrade7Page();

    return;
  }


  // Ескі жүйе

  const current =
    classes.find(
      item => item.id === id
    );


  if (!current) {

    page.innerHTML = `

      <div class="admin-box">

        <h1>
          Сынып табылмады
        </h1>

        <a
          class="button"
          href="index.html"
        >
          Басты бетке қайту
        </a>

      </div>

    `;

    return;
  }


  page.innerHTML = `

    <div class="page-heading">

      <span class="badge">
        ${current.title}
      </span>

      <h1>
        ${current.description}
      </h1>

      <p>
        Оқулық, КТП тақырыптары,
        ҚМЖ және 45 минуттық сабақ
        материалдары.
      </p>

    </div>


    <div class="resource-row">


      <div class="resource-card">

        <div class="feature-icon">
          📚
        </div>

        <h3>
          Оқулық
        </h3>

        <p>
          ${current.textbook.title}
        </p>

        ${fileLink(
          current.textbook.file,
          "Оқулықты ашу"
        )}

      </div>


      <div class="resource-card">

        <div class="feature-icon">
          📅
        </div>

        <h3>
          КТП
        </h3>

        <p>
          Бұл жерге осы сыныптың
          КТП файлын кейін қосасыз.
        </p>

        <span class="empty-file">
          Файл әзірге қосылмаған
        </span>

      </div>

    </div>


    <h2 class="topic-title">
      КТП бойынша тақырыптар
    </h2>


    <div class="topic-list">

      ${current.topics.map(
        (topic, index) => `

        <article class="topic-card">

          <div class="topic-top">

            <span class="topic-number">
              ${index + 1}
            </span>

            <div>

              <h3>
                ${topic.title}
              </h3>

              <p>
                <strong>
                  Оқу мақсаты:
                </strong>

                ${topic.objective}
              </p>

            </div>

          </div>


          <div class="topic-grid">


            <div>

              <h4>
                📝 ҚМЖ
              </h4>

              <p>
                ${topic.kmj.title}
              </p>

              ${fileLink(
                topic.kmj.file,
                "ҚМЖ-ны ашу"
              )}

            </div>


            <div>

              <h4>
                👨‍🏫 Түсіндіру
              </h4>

              <p>
                ${topic.lesson.explanation}
              </p>

            </div>


            <div>

              <h4>
                👥 Жұптық жұмыс
              </h4>

              <p>
                ${topic.lesson.pairWork}
              </p>

            </div>


            <div>

              <h4>
                🎮 Ойын
              </h4>

              <p>
                ${topic.lesson.game}
              </p>

            </div>


            <div>

              <h4>
                🏠 Үй тапсырмасы
              </h4>

              <p>
                ${topic.lesson.homework}
              </p>

            </div>


          </div>

        </article>

      `
      ).join("")}

    </div>

  `;
}


// ============================================
// ЖЕКЕ САБАҚ БЕТІ
// ============================================

function renderLessonPage() {

  const page =
    document.getElementById("lessonPage");

  if (!page) return;


  const lessonId =
    getLessonId();


  // Деректерді тексеру

  if (
    typeof grade7AlgebraQ1 === "undefined"
  ) {

    page.innerHTML = `

      <div class="admin-box">

        <h1>
          Деректер табылмады
        </h1>

      </div>

    `;

    return;
  }


  // Сабақты табу

  const lesson =
    grade7AlgebraQ1.lessons.find(
      item =>
        String(item.id) ===
        String(lessonId)
    );


  // Сабақ табылмаса

  if (!lesson) {

    page.innerHTML = `

      <div class="admin-box">

        <h1>
          Сабақ табылмады
        </h1>

        <a
          class="button"
          href="class.html?class=7"
        >
          ← Тақырыптарға қайту
        </a>

      </div>

    `;

    return;
  }


  // ========================================
  // САБАҚТЫ КӨРСЕТУ
  // ========================================

  page.innerHTML = `

    <div class="page-heading">


      <!-- АРТҚА -->

      <a
        href="class.html?class=7"
        style="
          display: inline-block;
          margin-bottom: 20px;
          text-decoration: none;
        "
      >
        ← Тақырыптарға қайту
      </a>


      <!-- СЫНЫП -->

      <span class="badge">
        ${grade7AlgebraQ1.grade}
      </span>


      <!-- ТАҚЫРЫП -->

      <h1>
        ${lesson.number}.
        ${lesson.title}
      </h1>


      <!-- ОҚУ МАҚСАТЫ -->

      <p>

        <strong>
          Оқу мақсаты:
        </strong>

        ${lesson.objective}

      </p>


      <!-- ⭐ ТАҢДАУЛЫ -->

      <button
        id="favoriteButton"
        class="button"
        onclick="
          toggleFavorite('${lesson.id}')
        "
        style="
          margin-top: 15px;
        "
      >
        ☆ Таңдаулыға қосу
      </button>


    </div>


    <!-- ================================= -->
    <!-- САБАҚ МАТЕРИАЛДАРЫ -->
    <!-- ================================= -->

    <div class="topic-grid">


      <!-- ҚМЖ -->

      <div class="resource-card">

        <div class="feature-icon">
          📝
        </div>

        <h3>
          ҚМЖ
        </h3>


        ${
          lesson.kmj
            ? `

              <p>
                ${lesson.kmj.title}
              </p>

              ${fileLink(
                lesson.kmj.file,
                "ҚМЖ ашу"
              )}

            `
            : `

              <p>
                Бұл тақырыпқа ҚМЖ
                әзірге қосылмаған.
              </p>

              <span class="empty-file">
                ҚМЖ әзірге қосылмаған
              </span>

            `
        }

      </div>


      <!-- ТҮСІНДІРУ -->

      <div class="resource-card">

        <div class="feature-icon">
          👨‍🏫
        </div>

        <h3>
          Тақырыпты түсіндіру
        </h3>


        ${
          lesson.lesson.explanation
            ? `

              <p>
                ${lesson.lesson.explanation}
              </p>

            `
            : `

              <p class="empty-file">
                Түсіндіру материалы
                әзірге қосылмаған.
              </p>

            `
        }

      </div>


      <!-- ЖҰПТЫҚ ЖҰМЫС -->

      <div class="resource-card">

        <div class="feature-icon">
          👥
        </div>

        <h3>
          Жұптық жұмыс
        </h3>


        ${
          lesson.lesson.pairWork
            ? `

              <p>
                ${lesson.lesson.pairWork}
              </p>

            `
            : `

              <p class="empty-file">
                Жұптық жұмыс
                әзірге қосылмаған.
              </p>

            `
        }

      </div>


      <!-- ТОПТЫҚ ЖҰМЫС -->

      <div class="resource-card">

        <div class="feature-icon">
          👨‍👩‍👧‍👦
        </div>

        <h3>
          Топтық жұмыс
        </h3>


        ${
          lesson.lesson.groupWork
            ? `

              <p>
                ${lesson.lesson.groupWork}
              </p>

            `
            : `

              <p class="empty-file">
                Топтық жұмыс
                әзірге қосылмаған.
              </p>

            `
        }

      </div>


      <!-- ЖЕКЕ ТАПСЫРМА -->

      <div class="resource-card">

        <div class="feature-icon">
          ✏️
        </div>

        <h3>
          Жеке тапсырма
        </h3>


        ${
          lesson.lesson.individualWork
            ? `

              <p>
                ${lesson.lesson.individualWork}
              </p>

            `
            : `

              <p class="empty-file">
                Жеке тапсырма
                әзірге қосылмаған.
              </p>

            `
        }

      </div>


      <!-- ОЙЫН -->

      <div class="resource-card">

        <div class="feature-icon">
          🎮
        </div>

        <h3>
          Ойын
        </h3>


        ${
          lesson.lesson.game
            ? `

              <p>
                ${lesson.lesson.game}
              </p>

            `
            : `

              <p class="empty-file">
                Ойын әзірге
                қосылмаған.
              </p>

            `
        }

      </div>


      <!-- БАҒАЛАУ -->

      <div class="resource-card">

        <div class="feature-icon">
          ✅
        </div>

        <h3>
          Бағалау
        </h3>


        ${
          lesson.lesson.assessment
            ? `

              <p>
                ${lesson.lesson.assessment}
              </p>

            `
            : `

              <p class="empty-file">
                Бағалау материалы
                әзірге қосылмаған.
              </p>

            `
        }

      </div>


      <!-- ҮЙ ТАПСЫРМАСЫ -->

      <div class="resource-card">

        <div class="feature-icon">
          🏠
        </div>

        <h3>
          Үй тапсырмасы
        </h3>


        ${
          lesson.lesson.homework
            ? `

              <p>
                ${lesson.lesson.homework}
              </p>

            `
            : `

              <p class="empty-file">
                Үй тапсырмасы
                әзірге қосылмаған.
              </p>

            `
        }

      </div>


    </div>


    <!-- ================================= -->
    <!-- 45 МИНУТТЫҚ САБАҚ -->
    <!-- ================================= -->

    <div
      class="resource-card"
      style="
        margin-top: 30px;
      "
    >

      <div class="feature-icon">
        ⏱️
      </div>

      <h2>
        45 минуттық сабақ
      </h2>

      <p>
        Бұл бөлімде кейін осы тақырыпқа
        арналған толық сабақ сценарийі
        көрсетіледі.
      </p>


      <div
        style="
          margin-top: 20px;
        "
      >

        <p>
          <strong>
            00–05 мин
          </strong>
          — Ұйымдастыру
        </p>

        <p>
          <strong>
            05–10 мин
          </strong>
          — Қызығушылықты ояту
        </p>

        <p>
          <strong>
            10–20 мин
          </strong>
          — Тақырыпты түсіндіру
        </p>

        <p>
          <strong>
            20–28 мин
          </strong>
          — Жұптық жұмыс
        </p>

        <p>
          <strong>
            28–35 мин
          </strong>
          — Топтық жұмыс
        </p>

        <p>
          <strong>
            35–40 мин
          </strong>
          — Жеке тапсырма
        </p>

        <p>
          <strong>
            40–43 мин
          </strong>
          — Бағалау
        </p>

        <p>
          <strong>
            43–45 мин
          </strong>
          — Үй тапсырмасы
        </p>

      </div>

    </div>


    <!-- АРТҚА БАТЫРМАСЫ -->

    <div
      style="
        margin-top: 30px;
        margin-bottom: 40px;
      "
    >

      <a
        class="button"
        href="class.html?class=7"
      >
        ← Барлық тақырыптарға қайту
      </a>

    </div>

  `;


  // ⭐ Таңдаулы батырмасын жаңарту

  updateFavoriteButton(
    lesson.id
  );

}


// ============================================
// 🔎 САБАҚТАРДЫ ІЗДЕУ
// ============================================

function searchLessons() {

  const input =
    document.getElementById(
      "searchInput"
    );

  const resultsBox =
    document.getElementById(
      "searchResults"
    );

  const resultsList =
    document.getElementById(
      "searchResultsList"
    );


  if (
    !input ||
    !resultsBox ||
    !resultsList
  ) {
    return;
  }


  const searchText =
    input.value
      .trim()
      .toLowerCase();


  // Бос іздеу

  if (!searchText) {

    resultsBox.style.display =
      "none";

    return;
  }


  let results = [];


  // ========================================
  // 7-СЫНЫП АЛГЕБРА
  // ========================================

  if (
    typeof grade7AlgebraQ1 !==
    "undefined"
  ) {

    grade7AlgebraQ1.lessons.forEach(
      lesson => {

        const title =
          lesson.title.toLowerCase();

        const objective =
          lesson.objective.toLowerCase();


        if (
          title.includes(searchText) ||
          objective.includes(searchText)
        ) {

          results.push({

            lesson: lesson,

            classId: 7,

            subject: "Алгебра",

            quarter: "1-тоқсан"

          });

        }

      }
    );

  }


  resultsBox.style.display =
    "block";


  // Нәтиже жоқ

  if (
    results.length === 0
  ) {

    resultsList.innerHTML = `

      <div class="admin-box">

        <h3>
          Нәтиже табылмады
        </h3>

        <p>
          "${input.value}"
          бойынша сабақ табылмады.
        </p>

      </div>

    `;

    return;
  }


  // Нәтижелер

  resultsList.innerHTML =
    results.map(
      item => `

      <a
        href="
          lesson.html?class=${item.classId}
          &lesson=${item.lesson.id}
        "
        class="topic-card"
        style="
          display: block;
          text-decoration: none;
          color: inherit;
          margin-bottom: 15px;
        "
      >

        <div class="topic-top">

          <span class="topic-number">
            ${item.lesson.number}
          </span>

          <div>

            <small>

              ${item.classId}-сынып
              →
              ${item.subject}
              →
              ${item.quarter}

            </small>

            <h3>
              ${item.lesson.title}
            </h3>

            <p>

              <strong>
                Оқу мақсаты:
              </strong>

              ${item.lesson.objective}

            </p>

          </div>

        </div>

      </a>

    `
    ).join("");

}


// ============================================
// ENTER БАСҚАНДА ІЗДЕУ
// ============================================

const searchInput =
  document.getElementById(
    "searchInput"
  );


if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "Enter"
      ) {

        searchLessons();

      }

    }
  );

}


// ============================================
// ⭐ ТАҢДАУЛЫЛАР
// ============================================

function getFavorites() {

  return JSON.parse(

    localStorage.getItem(
      "mathTeacherFavorites"
    ) || "[]"

  );

}


// ============================================
// ⭐ ТАҢДАУЛЫЛАРДЫ САҚТАУ
// ============================================

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


// ============================================
// ⭐ ТАҢДАУЛЫҒА ҚОСУ / ӨШІРУ
// ============================================

function toggleFavorite(
  lessonId
) {

  let favorites =
    getFavorites();


  lessonId =
    String(lessonId);


  // Егер бар болса — өшіреміз

  if (
    favorites.includes(
      lessonId
    )
  ) {

    favorites =
      favorites.filter(
        id => id !== lessonId
      );

  }

  // Егер жоқ болса — қосамыз

  else {

    favorites.push(
      lessonId
    );

  }


  saveFavorites(
    favorites
  );


  updateFavoriteButton(
    lessonId
  );


  renderFavorites();

}


// ============================================
// ⭐ БАТЫРМАНЫ ЖАҢАРТУ
// ============================================

function updateFavoriteButton(
  lessonId
) {

  const button =
    document.getElementById(
      "favoriteButton"
    );


  if (!button) return;


  const favorites =
    getFavorites();


  lessonId =
    String(lessonId);


  if (
    favorites.includes(
      lessonId
    )
  ) {

    button.innerHTML =
      "⭐ Таңдаулыдан алып тастау";

  }

  else {

    button.innerHTML =
      "☆ Таңдаулыға қосу";

  }

}


// ============================================
// ⭐ ТАҢДАУЛЫЛАРДЫ КӨРСЕТУ
// ============================================

function renderFavorites() {

  const box =
    document.getElementById(
      "favoritesList"
    );


  if (!box) return;


  const favorites =
    getFavorites();


  // Таңдаулы жоқ

  if (
    favorites.length === 0
  ) {

    box.innerHTML = `

      <div class="admin-box">

        <h3>
          Әзірге таңдаулы сабақ жоқ
        </h3>

        <p>
          Ұнаған сабақтың ішінен
          ⭐ батырмасын басып сақтаңыз.
        </p>

      </div>

    `;

    return;
  }


  let lessons = [];


  // 7-сынып

  if (
    typeof grade7AlgebraQ1 !==
    "undefined"
  ) {

    lessons =
      grade7AlgebraQ1.lessons.filter(
        lesson =>
          favorites.includes(
            String(lesson.id)
          )
      );

  }


  // Сабақтар табылмаса

  if (
    lessons.length === 0
  ) {

    box.innerHTML = `

      <div class="admin-box">

        <h3>
          Таңдаулы сабақтар
        </h3>

        <p>
          Сақталған сабақтар
          осы жерде шығады.
        </p>

      </div>

    `;

    return;
  }


  // Таңдаулы сабақтарды көрсету

  box.innerHTML =
    lessons.map(
      lesson => `

      <a
        href="
          lesson.html?class=7&lesson=${lesson.id}
        "
        class="topic-card"
        style="
          display: block;
          text-decoration: none;
          color: inherit;
          margin-bottom: 15px;
        "
      >

        <div class="topic-top">

          <span class="topic-number">
            ${lesson.number}
          </span>

          <div>

            <h3>
              ⭐ ${lesson.title}
            </h3>

            <p>
              7-сынып
              →
              Алгебра
              →
              1-тоқсан
            </p>

          </div>

        </div>

      </a>

    `
    ).join("");

}


// ============================================
// БАСТАПҚЫДА ТАҢДАУЛЫЛАРДЫ КӨРСЕТУ
// ============================================

renderFavorites();


// ============================================
// БАРЛЫҚ ФУНКЦИЯЛАРДЫ ІСКЕ ҚОСУ
// ============================================

renderClasses();

renderClassPage();

renderLessonPage();
