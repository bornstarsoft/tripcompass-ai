(function () {
  const storageKey = "tripcompass.language";
  const suggestionKey = "tripcompass.languageSuggestionDismissed";
  const root = document.documentElement;
  const pageLanguage = root.dataset.language || root.lang || "en";
  const suggestion = document.querySelector("[data-language-suggestion]");
  const closeButton = document.querySelector("[data-language-suggestion-close]");

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  }

  document.querySelectorAll("[data-language-option]").forEach((option) => {
    const optionLanguage = option.getAttribute("data-language-option");
    if (!optionLanguage) {
      return;
    }

    if (optionLanguage === pageLanguage) {
      option.setAttribute("aria-current", "true");
    }

    option.addEventListener("click", () => {
      storageSet(storageKey, optionLanguage);
    });
  });

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      storageSet(suggestionKey, "true");
      if (suggestion) {
        suggestion.hidden = true;
      }
    });
  }

  const browserLanguage = (navigator.language || "").toLowerCase();
  const hasStoredLanguage = Boolean(storageGet(storageKey));
  const suggestionDismissed = storageGet(suggestionKey) === "true";
  const isEnglishHome = root.dataset.language === "en" && (window.location.pathname === "/" || window.location.pathname === "/index.html");

  if (suggestion && isEnglishHome && browserLanguage.startsWith("ko") && !hasStoredLanguage && !suggestionDismissed) {
    suggestion.hidden = false;
  }
})();
