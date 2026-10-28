function getClassId() {
  return Number(new URLSearchParams(location.search).get("class"));
}

function getLessonId() {
  return new URLSearchParams(location.search).get("lesson");
}


// ==============================
// Басты беттегі сыныптар
// ==============================

function renderClasses() {
  const grid = document.getElementById("classGrid");

  if (!grid) return;

  grid.innerHTML = classes.map(item => `
    <a class="class-card" href="class.html?class=${item.id}">
      <div class="class-number">${item.id}</div>

      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <span>Материалдарды ашу →</span>
      </div>
    </a>
  `).join("");
}


// ==============================
// Файл батырмасы
// ==============================

function fileLink(file, label) {
  if (!file) {
    return `<span class="empty-file">Файл әзірге қосылмаған</span>`;
  }

  return `
    <a class="button small" href="${file}" target="_blank">
      ${label}
    </a>
  `;
}


// ==============================
// 7-сынып Алгебра 1-тоқсан
// ==============================

function renderNewGrade7Page() {

  const page = document.getElementById("classPage");

  if (!page) return;

  if (typeof grade7AlgebraQ1 === "undefined") {
    page.innerHTML = `
      <div class="admin-box">
        <h1>Деректер табылмады</h1>
        <p>7-сыныптың Алгебра деректер файлы қосылмаған.</p>
      </div>
    `;

    return;
  }


  const current = grade7AlgebraQ1;


  page.innerHTML = `

    <div class="page-heading">

      <span class="badge">${current.grade}</span>

      <h1>${current.subject}</h1>

      <p>
        ${current.quarter}
      </p>

    </div>


    <div class="resource-row">

      <div class="resource-card">

        <div class="feature-icon">📚</div>

        <h3>Оқулық</h3>

        <p>${current.textbook.title}</p>

        ${fileLink(
          current.textbook.file,
          "Оқулықты ашу"
        )}

      </div>


      <div class="resource-card">

        <div class="feature-icon">📅</div>

        <h3>КТП</h3>

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
          style="text-decoration: none; color: inherit;"
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
                <strong>Оқу мақсаты:</strong>
                ${lesson.objective}
              </p>

            </div>

          </div>


          <div style="
            margin-top: 15px;
            font-weight: 600;
          ">
            Сабақты ашу →
          </div>

        </a>

      `).join("")}

    </div>

  `;
}


// ==============================
// Ескі сыныптар
// ==============================

function renderClassPage() {

  const page = document.getElementById("classPage");

  if (!page) return;


  const id = getClassId();


  // 7-сыныптың жаңа жүйесі
  if (
    id === 7 &&
    typeof grade7AlgebraQ1 !== "undefined"
  ) {

    renderNewGrade7Page();

    return;
  }


  // Ескі жүйе
  const current = classes.find(item => item.id === id);


  if (!current) {

    page.innerHTML = `
      <div class="admin-box">

        <h1>Сынып табылмады</h1>

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
        ҚМЖ және 45 минуттық сабақ материалдары.
      </p>

    </div>


    <div class="resource-row">

      <div class="resource-card">

        <div class="feature-icon">📚</div>

        <h3>Оқулық</h3>

        <p>
          ${current.textbook.title}
        </p>

        ${fileLink(
          current.textbook.file,
          "Оқулықты ашу"
        )}

      </div>


      <div class="resource-card">

        <div class="feature-icon">📅</div>

        <h3>КТП</h3>

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

      ${current.topics.map((topic, index) => `

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
                <strong>Оқу мақсаты:</strong>
                ${topic.objective}
              </p>

            </div>

          </div>


          <div class="topic-grid">

            <div>
              <h4>📝 ҚМЖ</h4>
              <p>${topic.kmj.title}</p>

              ${fileLink(
                topic.kmj.file,
                "ҚМЖ-ны ашу"
              )}
            </div>


            <div>
              <h4>👨‍🏫 Түсіндіру</h4>
              <p>
                ${topic.lesson.explanation}
              </p>
            </div>


            <div>
              <h4>👥 Жұптық жұмыс</h4>
              <p>
                ${topic.lesson.pairWork}
              </p>
            </div>


            <div>
              <h4>🎮 Ойын</h4>
              <p>
                ${topic.lesson.game}
              </p>
            </div>


            <div>
              <h4>🏠 Үй тапсырмасы</h4>
              <p>
                ${topic.lesson.homework}
              </p>
            </div>

          </div>

        </article>

      `).join("")}

    </div>

  `;
}


// ==============================
// ЖЕКЕ САБАҚ БЕТІ
// ==============================

function renderLessonPage() {

  const page = document.getElementById("lessonPage");

  if (!page) return;


  const lessonId = getLessonId();


  if (
    typeof grade7AlgebraQ1 === "undefined"
  ) {

    page.innerHTML = `
      <div class="admin-box">
        <h1>Деректер табылмады</h1>
      </div>
    `;

    return;
  }


  const lesson = grade7AlgebraQ1.lessons.find(
    item => String(item.id) === String(lessonId)
  );


  if (!lesson) {

    page.innerHTML = `
      <div class="admin-box">

        <h1>Сабақ табылмады</h1>

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


  page.innerHTML = `

    <div class="page-heading">

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


      <span class="badge">
        ${grade7AlgebraQ1.grade}
      </span>


      <h1>
        ${lesson.number}. ${lesson.title}
      </h1>


      <p>
        <strong>Оқу мақсаты:</strong>
        ${lesson.objective}
      </p>

    </div>


    <div class="topic-grid">


      <!-- ҚМЖ -->

      <div class="resource-card">

        <div class="feature-icon">📝</div>

        <h3>ҚМЖ</h3>

        ${
          lesson.kmj
          ? `
            <p>${lesson.kmj.title}</p>

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


      <!-- Түсіндіру -->

      <div class="resource-card">

        <div class="feature-icon">👨‍🏫</div>

        <h3>Тақырыпты түсіндіру</h3>

        ${
          lesson.lesson.explanation
          ? `
            <p>
              ${lesson.lesson.explanation}
            </p>
          `
          : `
            <p class="empty-file">
              Түсіндіру материалы әзірге қосылмаған.
            </p>
          `
        }

      </div>


      <!-- Жұптық жұмыс -->

      <div class="resource-card">

        <div class="feature-icon">👥</div>

        <h3>Жұптық жұмыс</h3>

        ${
          lesson.lesson.pairWork
          ? `
            <p>
              ${lesson.lesson.pairWork}
            </p>
          `
          : `
            <p class="empty-file">
              Жұптық жұмыс әзірге қосылмаған.
            </p>
          `
        }

      </div>


      <!-- Топтық жұмыс -->

      <div class="resource-card">

        <div class="feature-icon">👨‍👩‍👧‍👦</div>

        <h3>Топтық жұмыс</h3>

        ${
          lesson.lesson.groupWork
          ? `
            <p>
              ${lesson.lesson.groupWork}
            </p>
          `
          : `
            <p class="empty-file">
              Топтық жұмыс әзірге қосылмаған.
            </p>
          `
        }

      </div>


      <!-- Жеке тапсырма -->

      <div class="resource-card">

        <div class="feature-icon">✏️</div>

        <h3>Жеке тапсырма</h3>

        ${
          lesson.lesson.individualWork
          ? `
            <p>
              ${lesson.lesson.individualWork}
            </p>
          `
          : `
            <p class="empty-file">
              Жеке тапсырма әзірге қосылмаған.
            </p>
          `
        }

      </div>


      <!-- Ойын -->

      <div class="resource-card">

        <div class="feature-icon">🎮</div>

        <h3>Ойын</h3>

        ${
          lesson.lesson.game
          ? `
            <p>
              ${lesson.lesson.game}
            </p>
          `
          : `
            <p class="empty-file">
              Ойын әзірге қосылмаған.
            </p>
          `
        }

      </div>


      <!-- Бағалау -->

      <div class="resource-card">

        <div class="feature-icon">✅</div>

        <h3>Бағалау</h3>

        ${
          lesson.lesson.assessment
          ? `
            <p>
              ${lesson.lesson.assessment}
            </p>
          `
          : `
            <p class="empty-file">
              Бағалау материалы әзірге қосылмаған.
            </p>
          `
        }

      </div>


      <!-- Үй тапсырмасы -->

      <div class="resource-card">

        <div class="feature-icon">🏠</div>

        <h3>Үй тапсырмасы</h3>

        ${
          lesson.lesson.homework
          ? `
            <p>
              ${lesson.lesson.homework}
            </p>
          `
          : `
            <p class="empty-file">
              Үй тапсырмасы әзірге қосылмаған.
            </p>
          `
        }

      </div>

    </div>


    <div style="
      margin-top: 30px;
      margin-bottom: 40px;
    ">

      <a
        class="button"
        href="class.html?class=7"
      >
        ← Барлық тақырыптарға қайту
      </a>

    </div>

  `;
}


// ==============================
// Іске қосу
// ==============================

renderClasses();

renderClassPage();

renderLessonPage();
