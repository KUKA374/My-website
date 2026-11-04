/* UI adapter: all writes go through Stage 6 controls, never a second repository. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let query = "",
    grade = "",
    owner = "",
    navigating = false;
  const el = (tag, cls, text) => {
    const x = document.createElement(tag);
    x.className = cls || "";
    if (text) x.textContent = text;
    return x;
  };
  function decorate() {
    const A = window.ConstructorApp;
    if (!A?.owner || $("#builderApp").hidden) return;
    if (owner !== A.owner.uid) {
      owner = A.owner.uid;
      query = grade = "";
    }
    const saved = $("#savedLessons");
    if (!saved) return;
    if (!$("#iuLibraryFilters")) {
      const filters = el("div", "iu-library-filters");
      filters.id = "iuLibraryFilters";
      filters.innerHTML =
        '<label class="iu-field" for="iuLibrarySearch">Сабақты іздеу<input class="iu-input" id="iuLibrarySearch" type="search" placeholder="Атауы немесе тақырыбы"></label><label class="iu-field" for="iuLibraryGrade">Сынып<select class="iu-select" id="iuLibraryGrade"><option value="">Барлық сынып</option>' +
        Array.from(
          { length: 11 },
          (_, i) => `<option value="${i + 1}">${i + 1}-сынып</option>`,
        ).join("") +
        '</select></label><p id="iuLibraryCount" role="status"></p>';
      saved.before(filters);
      $("#iuLibrarySearch").value = query;
      $("#iuLibraryGrade").value = grade;
      $("#iuLibrarySearch").addEventListener("input", (e) => {
        query = e.target.value;
        filter();
      });
      $("#iuLibraryGrade").addEventListener("change", (e) => {
        grade = e.target.value;
        filter();
      });
    }
    let docs = [];
    try {
      docs = new ConstructorStorage.Repository(localStorage, owner).list();
    } catch {
      return;
    }
    const byId = new Map(docs.map((d) => [d.id, d]));
    for (const card of saved.querySelectorAll(".saved-lesson")) {
      if (card.dataset.iuDecorated) continue;
      card.dataset.iuDecorated = "true";
      const id = card.querySelector("[data-open-lesson]")?.dataset.openLesson,
        d = byId.get(id);
      if (!d) continue;
      card.dataset.grade = d.meta.grade;
      card.dataset.search = [d.title, d.meta.subject, d.meta.topic]
        .join(" ")
        .toLocaleLowerCase("kk");
      const badge = el(
        "span",
        "iu-badge",
        d.meta.grade ? d.meta.grade + "-сынып" : "Сынып көрсетілмеген",
      );
      card.querySelector("strong").before(badge);
      const copy = el("button", "", "Көшірмесін жасау");
      copy.type = "button";
      copy.dataset.iuCopy = id;
      card.querySelector(".actions").append(copy);
    }
    filter();
  }
  function filter() {
    let count = 0;
    for (const card of document.querySelectorAll(
      "#savedLessons .saved-lesson",
    )) {
      const show =
        (!grade || card.dataset.grade === grade) &&
        (!query.trim() ||
          card.dataset.search?.includes(query.trim().toLocaleLowerCase("kk")));
      card.hidden = !show;
      if (show) count++;
    }
    const status = $("#iuLibraryCount");
    if (status) {
      const text = count
        ? `${count} сабақ көрсетілді`
        : "Бұл сүзгіге сәйкес сақталған сабақ жоқ.";
      if (status.textContent !== text) status.textContent = text;
    }
  }
  function focus(id) {
    const x = document.getElementById(id);
    if (!x) return;
    ConstructorApp.panel("editor");
    x.tabIndex = -1;
    x.scrollIntoView({ block: "start" });
    x.focus({ preventScroll: true });
  }
  async function route() {
    const A = window.ConstructorApp;
    if (
      navigating ||
      !A?.doc ||
      $("#builderApp")?.dataset.ready !== "true" ||
      !location.hash
    )
      return;
    const hash = location.hash;
    const uid = A.owner.uid;
    navigating = true;
    try {
      if (hash.startsWith("#saved=")) {
        const id = decodeURIComponent(hash.slice(7));
        const b = [...document.querySelectorAll("[data-open-lesson]")].find(
          (x) => x.dataset.openLesson === id,
        );
        if (b) {
          b.click();
          A.panel("editor");
          $("#meta-title")?.focus();
        } else
          A.notify(
            "Сабақ осы пайдаланушының жергілікті кітапханасында табылмады.",
          );
      } else if (hash === "#newLesson") {
        $("#newLesson").click();
        A.panel("editor");
        $("#meta-title")?.focus();
      } else if (hash.startsWith("#lesson=")) {
        const [g, s, q, n] = decodeURIComponent(hash.slice(8)).split("|");
        if (
          !window.curriculum[g]?.subjects.some((x) => x.id === s) ||
          !["1", "2", "3", "4"].includes(q)
        )
          throw Error();
        await LessonCatalog.grade(g);
        if (A.owner?.uid !== uid) return;
        if (!LessonCatalog.rows(g, s, q).some((x) => x.number === n))
          throw Error();
        const previousId = A.doc.id;
        $("#newLesson").click();
        if (A.doc.id === previousId) throw Error();
        $("#catalogGrade").value = g;
        $("#catalogGrade").onchange();
        $("#catalogSubject").value = s;
        $("#catalogQuarter").value = q;
        await $("#catalogQuarter").onchange();
        if (A.owner?.uid !== uid) return;
        $("#catalogTopic").value = n;
        $("#catalogTopic").onchange();
        A.panel("context");
        $("#catalogTopic").focus();
        A.notify(
          "КТП тақырыбы жаңа жоспарға таңдалды. Қолда бар материалды бөлек қоса аласыз.",
        );
      } else if (
        ["#taskLibrary", "#savedLessons", "#lessonTemplate"].includes(hash)
      )
        focus(hash.slice(1));
      else return;
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      A.notify("Сілтемедегі сабақ табылмады. КТП тізімінен қолмен таңдаңыз.");
    } finally {
      navigating = false;
    }
  }
  function start() {
    const heading = el("div", "iu-builder-heading");
    heading.innerHTML =
      '<div><span class="iu-kicker">Жоспарлау кеңістігі</span><h1>Сабақ конструкторы</h1><p>КТП-дан таңдаңыз. Жоспарлаңыз. Өз сабағыңызды жасаңыз.</p></div><span class="iu-badge">Құрылғыда сақталады</span>';
    $("#authGate").before(heading);
    new MutationObserver(() => {
      decorate();
      route();
    }).observe($("#storageEditor"), { childList: true, subtree: true });
    new MutationObserver(() => {
      if ($("#builderApp").hidden) {
        owner = "";
        query = grade = "";
      } else {
        decorate();
        route();
      }
    }).observe($("#builderApp"), {
      attributes: true,
      attributeFilter: ["hidden", "data-ready"],
    });
    window.addEventListener("hashchange", route);
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-iu-copy]");
      if (!b) return;
      const id = b.dataset.iuCopy;
      const open = [...document.querySelectorAll("[data-open-lesson]")].find(
        (x) => x.dataset.openLesson === id,
      );
      open?.click();
      if (ConstructorApp.doc?.id === id) $("#copyLesson").click();
    });
    decorate();
    route();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
