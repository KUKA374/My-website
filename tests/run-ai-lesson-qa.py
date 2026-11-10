"""AI prototype regression only; fixture/mocks, no Gemini or production Firebase calls."""
from pathlib import Path
import json
import os
import re
import subprocess
ROOT=Path(__file__).resolve().parent.parent
files=['ai-lessons.test.cjs','ai-lessons-browser.test.cjs','iustaz-contract.test.cjs',
       'iustaz-catalog-browser.test.cjs','lesson-material-model.test.cjs',
       'lesson-material-loader.test.cjs','lesson-experience-model.test.cjs',
       'lesson-material-security-contract.test.cjs']
logs=Path(os.environ.get('AI_LESSON_QA_LOG_DIR','/tmp/iustaz-ai-qa'));logs.mkdir(parents=True,exist_ok=True)
results=[]
for name in files:
 print('Тексеру:',name,flush=True)
 p=logs/(name+'.log')
 with p.open('w')as stream:run=subprocess.run(['node',str(ROOT/'tests'/name)],cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT)
 text=p.read_text();counts={k:int(v)for k,v in re.findall(r'(?:ℹ|#) (tests|pass|fail|cancelled|skipped|todo) (\d+)',text)}
 valid=run.returncode==0 and counts.get('tests',0)>0 and counts.get('tests')==counts.get('pass') and all(counts.get(k)==0 for k in ['fail','cancelled','skipped','todo'])
 results.append({'file':name,'valid':valid,'exitCode':run.returncode,**counts});(logs/'summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print('\n'.join(text.splitlines()[-12:]if valid else text.splitlines()[-90:]),flush=True)
 if not valid:raise SystemExit(1)
print('Сәтті тексерулер:',sum(r['pass']for r in results),flush=True)
