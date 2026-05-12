(() => {
  const API_BASE = window.NIMBUS_API_BASE || "http://localhost:3000/api";
  const THEME_KEY = "nimbus_theme_mode";
  const root = document.documentElement;

  function resolveTheme(mode) {
    if (mode === "dark" || mode === "light") return mode;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyThemeMode(mode) {
    root.setAttribute("data-theme", resolveTheme(mode));
  }

  function getThemeOverride() {
    return localStorage.getItem(THEME_KEY) || "";
  }

  function setThemeOverride(mode) {
    if (!mode || mode === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  }

  function nextMode(mode) {
    if (mode === "system") return "dark";
    if (mode === "dark") return "light";
    return "system";
  }

  function modeMeta(mode) {
    if (mode === "dark") return { icon: "moon", label: "Oscuro" };
    if (mode === "light") return { icon: "sun", label: "Claro" };
    return { icon: "system", label: "Sistema" };
  }

  function iconSvg(name) {
    if (name === "moon") {
      return '<svg viewBox="0 0 24 24" class="theme-icon-svg" aria-hidden="true"><path d="M18 14.2A7.2 7.2 0 1 1 9.8 6 5.8 5.8 0 0 0 18 14.2Z"/></svg>';
    }
    if (name === "sun") {
      return '<svg viewBox="0 0 24 24" class="theme-icon-svg" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" class="theme-icon-svg" aria-hidden="true"><rect x="3.5" y="4" width="17" height="12" rx="2"/><path d="M9 20h6M12 16v4"/></svg>';
  }

  function modeMarkup(mode) {
    const meta = modeMeta(mode);
    return `${iconSvg(meta.icon)}<span class="theme-text">${meta.label}</span>`;
  }

  function ensureHeaderThemeButton(initialMode) {
    if (document.getElementById("themeToggleBtn")) return;
    const themeMount = document.getElementById("themeMount");
    if (!themeMount) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "themeToggleBtn";
    btn.className = "theme-toggle-btn";
    btn.innerHTML = modeMarkup(initialMode);
    btn.title = "Cambiar tema";
    btn.setAttribute("aria-label", "Cambiar tema");

    btn.addEventListener("click", () => {
      const current = localStorage.getItem(THEME_KEY) || "system";
      const mode = nextMode(current);
      setThemeOverride(mode);
      applyThemeMode(mode);
      btn.innerHTML = modeMarkup(mode);
    });

    themeMount.appendChild(btn);
  }

  async function apply() {
    try {
      const res = await fetch(`${API_BASE}/settings/public`);
      if (!res.ok) return;
      const settings = await res.json();
      if (settings.accentColor) {
        root.style.setProperty("--accent", settings.accentColor);
      }
      const override = getThemeOverride();
      const theme = override || settings.themeMode || "system";
      applyThemeMode(theme);
      ensureHeaderThemeButton(theme);

      const heading = document.querySelector(".eyebrow");
      if (heading && settings.brandName) {
        heading.textContent = settings.brandName;
      }
    } catch {}
  }

  void apply();
})();
