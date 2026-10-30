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
  let firebasePromise = null;

  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      const existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "true") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = function() { script.dataset.loaded = "true"; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function ensureFirebase() {
    if (typeof firebase !== "undefined" && typeof FIREBASE_CONFIG !== "undefined") {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      return firebase;
    }

    if (!firebasePromise) {
      firebasePromise = (async function() {
        await loadScript("firebase-config.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js");
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        return firebase;
      })();
    }
    return firebasePromise;
  }

  function usernameToEmail(login) {
    const clean = String(login || "").trim().toLowerCase();
    if (!clean) return "";
    return clean.includes("@") ? clean : clean + "@" + LOGIN_DOMAIN;
  }

  async function getRole(user) {
    if (!user) return null;
    if (roleCache && roleCache.uid === user.uid) return roleCache.profile;

    await ensureFirebase();
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
      await ensureFirebase();
      const auth = firebase.auth();
      const credential = await auth.signInWithEmailAndPassword(usernameToEmail(login), password);
      const profile = await getRole(credential.user);

      if (!profile || !["teacher", "admin", "super_admin"].includes(profile.role)) {
        await auth.signOut();
        sessionStorage.removeItem(SESSION_KEY);
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
      await ensureFirebase();
      await firebase.auth().signOut();
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
    ensureFirebase().then(function() {
      firebase.auth().onAuthStateChanged(async function(firebaseUser) {
        if (!firebaseUser) {
          sessionStorage.removeItem(SESSION_KEY);
          if (!window.location.pathname.endsWith("login.html")) window.location.href = "login.html";
          return;
        }
        try {
          const profile = await getRole(firebaseUser);
          if (!profile || !["teacher", "admin", "super_admin"].includes(profile.role)) {
            await firebase.auth().signOut();
            roleCache = null;
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = "login.html";
            return;
          }
          saveSession(firebaseUser, profile);
        } catch (error) {
          console.error(error);
          await firebase.auth().signOut();
          roleCache = null;
          sessionStorage.removeItem(SESSION_KEY);
          window.location.href = "login.html";
        }
      });
    }).catch(function(error) {
      console.error(error);
      window.location.href = "login.html";
    });
    return getCurrentUser();
  }

  function requireRole(allowedRoles) {
    ensureFirebase().then(function() {
      firebase.auth().onAuthStateChanged(async function(firebaseUser) {
        if (!firebaseUser) {
          sessionStorage.removeItem(SESSION_KEY);
          window.location.href = "login.html";
          return;
        }

        try {
          const profile = await getRole(firebaseUser);
          if (!profile || !["teacher", "admin", "super_admin"].includes(profile.role)) {
            roleCache = null;
            sessionStorage.removeItem(SESSION_KEY);
            await firebase.auth().signOut();
            window.location.href = "login.html";
            return;
          }

          const sessionUser = saveSession(firebaseUser, profile);
          if (!allowedRoles.includes(profile.role)) {
            routeAfterLogin(sessionUser);
            return;
          }
        } catch (error) {
          console.error(error);
          roleCache = null;
          sessionStorage.removeItem(SESSION_KEY);
          await firebase.auth().signOut();
          window.location.href = "login.html";
        }
      });
    }).catch(function(error) {
      console.error(error);
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "login.html";
    });
    return getCurrentUser();
  }

  function getRoleName(role) {
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    return "Мұғалім";
  }

  window.ensureFirebase = ensureFirebase;
  window.getCurrentUser = getCurrentUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.routeAfterLogin = routeAfterLogin;
  window.requireAuth = requireAuth;
  window.requireRole = requireRole;
  window.getRoleName = getRoleName;
})();
