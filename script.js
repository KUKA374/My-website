function getClassId() {
  return Number(new URLSearchParams(location.search).get("class"));
}

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

function fileLink(file, label) {
  if (!file) {
    return `<span class="empty-file">Файл әзірге қосылмаған</span>`;
  }
  return `<a class="button small" href="${file}" target="_blank">${label}</a>`;
}

function renderClassPage() {
  const page = document.getElementById("classPage");
  if (!page) return;

  const id = getClassId();
  const current = classes.find(item => item.id === id);

  if (!current) {
    page.innerHTML = `<div class="admin-box"><h1>Сынып табылмады</h1><a class="button" href="index.html">Басты бетке қайту</a></div>`;
    return;
  }

  page.innerHTML = `
    <div class="page-heading">
      <span class="badge">${current.title}</span>
      <h1>${current.description}</h1>
      <p>Оқулық, КТП тақырыптары, ҚМЖ және 45 минуттық сабақ материалдары.</p>
    </div>

    <div class="resource-row">
      <div class="resource-card">
        <div class="feature-icon">📚</div>
        <h3>Оқулық</h3>
        <p>${current.textbook.title}</p>
        ${fileLink(current.textbook.file, "Оқулықты ашу")}
      </div>
      <div class="resource-card">
        <div class="feature-icon">📅</div>
        <h3>КТП</h3>
        <p>Бұл жерге осы сыныптың КТП файлын кейін қосасыз.</p>
        <span class="empty-file">Файл әзірге қосылмаған</span>
      </div>
    </div>

    <h2 class="topic-title">КТП бойынша тақырыптар</h2>
    <div class="topic-list">
      ${current.topics.map((topic, index) => `
        <article class="topic-card">
          <div class="topic-top">
            <span class="topic-number">${index + 1}</span>
            <div>
              <h3>${topic.title}</h3>
              <p><strong>Оқу мақсаты:</strong> ${topic.objective}</p>
            </div>
          </div>

          <div class="topic-grid">
            <div><h4>📝 ҚМЖ</h4><p>${topic.kmj.title}</p>${fileLink(topic.kmj.file, "ҚМЖ-ны ашу")}</div>
            <div><h4>👨‍🏫 Түсіндіру</h4><p>${topic.lesson.explanation}</p></div>
            <div><h4>👥 Жұптық жұмыс</h4><p>${topic.lesson.pairWork}</p></div>
            <div><h4>🎮 Ойын</h4><p>${topic.lesson.game}</p></div>
            <div><h4>🏠 Үй тапсырмасы</h4><p>${topic.lesson.homework}</p></div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

renderClasses();
renderClassPage();