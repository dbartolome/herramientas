const API_BASE = window.NIMBUS_API_BASE || "http://localhost:3000/api";

const TOOLS = [
  {
    slug: "email-security",
    type: "email_security",
    name: "Seguridad del correo electrónico",
    description: "Comprueba protección de tu correo frente a suplantaciones y errores de configuración.",
    for: "Dominios con correo corporativo",
    input: "Dominio o correo",
    output: "Estado de SPF, DKIM, DMARC y plan de corrección",
  },
  {
    slug: "email-breach",
    type: "email_breach",
    name: "Vulneración de correo",
    description: "Revisa si un email ha aparecido en filtraciones de datos conocidas.",
    for: "Cuentas personales o empresa",
    input: "Email",
    output: "Nivel de exposición y medidas inmediatas",
  },
  {
    slug: "speed-test",
    type: "speed_test",
    name: "Test de velocidad",
    description: "Mide el rendimiento de tu web y su impacto en experiencia de usuario.",
    for: "Tiendas, landings y webs de negocio",
    input: "URL web",
    output: "Score de rendimiento y acciones priorizadas",
  },
  {
    slug: "domain-security",
    type: "domain_security",
    name: "Seguridad del dominio",
    description: "Analiza la salud básica DNS para reducir riesgos técnicos.",
    for: "Cualquier dominio activo",
    input: "Dominio o URL",
    output: "Diagnóstico DNS y recomendaciones claras",
  },
  {
    slug: "gdpr-web",
    type: "gdpr_web",
    name: "Estado RGPD web",
    description: "Evalúa señales técnicas de cumplimiento de cookies y transparencia.",
    for: "Webs con formularios, analytics o cookies",
    input: "URL web",
    output: "Resumen RGPD técnico + pasos de mejora",
  },
  {
    slug: "web-security",
    type: "web_security",
    name: "Seguridad de tu página web",
    description: "Detecta debilidades visibles en HTTPS y cabeceras de seguridad.",
    for: "Sitios web públicos",
    input: "URL web",
    output: "Postura de seguridad web y plan de acción",
  },
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
  badge: document.querySelector("#topApiBadge, #apiBadge"),
  grid: document.getElementById("toolGrid"),
  title: document.querySelector("h1"),
  search: document.getElementById("toolSearch"),
  empty: document.getElementById("toolEmpty")
};

/**
 * Devuelve una etiqueta de dificultad para orientar a usuarios sin perfil técnico.
 */
function getDifficultyLabel(toolType) {
  if (toolType === "email_security" || toolType === "gdpr_web") return "Guiada";
  if (toolType === "web_security" || toolType === "domain_security") return "Intermedia";
  return "Rápida";
}

/**
 * Construye el bloque visual de una herramienta con foco en lectura clara.
 */
function buildToolCardMarkup(tool) {
  return `
    <a class="tool-link" href="./tool-${tool.slug}.html">
      <article class="tool-card glass">
        <div class="card-top">
          <div class="card-headline">
            <div class="icon-wrap">${TOOL_ICONS[tool.type] || ""}</div>
            <div>
              <h3 class="tool-name">${tool.name}</h3>
              <p class="tool-description">${tool.description}</p>
            </div>
          </div>
        </div>
        <div class="tool-meta-grid">
          <p class="tool-for"><strong>Ideal para:</strong> ${tool.for}</p>
          <p class="tool-for"><strong>Qué necesitas:</strong> ${tool.input}</p>
          <p class="tool-for"><strong>Qué obtienes:</strong> ${tool.output}</p>
          <p class="tool-for"><strong>Nivel:</strong> ${getDifficultyLabel(tool.type)}</p>
        </div>
        <span class="open-link">Abrir guía y análisis</span>
      </article>
    </a>
  `;
}

function renderTools(filter = "") {
  const q = filter.trim().toLowerCase();
  const visibleTools = TOOLS.filter((tool) => {
    if (!q) return true;
    const haystack = `${tool.name} ${tool.description} ${tool.type} ${tool.for}`.toLowerCase();
    return haystack.includes(q);
  });

  el.grid.innerHTML = visibleTools.map((tool) => buildToolCardMarkup(tool)).join("");

  if (el.empty) {
    el.empty.hidden = visibleTools.length > 0;
  }
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
  if (el.search) {
    el.search.addEventListener("input", () => renderTools(el.search.value));
  }

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
