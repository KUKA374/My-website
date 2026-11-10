"use strict";
const { Fault } = require("./errors.cjs");
function firebaseVerifier({ auth, db }) {
  return async (authorization) => {
    if (
      typeof authorization !== "string" ||
      !/^Bearer [^\s]{10,8192}$/.test(authorization)
    )
      throw new Fault(401, "AUTH_REQUIRED", "Firebase арқылы қайта кіріңіз.");
    try {
      const decoded = await auth.verifyIdToken(authorization.slice(7), true);
      if (!decoded.uid) throw Error();
      const snap = await db.collection("users").doc(decoded.uid).get();
      const role = snap.exists ? snap.data().role : null;
      if (!["admin", "super_admin"].includes(role))
        throw new Fault(
          403,
          "ADMIN_REQUIRED",
          "Бұл әрекет тек админге қолжетімді.",
        );
      return { uid: decoded.uid, role };
    } catch (e) {
      if (e instanceof Fault) throw e;
      throw new Fault(
        401,
        "AUTH_INVALID",
        "Firebase сессиясы тексерілмеді. Қайта кіріңіз.",
      );
    }
  };
}
module.exports = { firebaseVerifier };
