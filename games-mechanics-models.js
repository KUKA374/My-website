/* Pure rules for three distinct learning games. */
(function (root) {
  "use strict";
  const digitSum = (n) =>
    String(n)
      .split("")
      .reduce((s, c) => s + Number(c), 0);
  function constraints(number) {
    const digits = String(number).length,
      lo = digits === 2 ? 10 : Math.floor(number / 100) * 100,
      hi = digits === 2 ? 99 : lo + 99;
    return [
      {
        kind: "range",
        lo,
        hi,
        text: `Сан ${lo} мен ${hi} аралығында (шеттері кіреді).`,
      },
      {
        kind: "parity",
        value: number % 2,
        text: `Сан ${number % 2 ? "тақ" : "жұп"}.`,
      },
      {
        kind: "sum",
        value: digitSum(number),
        text: `Цифрларының қосындысы ${digitSum(number)}.`,
      },
      {
        kind: "remainder",
        divisor: 11,
        value: number % 11,
        text:
          number % 11
            ? `11-ге бөлгендегі қалдық ${number % 11}.`
            : "Сан 11-ге қалдықсыз бөлінеді.",
      },
    ];
  }
  function satisfies(n, c) {
    if (c.kind === "range") return n >= c.lo && n <= c.hi;
    if (c.kind === "parity") return n % 2 === c.value;
    if (c.kind === "sum") return digitSum(n) === c.value;
    if (c.kind === "remainder") return n % c.divisor === c.value;
    return false;
  }
  function secret(number, count) {
    if (!Number.isInteger(number) || number < 10 || number > 999 || count < 1)
      throw Error("Жасырын сан не тапсырма саны жарамсыз.");
    const rules = constraints(number),
      groups = Array.from({ length: count }, () => []);
    rules.forEach((c, i) =>
      groups[Math.min(count - 1, Math.floor((i * count) / 4))].push(c),
    );
    const candidates = [];
    for (
      let n = 10 ** (String(number).length - 1);
      n < 10 ** String(number).length;
      n++
    )
      if (rules.every((c) => satisfies(n, c))) candidates.push(n);
    if (candidates.length !== 1 || candidates[0] !== number)
      throw Error("Шарттар жалғыз санды анықтамайды.");
    return { number, digits: String(number).length, groups, candidates };
  }
  const stories = [
    [
      "Кітапхананың құпия жәшігі",
      "Мектеп кітапханасына жаңа кітаптар келді. Жәшіктердің өлшеу журналдары араласып кеткен. Есептерді шешіп, дұрыс журналға сәйкес жәшікті тап.",
      ["Көк жәшік", "Жасыл жәшік", "Сары жәшік", "Күлгін жәшік", "Ақ жәшік"],
    ],
    [
      "Ғылыми саябақтағы бағыт",
      "Сынып ғылыми саябаққа барады. Бағыттардың бақылау нәтижелері берілген. Математикалық дәлелдер арқылы сыныпқа тиесілі бағытты анықта.",
      [
        "Бұлақ бағыты",
        "Бақ бағыты",
        "Көпір бағыты",
        "Мұнара бағыты",
        "Алаң бағыты",
      ],
    ],
    [
      "Үйірменің жоғалған жоспары",
      "Математика үйірмесінің жоспарларынан тек біреуі тексеру нәтижелеріне сай келеді. Есептерден дәлел жинап, дұрыс жоспарды негізде.",
      [
        "Самал жоспары",
        "Шұғыла жоспары",
        "Тұлпар жоспары",
        "Бірлік жоспары",
        "Серпін жоспары",
      ],
    ],
  ];
  function detective(questions, variant = 0, target = 0) {
    if (!questions.length) throw Error("Есеп қоры бос.");
    const count = Math.min(5, questions.length + 1),
      story = stories[Math.abs(variant) % stories.length];
    target = ((target % count) + count) % count;
    const answers = questions.map((q) => String(q.answer)),
      candidates = Array.from({ length: count }, (_, id) => ({
        id,
        title: story[2][id],
        values: [...answers],
      }));
    let k = 0;
    for (const c of candidates)
      if (c.id !== target) {
        const i = k++;
        const q = questions[i],
          alternative = (q.options || []).find(
            (a) => String(a) !== String(q.answer),
          );
        c.values[i] = String(alternative ?? "Басқа нәтиже " + (i + 1));
      }
    return { title: story[0], story: story[1], candidates, target };
  }
  function compatible(caseData, evidence) {
    return caseData.candidates
      .filter((c) =>
        evidence.every((e) => c.values[e.index] === String(e.answer)),
      )
      .map((c) => c.id);
  }
  function conclude(caseData, evidence, candidate, selected) {
    const allowed = new Set(evidence.map((e) => e.index));
    if (
      !selected.length ||
      new Set(selected).size !== selected.length ||
      selected.some((i) => !allowed.has(i))
    )
      return false;
    const selectedEvidence = evidence.filter((e) => selected.includes(e.index)),
      remaining = compatible(caseData, selectedEvidence);
    return (
      remaining.length === 1 &&
      remaining[0] === candidate &&
      candidate === caseData.target
    );
  }
  function rateCard(state, key, rating, helped = false) {
    if (
      !["independent", "assisted", "repeat"].includes(rating) ||
      state.rated[key]
    )
      return false;
    const effective = helped && rating === "independent" ? "assisted" : rating;
    state.rated[key] = effective;
    return effective;
  }
  const api = {
    digitSum,
    constraints,
    satisfies,
    secret,
    detective,
    compatible,
    conclude,
    rateCard,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathGameMechanics = api;
})(typeof window !== "undefined" ? window : globalThis);
