/* Math Teacher — unified favorite and personal lesson collections. */
(function () {
  const META_KEY = "mathTeacherLessonMeta";
  const FAVORITES_KEY = "mathTeacherFavorites";
  const MY_KEY = "mathTeacherMyLessons_";

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value === null ? fallback : value;
    } catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn("Сақтау мүмкін болмады:", error); }
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (x) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x];
    });
  }
  function normalizeId(id) {
    const value = String(id == null ? "" : id);
    // Previous favorites used bare 7th-grade algebra lesson numbers.
    return /^\d+$/.test(value) ? "7_algebra_1_" + value : value;
  }
  function normalizeIds(ids) {
    return [...new Set((Array.isArray(ids) ? ids : []).map(normalizeId).filter(Boolean))];
  }
  function currentId() {
    const p = new URLSearchParams(location.search);
    const grade = p.get("class"), subject = p.get("subject");
    const quarter = p.get("quarter"), lesson = p.get("lesson");
    return grade && subject && quarter && lesson
      ? [grade, subject, quarter, lesson].join("_") : "";
  }
  function splitId(id) {
    const m = String(id).match(/^(\d+)_(.+)_(\d+)_(\d+)$/);
    if (!m) return null;
    return { classId: m[1], subjectId: m[2], quarter: m[3], lesson: m[4] };
  }
  function getMeta(id) {
    const key = normalizeId(id);
    const cached = read(META_KEY, {});
    if (cached && cached[key] && cached[key].title) return cached[key];
    const p = splitId(key);
    if (!p) return null;
    const c = window.curriculum && window.curriculum[p.classId];
    const s = c && c.subjects && c.subjects.find(function (x) { return x.id === p.subjectId; });
    const legacy = p.classId === "7" && p.subjectId === "algebra" && p.quarter === "1"
      && typeof grade7AlgebraQ1 !== "undefined" && Array.isArray(grade7AlgebraQ1.lessons)
      ? grade7AlgebraQ1.lessons.find(function (l) { return String(l.id) === p.lesson || String(l.number) === p.lesson; })
      : null;
    return Object.assign({}, p, {
      title: legacy ? legacy.title : "Сабақ №" + p.lesson,
      number: legacy ? legacy.number : p.lesson,
      subjectTitle: s ? s.title : p.subjectId
    });
  }
  function registerLessonMeta(id, meta) {
    const key = normalizeId(id);
    if (!splitId(key) || !meta || !meta.title) return;
    const saved = read(META_KEY, {});
    saved[key] = Object.assign({}, splitId(key), {
      title: String(meta.title),
      subjectTitle: String(meta.subjectTitle || meta.subjectId || ""),
      number: String(meta.number || meta.lesson || splitId(key).lesson)
    });
    write(META_KEY, saved);
  }
  function renderList(containerId, ids, kind) {
    const root = document.getElementById(containerId);
    if (!root) return;
    if (!ids.length) {
      root.innerHTML = '<div class="admin-box"><h3>Әзірге сабақ сақталмаған</h3><p>Сабақ бетінен қажетті материалды сақтай аласыз.</p></div>';
      return;
    }
    root.innerHTML = '<p style="margin:0 0 14px;color:#667085">' + ids.length + ' сабақ сақталған</p>' +
      ids.map(function (id) {
        const item = getMeta(id);
        if (!item) return "";
        const url = "lesson.html?" + new URLSearchParams({
          "class": item.classId, subject: item.subjectId, quarter: item.quarter, lesson: item.lesson
        }).toString();
        const sub = item.classId + "-сынып • " + item.subjectTitle + " • " + item.quarter + "-тоқсан";
        return '<div class="lesson-card" style="display:flex;align-items:center;gap:14px">' +
          '<a href="' + esc(url) + '" style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;text-decoration:none;color:inherit">' +
          '<div class="lesson-number">' + esc(item.number) + '</div><div class="lesson-info">' +
          '<span style="font-size:13px;color:#667085">' + esc(sub) + '</span><h3>' + esc(item.title) + '</h3></div>' +
          '<div class="lesson-arrow">→</div></a>' +
          '<button type="button" class="lesson-action" data-collection="' + esc(kind) + '" data-remove="' + esc(id) + '">🗑 Өшіру</button></div>';
      }).join("");
    if (root.dataset.collectionBound !== "true") {
      root.addEventListener("click", function (e) {
        const button = e.target.closest("button[data-remove]");
        if (!button) return;
        const id = button.dataset.remove;
        if (button.dataset.collection === "favorite") toggleFavorite(id);
        else removeMyLesson(id);
      });
      root.dataset.collectionBound = "true";
    }
  }
  function getFavorites() {
    return normalizeIds(read(FAVORITES_KEY, []));
  }
  function renderFavorites() { renderList("favoritesList", getFavorites(), "favorite"); }
  function updateFavoriteButton() {
    const button = document.getElementById("favoriteButton");
    if (button && currentId()) button.textContent = getFavorites().includes(currentId())
      ? "⭐ Таңдаулыдан өшіру" : "☆ Таңдаулыға қосу";
  }
  function toggleFavorite(id) {
    const key = normalizeId(id || currentId());
    if (!key) return;
    const ids = getFavorites();
    write(FAVORITES_KEY, ids.includes(key) ? ids.filter(function (x) { return x !== key; }) : ids.concat(key));
    renderFavorites();
    updateFavoriteButton();
  }
  function getMyLessonsStorageKey() {
    try {
      const user = typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser;
      if (user && user.uid) return MY_KEY + user.uid;
    } catch (_) {}
    return MY_KEY + "guest";
  }
  function getMyLessons() { return normalizeIds(read(getMyLessonsStorageKey(), [])); }
  function saveMyLessons(ids) { write(getMyLessonsStorageKey(), normalizeIds(ids)); }
  function renderMyLessons() { renderList("myLessonsList", getMyLessons(), "mine"); }
  function isMyLesson(id) { return getMyLessons().includes(normalizeId(id || currentId())); }
  function updateMyLessonButton() {
    const button = document.getElementById("myLessonButton");
    if (button && currentId()) button.textContent = isMyLesson(currentId())
      ? "✓ Менің сабақтарымда" : "📚 Менің сабақтарыма қосу";
  }
  function toggleMyLesson(id) {
    const key = normalizeId(id || currentId());
    if (!key) return;
    const ids = getMyLessons();
    saveMyLessons(ids.includes(key) ? ids.filter(function (x) { return x !== key; }) : ids.concat(key));
    renderMyLessons(); updateMyLessonButton();
  }
  function removeMyLesson(id) {
    saveMyLessons(getMyLessons().filter(function (x) { return x !== normalizeId(id); }));
    renderMyLessons(); updateMyLessonButton();
  }
  function syncMyLessonsUserStorage(user) {
    if (!user || !user.uid) return;
    const guestKey = MY_KEY + "guest", userKey = MY_KEY + user.uid;
    const guest = normalizeIds(read(guestKey, []));
    const own = normalizeIds(read(userKey, []));
    if (guest.length) {
      write(userKey, normalizeIds(own.concat(guest)));
      try { localStorage.removeItem(guestKey); } catch (_) {}
    }
    renderMyLessons(); updateMyLessonButton();
  }

  Object.assign(window, {
    registerLessonMeta, getFavorites, renderFavorites, toggleFavorite, updateFavoriteButton,
    getMyLessonsStorageKey, getMyLessons, saveMyLessons, renderMyLessons,
    isMyLesson, toggleMyLesson, updateMyLessonButton, removeMyLesson, syncMyLessonsUserStorage
  });
  document.addEventListener("DOMContentLoaded", function () {
    renderFavorites(); renderMyLessons(); updateFavoriteButton(); updateMyLessonButton();
    try {
      if (typeof firebase !== "undefined" && firebase.auth)
        firebase.auth().onAuthStateChanged(syncMyLessonsUserStorage);
    } catch (_) {}
  });
})();