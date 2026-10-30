const curriculum = {
  5: { title: "5-сынып", subjects: [{ id: "math", title: "Математика", planKey: "5_math", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }] },
  6: { title: "6-сынып", subjects: [{ id: "math", title: "Математика", planKey: "6_math", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }] },
  7: { title: "7-сынып", subjects: [
    { id: "algebra", title: "Алгебра", planKey: "7_algebra", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry", title: "Геометрия", planKey: "7_geometry", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }
  ] },
  8: { title: "8-сынып", subjects: [
    { id: "algebra", title: "Алгебра", planKey: "8_algebra", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry", title: "Геометрия", planKey: "8_geometry", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }
  ] },
  9: { title: "9-сынып", subjects: [
    { id: "algebra", title: "Алгебра", planKey: "9_algebra", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry", title: "Геометрия", planKey: "9_geometry", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }
  ] },
  10: { title: "10-сынып", subjects: [
    { id: "algebra_ЖМБ", title: "Алгебра және анализ бастамалары — ЖМБ", planKey: "10_algebra_ЖМБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry_ЖМБ", title: "Геометрия — ЖМБ", planKey: "10_geometry_ЖМБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "algebra_ҚГБ", title: "Алгебра және анализ бастамалары — ҚГБ", planKey: "10_algebra_ҚГБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry_ҚГБ", title: "Геометрия — ҚГБ", planKey: "10_geometry_ҚГБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }
  ] },
  11: { title: "11-сынып", subjects: [
    { id: "algebra_ЖМБ", title: "Алгебра және анализ бастамалары — ЖМБ", planKey: "11_algebra_ЖМБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry_ЖМБ", title: "Геометрия — ЖМБ", planKey: "11_geometry_ЖМБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "algebra_ҚГБ", title: "Алгебра және анализ бастамалары — ҚГБ", planKey: "11_algebra_ҚГБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) },
    { id: "geometry_ҚГБ", title: "Геометрия — ҚГБ", planKey: "11_geometry_ҚГБ", quarters: [1,2,3,4].map(id => ({id, title: `${id}-тоқсан`, available: true})) }
  ] }
};
window.curriculum = curriculum;
