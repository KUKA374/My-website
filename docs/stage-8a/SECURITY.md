# Stage 8A — сақтау және серверлік қауіпсіздік

## Осы тармақта іске қосылғаны

Жаңа бетте тек жергілікті сақтау бар. `ConstructorAuth.watch` арқылы расталған Firebase UID
мен сабақ ID-і `iustaz-homework-v1:{encodedUID}:{encodedLessonId}` кілтін құрайды.
Жеке үй жұмысы/жазба ортақ материалға араласпайды. UID ауысқанда/жүйеден шыққанда өрістер тазаланады.
Revision тексеруі басқа қойындыдағы жаңартуды үнсіз үстінен жаздырмайды; бұл localStorage-тың
атомарлы серверлік транзакциясы емес. Бір мезгілдегі бірнеше процестік write race толық шешілмеген.
Бүлінген жазбаға автоматты overwrite жасалмайды.

Бұл браузердегі логикалық оқшаулау; шифрлау, серверлік резервтік көшірме немесе ортақ origin-ге
қолжетімді кодтан қорғаныс емес. Бір браузерді бірнеше адам қолданса, localStorage әкімшілік құралмен
оқылуы мүмкін. Демо статикалық JSON-дары public URL-дар, оларға құпия материал салуға болмайды.
Жүйеге кіру интерфейсті шектейді, статикалық файлдарға серверлік ACL орнатпайды.

Қазіргі `firestore.rules`, `firebase-config.js`, Auth рөлдері және админ панелі өзгертілмеген.
Ешбір жаңа серверлік write/read gateway қосылмады. Қазіргі fallback deny жаңа коллекцияларды
жабық ұстайды. Firebase-ке ереже жариялау/дерек көшіру орындалмады.

## Жеке ұсынылатын ережелер

`security/lesson-materials-v1.rules` — толық **кандидат**, белсенді production ереже емес.
Бұрынғы users/lessonMaterials рұқсаттарын сақтап, мына жолдарды қосады:

| Жол | Ұсынылатын саясат |
|---|---|
| `curriculumLessonRefs/{lessonId}` | Мұғалім/әкімші get; клиенттік list/write жабық, тек trusted Admin SDK импорты |
| `lessonContentV1/{lessonId}` | Мұғалім тек published get; admin/super_admin жазады; танылған lesson ID, schema/envelope тексеруі |
| `lessonPresentations/{id}` | Published get; жариялауды admin/super_admin басқарады; 10–15 слайд пен нақты count |
| `lessonVideoMetadata/{lessonId}` | Жариялауды тек admin/super_admin басқарады; YouTube ID, статус, updatedBy/updatedAt тексеруі |
| `teacherLessonOverrides/{uid}/lessons/{lessonId}` | Расталған рөл + тек өз UID-і; нақты lesson ID; қатаң өрістер, мәтін шегі, revision, timestamp |

Рөл users/{auth.uid} құжатынан оқылады: клиенттік role өрісі не custom claim оны алмастырмайды.
Қалыпты әкімші басқа мұғалімнің жеке homework жолын оқымайды. Коллекцияны жаппай list жасау жабық.
Слайд диапазоны ортақ презентацияның slideCount мәнімен серверде де салыстырылады.
Әкімші мазмұнының барлық nested педагогикалық дұрыстығын Rules дәлелдемейді: trusted authoring
pipeline толық `model.js` валидациясы мен педагогикалық review жүргізуі тиіс.

## Міндетті іске қосу қақпасы

Кандидат rules-ты production-ға жарияламаңыз. 7 нақты Firestore emulator тесті GitHub Actions-та өтті:
[run 41967078208](https://github.com/KUKA374/My-website/actions/runs/41967078208), commit `f0da3f8`.
Осы CI іске қосылуы Rules компиляциясы мен тексерілген серверлік рұқсаттарды растайды.
Жергілікті ортада ресми JAR жүктелуі `storage.googleapis.com` желілік саясатына байланысты әлі бұғатталған.
UI тесттері немесе мәтіндік ереже салыстыруы нақты emulator қақпасын алмастырмайды.

Бекітілген CI құралдарын орнату (Node >=24.12, осы workflow-да 24.19.0; Java 21):

```sh
npm ci --prefix tests/security-ci --ignore-scripts --no-audit --no-fund
node tests/lesson-material-security-contract.test.cjs
IUSTAZ_FIREBASE_TOOLS="$PWD/tests/security-ci" tests/security-ci/node_modules/.bin/firebase emulators:exec --config security/firebase.emulator.json --project demo-iustaz-stage8a --only firestore 'node tests/run-lesson-security-qa.cjs'
```

`demo-iustaz-stage8a` — тек тест namespace, production Firebase конфигурациясы емес.
`security/firebase.emulator.json` тек localhost:8187 эмуляторын көрсетеді. Тест тірі endpoint-ті қолданбайды.
Конфигурация кандидат rules-пен бір каталогта: CLI оны project directory сыртында деп қабылдамайды.
Бұрынғы `tests/emulator/firebase.json` осы себеппен көшірілді. Production конфигурациясы өзгермеген.
Тесттер UID/lesson оқшаулауы, бөгде UID/admin кіруі, revision/extra fields, role spoofing,
draft/anonymous/student рұқсаттары, видео жариялау және ортақ презентация диапазонын тексереді.

Эмулятордан кейін бөлек review, қолданыстағы ережелермен diff, staging деректерімен smoke test,
App Check/квота/логтау жоспары керек. Тек содан кейін әкімшілік бекітумен production deploy.
Көшіру кезінде серверлік транзакция/revision бақылауы және published материалдың сабақ ID сәйкестігі
gateway-де тексеріледі. Қазіргі браузерлік сабақ кітапханасы сол күйінде қалады.

## PR #5 GitHub Actions қақпасы

`.github/workflows/stage-8a-security.yml` main-ға бағытталған pull_request оқиғасында,
draft PR үшін де орындалады. Default branch-та болғанда workflow_dispatch та қолжетімді.
`pull_request_target` қолданылмайды.
Тек `contents: read`; checkout credentials сақталмайды, Firebase/GCP secret, id-token, deploy,
Pages немесе main-ға push қадамдары жоқ. Ресми actions өзгермейтін SHA-мен бекітілген.

`tests/security-ci/package-lock.json` нақты dependency graph-ты бекітеді. `npm ci --ignore-scripts`
таза орнатудан өтті; production application тәуелділігі қосылмайды. Қауіпсіздік тесттері әрқайсысы
жаңа emulator деректерінен басталады. Бұрынғы users/lessonMaterials рөлдік матрицасы да тексеріледі.

Runner тек `127.0.0.1:8187` қабылдайды; TAP-та дәл 7 pass, 0 fail/cancelled/skipped/todo болғанда
ғана нөлдік exit code береді. Жалған skip пен толық орындалмаған жиынтық жасыл бола алмайды.
Job summary, JSON/TAP және эмулятор диагностикасы artifact ретінде 7 күн сақталады.

`Firestore emulator (7 security tests)` нақты жасыл нәтиже бермейінше merge дайындығы расталмайды.
PR #5-тің алғашқы CI іске қосылуы Success болды. Actions HTML-інен job және тест қадамының
сәтті аяқталуы тексерілді; API бұл ортада Forbidden қайтарады. Жеке TAP/JSON artifact CI-де сақталады.
Алғашқы run-дағы Node.js 20 ескіру ескертуінен кейін барлық actions native Node.js 24 нұсқаларының
ресми репозиторийден тексерілген SHA-ларына ауыстырылды; соңғы head check PR бетінде көрінеді.
Репозиторий иесі осы status check-ті branch protection-да міндетті ете алады; бұл жұмыс branch
protection баптауларын өзгертпейді. Жергілікті құрылымдық екі тест серверлік тесттерді алмастырмайды.
