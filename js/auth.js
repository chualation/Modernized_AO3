/* AUTH.JS - Authentication functionality */

const authLinks = document.querySelector(".auth-links");
const AUTH_STORAGE_KEY = "ao3-auth-user";
const AUTH_USERS_KEY = "ao3-auth-users";

function createAuthLink(text, href, clickHandler) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;

  if (clickHandler) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      clickHandler();
    });
  }

  return link;
}

function createSeparator() {
  const separator = document.createElement("span");
  separator.textContent = "|";
  return separator;
}

function getAuthUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch (error) {
    return {};
  }
}

function setAuthUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  return raw ? raw.trim() : "";
}

function setCurrentUser(username) {
  localStorage.setItem(AUTH_STORAGE_KEY, username);
}

function renderAuthState() {
  if (!authLinks) return;

  const username = getCurrentUser();
  authLinks.textContent = "";

  if (username) {
    const greeting = document.createElement("span");
    greeting.className = "auth-greeting";
    greeting.textContent = `Hello, ${username}`;

    const logoutLink = createAuthLink("Log Out", "#", function () {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      renderAuthState();
    });

    authLinks.appendChild(greeting);
    authLinks.appendChild(createSeparator());
    authLinks.appendChild(logoutLink);
    return;
  }

  authLinks.appendChild(createAuthLink("Log In", "login.html"));
  authLinks.appendChild(createSeparator());
  authLinks.appendChild(createAuthLink("Sign Up", "register.html"));
}

function setAuthMessage(element, message, isError) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", !!isError);
}

function setupAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const usernameInput = document.getElementById("loginUsername");
      const passwordInput = document.getElementById("loginPassword");
      const message = document.getElementById("authMessage");

      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";
      const users = getAuthUsers();

      if (!username || !password) {
        setAuthMessage(message, "Enter both username and password.", true);
        return;
      }

      if (!users[username] || users[username] !== password) {
        setAuthMessage(message, "Invalid username or password.", true);
        return;
      }

      setCurrentUser(username);
      setAuthMessage(message, "Login successful. Redirecting...", false);
      window.setTimeout(function () {
        window.location.href = "index.html";
      }, 700);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const usernameInput = document.getElementById("registerUsername");
      const passwordInput = document.getElementById("registerPassword");
      const confirmInput = document.getElementById("registerConfirmPassword");
      const message = document.getElementById("authMessage");

      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";
      const confirmPassword = confirmInput ? confirmInput.value : "";

      if (username.length < 3) {
        setAuthMessage(message, "Username must be at least 3 characters.", true);
        return;
      }

      if (password.length < 4) {
        setAuthMessage(message, "Password must be at least 4 characters.", true);
        return;
      }

      if (password !== confirmPassword) {
        setAuthMessage(message, "Passwords do not match.", true);
        return;
      }

      const users = getAuthUsers();
      if (users[username]) {
        setAuthMessage(message, "Username already exists.", true);
        return;
      }

      users[username] = password;
      setAuthUsers(users);
      setCurrentUser(username);

      setAuthMessage(message, "Account created. Redirecting...", false);
      window.setTimeout(function () {
        window.location.href = "index.html";
      }, 700);
    });
  }
}

// Initialize auth
renderAuthState();
setupAuthForms();
