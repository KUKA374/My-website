/* DOM-independent matching and two-stage assessment rules. */
(function (root) {
  "use strict";
  function canonical(value) {
    const s = String(value)
      .trim()
      .toLowerCase()
      .replace(/[−–]/g, "-")
      .replace(/\s+/g, "")
      .replace(/^[xyz]=/, "");
    if (s === "∅" || s === "{}") return "set:";
    if (/^\{.*\}$/.test(s))
      return (
        "set:" +
        [...new Set(s.slice(1, -1).split(",").filter(Boolean))].sort().join(",")
      );
    let t = s.replace(",", ".");
    const fraction = t.match(/^(-?\d+)\/(-?\d+)$/),
      ratio = t.match(/^(-?\d+):(-?\d+)$/);
    let n = /^-?\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
    const pair = fraction || ratio;
    if (pair && Number(pair[2]) !== 0) n = Number(pair[1]) / Number(pair[2]);
    if (n !== null && Number.isFinite(n))
      return "number:" + Number(n.toPrecision(12));
    return "text:" + s;
  }
  function uniquePairs(qs) {
    const groups = new Map();
    qs.forEach((q, i) => {
      const key = canonical(q.right);
      if (!groups.has(key))
        groups.set(key, {
          ...q,
          lefts: [],
          sourceIndices: [],
          explanations: [],
        });
      const g = groups.get(key);
      g.lefts.push(q.left);
      g.sourceIndices.push(i);
      if (q._logicExplain) g.explanations.push(q._logicExplain);
    });
    return [...groups.values()].map((g) => ({
      ...g,
      left: g.lefts.join(" ; "),
      _logicExplain: {
        hint: g.explanations.map((x) => x.hint).join(" "),
        solution: g.explanations.map((x) => x.solution).join(" "),
      },
    }));
  }
  function shuffle(list, rng = Math.random) {
    const out = [...list];
    for (let k = out.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [out[k], out[j]] = [out[j], out[k]];
    }
    return out;
  }
  function orders(count, rng = Math.random) {
    const indexes = Array.from({ length: count }, (_, i) => i);
    return { left: shuffle(indexes, rng), right: shuffle(indexes, rng) };
  }
  function part(rows, key, name, correct, value) {
    const row = rows[key] || (rows[key] = {});
    if (row[name]) return false;
    row[name] = { correct: !!correct, value };
    return true;
  }
  function codeParts(qs) {
    return qs.map((q) => String(q.code ?? "").padStart(2, "0"));
  }
  function canUnlock(qs, parts, value) {
    return (
      qs.length > 0 &&
      parts.length === qs.length &&
      qs.every(
        (q, i) => typeof parts[i] === "string" && parts[i] === codeParts(qs)[i],
      ) &&
      String(value) === parts.join("")
    );
  }
  const api = {
    canonical,
    uniquePairs,
    shuffle,
    orders,
    part,
    codeParts,
    canUnlock,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathLogicModels = api;
})(typeof window !== "undefined" ? window : globalThis);
