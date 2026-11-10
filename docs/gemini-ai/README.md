# Gemini AI сабақ зертханасы — бір админ жобасы

Негіз: main `94085c9` (Stage 8C/8D main-ға біріктірілген). Жұмыс тармағы:
`feature-gemini-lesson-draft`. Бұл код жергілікті дайындалды; production Firebase,
GitHub Pages немесе басқа серверге deploy жасалмайды.

## Нәтиже және шекара

Админ панеліндегі **«AI арқылы сабақ дайындау · тест»** батырмасы бір КТП сабағына
теория, 3–4 шығарылған мысал, дәл 45 минуттық жоспар, 3 жұптық, 4 топтық,
A/B/C-де 6 жеке және 2 үй тапсырмасын, бағалау дескрипторларын, ҚМЖ деректерін
және **12 слайдтық теориялық презентацияны** дайындауға арналған.

Таңдалған ресми сабақ:

- 8-сынып, Алгебра, ІІ тоқсан, №3;
- атауы: **«Квадрат теңдеулерді шешу»**;
- бөлім: **«Квадрат теңдеулер»**;
- оқу мақсатының нақты бастапқы мәтіні: **`8.2.2.3квадрат теңдеулерді шешу;`**;
- тұрақты ID: **`ktp1:8:algebra:2:3`**;
- дереккөз: `ktp-8-algebra-q2.js`. Файл, атау, бос орындар және мақсат өзгермейді.

Каталогта осы атау №3–8-де бар; №7/8 Виет теоремасына бағытталғандықтан,
тәжірибеге дискриминантпен шешу мақсаты бар бірінші №3 сабақ алынды.

**Нақты Gemini генерациясы осы ортада орындалмаған.** Gemini secret binding,
сервердің ADC credentials және API доменіне желілік рұқсат жоқ. Төмендегі demo
қолмен дайындалған fixture қолданады; UI-де ол «Gemini шақырылмаған» деп жазылады.
Fixture-дің 19 жауабы дәл рационал арифметикамен тексерілген. Болашақ Gemini мәтіндері
автоматты түрде математикалық дұрыс деп сертификатталмайды: админ шолуы міндетті.

## Қолданыстағы архитектура аудиті

- Сайт — HTML/JS/CSS, GitHub Pages статикалық hosting. Қолданыста backend/functions жоқ.
- Firebase Authentication және `users/{uid}.role` рөлдері қолданылады.
- `firestore.rules`: өз профилін оқу; `lessonMaterials` барлық расталған мұғалім/админге
  оқылады, admin/super_admin жаза алады. Бұл жинақ AI жеке жобаларына жарамайды.
- `cloud-admin.js` / `database.js` — бұрынғы ортақ редактор көпірі; оның сақтау батырмасына
  жаңа AI жобасы қосылмайды. Бұрынғы редактор 7-сынып/І тоқсанмен шектелген күйінде қалды.
- Stage 8A/8B `lesson-materials/model.js`, `qmj.js` және жергілікті KaTeX қайта пайдаланылады.
- Жаңа AI жобасы каталог индексіне, сабақ JSON-дарына немесе `lessonMaterials` жинағына
  жазылмайды. Конструктор, 20 ойын, тапсырмалар банкі, КТП, Auth және production rules өзгермейді.

## Деректер ағыны

```text
admin.html → same-origin /api/ai-lessons/*
             → Firebase Admin verifyIdToken(token, true)
             → Firestore REST GET users/{decoded UID}?mask.fieldPaths=role
             → тек admin / super_admin
             → бірегей сұрау + тәуліктік лимит
             → Gemini generateContent (тек сервер secret header)
             → JSON schema + қолданыстағы lesson model + 45 минут / 12 слайд
             → рөлді қайта тексеру
             → жеке сервер SQLite: owner UID + draft ID
```

Әр оқу сұрауы да серверде рөлді тексереді. Өзге админ де басқа UID жобасын оқымайды.
Мұғалімге 403, жарамсыз сессияға 401, басқа иенің жобасына 404 қайтарылады.
SQLite файлдары HTTP арқылы берілмейді; `AI_DATA_DIR` сайт түбірінен тыс болуы міндетті.
Firestore-ға жаңа write әдісі қосылған жоқ. Production Firestore ережелері өзгермеді.

## Қауіпсіздік және шығын бақылауы

- `GEMINI_API_KEY` тек сервердің `process.env` айнымалысынан оқылады. Frontend-те кілт,
  кілт енгізу өрісі, query параметрі немесе модельге жіберілетін кілт жоқ.
- Gemini сұрауы тек бекітілген HTTPS endpoint-ке `x-goog-api-key` header-імен жіберіледі;
  redirect қабылданбайды. ADC access token де тек бекітілген Firestore GET endpoint-ке барады.
- Алдымен `/availability` кілтсіз протокол тексеруі орындалады. Статикалық GitHub Pages
  API болмаған жағдайда Firebase ID token жіберілмейді. Бұл endpoint жеке дерек бермейді.
- Клиент еркін prompt, модель, owner UID немесе өзге lesson ID бере алмайды.
- Кіріс JSON — ең көбі 4 KiB; upstream жауап — 1 MiB; сақталатын мазмұн — 384 KiB.
- Таймаут — 75 секунд; бір сұрауда бір candidate, ең көбі 24 576 output token.
- Әдепкі лимит: бір UID-ге UTC тәулігіне 3, сервер бойынша 30 сұрау. Сәтсіз әрекет те саналады.
- Бір UID-дің бір генерациясы ғана қатар орындалады. Бір `requestId` қайта жіберілсе,
  аяқталған жоба қайта беріледі; жаңа Gemini сұрауы жасалмайды. Автоматты retry жоқ.
- Таймаутта не үзілген жауапта Gemini шығын есептеуі мүмкін. Белгісіз токен саны 0 құн деп көрсетілмейді.
- Кіріс/жауап/жалпы/кэш/ойлау токендері Gemini `usageMetadata`-сынан алынады; жоқ есеп бөлек белгіленеді.
  Ақшалай құн болжанбайды. Статистика тек осы админге арналған.
- Мәтін DOM-ға `textContent` арқылы салынады. KaTeX `trust:false`, шектеулі expansion/size режимінде.
- Нақты сервер Firebase emulator token-дерін қабылдамайды. Оқшау demo — бөлек entry point,
  тек loopback адресінде; `NODE_ENV=production` болса іске қосылмайды.
- Жариялау/мақұлдау/ортақ базаға көшіру endpoint-і жоқ. Жоба күйі — `draft`, `reviewRequired:true`.

## Код картасы

| Файл                                                      | Міндеті                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `admin.html`, `ai-lesson-admin.js`, `ai-lesson-admin.css` | Тексерілген админге тест батырмасы, жоба, ҚМЖ/слайд көрінісі және статистика |
| `server/ai-lessons/index.cjs`                             | Нақты сервер entry point, environment config және ADC                        |
| `catalog.cjs`, `content.cjs`                              | Нақты КТП, Gemini prompt/schema, нәтиже валидациясы                          |
| `auth.cjs`, `roles.cjs`                                   | Token revocation + ағымдағы рөлдің тек GET арқылы тексерілуі                 |
| `provider.cjs`                                            | Gemini REST, таймаут, көлем шегі, usageMetadata, қауіпсіз қателер            |
| `store.cjs`, `app.cjs`                                    | Жеке SQLite, лимит/дедупликация, API және статикалық server                  |
| `demo.cjs`, `fixtures/quadratic-response.json`            | Gemini/production Firebase-сыз анық белгіленген жергілікті сынақ             |
| `tests/ai-lessons*.cjs`, `tests/run-ai-lesson-qa.py`      | Қауіпсіздік/модель/HTTP/browser және регрессия                               |

Іске қосу және нақты серверге не дайындау керектігі: [TESTING.md](TESTING.md).

Gemini REST өрістері Google-дың ресми ашық анықтамасымен салыстырылды:
https://github.com/googleapis/googleapis/blob/master/google/ai/generativelanguage/v1beta/generative_service.proto
(`generateContent`, `responseMimeType`, `responseSchema`, `usageMetadata`). Бұл нақты
Gemini аккаунтымен smoke test орындалғанын білдірмейді.

## Өзгерген файлдар

```text
admin.html
ai-lesson-admin.css
ai-lesson-admin.js
docs/gemini-ai/README.md
docs/gemini-ai/TESTING.md
server/ai-lessons/.env.example
server/ai-lessons/.gitignore
server/ai-lessons/.npmrc
server/ai-lessons/app.cjs
server/ai-lessons/auth.cjs
server/ai-lessons/catalog.cjs
server/ai-lessons/content.cjs
server/ai-lessons/demo.cjs
server/ai-lessons/errors.cjs
server/ai-lessons/fixtures/quadratic-response.json
server/ai-lessons/index.cjs
server/ai-lessons/package-lock.json
server/ai-lessons/package.json
server/ai-lessons/provider.cjs
server/ai-lessons/roles.cjs
server/ai-lessons/store.cjs
tests/ai-lessons-browser.test.cjs
tests/ai-lessons.test.cjs
tests/fixtures/ai-quadratic-math.json
tests/run-ai-lesson-qa.py
```
