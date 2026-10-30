let selectedGameId = null;
let currentQuestions = [];
let currentIndex = 0;
let currentScore = 0;
let currentGameMode = "";
let timerId = null;
let quickTimeLeft = 30;
let quickStreak = 0;
let bestStreak = 0;
let tugScores = { left: 0, right: 0 };
let tugTurn = "left";
let tugPosition = 0;

function escapeGameHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderGameCards() {
  const box = document.getElementById("gamesGrid");
  if (!box) return;
  box.innerHTML = mathGames.map(game => `
    <button class="game-card" data-game-id="${escapeGameHtml(game.id)}" type="button">
      <div class="game-icon">${escapeGameHtml(game.title.split(" ")[0])}</div>
      <div class="game-card-content">
        <h3>${escapeGameHtml(game.title.substring(game.title.indexOf(" ") + 1))}</h3>
        <p>${escapeGameHtml(game.description)}</p>
        <div class="game-tags">${game.formats.map(x => `<span>${escapeGameHtml(x)}</span>`).join("")}</div>
      </div>
    </button>
  `).join("");
}

function selectGame(gameId) {
  selectedGameId = gameId;
  const game = mathGames.find(x => x.id === gameId);
  document.getElementById("selectedGameTitle").textContent = game ? game.title : "";
  document.getElementById("selectedGameHeading").textContent = game ? game.title : "Ойынды баптау";
  document.getElementById("selectedGameDescription").textContent = game ? game.description : "";
  document.getElementById("gamesLibrary").style.display = "none";
  document.getElementById("gameStage").style.display = "block";
  document.getElementById("gameSetup").style.display = "block";
  document.getElementById("gameArea").style.display = "none";
  document.getElementById("gameMessage").style.display = "none";
  document.body.classList.add("presentation-mode");
  document.body.dataset.game = gameId;
}

function backToGames() {
  clearInterval(timerId);
  selectedGameId = null;
  currentQuestions = [];
  document.body.classList.remove("presentation-mode");
  delete document.body.dataset.game;
  document.getElementById("gameStage").style.display = "none";
  document.getElementById("gamesLibrary").style.display = "block";
}

function getLessonKey() {
  const lessonId = document.getElementById("lessonSelect").value;
  const grade = document.getElementById("gradeSelect").value;
  const subject = document.getElementById("subjectSelect").value;
  const quarter = document.getElementById("quarterSelect").value;
  return `${grade}-${subject}-${quarter}-${lessonId}`;
}

function startSelectedGame() {
  if (!selectedGameId) return;
  const lessonKey = getLessonKey();
  currentQuestions = getGameQuestions(selectedGameId, lessonKey);
  if (!currentQuestions.length) {
    showGameMessage("Бұл тақырыпқа ойын тапсырмалары әлі енгізілмеген. Ойын механизмі дайын, енді осы тақырыптың есептерін базаға қосуға болады.");
    return;
  }

  clearInterval(timerId);
  currentIndex = 0;
  currentScore = 0;
  currentGameMode = selectedGameId;
  quickTimeLeft = 30;
  quickStreak = 0;
  bestStreak = 0;

  if (currentGameMode === "tug-of-war") {
    tugScores = { left: 0, right: 0 };
    tugTurn = "left";
    tugPosition = 0;
  }

  document.getElementById("gameSetup").style.display = "none";
  document.getElementById("gameArea").style.display = "block";
  document.getElementById("gameResult").textContent = "";
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (currentIndex >= currentQuestions.length) {
    finishGame();
    return;
  }

  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  const box = document.getElementById("gameQuestion");
  const progress = document.getElementById("gameProgress");
  progress.textContent = `${currentIndex + 1} / ${total}`;

  if (currentGameMode === "quick-answer") {
    renderQuickAnswer(q);
    return;
  }

  if (currentGameMode === "tug-of-war") {
    renderTugOfWar(q);
    return;
  }

  if (currentGameMode === "match") {
    box.innerHTML = `
      <div class="match-board">
        <div class="match-heading"><span>🧩 СӘЙКЕСТЕНДІР</span><b>Жұп ${currentIndex + 1}</b></div>
        <div class="match-stage">
          <div class="match-card match-question-card"><small>СҰРАҚ</small><strong>${escapeGameHtml(q.left)}</strong></div>
          <div class="match-arrow">→</div>
          <div class="match-answer-zone">
            <button class="match-option" type="button" data-answer="${escapeGameHtml(q.right)}"><span>✓</span>${escapeGameHtml(q.right)}</button>
            <button class="match-option" type="button" data-answer="Қате жауап"><span>?</span>Басқа жауап</button>
          </div>
        </div>
        <div class="match-hint">Сол жақтағы тапсырмаға сәйкес келетін жауапты таңда.</div>
      </div>`;
    bindAnswerButtons();
    return;
  }

  if (currentGameMode === "find-error") {
    box.innerHTML = `
      <div class="error-board">
        <div class="error-heading"><span>❌ ҚАТЕНІ ТАП</span><b>Талдау ${currentIndex + 1}</b></div>
        <div class="error-scene">
          <div class="error-tape">⚠ МАТЕМАТИКАЛЫҚ ТЕКСЕРУ ⚠</div>
          <div class="error-equation">${escapeGameHtml(q.statement)}</div>
          <div class="error-question">Бұл шешімнің қай жерінде қате бар?</div>
          <textarea id="gameTextAnswer" placeholder="Қатені көрсетіп, дұрыс нұсқаны жазыңыз..."></textarea>
          <button type="button" class="game-primary" id="textAnswerButton">🔎 Қатені тексеру</button>
        </div>
        <div class="error-hint">Дәлеліңде математикалық әрекетті көрсет.</div>
      </div>`;
    bindTextAnswer();
    return;
  }

  if (currentGameMode === "math-code") {
    const codeSlots = Array.from({length: total}, (_, i) => `<span class="code-slot ${i < currentIndex ? "filled" : i === currentIndex ? "active" : ""}">${i < currentIndex ? "✓" : "_"}</span>`).join("");
    box.innerHTML = `
      <div class="code-board">
        <div class="code-heading"><span>🔐 МАТЕМАТИКАЛЫҚ КОД</span><b>Құлып ${currentIndex + 1}/${total}</b></div>
        <div class="code-lock">
          <div class="lock-icon">🔒</div>
          <div class="code-label">ҚҰПИЯ КОД</div>
          <div class="code-slots">${codeSlots}</div>
          <div class="code-question">${escapeGameHtml(q.question)}</div>
          <input id="gameTextAnswer" inputmode="numeric" autocomplete="off" placeholder="Жауабыңызды енгізіңіз">
          <button type="button" class="game-primary code-button" id="textAnswerButton">🔓 Кодқа қосу</button>
        </div>
        <div class="code-hint">Әр дұрыс жауап құпия кодтың бір бөлігін ашады.</div>
      </div>`;
    bindTextAnswer();
    return;
  }

  if (currentGameMode === "detective") {
    box.innerHTML = `
      <div class="detective-board">
        <div class="detective-heading"><span>🕵️ МАТЕМАТИКАЛЫҚ ДЕТЕКТИВ</span><b>Іс №${String(currentIndex + 1).padStart(2, "0")}</b></div>
        <div class="detective-case">
          <div class="detective-stamp">EVIDENCE</div>
          <div class="detective-clue"><span>🔍 ДӘЛЕЛ</span><p>${escapeGameHtml(q.clue)}</p></div>
          <div class="detective-line"></div>
          <label>Тергеу жауабы</label>
          <input id="gameTextAnswer" inputmode="numeric" autocomplete="off" placeholder="Дәлелден шыққан жауап">
          <button type="button" class="game-primary detective-button" id="textAnswerButton">🕵️ Дәлелді тексеру</button>
        </div>
        <div class="detective-hint">Барлық дәлелдерді дұрыс шешсең, математикалық істің шешімі табылады.</div>
      </div>`;
    bindTextAnswer();
  }
}

function renderQuickAnswer(q) {
  document.getElementById("gameProgress").textContent = `${currentIndex + 1} / ${currentQuestions.length}`;
  document.getElementById("gameQuestion").innerHTML = `
    <div class="quick-board">
      <div class="quick-stats">
        <div><span>⏱️ Уақыт</span><strong id="quickTimer">30</strong> сек</div>
        <div><span>⭐ Ұпай</span><strong id="quickScore">${currentScore}</strong></div>
        <div><span>🔥 Серия</span><strong id="quickStreak">${quickStreak}</strong></div>
      </div>
      <div class="quick-timebar"><div id="quickTimebarFill"></div></div>
      <div class="game-task quick-task">
        <div class="quick-label">⚡ ЖЫЛДАМ ЖАУАП</div>
        <p class="game-prompt">${escapeGameHtml(q.question)}</p>
        <input id="quickAnswerInput" inputmode="numeric" autocomplete="off" placeholder="Жауабыңызды енгізіңіз">
        <button type="button" class="game-primary quick-submit" id="quickAnswerButton">Жауап беру →</button>
        <div id="quickFeedback" class="quick-feedback" aria-live="polite"></div>
      </div>
    </div>`;

  const input = document.getElementById("quickAnswerInput");
  document.getElementById("quickAnswerButton").addEventListener("click", submitQuickAnswer);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") submitQuickAnswer();
  });
  input.focus();

  if (currentIndex === 0 && !timerId) startQuickTimer();
  updateQuickStats();
}

function startQuickTimer() {
  quickTimeLeft = 30;
  updateQuickStats();
  timerId = setInterval(() => {
    quickTimeLeft -= 0.1;
    if (quickTimeLeft <= 0) {
      quickTimeLeft = 0;
      updateQuickStats();
      clearInterval(timerId);
      timerId = null;
      finishQuickGame(true);
      return;
    }
    updateQuickStats();
  }, 100);
}

function updateQuickStats() {
  const timer = document.getElementById("quickTimer");
  const score = document.getElementById("quickScore");
  const streak = document.getElementById("quickStreak");
  const fill = document.getElementById("quickTimebarFill");
  if (timer) timer.textContent = Math.ceil(quickTimeLeft);
  if (score) score.textContent = currentScore;
  if (streak) streak.textContent = quickStreak;
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, (quickTimeLeft / 30) * 100))}%`;
}

function submitQuickAnswer() {
  if (currentGameMode !== "quick-answer" || quickTimeLeft <= 0) return;
  const input = document.getElementById("quickAnswerInput");
  if (!input) return;
  const userAnswer = normalizedAnswer(input.value);
  const correct = userAnswer === normalizedAnswer(currentQuestions[currentIndex].answer);
  const feedback = document.getElementById("quickFeedback");
  const button = document.getElementById("quickAnswerButton");
  if (button) button.disabled = true;

  if (correct) {
    quickStreak++;
    bestStreak = Math.max(bestStreak, quickStreak);
    currentScore += 10 + Math.max(0, quickStreak - 1) * 2;
    if (feedback) feedback.textContent = `✓ Дұрыс! +${10 + Math.max(0, quickStreak - 1) * 2} ұпай`;
  } else {
    quickStreak = 0;
    if (feedback) feedback.textContent = `✕ Қате. Дұрыс жауап: ${currentQuestions[currentIndex].answer}`;
  }

  updateQuickStats();
  setTimeout(() => {
    currentIndex++;
    if (currentIndex >= currentQuestions.length) {
      finishQuickGame(false);
    } else {
      renderCurrentQuestion();
    }
  }, 350);
}

function finishQuickGame(timeUp) {
  clearInterval(timerId);
  timerId = null;
  document.getElementById("gameProgress").textContent = "Нәтиже";
  document.getElementById("gameQuestion").innerHTML = `
    <div class="game-finish quick-finish">
      <div class="finish-icon">${timeUp ? "⏱️" : "🏆"}</div>
      <div class="quick-result-label">${timeUp ? "Уақыт аяқталды" : "Барлық сұрақ орындалды"}</div>
      <h2>${currentScore} ұпай</h2>
      <p>Ең ұзақ дұрыс жауап сериясы: <strong>${bestStreak}</strong></p>
      <button type="button" class="game-primary" id="replayGameButton">↻ Қайта ойнау</button>
    </div>`;
  document.getElementById("replayGameButton").addEventListener("click", startSelectedGame);
  document.getElementById("gameResult").textContent = "Жылдам жауап аяқталды.";
}

function bindAnswerButtons() {
  document.querySelectorAll("#gameQuestion [data-answer]").forEach(button => {
    button.addEventListener("click", () => submitGameAnswer(button.dataset.answer));
  });
}

function bindTextAnswer() {
  const button = document.getElementById("textAnswerButton");
  const input = document.getElementById("gameTextAnswer");
  if (button) button.addEventListener("click", submitTextAnswer);
  if (input && input.tagName === "INPUT") {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") submitTextAnswer();
    });
    input.focus();
  }
}

function renderTugOfWar(q) {
  const left = tugScores.left;
  const right = tugScores.right;
  const total = currentQuestions.length;
  const ropePercent = 50 + tugPosition * 7;
  const activeTeam = tugTurn === "left" ? "🔵 Көк команда" : "🔴 Қызыл команда";

  document.getElementById("gameQuestion").innerHTML = `
    <div class="tug-board">
      <div class="tug-score-row">
        <div class="tug-team tug-blue"><span>🔵</span><strong>Көк команда</strong><b>${left}</b></div>
        <div class="tug-turn">Кезек: ${activeTeam}</div>
        <div class="tug-team tug-red"><b>${right}</b><strong>Қызыл команда</strong><span>🔴</span></div>
      </div>
      <div class="tug-track"><div class="tug-side blue-side"></div><div class="tug-side red-side"></div><div class="tug-center"></div><div class="tug-rope" style="left:${ropePercent}%"><span class="tug-flag">🚩</span><span class="tug-rope-line"></span></div></div>
      <div class="tug-question-card">
        <div class="tug-question-label">Сұрақ ${currentIndex + 1} / ${total}</div>
        <div class="tug-question">${escapeGameHtml(q.question)}</div>
        <div class="tug-options">${q.options.map(option => `<button type="button" data-tug-answer="${escapeGameHtml(option)}">${escapeGameHtml(option)}</button>`).join("")}</div>
      </div>
      <div class="tug-rule">Дұрыс жауап → команда арқанды өз жағына тартады. Қате жауап → кезек қарсы командаға өтеді.</div>
    </div>`;

  document.querySelectorAll("[data-tug-answer]").forEach(button => {
    button.addEventListener("click", () => answerTug(button.dataset.tugAnswer));
  });
}

function answerTug(value) {
  const q = currentQuestions[currentIndex];
  const correct = String(value) === String(q.answer);
  const team = tugTurn;
  if (correct) {
    tugScores[team]++;
    tugPosition += team === "left" ? -1 : 1;
  }
  if (tugPosition <= -maxTugPosition() || tugPosition >= maxTugPosition()) {
    finishTugGame(team);
    return;
  }
  const card = document.querySelector(".tug-question-card");
  if (!card) return;
  card.classList.add(correct ? "tug-correct" : "tug-wrong");
  const message = document.createElement("div");
  message.className = "tug-feedback";
  message.textContent = correct ? `✓ Дұрыс! ${team === "left" ? "Көк" : "Қызыл"} команда алға жылжыды.` : `✕ Қате. Дұрыс жауап: ${q.answer}`;
  card.appendChild(message);
  setTimeout(() => {
    tugTurn = tugTurn === "left" ? "right" : "left";
    currentIndex++;
    renderCurrentQuestion();
  }, 850);
}

function maxTugPosition() { return 5; }

function finishTugGame(winnerByPosition) {
  clearInterval(timerId);
  const winner = winnerByPosition === "left" ? "🔵 Көк команда" : "🔴 Қызыл команда";
  const left = tugScores.left;
  const right = tugScores.right;
  document.getElementById("gameProgress").textContent = "Нәтиже";
  document.getElementById("gameQuestion").innerHTML = `<div class="game-finish"><div class="finish-icon">🏆</div><h2>${winner} жеңді!</h2><p>Қорытынды ұпай: <strong>${left} : ${right}</strong></p><button type="button" class="game-primary" id="replayGameButton">↻ Қайта ойнау</button></div>`;
  document.getElementById("replayGameButton").addEventListener("click", startSelectedGame);
  document.getElementById("gameResult").textContent = "Командалық нәтиже аяқталды.";
}

function submitGameAnswer(value) {
  const q = currentQuestions[currentIndex];
  if (String(value) === String(q.right)) currentScore++;
  nextGameQuestion();
}

function submitTextAnswer() {
  const input = document.getElementById("gameTextAnswer");
  if (!input) return;
  const userAnswer = input.value.trim();
  const q = currentQuestions[currentIndex];
  let correct = false;
  if (currentGameMode === "find-error") {
    const normalized = userAnswer.toLowerCase();
    correct = normalized.includes(String(q.error).toLowerCase()) || normalized.includes(String(q.correction).toLowerCase());
  } else {
    correct = normalizedAnswer(userAnswer) === normalizedAnswer(q.answer);
  }
  if (correct) currentScore++;
  nextGameQuestion();
}

function normalizedAnswer(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function nextGameQuestion() {
  currentIndex++;
  renderCurrentQuestion();
}

function finishGame() {
  clearInterval(timerId);
  const total = currentQuestions.length;
  const percent = Math.round((currentScore / total) * 100);
  document.getElementById("gameProgress").textContent = "Нәтиже";
  document.getElementById("gameQuestion").innerHTML = `<div class="game-finish"><div class="finish-icon">🏆</div><h2>Ойын аяқталды!</h2><p>Нәтиже: <strong>${currentScore} / ${total}</strong> (${percent}%)</p><button type="button" class="game-primary" id="replayGameButton">↻ Қайта ойнау</button></div>`;
  document.getElementById("replayGameButton").addEventListener("click", startSelectedGame);
  document.getElementById("gameResult").textContent = "Нәтиже сабақ материалымен байланысты сақталады.";
}

function showGameMessage(message) {
  const box = document.getElementById("gameMessage");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
}

function populateLessonSelect() {
  const select = document.getElementById("lessonSelect");
  if (!select || typeof grade7AlgebraQ1 === "undefined") return;
  select.innerHTML = grade7AlgebraQ1.lessons.map(lesson => `<option value="${escapeGameHtml(lesson.id)}">${lesson.number}. ${escapeGameHtml(lesson.title)}</option>`).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  renderGameCards();
  populateLessonSelect();
  document.getElementById("gamesGrid").addEventListener("click", event => {
    const card = event.target.closest("[data-game-id]");
    if (card) selectGame(card.dataset.gameId);
  });
  document.getElementById("startGameButton").addEventListener("click", startSelectedGame);
  document.getElementById("backToGamesButton").addEventListener("click", backToGames);
});
