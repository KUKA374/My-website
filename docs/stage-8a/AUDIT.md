# Stage 8A — бастапқы аудит

Негіз: main `971f205650a18f141705b4e55607d7f578812d88` (Stage 7 PR #4 біріктірілген). Stage 6 `37f191d` және Stage 7 `0b86d28` осы main ішінде бар. Жұмыс қалтасы бастапқыда таза. Жеке тармақ: stage-8a-lesson-architecture.

| Компонент | Қазіргі тәсіл | Қайта пайдалану |
|---|---|---|
| constructor-catalog.js | КТП қалыптарын оқиды; жоғарғы сыныптарды lazy жүктейді; legacy мәтін/есеп адаптерлері | grade/rows API; КТП-ны қайта жазбай оқу |
| constructor-app.js | КТП нөмірі/сынып/пән/тоқсан арқылы таңдау; title/section/objective нақты деректен | Өзгеріссіз; жаңа беттен КТП сілтемесі |
| constructor-library.js / storage | schemaVersion 2, math-ai-lessons-v2:UID, revision/conflict, autosave | Бұрынғы кітапханаға тимеу; кейінгі migration тек келісіммен |
| constructor-game-links.js | 20 атау/ережені GameLearning арқылы береді; link() games.html қайтарады | Осы API; автоматты ойын іске қосатын ойдан query қоспау |
| lesson.html / lesson-content*.js | Барлық төменгі КТП және үлкен ортақ материал JS файлдары бірден жүктеледі; contentKey құрама, 7-сыныпта қысқа legacy key де бар | Бұрынғы бет сақталады; жаңа модульдік көрініске бөлек сілтеме |
| cloud-lesson.js | Ескі grade7AlgebraQ1/renderCompactLessonPage келісіміне байланған | Қазіргі lesson.html оны қоспайды; жаңа жүктеушіге жасырын қосылмайды |
| database.js | lessonMaterials Firestore немесе mathTeacherLessonMaterials localStorage; all-materials API бар | Өзгеріссіз; жаңа loader getAllLessonMaterials қолданбайды |
| auth.js / constructor-auth.js | Рөл users/UID Firestore құжатынан; sessionStorage тек кэш | Қолданыстағы watch арқылы нақты UID тексеру |
| firestore.rules | users өзін оқу, клиенттен рөл жазу жабық; lessonMaterials admin/super_admin жазады; қалғаны deny | Қазіргі rules өзгермейді; жаңа namespace үшін бөлек ұсыныс және emulator тесті |

КТП тақырыбы/нөмірі/бөлімі/реті/мақсаты — authoritative дерек. Жаңа content құжатына олар көшіріліп, өңделетін өріске айналмайды. Тұрақты ID тек сынып/пән/тоқсан/сабақ нөмірінен құралады; тақырып мәтінінен не массив индексінен алынбайды. Барлық бастапқы root JS, CSS және rules файлдары SHA-256 manifest-пен қорғалады.

Жаңа үлгі бөлек lesson-material.html бетінде. Бір толық демо, көрші сабаққа тек ортақ презентация сілтемесі. Миграцияланбаған сабақта бос мазмұн қате емес; бұрынғы материалға анық сілтеме беріледі. Барлық ескі материалдар бірден жаңа loader-ге көшірілді деп жарияланбайды.
