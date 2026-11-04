"""Sequential constructor QA; browser boundary mocks Firebase, never real users.
Run: python tests/run-constructor-qa.py [test filenames]
CONSTRUCTOR_QA_LOG_DIR controls the external log directory.
"""
from pathlib import Path
import json
import os
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
FILES = ['constructor-model.test.cjs', 'constructor-planning.test.cjs',
         'constructor-games.test.cjs', 'constructor-storage.test.cjs',
         'constructor-auth.test.cjs', 'constructor-browser.test.cjs',
         'constructor-planning-browser.test.cjs', 'constructor-games-browser.test.cjs',
         'constructor-library-browser.test.cjs', 'constructor-qa-browser.test.cjs']
selected = sys.argv[1:] or FILES
if any(f not in FILES for f in selected):
    raise SystemExit('Тест атауы тізімде жоқ.')
logs = Path(os.environ.get('CONSTRUCTOR_QA_LOG_DIR', '/tmp/math-ai-constructor-qa'))
logs.mkdir(parents=True, exist_ok=True)
results = []
for name in selected:
    print('Тексеру:', name, flush=True)
    log = logs / (name + '.log')
    with log.open('w') as stream:
        run = subprocess.run(['node', str(ROOT / 'tests' / name)], cwd=ROOT,
                             stdout=stream, stderr=subprocess.STDOUT)
    text = log.read_text()
    counts = {k: int(v) for k, v in re.findall(
        r'(?:ℹ|#) (tests|pass|fail|cancelled|skipped|todo) (\d+)', text)}
    valid = run.returncode == 0 and counts.get('tests', 0) > 0 and counts.get('pass') == counts.get('tests') and all(counts.get(k) == 0 for k in ['fail', 'cancelled', 'skipped', 'todo'])
    results.append({'file': name, 'exitCode': run.returncode, 'valid': valid, **counts})
    (logs / 'summary.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print('\n'.join(text.splitlines()[-12:] if valid else text.splitlines()[-100:]), flush=True)
    if not valid:
        raise SystemExit(1)
print('Сәтті тексерулер:', sum(r['pass'] for r in results), flush=True)
