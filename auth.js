/*
  Math Teacher — first-stage login and role routing.
  This is a prototype for GitHub Pages. Production authentication
  must later move to a secure backend/database.
*/

const AUTH_USERS = [
  { login: "superadmin1", password: "Super@2026!", role: "super_admin", name: "Super Admin 1" },
  { login: "superadmin2", password: "Super@2026!", role: "super_admin", name: "Super Admin 2" },
  { login: "admin1", password: "Admin@2026!", role: "admin", name: "Admin 1" },
  { login: "admin2", password: "Admin@2026!", role: "admin", name: "Admin 2" },
  { login: "teacher1", password: "Teacher@2026!", role: "teacher", name: "Teacher 1" }
];

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("mathTeacherUser") || "null");
  } catch (error) {
    return null;
  }
}

function loginUser(login, password) {
  const user = AUTH_USERS.find(function(item) {
    return item.login === login && item.password === password;
  });

  if (!user) return { success: false, message: "Логин немесе пароль қате." };

  const sessionUser = {
    login: user.login,
    role: user.role,
    name: user.name
  };

  sessionStorage.setItem("mathTeacherUser", JSON.stringify(sessionUser));
  return { success: true, user: sessionUser };
}

function logoutUser() {
  sessionStorage.removeItem("mathTeacherUser");
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
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function requireRole(allowedRoles) {
  const user = requireAuth();
  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    routeAfterLogin(user);
    return null;
  }

  return user;
}

function getRoleName(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Мұғалім";
}
