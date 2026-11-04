/* Versioned, DOM-independent lesson model. Local drafts are not server grades. */
(function (root) {
  "use strict";
  const kinds = [
    "organize",
    "review",
    "explain",
    "pair",
    "group",
    "individual",
    "reflection",
    "homework",
  ];
  const titles = [
    "Ұйымдастыру кезеңі",
    "Өткен тақырыпты қайталау",
    "Жаңа тақырыпты түсіндіру",
    "Жұптық жұмыс",
    "Топтық жұмыс",
    "Жеке жұмыс",
    "Қорытынды және рефлексия",
    "Үй тапсырмасын түсіндіру",
  ];
  const types = {
    short: "Қысқа жауап",
    solution: "Толық шешім",
    choice: "Көп таңдаулы сұрақ",
    match: "Сәйкестендіру",
    error: "Қатені табу",
    logic: "Логикалық есеп",
    geometry: "Геометриялық тапсырма",
  };
  const blockTypes = {
    text: "Мәтін",
    heading: "Тақырыпша",
    formula: "LaTeX формуласы",
    example: "Шешілген мысал",
    table: "Кесте",
    image: "Сурет",
    note: "Ескерту",
    mistake: "Жиі кездесетін қате",
    rule: "Қорытынды ереже",
  };
  const metaKeys = [
    "grade",
    "subject",
    "subjectId",
    "quarter",
    "section",
    "topicId",
    "number",
    "objective",
    "goal",
    "criteria",
    "values",
    "connections",
    "resources",
    "previous",
  ];
  const id = () =>
    root.crypto?.randomUUID?.() ||
    "lesson-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const stage = (title = "Жаңа кезең", kind = "explain", minutes = 0) => ({
    id: id(),
    title,
    kind,
    minutes,
    goal: "",
    instructions: "",
    teacher: "",
    pupil: "",
    groupCount: 2,
    groupMode: "same",
    groups: ["", "", "", "", ""],
    tasks: [],
  });
  function create(ownerId) {
    const now = new Date().toISOString();
    return {
      schemaVersion: 2,
      id: id(),
      ownerId,
      title: "Жаңа сабақ",
      duration: 45,
      meta: Object.fromEntries(metaKeys.map((k) => [k, ""])),
      stages: titles.map((t, i) =>
        stage(t, kinds[i], [3, 5, 10, 7, 8, 7, 3, 2][i]),
      ),
      blocks: [],
      games: [],
      homework: [],
      reflection: {
        method: "Бағдаршам",
        questions: "Бүгін не үйрендің? Қай тұс қиын болды?",
      },
      teacherNotes: "",
      reviewed: false,
      createdAt: now,
      updatedAt: now,
    };
  }
  const task = () => ({
    id: id(),
    prompt: "",
    answer: "",
    solution: "",
    level: "unclassified",
    type: "short",
    topic: "",
    objective: "",
    source: "Мұғалім енгізген",
    criteria: "",
    instruction: "",
    descriptors: [],
    optional: false,
    group: 0,
  });
  function check(x, owner) {
    const fail = () => {
      throw Error("Сабақ деректерінің пішімі жарамсыз.");
    };
    let nodes = 0;
    function walk(v, d = 0) {
      if (++nodes > 30000 || d > 15) fail();
      if (v === null || ["string", "boolean"].includes(typeof v)) {
        if (typeof v === "string" && v.length > 50000) fail();
        return;
      }
      if (typeof v === "number") {
        if (!Number.isFinite(v)) fail();
        return;
      }
      if (!v || typeof v !== "object") fail();
      if (Array.isArray(v) && v.length > 300) fail();
      for (const [k, a] of Object.entries(v)) {
        if (["__proto__", "prototype", "constructor"].includes(k)) fail();
        walk(a, d + 1);
      }
    }
    walk(x);
    const str = (v) => typeof v === "string",
      num = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi,
      arr = (v, n) => Array.isArray(v) && v.length <= n;
    if (
      !x ||
      x.schemaVersion !== 2 ||
      !str(x.id) ||
      !x.id ||
      x.ownerId !== owner ||
      !str(x.ownerId) ||
      !str(x.title) ||
      ![40, 45, 80].includes(x.duration) ||
      !x.meta ||
      !metaKeys.every((k) => str(x.meta[k])) ||
      !arr(x.stages, 30) ||
      !x.stages.length ||
      !arr(x.blocks, 100) ||
      !arr(x.games, 20) ||
      !arr(x.homework, 200) ||
      typeof x.reviewed !== "boolean" ||
      !str(x.createdAt) ||
      !str(x.updatedAt) ||
      !str(x.teacherNotes) ||
      !x.reflection ||
      !str(x.reflection.method) ||
      !str(x.reflection.questions)
    )
      fail();
    const ids = new Set();
    const unique = (v) => {
      if (!str(v) || !v || ids.has(v)) fail();
      ids.add(v);
    };
    unique(x.id);
    function taskCheck(t) {
      unique(t.id);
      if (
        ![
          "prompt",
          "answer",
          "solution",
          "topic",
          "objective",
          "source",
          "criteria",
          "instruction",
        ].every((k) => str(t[k])) ||
        !["A", "B", "C", "unclassified"].includes(t.level) ||
        !Object.hasOwn(types, t.type) ||
        typeof t.optional !== "boolean" ||
        !num(t.group, 0, 5) ||
        !arr(t.descriptors, 30)
      )
        fail();
      for (const d of t.descriptors)
        if (!d || !str(d.text) || !num(d.points, 0, 100)) fail();
    }
    for (const s of x.stages) {
      unique(s.id);
      if (
        !["title", "goal", "instructions", "teacher", "pupil"].every((k) =>
          str(s[k]),
        ) ||
        !kinds.includes(s.kind) ||
        !num(s.minutes, 0, 180) ||
        !num(s.groupCount, 2, 5) ||
        !["same", "different"].includes(s.groupMode) ||
        !arr(s.groups, 5) ||
        s.groups.length !== 5 ||
        !s.groups.every(str) ||
        !arr(s.tasks, 200)
      )
        fail();
      s.tasks.forEach(taskCheck);
    }
    x.homework.forEach(taskCheck);
    for (const b of x.blocks) {
      unique(b.id);
      if (!Object.hasOwn(blockTypes, b.type) || !str(b.body) || !str(b.aux))
        fail();
    }
    for (const g of x.games) {
      unique(g.id);
      if (
        ![
          "gameId",
          "title",
          "grade",
          "topic",
          "purpose",
          "rule",
          "format",
          "topicKey",
        ].every((k) => str(g[k])) ||
        !num(g.minutes, 1, 80) ||
        typeof g.supported !== "boolean"
      )
        fail();
    }
    if (JSON.stringify(x).length > 2000000) fail();
    return clone(x);
  }
  const tasks = (x) => x.stages.flatMap((s) => s.tasks).concat(x.homework);
  const total = (x) =>
    x.stages.reduce((n, s) => n + s.minutes, 0) +
    x.games.reduce((n, g) => n + g.minutes, 0);
  const points = (x) =>
    tasks(x).reduce(
      (n, t) => n + t.descriptors.reduce((a, d) => a + d.points, 0),
      0,
    );
  function warnings(x) {
    const a = [];
    for (const [k, label] of [
      ["grade", "Сынып"],
      ["subject", "Пән"],
      ["objective", "Оқу мақсаты"],
      ["goal", "Сабақ мақсаты"],
    ])
      if (!x.meta[k].trim()) a.push(label + " толтырылмаған.");
    if (!x.title.trim() || x.title === "Жаңа сабақ")
      a.push("Сабақ тақырыбын енгізіңіз.");
    if (total(x) !== x.duration)
      a.push(
        "Жоспар уақыты " +
          total(x) +
          " минут; сабақ ұзақтығы " +
          x.duration +
          " минут.",
      );
    if (
      tasks(x).some(
        (t) =>
          !t.prompt.trim() ||
          !t.answer.trim() ||
          !t.solution.trim() ||
          !t.descriptors.length,
      )
    )
      a.push(
        "Кей тапсырманың шарты, жауабы, шешімі немесе дескрипторы толық емес.",
      );
    if (x.games.some((g) => !g.supported))
      a.push("Таңдалған ойын тақырыбына тапсырма қолдауы расталмаған.");
    if (x.blocks.some((b) => !b.body.trim())) a.push("Бос мазмұн блогы бар.");
    if (!x.reviewed) a.push("Мазмұнды мұғалім әлі тексермеген.");
    return a;
  }
  function balance(x) {
    const available = x.duration - x.games.reduce((n, g) => n + g.minutes, 0);
    if (available < x.stages.length)
      throw Error("Кезеңдерге уақыт жетпейді. Ойын уақытын азайтыңыз.");
    const old = x.stages.reduce((n, s) => n + s.minutes, 0);
    let left = available;
    const weights = x.stages.map((s) => (old ? s.minutes : 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    x.stages.forEach((s, i) => {
      s.minutes =
        i === x.stages.length - 1
          ? left
          : Math.floor((available * weights[i]) / sum);
      left -= s.minutes;
    });
    return x;
  }
  function copy(x) {
    const y = clone(x);
    y.id = id();
    y.title += " — көшірме";
    y.createdAt = y.updatedAt = new Date().toISOString();
    y.reviewed = false;
    return y;
  }
  const api = {
    create,
    stage,
    task,
    id,
    clone,
    check,
    tasks,
    total,
    points,
    warnings,
    balance,
    copy,
    kinds,
    titles,
    types,
    blockTypes,
    metaKeys,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.LessonModel = api;
})(typeof window !== "undefined" ? window : globalThis);
