/* Pure rules: deadlines, bounded streak bonus, a geometrically exact wheel and virtual capital. */
(function (root) {
  "use strict";
  const sectors = [10, 20, 30, 40];
  const norm = (n) => ((n % 360) + 360) % 360;
  const sectorAt = (rotation) => Math.floor(norm(-rotation) / 90);
  function create(id, count, settings = {}, now = 0) {
    if (
      !["quick-answer", "blitz", "wheel", "auction"].includes(id) ||
      !Number.isInteger(count) ||
      count < 1
    )
      throw Error("Ойын баптауы жарамсыз.");
    const seconds =
      id === "quick-answer"
        ? [30, 60, 90].includes(settings.seconds)
          ? settings.seconds
          : 30
        : id === "blitz"
          ? settings.mode === "practice" &&
            [0, 12, 20].includes(settings.seconds)
            ? settings.seconds
            : 12
          : 0;
    return {
      version: 1,
      id,
      count,
      index: 0,
      phase: id === "wheel" ? "ready" : id === "auction" ? "bid" : "task",
      seconds,
      started: now,
      questionStarted: now,
      deadline: seconds ? now + seconds * 1000 : null,
      finished: false,
      reason: "",
      score: 0,
      streak: 0,
      bestStreak: 0,
      history: [],
      teams: settings.teams === true,
      scores: [0, 0],
      capital: [100, 100],
      bid: null,
      recovery: false,
      needsRecovery: false,
      rotation: 0,
      sector: null,
      spinStart: null,
      spinEnd: null,
      spinFrom: 0,
      spinTarget: 0,
    };
  }
  const questionIndex = (s) => (s.recovery ? s.count + s.index : s.index);
  const turn = (s) => s.index % 2;
  function finish(s, reason) {
    s.finished = true;
    s.phase = "finished";
    s.reason = reason;
  }
  function tick(s, now) {
    if (s.finished) return false;
    if (s.id === "wheel" && s.phase === "spinning") {
      const p = Math.max(
        0,
        Math.min(1, (now - s.spinStart) / (s.spinEnd - s.spinStart)),
      );
      s.rotation =
        s.spinFrom + (s.spinTarget - s.spinFrom) * (1 - (1 - p) ** 3);
      if (p === 1) {
        s.rotation = s.spinTarget;
        s.phase = "task";
        s.questionStarted = now;
        return true;
      }
    }
    if (s.deadline !== null && s.phase === "task" && now >= s.deadline) {
      const row = {
        index: s.index,
        correct: false,
        timeout: true,
        value: "",
        ms: Math.max(0, s.deadline - s.questionStarted),
        points: 0,
        team: turn(s),
      };
      s.history.push(row);
      s.streak = 0;
      if (s.id === "quick-answer") finish(s, "Уақыт аяқталды");
      else s.phase = "feedback";
      return true;
    }
    return false;
  }
  function answer(s, correct, value, now) {
    tick(s, now);
    if (s.finished || !["task", "answer", "recovery"].includes(s.phase))
      return null;
    const index = questionIndex(s);
    if (s.history.some((r) => r.index === index)) return null;
    const row = {
      index,
      correct: !!correct,
      timeout: false,
      value: String(value),
      ms: Math.max(0, now - s.questionStarted),
      points: 0,
      team: turn(s),
    };
    if (s.id === "quick-answer") {
      s.streak = correct ? s.streak + 1 : 0;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      row.points = correct ? 10 + Math.min(10, (s.streak - 1) * 2) : 0;
      s.score += row.points;
    } else if (s.id === "blitz") {
      row.points = correct ? 10 : 0;
      s.score += row.points;
      s.deadline = null;
    } else if (s.id === "wheel") {
      row.sector = s.sector;
      row.points = correct ? sectors[s.sector] : 0;
      s.scores[s.teams ? turn(s) : 0] += row.points;
      s.score = s.scores[0] + s.scores[1];
    } else {
      row.before = s.capital[turn(s)];
      row.bid = s.recovery ? 0 : s.bid;
      row.recovery = s.recovery;
      if (s.recovery) row.points = correct ? 20 : 0;
      else row.points = correct ? s.bid : -s.bid;
      s.capital[turn(s)] += row.points;
      row.after = s.capital[turn(s)];
      s.needsRecovery = !s.recovery && row.after === 0;
      s.bid = null;
    }
    s.history.push(row);
    if (s.id === "quick-answer") {
      s.index++;
      s.questionStarted = now;
      if (s.index === s.count)
        finish(s, "Қайталанбайтын тапсырмалар қоры аяқталды");
    } else s.phase = "feedback";
    return row;
  }
  function next(s, now) {
    if (s.finished || s.phase !== "feedback") return false;
    if (s.id === "auction" && s.needsRecovery) {
      s.needsRecovery = false;
      s.recovery = true;
      s.phase = "recovery";
      s.questionStarted = now;
      return true;
    }
    s.index++;
    if (s.index === s.count) {
      finish(s, "Ойын аяқталды");
      return true;
    }
    s.questionStarted = now;
    if (s.id === "blitz") {
      s.phase = "task";
      s.deadline = s.seconds ? now + s.seconds * 1000 : null;
    }
    if (s.id === "wheel") {
      s.phase = "ready";
      s.sector = null;
    }
    if (s.id === "auction") {
      s.bid = null;
      s.recovery = s.capital[turn(s)] === 0;
      s.phase = s.recovery ? "recovery" : "bid";
    }
    return true;
  }
  function spin(s, random, now) {
    if (
      s.finished ||
      s.id !== "wheel" ||
      s.phase !== "ready" ||
      random < 0 ||
      random >= 1 ||
      !Number.isFinite(random)
    )
      return false;
    s.sector = Math.floor(random * 4);
    s.spinFrom = s.rotation;
    const target = norm(-45 - s.sector * 90);
    s.spinTarget = s.rotation + 1440 + norm(target - norm(s.rotation));
    s.spinStart = now;
    s.spinEnd = now + 1600;
    s.phase = "spinning";
    return true;
  }
  function bid(s, value) {
    if (
      s.finished ||
      s.id !== "auction" ||
      s.phase !== "bid" ||
      !/^\d+$/.test(String(value).trim())
    )
      return false;
    const n = Number(value),
      max = Math.min(50, s.capital[turn(s)]);
    if (!Number.isSafeInteger(n) || n < 1 || n > max) return false;
    s.bid = n;
    s.phase = "answer";
    return true;
  }
  function stats(s) {
    const submitted = s.history.filter((r) => !r.timeout),
      correct = submitted.filter((r) => r.correct).length;
    return {
      correct,
      wrong: submitted.length - correct,
      timeouts: s.history.length - submitted.length,
      accuracy: submitted.length
        ? Math.round((correct / submitted.length) * 100)
        : 0,
      averageMs: submitted.length
        ? submitted.reduce((n, r) => n + r.ms, 0) / submitted.length
        : 0,
    };
  }
  const api = {
    sectors,
    norm,
    sectorAt,
    create,
    questionIndex,
    turn,
    tick,
    answer,
    next,
    spin,
    bid,
    stats,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathTimedModels = api;
})(typeof window !== "undefined" ? window : globalThis);
