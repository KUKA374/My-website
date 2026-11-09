"""Stage 8A local model/loader/Chromium QA. Does not deploy or access real users.

Run: python tests/run-lesson-material-qa.py
Firestore security tests are a separate real-emulator gate; see docs/stage-8a/SECURITY.md.
"""
from pathlib import Path
import json
import os
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
FILES = ['lesson-material-model.test.cjs', 'lesson-material-loader.test.cjs',
         'lesson-material-security-contract.test.cjs',
         'lesson-material-browser.test.cjs', 'lesson-experience-model.test.cjs',
         'lesson-experience-browser.test.cjs', 'grade6-q1-content.test.cjs',
         'grade6-q1-content-browser.test.cjs', 'grade6-q1-lessons-6-10.test.cjs',
         'grade6-q1-lessons-6-10-browser.test.cjs']
logs = Path(os.environ.get('LESSON_MATERIAL_QA_LOG_DIR', '/tmp/iustaz-lesson-material-qa'))
logs.mkdir(parents=True, exist_ok=True)
results = []
for name in FILES:
    print('Тексеру:', name, flush=True)
    log = logs / (name + '.log')
    with log.open('w') as stream:
        run = subprocess.run(['node', str(ROOT / 'tests' / name)], cwd=ROOT,
                             stdout=stream, stderr=subprocess.STDOUT)
    output = log.read_text()
    counts = {key: int(value) for key, value in re.findall(
        r'(?:ℹ|#) (tests|pass|fail|cancelled|skipped|todo) (\d+)', output)}
    valid = (run.returncode == 0 and counts.get('tests', 0) > 0
             and counts.get('pass') == counts.get('tests')
             and all(counts.get(key) == 0 for key in ['fail', 'cancelled', 'skipped', 'todo']))
    results.append({'file': name, 'exitCode': run.returncode, 'valid': valid, **counts})
    (logs / 'summary.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print('\n'.join(output.splitlines()[-12:] if valid else output.splitlines()[-90:]), flush=True)
    if not valid:
        raise SystemExit(1)
print('Сәтті тексерулер:', sum(item['pass'] for item in results), flush=True)
