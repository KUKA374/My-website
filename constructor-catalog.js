/* Read adapters over existing data. No bank mutation or invented learning objectives. */
(function () {
  "use strict";
  const loaded = new Map();
  function script(src) {
    if (!loaded.has(src))
      loaded.set(
        src,
        new Promise((yes, no) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = yes;
          s.onerror = () =>
            no(Error("Оқу дерегі жүктелмеді. Қолмен енгізуге болады."));
          document.head.append(s);
        }),
      );
    return loaded.get(src);
  }
  async function grade(g) {
    const files =
      g === "8"
        ? ["ktp-8-loader.js"]
        : g === "9"
          ? ["ktp-9-algebra.js", "ktp-9-geometry.js"]
          : g === "10"
            ? ["ktp-10.js"]
            : g === "11"
              ? ["ktp-11.js"]
              : [];
    for (const f of files) await script(f);
    await Promise.resolve(window.ktpReady);
    for (const [k, v] of Object.entries(window.ktpPlans || {})) {
      if (k.startsWith(g + "_") && Array.isArray(v?.lessons))
        for (let q = 1; q <= 4; q++) {
          const rows = v.lessons.filter((x) => Number(x.quarter) === q);
          if (rows.length) (window.ktpD ||= {})[k + "_q" + q] = rows;
        }
    }
  }
  function rows(g, s, q) {
    return window.getKtpQuarterLessons(g, s, q);
  }
  let legacy = {};
  async function legacyContent() {
    if (!window.Worker) return;
    await new Promise((resolve) => {
      const worker = new Worker("constructor-legacy-worker.js");
      const timer = setTimeout(() => {
        worker.terminate();
        resolve();
      }, 5000);
      worker.onmessage = (e) => {
        legacy = e.data?.content || {};
        clearTimeout(timer);
        worker.terminate();
        resolve();
      };
      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        resolve();
      };
    });
  }
  function content(g, s, q, n) {
    return (
      window.lessonContent?.[`${g}_${s}_${q}_${n}`] ||
      (g === "7" && s === "algebra" && String(q) === "1" ? legacy[n] : null) ||
      null
    );
  }
  function text(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    const d = template.content;
    d.querySelectorAll("script,style,iframe,object,embed,template").forEach(
      (e) => e.remove(),
    );
    d.querySelectorAll("br").forEach((e) => e.replaceWith("\n"));
    d.querySelectorAll("p,li,h1,h2,h3,tr").forEach((e) => e.append("\n"));
    return d.textContent.trim();
  }
  function blocks(c) {
    if (!c) return [];
    return [
      ["theory", "text"],
      ["explanation", "text"],
      ["examples", "example"],
      ["commonMistakes", "mistake"],
    ]
      .filter(([k]) => c[k])
      .map(([k, type]) => ({
        id: LessonModel.id(),
        type,
        body: text(c[k]),
        aux: "",
      }));
  }
  function bank(g, s, q, n) {
    const c = content(g, s, q, n);
    if (!c) return [];
    const result = [];
    for (const [k, kind] of [
      ["pairWork", "pair"],
      ["groupWork", "group"],
      ["individualWork", "individual"],
      ["homework", "homework"],
    ]) {
      const template = document.createElement("template");
      template.innerHTML = String(c[k] || "");
      const d = template.content;
      d.querySelectorAll("script,style,iframe,object,embed").forEach((e) =>
        e.remove(),
      );
      for (const li of d.querySelectorAll("li")) {
        const detail = li.querySelector("details");
        let ans = "";
        if (detail) {
          ans = text(
            detail.innerHTML.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, ""),
          );
          detail.remove();
        } else {
          const marker = [...li.querySelectorAll("strong,b")].find((el) =>
            /^Жауабы\s*:/i.test(el.textContent.trim()),
          );
          if (!marker) continue;
          let next = marker.nextSibling;
          while (next) {
            const node = next;
            next = next.nextSibling;
            ans += node.textContent;
            node.remove();
          }
          marker.remove();
          ans = ans.trim();
        }
        const prompt = li.textContent.trim();
        if (!prompt || !ans) continue;
        result.push({
          ...LessonModel.task(),
          id: `bank:${g}:${s}:${q}:${n}:${k}:${result.length}`,
          prompt,
          answer: ans,
          solution: "",
          topic: `${g}_${s}_${q}_${n}`,
          objective: "",
          level: "unclassified",
          source:
            "Қолданыстағы авторлық материал; шешімі мен деңгейін мұғалім тексереді",
          workKind: kind,
        });
      }
    }
    return result;
  }
  window.LessonCatalog = {
    grade,
    rows,
    content,
    text,
    blocks,
    bank,
    legacyContent,
  };
})();
