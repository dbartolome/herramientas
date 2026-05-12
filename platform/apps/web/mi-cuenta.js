const API_BASE = window.NIMBUS_API_BASE || "http://localhost:3000/api";
const USER_TOKEN_KEY = "nimbus_user_token";

const el = {
  badge: document.querySelector("#topApiBadge, #apiBadge"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  registerBtn: document.getElementById("registerBtn"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  authState: document.getElementById("authState"),
  myHistory: document.getElementById("myHistory"),
};

function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY) || "";
}

function setUserToken(token) {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token);
  else localStorage.removeItem(USER_TOKEN_KEY);
}

function userHeaders() {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function registerUser() {
  const email = el.authEmail.value.trim();
  const password = el.authPassword.value.trim();
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "No se pudo registrar");
  setUserToken(data.token);
}

async function loginUser() {
  const email = el.authEmail.value.trim();
  const password = el.authPassword.value.trim();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "No se pudo iniciar sesión");
  setUserToken(data.token);
}

async function fetchMe() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: userHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function fetchHistory() {
  const res = await fetch(`${API_BASE}/scans/me/history?limit=30`, { headers: userHeaders() });
  if (!res.ok) return [];
  return res.json();
}

function renderHistory(items) {
  if (!Array.isArray(items) || items.length === 0) {
    el.myHistory.innerHTML = '<p class="subtitle">Sin análisis guardados aún.</p>';
    return;
  }
  el.myHistory.innerHTML = items.map((scan) => `
    <article class="history-item">
      <div class="history-top"><strong>${scan.type}</strong><span class="status-chip">${scan.status}</span></div>
      <p class="history-id">${scan.id}</p>
      <p class="history-meta">${scan.asset}</p>
    </article>
  `).join("");
}

async function refreshUserState() {
  const me = await fetchMe();
  if (!me) {
    el.authState.textContent = "Modo abierto: inicia sesión para guardar histórico.";
    renderHistory([]);
    return;
  }
  el.authState.textContent = `Sesión activa: ${me.email} | rol: ${me.role} | plan: ${me.plan}`;
  renderHistory(await fetchHistory());
}

el.registerBtn.addEventListener("click", async () => {
  try {
    await registerUser();
    await refreshUserState();
  } catch (e) {
    el.authState.textContent = `Error registro: ${e.message}`;
  }
});

el.loginBtn.addEventListener("click", async () => {
  try {
    await loginUser();
    await refreshUserState();
  } catch (e) {
    el.authState.textContent = `Error login: ${e.message}`;
  }
});

el.logoutBtn.addEventListener("click", async () => {
  setUserToken("");
  await refreshUserState();
});

(async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("down");
    el.badge.textContent = "API conectada";
    el.badge.className = "status-chip is-active";
  } catch {
    el.badge.textContent = "API no disponible";
    el.badge.className = "status-chip is-low";
  }
  await refreshUserState();
})();
