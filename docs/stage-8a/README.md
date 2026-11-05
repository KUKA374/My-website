# Stage 8A — шолу

Мақсат: КТП-ны өзгертпей, бір сабақтың материалын ғана жүктейтін кеңейтілетін үлгі.
Негіз: main `971f205650a18f141705b4e55607d7f578812d88`.
Тармақ: `stage-8a-lesson-architecture`.

Демо: `lesson-material.html?class=6&subject=math&quarter=1&lesson=1` (мұғалім рөлі).
Бұрынғы сабақ бетіндегі «Модульдік сабақ көрінісі (демо)» сілтемесі де осы контексті ашады.

- [Бастапқы аудит](AUDIT.md)
- [Модель, жүктеу, презентация және көшіру жоспары](ARCHITECTURE.md)
- [Жергілікті сақтау және серверлік қауіпсіздік қақпасы](SECURITY.md)
- [Тест нәтижелері және командалар](TESTING.md)
- [Pull Request мәтіні](PULL_REQUEST.md)

208 жергілікті тест және GitHub Actions-та 7 Firestore emulator тесті өтті — барлығы 215.
Серверлік сақтау іске қосылмаған, кандидат rules production-ға жарияланбаған. Stage 8A архитектурасы
review-ға дайын; болашақ cloud activation үшін бөлек бекіту қажет. Main-ға автоматты merge немесе
жариялау рұқсаты жоқ. [PR #5 тексерулері](https://github.com/KUKA374/My-website/pull/5/checks).

## Өзгерген файлдар

Бұрынғы екі файлда бір жолдан қосылды:

- `lesson.html` — тек жаңа opt-in сілтемесінің defer модулі.
- `tests/helpers/iustaz.cjs` — жергілікті HTTP тест серверіндегі JSON MIME түрі.

Жаңа файлдар:

| Топ | Файлдар |
|---|---|
| Демо бет | `lesson-material.html` |
| Деректер модульдері | `lesson-materials/model.js`, `loader.js`, `ktp.js`, `private.js`, `legacy.js` |
| Көрініс және байланыс | `lesson-materials/demo.js`, `demo.css`, `entry.js` |
| Бір демо мазмұн | `lesson-materials/content/6/math/q1/1.json` |
| Шағын индекс | `lesson-materials/index/6/math/q1.json` |
| Ортақ презентация | `lesson-materials/presentations/fractions-review-v1.json` |
| Белсенді емес rules кандидаты | `security/lesson-materials-v1.rules` |
| Эмулятор конфигурациясы | `security/firebase.emulator.json` (бұрынғы tests/emulator орнына) |
| CI қауіпсіздік қақпасы | `.github/workflows/stage-8a-security.yml`, `tests/run-lesson-security-qa.cjs`, `tests/security-ci/package.json`, `package-lock.json`, `.gitignore` |
| Rules сақталу регрессиясы | `tests/lesson-material-security-contract.test.cjs` |
| Автоматты тесттер | `tests/lesson-material-model.test.cjs`, `lesson-material-loader.test.cjs`, `lesson-material-browser.test.cjs`, `lesson-material-rules.test.cjs` |
| Сақталу эталондары | `tests/fixtures/stage8a-preserved.json`, `stage8a-ktp-contexts.json` |
| QA runner | `tests/run-lesson-material-qa.py` |
| Құжаттар | `docs/stage-8a/README.md`, `AUDIT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `PULL_REQUEST.md` |

КТП, 5–7 есептер банкі, ойын қозғалтқыштары, constructor модульдері, Auth,
production Firebase конфигурациясы және белсенді `firestore.rules` өзгермеді.

## Шектеулер

Бір ғана толық демо бар. Екінші КТП сабағында тек ортақ слайд диапазоны, басқа сабақтарда бос
модульдік бөлімдер болуы қалыпты. 64 КТП контексті барлық сабақтың материалы дайын дегенді білдірмейді.
Бұрынғы сабақ беті bulk жүктеуін сақтайды. Жеке сақтау тек осы браузерде, шифрланбаған;
бұлтқа көшіру және жаңа admin publication workflow кейінгі бекітілетін кезең.
Демода шынайы видео жоқ. Ойындар каталог арқылы ашылады, демо мазмұн конструкторға автоматты көшірілмейді.
