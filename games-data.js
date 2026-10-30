const mathGames = [
  {
    id: "match",
    title: "🧩 Сәйкестендір",
    description: "Сұрақ пен дұрыс жауапты немесе екі математикалық карточканы сәйкестендіру.",
    formats: ["Жұптық", "Жеке", "Топтық"],
    skills: ["Сәйкестендіру", "Жылдам ойлау", "Білімді қолдану"]
  },
  {
    id: "find-error",
    title: "❌ Қатені тап",
    description: "Берілген математикалық шешімнің қатесін тауып, дұрыс шешімді түсіндіру.",
    formats: ["Жұптық", "Топтық", "Жеке"],
    skills: ["Талдау", "Қате табу", "Дәлелдеу"]
  },
  {
    id: "quick-answer",
    title: "⚡ Жылдам жауап",
    description: "Уақыт ішінде мүмкіндігінше көп қысқа математикалық тапсырма орындау.",
    formats: ["Жұптық", "Топтық", "Жеке"],
    skills: ["Жылдам есептеу", "Назар", "Қайталау"]
  },
  {
    id: "math-code",
    title: "🔐 Математикалық код",
    description: "Әр дұрыс жауап бір цифр немесе әріп береді. Соңында жасырын код ашылады.",
    formats: ["Жұптық", "Топтық", "Жеке"],
    skills: ["Есептеу", "Логика", "Қорытынды жасау"]
  },
  {
    id: "detective",
    title: "🕵️ Математикалық детектив",
    description: "Бірнеше математикалық дәлелді қолданып, соңғы жауапты табу.",
    formats: ["Топтық", "Жұптық"],
    skills: ["Логика", "Зерттеу", "Командалық жұмыс"]
  },
  {
    id: "tug-of-war",
    title: "🪢 Арқан тартыс",
    description: "Екі команда математикалық сұрақтарға жауап беріп, арқанды өз жағына тартады.",
    formats: ["Топтық", "Сыныппен"],
    skills: ["Жылдам ойлау", "Есептеу", "Командалық жұмыс"]
  }
];

// Тест үшін бастапқы шағын банк. Кейін кітап пен сабақ материалдары келгенде
// бұл құрылым әр тақырыпқа арналған есептермен толықтырылады.
const gameQuestionBank = {
  "7-algebra-1-1": {
    topic: "Қатынастар және пропорция. Рационал сандар және оларға амалдар қолдану",
    match: [
      { left: "2 : 3 = x : 12", right: "x = 8" },
      { left: "4 : 5 = 8 : x", right: "x = 10" },
      { left: "3 : 7 = x : 21", right: "x = 9" }
    ],
    findError: [
      { statement: "2 : 3 = 8 : 9", error: "8 · 3 ≠ 2 · 9", correction: "Дұрыс пропорция: 2 : 3 = 6 : 9" },
      { statement: "4 : 5 = 8 : 15", error: "4 · 15 ≠ 5 · 8", correction: "Дұрыс пропорция: 4 : 5 = 8 : 10" }
    ],
    quickAnswer: [
      { question: "2 : 3 = x : 12", answer: "8" },
      { question: "4 : 5 = 8 : x", answer: "10" },
      { question: "3 : 7 = x : 21", answer: "9" },
      { question: "5 : 2 = 15 : x", answer: "6" }
    ],
    mathCode: [
      { question: "2 : 3 = x : 12. x = ?", answer: "8", code: "8" },
      { question: "4 : 5 = 8 : x. x = ?", answer: "10", code: "1" },
      { question: "3 : 7 = x : 21. x = ?", answer: "9", code: "9" }
    ],
    detective: [
      { clue: "Бірінші дәлел: 2 : 3 = x : 12", answer: "8" },
      { clue: "Екінші дәлел: 4 : 5 = 8 : y", answer: "10" },
      { clue: "Үшінші дәлел: 3 : 7 = z : 21", answer: "9" }
    ],
    "tug-of-war": [
      { question: "2 : 3 = x : 12. x = ?", options: ["6", "8", "9", "10"], answer: "8" },
      { question: "4 : 5 = 8 : x. x = ?", options: ["8", "10", "12", "15"], answer: "10" },
      { question: "3 : 7 = x : 21. x = ?", options: ["7", "8", "9", "12"], answer: "9" },
      { question: "5 : 2 = 15 : x. x = ?", options: ["4", "5", "6", "8"], answer: "6" },
      { question: "6 : 4 = x : 10. x = ?", options: ["12", "15", "16", "18"], answer: "15" },
      { question: "7 : 3 = 14 : x. x = ?", options: ["4", "5", "6", "7"], answer: "6" }
    ]
  }
};

function getGameQuestions(gameId, lessonKey) {
  const lesson = gameQuestionBank[lessonKey];
  return lesson && lesson[gameId] ? lesson[gameId] : [];
}

// Қосымша ойындардың интерфейстерін games.js-тен кейін жүктейміз.
// Бұл негізгі ойын кодын өзгертпей, жаңа механизмдерді бөлек кеңейтуге мүмкіндік береді.
(function loadExtraGames(){
  const script = document.createElement('script');
  script.src = 'games-extra-v3.js?v=1';
  script.defer = true;
  document.head.appendChild(script);
})();
