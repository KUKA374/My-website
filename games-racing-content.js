/* Paired topic exercises; never writes to the existing 5–7 grade question bank. */
(function (root) {
  "use strict";
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const frac = (a, b) => {
    const d = gcd(a, b);
    return b / d === 1 ? String(a / d) : `${a / d}/${b / d}`;
  };
  const dec = (n) => (n / 100).toFixed(2).replace(".", ",");
  function task(lesson, round, team) {
    let question, answer, solution, facts, difficulty;
    if (lesson === "5-math-1-1") {
      const op = round % 4;
      if (op === 0) {
        const a = 26 + (round % 3) * 10 + team * 10,
          b = 17 + (round % 2) * 10 + (round >= 4 ? 10 : 0);
        answer = String(a + b);
        question = `${a} + ${b} = ?`;
        solution = `${a} + ${b} = ${a + b}. Бірліктерден ондыққа бір ауысу бар.`;
        facts = { type: "add", a, b };
        difficulty = "two-digit-add-one-carry";
      }
      if (op === 1) {
        const a = 72 + (round % 2) * 10 + team * 10,
          b = 28 + (round % 3) * 10;
        answer = String(a - b);
        question = `${a} − ${b} = ?`;
        solution = `${a} − ${b} = ${a - b}. Бір ондықты бірліктерге жікте.`;
        facts = { type: "subtract", a, b };
        difficulty = "two-digit-subtract-one-borrow";
      }
      if (op === 2) {
        const a = 12 + (round % 2) + team * 10,
          b = round >= 4 ? 2 : 3;
        answer = String(a * b);
        question = `${a} × ${b} = ?`;
        solution = `${a} × ${b} = ${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b} = ${a * b}.`;
        facts = { type: "multiply", a, b };
        difficulty = "two-by-one-digit-no-carry";
      }
      if (op === 3) {
        const b = 3,
          a = b * (12 + (round % 3) + team);
        answer = String(a / b);
        question = `${a} : ${b} = ?`;
        solution = `${a} : ${b} = ${a / b}; тексеру: ${a / b} × ${b} = ${a}.`;
        facts = { type: "divide", a, b };
        difficulty = "two-digit-exact-division";
      }
    } else if (lesson === "6-math-1-1") {
      const op = round % 4;
      let a,
        b,
        den = round < 4 ? 7 : [11, 13, 17][round - 4];
      if (op === 0) {
        a = 1 + team * 2;
        b = 1 + (round % 2);
        answer = frac(a + b, den);
        question = `${a}/${den} + ${b}/${den} = ?`;
        solution = `(${a} + ${b})/${den} = ${answer}. Бөлім өзгермейді.`;
        facts = { type: "fraction-add", a, b, den };
      }
      if (op === 1) {
        a = 5 + team;
        b = 1 + (round % 2);
        answer = frac(a - b, den);
        question = `${a}/${den} − ${b}/${den} = ?`;
        solution = `(${a} − ${b})/${den} = ${answer}. Бөлім өзгермейді.`;
        facts = { type: "fraction-subtract", a, b, den };
      }
      if (op === 2) {
        a = 1 + team;
        const x = round >= 4 ? 5 : 3,
          y = round >= 4 ? 7 : 5;
        den = x * y;
        answer = frac(a, den);
        question = `${a}/${x} × 1/${y} = ?`;
        solution = `${a}/${x} × 1/${y} = ${a}/${den} = ${answer}.`;
        facts = { type: "fraction-multiply", a, den, x, y };
      }
      if (op === 3) {
        a = 1 + team;
        answer = frac(a * 3, 7);
        question = `${a}/7 : 1/3 = ?`;
        solution = `${a}/7 × 3/1 = ${answer}. Бөлгішті кері айналдырамыз.`;
        facts = { type: "fraction-divide", a, b: 3, den: 7 };
      }
      difficulty = "proper-fraction-" + op;
    } else if (lesson === "6-math-1-2") {
      const a = 125 + team * 100,
        b = 234 + round * 10;
      answer = dec(a + b);
      question = `${dec(a)} + ${dec(b)} = ?`;
      solution = `(${a} + ${b})/100 = ${a + b}/100 = ${answer}. Үтірлерді теңестір.`;
      facts = { type: "decimal-add", a, b };
      difficulty = "two-decimal-places-add";
    } else if (lesson === "6-math-1-3") {
      const n = (round + team * 3) % 6,
        step = round >= 6 ? 2 : 1,
        A = [n, n + step, n + 2 * step],
        B = [n + 2 * step, n + 3 * step],
        union = round % 2 === 1,
        values = union ? [...A, n + 3 * step] : [n + 2 * step];
      answer = "{" + values.join(",") + "}";
      question = `A={${A.join(",")}}, B={${B.join(",")}}. A${union ? "∪" : "∩"}B = ?`;
      solution = union
        ? `Барлық элементті қайталамай жазамыз: ${answer}.`
        : `Ортақ элемент — ${n + 2 * step}. Жауап: ${answer}.`;
      facts = { type: union ? "union" : "intersection", A, B };
      difficulty = union ? "union-3-and-2" : "intersection-3-and-2";
    } else if (lesson === "6-math-1-4") {
      const n = 40 + 8 * round + team * 4;
      answer = String(n / 4);
      question = `${n} санының 25%-ын тап.`;
      solution = `25% = 1/4. ${n} : 4 = ${answer}.`;
      facts = { type: "percent", n, p: 25 };
      difficulty = "quarter-of-two-digit-multiple-of-four";
    } else if (lesson === "6-math-1-5") {
      const pairs = [
          [
            [4, 7],
            [5, 8],
          ],
          [
            [5, 7],
            [7, 9],
          ],
          [
            [4, 9],
            [5, 9],
          ],
          [
            [5, 6],
            [7, 8],
          ],
        ],
        [a, b] = pairs[round % 4][team],
        k = round >= 4 ? 4 : 3;
      answer = `${a} : ${b}`;
      question = `${a * k} : ${b * k} қатынасын қысқарт.`;
      solution = `Екі мүшені ${k}-ке бөлеміз: ${a * k} : ${b * k} = ${answer}.`;
      facts = { type: "ratio", a: a * k, b: b * k, k };
      difficulty = "two-digit-ratio-gcd-" + k;
    } else if (lesson === "6-math-1-6") {
      const pairs = [
          [
            [2, 5],
            [3, 7],
          ],
          [
            [4, 9],
            [5, 8],
          ],
          [
            [3, 8],
            [4, 7],
          ],
          [
            [2, 7],
            [3, 5],
          ],
          [
            [2, 9],
            [5, 7],
          ],
          [
            [4, 5],
            [7, 8],
          ],
          [
            [5, 6],
            [7, 9],
          ],
        ],
        [a, b] = pairs[round][team];
      answer = `${b} : ${a}`;
      question = `${a} : ${b} қатынасына кері қатынас құр.`;
      solution = `Мүшелердің орнын ауыстырамыз: ${answer}.`;
      facts = { type: "inverse", a, b };
      difficulty = "one-digit-inverse-ratio";
    } else if (["6-math-1-7", "7-algebra-1-1"].includes(lesson)) {
      const a = 1 + team,
        b = 4 + round,
        d = b * (2 + (round % 3));
      answer = String((a * d) / b);
      question = `${a} : ${b} = x : ${d}. x = ?`;
      solution = `${b}x = ${a} × ${d} ⇒ x = ${a * d} : ${b} = ${answer}.`;
      facts = { type: "proportion", a, b, d };
      difficulty = "integer-proportion-one-digit-root";
    } else if (["7-algebra-1-2", "7-algebra-1-3"].includes(lesson)) {
      const a = 2 + (round % 3),
        x = 6 + (Math.floor(round / 3) % 2) + team,
        b = (lesson.endsWith("-3") && round % 2 ? -1 : 1) * (5 + 2 * round),
        c = a * x + b;
      answer = String(x);
      question = `${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${c}. x = ?`;
      solution = `${a}x = ${c} − (${b}) = ${a * x} ⇒ x = ${a * x} : ${a} = ${x}.`;
      facts = { type: "equation", a, b, c };
      difficulty = "linear-two-operations-" + (b < 0 ? "minus" : "plus");
    } else if (lesson === "7-algebra-1-4") {
      const a = 2 + round * 2 + team;
      answer = String(a * a);
      question = `${a}² = ?`;
      solution = `${a}² = ${a} × ${a} = ${answer}.`;
      facts = { type: "square", a };
      difficulty = "square-" + String(a).length + "-" + String(a * a).length;
    } else return null;
    return {
      question,
      answer,
      mathAnswer: answer,
      facts,
      difficulty,
      _logicExplain: {
        hint: "Берілген шамалар мен амалдың ережесін тексер.",
        solution,
      },
    };
  }
  function pair(lesson, round, id) {
    const kind =
      id === "math-race" ? ["choice", "input", "verify"][round % 3] : "choice";
    return [0, 1].map((team) => {
      const q = task(lesson, round, team);
      if (!q) return null;
      if (kind === "verify") {
        const truth = (round + team) % 2 === 0;
        let wrong;
        if (/^-?\d+(?:[.,]\d+)?$/.test(q.answer))
          wrong = String(Number(q.answer.replace(",", ".")) + 1);
        else if (q.answer.includes("/")) {
          const [a, b] = q.answer.split("/").map(Number);
          wrong = `${a + 1}/${b}`;
        } else if (q.answer.includes(":")) {
          const [a, b] = q.answer.split(":").map(Number);
          wrong = `${a + 1}:${b}`;
        } else {
          const values = q.answer.slice(1, -1).split(",").map(Number),
            other = Array.from({ length: 10 }, (_, i) => i).find(
              (n) => !values.includes(n),
            );
          wrong =
            "{" +
            [...values.slice(0, -1), other].sort((a, b) => a - b).join(",") +
            "}";
        }
        const claim = truth ? q.answer : wrong;
        q.question += ` Оқушы «${claim}» деп жауап берді. Жауабы дұрыс па?`;
        q.answer = truth ? "Дұрыс" : "Қате";
        q.options = ["Дұрыс", "Қате"];
        q.claim = claim;
        q._logicExplain.solution += truth
          ? " Ұсынылған жауап дұрыс."
          : " Ұсынылған жауап дұрыс емес.";
      }
      q._racing = { round, team, kind };
      q._sessionKey = `racing:${id}:${lesson}:${round}:${team}`;
      return q;
    });
  }
  const api = { task, pair, frac, gcd };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathRacingContent = api;
})(typeof window !== "undefined" ? window : globalThis);
