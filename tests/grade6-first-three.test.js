// Run with: node --test tests/grade6-first-three.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
function load(source = read('lesson-content-6.js')) {
  const context = { console: { log() {} } };
  context.window = context;
  vm.createContext(context);
  for (const file of ['ktp-6-q1.js', 'ktp-6-q2.js', 'ktp-6-q3.js', 'ktp-6-q4-topics.js']) vm.runInContext(read(file), context);
  vm.runInContext(source.replace('  build();', '  window.authoredData = firstThree;\n  build();'), context);
  return context;
}
const context = load();
const ids = ['6_math_1_1', '6_math_1_2', '6_math_1_3'];
const normalize = value => JSON.parse(JSON.stringify(value));

test('Only the first three KTP identifiers receive authored content; every required section is complete', () => {
  assert.deepEqual(Object.keys(context.authoredData), ids);
  assert.equal(Object.keys(context.lessonContent).length, 170);
  ids.forEach((id, index) => {
    const data = context.authoredData[id], material = context.lessonContent[id];
    const ktp = context.ktpD['6_math_q1'][index];
    assert.equal(material.title, ktp.title);
    assert.equal(material.objective, ktp.objective);
    for (const field of ['theory', 'lessonPlan', 'pairWork', 'groupWork', 'individualWork', 'game', 'assessment', 'homework']) assert.ok(material[field]?.length, id + ': ' + field);
    assert.ok(data.examples.length >= 3);
    assert.equal(data.pair.length, 3);
    assert.equal(data.group.length, 2);
    assert.deepEqual(normalize(data.levels.map(level => level.length)), [3, 3, 3]);
    assert.equal(data.home.length, 5);
    assert.ok(data.questions.length >= 4);
    assert.equal(data.plan.reduce((sum, row) => sum + parseInt(row[1]), 0), 45);
    data.plan.forEach(row => { assert.ok(row[2]); assert.ok(row[3]); });
    const points = [...data.criteria.join(' ').matchAll(/— (\d+) балл/g)].reduce((sum, match) => sum + Number(match[1]), 0);
    assert.equal(points, 10);
  });
});

// Independent exact fraction arithmetic: avoid rounding hiding an incorrect key.
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function fraction(n, d = 1) { const g = gcd(Math.abs(n), d); return [n/g, d/g]; }
function value(text) {
  text = text.replace(/,/g, '.');
  if (/^\d+ \d+\/\d+$/.test(text)) {
    const [whole, n, d] = text.split(/[ /]/).map(Number); return fraction(whole*d+n, d);
  }
  if (text.includes('/')) { const [n,d] = text.split('/').map(Number); return fraction(n,d); }
  const digits = (text.split('.')[1] || '').length;
  return fraction(Math.round(Number(text) * 10**digits), 10**digits);
}
function operation(a, op, b) {
  const [n,d] = a, [m,e] = b;
  if (op === '+') return fraction(n*e+m*d, d*e);
  if (op === '-') return fraction(n*e-m*d, d*e);
  if (op === '*') return fraction(n*m, d*e);
  if (op === ':') return fraction(n*e, d*m);
  throw Error(op);
}
function calc(expression) {
  const tokens = expression.split(' ');
  let result = value(tokens.shift());
  while (tokens.length) { const op = tokens.shift(); result = operation(result, op, value(tokens.shift())); }
  return result;
}
function answerNumber(answer) {
  const match = answer.match(/^\d+(?: \d+\/\d+|\/\d+|[,.]\d+)?/);
  assert.ok(match, answer);
  return value(match[0]);
}
const numericFixtures = {
  '6_math_1_1': {
    pair:['1/2 + 1/3','7/8 - 1/6','9/4 : 3/8'],
    levels:[['1/3 + 1/6','3/4 - 1/2','2/3 : 1/3'],['5/8 + 7/12','7/6 - 3/4','8/5 : 4/15'],['19/12 : 1/6','7/2 : 7/12']],
    questions:['1/4 + 1/6','5/6 - 1/3','3/5 : 1/10','5/4 : 5/8'],
    home:['3/5 + 1/4','7/9 - 1/6','5/8 : 15/16','7/3 : 7/9','3/2 - 2/5 + 3/4']
  },
  '6_math_1_2': {
    pair:['3.6 * 4','4.8 : 6','2.52 : 0.12'],
    levels:[['1.2 * 4','7.5 : 5','0.6 * 0.3'],['2.35 * 1.2','9.36 : 4','5.04 : 0.6'],['3.6 : 0.4 * 0.25','1250 * 2.4']],
    questions:['0.7 * 0.8','3.6 : 0.6','1.4 * 3','0.81 : 9'],
    home:['2.6 * 1.5','12.6 : 3','7.68 : 0.8','0.84 : 0.07','640 * 1.5']
  }
};
test('Fraction and decimal pair, individual, game and homework answer keys are mathematically correct', () => {
  for (const [id, fixture] of Object.entries(numericFixtures)) {
    const data = context.authoredData[id];
    for (const section of ['pair','questions','home']) fixture[section].forEach((expression,i) => assert.deepEqual(answerNumber(data[section][i][1]), calc(expression), `${id} ${section} ${i+1}`));
    fixture.levels.forEach((level,j) => level.forEach((expression,i) => assert.deepEqual(answerNumber(data.levels[j][i][1]), calc(expression), `${id} level ${j} ${i}`)));
  }
  // Group answers include the working, so verify the final quantities explicitly.
  assert.deepEqual(calc('3/4 + 2/3 - 5/6'), value('7/12'));
  assert.deepEqual(calc('5/2 : 5/12'), value('6'));
  assert.deepEqual(calc('480 * 1.25 + 350'), value('950'));
  assert.deepEqual(calc('4.5 : 0.3'), value('15'));
});
function setsFrom(text) { return [...text.matchAll(/\{([^}]+)\}|∅/g)].map(m => m[1] ? m[1].split(',').map(s=>s.trim()) : []); }
const sorted = set => [...new Set(set)].sort();
test('Set task answer keys agree with intersection and union, including empty sets and subsets', () => {
  const data = context.authoredData['6_math_1_3'];
  const twoSets = [...data.pair, ...data.levels[1], ...data.home.filter((_,i)=>i!==3)];
  twoSets.forEach(([question, answer]) => {
    const [a,b] = setsFrom(question), [intersection,union] = setsFrom(answer);
    assert.deepEqual(sorted(intersection), sorted(a.filter(x=>b.includes(x))), question);
    assert.deepEqual(sorted(union), sorted([...a,...b]), question);
  });
  const multiples = (limit, n) => Array.from({length:limit},(_,i)=>i+1).filter(x=>x%n===0).map(String);
  for (const [task,limit,n,m] of [[data.levels[2][0],12,2,3],[data.home[3],10,2,5]]) {
    const a=multiples(limit,n), b=multiples(limit,m), [intersection,union]=setsFrom(task[1]);
    assert.deepEqual(sorted(intersection),sorted(a.filter(x=>b.includes(x))));
    assert.deepEqual(sorted(union),sorted([...a,...b]));
  }
  assert.equal(12+10-4,18); assert.equal(24-18,6);
  assert.equal(11+9-5,15); assert.equal(20-15,5);
});

test('Actual lesson page renders all eight sections and teacher/pupil actions; legacy plans still render', () => {
  const html = read('lesson.html');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src='));
  for (const match of scripts) new vm.Script(match[2]);
  for (const [index,id] of ids.entries()) {
    const element = {innerHTML:''};
    const page = load();
    page.URLSearchParams=URLSearchParams;
    page.location={search:`?class=6&subject=math&quarter=1&lesson=${index+1}`};
    page.document={getElementById(){return element;},addEventListener(){}};
    vm.runInContext(read('curriculum-data.js'),page);
    vm.runInContext(scripts.at(-1)[2],page);
    page.render();
    assert.equal((element.innerHTML.match(/<summary>/g)||[]).length,8);
    assert.equal((element.innerHTML.match(/<b>Мұғалім:<\/b>/g)||[]).length,8);
    assert.equal((element.innerHTML.match(/<b>Оқушы:<\/b>/g)||[]).length,8);
    assert.ok(!element.innerHTML.includes('кейін қосылады'));
    if (id === ids[0]) {
      page.lessonContent[id].lessonPlan=[['Ескі кезең','45 минут']];
      page.render();
      assert.ok(element.innerHTML.includes('Ескі кезең'));
      assert.ok(!element.innerHTML.includes('<b>Мұғалім:</b>'));
    }
  }
});
