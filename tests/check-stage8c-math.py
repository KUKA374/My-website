"""Independent exact-arithmetic/content audit. No application evaluator or floats are used."""
from fractions import Fraction
from pathlib import Path
import ast
import json
import re

ROOT = Path(__file__).resolve().parent.parent

def arithmetic(source):
    source = source.strip().replace('−', '-').replace('×', '*').replace('·', '*').replace('÷', '/')
    source = source.replace(',', '.')
    source = re.sub(r'(?<![\d.])(\d+)\s+(\d+)/(\d+)', r'(\1+\2/\3)', source)
    # Protect written fraction operands before treating a colon as division.
    if ':' in source:
        source = re.sub(r'(\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)', r'(\1/\2)', source)
    source = source.replace(':', '/')
    node = ast.parse(source, mode='eval').body
    def visit(n):
        if isinstance(n, ast.Constant) and type(n.value) in [int, float]:
            return Fraction(str(n.value))
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            return visit(n.operand) * (-1 if isinstance(n.op, ast.USub) else 1)
        if isinstance(n, ast.BinOp):
            a,b=visit(n.left),visit(n.right)
            if isinstance(n.op, ast.Add): return a+b
            if isinstance(n.op, ast.Sub): return a-b
            if isinstance(n.op, ast.Mult): return a*b
            if isinstance(n.op, ast.Div): return a/b
        raise ValueError('Unsupported arithmetic syntax: '+source)
    return visit(node)

def display(value, form='decimal'):
    if value.denominator == 1: return str(value.numerator)
    if form == 'fraction': return f'{value.numerator}/{value.denominator}'
    sign='-' if value<0 else ''; value=abs(value); whole,rem=divmod(value.numerator,value.denominator); digits=[]
    for _ in range(14):
        if rem == 0: break
        digit,rem=divmod(rem*10,value.denominator);digits.append(str(digit))
    if rem: raise ValueError('A rounded answer was not specified')
    return sign+str(whole)+','+''.join(digits)

def result(part):
    if part['op']=='number': return display(arithmetic(part['expression']),part.get('format','decimal'))
    if part['op']=='ratio':
        f=arithmetic(part['a'])/arithmetic(part['b']);return f'{f.numerator}:{f.denominator}'
    if part['op']=='set':
        values=[set(s) for s in part['sets']];out=values[0]
        for s in values[1:]:out=out & s if part['action']=='intersection' else out | s
        return '{'+','.join(map(str,sorted(out)))+'}' if out else '∅'
    raise ValueError('Unknown proof type')

def equality(source):
    sides=source.strip(' .,\n').split('=')
    assert len(sides)>1, source
    values=[arithmetic(s.strip()) for s in sides]
    assert all(x==values[0] for x in values), 'False equation: '+source
    return len(sides)-1

def equations_in_text(text):
    # A prose label such as "бөлім — 4: ..." is not a division operator.
    chunks=re.split(r';|\n|(?<!\s):\s+|\.(?=\s|$)',text)
    equations=[]
    for chunk in chunks:
        for m in re.finditer(r'[\d(][\d\s.,()+\-−×*/÷:]*(?:=[\d\s.,()+\-−×*/÷:]+)+',chunk):
            s=m.group().strip(' .,\n')
            if '=' in s:equations.append(s)
    return equations

def latex_numeric(source):
    s=source.replace('{,}', '.').replace('\\cdot','*').replace('\\times','*').replace('\\div','/')
    s=s.replace('\\left','').replace('\\right','')
    # TeX accepts both \frac12 and \frac{1}{2}; normalize in the checker only.
    s=re.sub(r'\\frac(?:\{([^{}]+)\}|(\d))(?:\{([^{}]+)\}|(\d))',lambda m:'\\frac{'+(m.group(1) or m.group(2))+'}{'+(m.group(3) or m.group(4))+'}',s)
    s=re.sub(r'(\d+)\\frac\{([^{}]+)\}\{([^{}]+)\}',r'(\1+((\2)/(\3)))',s)
    while re.search(r'\\frac\{([^{}]+)\}\{([^{}]+)\}',s):
        s=re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}',r'((\1)/(\2))',s)
    s=re.sub(r'(\d+(?:\.\d+)?)\\%',r'(\1/100)',s)
    if '=' in s and re.fullmatch(r'[\d\s.()+\-*/:=]+',s): return s
    return None

def audit():
    fixture=json.loads((ROOT/'tests/fixtures/stage8c-math-checks.json').read_text())
    reports=[]; totals={'answers':0,'solutionEqualities':0,'theoryEqualities':0,'slideEqualities':0,'numericFormulas':0}
    for proof in fixture['proofs']:
        number=proof['lessonId'].split(':')[-1]
        d=json.loads((ROOT/f'lesson-materials/content/6/math/q1/{number}.json').read_text())
        items=d['examples'] if proof['kind']=='example' else d['pairWork']+[g['task'] for g in d['groupWork']]+sum(d['individualWork'].values(),[])+d['homework']
        item=next(t for t in items if t['id']==proof['id'])
        r={'lessonId':proof['lessonId'],'kind':proof['kind'],'id':proof['id'],'valid':False}
        try:
            results=[result(p) for p in proof['parts']]
            expected=re.sub(r'\{(\d+)\}',lambda m:results[int(m.group(1))],proof['template'])
            assert item['answer']==expected, f"answer {item['answer']!r} != independently computed {expected!r}"
            text=' '.join(item['steps']) if proof['kind']=='example' else item['solution']
            for eq in proof['equations']:
                assert eq in text, 'Stale equation fixture: '+eq
                equality(eq)
            equations=equations_in_text(text)
            count=sum(equality(e) for e in equations)
            totals['solutionEqualities']+=count; totals['answers']+=1
            r.update(valid=True,answer=expected,equalities=count)
        except Exception as exc:r['error']=str(exc)
        reports.append(r)
    theory=[]
    for number in range(1,6):
        d=json.loads((ROOT/f'lesson-materials/content/6/math/q1/{number}.json').read_text())
        r={'lessonId':d['lessonId'],'valid':False}
        try:
            count=0
            for block in d['theory']:
                text=re.sub(r'(\d+(?:,\d+)?)%',r'(\1/100)',block['text'])
                count+=sum(equality(eq) for eq in equations_in_text(text))
            totals['theoryEqualities']+=count;r.update(valid=True,equalities=count)
        except Exception as exc:r['error']=str(exc)
        theory.append(r)
    presentations=[]
    for name in ['fractions-review-v1','fractions-operations-v2','decimal-operations-v1','sets-union-intersection-v1','percent-charts-v1','ratios-percent-v1']:
        d=json.loads((ROOT/f'lesson-materials/presentations/{name}.json').read_text())
        for slide in d['slides']:
            r={'presentation':name,'slide':slide['id'],'valid':False}
            try:
                eqs=equations_in_text(slide['text']+' '+' '.join(slide.get('steps',[])))
                totals['slideEqualities']+=sum(equality(e) for e in eqs)
                for fragment in re.split(r',?\\quad',slide['formula']):
                    f=latex_numeric(fragment)
                    if f:totals['numericFormulas']+=equality(f)
                r['valid']=True
            except Exception as exc:r['error']=str(exc)
            presentations.append(r)
    return {'proofs':reports,'theory':theory,'slides':presentations,'totals':totals,'valid':all(r['valid'] for r in reports+theory+presentations)}

if __name__=='__main__':
    report=audit();print(json.dumps(report,ensure_ascii=False,indent=2))
    raise SystemExit(0 if report['valid'] else 1)
