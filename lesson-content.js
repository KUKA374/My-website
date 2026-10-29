// ==========================================
// MATH TEACHER — САБАҚ МАТЕРИАЛДАРЫ
// ==========================================
// Бұл файл КТП-дан бөлек сақталады.
// Сондықтан КТП мәліметтерін бұзбай, сабақ материалдарын
// біртіндеп толықтыруға болады.

const lessonContent = {
  1: {
    videoUrl: "",

    theory: `
      <p><strong>Қатынас</strong> — екі шаманың бөлінді арқылы салыстырылуы.</p>
      <p>Егер a және b сандары берілсе, олардың қатынасы <strong>a : b</strong> немесе <strong>a/b</strong> түрінде жазылады.</p>
      <p><strong>Пропорция</strong> — екі қатынастың теңдігі: a : b = c : d.</p>
      <p>Пропорцияның негізгі қасиеті: <strong>a · d = b · c</strong>.</p>
    `,

    examples: `
      <p><strong>Мысал:</strong> 2 : 3 = x : 12.</p>
      <p>Пропорцияның негізгі қасиетін қолданамыз:</p>
      <p>2 · 12 = 3x</p>
      <p>24 = 3x, сондықтан <strong>x = 8</strong>.</p>
    `,

    commonMistakes: `
      <ul>
        <li>Қатынастың ретін ауыстырып жіберу.</li>
        <li>Пропорцияда шеткі және ортаңғы мүшелерді қате көбейту.</li>
        <li>Жауапты бастапқы шартпен тексермеу.</li>
      </ul>
    `,

    pairWork: `
      <p>Жұппен 3 пропорцияны шешіңдер. Бір оқушы есептейді, екіншісі шешімін тексереді.</p>
      <p><strong>Уақыт:</strong> 5 минут.</p>
    `,

    groupWork: `
      <p>Топқа 4 карточка беріледі. Әр топ пропорцияларды шешіп, шешу жолын түсіндіреді.</p>
      <p><strong>Уақыт:</strong> 7 минут.</p>
    `,

    individualWork: `
      <p><strong>A деңгейі:</strong> 2 жеңіл есеп.</p>
      <p><strong>B деңгейі:</strong> 2 орташа есеп.</p>
      <p><strong>C деңгейі:</strong> 1 күрделі мәтінді есеп.</p>
    `,

    game: `
      <p><strong>«Пропорцияны тап»</strong> ойыны.</p>
      <p>Экранда бірнеше қатынас көрсетіледі. Оқушы дұрыс пропорцияны таңдап, ұпай жинайды.</p>
    `,

    assessment: `
      <ul>
        <li>Қатынасты дұрыс жазды — 1 балл.</li>
        <li>Пропорция қасиетін дұрыс қолданды — 1 балл.</li>
        <li>Есептеу мен жауабы дұрыс — 1 балл.</li>
      </ul>
      <p><strong>Барлығы: 3 балл.</strong></p>
    `,

    homework: `
      <p><strong>Міндетті:</strong> 3 пропорция есептеу.</p>
      <p><strong>Қосымша:</strong> қатынас пен пропорция қолданылатын өмірлік жағдай құрастыру.</p>
    `,

    lessonPlan: [
      ["Ұйымдастыру", "3 мин"],
      ["Тақырыпты түсіндіру", "10 мин"],
      ["Жұптық жұмыс", "5 мин"],
      ["Топтық жұмыс", "7 мин"],
      ["Жеке жұмыс", "10 мин"],
      ["Бағалау", "5 мин"],
      ["Үй тапсырмасын түсіндіру", "5 мин"]
    ]
  }
};

/* Cloud integration: after the page renders, replace demo content with
   the latest shared material when Firebase is configured. */
(function loadSharedLessonContent() {
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function run() {
    try {
      await loadScript("firebase-config.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js");
      await loadScript("database.js");
    } catch (error) {
      console.warn("Shared database is not available yet.", error);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("lesson");
    if (!lessonId || !window.MathTeacherDB) return;

    try {
      const saved = await window.MathTeacherDB.getLessonMaterial(lessonId);
      if (!saved) return;
      lessonContent[lessonId] = Object.assign({}, lessonContent[lessonId] || {}, saved);
      if (typeof renderCompactLessonPage === "function") renderCompactLessonPage();
    } catch (error) {
      console.error("Shared lesson content could not be loaded.", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
