const originalFetch = window.fetch.bind(window);
const isLocalhostHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
const configuredApiBase = (window.GENSAAS_API_BASE || "").replace(/\/$/, "");
const apiBase = configuredApiBase || "";

function resolveApiUrl(input) {
  if (typeof input !== "string") {
    return input;
  }

  if (!input.startsWith("/") || !apiBase) {
    return input;
  }

  return `${apiBase}${input}`;
}

window.fetch = function patchedFetch(input, init = {}) {
  const requestInit = { ...init };

  if (
    typeof input === "string" &&
    input.startsWith("/") &&
    requestInit.credentials === undefined
  ) {
    requestInit.credentials = "include";
  }

  return originalFetch(resolveApiUrl(input), requestInit);
};

if (!isLocalhostHost && !configuredApiBase) {
  console.warn(
    "GENSAAS_API_BASE is not set. Relative API requests will stay same-origin and require a backend on this domain."
  );
}
