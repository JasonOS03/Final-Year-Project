const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

if ("serviceWorker" in navigator && (window.isSecureContext || isLocalhost)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}
