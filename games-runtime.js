/* Shared, pauseable game time and learning outcomes. No dependency on the DOM. */
(function (root) {
  "use strict";
  class GameClock {
    constructor(now = () => performance.now()) {
      this.now = now;
      this.elapsed = 0;
      this.last = null;
      this.paused = true;
      this.tasks = new Map();
      this.next = 0;
    }
    time() {
      return (
        this.elapsed + (this.paused ? 0 : Math.max(0, this.now() - this.last))
      );
    }
    pause() {
      if (!this.paused) {
        this.elapsed = this.time();
        this.paused = true;
        this.last = null;
      }
    }
    resume() {
      if (this.paused) {
        this.last = this.now();
        this.paused = false;
      }
    }
    after(ms, fn) {
      const id = "game-task-" + ++this.next;
      this.tasks.set(id, { at: this.time() + ms, fn });
      return id;
    }
    cancel(id) {
      this.tasks.delete(id);
    }
    tick() {
      if (this.paused) return;
      const time = this.time();
      for (const [id, t] of [...this.tasks]) {
        if (t.at <= time && this.tasks.has(id)) {
          this.tasks.delete(id);
          t.fn();
          if (this.paused) break;
        }
      }
    }
    clear() {
      this.pause();
      this.tasks.clear();
    }
  }
  class LearningSession {
    constructor(id, lesson, questions, settings) {
      this.id = id;
      this.lesson = lesson;
      this.questions = questions;
      this.settings = settings;
      this.records = {};
      this.help = {};
      this.index = 0;
      this.finished = false;
    }
    assist(key) {
      this.help[key] = true;
    }
    record(key, correct, value, timeout = false) {
      const previous = this.records[key];
      // Matching and clue investigations allow correction while retaining the first attempt.
      if (
        previous &&
        !["match", "detective", "secret-number"].includes(this.id)
      )
        return previous;
      const row = {
        key,
        correct: !!correct,
        firstCorrect: previous ? previous.firstCorrect : !!correct,
        assisted: !!this.help[key] || !!previous?.assisted,
        value: String(value ?? ""),
        timeout: !!timeout,
        attempts: (previous?.attempts || 0) + 1,
      };
      this.records[key] = row;
      return row;
    }
    summary() {
      if (this.id === "cards") {
        const rows = Object.values(this.selfAssessments || {});
        return {
          total: this.questions.length,
          assessed: rows.length,
          independent: rows.filter((x) => x === "independent").length,
          assisted: rows.filter((x) => x === "assisted").length,
          repeat: rows.filter((x) => x === "repeat").length,
          graded: false,
        };
      }
      const rows = Object.values(this.records),
        total = this.questions.length;
      return {
        total,
        correct: rows.filter((r) => r.correct).length,
        wrong: rows.filter((r) => !r.correct && !r.timeout).length,
        timeout: rows.filter((r) => r.timeout).length,
        unanswered: Math.max(0, total - rows.length),
        independent: rows.filter((r) => r.firstCorrect && !r.assisted).length,
        assisted: rows.filter((r) => r.assisted).length,
        accuracy: total
          ? Math.round(
              (rows.filter((r) => r.firstCorrect && !r.assisted).length /
                total) *
                100,
            )
          : 0,
      };
    }
  }
  const api = { GameClock, LearningSession };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathGameRuntime = api;
})(typeof window !== "undefined" ? window : globalThis);
