const API_BASE = window.NIMBUS_API_BASE || "http://localhost:3000/api";

const state = {
  tools: [],
  users: [],
  audit: [],
  selectedType: null,
};

const el = {
  apiBadge: document.querySelector("#topApiBadge, #apiBadge"),
  toolForm: document.getElementById("toolForm"),
  reloadBtn: document.getElementById("reloadBtn"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  toolsTableBody: document.getElementById("toolsTableBody"),
  notice: document.getElementById("notice"),
  globalSettingsForm: document.getElementById("globalSettingsForm"),
  brandName: document.getElementById("brandName"),
  globalThemeMode: document.getElementById("globalThemeMode"),
  accentColor: document.getElementById("accentColor"),
  allowAnonymousScans: document.getElementById("allowAnonymousScans"),
  usersTableBody: document.getElementById("usersTableBody"),
  auditTableBody: document.getElementById("auditTableBody"),
  type: document.getElementById("type"),
  enabled: document.getElementById("enabled"),
  displayName: document.getElementById("displayName"),
  description: document.getElementById("description"),
  timeoutMs: document.getElementById("timeoutMs"),
  maxAssetLength: document.getElementById("maxAssetLength"),
  defaultParams: document.getElementById("defaultParams"),
  adminToken: document.getElementById("adminToken"),
  adminPassword: document.getElementById("adminPassword"),
};

function statusClass(enabled) {
  return enabled ? "is-active" : "is-draft";
}

function setNotice(text) {
  el.notice.textContent = text;
}

function getAdminToken() {
  return el.adminToken.value.trim();
}

function authHeaders() {
  const token = getAdminToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function findTool(type) {
  return state.tools.find((tool) => tool.type === type) || null;
}

function renderTable() {
  if (!state.tools.length) {
    el.toolsTableBody.innerHTML = '<tr><td class="empty-cell" colspan="6">No hay herramientas</td></tr>';
    return;
  }

  el.toolsTableBody.innerHTML = state.tools
    .map(
      (tool) => `
      <tr>
        <td>${tool.type}</td>
        <td>${tool.displayName}</td>
        <td><span class="status-mini ${statusClass(tool.enabled)}">${tool.enabled ? "activa" : "inactiva"}</span></td>
        <td>${tool.maxAssetLength}</td>
        <td>${tool.timeoutMs}</td>
        <td class="actions-cell">
          <button class="mini-btn" type="button" data-select="${tool.type}">Editar</button>
          <button class="mini-btn ${tool.enabled ? "danger" : ""}" type="button" data-toggle="${tool.type}">
            ${tool.enabled ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function fillForm(tool) {
  state.selectedType = tool.type;
  el.type.value = tool.type;
  el.enabled.checked = Boolean(tool.enabled);
  el.displayName.value = tool.displayName || "";
  el.description.value = tool.description || "";
  el.timeoutMs.value = Number(tool.timeoutMs || 90000);
  el.maxAssetLength.value = Number(tool.maxAssetLength || 255);
  el.defaultParams.value = JSON.stringify(tool.defaultParams || {}, null, 2);
}

async function fetchTools() {
  const res = await fetch(`${API_BASE}/admin/tools`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "No se pudo cargar configuración de herramientas");
  }
  state.tools = Array.isArray(data) ? data : [];
  renderTable();
  if (!state.selectedType && state.tools.length > 0) {
    fillForm(state.tools[0]);
  } else if (state.selectedType) {
    const current = findTool(state.selectedType);
    if (current) fillForm(current);
  }
}

async function updateTool(type, payload) {
  const res = await fetch(`${API_BASE}/admin/tools/${type}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "No se pudo actualizar la herramienta");
  }
  return data;
}

async function loginAdmin(password) {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "No se pudo iniciar sesión admin");
  }
  return data;
}

async function logoutAdmin() {
  const res = await fetch(`${API_BASE}/admin/auth/logout`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "No se pudo cerrar sesión admin");
  }
  return data;
}

async function fetchGlobalSettings() {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "No se pudo cargar configuración global");
  }
  return data;
}

async function updateGlobalSettings(payload) {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "No se pudo guardar configuración global");
  }
  return data;
}

function fillGlobalSettings(settings) {
  el.brandName.value = settings.brandName || "";
  el.globalThemeMode.value = settings.themeMode || "system";
  el.accentColor.value = settings.accentColor || "#3fc2ff";
  el.allowAnonymousScans.checked = Boolean(settings.allowAnonymousScans);
}

async function fetchUsers() {
  const res = await fetch(`${API_BASE}/auth/admin/users?limit=300`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "No se pudo cargar usuarios");
  state.users = Array.isArray(data) ? data : [];
  renderUsers();
}

async function updateUser(userId, payload) {
  const res = await fetch(`${API_BASE}/auth/admin/users/${userId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "No se pudo actualizar usuario");
  return data;
}

function renderUsers() {
  if (!state.users.length) {
    el.usersTableBody.innerHTML = '<tr><td class="empty-cell" colspan="5">Sin usuarios</td></tr>';
    return;
  }

  el.usersTableBody.innerHTML = state.users.map((u) => `
    <tr>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.plan}</td>
      <td>${u.preferences?.themeMode || "system"}</td>
      <td class="actions-cell">
        <button class="mini-btn" type="button" data-user-role="${u.id}" data-next-role="${u.role === "admin" ? "basic" : "admin"}">
          ${u.role === "admin" ? "Pasar a basic" : "Hacer admin"}
        </button>
        <button class="mini-btn" type="button" data-user-plan="${u.id}" data-next-plan="${u.plan === "basic" ? "open" : "basic"}">
          Plan ${u.plan === "basic" ? "open" : "basic"}
        </button>
      </td>
    </tr>
  `).join("");
}

async function fetchAudit() {
  const res = await fetch(`${API_BASE}/admin/audit?limit=120`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "No se pudo cargar auditoría");
  state.audit = Array.isArray(data) ? data : [];
  renderAudit();
}

function renderAudit() {
  if (!state.audit.length) {
    el.auditTableBody.innerHTML = '<tr><td class="empty-cell" colspan="5">Sin eventos</td></tr>';
    return;
  }

  el.auditTableBody.innerHTML = state.audit.map((ev) => `
    <tr>
      <td>${new Date(ev.at).toLocaleString()}</td>
      <td>${ev.action}</td>
      <td>${ev.ip || "-"}</td>
      <td>${ev.actor || "-"}</td>
      <td>${ev.detail ? JSON.stringify(ev.detail) : "-"}</td>
    </tr>
  `).join("");
}

el.toolsTableBody.addEventListener("click", async (event) => {
  const selectBtn = event.target.closest("[data-select]");
  if (selectBtn) {
    const tool = findTool(selectBtn.dataset.select);
    if (tool) {
      fillForm(tool);
      setNotice(`Editando: ${tool.displayName}`);
    }
    return;
  }

  const toggleBtn = event.target.closest("[data-toggle]");
  if (!toggleBtn) return;

  const type = toggleBtn.dataset.toggle;
  const current = findTool(type);
  if (!current) return;

  try {
    await updateTool(type, { enabled: !current.enabled });
    await fetchTools();
    setNotice(`Herramienta ${type} ${current.enabled ? "desactivada" : "activada"}.`);
  } catch (error) {
    setNotice(`Error: ${error.message}`);
  }
});

el.toolForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedType) return;

  try {
    const payload = {
      enabled: el.enabled.checked,
      displayName: el.displayName.value.trim(),
      description: el.description.value.trim(),
      timeoutMs: Number(el.timeoutMs.value),
      maxAssetLength: Number(el.maxAssetLength.value),
      defaultParams: JSON.parse(el.defaultParams.value || "{}"),
    };

    await updateTool(state.selectedType, payload);
    await fetchTools();
    setNotice(`Configuración guardada para ${state.selectedType}.`);
  } catch (error) {
    setNotice(`Error: ${error.message}`);
  }
});

el.reloadBtn.addEventListener("click", async () => {
  try {
    await fetchTools();
    const settings = await fetchGlobalSettings();
    fillGlobalSettings(settings);
    await fetchUsers();
    await fetchAudit();
    setNotice("Configuración recargada.");
  } catch (error) {
    setNotice(`Error: ${error.message}`);
  }
});

el.loginBtn.addEventListener("click", async () => {
  try {
    const password = el.adminPassword.value.trim();
    if (!password) throw new Error("Introduce ADMIN_PASSWORD");
    const session = await loginAdmin(password);
    el.adminToken.value = session.token;
    try {
      localStorage.setItem("nimbus_admin_token", session.token);
    } catch {}
    setNotice(`Sesión admin iniciada. Expira en ${session.expiresInSec}s.`);
    await fetchTools();
    const settings = await fetchGlobalSettings();
    fillGlobalSettings(settings);
    await fetchUsers();
    await fetchAudit();
  } catch (error) {
    setNotice(`Error login: ${error.message}`);
  }
});

el.logoutBtn.addEventListener("click", async () => {
  try {
    await logoutAdmin();
  } catch {}

  el.adminToken.value = "";
  try {
    localStorage.removeItem("nimbus_admin_token");
  } catch {}
  setNotice("Sesión admin cerrada.");
});

el.globalSettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      brandName: el.brandName.value.trim(),
      themeMode: el.globalThemeMode.value,
      accentColor: el.accentColor.value,
      allowAnonymousScans: el.allowAnonymousScans.checked,
    };
    await updateGlobalSettings(payload);
    setNotice("Personalización global guardada.");
  } catch (error) {
    setNotice(`Error settings: ${error.message}`);
  }
});

el.usersTableBody.addEventListener("click", async (event) => {
  const roleBtn = event.target.closest("[data-user-role]");
  if (roleBtn) {
    try {
      await updateUser(roleBtn.dataset.userRole, { role: roleBtn.dataset.nextRole });
      await fetchUsers();
      setNotice("Rol de usuario actualizado.");
    } catch (error) {
      setNotice(`Error user role: ${error.message}`);
    }
    return;
  }

  const planBtn = event.target.closest("[data-user-plan]");
  if (planBtn) {
    try {
      await updateUser(planBtn.dataset.userPlan, { plan: planBtn.dataset.nextPlan });
      await fetchUsers();
      setNotice("Plan de usuario actualizado.");
    } catch (error) {
      setNotice(`Error user plan: ${error.message}`);
    }
  }
});

el.adminToken.addEventListener("change", () => {
  try {
    localStorage.setItem("nimbus_admin_token", getAdminToken());
  } catch {}
});

(async () => {
  try {
    const health = await fetch(`${API_BASE}/health`);
    if (!health.ok) throw new Error("down");
    el.apiBadge.textContent = "API conectada";
    el.apiBadge.className = "status-chip is-active";
  } catch {
    el.apiBadge.textContent = "API no disponible";
    el.apiBadge.className = "status-chip is-low";
  }

  try {
    el.adminToken.value = localStorage.getItem("nimbus_admin_token") || "";
  } catch {}

  try {
    await fetchTools();
    const settings = await fetchGlobalSettings();
    fillGlobalSettings(settings);
    await fetchUsers();
    await fetchAudit();
    setNotice("Panel de administración cargado.");
  } catch (error) {
    setNotice(`Error inicial: ${error.message}`);
  }
})();
