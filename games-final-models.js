/* Pure seven-game state machines. Animation uses only the shared active clock. */
(function (root) {
  "use strict";
  const ids = [
    "quest",
    "puzzle",
    "rocket",
    "castle",
    "target",
    "bridge",
    "math-king",
  ];
  function create(id, plan, now = 0) {
    if (!ids.includes(id) || !Array.isArray(plan) || !plan.length)
      throw Error("Ойын жоспары жарамсыз.");
    return {
      version: 1,
      id,
      plan: plan.map((x) => ({ ...x })),
      count: plan.length,
      index: 0,
      phase: ["quest", "math-king"].includes(id) ? "map" : "task",
      completed: [],
      history: [],
      audit: [],
      score: 0,
      finished: false,
      won: false,
      reason: "",
      questionStarted: now,
      station: 0,
      selectedLeft: null,
      detected: {},
      health: 100,
      armor: 0,
      wallet: 0,
      maintenanceUsed: false,
      purchases: [],
      level: 0,
      passed: [false, false, false, false],
      roundId: 0,
      roundIds: [0, 1, 2, 3, 4],
      roundIndex: 0,
      kingMode: "test",
      gates: [],
      lastGate: null,
      animation: null,
    };
  }
  const current = (s) =>
    s.id === "math-king" ? s.roundIds[s.roundIndex] : s.index;
  function finish(s, won, reason) {
    s.finished = true;
    s.won = !!won;
    s.reason = reason;
    s.phase = "finished";
  }
  function animate(s, kind, now) {
    s.animation = { kind, start: now, end: now + 1200, progress: 0 };
    s.phase = kind;
  }
  function tick(s, now) {
    if (s.finished || !s.animation) return false;
    s.animation.progress = Math.max(
      0,
      Math.min(1, (now - s.animation.start) / 1200),
    );
    if (s.animation.progress === 1) {
      finish(
        s,
        true,
        {
          crossing: "Көпір толық салынып, кейіпкер арғы бетке өтті.",
          docking: "Барлық кезең орындалды. Зымыран ғарыш станциясына қонды.",
          coronation:
            "Барлық міндетті деңгей мен финал орындалды. Тәж берілді.",
        }[s.animation.kind],
      );
      return true;
    }
    return false;
  }
  function row(s, key, correct, value, now, action = "answer") {
    const first = !s.completed.includes(key),
      points =
        correct && first && !(s.id === "math-king" && s.kingMode === "practice")
          ? 10
          : 0;
    const r = {
      key,
      correct: !!correct,
      value: String(value),
      ms: Math.max(0, now - s.questionStarted),
      points,
      action,
      level: s.level,
      round: s.roundId,
      mode: s.kingMode,
    };
    s.history.push(r);
    if (correct && first) s.completed.push(key);
    s.score += points;
    return r;
  }
  function visit(s, station, now) {
    if (s.finished || s.phase !== "map") return false;
    if (s.id === "quest") {
      if (station !== s.station || station < 0 || station > 3) return false;
      s.index = s.plan.findIndex(
        (q, i) => q.station === station && !s.completed.includes(i),
      );
      if (s.index < 0) return false;
    } else if (s.id === "math-king") {
      if (
        station !== s.level ||
        !s.passed.slice(0, station).every(Boolean) ||
        s.passed[station]
      )
        return false;
      s.roundIds = s.plan
        .map((q, i) => (q.level === station ? i : -1))
        .filter((i) => i >= 0)
        .slice(0, 5);
      s.roundIndex = 0;
      s.roundId++;
    } else return false;
    s.phase = "task";
    s.questionStarted = now;
    return true;
  }
  function selectPiece(s, index, now) {
    if (
      s.id !== "puzzle" ||
      s.finished ||
      s.phase !== "task" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= s.count ||
      s.completed.includes(index)
    )
      return false;
    s.index = index;
    s.questionStarted = now;
    return true;
  }
  function detect(s, step, now) {
    const key = current(s);
    if (
      s.id !== "quest" ||
      s.finished ||
      s.phase !== "task" ||
      s.plan[key].kind !== "error" ||
      s.detected[key]
    )
      return false;
    s.audit.push({ key, step, correct: step === 1 });
    if (step === 1) s.detected[key] = true;
    else {
      row(s, key, false, `${step + 1}-қадам таңдалды`, now, "detect");
      s.phase = "feedback";
    }
    return true;
  }
  function match(s, left, right, now) {
    if (
      s.id !== "quest" ||
      s.finished ||
      s.phase !== "task" ||
      s.plan[s.index].kind !== "match"
    )
      return false;
    const station = s.plan[s.index].station;
    if (
      ![left, right].every(
        (i) =>
          s.plan[i]?.kind === "match" &&
          s.plan[i].station === station &&
          !s.completed.includes(i),
      )
    )
      return false;
    const ok = left === right;
    s.index = left;
    row(s, left, ok, String(right), now, "match");
    if (!ok) s.phase = "feedback";
    else {
      const rest = s.plan.findIndex(
        (q, i) =>
          q.kind === "match" &&
          q.station === station &&
          !s.completed.includes(i),
      );
      if (rest < 0) s.phase = "feedback";
      else {
        s.index = rest;
        s.questionStarted = now;
      }
    }
    s.selectedLeft = null;
    return true;
  }
  function answer(s, correct, value, now) {
    if (s.finished || s.phase !== "task") return null;
    const key = current(s);
    if (
      s.completed.includes(key) ||
      (s.id === "quest" &&
        (s.plan[key].kind === "match" ||
          (s.plan[key].kind === "error" && !s.detected[key])))
    )
      return null;
    const r = row(s, key, correct, value, now);
    s.phase = "feedback";
    if (s.id === "castle") {
      if (correct) s.wallet += 10;
      else s.health = Math.max(0, s.health - (35 - s.armor * 10));
      if (s.health === 0)
        finish(
          s,
          false,
          "Қамал қорғанысы нөлге жетті. Қате есептерді жаттығуда қайта орындаңыз.",
        );
    }
    if (
      correct &&
      s.completed.length === s.count &&
      ["rocket", "bridge"].includes(s.id)
    )
      animate(s, s.id === "rocket" ? "docking" : "crossing", now);
    return r;
  }
  function next(s, now) {
    if (s.finished || s.phase !== "feedback") return false;
    if (s.id === "math-king") return kingNext(s, now);
    if (s.id === "target" || s.id === "castle") {
      s.index++;
      if (s.index === s.count) {
        finish(
          s,
          s.id === "castle" || s.completed.length === s.count,
          s.id === "castle"
            ? "Барлық шабуыл кезеңі аяқталды. Қамал сақталды."
            : "Нысана жаттығуы аяқталды.",
        );
        return true;
      }
      if (s.id === "castle" && s.index % 2 === 0) {
        s.phase = "maintenance";
        s.maintenanceUsed = false;
        return true;
      }
    } else if (s.completed.includes(s.index)) {
      if (s.id === "quest") {
        const pending = s.plan.findIndex(
          (q, i) => q.station === s.station && !s.completed.includes(i),
        );
        if (pending >= 0) s.index = pending;
        else {
          s.station++;
          if (s.station === 4) {
            finish(
              s,
              true,
              "Барлық бекет пен бірнеше дағдыны біріктіретін соңғы қақпа ашылды.",
            );
            return true;
          }
          s.phase = "map";
          return true;
        }
      } else {
        s.index = s.plan.findIndex((_, i) => !s.completed.includes(i));
        if (s.index < 0) {
          finish(s, true, "Суреттің барлық бөлігі ашылды.");
          return true;
        }
      }
    }
    s.phase = "task";
    s.questionStarted = now;
    return true;
  }
  function maintain(s, kind) {
    if (
      s.id !== "castle" ||
      s.finished ||
      s.phase !== "maintenance" ||
      s.maintenanceUsed
    )
      return false;
    const cost = kind === "repair" ? 10 : kind === "armor" ? 20 : Infinity;
    if (
      s.wallet < cost ||
      (kind === "repair" && s.health === 100) ||
      (kind === "armor" && s.armor === 2)
    )
      return false;
    const before = { health: s.health, armor: s.armor, wallet: s.wallet };
    s.wallet -= cost;
    if (kind === "repair") s.health = Math.min(100, s.health + 25);
    else s.armor++;
    s.maintenanceUsed = true;
    s.purchases.push({
      wave: s.index / 2,
      kind,
      cost,
      before,
      after: { health: s.health, armor: s.armor, wallet: s.wallet },
    });
    return true;
  }
  function nextWave(s, now) {
    if (s.id !== "castle" || s.phase !== "maintenance" || s.finished)
      return false;
    s.phase = "task";
    s.questionStarted = now;
    return true;
  }
  function kingNext(s, now) {
    const key = current(s);
    if (s.kingMode === "practice" && !s.completed.includes(key)) {
      s.phase = "task";
      s.questionStarted = now;
      return true;
    }
    s.roundIndex++;
    if (s.roundIndex < s.roundIds.length) {
      s.phase = "task";
      s.questionStarted = now;
      return true;
    }
    if (s.kingMode === "practice") {
      s.phase = "retest";
      return true;
    }
    const rows = s.history.filter(
        (r) =>
          r.round === s.roundId && r.mode === "test" && r.level === s.level,
      ),
      correct = rows.filter((r) => r.correct).length,
      passed = correct >= Math.ceil(s.roundIds.length * 0.8);
    s.lastGate = {
      level: s.level,
      round: s.roundId,
      total: s.roundIds.length,
      correct,
      passed,
      errors: rows.filter((r) => !r.correct).map((r) => r.key),
    };
    s.gates.push({ ...s.lastGate });
    if (passed) s.passed[s.level] = true;
    if (s.level === 3 && s.passed.every(Boolean) && passed)
      animate(s, "coronation", now);
    else s.phase = "gate";
    return true;
  }
  function advanceLevel(s) {
    if (
      s.id !== "math-king" ||
      s.finished ||
      s.phase !== "gate" ||
      !s.lastGate?.passed ||
      !s.passed[s.level] ||
      s.level >= 3
    )
      return false;
    s.level++;
    s.phase = "map";
    return true;
  }
  function addRound(s, indices, practice, now) {
    if (s.id !== "math-king" || s.finished) return false;
    if (
      practice ? s.phase !== "gate" || s.lastGate?.passed : s.phase !== "retest"
    )
      return false;
    if (
      !Array.isArray(indices) ||
      !indices.length ||
      (!practice && indices.length !== 5) ||
      !indices.every((i) => Number.isInteger(i) && s.plan[i])
    )
      return false;
    s.kingMode = practice ? "practice" : "test";
    s.roundId++;
    s.roundIds = [...indices];
    s.roundIndex = 0;
    s.phase = "task";
    s.questionStarted = now;
    return true;
  }
  const api = {
    ids,
    create,
    current,
    finish,
    tick,
    visit,
    selectPiece,
    detect,
    match,
    answer,
    next,
    maintain,
    nextWave,
    advanceLevel,
    addRound,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathFinalModels = api;
})(typeof window !== "undefined" ? window : globalThis);
