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
  input: document.getElementById("assetInput"),
  strategyInput: document.getElementById("strategyInput"),
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

function buildReportFromScan(scan) {
  const result = scan.result || {};
  if (Array.isArray(result.checks) && result.checks.length > 0) {
    return {
      scanId: scan.id,
      targetAsset: result.targetUrl || scan.asset,
      score: typeof result.score === "number" ? result.score : 0,
      status: result.complianceStatus || "low",
      disclaimer:
        result.disclaimer ||
        "Evaluación automática de rendimiento con datos de PageSpeed. No sustituye una optimización de performance a nivel de código y observabilidad real de usuarios.",
      checks: result.checks,
      topRisks: result.topRisks || [],
      evidence: result.evidence || {}
    };
  }

  const findings = Array.isArray(result.findings) ? result.findings : [];

  const checks = findings.map((f) => ({
    id: f.id,
    title: f.title,
    description: `Control de rendimiento: ${f.title}`,
    severity: f.severity || "info",
    result: mapSeverityToResult(f.severity || "info"),
    evidence: f.evidence || "Sin evidencia",
    recommendation: f.recommendation || "Sin recomendación",
    details: f
  }));

  const scoreFinding = checks.find((c) => c.id === "performance_score");
  let score = 0;
  if (scoreFinding) {
    const match = String(scoreFinding.evidence || "").match(/(\d{1,3})\/100/);
    if (match) score = Math.max(0, Math.min(100, Number(match[1])));
  }

  if (!scoreFinding) {
    const penalty = checks.reduce((acc, c) => {
      if (c.result === "fail") return acc + 18;
      if (c.result === "partial") return acc + 9;
      return acc;
    }, 0);
    score = Math.max(0, Math.min(100, 100 - penalty));
  }

  const status = score >= 80 ? "high" : score >= 55 ? "medium" : "low";
  const topRisks = checks.filter((c) => c.result !== "pass").slice(0, 3);

  return {
    scanId: scan.id,
    targetAsset: scan.asset,
    score,
    status,
    disclaimer:
      "Evaluación automática de rendimiento con datos de PageSpeed. No sustituye una optimización de performance a nivel de código y observabilidad real de usuarios.",
    checks,
    topRisks,
    evidence: {
      summary: result.summary || "Sin resumen adicional",
      strategy: scan.params?.strategy || "mobile",
      scoreText: scoreFinding?.evidence || "Score no disponible"
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
    elements.historyList.innerHTML = '<p class="subtitle">Aún no hay tests en esta sesión.</p>';
    return;
  }

  elements.historyList.innerHTML = state.history
    .map(
      (scan) => `
      <button class="history-item" type="button" data-id="${scan.id}">
        <div class="history-top">
          <strong>speed_test</strong>
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
        <p class="history-meta">${scan.asset} · ${scan.params?.strategy || "mobile"}</p>
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
      <article class="speed-check ${result}" data-check-id="${check.id}">
        <div class="speed-check-head">
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
    <article class="speed-check info">
      <h3>Resumen técnico</h3>
      <p><strong>Resumen:</strong> ${evidence.summary || "Sin resumen adicional"}</p>
      <p><strong>Estrategia:</strong> ${evidence.strategy || "mobile"}</p>
      <p><strong>Score detectado:</strong> ${evidence.scoreText || "n/d"}</p>
      ${evidence.metrics ? `<p><strong>Métricas:</strong> LCP ${evidence.metrics.lcpMs ?? "n/d"}ms · INP ${evidence.metrics.inpMs ?? "n/d"}ms · CLS ${evidence.metrics.cls ?? "n/d"} · TBT ${evidence.metrics.tbtMs ?? "n/d"}ms</p>` : ""}
      ${evidence.categoryScores ? `<p><strong>Categorías:</strong> Perf ${evidence.categoryScores.performance ?? "n/d"} · Acc ${evidence.categoryScores.accessibility ?? "n/d"} · BP ${evidence.categoryScores.bestPractices ?? "n/d"} · SEO ${evidence.categoryScores.seo ?? "n/d"}</p>` : ""}
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

function renderFailedScan(scan) {
  renderResultFromScan(scan);
  elements.error.hidden = false;
  elements.error.textContent = scan.result?.summary || "El test terminó con error.";
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

async function createScan(asset, strategy) {
  const response = await fetch(`${API_BASE_URL}/scans`, {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify({
      type: "speed_test",
      asset,
      params: {
        strategy
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "No se pudo crear el test");
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
        renderFailedScan(scan);
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
  button.textContent = "Midiendo...";
  elements.error.hidden = true;

  startProgress();

  try {
    const created = await createScan(elements.input.value.trim(), elements.strategyInput.value);
    state.history.unshift(created);
    renderHistory();
    startPolling(created.id);
  } catch (error) {
    finishProgress();
    renderError(`Error en test: ${error.message}`);
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
      renderFailedScan(scan);
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
