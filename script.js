function getClassId() {
  return Number(new URLSearchParams(location.search).get("class"));
}


// ================================
// СЫНЫПТАРДЫ БАСТЫ БЕТКЕ ШЫҒАРУ
// ================================

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


// ================================
// ФАЙЛҒА СІЛТЕМЕ
// ================================

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


// ================================
// 7-СЫНЫПТЫҢ АЛГЕБРАСЫН КӨРСЕТУ
// ================================

function renderNewGrade7Page() {
  const page = document.getElementById("classPage");

  if (!page) return;

  const id = getClassId();

  // Тек 7-сынып үшін жаңа KTP құрылымын қолданамыз
  if (id !== 7) {
    return false;
  }

  // Жаңа 7-сынып деректерін тексеру
  if (typeof grade7AlgebraQ1 === "undefined") {
    page.innerHTML = `
      <div class="admin-box">
        <h1>7-сынып мәліметі табылмады</h1>

        <p>
          7-сыныптың Algebra KTP файлы сайтқа қосылмаған.
        </p>

        <a class="button" href="index.html">
          Басты бетке қайту
        </a>
      </div>
    `;

    return true;
  }

  const data = grade7AlgebraQ1;

  page.innerHTML = `

    <div class="page-heading">

      <span class="badge">
        ${data.grade}
      </span>

      <h1>
        ${data.subject}
      </h1>

      <p>
        ${data.quarter}
      </p>

    </div>


    <!-- ОҚУ АҚПАРАТЫ -->

    <div class="resource-row">

      <div class="resource-card">

        <div class="feature-icon">
          📚
        </div>

        <h3>
          Оқулық
        </h3>

        <p>
          ${data.textbook}
        </p>

      </div>


      <div class="resource-card">

        <div class="feature-icon">
          📅
        </div>

        <h3>
          КТП
        </h3>

        <p>
          ${data.academicYear}
        </p>

        <p>
          Аптасына: ${data.weeklyHours} сағат
        </p>

        <p>
          Жылдық: ${data.annualHours} сағат
        </p>

      </div>

    </div>


    <!-- ТОҚСАН -->

    <h2 class="topic-title">
      ${data.quarter}
    </h2>


    <!-- САБАҚТАР -->

    <div class="topic-list">

      ${data.lessons.map(lesson => `

        <article class="topic-card">

          <div class="topic-top">

            <span class="topic-number">
              ${lesson.number}
            </span>

            <div>

              <h3>
                ${lesson.title}
              </h3>

              <p>
                <strong>Сағат:</strong>
                ${lesson.hours}
              </p>

            </div>

          </div>


          <div class="topic-grid">


            <!-- ҚМЖ -->

            <div>

              <h4>
                📝 ҚМЖ
              </h4>

              <p>
                ${lesson.kmj
                  ? lesson.kmj.title
                  : "ҚМЖ әзірге қосылмаған"}
              </p>

              ${
                lesson.kmj
                  ? fileLink(
                      lesson.kmj.file,
                      "ҚМЖ-ны ашу"
                    )
                  : `<span class="empty-file">
                       Кейін қосылады
                     </span>`
              }

            </div>


            <!-- ТҮСІНДІРУ -->

            <div>

              <h4>
                👨‍🏫 Түсіндіру
              </h4>

              <p>
                ${
                  lesson.lesson.explanation ||
                  "Сабақ түсіндірмесі кейін қосылады."
                }
              </p>

            </div>


            <!-- ЖҰПТЫҚ ЖҰМЫС -->

            <div>

              <h4>
                👥 Жұптық жұмыс
              </h4>

              <p>
                ${
                  lesson.lesson.pairWork ||
                  "Жұптық жұмыс кейін қосылады."
                }
              </p>

            </div>


            <!-- ТОПТЫҚ ЖҰМЫС -->

            <div>

              <h4>
                👨‍👩‍👧‍👦 Топтық жұмыс
              </h4>

              <p>
                ${
                  lesson.lesson.groupWork ||
                  "Топтық жұмыс кейін қосылады."
                }
              </p>

            </div>


            <!-- ЖЕКЕ ЖҰМЫС -->

            <div>

              <h4>
                ✏️ Жеке жұмыс
              </h4>

              <p>
                ${
                  lesson.lesson.individualWork ||
                  "Жеке тапсырмалар кейін қосылады."
                }
              </p>

            </div>


            <!-- ОЙЫН -->

            <div>

              <h4>
                🎮 Ойын
              </h4>

              <p>
                ${
                  lesson.lesson.game ||
                  "Ойын кейін қосылады."
                }
              </p>

            </div>


            <!-- БАҒАЛАУ -->

            <div>

              <h4>
                ✅ Бағалау
              </h4>

              <p>
                ${
                  lesson.lesson.assessment ||
                  "Бағалау бөлімі кейін қосылады."
                }
              </p>

            </div>


            <!-- ҮЙ ТАПСЫРМАСЫ -->

            <div>

              <h4>
                🏠 Үй тапсырмасы
              </h4>

              <p>
                ${
                  lesson.lesson.homework ||
                  "Үй тапсырмасы кейін қосылады."
                }
              </p>

            </div>

          </div>

        </article>

      `).join("")}

    </div>
  `;

  return true;
}


// ================================
// ЕСКІ СЫНЫП БЕТІ
// ================================

function renderClassPage() {

  const page = document.getElementById("classPage");

  if (!page) return;


  // Алдымен жаңа 7-сынып құрылымын тексереміз

  const newPage = renderNewGrade7Page();

  if (newPage) {
    return;
  }


  // Егер 7-сынып болмаса,
  // бұрынғы жүйе жұмыс істейді

  const id = getClassId();

  const current = classes.find(
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
        ҚМЖ және 45 минуттық сабақ материалдары.
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
          Бұл жерге осы сыныптың КТП файлын
          кейін қосамыз.
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

      `).join("")}

    </div>
  `;
}


// ================================
// САЙТТЫ ІСКЕ ҚОСУ
// ================================

renderClasses();

renderClassPage();
