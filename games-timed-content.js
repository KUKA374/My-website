/* Supplemental short exercises. Original curriculum/question bank is never written. */
(function (root) {
  "use strict";
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const fraction = (a, b) => {
    const d = gcd(a, b);
    return b / d === 1 ? String(a / d) : `${a / d}/${b / d}`;
  };
  function task(lesson, n) {
    let question, answer, solution, facts;
    const a = 2 + (n % 9),
      b = 3 + Math.floor(n / 9),
      x = 2 + (n % 8);
    if (lesson === "5-math-1-1") {
      const c = 11 + n;
      question = `${c} + ${a} = ?`;
      answer = String(c + a);
      solution = `${c} + ${a} = ${answer}. Кері тексеру: ${answer} − ${a} = ${c}.`;
      facts = { type: "add", a: c, b: a };
    } else if (lesson === "6-math-1-1") {
      const den = 5 + Math.floor(n / 4) * 2,
        p = 1 + (n % 4);
      question = `${p}/${den} + 1/${den} = ?`;
      answer = fraction(p + 1, den);
      solution = `Бөлім бірдей: (${p} + 1)/${den} = ${answer}.`;
      facts = { type: "fraction", a: p + 1, b: den, den };
    } else if (lesson === "6-math-1-2") {
      const p = 10 + n,
        q = 10 + (n % 7),
        fmt = (v) => (v / 100).toFixed(2).replace(".", ",");
      question = `${fmt(p)} + ${fmt(q)} = ?`;
      answer = fmt(p + q);
      solution = `Үтірлерді теңестіреміз: (${p} + ${q})/100 = ${answer}.`;
      facts = { type: "decimal", a: p, b: q };
    } else if (lesson === "6-math-1-3") {
      const p = n + 1,
        A = [p, p + 1, p + 2],
        B = [p + 2, p + 3];
      question = `A={${A.join(",")}}, B={${B.join(",")}}. A∩B = ?`;
      answer = `{${p + 2}}`;
      solution = `Екі жиынға ортақ жалғыз элемент — ${p + 2}. Жауап: ${answer}.`;
      facts = { type: "intersection", A, B };
    } else if (lesson === "6-math-1-4") {
      const p = (n + 2) * 4;
      question = `${p} санының 25%-ын тап.`;
      answer = String(p / 4);
      solution = `25% = 1/4; ${p} : 4 = ${answer}.`;
      facts = { type: "percent", n: p };
    } else if (lesson === "6-math-1-5") {
      const p = 2 + n,
        q = p + 1,
        k = 2 + (n % 3);
      question = `${p * k} : ${q * k} қатынасын қысқарт.`;
      answer = `${p} : ${q}`;
      solution = `Екі мүшені ${k}-ке бөлеміз: ${answer}.`;
      facts = { type: "ratio", a: p * k, b: q * k, k };
    } else if (lesson === "6-math-1-6") {
      const p = n + 2;
      question = `${p} : ${p + 1} қатынасына кері қатынас құр.`;
      answer = `${p + 1} : ${p}`;
      solution = `Мүшелерді ауыстырамыз: ${answer}.`;
      facts = { type: "inverse", a: p, b: p + 1 };
    } else if (["6-math-1-7", "7-algebra-1-1"].includes(lesson)) {
      const k = 2 + Math.floor(n / 8);
      question = `${a} : ${b} = x : ${b * k}. x = ?`;
      answer = String(a * k);
      solution = `${b}x = ${a} × ${b * k}; x = ${a * k}.`;
      facts = { type: "proportion", a, b, d: b * k };
    } else if (["7-algebra-1-2", "7-algebra-1-3"].includes(lesson)) {
      const p = 2 + (n % 4),
        q = n + 3,
        c = p * x + q;
      question = `${p}x + ${q} = ${c}. x = ?`;
      answer = String(x);
      solution = `${p}x = ${c} − ${q} = ${p * x}; x = ${p * x} : ${p} = ${x}.`;
      facts = { type: "equation", a: p, b: q, c };
    } else if (lesson === "7-algebra-1-4") {
      // Keep powers small enough for a brief timed calculation; different bases/exponents avoid repeats.
      const p = 2 + (n % 9),
        e = 1 + (Math.floor(n / 9) % 3);
      question = `${p}${["", "¹", "²", "³"][e]} = ?`;
      answer = String(p ** e);
      solution = `${p} дәрежесі ${e}: ${Array(e).fill(p).join(" × ")} = ${answer}.`;
      facts = { type: "power", a: p, e };
    } else return null;
    const options =
      facts.type === "decimal"
        ? [
            answer,
            ...[1, -1, 10].map((d) =>
              ((facts.a + facts.b + d) / 100).toFixed(2).replace(".", ","),
            ),
          ]
        : undefined;
    return {
      ...(options ? { options } : {}),
      question,
      answer,
      facts,
      _logicExplain: {
        hint: "Берілген амалдың ережесін қолданып, кері амалмен тексер.",
        solution,
      },
    };
  }
  function pool(lesson, bank, limit = 100) {
    const result = [],
      seen = new Set();
    for (const q of [
      ...(bank?.quickAnswer || []),
      ...Array.from({ length: 150 }, (_, i) => task(lesson, i)).filter(Boolean),
    ]) {
      if (!q.question || seen.has(q.question.replace(/\s/g, ""))) continue;
      seen.add(q.question.replace(/\s/g, ""));
      result.push({ ...q, ...(q.options ? { options: [...q.options] } : {}) });
      if (result.length === limit) break;
    }
    return result;
  }
  const api = { task, pool, fraction };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathTimedContent = api;
})(typeof window !== "undefined" ? window : globalThis);
