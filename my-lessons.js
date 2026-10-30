// ==========================================
// MATH TEACHER — МЕНІҢ САБАҚТАРЫМ
// ==========================================

function getMyLessonsStorageKey() {
  try {
    if (typeof firebase !== "undefined" && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user && user.uid) return "mathTeacherMyLessons_" + user.uid;
    }
  } catch (error) {
    console.warn("User id could not be read:", error);
  }

  return "mathTeacherMyLessons_guest";
}

function getMyLessons() {
  try {
    return JSON.parse(localStorage.getItem(getMyLessonsStorageKey()) || "[]");
  } catch (error) {
    return [];
  }
}

function saveMyLessons(lessonIds) {
  localStorage.setItem(
    getMyLessonsStorageKey(),
    JSON.stringify(lessonIds.map(function (id) { return String(id); }))
  );
}

function isMyLesson(lessonId) {
  return getMyLessons().includes(String(lessonId));
}

function toggleMyLesson(lessonId) {
  const id = String(lessonId);
  let lessons = getMyLessons();

  if (lessons.includes(id)) {
    lessons = lessons.filter(function (item) {
      return item !== id;
    });
  } else {
    lessons.push(id);
  }

  saveMyLessons(lessons);
  updateMyLessonButton();
  renderMyLessons();
}

function updateMyLessonButton() {
  const button = document.getElementById("myLessonButton");
  if (!button) return;

  if (isMyLesson(getLessonId())) {
    button.innerHTML = "✓ Менің сабақтарымда";
  } else {
    button.innerHTML = "📚 Менің сабақтарыма қосу";
  }
}

function removeMyLesson(lessonId) {
  const id = String(lessonId);
  const lessons = getMyLessons().filter(function (item) {
    return item !== id;
  });

  saveMyLessons(lessons);
  renderMyLessons();

  if (String(getLessonId()) === id) {
    updateMyLessonButton();
  }
}

function renderMyLessons() {
  const container = document.getElementById("myLessonsList");
  if (!container) return;

  const ids = getMyLessons();
  const allLessons =
    typeof grade7AlgebraQ1 !== "undefined" && Array.isArray(grade7AlgebraQ1.lessons)
      ? grade7AlgebraQ1.lessons
      : [];

  const lessons = ids
    .map(function (id) {
      return allLessons.find(function (lesson) {
        return String(lesson.id) === String(id);
      });
    })
    .filter(Boolean);

  if (lessons.length === 0) {
    container.innerHTML = `
      <div class="admin-box">
        <h3>Әзірге сабақ қосылмаған</h3>
        <p>Керек сабақты ашып, «📚 Менің сабақтарыма қосу» батырмасын басыңыз.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <p style="margin:0 0 14px;color:#667085;">${lessons.length} сабақ сақталған</p>
    ${lessons.map(function (lesson) {
      return `
        <div class="lesson-card" style="display:flex;align-items:center;gap:14px;">
          <a href="lesson.html?class=7&subject=algebra&quarter=1&lesson=${lesson.id}" style="display:flex;align-items:center;gap:14px;flex:1;text-decoration:none;color:inherit;">
            <div class="lesson-number">${lesson.number}</div>
            <div class="lesson-info">
              <span style="font-size:13px;color:#667085;">7-сынып • Алгебра • 1-тоқсан</span>
              <h3>${lesson.title}</h3>
            </div>
            <div class="lesson-arrow">→</div>
          </a>
          <button type="button" class="lesson-action" onclick="removeMyLesson('${lesson.id}')">🗑 Өшіру</button>
        </div>
      `;
    }).join("")}
  `;
}

document.addEventListener("DOMContentLoaded", function () {
  renderMyLessons();
  updateMyLessonButton();
});
