/* Lesson-page adapter only. No question-bank or game-engine mutation. */
(function (root) {
  "use strict";
  function key(material, context, metadata) {
    const prefix =
      [context.grade, context.subject, context.quarter].join("-") + "-";
    const source = material.games.topicKey || prefix + context.number;
    return source.startsWith(prefix) && Object.hasOwn(metadata.lessons, source)
      ? source
      : null;
  }
  function description(material, context, metadata) {
    const source = key(material, context, metadata);
    if (!source)
      return "Бұл сабаққа сәйкес дайын ойын тақырыбы әзірге тіркелмеген.";
    if (
      source ===
      [context.grade, context.subject, context.quarter, context.number].join(
        "-",
      )
    )
      return "";
    return `Каталогтан ${context.grade}-сынып, «${metadata.lessons[source][0]}» (№${source.split("-").at(-1)}) тақырыбын таңдаңыз. Бұл — осы сабақтың дағдысын бекітетін қолданыстағы банк; жаңа сабақ есептері ойынға автоматты көшірілмейді.`;
  }
  function describe(current, metadata, target) {
    const text = description(
      current.material,
      current.catalog.identity,
      metadata,
    );
    if (!text) return;
    const p = document.createElement("p");
    p.className = "iu-muted";
    p.dataset.gameContext = "true";
    p.textContent = text;
    target.append(p);
  }
  const api = { key, description, describe };
  if (typeof module !== "undefined") module.exports = api;
  else root.LessonGames = api;
})(typeof window !== "undefined" ? window : globalThis);
