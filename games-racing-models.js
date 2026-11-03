/* Pure paired-turn rules and a fixed-clock opponent. No DOM or wall-clock timers. */
(function (root) {
  "use strict";
  const profiles = {
    practice: { label: "Қарсылассыз жаттығу", seconds: 0 },
    slow: { label: "Баяу", seconds: 30 },
    medium: { label: "Орташа", seconds: 20 },
    fast: { label: "Жылдам", seconds: 12 },
  };
  function canonical(value) {
    const s = String(value)
      .trim()
      .toLowerCase()
      .replace(/[−–]/g, "-")
      .replace(/\s+/g, "");
    if (s === "∅" || s === "{}") return "set:";
    if (/^\{.*\}$/.test(s))
      return (
        "set:" +
        [...new Set(s.slice(1, -1).split(",").filter(Boolean))].sort().join(",")
      );
    const t = s.replace(",", "."),
      f = t.match(/^(-?\d+)\/(-?\d+)$/),
      r = t.match(/^(-?\d+):(-?\d+)$/),
      pair = f || r;
    const n = /^-?\d+(?:\.\d+)?$/.test(t)
      ? Number(t)
      : pair && Number(pair[2]) !== 0
        ? Number(pair[1]) / Number(pair[2])
        : null;
    return n === null ? s : "number:" + Number(n.toPrecision(12));
  }
  const same = (a, b) => canonical(a) === canonical(b);
  function choices(q) {
    if (q._racing?.kind === "verify") return ["Дұрыс", "Қате"];
    const pool = [q.answer, ...(q.options || [])],
      f = q.facts;
    if (f?.type.startsWith("fraction"))
      for (let n = 1; n < f.den; n++) pool.push(`${n}/${f.den}`);
    else if (f?.type === "intersection")
      for (const n of [...f.A, ...f.B]) pool.push(`{${n}}`);
    else if (f?.type === "union") {
      const values = [...new Set([...f.A, ...f.B])];
      for (let n = 0; n <= 9; n++)
        if (!values.includes(n))
          pool.push(
            "{" +
              [...values.slice(0, -1), n].sort((a, b) => a - b).join(",") +
              "}",
          );
    } else if (f?.type === "ratio" || f?.type === "inverse") {
      const bits = String(q.answer).split(":").map(Number),
        a = bits[0],
        b = bits[1];
      pool.push(
        `${b}:${a}`,
        `${a + 1}:${b}`,
        `${a}:${b + 1}`,
        `${a + 2}:${b + 1}`,
      );
    } else if (f?.type === "decimal-add") {
      const n = f.a + f.b;
      for (const d of [1, -1, 10, -10])
        pool.push(((n + d) / 100).toFixed(2).replace(".", ","));
    } else {
      const n = Number(String(q.answer).replace(",", "."));
      if (Number.isInteger(n) && n >= 1) {
        const lo = n < 10 ? 1 : 10 ** (String(n).length - 1),
          span = n < 10 ? 9 : lo * 9;
        for (const d of [1, 2, -1, 3, 10])
          pool.push(String(lo + ((((n - lo + d) % span) + span) % span)));
      }
    }
    pool.push("0", "1", "2", "3", "4", "5", "6", "7", "8", "9");
    const result = [];
    for (const item of pool)
      if (!result.some((x) => same(x, item))) result.push(String(item));
    return result.slice(0, 4);
  }
  function shuffle(items, rng = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function createTeam(id, first = 0, size = 2) {
    if (!["tug-of-war", "math-race"].includes(id))
      throw Error("Командалық ойын түрі жарамсыз.");
    return {
      id,
      first: first === 1 ? 1 : 0,
      turn: first === 1 ? 1 : 0,
      size: Math.max(1, Math.min(4, size)),
      round: 0,
      leg: 0,
      extra: 0,
      nextExtra: 0,
      tieBreak: false,
      phase: "handover",
      scores: [0, 0],
      positions: [0, 0],
      turns: [0, 0],
      rope: 0,
      goal: 3,
      history: [],
      finished: false,
      winner: null,
      reason: "",
    };
  }
  function end(s, winner, reason) {
    s.finished = true;
    s.winner = winner;
    s.reason = reason;
    s.phase = "finished";
  }
  function settle(s, token, correct) {
    if (
      s.finished ||
      s.phase !== "task" ||
      token !== `${s.round}:${s.turn}` ||
      s.history.some((r) => r.token === token)
    )
      return false;
    const team = s.turn,
      member = s.turns[team] % s.size;
    s.history.push({
      token,
      team,
      member,
      round: s.round,
      extra: s.extra,
      correct: !!correct,
    });
    s.turns[team]++;
    if (correct) {
      s.scores[team]++;
      s.positions[team]++;
      if (s.id === "tug-of-war") s.rope += team === 0 ? -1 : 1;
    }
    if (s.leg === 0) {
      s.leg = 1;
      s.turn = 1 - team;
      s.phase = "handover";
      return true;
    }
    s.phase = "review";
    // A boundary is confirmed only after both teams have had the same number of turns.
    const tied =
      s.id === "tug-of-war" ? s.rope === 0 : s.positions[0] === s.positions[1];
    const reached =
      s.id === "tug-of-war"
        ? Math.abs(s.rope) >= s.goal
        : Math.max(...s.positions) >= s.goal;
    if (reached && !tied) {
      end(
        s,
        s.id === "tug-of-war"
          ? s.rope < 0
            ? 0
            : 1
          : s.positions[0] > s.positions[1]
            ? 0
            : 1,
        "Жеңіс шегі тең жүрістерден кейін бекітілді.",
      );
      return true;
    }
    if (s.extra === 3) {
      end(
        s,
        null,
        tied
          ? "Үш қосымша жұп раундтан кейін де тең нәтиже."
          : "Қосымша раундтар бітті; жеңіс шегіне еш команда жетпеді.",
      );
      return true;
    }
    if (s.extra || s.round === 3 || (reached && tied)) {
      s.nextExtra = s.extra + 1;
      if (tied && s.id === "tug-of-war") s.tieBreak = true;
    }
    return true;
  }
  function next(s) {
    if (s.finished || s.phase !== "review") return false;
    s.round++;
    if (s.nextExtra) {
      s.extra = s.nextExtra;
      s.nextExtra = 0;
      if (s.id === "tug-of-war" && s.tieBreak) s.goal = 1;
      else if (
        s.id === "math-race" &&
        s.positions[0] === s.positions[1] &&
        s.positions[0] >= s.goal
      )
        s.goal = s.positions[0] + 1;
    }
    s.turn = s.first;
    s.leg = 0;
    s.phase = "handover";
    return true;
  }
  function enter(s) {
    if (s.finished || s.phase !== "handover") return false;
    s.phase = "task";
    return true;
  }
  function createCar(profile = "medium", goal = 4) {
    if (!profiles[profile] || !Number.isInteger(goal) || goal < 1)
      throw Error("Жарыс баптауы жарамсыз.");
    return {
      profile,
      goal,
      player: 0,
      computer: 0,
      solved: [],
      finished: false,
      winner: null,
      elapsed: 0,
      stepMs: profiles[profile].seconds * 1000,
      finishAt: profiles[profile].seconds * 1000 * goal,
    };
  }
  function carTick(s, elapsed) {
    if (s.finished) return;
    s.elapsed = Math.max(s.elapsed, elapsed);
    if (s.profile === "practice") return;
    s.computer = Math.min(s.goal, s.elapsed / s.stepMs);
    if (s.elapsed >= s.finishAt) {
      s.finished = true;
      s.winner = "computer";
    }
  }
  function carAnswer(s, key, correct, elapsed) {
    carTick(s, elapsed);
    if (s.finished || s.solved.includes(key)) return false;
    if (correct) {
      s.solved.push(key);
      s.player++;
      if (s.player === s.goal) {
        s.finished = true;
        s.winner = "player";
      }
    }
    return true;
  }
  const api = {
    profiles,
    canonical,
    same,
    choices,
    shuffle,
    createTeam,
    settle,
    next,
    enter,
    createCar,
    carTick,
    carAnswer,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathRacingModels = api;
})(typeof window !== "undefined" ? window : globalThis);
