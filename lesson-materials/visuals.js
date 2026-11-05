/* Reusable, typed mathematical figures. No authored SVG/HTML or external assets. */
(function () {
  "use strict";
  const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  function svg(tag, attrs = {}, text) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs))
      e.setAttribute(key, value);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function figure(input, caption = "") {
    const v = LessonMaterialsModel.visual(input);
    caption ||=
      v.kind === "fraction-bar"
        ? `${v.parts} тең бөліктің ${v.filled} бөлігі боялған`
        : v.kind === "number-line"
          ? "Сан сәулесі: " + v.marks.map((m) => m.label).join(", ")
          : v.kind === "venn"
            ? `${v.leftLabel} және ${v.rightLabel} жиындары. Ортақ элементтер: ${v.common.join(", ") || "жоқ"}.`
            : v.kind === "bar-chart"
              ? v.categories.map((c) => `${c.label}: ${c.value}`).join("; ")
              : `${v.yLabel}; ${v.xLabel}`;
    const box = el("figure", undefined, "lesson-visual");
    box.dataset.visual = v.kind;
    if (v.kind === "fraction-bar") {
      const bar = el("div", undefined, "material-fraction-bar");
      bar.setAttribute("role", "img");
      bar.setAttribute(
        "aria-label",
        `${v.parts} тең бөліктің ${v.filled} бөлігі боялған`,
      );
      for (let i = 0; i < v.parts; i++)
        bar.append(el("span", undefined, i < v.filled ? "filled" : ""));
      box.append(bar);
    } else {
      const picture = svg("svg", {
        viewBox: "0 0 480 230",
        role: "img",
        "aria-label": caption || "Математикалық сызба",
      });
      if (v.kind === "number-line") {
        picture.setAttribute("viewBox", "0 0 480 130");
        picture.append(
          svg("path", {
            d: "M30 65H452L443 59M452 65L443 71",
            class: "visual-axis",
          }),
        );
        for (let i = 0; i <= v.divisions; i++) {
          const x = 36 + (i * 400) / v.divisions;
          picture.append(
            svg("line", { x1: x, x2: x, y1: 58, y2: 72, class: "visual-axis" }),
          );
          if (i === 0 || i === v.divisions)
            picture.append(
              svg(
                "text",
                { x, y: 98, "text-anchor": "middle" },
                String(i === 0 ? 0 : 1),
              ),
            );
        }
        for (const m of v.marks) {
          const x = 36 + (m.tick * 400) / v.divisions;
          picture.append(
            svg("circle", { cx: x, cy: 65, r: 7, class: "visual-point" }),
            svg("text", { x, y: 32, "text-anchor": "middle" }, m.label),
          );
        }
      } else if (v.kind === "venn") {
        picture.classList.add("visual-venn");
        picture.setAttribute("viewBox", "0 0 480 280");
        picture.append(
          svg("rect", {
            x: 10,
            y: 10,
            width: 460,
            height: 260,
            rx: 12,
            fill: "white",
            stroke: "#c9b8ea",
          }),
          svg("ellipse", {
            cx: 185,
            cy: 143,
            rx: 115,
            ry: 100,
            fill: "#ece3ff",
            "fill-opacity": 0.8,
            stroke: "#7651bc",
          }),
          svg("ellipse", {
            cx: 295,
            cy: 143,
            rx: 115,
            ry: 100,
            fill: "#e0edff",
            "fill-opacity": 0.7,
            stroke: "#466b9b",
          }),
          svg("text", { x: 126, y: 38, "text-anchor": "middle" }, v.leftLabel),
          svg("text", { x: 354, y: 38, "text-anchor": "middle" }, v.rightLabel),
        );
        for (const [region, x, y] of [
          ["leftOnly", 135, 105],
          ["common", 240, 105],
          ["rightOnly", 345, 105],
          ["outside", 40, 75],
        ])
          (v[region].length ? v[region] : ["∅"]).forEach((value, i) =>
            picture.append(
              svg("text", { x, y: y + i * 30, "text-anchor": "middle" }, value),
            ),
          );
      } else if (v.kind === "bar-chart") {
        picture.classList.add("visual-bar-chart");
        picture.setAttribute("viewBox", "0 0 480 260");
        for (let i = 0; i <= 4; i++) {
          const y = 210 - i * 43;
          picture.append(
            svg("line", {
              x1: 43,
              y1: y,
              x2: 465,
              y2: y,
              class: "visual-grid",
            }),
            svg(
              "text",
              { x: 34, y: y + 5, "text-anchor": "end" },
              String((v.max * i) / 4),
            ),
          );
        }
        const step = 410 / v.categories.length;
        v.categories.forEach((c, i) => {
          const x = 49 + i * step,
            height = (c.value / v.max) * 172;
          picture.append(
            svg("rect", {
              x: x + step * 0.17,
              y: 210 - height,
              width: step * 0.66,
              height,
              rx: 4,
              fill: i % 2 ? "#9164da" : "#6840b8",
            }),
            svg(
              "text",
              { x: x + step / 2, y: 200 - height, "text-anchor": "middle" },
              String(c.value),
            ),
            svg(
              "text",
              { x: x + step / 2, y: 241, "text-anchor": "middle" },
              c.label,
            ),
          );
        });
      } else {
        const x = (n) => 46 + (n / v.maxX) * 390,
          y = (n) => 184 - (n / v.maxY) * 132;
        for (let i = 0; i <= 4; i++) {
          picture.append(
            svg("path", {
              d: `M46 ${y((v.maxY * i) / 4)}H436M${x((v.maxX * i) / 4)} 52V184`,
              class: "visual-grid",
            }),
          );
          picture.append(
            svg(
              "text",
              { x: x((v.maxX * i) / 4), y: 207, "text-anchor": "middle" },
              String((v.maxX * i) / 4),
            ),
            svg(
              "text",
              { x: 29, y: y((v.maxY * i) / 4) + 5, "text-anchor": "end" },
              String((v.maxY * i) / 4),
            ),
          );
        }
        picture.append(
          svg("path", { d: "M46 42V184H451", class: "visual-axis" }),
          svg("polyline", {
            points: v.points.map((p) => `${x(p.x)},${y(p.y)}`).join(" "),
            class: "visual-line",
          }),
        );
        for (const p of v.points)
          picture.append(
            svg("circle", {
              cx: x(p.x),
              cy: y(p.y),
              r: 5,
              class: "visual-point",
            }),
          );
        picture.append(
          svg("text", { x: 48, y: 24 }, v.yLabel),
          svg("text", { x: 450, y: 228, "text-anchor": "end" }, v.xLabel),
        );
      }
      box.append(picture);
    }
    if (caption) box.append(el("figcaption", caption));
    return box;
  }
  function formula(text) {
    const line = el("div", undefined, "material-formula");
    line.setAttribute("role", "math");
    line.setAttribute("aria-label", text);
    // Stacked simple fractions, safe text for every other symbol. KaTeX remains slide-only and lazy.
    for (const part of text.split(/(\b(?:\d+|[a-z])\/(?:\d+|[a-z])\b)/g)) {
      if (/^(?:\d+|[a-z])\/(?:\d+|[a-z])$/.test(part)) {
        const f = el("span", undefined, "math-fraction");
        const [a, b] = part.split("/");
        f.append(el("span", a), el("span", b));
        line.append(f);
      } else line.append(document.createTextNode(part));
    }
    return line;
  }
  window.LessonVisuals = { figure, formula };
})();
