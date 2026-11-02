/* Normalize 9–11 grade KTP records for both quarter and lesson pages. */
(function () {
  const value = (collection, index) => (
    collection && typeof collection === 'object' && collection[index] != null
      ? String(collection[index]) : ''
  );
  function getKtpQuarterLessons(classId, subjectId, quarterId) {
    const grade = String(classId), subject = String(subjectId), quarter = Number(quarterId);
    const curr = window.curriculum && window.curriculum[grade];
    const entry = curr && curr.subjects && curr.subjects.find(s => String(s.id) === subject);
    if (!entry || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) return [];

    const key = entry.planKey || (grade + '_' + subject);
    const all = window.ktpD || {};
    const gradeData = all[grade] || {};
    const quarterKey = key + '_q' + quarter;
    const source = all[quarterKey] || gradeData[quarterKey] ||
      all[key] || gradeData[key] || null;

    function standard(row, assumedQuarter) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
      const title = row.title ?? row.topic ?? row.lessonTitle;
      const number = row.lesson ?? row.number ?? row.lessonNumber;
      const q = Number(row.quarter ?? row.term ?? row.toqsan ?? assumedQuarter);
      if (!title || number == null || q !== quarter) return null;
      return {
        number: String(number), title: String(title),
        section: String(row.section ?? row.unit ?? ''),
        objective: String(row.objective ?? row.learningObjective ?? ''),
        hours: String(row.hours ?? row.hour ?? 1), quarter: q
      };
    }
    function decode(input, assumedQuarter) {
      if (!input) return [];
      if (Array.isArray(input)) return input.map(r => standard(r, assumedQuarter)).filter(Boolean);
      if (Array.isArray(input.rows)) {
        const sections = input.sections || [], titles = input.titles || [];
        const objectives = input.objectives || [];
        return input.rows.filter(r => Array.isArray(r) && Number(r[1]) === quarter)
          .map(r => ({
            number: String(r[0]), quarter,
            section: value(sections, r[2]), title: value(titles, r[3]),
            objective: value(objectives, r[4]), hours: String(r[5] || 1)
          })).filter(r => r.title);
      }
      return [];
    }

    let rows = decode(source, source === all[quarterKey] || source === gradeData[quarterKey] ? quarter : null);
    if (!rows.length && source !== all[key] && all[key]) rows = decode(all[key], null);

    // Some upper-grade files use a compact dictionary: {d:[keys,sections,texts],r:[...]}.
    if (!rows.length && gradeData && Array.isArray(gradeData.r)) {
      const dictionaries = gradeData.d || [];
      const keys = dictionaries[0] || [];
      const sections = dictionaries[1] || [];
      const strings = dictionaries[2] || [];
      const index = Array.isArray(keys) ? keys.findIndex(k => String(k) === key) : -1;
      if (index >= 0) {
        rows = gradeData.r.filter(r => Array.isArray(r) &&
          Number(r[0]) === index && Number(r[2]) === quarter)
          .map(r => ({
            number: String(r[1]), quarter,
            section: value(sections, r[3]),
            title: value(strings, r[4]),
            objective: value(strings, r[5]),
            hours: String(r[6] || 1)
          })).filter(r => r.title);
      }
    }
    const unique = new Map();
    rows.forEach(r => { if (!unique.has(r.number)) unique.set(r.number, r); });
    return [...unique.values()];
  }
  window.getKtpQuarterLessons = getKtpQuarterLessons;
})();
