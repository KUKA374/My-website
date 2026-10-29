/*
  Math Teacher — Firebase Authentication and role routing.

  Login uses Firebase Authentication (Email/Password).
  Role is stored in Firestore: users/{uid}.role
  Example roles: teacher, admin, super_admin
*/

(function () {
  const SESSION_KEY = "mathTeacherUser";
  const LOGIN_DOMAIN = "mathteacher.kz";
  let roleCache = null;

  function firebaseReady() {
    return typeof firebase !== "undefined" && typeof FIREBASE_CONFIG !== "undefined";
  }

  function initAuth() {
    if (!firebaseReady()) return null;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    return firebase.auth();
  }

  function usernameToEmail(login) {
    const clean = String(login || "").trim().toLowerCase();
    if (!clean) return "";
    return clean.includes("@") ? clean : clean + "@" + LOGIN_DOMAIN;
  }

  async function getRole(user) {
    if (!user) return null;
    if (roleCache && roleCache.uid === user.uid) return roleCache.profile;

    const db = firebase.firestore();
    const snap = await db.collection("users").doc(user.uid).get();
    if (!snap.exists) return null;

    const profile = snap.data();
    roleCache = { uid: user.uid, profile: profile };
    return profile;
  }

  function saveSession(user, profile) {
    const sessionUser = {
      uid: user.uid,
      login: String(user.email || "").split("@")[0],
      email: user.email || "",
      role: profile.role,
      name: profile.name || user.displayName || user.email || "Қолданушы"
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  }

  function getCurrentUser() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  async function loginUser(login, password) {
    try {
      const auth = initAuth();
      if (!auth) return { success: false, message: "Firebase Authentication қосылмаған." };

      const credential = await auth.signInWithEmailAndPassword(usernameToEmail(login), password);
      const profile = await getRole(credential.user);

      if (!profile || !["teacher", "admin", "super_admin"].includes(profile.role)) {
        await auth.signOut();
        return { success: false, message: "Бұл аккаунтқа жүйеде рөл берілмеген." };
      }

      const sessionUser = saveSession(credential.user, profile);
      return { success: true, user: sessionUser };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Логин немесе пароль қате." };
    }
  }

  async function logoutUser() {
    try {
      const auth = initAuth();
      if (auth) await auth.signOut();
    } catch (error) {
      console.error(error);
    }
    roleCache = null;
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  }

  function routeAfterLogin(user) {
    if (!user) return;
    if (user.role === "super_admin" || user.role === "admin") {
      window.location.href = "admin.html";
      return;
    }
    window.location.href = "index.html";
  }

  function requireAuth() {
    const auth = initAuth();
    if (!auth) {
      window.location.href = "login.html";
      return null;
    }

    auth.onAuthStateChanged(async function (firebaseUser) {
      if (!firebaseUser) {
        sessionStorage.removeItem(SESSION_KEY);
        if (!window.location.pathname.endsWith("login.html")) window.location.href = "login.html";
        return;
      }

      try {
        const profile = await getRole(firebaseUser);
        if (!profile) {
          await auth.signOut();
          sessionStorage.removeItem(SESSION_KEY);
          window.location.href = "login.html";
          return;
        }
        saveSession(firebaseUser, profile);
      } catch (error) {
        console.error(error);
      }
    });

    return getCurrentUser();
  }

  function requireRole(allowedRoles) {
    const auth = initAuth();
    if (!auth) {
      window.location.href = "login.html";
      return null;
    }

    auth.onAuthStateChanged(async function (firebaseUser) {
      if (!firebaseUser) {
        window.location.href = "login.html";
        return;
      }

      try {
        const profile = await getRole(firebaseUser);
        if (!profile || !allowedRoles.includes(profile.role)) {
          const sessionUser = profile ? saveSession(firebaseUser, profile) : null;
          if (sessionUser) routeAfterLogin(sessionUser);
          else window.location.href = "login.html";
          return;
        }
        saveSession(firebaseUser, profile);
      } catch (error) {
        console.error(error);
        window.location.href = "login.html";
      }
    });

    return getCurrentUser();
  }

  function getRoleName(role) {
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    return "Мұғалім";
  }

  window.getCurrentUser = getCurrentUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.routeAfterLogin = routeAfterLogin;
  window.requireAuth = requireAuth;
  window.requireRole = requireRole;
  window.getRoleName = getRoleName;
})();
