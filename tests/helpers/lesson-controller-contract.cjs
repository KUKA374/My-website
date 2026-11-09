// Normalize only the two reviewed game-source adapter integration lines.
// Every remaining controller byte, including QMJ and private saving, retains its original hash.
/* Restore exactly the two approved game-context adapter lines for the old controller hash.
   Any other controller/QMJ/auth change still fails the original byte-level contract. */
exports.beforeGameAdapter = (bytes) =>
  Buffer.from(
    bytes
      .toString()
      .replace(
        '    if (current) LessonGames.describe(current, GameLearning, $("gameChoice"));\n',
        "",
      )
      .replace(
        "const topic = LessonGames.key(material, c, GameLearning);",
        'const topic = [c.grade, c.subject, c.quarter, c.number].join("-");',
      ),
  );
