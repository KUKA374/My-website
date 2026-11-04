"""Run the complete game QA suite sequentially, retaining each Node test log.

Requires Python 3, Node, Playwright and Chromium. No production services are used.
Usage: python tests/run-games-qa.py [one-or-more test filenames]
GAME_QA_LOG_DIR optionally selects the artifact directory outside the repository.
"""
from pathlib import Path
import json
import os
import re
import subprocess
import sys

REPO = Path(__file__).resolve().parent.parent
FILES = [
    'games-runtime.test.cjs', 'games-learning.test.cjs',
    'games-regression.test.cjs', 'grade6-first-three.test.js',
    'games-mechanics-models.test.cjs', 'games-logic-models.test.cjs',
    'games-racing-models.test.cjs', 'games-timed-models.test.cjs',
    'games-final-models.test.cjs', 'games-progress.test.cjs', 'auth-qa.test.cjs',
    'games-design-browser.test.cjs', 'games-browser.test.cjs',
    'games-shared-browser.test.cjs', 'games-mechanics-browser.test.cjs',
    'games-logic-browser.test.cjs', 'games-racing-browser.test.cjs',
    'games-timed-browser.test.cjs', 'games-final-browser.test.cjs',
    'games-qa-browser.test.cjs',
]


def main():
    selected = sys.argv[1:] or FILES
    if any(name not in FILES for name in selected):
        raise SystemExit('Тест файлы тізімде жоқ.')
    output = Path(os.environ.get('GAME_QA_LOG_DIR', '/tmp/math-ai-game-qa'))
    output.mkdir(parents=True, exist_ok=True)
    results = []
    env = os.environ.copy()
    env.pop('DESIGN_CAPTURE_ONLY', None)  # Never silently skip the full suite.
    for name in selected:
        print('Тексеру:', name, flush=True)
        log = output / (name + '.log')
        with log.open('w') as stream:
            run = subprocess.run(['node', str(REPO / 'tests' / name)], cwd=REPO,
                                 env=env, stdout=stream, stderr=subprocess.STDOUT)
        body = log.read_text()
        counts = {key: int(value) for key, value in re.findall(
            r'(?:ℹ|#) (tests|pass|fail|cancelled|skipped|todo) (\d+)', body)}
        valid = (run.returncode == 0 and counts.get('tests', 0) > 0
                 and counts.get('pass') == counts.get('tests')
                 and all(counts.get(key) == 0 for key in ['fail', 'cancelled', 'skipped', 'todo']))
        results.append({'file': name, 'exitCode': run.returncode, 'valid': valid, **counts})
        (output / 'summary.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
        print('\n'.join(body.splitlines()[-14:] if valid else body.splitlines()[-100:]), flush=True)
        if not valid:
            raise SystemExit(1)
    print('Сәтті тексерулер:', sum(row['pass'] for row in results), flush=True)


if __name__ == '__main__':
    main()
