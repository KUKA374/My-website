"""Stage 7 UI QA. Requires Playwright, Chromium, pdftotext and axe-core 4.10.3.
IUSTAZ_AXE_PATH must point to axe.min.js. No production Firebase writes.
"""
import os, json, re, subprocess, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
out = Path(os.environ.get('IUSTAZ_QA_LOG_DIR','/workspace/audit-math-ai/stage7-iustaz/F-ui'))
out.mkdir(parents=True, exist_ok=True)
results = []
files = ['iustaz-contract.test.cjs','iustaz-brand-browser.test.cjs',
         'iustaz-shell-browser.test.cjs','iustaz-constructor-browser.test.cjs',
         'iustaz-catalog-browser.test.cjs','iustaz-final-browser.test.cjs',
         'iustaz-visual-browser.test.cjs','iustaz-accessibility-browser.test.cjs']
selected = sys.argv[1:] or files
if any(f not in files for f in selected): raise SystemExit('Тест атауы тізімде жоқ.')
for file in selected:
    print('Тексеру:',file,flush=True)
    log = out / (file + '.log')
    with log.open('w') as stream:
        run = subprocess.run(['node',str(root/'tests'/file)],cwd=root,stdout=stream,stderr=subprocess.STDOUT)
    body = log.read_text()
    counts = {k:int(v) for k,v in re.findall(r'(?:ℹ|#) (tests|pass|fail|cancelled|skipped|todo) (\d+)',body)}
    valid = run.returncode == 0 and counts.get('tests',0)>0 and counts.get('pass')==counts.get('tests') and all(counts.get(k)==0 for k in ['fail','cancelled','skipped','todo'])
    results.append({'file':file,'exitCode':run.returncode,'valid':valid,**counts})
    (out/'summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print('\n'.join(body.splitlines()[-12:] if valid else body.splitlines()[-100:]),flush=True)
    if not valid: raise SystemExit(1)
print('iUSTAZ тексерулері:',sum(r['pass'] for r in results),flush=True)
