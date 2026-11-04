# Stage 7 тексерулерін қайталау

Қажет: Python 3, Node, Playwright, Chromium (`/usr/bin/chromium`), `pdftotext`; axe-core 4.10.3 тест құралы. Жергілікті HTTP серверлері ашылады. Firebase шекарасы тест аккаунттарымен басқарылады; production пайдаланушысы мен деректеріне жазу жоқ.

```bash
GAME_QA_LOG_DIR=/tmp/iustaz-game-qa python tests/run-games-qa.py
CONSTRUCTOR_QA_LOG_DIR=/tmp/iustaz-constructor-qa python tests/run-constructor-qa.py
IUSTAZ_AXE_PATH=/absolute/path/to/axe-core/axe.min.js python tests/run-iustaz-qa.py
```

Ескі ойын/конструктор тесттерінің күтілетін саны 565 және 47. Жаңа UI жиынтығы — 45 тест (2 қорғау келісімі, 2 бренд, 9 shell, 9 конструктор UI, 11 каталог, 3 соңғы сценарий, 1 визуалды, 8 axe бет аудиті). Бір визуалды тест 8 бет × 5 өлшем = 40 скриншот пен layout жазбасын шығарады; скриншот саны тест санына қосылмайды. Ұзақ PDF тесті 60 тапсырма маркерін және құпия жауап/шешім/жазба маркерлерінің жоқтығын pdftotext арқылы тексереді.

`tests/iustaz-baseline-browser.test.cjs` A кезеңіндегі бастапқы суреттерді түсіру рецепті. Оны соңғы QA runner әдейі қоспайды: қазіргі дизайнды бастапқы дизайн деп сақтауға болмайды. A commit-інде түсірілген бастапқы суреттер `/workspace/audit-math-ai/stage7-iustaz/before`, соңғысы `after` ішінде. Ескі regression fixtures ойын/конструктор механикасына арналған; жаңа визуалды fixture SVG және жергілікті қаріп MIME түрлерін нақты береді.

Әр runner соңғы `summary.json` ішінде exit code, pass/fail/skip мәндерін сақтайды және бірінші сәтсіз файлда тоқтайды. Барлық тест өткенге дейін қорытынды commit жасалмайды. Браузер автоматтандыруы нақты экрандық оқырман, нақты телефон не production Firebase рөлдерінің қабылдауын алмастырмайды.
