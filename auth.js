/*
  Math Teacher — Firebase Authentication and role routing.

  Login uses Firebase Authentication (Email/Password).
  Role is stored in Firestore: users/{uid}.role
  Example roles: teacher, admin, super_admin
*/

(function () {
  const SESSION_KEY = "mathTeacherUser";
  const LOGIN_DOMAIN = "mathteacher.kz";
  const LOGIN_DOMAINS = ["sdu.edu.kz", "gmail.com", LOGIN_DOMAIN];
  const LOGIN_ALIASES = {
    teacher: "240105090@sdu.edu.kz",
    мұғалім: "240105090@sdu.edu.kz",
    admin: "240105009@gmail.com"
  };
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

  function getLoginEmails(login) {
    const clean = String(login || "").trim().toLowerCase();
    if (!clean) return [];

    if (LOGIN_ALIASES[clean]) return [LOGIN_ALIASES[clean]];
    if (clean.includes("@")) return [clean];

    return LOGIN_DOMAINS.map(function(domain) {
      return clean + "@" + domain;
    });
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

  function applyRoleUi(role) {
    const adminLinks = document.querySelectorAll('a[href="admin.html"]');
    adminLinks.forEach(function(link) {
      link.style.display = (role === "admin" || role === "super_admin") ? "" : "none";
    });

    const roleLabel = document.getElementById("roleLabel");
    if (roleLabel && role !== "admin" && role !== "super_admin") {
      roleLabel.textContent = "Тексерілуде...";
    }
  }

  async function loginUser(login, password) {
    try {
      await ensureFirebase();
      const auth = firebase.auth();
      const emails = getLoginEmails(login);

      if (!emails.length) {
        return { success: false, message: "Логинді енгізіңіз." };
      }

      roleCache = null;
      sessionStorage.removeItem(SESSION_KEY);

      if (auth.currentUser) {
        await auth.signOut();
      }

      let lastError = null;
      let credential = null;

      for (const email of emails) {
        try {
          credential = await auth.signInWithEmailAndPassword(email, password);
          break;
        } catch (error) {
          lastError = error;
          if (error && error.code === "auth/wrong-password") break;
        }
      }

      if (!credential) {
        console.error(lastError);
        return { success: false, message: "Логин немесе пароль қате." };
      }

      const profile = await getRole(credential.user);

      if (!profile || !["teacher", "admin", "super_admin"].includes(profile.role)) {
        await auth.signOut();
        sessionStorage.removeItem(SESSION_KEY);
        roleCache = null;
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
          const sessionUser = saveSession(firebaseUser, profile);
          applyRoleUi(sessionUser.role);
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
    const initialUser = getCurrentUser();
    applyRoleUi(initialUser ? initialUser.role : null);

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
          applyRoleUi(sessionUser.role);
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
    return initialUser && allowedRoles.includes(initialUser.role) ? initialUser : null;
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
