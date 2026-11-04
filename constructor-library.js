(function () {
  "use strict";
  const A = ConstructorApp,
    M = LessonModel,
    S = ConstructorStorage,
    E = ConstructorView.esc,
    $ = (id) => document.getElementById(id);
  let repo = null,
    timer = null,
    dirty = false,
    conflict = false,
    issue = "";
  function time(s) {
    const n = Date.parse(s);
    return Number.isFinite(n)
      ? new Date(n).toLocaleString("kk-KZ", { timeZone: "Asia/Almaty" })
      : "Уақыты белгісіз";
  }
  function save(copy = false) {
    if (!repo || !A.doc || !A.owner) return false;
    clearTimeout(timer);
    timer = null;
    try {
      const invalid = [
        ...document.querySelectorAll('#builderApp input[type="number"]'),
      ].some((el) => el.value === "" || !el.checkValidity());
      if (invalid)
        throw Error("Сандық өрістегі қатені түзетіңіз. Өзгерістер сақталмады.");
      if (conflict && !copy)
        throw Error("Басқа қойындыда өзгеріс бар. Көшірме ретінде сақтаңыз.");
      let doc = A.doc;
      if (copy) {
        repo.reload();
        doc = M.copy(doc);
      }
      doc.updatedAt = new Date().toISOString();
      repo.save(doc);
      A.doc = doc;
      dirty = false;
      conflict = false;
      issue = "";
      A.notify(
        "Сақталды: " +
          time(doc.updatedAt) +
          ". Тек осы браузерде, серверге жіберілмейді.",
      );
      renderLibrary();
      if (copy) A.render();
      return true;
    } catch (e) {
      issue = e.message;
      if (/қойынды/.test(issue)) conflict = true;
      A.notify(issue);
      renderLibrary();
      return false;
    }
  }
  function persist() {
    if (!A.doc) return;
    dirty = true;
    if (!repo) {
      A.notify(
        issue ||
          "Жоспар сақталмады. Мәтінді көшіріңіз немесе PDF етіп сақтаңыз.",
      );
      return;
    }
    clearTimeout(timer);
    A.notify("Өзгерістер бар. Осы браузерге сақталуда…");
    const uid = A.owner?.uid,
      id = A.doc.id;
    timer = setTimeout(() => {
      if (A.owner?.uid === uid && A.doc?.id === id) save();
    }, 500);
  }
  function renderLibrary() {
    const items = repo?.list() || [];
    $("savedLessons").innerHTML =
      items
        .map(
          (d) =>
            `<article class="saved-lesson"><strong>${E(d.title)}</strong><p>${E(time(d.updatedAt))}</p><div class="actions"><button type="button" data-open-lesson="${d.id}">Сабақты ашу</button><button type="button" data-delete-lesson="${d.id}" class="danger">Сабақты жою</button></div></article>`,
        )
        .join("") || "<p>Сақталған сабақ жоқ.</p>";
    $("saveLesson").disabled = !repo;
    $("copyLesson").disabled = !repo;
    if (issue) $("storageIssue").textContent = issue;
    else $("storageIssue").textContent = "";
  }
  function render() {
    const enabled = !!repo;
    $("libraryActions").innerHTML =
      '<button id="newLesson" type="button">Жаңа сабақ</button><button id="saveLesson" type="button" class="primary">Сабақты сақтау</button><button id="copyLesson" type="button">Көшірме сақтау</button>';
    $("storageEditor").innerHTML =
      '<p>Кітапхана осы Firebase пайдаланушысы үшін осы браузерде ғана сақталады. Бұл сервердегі ортақ база емес.</p><p id="storageIssue" role="status"></p><button type="button" id="importLegacy">Ескі браузер сабағын көшіру</button><p>Ескі сабақтың иесі белгісіз. Тек өз материалыңызды импорттаңыз. Ескі тапсырмалар жауаптары оқушыға шығып кетпеуі үшін мұғалім жазбаларына көшіріледі.</p><h3>Сақталған сабақтар</h3><div id="savedLessons"></div>';
    $("previewControls").innerHTML =
      `<label for="previewMode">Көрініс</label><select id="previewMode">${[
        ["teacher", "Мұғалімнің толық жоспары"],
        ["student", "Оқушы тапсырмалары"],
        ["homework", "Үй тапсырмасы"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${A.mode === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select><label class="check-line"><input type="checkbox" id="showAnswers" ${A.answers ? "checked" : ""}>Жауаптары бар нұсқа</label><div class="actions"><button type="button" id="printLesson">Басып шығару / PDF</button><button type="button" id="copyLessonText">Мәтінді көшіру</button><button type="button" id="projectLesson">Проектор көрінісі</button><button type="button" id="reduceMotion">Қозғалысты азайту</button></div><p>PDF үшін басып шығару терезесінде «PDF ретінде сақтау» таңдаңыз. Оқушы көрінісіне ауысқанда жауаптар қайта жасырылады.</p>`;
    renderLibrary();
  }
  async function init() {
    issue = "";
    conflict = false;
    dirty = false;
    try {
      repo = new S.Repository(localStorage, A.owner.uid);
      A.persist = persist;
      if (repo.state.currentId) A.load(repo.get(repo.state.currentId));
      A.notify(
        repo.state.currentId
          ? "Сабақ қалпына келтірілді. Тек осы браузерде сақталған."
          : "Жаңа сабақ. Өзгерістер осы браузерге автоматты сақталады.",
      );
    } catch (e) {
      repo = null;
      A.persist = persist;
      issue = e.message;
      A.notify(issue);
    }
  }
  function beforeLock() {
    if (dirty && repo) save();
  }
  function lock() {
    clearTimeout(timer);
    timer = null;
    repo = null;
    A.persist = null;
    dirty = false;
    conflict = false;
    issue = "";
  }
  A.features.push({ init, render, beforeLock, lock });
  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b || !A.doc) return;
      try {
        if (b.id === "saveLesson") {
          save();
        } else if (b.id === "copyLesson") {
          save(true);
        } else if (b.id === "newLesson") {
          if (dirty && !save()) return;
          A.load(M.create(A.owner.uid));
          A.notify("Жаңа сабақ. Өзгерістер әлі сақталмаған.");
        } else if (b.dataset.openLesson) {
          if (dirty && !save()) return;
          A.load(repo.select(b.dataset.openLesson));
          conflict = false;
          A.notify("Сақталған сабақ ашылды.");
        } else if (b.dataset.deleteLesson) {
          if (!confirm("Сақталған сабақты біржола жоясыз ба?")) return;
          if (dirty && A.doc.id !== b.dataset.deleteLesson && !save()) return;
          clearTimeout(timer);
          repo.remove(b.dataset.deleteLesson);
          if (A.doc.id === b.dataset.deleteLesson) {
            dirty = false;
            A.load(
              repo.state.currentId
                ? repo.get(repo.state.currentId)
                : M.create(A.owner.uid),
            );
          }
          renderLibrary();
          A.notify("Сабақ жойылды.");
        } else if (b.id === "importLegacy") {
          if (!repo) return;
          if (
            !confirm(
              "Ескі сабақ өзіңізге тиесілі ме? Оны жаңа көшірме ретінде импорттайсыз ба?",
            )
          )
            return;
          if (dirty && !save()) return;
          const raw = localStorage.getItem("mathTeacherCustomLesson");
          if (!raw) throw Error("Ескі сабақ табылмады.");
          A.load(S.legacy(raw, A.owner.uid));
          dirty = true;
          save();
        } else if (b.id === "printLesson") {
          A.refresh();
          A.panel("preview");
          window.print();
        } else if (b.id === "copyLessonText") {
          const text = $("preview").innerText;
          try {
            await navigator.clipboard.writeText(text);
            A.notify("Сабақ мәтіні көшірілді.");
          } catch {
            const range = document.createRange();
            range.selectNodeContents($("preview"));
            const sel = getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            A.notify(
              "Көшіру рұқсаты жоқ. Белгіленген мәтінді Ctrl+C немесе құрылғының көшіру әрекетімен көшіріңіз.",
            );
          }
        } else if (b.id === "projectLesson") {
          document.body.classList.toggle("projector");
          A.panel("preview");
          b.setAttribute(
            "aria-pressed",
            String(document.body.classList.contains("projector")),
          );
        } else if (b.id === "reduceMotion") {
          document.body.classList.toggle("reduce-motion");
          b.setAttribute(
            "aria-pressed",
            String(document.body.classList.contains("reduce-motion")),
          );
        }
      } catch (err) {
        issue = err.message;
        A.notify(issue);
      }
    });
    $("previewControls").addEventListener("change", (e) => {
      if (e.target.id === "previewMode") {
        A.mode = e.target.value;
        A.answers = false;
        $("showAnswers").checked = false;
      } else if (e.target.id === "showAnswers") A.answers = e.target.checked;
      A.refresh();
    });
    window.addEventListener("pagehide", () => {
      if (dirty) save();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && dirty) save();
    });
    window.addEventListener("storage", (e) => {
      if (repo && e.key === repo.key) {
        conflict = true;
        clearTimeout(timer);
        A.notify("Басқа қойындыда өзгеріс бар. Көшірме ретінде сақтаңыз.");
      }
    });
  });
})();
