const API_BASE = window.NIMBUS_API_BASE || "http://localhost:3000/api";

function statusClass(status) {
  if (status === "completed") return "is-completed";
  if (status === "failed") return "is-failed";
  if (status === "running") return "is-running";
  if (status === "queued") return "is-queued";
  return "";
}

function renderFields(container, fields) {
  if (!fields || fields.length === 0) {
    container.innerHTML = '<p class="subtitle">Esta herramienta no requiere campos extra.</p>';
    return;
  }

  container.innerHTML = fields.map((field) => {
    if (field.type === "select") {
      return `
      <label>
        <span>${field.label}</span>
        <select data-param-name="${field.name}">
          ${field.options.map((opt) => `<option value="${opt}" ${opt === field.defaultValue ? "selected" : ""}>${opt}</option>`).join("")}
        </select>
      </label>`;
    }

    return `
      <label>
        <span>${field.label}</span>
        <input data-param-name="${field.name}" type="${field.type || "text"}" value="${field.defaultValue || ""}" placeholder="${field.placeholder || ""}" />
      </label>`;
  }).join("");
}

function collectParams(fieldsContainer, advancedArea) {
  const params = {};
  for (const node of fieldsContainer.querySelectorAll("[data-param-name]")) {
    const name = node.dataset.paramName;
    const value = node.value.trim();
    if (name && value !== "") params[name] = value;
  }

  const raw = advancedArea.value.trim();
  if (raw) {
    Object.assign(params, JSON.parse(raw));
  }
  return params;
}

function renderFindings(findingsContainer, kpiTotal, kpiHigh, kpiMedium, findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    findingsContainer.innerHTML = '<p class="subtitle">Sin findings todavía.</p>';
    kpiTotal.textContent = "0";
    kpiHigh.textContent = "0";
    kpiMedium.textContent = "0";
    return;
  }

  const high = findings.filter((f) => f.severity === "high" || f.severity === "critical").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  kpiTotal.textContent = String(findings.length);
  kpiHigh.textContent = String(high);
  kpiMedium.textContent = String(medium);

  findingsContainer.innerHTML = findings.map((f) => `
    <article class="finding-item ${f.severity}">
      <p class="eyebrow">${f.severity.toUpperCase()}</p>
      <h4>${f.title}</h4>
      <p><strong>Evidencia:</strong> ${f.evidence}</p>
      <p><strong>Recomendación:</strong> ${f.recommendation}</p>
    </article>
  `).join("");
}

function initToolPage(config) {
  const el = {
    apiBadge: document.querySelector("#topApiBadge, #apiBadge"),
    title: document.getElementById("toolTitle"),
    subtitle: document.getElementById("toolSubtitle"),
    form: document.getElementById("scanForm"),
    asset: document.getElementById("asset"),
    hint: document.getElementById("toolConfigHint"),
    fields: document.getElementById("toolConfigFields"),
    advanced: document.getElementById("scanParams"),
    scanId: document.getElementById("scanId"),
    scanStatus: document.getElementById("scanStatus"),
    findings: document.getElementById("findings"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiHigh: document.getElementById("kpiHigh"),
    kpiMedium: document.getElementById("kpiMedium"),
    output: document.getElementById("scanOutput"),
    history: document.getElementById("historyList")
  };

  const state = { timer: null, history: [] };

  el.title.textContent = config.name;
  el.subtitle.textContent = config.description;
  el.asset.placeholder = config.placeholder;
  el.hint.textContent = config.hint || "";
  renderFields(el.fields, config.fields || []);
  renderFindings(el.findings, el.kpiTotal, el.kpiHigh, el.kpiMedium, []);

  function renderHistory() {
    if (!state.history.length) {
      el.history.innerHTML = '<p class="subtitle">Aún no hay escaneos en esta sesión.</p>';
      return;
    }

    el.history.innerHTML = state.history.map((scan) => `
      <button class="history-item" type="button" data-id="${scan.id}">
        <div class="history-top"><strong>${scan.type}</strong><span class="status-chip ${statusClass(scan.status)}">${scan.status}</span></div>
        <p class="history-id">${scan.id}</p>
        <p class="history-meta">${scan.asset}</p>
      </button>
    `).join("");
  }

  function renderScan(scan) {
    el.scanId.textContent = scan.id;
    el.scanStatus.textContent = `Estado: ${scan.status}`;
    el.scanStatus.className = `status-chip ${statusClass(scan.status)}`;
    renderFindings(el.findings, el.kpiTotal, el.kpiHigh, el.kpiMedium, scan.result?.findings || []);
    el.output.textContent = JSON.stringify(scan, null, 2);
  }

  async function getScan(scanId) {
    const res = await fetch(`${API_BASE}/scans/${scanId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "No se pudo consultar el scan");
    return data;
  }

  function startPolling(scanId) {
    clearInterval(state.timer);
    state.timer = setInterval(async () => {
      try {
        const scan = await getScan(scanId);
        renderScan(scan);
        const idx = state.history.findIndex((s) => s.id === scan.id);
        if (idx >= 0) state.history[idx] = scan;
        renderHistory();
        if (scan.status === "completed" || scan.status === "failed") clearInterval(state.timer);
      } catch {
        clearInterval(state.timer);
      }
    }, 1200);
  }

  el.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = {
        type: config.type,
        asset: el.asset.value.trim(),
        params: collectParams(el.fields, el.advanced)
      };

      const res = await fetch(`${API_BASE}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.message || "No se pudo crear el scan");

      state.history.unshift(created);
      renderHistory();
      renderScan(created);
      startPolling(created.id);
    } catch (error) {
      el.output.textContent = `Error: ${error.message}`;
    }
  });

  el.history.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-id]");
    if (!btn) return;
    const scan = await getScan(btn.dataset.id);
    renderScan(scan);
    startPolling(scan.id);
  });

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error("down");
      el.apiBadge.textContent = "API conectada";
      el.apiBadge.className = "status-chip is-active";
    } catch {
      el.apiBadge.textContent = "API no disponible";
      el.apiBadge.className = "status-chip is-low";
    }
  })();

  renderHistory();
}

window.initToolPage = initToolPage;
