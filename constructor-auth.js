/* Never use the synchronous sessionStorage role cache as a draft owner. */
(function (root) {
  "use strict";
  async function watch(ready, blocked) {
    let version = 0;
    try {
      const sdk = await root.ensureFirebase();
      sdk.auth().onAuthStateChanged(
        async (user) => {
          const v = ++version;
          blocked("Жүйеге кіру тексерілуде.");
          if (!user?.uid) {
            blocked("Сабақ кітапханасын ашу үшін жүйеге кіріңіз.");
            return;
          }
          try {
            const snap = await sdk
              .firestore()
              .collection("users")
              .doc(user.uid)
              .get();
            if (v !== version) return;
            const role = snap.exists ? snap.data().role : null;
            if (!["teacher", "admin", "super_admin"].includes(role)) {
              blocked("Бұл рөлге сабақ конструкторы қолжетімсіз.");
              return;
            }
            ready({ uid: user.uid, role });
          } catch {
            if (v === version)
              blocked("Рөлді тексеру мүмкін болмады. Қайта кіріп көріңіз.");
          }
        },
        () => {
          version++;
          blocked("Кіру сессиясын тексеру мүмкін болмады.");
        },
      );
    } catch {
      blocked("Авторизация қызметі қолжетімсіз. Жеке сабақтар ашылмады.");
    }
  }
  const api = { watch };
  if (typeof module !== "undefined") module.exports = api;
  else root.ConstructorAuth = api;
})(typeof window !== "undefined" ? window : globalThis);
