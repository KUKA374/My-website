/* Presentation and accessibility only. Never writes to a game model, score or clock. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const key = "math-ai-game-display-v1";
  const symbols = {
    match: "🧩",
    "find-error": "🔎",
    "quick-answer": "⚡",
    "math-code": "🔓",
    detective: "📁",
    "tug-of-war": "🪢",
    "math-race": "🏁",
    wheel: "🎡",
    auction: "💰",
    blitz: "⏱",
    cards: "🃏",
    quest: "🗺️",
    "secret-number": "🔑",
    puzzle: "🧩",
    rocket: "🛰️",
    castle: "🛡️",
    "car-race": "🏎️",
    target: "🎯",
    bridge: "🌉",
    "math-king": "👑",
  };
  let settings = { projector: false, reduced: false };
  let busy = false;
  let leavingFullscreen = false;
  let returnFocus = null;
  let lastPhase = "library";
  let focusedAction = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (
      saved &&
      typeof saved.projector === "boolean" &&
      typeof saved.reduced === "boolean"
    )
      settings = saved;
  } catch (_) {
    /* Display preferences must never block a game. */
  }
  const visible = (e) =>
    !!e && e.getClientRects().length > 0 && !e.closest("[hidden]");
  function announce(message) {
    $("designStatus").textContent = message;
  }
  function apply() {
    body.classList.toggle("design-projector", settings.projector);
    body.classList.toggle("design-reduced", settings.reduced);
    $("designProjector").setAttribute(
      "aria-pressed",
      String(settings.projector),
    );
    $("designMotion").setAttribute("aria-pressed", String(settings.reduced));
  }
  function save() {
    apply();
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (_) {
      announce(
        "Көрсету баптауы осы жолы ғана қолданылады: браузерге сақтау мүмкін болмады.",
      );
    }
  }
  $("designProjector").onclick = () => {
    settings.projector = !settings.projector;
    announce(
      settings.projector
        ? "Проектор көрінісі қосылды: есептер мен ұпайлар үлкейтілді."
        : "Қалыпты көрініс қосылды.",
    );
    save();
  };
  $("designMotion").onclick = () => {
    settings.reduced = !settings.reduced;
    announce(
      settings.reduced
        ? "Қозғалыс азайтылды. Ойын ережесі мен таймер өзгермейді."
        : "Құрылғының қозғалыс баптауы қолданылады.",
    );
    save();
  };
  function fullState() {
    const active = document.fullscreenElement === $("gameStage");
    $("designFullscreen").setAttribute("aria-pressed", String(active));
    $("designFullscreen").textContent = active
      ? "Толық экраннан шығу"
      : "Толық экран";
  }
  $("designFullscreen").onclick = async () => {
    if (busy) return;
    busy = true;
    $("designFullscreen").disabled = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ($("gameStage").requestFullscreen)
        await $("gameStage").requestFullscreen();
      else throw Error("unsupported");
      fullState();
    } catch (_) {
      announce(
        "Бұл браузерде толық экран ашылмады. Проектор көрінісін қолдануға болады.",
      );
    } finally {
      busy = false;
      $("designFullscreen").disabled = false;
    }
  };
  function leaveHiddenStage() {
    if (leavingFullscreen || document.fullscreenElement !== $("gameStage"))
      return;
    leavingFullscreen = true;
    document
      .exitFullscreen()
      .catch(() => {})
      .finally(() => {
        leavingFullscreen = false;
      });
  }
  document.addEventListener("fullscreenchange", () => {
    fullState();
    if (!visible($("gameStage"))) {
      leaveHiddenStage();
      if (!document.fullscreenElement && visible(returnFocus))
        returnFocus.focus({ preventScroll: true });
    }
  });
  const search = $("designSearch");
  function filter() {
    const term = search.value.trim().toLocaleLowerCase("kk-KZ");
    let n = 0;
    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      const title = card.querySelector("h3")?.textContent || "";
      const match = title.toLocaleLowerCase("kk-KZ").includes(term);
      card.hidden = !match;
      if (match) n++;
    });
    $("designSearchCount").textContent = `${n} ойын`;
    $("designSearchEmpty").hidden = n !== 0;
  }
  search.addEventListener("input", filter);
  $("designSearchClear").onclick = () => {
    search.value = "";
    filter();
    search.focus();
  };
  $("designSkip").onclick = (event) => {
    event.preventDefault();
    const target = visible($("gameStage"))
      ? visible($("gameArea"))
        ? $("gameQuestion")
        : $("selectedGameHeading")
      : $("gamesGrid");
    target.focus();
    target.scrollIntoView({ block: "start" });
  };
  document.addEventListener("focusin", (event) => {
    const el = event.target;
    if (!$("gameQuestion").contains(el) || !el.matches("button")) {
      focusedAction = null;
      return;
    }
    const attribute = [...el.attributes].find((a) =>
      a.name.startsWith("data-"),
    );
    focusedAction = {
      el,
      selector: el.id
        ? "#" + CSS.escape(el.id)
        : attribute
          ? `[${attribute.name}="${CSS.escape(attribute.value)}"]`
          : null,
    };
  });
  function phase() {
    if (!visible($("gameStage"))) return "library";
    if (visible($("gameSetup"))) return "setup";
    if (visible($("sharedPauseOverlay"))) return "paused";
    if ($("gameProgress").textContent === "Нәтиже") return "result";
    return "playing";
  }
  function enhance() {
    const current = phase();
    if (current === "library") leaveHiddenStage();
    document.querySelectorAll(".final-game > header > p").forEach((p) => {
      if (p.textContent === "Таңдалған тақырыптың оқу ойыны")
        p.classList.add("design-redundant");
    });
    const finish = document.querySelector(
      ".final-finish,.mechanic-finish,.logic-finish,.racing-finish,.timed-finish",
    );
    if (finish && !finish.querySelector(".design-result-mark")) {
      const mark = document.createElement("span");
      mark.className = "design-result-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = symbols[body.dataset.game] || "✓";
      finish.prepend(mark);
    }
    document
      .querySelectorAll(
        ".final-feedback,.timed-feedback,.racing-car-feedback,.logic-status,.mechanic-task [role='status']",
      )
      .forEach((e) => {
        if (!e.hasAttribute("role")) e.setAttribute("role", "status");
        if (!e.hasAttribute("aria-atomic"))
          e.setAttribute("aria-atomic", "true");
        const title = e.querySelector("h3")?.textContent || "";
        const feedback = title.includes("✕")
          ? "incorrect"
          : title.includes("✓") || title.includes("Дәл тиді")
            ? "correct"
            : title.includes("Уақыт аяқталды")
              ? "timeout"
              : "";
        if (feedback && e.dataset.designFeedback !== feedback)
          e.dataset.designFeedback = feedback;
      });
    document
      .querySelectorAll(".logic-pair,.final-match-columns button")
      .forEach((e) => {
        const selected = String(
          e.classList.contains("is-selected") ||
            e.classList.contains("match-selected"),
        );
        if (e.getAttribute("aria-pressed") !== selected)
          e.setAttribute("aria-pressed", selected);
      });
    if (current !== lastPhase) {
      if (current === "setup") {
        returnFocus = document.querySelector(
          `.game-card[data-game-id="${body.dataset.game}"]`,
        );
        $("selectedGameHeading").focus({ preventScroll: true });
      } else if (current === "paused")
        $("resumePausedButton").focus({ preventScroll: true });
      else if (lastPhase === "paused" && current === "playing")
        $("gameQuestion").focus({ preventScroll: true });
      else if (current === "result") {
        const heading = document.querySelector(
          ".shared-summary h2,.final-finish h2,.mechanic-finish h2,.logic-finish h2,.racing-finish h2,.timed-finish h2",
        );
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      } else if (current === "library" && returnFocus)
        returnFocus.focus({ preventScroll: true });
      lastPhase = current;
    }
    if (
      current === "playing" &&
      focusedAction &&
      !focusedAction.el.isConnected &&
      document.activeElement === body
    ) {
      const replacement =
        focusedAction.selector &&
        $("gameQuestion").querySelector(focusedAction.selector);
      const next =
        replacement && !replacement.disabled
          ? replacement
          : $("gameQuestion").querySelector(
              "[role='status'] button:not(:disabled),button:not(:disabled)",
            );
      if (visible(next)) next.focus({ preventScroll: true });
    }
  }
  // Microtasks work even when the shared game clock is paused. No game handlers are wrapped.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      enhance();
    });
  }).observe($("gameStage"), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "hidden"],
  });
  apply();
  fullState();
  filter();
  enhance();
})();
