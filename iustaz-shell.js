/* Shared navigation chrome. Existing application nodes and handlers are retained. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s),
    el = (tag, cls, text) => {
      const x = document.createElement(tag);
      if (cls) x.className = cls;
      if (text) x.textContent = text;
      return x;
    };
  function start() {
    const page = location.pathname.split("/").pop() || "index.html";
    document.body.dataset.iuPage = page;
    if (page === "login.html") {
      const a = el("a", "iu-button", "← Платформа туралы");
      a.href = "index.html";
      $(".login-wrap").append(a);
      $(".login-subtitle").textContent = "Ұстаздың цифрлық серігі";
      return;
    }
    const nodes = [...document.body.children].filter(
      (x) => !["SCRIPT", "STYLE"].includes(x.tagName),
    );
    const content = el("div", "iu-content"),
      main = el("div", "iu-main");
    main.id = "iu-main";
    main.tabIndex = -1;
    if (page === "index.html") main.setAttribute("role", "main");
    nodes.forEach((x) => main.append(x));
    main
      .querySelectorAll(
        ".site-header,body > .header,.builder-header,.games-nav",
      )
      .forEach((x) => x.classList.add("iu-legacy-header"));
    if (page !== "lesson.html")
      main
        .querySelectorAll("header.header")
        .forEach((x) => x.classList.add("iu-legacy-header"));
    const sidebar = el("aside", "iu-sidebar");
    sidebar.id = "iu-sidebar";
    sidebar.setAttribute("aria-label", "Негізгі мәзір");
    const brand = el("a", "iu-brand");
    brand.href = "index.html";
    brand.innerHTML =
      '<img src="assets/iustaz/logo-light.svg" alt="iUSTAZ" width="184" height="48"><span>Ұстаздың цифрлық серігі</span>';
    sidebar.append(brand);
    const close = el("button", "iu-menu-close", "✕ Мәзірді жабу");
    close.type = "button";
    sidebar.append(close);
    const label = el("p", "iu-nav-label", "ЖҰМЫС КЕҢІСТІГІ");
    sidebar.append(label);
    const nav = el("nav", "iu-nav");
    nav.setAttribute("aria-label", "Платформа бөлімдері");
    const links = [
      ["⌂", "Басты бет", "index.html"],
      ["▤", "Сабақ конструкторы", "constructor.html"],
      ["▦", "Сыныптар мен тақырыптар", "index.html#classes"],
      ["◇", "Математикалық ойындар", "games.html"],
      ["≡", "Тапсырмалар банкі", "constructor.html#taskLibrary"],
      ["▱", "Менің сабақтарым", "constructor.html#savedLessons"],
    ];
    for (const [icon, title, href] of links) {
      const a = el("a", "iu-nav-item");
      a.href = href;
      a.innerHTML = '<span aria-hidden="true">' + icon + "</span>";
      a.append(document.createTextNode(title));
      if (
        (href === page &&
          (!location.hash ||
            !links.some((l) => l[2] === page + location.hash))) ||
        href === page + location.hash
      ) {
        a.setAttribute("aria-current", "page");
      }
      nav.append(a);
    }
    sidebar.append(nav, el("p", "iu-nav-label", "АЛДАҒЫ МҮМКІНДІКТЕР"));
    const activeNav = () => {
      const target = ["class.html", "lesson.html"].includes(page)
        ? "index.html#classes"
        : page + location.hash;
      const exact = links.some((l) => l[2] === target);
      nav.querySelectorAll("a").forEach((a) => {
        if (a.getAttribute("href") === (exact ? target : page))
          a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    };
    window.addEventListener("hashchange", activeNav);
    activeNav();
    for (const title of [
      "Аналитика",
      "AI көмекші",
      "Математика зертханасы",
      "Баптаулар",
    ]) {
      const row = el("div", "iu-nav-future");
      row.append(el("span", "", title), el("span", "iu-badge", "Жақында"));
      sidebar.append(row);
    }
    const note = el("div", "iu-sidebar-note");
    note.innerHTML =
      '<span class="iu-kicker">Сабаққа бірге дайындалайық</span><p>Идеядан толық сабақ жоспарына дейін.</p><a class="iu-button primary" href="constructor.html#newLesson">+ Жаңа сабақ</a>';
    sidebar.append(note);
    const header = el("header", "iu-header"),
      toggle = el("button", "iu-menu-toggle", "☰");
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Мәзірді ашу");
    toggle.setAttribute("aria-controls", sidebar.id);
    toggle.setAttribute("aria-expanded", "false");
    const search = el("form", "iu-section-search");
    search.setAttribute("role", "search");
    search.innerHTML =
      '<label class="iu-sr" for="iuSectionSearch">Бөлімді іздеу</label><span aria-hidden="true">⌕</span><input id="iuSectionSearch" type="search" placeholder="Бөлімді іздеу…" autocomplete="off" aria-controls="iuSearchResults"><div id="iuSearchResults" class="iu-search-results" hidden></div>';
    const input = search.querySelector("input"),
      results = search.lastElementChild;
    function clearSearch() {
      results.hidden = true;
    }
    input.addEventListener("input", () => {
      results.replaceChildren();
      const q = input.value.trim().toLocaleLowerCase("kk");
      if (!q) return clearSearch();
      for (const [, title, href] of links.filter((l) =>
        l[1].toLocaleLowerCase("kk").includes(q),
      )) {
        const a = el("a", "", title);
        a.href = href;
        results.append(a);
      }
      if (!results.children.length)
        results.append(el("p", "", "Бөлім табылмады."));
      results.hidden = false;
    });
    search.addEventListener("submit", (e) => {
      e.preventDefault();
      const a = results.querySelector("a");
      if (a) a.click();
    });
    search.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        clearSearch();
        input.focus();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        results.querySelector("a")?.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!search.contains(e.target)) clearSearch();
    });
    const future = el("span", "iu-notification iu-tooltip");
    future.dataset.tip = "Хабарламалар бөлімі кейін қосылады";
    future.tabIndex = 0;
    future.innerHTML =
      '<span aria-hidden="true">♧</span><span class="iu-sr">Хабарламалар: жақында</span><span class="iu-badge">Жақында</span>';
    const profile = el("details", "iu-profile");
    profile.innerHTML =
      '<summary><span class="iu-avatar" aria-hidden="true">Ұ</span><span><strong id="iuProfileName">Қонақ</strong><small id="iuProfileRole">Ашық шолу</small></span><span aria-hidden="true">⌄</span></summary><div class="iu-profile-menu"><a href="login.html" id="iuLogin">Жүйеге кіру</a><a href="admin.html" id="iuAdmin" hidden>Басқару панелі</a><button type="button" id="iuLogout" hidden>Аккаунттан шығу</button></div>';
    profile.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && profile.open) {
        e.preventDefault();
        e.stopPropagation();
        profile.open = false;
        profile.querySelector("summary").focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!profile.contains(e.target)) profile.open = false;
    });
    header.append(toggle, search, future, profile);
    content.append(header, main);
    const backdrop = el("div", "iu-backdrop");
    backdrop.hidden = true;
    const skip = el("a", "iu-skip", "Негізгі мазмұнға өту");
    skip.href = "#iu-main";
    document.body.prepend(skip, sidebar, backdrop, content);
    const mobile = matchMedia("(max-width:1200px)");
    let open = false,
      previous = null;
    function menu(next) {
      open = next;
      document.body.classList.toggle("iu-menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      sidebar.inert = mobile.matches && !open;
      content.inert = open;
      backdrop.hidden = !open;
      if (open) {
        previous = document.activeElement;
        sidebar.setAttribute("role", "dialog");
        sidebar.setAttribute("aria-modal", "true");
        close.focus();
      } else {
        sidebar.removeAttribute("role");
        sidebar.removeAttribute("aria-modal");
        previous?.focus();
      }
    }
    sidebar.inert = mobile.matches;
    toggle.addEventListener("click", () => menu(!open));
    close.addEventListener("click", () => menu(false));
    backdrop.addEventListener("click", () => menu(false));
    sidebar.addEventListener("click", (e) => {
      if (open && e.target.closest("a")) menu(false);
    });
    mobile.addEventListener("change", () => menu(false));
    document.addEventListener("keydown", (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        menu(false);
      }
      if (e.key === "Tab") {
        const items = [...sidebar.querySelectorAll("a,button")].filter(
            (x) => x.getClientRects().length,
          ),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    $("#iuLogout").addEventListener("click", () => window.logoutUser?.());
    function identity(owner) {
      const valid =
        owner && ["teacher", "admin", "super_admin"].includes(owner.role);
      $("#iuProfileName").textContent = valid
        ? owner.name || "Мұғалім"
        : "Қонақ";
      $("#iuProfileRole").textContent = valid
        ? { teacher: "Мұғалім", admin: "Әкімші", super_admin: "Бас әкімші" }[
            owner.role
          ]
        : "Ашық шолу";
      $("#iuLogin").hidden = !!valid;
      $("#iuLogout").hidden = !valid;
      $("#iuAdmin").hidden = !valid || owner.role === "teacher";
      document
        .querySelectorAll("[data-iu-auth-only]")
        .forEach((x) => (x.hidden = !valid));
      window.IustazOwner = valid ? owner : null;
      window.dispatchEvent(
        new CustomEvent("iu-auth", { detail: valid ? owner : null }),
      );
    }
    if (page === "constructor.html") {
      const app = $("#builderApp");
      const observe = () =>
        identity(
          !app.hidden && window.ConstructorApp?.owner
            ? ConstructorApp.owner
            : null,
        );
      new MutationObserver(observe).observe(app, {
        attributes: true,
        attributeFilter: ["hidden", "data-ready"],
      });
      observe();
    } else if (typeof window.ensureFirebase === "function") {
      let epoch = 0;
      ensureFirebase()
        .then((sdk) =>
          sdk.auth().onAuthStateChanged(
            async (user) => {
              const n = ++epoch;
              identity(null);
              if (!user?.uid) return;
              try {
                const s = await sdk
                  .firestore()
                  .collection("users")
                  .doc(user.uid)
                  .get();
                if (n === epoch && s.exists)
                  identity({
                    uid: user.uid,
                    role: s.data().role,
                    name: s.data().name || user.displayName || "Мұғалім",
                  });
              } catch {
                if (n === epoch) identity(null);
              }
            },
            () => {
              epoch++;
              identity(null);
            },
          ),
        )
        .catch(() => identity(null));
    } else identity(null);
    window.IustazUI = { el, identity };
    document.documentElement.dataset.iuReady = "true";
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
