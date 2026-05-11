const API_BASE_URL = window.NIMBUS_API_BASE || "http://localhost:3000/api";
const USER_TOKEN_KEY = "nimbus_user_token";

function authJsonHeaders() {
  const token = localStorage.getItem(USER_TOKEN_KEY) || "";
  return token
    ? { "Content-Type": "application/json", Authorization: "Bearer " + token }
    : { "Content-Type": "application/json" };
}

const state = {
  history: [],
  lastReport: null,
  pollTimer: null,
  progressTimer: null,
  progressValue: 0
};

const elements = {
  apiBadge: document.getElementById("apiBadge"),
  form: document.getElementById("scanForm"),
  assetInput: document.getElementById("assetInput"),
  dkimSelector: document.getElementById("dkimSelector"),
  result: document.getElementById("scanResult"),
  error: document.getElementById("scanError"),
  scanIdValue: document.getElementById("scanIdValue"),
  scoreValue: document.getElementById("scoreValue"),
  statusValue: document.getElementById("statusValue"),
  assetValue: document.getElementById("assetValue"),
  disclaimerText: document.getElementById("disclaimerText"),
  evidencePanel: document.getElementById("evidencePanel"),
  checksGrid: document.getElementById("checksGrid"),
  historyList: document.getElementById("historyList"),
  progressWrap: document.getElementById("scanProgress"),
  progressValue: document.getElementById("scanProgressValue"),
  progressBar: document.getElementById("scanProgressBar"),
  modal: document.getElementById("checkModal"),
  modalClose: document.getElementById("modalClose"),
  modalTitle: document.getElementById("modalTitle"),
  modalStatusLine: document.getElementById("modalStatusLine"),
  modalDescription: document.getElementById("modalDescription"),
  modalEvidence: document.getElementById("modalEvidence"),
  modalRecommendation: document.getElementById("modalRecommendation"),
  modalDetails: document.getElementById("modalDetails")
};

function getGlobalStatusLabel(status) {
  if (status === "high") return "Postura alta";
  if (status === "medium") return "Postura media";
  return "Postura baja";
}

function getGlobalStatusClass(status) {
  if (status === "high") return "is-active";
  if (status === "medium") return "is-medium";
  return "is-low";
}

function getCheckResultLabel(result) {
  if (result === "pass") return "Cumple";
  if (result === "partial") return "Parcial";
  return "No cumple";
}

function getCheckResultClass(result) {
  if (result === "pass") return "is-active";
  if (result === "partial") return "is-medium";
  return "is-low";
}

function mapSeverityToResult(severity) {
  if (severity === "info" || severity === "low") return "pass";
  if (severity === "medium") return "partial";
  return "fail";
}

function computeScore(checks) {
  if (!checks.length) return { score: 0, status: "low" };
  const weightBySeverity = { low: 1, info: 1, medium: 2, high: 3, critical: 4 };
  let total = 0;
  let earned = 0;
  for (const c of checks) {
    const w = weightBySeverity[c.severity] || 1;
    total += w;
    if (c.result === "pass") earned += w;
    if (c.result === "partial") earned += w * 0.5;
  }
  const score = Math.round((earned / total) * 100);
  const status = score >= 80 ? "high" : score >= 55 ? "medium" : "low";
  return { score, status };
}

function buildReportFromScan(scan) {
  const result = scan.result || {};
  const findings = Array.isArray(result.findings) ? result.findings : [];

  const checks = findings.map((f) => ({
    id: f.id,
    title: f.title,
    description: `Control técnico: ${f.title}`,
    severity: f.severity || "info",
    result: mapSeverityToResult(f.severity || "info"),
    evidence: f.evidence || "Sin evidencia",
    recommendation: f.recommendation || "Sin recomendación",
    details: f
  }));

  const { score, status } = computeScore(checks);
  const topRisks = checks.filter((c) => c.result !== "pass").slice(0, 3);

  return {
    scanId: scan.id,
    targetAsset: scan.asset,
    score,
    status,
    disclaimer: "Evaluación técnica automática de configuración de correo. No sustituye auditoría completa de mail infra.",
    checks,
    topRisks,
    evidence: {
      summary: result.summary || "Sin resumen adicional",
      dkimSelector: scan.params?.dkim_selector || "default"
    }
  };
}

function startProgress() {
  state.progressValue = 4;
  elements.progressWrap.hidden = false;
  updateProgressUI();

  clearInterval(state.progressTimer);
  state.progressTimer = setInterval(() => {
    const next = state.progressValue < 55 ? 8 : 3;
    state.progressValue = Math.min(92, state.progressValue + next);
    updateProgressUI();
  }, 380);
}

function finishProgress() {
  clearInterval(state.progressTimer);
  state.progressValue = 100;
  updateProgressUI();

  setTimeout(() => {
    elements.progressWrap.hidden = true;
    state.progressValue = 0;
    updateProgressUI();
  }, 450);
}

function updateProgressUI() {
  elements.progressValue.textContent = `${state.progressValue}%`;
  elements.progressBar.style.width = `${state.progressValue}%`;
  const track = elements.progressWrap.querySelector(".scan-progress-track");
  track.setAttribute("aria-valuenow", String(state.progressValue));
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = '<p class="subtitle">Aún no hay escaneos en esta sesión.</p>';
    return;
  }

  elements.historyList.innerHTML = state.history
    .map(
      (scan) => `
      <button class="history-item" type="button" data-id="${scan.id}">
        <div class="history-top">
          <strong>email_security</strong>
          <span class="status-chip ${
            scan.status === "completed"
              ? "is-completed"
              : scan.status === "failed"
                ? "is-failed"
                : scan.status === "running"
                  ? "is-running"
                  : "is-queued"
          }">${scan.status}</span>
        </div>
        <p class="history-id">${scan.id}</p>
        <p class="history-meta">${scan.asset}</p>
      </button>
    `
    )
    .join("");
}

function renderChecks(checks) {
  elements.checksGrid.innerHTML = checks
    .map((check) => {
      const result = check.result || "fail";
      return `
      <article class="email-check ${result}" data-check-id="${check.id}">
        <div class="email-check-head">
          <p class="eyebrow">${String(check.severity || "info").toUpperCase()}</p>
          <p class="status-chip ${getCheckResultClass(result)}">${getCheckResultLabel(result)}</p>
        </div>
        <h3>${check.title || "Check"}</h3>
        <p>${check.description || "Sin descripción"}</p>
        <p><strong>Evidencia:</strong> ${check.evidence || "Sin evidencia"}</p>
        <button class="mini-btn details-btn" type="button" data-check-id="${check.id}">Ver detalles</button>
      </article>
    `;
    })
    .join("");
}

function renderEvidence(report) {
  const evidence = report.evidence || {};
  const risks = report.topRisks || [];
  const riskList = risks
    .map((risk) => `<li><strong>${risk.title || "Riesgo"}:</strong> ${risk.evidence || "Sin detalle"}</li>`)
    .join("");

  elements.evidencePanel.innerHTML = `
    <article class="email-check info">
      <h3>Resumen técnico</h3>
      <p><strong>Resumen:</strong> ${evidence.summary || "Sin resumen adicional"}</p>
      <p><strong>Selector DKIM usado:</strong> ${evidence.dkimSelector || "default"}</p>
      ${riskList ? `<ul class="rgpd-risks">${riskList}</ul>` : ""}
    </article>
  `;
}

function renderResultFromScan(scan) {
  const report = buildReportFromScan(scan);
  state.lastReport = report;

  elements.error.hidden = true;
  elements.result.hidden = false;

  elements.scanIdValue.textContent = scan.id;
  elements.scoreValue.textContent = String(report.score);
  elements.statusValue.textContent = getGlobalStatusLabel(report.status);
  elements.statusValue.className = `status-chip ${getGlobalStatusClass(report.status)}`;
  elements.assetValue.textContent = report.targetAsset;
  elements.disclaimerText.textContent = report.disclaimer;

  renderEvidence(report);
  renderChecks(report.checks || []);
}

function renderError(message) {
  elements.result.hidden = true;
  elements.error.hidden = false;
  elements.error.textContent = message;
}

function openCheckModal(check) {
  const result = check.result || "fail";
  elements.modalTitle.textContent = check.title || "Detalle";
  elements.modalStatusLine.textContent = getCheckResultLabel(result);
  elements.modalStatusLine.className = `status-chip ${getCheckResultClass(result)}`;
  elements.modalDescription.textContent = check.description || "Sin descripción";
  elements.modalEvidence.innerHTML = `<strong>Evidencia:</strong> ${check.evidence || "Sin evidencia"}`;
  elements.modalRecommendation.innerHTML = `<strong>Recomendación:</strong> ${check.recommendation || "Sin recomendación"}`;
  elements.modalDetails.textContent = JSON.stringify(check.details || {}, null, 2);
  elements.modal.showModal();
}

function handleCheckDetailsClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const checkId = target.dataset.checkId;
  if (!checkId || !state.lastReport?.checks) return;

  const check = state.lastReport.checks.find((item) => item.id === checkId);
  if (!check) return;

  openCheckModal(check);
}

async function createScan(asset, dkimSelector) {
  const response = await fetch(`${API_BASE_URL}/scans`, {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify({
      type: "email_security",
      asset,
      params: {
        dkim_selector: dkimSelector || "default"
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "No se pudo crear el escaneo");
  }

  return payload;
}

async function getScan(scanId) {
  const response = await fetch(`${API_BASE_URL}/scans/${scanId}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "No se pudo consultar el escaneo");
  }
  return payload;
}

function startPolling(scanId) {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    try {
      const scan = await getScan(scanId);
      const idx = state.history.findIndex((item) => item.id === scan.id);
      if (idx >= 0) state.history[idx] = scan;
      renderHistory();

      if (scan.status === "completed") {
        clearInterval(state.pollTimer);
        finishProgress();
        renderResultFromScan(scan);
      } else if (scan.status === "failed") {
        clearInterval(state.pollTimer);
        finishProgress();
        renderError(scan.result?.summary || "El escaneo terminó con error.");
      }
    } catch (error) {
      clearInterval(state.pollTimer);
      finishProgress();
      renderError(`Error consultando progreso: ${error.message}`);
    }
  }, 1200);
}

async function handleSubmit(event) {
  event.preventDefault();

  const button = elements.form.querySelector("button");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Escaneando...";
  elements.error.hidden = true;

  startProgress();

  try {
    const created = await createScan(elements.assetInput.value.trim(), elements.dkimSelector.value.trim());
    state.history.unshift(created);
    renderHistory();
    startPolling(created.id);
  } catch (error) {
    finishProgress();
    renderError(`Error en escaneo: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function handleHistoryClick(event) {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  try {
    const scan = await getScan(button.dataset.id);
    if (scan.status === "completed") {
      renderResultFromScan(scan);
    } else if (scan.status === "failed") {
      renderError(scan.result?.summary || "El escaneo terminó con error.");
    } else {
      startProgress();
      startPolling(scan.id);
    }
  } catch (error) {
    renderError(`No se pudo cargar histórico: ${error.message}`);
  }
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.checksGrid.addEventListener("click", handleCheckDetailsClick);
  elements.historyList.addEventListener("click", handleHistoryClick);
  elements.modalClose.addEventListener("click", () => elements.modal.close());
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      elements.modal.close();
    }
  });
}

async function checkApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("down");
    elements.apiBadge.textContent = "API conectada";
    elements.apiBadge.className = "status-chip is-active";
  } catch {
    elements.apiBadge.textContent = "API no disponible";
    elements.apiBadge.className = "status-chip is-low";
  }
}

function init() {
  bindEvents();
  renderHistory();
  checkApi();
}

init();
