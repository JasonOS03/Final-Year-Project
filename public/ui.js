window.showActionStatus = function(message, type = "info", timeout = 3000) {
  let region = document.getElementById("global-status-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "global-status-region";
    region.setAttribute("aria-live", "polite");
    region.style.position = "fixed";
    region.style.top = "1rem";
    region.style.right = "1rem";
    region.style.zIndex = "2000";
    region.style.maxWidth = "24rem";
    document.body.appendChild(region);
  }
  const alert = document.createElement("div");
  const className = type === "error" ? "danger" : type;
  alert.className = `alert alert-${className}`;
  alert.textContent = message;
  alert.setAttribute("role", "status");
  region.appendChild(alert);

  window.setTimeout(() => {
    if (alert.parentNode) {
      alert.parentNode.removeChild(alert);
    }
  }, timeout);
};

window.enhanceModalAccessibility = function(modal, triggerElement = document.activeElement) {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const lastFocused = triggerElement instanceof HTMLElement ? triggerElement : null;

  const trapFocus = event => {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(modal.querySelectorAll(focusableSelector))
      .filter(element => !element.disabled && element.offsetParent !== null);

    if (focusableElements.length === 0) {
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  modal.addEventListener("shown.bs.modal", () => {
    const focusableElements = Array.from(modal.querySelectorAll(focusableSelector))
      .filter(element => !element.disabled && element.offsetParent !== null);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  });

  modal.addEventListener("hidden.bs.modal", () => {
    if (lastFocused) {
      lastFocused.focus();
    }
  });

  modal.addEventListener("keydown", trapFocus);
};
