/**
 * auth.js - Sistema de autenticacao ERL
 * - Login unico
 * - Sessao via localStorage
 * - Usuarios persistidos em localStorage e, quando disponivel, no servidor
 * - Conta root sempre existe como fallback
 */

var ERL_USERS_KEY = "erl_users";
var ERL_SESSION_KEY = "erl_session_user";

var ROOT_DEFAULT = { username: "root", password: "erlroot2026", role: "root" };

var Auth = {
  getUsers: function () {
    if (typeof erlPersistence !== "undefined") {
      var persistedUsers = erlPersistence.getSection("users", null);
      if (Array.isArray(persistedUsers)) {
        try {
          localStorage.setItem(ERL_USERS_KEY, JSON.stringify(persistedUsers));
        } catch (e) {}
        return persistedUsers;
      }
    }

    try {
      var raw = localStorage.getItem(ERL_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveUsers: function (users) {
    try {
      localStorage.setItem(ERL_USERS_KEY, JSON.stringify(users));
    } catch (e) {}

    if (typeof erlPersistence !== "undefined") {
      erlPersistence.persistSection("users", users);
    }
  },

  findUser: function (username) {
    if (username === ROOT_DEFAULT.username) {
      var stored = this.getUsers().find(function (u) {
        return u.username === ROOT_DEFAULT.username;
      });
      return stored || ROOT_DEFAULT;
    }

    return (
      this.getUsers().find(function (u) {
        return u.username === username;
      }) || null
    );
  },

  listUsers: function () {
    var users = this.getUsers();
    var hasRoot = users.some(function (u) {
      return u.username === ROOT_DEFAULT.username;
    });

    if (!hasRoot) {
      users = [Object.assign({}, ROOT_DEFAULT)].concat(users);
    }

    return users;
  },

  createUser: function (username, password, role) {
    if (!username || !password) return { ok: false, msg: "Usuario e senha sao obrigatorios." };
    username = username.trim().toLowerCase();
    if (username.length < 3) return { ok: false, msg: "Usuario deve ter ao menos 3 caracteres." };
    if (password.length < 4) return { ok: false, msg: "Senha deve ter ao menos 4 caracteres." };

    var existing = this.getUsers();
    if (
      existing.some(function (u) {
        return u.username === username;
      }) ||
      username === ROOT_DEFAULT.username
    ) {
      return { ok: false, msg: "Ja existe um usuario com esse nome." };
    }

    existing.push({ username: username, password: password, role: role || "admin" });
    this.saveUsers(existing);
    return { ok: true, msg: "Usuario criado com sucesso." };
  },

  removeUser: function (username) {
    if (username === ROOT_DEFAULT.username) {
      return { ok: false, msg: "O usuario root nao pode ser removido." };
    }

    var users = this.getUsers().filter(function (u) {
      return u.username !== username;
    });
    this.saveUsers(users);
    return { ok: true };
  },

  changePassword: function (username, newPassword) {
    if (!newPassword || newPassword.length < 4) {
      return { ok: false, msg: "Senha deve ter ao menos 4 caracteres." };
    }

    if (username === ROOT_DEFAULT.username) {
      var rootUsers = this.getUsers().filter(function (u) {
        return u.username !== username;
      });
      rootUsers.unshift({ username: ROOT_DEFAULT.username, password: newPassword, role: "root" });
      this.saveUsers(rootUsers);
      ROOT_DEFAULT.password = newPassword;
      return { ok: true };
    }

    var users = this.getUsers();
    var user = users.find(function (u) {
      return u.username === username;
    });
    if (!user) return { ok: false, msg: "Usuario nao encontrado." };

    user.password = newPassword;
    this.saveUsers(users);
    return { ok: true };
  },

  isLoggedIn: function () {
    return !!localStorage.getItem(ERL_SESSION_KEY);
  },

  currentUser: function () {
    return localStorage.getItem(ERL_SESSION_KEY) || null;
  },

  currentRole: function () {
    var user = this.findUser(this.currentUser());
    return user ? user.role : null;
  },

  login: function (username, password) {
    username = (username || "").trim().toLowerCase();
    var user = this.findUser(username);
    if (user && user.password === password) {
      localStorage.setItem(ERL_SESSION_KEY, user.username);
      return true;
    }
    return false;
  },

  logout: function () {
    localStorage.removeItem(ERL_SESSION_KEY);
  },

  requireLogin: function (redirectUrl) {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl || "login.html";
    }
  },

  updateNavLinks: function () {
    var adminLinks = document.querySelectorAll("[data-auth-admin]");
    var loginBtn = document.getElementById("btn-login-nav");
    var logoutBtn = document.getElementById("btn-logout-nav");
    var userLabel = document.getElementById("nav-username");

    if (this.isLoggedIn()) {
      adminLinks.forEach(function (el) {
        el.style.display = "";
      });
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "";
      if (userLabel) userLabel.textContent = Auth.currentUser();
    } else {
      adminLinks.forEach(function (el) {
        el.style.display = "none";
      });
      if (loginBtn) loginBtn.style.display = "";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (userLabel) userLabel.textContent = "";
    }
  }
};
