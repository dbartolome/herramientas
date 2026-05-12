(() => {
  const toolLinks = [
    { href: "./tool-email-security.html", label: "Seguridad del correo" },
    { href: "./tool-email-breach.html", label: "Vulneración de correo" },
    { href: "./tool-web-security.html", label: "Seguridad web" },
    { href: "./tool-domain-security.html", label: "Seguridad del dominio" },
    { href: "./tool-speed-test.html", label: "Test de velocidad" },
    { href: "./tool-gdpr-web.html", label: "Estado RGPD web" },
  ];

  const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isActiveTool = toolLinks.some((item) => item.href.replace("./", "").toLowerCase() === path);

  const nav = document.createElement("nav");
  nav.className = "app-nav";
  nav.innerHTML = `
    <div class="app-nav-inner">
      <a class="app-brand" href="./index.html">
        <img src="./assets/nimbus-logo.svg" alt="Nimbus" class="app-brand-logo" />
      </a>
      <div class="app-nav-actions">
        <div id="themeMount"></div>
        <a class="app-nav-link" href="./mi-cuenta.html">Mi cuenta</a>
        <a class="app-nav-link" href="./admin-tools.html">Administrador herramientas</a>
        <span id="topApiBadge" class="status-chip">API: comprobando...</span>
        <details class="tool-menu ${isActiveTool ? "is-current" : ""}">
          <summary>Nimbus Tool</summary>
          <div class="tool-menu-list">
            ${toolLinks.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
          </div>
        </details>
      </div>
    </div>
  `;

  document.body.prepend(nav);
})();
