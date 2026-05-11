const API_BASE = window.NIMBUS_API_BASE || "http://localhost:3000/api";

const TOOLS = [
  { slug: "email-security", type: "email_security", name: "Seguridad del correo electrónico", description: "SPF, DKIM, DMARC, MX, MTA-STS y TLS-RPT." },
  { slug: "email-breach", type: "email_breach", name: "Vulneración de correo", description: "Consulta de exposición en brechas (HIBP)." },
  { slug: "speed-test", type: "speed_test", name: "Test de velocidad", description: "Auditoría con PageSpeed Insights." },
  { slug: "domain-security", type: "domain_security", name: "Seguridad del dominio", description: "Revisión DNS de postura básica de seguridad." },
  { slug: "gdpr-web", type: "gdpr_web", name: "Estado RGPD web", description: "Análisis técnico de consentimiento y cookies." },
  { slug: "web-security", type: "web_security", name: "Seguridad de tu página web", description: "Escaneo de superficie y cabeceras de seguridad." }
];

const TOOL_ICONS = {
  email_security: `
    <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z"/><path d="m9.5 12 1.8 1.8 3.2-3.2"/></svg>
  `,
  email_breach: `
    <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z"/><path d="M12 9v4"/><circle cx="12" cy="16.5" r="1"/></svg>
  `,
  speed_test: `
    <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13a8 8 0 1 1 16 0"/><path d="M12 13 17 8"/><path d="M8 17h8"/></svg>
  `,
  gdpr_web: `
    <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>
  `,
  domain_security: `
    <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/><path d="m17 17 4 4"/><path d="m18.5 14.5 2 2"/></svg>
  `,
  web_security: `
    <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M10 14a2 2 0 1 1 4 0v1h-4Z"/><path d="M12 10v2"/></svg>
  `
};

const el = {
  badge: document.getElementById("apiBadge"),
  grid: document.getElementById("toolGrid"),
  title: document.querySelector("h1")
};

function renderTools() {
  el.grid.innerHTML = TOOLS.map((tool) => `
    <a class="tool-link" href="./tool-${tool.slug}.html">
      <article class="tool-card glass">
        <div class="card-top">
          <div class="icon-wrap">${TOOL_ICONS[tool.type] || ""}</div>
          <span class="category-pill">${tool.type}</span>
        </div>
        <h3 class="tool-name">${tool.name}</h3>
        <p>${tool.description}</p>
        <span class="open-link">Abrir herramienta</span>
      </article>
    </a>
  `).join("");
}

async function applyPublicTitle() {
  try {
    const res = await fetch(`${API_BASE}/settings/public`);
    if (!res.ok) return;
    const settings = await res.json();
    if (settings.brandName && el.title) {
      el.title.textContent = settings.brandName;
      document.title = settings.brandName;
    }
  } catch {}
}

(async () => {
  renderTools();

  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("down");
    el.badge.textContent = "API conectada";
    el.badge.className = "status-chip is-active";
  } catch {
    el.badge.textContent = "API no disponible";
    el.badge.className = "status-chip is-low";
  }

  await applyPublicTitle();
})();
