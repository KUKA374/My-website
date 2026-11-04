/* Topic-scoped, progressively structured exercises; original question banks are read only. */
(function (root) {
  "use strict";
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const frac = (a, b) => {
    const d = gcd(a, b);
    return b / d === 1 ? String(a / d) : `${a / d}/${b / d}`;
  };
  const dec = (n) => (n / 100).toFixed(2).replace(".", ",");
  const skills = {
    "5-math-1-1": ["Қосу", "Көбейту", "Жақша және амал реті"],
    "6-math-1-1": [
      "Бөлімдері бірдей бөлшектер",
      "Ортақ бөлім",
      "Бөлшектерді көбейту",
    ],
    "6-math-1-2": [
      "Ондық бөлшектерді қосу",
      "Ондық бөлшекті көбейту",
      "Екі амалды есептеу",
    ],
    "6-math-1-3": [
      "Жиындардың қиылысуы",
      "Жиындардың бірігуі",
      "Үш жиынмен амал",
    ],
    "6-math-1-4": [
      "Санның пайызын табу",
      "Пайызы бойынша санды табу",
      "Пайыздық өсім",
    ],
    "6-math-1-5": [
      "Қатынасты қысқарту",
      "Қатынас бойынша бөлу",
      "Бөліктің пайызын табу",
    ],
    "6-math-1-6": [
      "Кері қатынас",
      "Кері қатынасты қысқарту",
      "Кері қатынас бойынша бөлу",
    ],
    "6-math-1-7": [
      "Пропорциядағы белгісіз",
      "Пропорцияны түрлендіру",
      "Шамалардың пропорциясы",
    ],
    "7-algebra-1-1": [
      "Пропорциядағы белгісіз",
      "Пропорцияны түрлендіру",
      "Шамалардың пропорциясы",
    ],
    "7-algebra-1-2": [
      "Сызықтық теңдеу",
      "Жақшалы теңдеу",
      "Екі жағында белгісізі бар теңдеу",
    ],
    "7-algebra-1-3": [
      "Сызықтық теңдеу",
      "Жақшалы теңдеу",
      "Екі жағында белгісізі бар теңдеу",
    ],
    "7-algebra-1-4": [
      "Дәрежені есептеу",
      "Дәреже және қосу",
      "Дәреже мен амал реті",
    ],
  };
  function variants(answer) {
    const s = String(answer),
      f = s.match(/^(-?\d+)\/(\d+)$/),
      r = s.replace(/\s/g, "").match(/^(\d+):(\d+)$/);
    if (f)
      return [s, ...[1, 2, 3].map((d) => frac(Number(f[1]) + d, Number(f[2])))];
    if (r) return [s, ...[1, 2, 3].map((d) => `${Number(r[1]) + d} : ${r[2]}`)];
    if (s.startsWith("{")) {
      const a = s.slice(1, -1).split(",").filter(Boolean).map(Number),
        next = Math.max(0, ...a) + 1;
      return [
        s,
        `{${[...a, next].join(",")}}`,
        `{${a.slice(1).join(",")}}`,
        `{${[...a, next + 1].join(",")}}`,
      ];
    }
    const n = Number(s.replace(",", "."));
    return [
      s,
      ...[1, 2, 3].map((d) =>
        s.includes(",")
          ? (n + d / 100).toFixed(2).replace(".", ",")
          : String(n + d),
      ),
    ];
  }
  function task(lesson, n, tier = 0) {
    if (
      !skills[lesson] ||
      !Number.isInteger(n) ||
      n < 0 ||
      ![0, 1, 2].includes(tier)
    )
      return null;
    let question, answer, solution, facts;
    const a = 2 + (n % 7),
      b = 3 + (n % 5),
      k = 2 + (n % 3),
      x = 2 + (n % 8);
    if (lesson === "5-math-1-1") {
      const p = 12 + n,
        q = a;
      if (tier === 0) {
        question = `${p} + ${q} = ?`;
        answer = String(p + q);
        solution = `${p} + ${q} = ${answer}.`;
        facts = { type: "add", a: p, b: q };
      }
      if (tier === 1) {
        question = `${p} × ${q} = ?`;
        answer = String(p * q);
        solution = `(${Math.floor(p / 10) * 10} + ${p % 10}) × ${q} = ${answer}.`;
        facts = { type: "multiply", a: p, b: q };
      }
      if (tier === 2) {
        question = `(${p} + ${q}) × ${k} = ?`;
        answer = String((p + q) * k);
        solution = `Алдымен жақша: ${p}+${q}=${p + q}. Кейін ${p + q}×${k}=${answer}.`;
        facts = { type: "combined", a: p, b: q, k };
      }
    } else if (lesson === "6-math-1-1") {
      const d = 7 + 2 * n,
        p = 1 + (n % 3);
      if (tier === 0) {
        question = `${p}/${d} + 1/${d} = ?`;
        answer = frac(p + 1, d);
        solution = `Бөлім бірдей: (${p}+1)/${d}=${answer}.`;
        facts = { type: "fraction", num: p + 1, den: d };
      }
      if (tier === 1) {
        question = `1/${d} + 1/${2 * d} = ?`;
        answer = frac(3, 2 * d);
        solution = `1/${d}=2/${2 * d}; (2+1)/${2 * d}=${answer}.`;
        facts = { type: "fraction", num: 3, den: 2 * d };
      }
      if (tier === 2) {
        question = `${p}/${d} × 2/5 = ?`;
        answer = frac(2 * p, 5 * d);
        solution = `Алымдарды, кейін бөлімдерді көбейт: ${2 * p}/${5 * d}=${answer}.`;
        facts = { type: "fraction", num: 2 * p, den: 5 * d };
      }
    } else if (lesson === "6-math-1-2") {
      const p = 125 + n,
        q = 25 + a;
      if (tier === 0) {
        question = `${dec(p)} + ${dec(q)} = ?`;
        answer = dec(p + q);
        solution = `Разрядтарды теңестір: (${p}+${q})/100=${answer}.`;
        facts = { type: "decimal", a: p, b: q, k: 1 };
      }
      if (tier === 1) {
        question = `${dec(p)} × ${k} = ?`;
        answer = dec(p * k);
        solution = `${p}×${k}/100=${answer}.`;
        facts = { type: "decimal", a: p, b: 0, k };
      }
      if (tier === 2) {
        question = `(${dec(p)} + ${dec(q)}) × ${k} = ?`;
        answer = dec((p + q) * k);
        solution = `Жақша: ${dec(p + q)}. Оны ${k}-ке көбейт: ${answer}.`;
        facts = { type: "decimal", a: p, b: q, k };
      }
    } else if (lesson === "6-math-1-3") {
      const p = n + 1,
        A = [p, p + 1, p + 2],
        B = [p + 2, p + 3],
        D = [p + 1, p + 3, p + 4];
      let values;
      if (tier === 0) {
        question = `A={${A}}, B={${B}}. A∩B = ?`;
        values = A.filter((v) => B.includes(v));
      }
      if (tier === 1) {
        question = `A={${A}}, B={${B}}. A∪B = ?`;
        values = [...new Set([...A, ...B])];
      }
      if (tier === 2) {
        question = `A={${A}}, B={${B}}, C={${D}}. (A∪B)∩C = ?`;
        values = [...new Set([...A, ...B])].filter((v) => D.includes(v));
      }
      answer = `{${values.join(",")}}`;
      solution = `${tier === 0 ? "Ортақ элементтерді ал" : tier === 1 ? "Барлық элементті бір рет жаз" : "Алдымен біріктір, кейін C-мен қиылысуды тап"}: ${answer}.`;
      facts = { type: "sets", A, B, C: D, op: tier };
    } else if (lesson === "6-math-1-4") {
      const p = (n + 5) * 20;
      if (tier === 0) {
        question = `${p} санының 25%-ын тап.`;
        answer = String(p / 4);
        solution = `25%=1/4; ${p}:4=${answer}.`;
        facts = { type: "percent", n: p, mode: 0 };
      }
      if (tier === 1) {
        question = `Санның 25%-ы ${p / 4}. Санның өзін тап.`;
        answer = String(p);
        solution = `Бүтін сан: ${p / 4}×4=${p}.`;
        facts = { type: "percent", n: p, mode: 1 };
      }
      if (tier === 2) {
        question = `${p} бағасы 20%-ға өсті. Жаңа баға қандай?`;
        answer = String((p * 6) / 5);
        solution = `Өсім: ${p}:5=${p / 5}. Жаңа баға: ${p}+${p / 5}=${answer}.`;
        facts = { type: "percent", n: p, mode: 2 };
      }
    } else if (lesson === "6-math-1-5") {
      const p = n + 2,
        q = p + 1,
        total = (p + q) * k;
      if (tier === 0) {
        question = `${p * k} : ${q * k} қатынасын қысқарт.`;
        answer = `${p} : ${q}`;
        solution = `Екі мүшені ${k}-ке бөл: ${answer}.`;
        facts = { type: "ratio", a: p * k, b: q * k };
      }
      if (tier === 1) {
        question = `${total} зат ${p}:${q} қатынасымен бөлінді. Бірінші бөлік қанша?`;
        answer = String(p * k);
        solution = `Бір үлес: ${total}:(${p}+${q})=${k}. Бірінші бөлік: ${p}×${k}=${answer}.`;
        facts = { type: "share", a: p, b: q, total };
      }
      if (tier === 2) {
        const percent = [10, 20, 25, 40, 50, 60, 75, 80][n % 8],
          whole = 20 * (1 + (n % 3)),
          part = (whole * percent) / 100;
        question = `${whole} оқушының ${part}-і үйірмеге қатысады. Бұл неше пайыз?`;
        answer = String(percent);
        solution = `${part}:${whole}×100=${percent}. Жауап: ${percent}%.`;
        facts = { type: "part-percent", part, whole };
      }
    } else if (lesson === "6-math-1-6") {
      const p = n + 2,
        q = p + 1;
      if (tier === 0) {
        question = `${p}:${q} қатынасына кері қатынас құр.`;
        answer = `${q} : ${p}`;
        solution = `Мүшелерді ауыстыр: ${answer}.`;
        facts = { type: "inverse", a: p, b: q };
      }
      if (tier === 1) {
        question = `${p * k}:${q * k} қатынасының кері қатынасын қысқарт.`;
        answer = `${q} : ${p}`;
        solution = `Алдымен ауыстыр, кейін ${k}-ке бөл: ${answer}.`;
        facts = { type: "inverse", a: p * k, b: q * k };
      }
      if (tier === 2) {
        const total = (p + q) * k;
        question = `${total} зат ${p}:${q} қатынасына кері қатынаспен бөлінді. Бірінші бөлік қанша?`;
        answer = String(q * k);
        solution = `Кері қатынас ${q}:${p}. Бір үлес ${k}; бірінші бөлік ${q}×${k}=${answer}.`;
        facts = { type: "inverse-share", a: p, b: q, total };
      }
    } else if (["6-math-1-7", "7-algebra-1-1"].includes(lesson)) {
      const p = a,
        d = b * k;
      if (tier === 0) {
        question = `${p}:${b}=x:${d}. x = ?`;
        answer = String(p * k);
        solution = `${b}x=${p}×${d}; x=${p * k}.`;
        facts = { type: "proportion", a: p, b, d };
      }
      if (tier === 1) {
        question = `${p}:x=${p * k}:${d}. x = ?`;
        answer = String(b);
        solution = `${p * k}x=${p}×${d}; x=${b}.`;
        facts = { type: "proportion-middle", a: p, c: p * k, d };
      }
      if (tier === 2) {
        const unit = 5 + n;
        question = `${b} дәптер ${b * unit} ұпай тұрады. ${d} дәптерге қанша ұпай қажет?`;
        answer = String(d * unit);
        solution = `Бір дәптер: ${b * unit}:${b}=${unit}. ${d} дәптер: ${d}×${unit}=${answer}.`;
        facts = { type: "cost", count: b, total: b * unit, newCount: d };
      }
    } else if (["7-algebra-1-2", "7-algebra-1-3"].includes(lesson)) {
      const c = 5 + n;
      if (tier === 0) {
        question = `${a}x + ${c} = ${a * x + c}. x = ?`;
        answer = String(x);
        solution = `${a}x=${a * x + c}−${c}=${a * x}; x=${x}.`;
        facts = { type: "equation", a, b: c, d: 0, c: a * x + c };
      }
      if (tier === 1) {
        question = `${a}(x + ${c}) = ${a * (x + c)}. x = ?`;
        answer = String(x);
        solution = `x+${c}=${x + c}; x=${x + c}−${c}=${x}.`;
        facts = { type: "bracket", a, b: c, c: a * (x + c) };
      }
      if (tier === 2) {
        question = `${a + 2}x + ${c} = 2x + ${a * x + c}. x = ?`;
        answer = String(x);
        solution = `${a}x=${a * x + c}−${c}=${a * x}; x=${x}.`;
        facts = { type: "equation", a: a + 2, b: c, d: 2, c: a * x + c };
      }
    } else {
      const p = 2 + (n % 8),
        e = 2 + (Math.floor(n / 8) % 2);
      if (tier === 0) {
        question = `${p}${e === 2 ? "²" : "³"} = ?`;
        answer = String(p ** e);
        solution = `${Array(e).fill(p).join("×")}=${answer}.`;
        facts = { type: "power", a: p, e, add: 0, k: 1 };
      }
      if (tier === 1) {
        question = `${p}² + ${p} = ?`;
        answer = String(p * p + p);
        solution = `${p}²=${p * p}; ${p * p}+${p}=${answer}.`;
        facts = { type: "power", a: p, e: 2, add: p, k: 1 };
      }
      if (tier === 2) {
        question = `(${p}² + ${p}) × ${k} = ?`;
        answer = String((p * p + p) * k);
        solution = `Алдымен дәреже ${p * p}, кейін қосу ${p * p + p}, соңында ×${k}: ${answer}.`;
        facts = { type: "power", a: p, e: 2, add: p, k };
      }
    }
    return {
      question,
      answer,
      options: variants(answer),
      facts,
      _finalMeta: { tier, skill: skills[lesson][tier] },
      _logicExplain: {
        hint:
          skills[lesson][tier] +
          " ережесін қолдан. " +
          (tier === 2
            ? "Амалдардың ретін сақта."
            : "Жауапты кері амалмен тексер."),
        solution,
      },
    };
  }
  function deck(id, lesson, settings = {}) {
    if (!skills[lesson]) return [];
    let plan;
    if (id === "quest")
      plan = [
        { tier: 0, kind: "solve", station: 0 },
        { tier: 1, kind: "match", station: 1 },
        { tier: 1, kind: "match", station: 1 },
        { tier: 1, kind: "error", station: 2 },
        { tier: 2, kind: "solve", station: 3 },
        { tier: 1, kind: "match", station: 3 },
        { tier: 1, kind: "match", station: 3 },
        { tier: 2, kind: "error", station: 3 },
      ];
    else if (id === "math-king")
      plan = Array.from({ length: 20 }, (_, i) => ({
        tier: i < 15 ? Math.floor(i / 5) : [0, 1, 2, 1, 2][i % 5],
        kind: "solve",
        level: Math.floor(i / 5),
      }));
    else {
      const count =
        id === "puzzle"
          ? (settings.grid || 2) ** 2
          : ["rocket", "bridge", "castle"].includes(id)
            ? 6
            : 4;
      plan = Array.from({ length: count }, (_, i) => ({
        tier:
          id === "puzzle"
            ? Math.min(2, Math.floor((i * 3) / count))
            : Math.min(2, Math.floor((i * 3) / count)),
        kind: "solve",
      }));
    }
    return plan.map((meta, i) => {
      let n = i,
        q = task(lesson, n, meta.tier);
      if (meta.kind === "match" && i && plan[i - 1].kind === "match")
        while (q.answer === task(lesson, i - 1, plan[i - 1].tier).answer)
          q = task(lesson, ++n, meta.tier);
      return {
        ...q,
        _finalMeta: { ...q._finalMeta, ...meta },
        _sessionKey: `final:${id}:${lesson}:${i}`,
      };
    });
  }
  const api = { skills, task, deck, variants, frac, gcd };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathFinalContent = api;
})(typeof window !== "undefined" ? window : globalThis);
