(() => {
  const explicit = window.__NIMBUS_API_BASE__;
  if (typeof explicit === "string" && explicit.trim()) {
    window.NIMBUS_API_BASE = explicit.trim().replace(/\/+$/, "");
    return;
  }
  window.NIMBUS_API_BASE = `${window.location.origin}/api`;
})();
