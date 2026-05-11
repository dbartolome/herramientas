(() => {
  const explicit = window.__NIMBUS_API_BASE__;
  if (typeof explicit === "string" && explicit.trim()) {
    window.NIMBUS_API_BASE = explicit.trim().replace(/\/+$/, "");
    return;
  }

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocal) {
    window.NIMBUS_API_BASE = "http://localhost:3000/api";
    return;
  }

  window.NIMBUS_API_BASE = `${window.location.origin}/api`;
})();
