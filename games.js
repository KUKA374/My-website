function escapeGameHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

let selectedGameId = null;
let currentQuestions = [];
let currentIndex = 0;
let currentScore = 0;
let currentGameMode = "";
let timerId = null;

function renderGameCards() {
  const box = document.getElementById("gamesGrid");
  if (!box) return;
  box.innerHTML = mathGames.map(game => `
    <button class="game-card ${selectedGameId === game.id ? "selected" : ""}" onclick="selectGame('${game.id}')">
      <div class="game-icon">${game.title.split(" ")[0]}</div>
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
  document.getElementById("selectedGameDescription").textContent = game ? game.description : "";
  document.getElementById("gameSetup").style.display = "block";
  document.getElementById("gameArea").style.display = "none";
  renderGameCards();
  document.getElementById("gameSetup").scrollIntoView({ behavior: "smooth", block: "start" });
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

  currentIndex = 0;
  currentScore = 0;
  currentGameMode = selectedGameId;
  document.getElementById("gameArea").style.display = "block";
  document.getElementById("gameResult").textContent = "";
  renderCurrentQuestion();
  document.getElementById("gameArea").scrollIntoView({ behavior: "smooth", block: "start" });
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

  if (currentGameMode === "match") {
    box.innerHTML = `<div class="game-task"><h3>Сәйкес жұбын тап</h3><p class="game-prompt">${escapeGameHtml(q.left)}</p><div class="answer-buttons"><button onclick="submitGameAnswer('${escapeGameHtml(q.right)}')">${escapeGameHtml(q.right)}</button><button onclick="submitGameAnswer('Қате жауап')">Қате жауап</button></div></div>`;
    return;
  }

  if (currentGameMode === "find-error") {
    box.innerHTML = `<div class="game-task"><h3>Қатені тап</h3><p class="game-prompt">${escapeGameHtml(q.statement)}</p><textarea id="gameTextAnswer" placeholder="Қатені және дұрыс нұсқаны жазыңыз..."></textarea><button class="game-primary" onclick="submitTextAnswer()">Тексеру</button></div>`;
    return;
  }

  if (currentGameMode === "quick-answer") {
    box.innerHTML = `<div class="game-task"><h3>Жылдам жауап</h3><p class="game-prompt">${escapeGameHtml(q.question)}</p><input id="gameTextAnswer" inputmode="numeric" placeholder="Жауабыңызды жазыңыз"><button class="game-primary" onclick="submitTextAnswer()">Жауап беру</button></div>`;
    return;
  }

  if (currentGameMode === "math-code") {
    box.innerHTML = `<div class="game-task"><h3>Математикалық код</h3><p class="game-prompt">${escapeGameHtml(q.question)}</p><input id="gameTextAnswer" inputmode="numeric" placeholder="Жауабыңыз"><button class="game-primary" onclick="submitTextAnswer()">Кодқа қосу</button><p class="code-progress">Қазіргі код: ${"_ ".repeat(currentIndex + 1)}</p></div>`;
    return;
  }

  if (currentGameMode === "detective") {
    box.innerHTML = `<div class="game-task"><h3>Математикалық детектив</h3><p class="game-prompt">${escapeGameHtml(q.clue)}</p><input id="gameTextAnswer" inputmode="numeric" placeholder="Дәлелдің жауабы"><button class="game-primary" onclick="submitTextAnswer()">Дәлелді тексеру</button></div>`;
  }
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
  document.getElementById("gameQuestion").innerHTML = `
    <div class="game-finish">
      <div class="finish-icon">🏆</div>
      <h2>Ойын аяқталды!</h2>
      <p>Нәтиже: <strong>${currentScore} / ${total}</strong> (${percent}%)</p>
      <button class="game-primary" onclick="startSelectedGame()">Қайта ойнау</button>
    </div>`;
  document.getElementById("gameResult").textContent = "Нәтиже сабақ материалымен байланысты сақталады.";
}

function showGameMessage(message) {
  const box = document.getElementById("gameMessage");
  box.textContent = message;
  box.style.display = "block";
}

function populateLessonSelect() {
  const select = document.getElementById("lessonSelect");
  if (!select || typeof grade7AlgebraQ1 === "undefined") return;
  select.innerHTML = grade7AlgebraQ1.lessons.map(lesson => `<option value="${lesson.id}">${lesson.number}. ${escapeGameHtml(lesson.title)}</option>`).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  renderGameCards();
  populateLessonSelect();
  document.getElementById("startGameButton").addEventListener("click", startSelectedGame);
});
