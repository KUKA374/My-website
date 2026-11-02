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

window.gameQuestionBank = gameQuestionBank;

function getGameQuestions(gameId, lessonKey) {
  const lesson = gameQuestionBank[lessonKey];
  const aliases = {"find-error":"findError","quick-answer":"quickAnswer","math-code":"mathCode"};
  const key = aliases[gameId] || gameId;
  return lesson && Array.isArray(lesson[key]) ? lesson[key] : [];
}

// Қосымша ойын скрипттері games.html ішінде ретімен жүктеледі.


(function(){
 const sets={
 "5-math-1-1":[["48 + 27 = ?","75"],["96 - 38 = ?","58"],["12 × 7 = ?","84"],["144 : 12 = ?","12"]],
 "6-math-1-1":[["1/2 + 1/4 = ?","3/4"],["3/4 - 1/2 = ?","1/4"],["2/3 + 1/6 = ?","5/6"],["1/2 : 1/4 = ?","2"]],
 "6-math-1-2":[["0,5 + 0,25 = ?","0,75"],["1,2 × 3 = ?","3,6"],["4,8 : 2 = ?","2,4"],["2,5 + 1,75 = ?","4,25"]],
 "6-math-1-3":[["A={1,2,3}, B={3,4}. A∩B = ?","{3}"],["A={1,2}, B={2,3}. A∪B = ?","{1,2,3}"],["A={2,4}, B={1,3}. A∩B = ?","∅"],["A={1,3}, B={3,5}. A∩B = ?","{3}"]],
 "6-math-1-4":[["200 санының 10%-ы = ?","20"],["80 санының 25%-ы = ?","20"],["150 санының 20%-ы = ?","30"],["60 санының 50%-ы = ?","30"]],
 "6-math-1-5":[["12 : 4 қатынасын қысқарт","3 : 1"],["8 : 12 қатынасын қысқарт","2 : 3"],["10 саны 50 санының неше пайызы?","20"],["15 саны 60 санының неше пайызы?","25"]],
 "6-math-1-6":[["2 : 5 кері қатынасы","5 : 2"],["3 : 7 кері қатынасы","7 : 3"],["4 : 9 кері қатынасы","9 : 4"],["5 : 8 кері қатынасы","8 : 5"]],
 "6-math-1-7":[["2 : 3 = x : 12. x = ?","8"],["4 : 5 = 8 : x. x = ?","10"],["3 : 7 = x : 21. x = ?","9"],["5 : 2 = 15 : x. x = ?","6"]],
 "7-algebra-1-2":[["3x + 5 = 20. x = ?","5"],["2x - 4 = 10. x = ?","7"],["5x = 45. x = ?","9"],["4x + 3 = 19. x = ?","4"]],
 "7-algebra-1-3":[["2x + 8 = 20. x = ?","6"],["5x - 7 = 18. x = ?","5"],["3x + 4 = 25. x = ?","7"],["8x - 4 = 28. x = ?","4"]],
 "7-algebra-1-4":[["2³ = ?","8"],["3² = ?","9"],["5² = ?","25"],["2⁵ = ?","32"]]
 };
 const extras=["math-race","wheel","auction","blitz","cards","quest","secret-number","puzzle","rocket","castle","car-race","target","bridge","math-king"];
 for(const [key,pairs] of Object.entries(sets)){
  const bank=gameQuestionBank[key]||(gameQuestionBank[key]={});
  const q=pairs.map(([question,answer],i)=>{
    const pool=[...new Set(pairs.map(p=>String(p[1])).filter(x=>x!==String(answer)))];
    if(/^-?\d+(?:[.,]\d+)?$/.test(String(answer))){
      const number=Number(String(answer).replace(",","."));
      for(const delta of [1,-1,2,-2,5,-5,10]){
        const v=String(number+delta).replace(".",String(answer).includes(",")?",":".");
        if(v!==String(answer)&&!pool.includes(v))pool.push(v);
        if(pool.length>=3)break;
      }
    }
    if(pool.length<3){for(const v of ["1/2","1/3","2/3","3/4","0","1","2","3","∅","{1,2}"]){if(v!==String(answer)&&!pool.includes(v))pool.push(v);if(pool.length>=3)break;}}
    const options=[String(answer),...pool.slice(0,3)];
    const offset=(i%options.length)+1;
    return {question,answer:String(answer),options:options.slice(offset).concat(options.slice(0,offset))};
  });
  bank.match=bank.match||pairs.map(([left,right])=>({left,right}));
  bank.findError=bank.findError||pairs.map(([question,answer],i)=>({
    statement:question+" Оқушының жауабы: "+(q[i].options.find(v=>v!==String(answer))||"0"),
    error:"Жауап дұрыс есептелмеген",
    answer:String(answer),
    correction:"Дұрыс жауап: "+answer
  }));
  bank.quickAnswer=bank.quickAnswer||q;
  bank.mathCode=bank.mathCode||pairs.map(([question,answer],i)=>({question,answer,code:String(i+1)}));
  bank.detective=bank.detective||pairs.map(([question,answer])=>({clue:question,answer}));
  bank["tug-of-war"]=bank["tug-of-war"]||q;
  for(const id of extras)bank[id]=q.map(x=>({...x,options:[...x.options]}));
 }
})();
