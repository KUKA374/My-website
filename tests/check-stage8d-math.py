"""Stage 8D independent rational arithmetic, affine solving and content audit.
No site solver, floating-point comparisons, eval or third-party algebra library.
"""
import sys
sys.dont_write_bytecode = True
import ast
import importlib.util
import json
from pathlib import Path
import re
from fractions import Fraction

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('stage8c_math', ROOT/'tests/check-stage8c-math.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
DECKS = ['inverse-ratios-v1', 'proportion-definition-v1', 'proportion-properties-v1', 'direct-proportionality-v1']

def affine(source):
    """Return exact coefficient/constant; reject nonlinear or executable syntax."""
    node = ast.parse(source.replace(',', '.').replace('−', '-').replace('×', '*'), mode='eval').body
    def walk(n):
        if isinstance(n, ast.Name) and n.id == 'x': return Fraction(1), Fraction(0)
        if isinstance(n, ast.Constant) and type(n.value) in (int, float): return Fraction(0), Fraction(str(n.value))
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            a,b=walk(n.operand);s=-1 if isinstance(n.op, ast.USub) else 1;return a*s,b*s
        if isinstance(n, ast.BinOp):
            a,b=walk(n.left);c,d=walk(n.right)
            if isinstance(n.op, ast.Add): return a+c,b+d
            if isinstance(n.op, ast.Sub): return a-c,b-d
            if isinstance(n.op, ast.Mult) and not a*c: return a*d+c*b,b*d
            if isinstance(n.op, ast.Div) and c==0 and d!=0: return a/d,b/d
        raise ValueError('Not a supported affine expression: '+source)
    return walk(node)

def solve_proportion(terms):
    forms=[affine(s) for s in terms]
    positions=[i for i,(a,b) in enumerate(forms) if a]
    assert len(positions)==1, 'Exactly one unknown member is required'
    pos=positions[0]; vals=[v[1] for v in forms];a,b,c,d=vals
    target=[lambda:b*c/d, lambda:a*d/c, lambda:a*d/b, lambda:b*c/a][pos]()
    coef,constant=forms[pos];x=(target-constant)/coef
    vals[pos]=coef*x+constant;a,b,c,d=vals
    assert b!=0 and d!=0, 'Zero denominator in original proportion'
    assert a/b==c/d, 'Root fails original proportion'
    return x

def value(part):
    op=part['op']
    if op=='proportion': return solve_proportion(part['terms'])
    if op=='linear-equation':
        a,b=affine(part['left']);c,d=affine(part['right']);assert a!=c
        x=(d-b)/(a-c);assert a*x+b==c*x+d;return x
    if op=='coefficient':
        a,b=affine(part['rule']);assert a!=0 and b==0;return a
    if op=='number':return base.arithmetic(part['expression'])
    raise ValueError(op)

def result(part):
    op=part['op']
    if op in ['number','proportion','linear-equation','coefficient']:
        return base.display(value(part),part.get('format','decimal'))
    if op=='inverse':
        a,b=base.arithmetic(part['a']),base.arithmetic(part['b']);assert a and b
        ratio=b/a;assert (a/b)*ratio==1
        return f'{ratio.numerator}:{ratio.denominator}'
    if op=='valid-proportion':
        a,b,c,d=[base.arithmetic(s) for s in part['terms']]
        return 'Пропорция' if b and d and a/b==c/d else 'Пропорция емес'
    if op=='scaled-ratio':
        a,b,k=[base.arithmetic(part[s]) for s in ['a','b','factor']];assert b and k
        return f'{base.display(a*k)}:{base.display(b*k)}'
    if op=='direct':
        a,b=affine(part['rule'])
        return 'Тура пропорционал' if a!=0 and b==0 else 'Тура пропорционал емес'
    return base.result({k: str(v) if k in ['a', 'b'] else v for k, v in part.items()})

def symbolic_equations(text, root):
    """Validate every explicit numeric/x equality containing x, using the solved root.
    Implicit typesetting y=kx is theory, not a solved numeric equation.
    """
    count=0
    for chunk in re.split(r';|\n|(?<!\s):\s+|\.(?=\s|$)', text):
        for match in re.finditer(r'[\dx(][\dx\s.,()+\-−×*/÷:]*(?:=[\dx\s.,()+\-−×*/÷:]+)+', chunk):
            eq=match.group().strip(' .,\n')
            if 'x' not in eq:continue
            replacement='('+str(root.numerator)+'/'+str(root.denominator)+')'
            count+=base.equality(eq.replace('x',replacement))
    return count

def numeric_text(text):
    count=0
    # Retain the complete symbolic expression; never treat its numeric suffix as an identity.
    for chunk in re.split(r';|\n|(?<!\s):\s+|\.(?=\s|$)',text):
        for match in re.finditer(r'[a-z\d(][a-z\d\s.,()+\-−×*/÷:]*(?:=[a-z\d\s.,()+\-−×*/÷:]+)+',chunk):
            eq=match.group().strip(' .,\n')
            if not re.search('[a-z]',eq):count+=base.equality(eq)
    return count

def audit():
    fixture=json.loads((ROOT/'tests/fixtures/stage8d-math-checks.json').read_text())
    proofs=[];theory=[];slides=[]
    totals={'answers':0,'solutionEqualities':0,'symbolicEqualities':0,'theoryEqualities':0,'slideEqualities':0,'numericFormulas':0}
    for p in fixture['proofs']:
        n=p['lessonId'].split(':')[-1];d=json.loads((ROOT/f'lesson-materials/content/6/math/q1/{n}.json').read_text())
        items=d['examples'] if p['kind']=='example' else d['pairWork']+[g['task'] for g in d['groupWork']]+sum(d['individualWork'].values(),[])+d['homework']
        item=next(i for i in items if i['id']==p['id']);r={k:p[k] for k in ['lessonId','kind','id']};r['valid']=False
        try:
            calculated=[result(part) for part in p['parts']]
            expected=re.sub(r'\{(\d+)\}',lambda m:calculated[int(m.group(1))],p['template'])
            assert item['answer']==expected, f"{item['answer']!r} != independently computed {expected!r}"
            text=' '.join(item['steps']) if p['kind']=='example' else item['solution']
            count=numeric_text(text);symbolic=0
            roots=[value(part) for part in p['parts'] if part['op'] in ['proportion','linear-equation']]
            if roots:symbolic=symbolic_equations(text,roots[0])
            totals['answers']+=1;totals['solutionEqualities']+=count;totals['symbolicEqualities']+=symbolic
            r.update(valid=True,answer=expected,equalities=count,symbolicEqualities=symbolic)
        except Exception as exc:r['error']=str(exc)
        proofs.append(r)
    for n in range(6,11):
        d=json.loads((ROOT/f'lesson-materials/content/6/math/q1/{n}.json').read_text());r={'lessonId':d['lessonId'],'valid':False}
        try:
            count=sum(numeric_text(b['text']) for b in d['theory']);totals['theoryEqualities']+=count;r.update(valid=True,equalities=count)
        except Exception as exc:r['error']=str(exc)
        theory.append(r)
    for name in DECKS:
        d=json.loads((ROOT/f'lesson-materials/presentations/{name}.json').read_text())
        for s in d['slides']:
            r={'presentation':name,'slide':s['id'],'valid':False}
            try:
                count=numeric_text(s['text']+' '+' '.join(s.get('steps',[])))
                # Solve every displayed numeric proportion with x independently, then check its steps.
                text=s['formula'].replace('{,}', '.').replace('\\,','')
                if re.fullmatch(r'[\dx.()+\-: ]+=[\dx.()+\-: ]+',text) and 'x' in text:
                    left,right=text.split('=');a,b=left.split(':');c,e=right.split(':')
                    root=solve_proportion([a,b,c,e]);totals['symbolicEqualities']+=symbolic_equations(' '.join(s['steps']),root)
                for fragment in re.split(r',?\\quad',s['formula']):
                    f=base.latex_numeric(fragment)
                    if f:totals['numericFormulas']+=base.equality(f)
                totals['slideEqualities']+=count;r.update(valid=True,equalities=count)
            except Exception as exc:r['error']=str(exc)
            slides.append(r)
    return {'proofs':proofs,'theory':theory,'slides':slides,'totals':totals,'valid':all(r['valid'] for r in proofs+theory+slides)}

if __name__=='__main__':
    report=audit();print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(0 if report['valid'] else 1)
