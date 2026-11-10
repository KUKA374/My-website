"use strict";
const M = require("../../lesson-materials/model.js");
const str = () => ({ type: "STRING" }),
  arr = (items, minItems, maxItems) => ({
    type: "ARRAY",
    items,
    minItems,
    maxItems,
  }),
  obj = (properties) => ({
    type: "OBJECT",
    properties,
    required: Object.keys(properties),
  });
const descriptor = obj({
  text: str(),
  points: { type: "INTEGER", minimum: 1, maximum: 5 },
});
const task = obj({
  id: str(),
  prompt: str(),
  answer: str(),
  solution: str(),
  criteria: str(),
  descriptors: arr(descriptor, 2, 4),
});
const schema = obj({
  theory: arr(
    obj({
      kind: { type: "STRING", enum: ["heading", "text", "formula"] },
      text: str(),
    }),
    8,
    24,
  ),
  examples: arr(
    obj({ id: str(), title: str(), steps: arr(str(), 3, 8), answer: str() }),
    3,
    4,
  ),
  lessonPlan: arr(
    obj({
      title: str(),
      minutes: { type: "INTEGER", minimum: 1, maximum: 45 },
      teacher: str(),
      student: str(),
    }),
    6,
    10,
  ),
  pairWork: arr(task, 3, 3),
  groupWork: arr(obj({ id: str(), title: str(), task }), 4, 4),
  individualWork: obj({
    A: arr(task, 2, 2),
    B: arr(task, 2, 2),
    C: arr(task, 2, 2),
  }),
  assessment: arr(
    obj({ criterion: str(), descriptors: arr(descriptor, 2, 4) }),
    2,
    5,
  ),
  homework: arr(task, 2, 2),
  qmj: obj({
    lessonGoal: str(),
    resources: arr(str(), 2, 8),
    priorKnowledge: str(),
  }),
  slides: arr(
    obj({ title: str(), text: str(), formula: str(), steps: arr(str(), 1, 4) }),
    12,
    12,
  ),
});
function validateSchema(value, s = schema, at = "content") {
  const fail = () => {
    throw Error("AI жауабының құрылымы жарамсыз: " + at);
  };
  if (s.type === "OBJECT") {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).some((k) => !Object.hasOwn(s.properties, k)) ||
      s.required.some((k) => !Object.hasOwn(value, k))
    )
      fail();
    for (const [k, v] of Object.entries(s.properties))
      validateSchema(value[k], v, at + "." + k);
  } else if (s.type === "ARRAY") {
    if (
      !Array.isArray(value) ||
      value.length < s.minItems ||
      value.length > s.maxItems
    )
      fail();
    value.forEach((v, i) => validateSchema(v, s.items, at + "[" + i + "]"));
  } else if (s.type === "INTEGER") {
    if (!Number.isSafeInteger(value) || value < s.minimum || value > s.maximum)
      fail();
  } else if (
    typeof value !== "string" ||
    (!value.trim() && at.split(".").at(-1) !== "formula") ||
    value.length > 12000 ||
    (s.enum && !s.enum.includes(value))
  )
    fail();
}
function validate(raw, catalog) {
  if (Buffer.byteLength(JSON.stringify(raw)) > 384 * 1024)
    throw Error("AI мазмұнының көлемі шектен асты.");
  validateSchema(raw);
  const { slides, ...authored } = raw;
  const material = M.material(
    {
      ...M.empty(catalog.id),
      ...authored,
      presentation: {
        id: "ai-quadratic-draft-v1",
        startSlide: 1,
        endSlide: 12,
      },
    },
    catalog.id,
  );
  if (
    material.theory
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("").length < 600
  )
    throw Error("Теория толық емес.");
  const tasks = [
    ...material.pairWork,
    ...material.groupWork.map((g) => g.task),
    ...Object.values(material.individualWork).flat(),
    ...material.homework,
  ];
  if (
    new Set(tasks.map((t) => t.id)).size !== tasks.length ||
    new Set(tasks.map((t) => t.prompt.trim())).size !== tasks.length
  )
    throw Error("Тапсырма қайталанған.");
  if (
    new Set(material.examples.map((e) => e.id)).size !==
    material.examples.length
  )
    throw Error("Мысал ID қайталанған.");
  const presentation = M.presentation(
    {
      schemaVersion: 1,
      id: material.presentation.id,
      title: catalog.lesson.title,
      slides: slides.map((s, i) => ({
        id: "slide-" + (i + 1),
        ...s,
        diagram: null,
      })),
    },
    material.presentation.id,
  );
  return {
    material,
    presentation,
    review: {
      status: "admin-review-required",
      schema: "passed",
      mathematics: "not-automatically-certified",
      publication: "disabled",
    },
  };
}
function prompt(catalog) {
  return [
    "iUSTAZ платформасына тек қазақ тілінде бір 45 минуттық сабақ жобасын дайында. Бұл жарияланбайтын админ жобасы.",
    "Төмендегі ресми КТП сәйкестігін, атауын және мақсатын өзгертпе. Мақсаттан шықпа; Виет теоремасы бұл сабақтың негізгі мақсаты емес.",
    JSON.stringify(catalog),
    "Толық теория: ax²+bx+c=0, a≠0, D=b²−4ac, D>0/D=0/D<0 кезіндегі нақты түбірлер. Нақты сандар жиынын көрсет.",
    "Кемінде 3 қадамнан тұратын 3–4 шығарылған мысал, 3 жұптық, төрт топқа 4 әртүрлі, A/B/C-де 2 есептен және 2 үй тапсырмасын дайында. Жауаптарын қойып тексер; шешімдер мен нақты дескрипторлар жаз. Есептер қайталанбасын.",
    "Жоспар минуттарының қосындысы дәл 45. ҚМЖ-ның мақсат/ресурс/алдыңғы білімін дайында. 12 теориялық слайдта формула, қадамдап түсіндіру және шығарылған мысал болсын.",
    "Слайд formula өрісі қауіпсіз қарапайым LaTeX болсын; қалған өрістер жай мәтін. HTML, сыртқы URL, скрипт немесе құпия/жеке деректер қоспа.",
    "Тек берілген JSON schema-ға сәйкес JSON қайтар. Оқушы/мұғалім деректері берілмейді. Кілттер ASCII, мазмұны қазақша.",
  ].join("\n");
}
module.exports = { schema, validate, prompt };
