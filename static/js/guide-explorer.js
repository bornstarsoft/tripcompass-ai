(() => {
  const root = document.querySelector("[data-guide-experience]");
  if (!root) return;
  const key = "tripcompass.saved-guides.v1";
  const allowed = new Set(root.dataset.guideIds.split(","));
  const ko = document.documentElement.lang === "ko";
  const feedback = root.querySelector("[data-guide-feedback]");
  const buttons = [...root.querySelectorAll("[data-save-guide]")];
  const cards = [...root.querySelectorAll("[data-explore-card]")];
  const controls = root.querySelector("[data-explore-controls]");
  const search = root.querySelector("[data-guide-search]");
  const filters = [...root.querySelectorAll('input[name="guide-interest"]')];
  const count = root.querySelector("[data-explore-count]");
  const empty = root.querySelector("[data-explore-empty]");
  const reset = root.querySelector("[data-explore-reset]");
  const savedContext = root.querySelector("[data-explore-saved-context]");
  const emptyTitle = root.querySelector("[data-explore-empty-title]");
  const emptyDescription = root.querySelector("[data-explore-empty-description]");
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase().trim();
  const parse = value => {
    const ids = JSON.parse(value || "[]");
    return new Set(Array.isArray(ids) ? ids.filter(id => allowed.has(id)) : []);
  };
  let saved = new Set();
  let memoryOnly = false;
  try { saved = parse(localStorage.getItem(key)); } catch { /* Storage is optional. */ }
  let interest = "all";
  const viewKey = "tripcompassExplorerView";

  function restoreView() {
    if (!controls) return;
    try {
      const view = window.history.state?.[viewKey];
      const valid = view?.version === 1 && view.path === window.location.pathname &&
        filters.some(filter => filter.value === view.interest) &&
        typeof view.search === "string" && view.search.length <= 100;
      interest = valid ? view.interest : "all";
      search.value = valid ? view.search : "";
      filters.forEach(filter => { filter.checked = filter.value === interest; });
    } catch { /* History is optional; current filtering remains usable. */ }
  }

  function rememberView() {
    if (!controls) return;
    try {
      const state = window.history.state;
      if (state !== null && (typeof state !== "object" || Array.isArray(state))) return;
      // Keep search text out of URLs and preserve unrelated history-entry state.
      window.history.replaceState({ ...state, [viewKey]: {
        version: 1, path: window.location.pathname, interest, search: search.value.slice(0, 100)
      } }, "");
    } catch { /* A blocked or rate-limited history write must not stop filtering. */ }
  }

  function render() {
    for (const button of buttons) {
      const selected = saved.has(button.dataset.saveGuide);
      const label = selected ? (ko ? "저장 해제" : "Remove saved guide") : (ko ? "글 저장" : "Save guide");
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${label}: ${button.dataset.guideTitle}`);
      button.querySelector("[data-save-label]").textContent = label;
    }
    if (!cards.length) return;
    const terms = normalize(search.value.slice(0, 100)).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const matchesInterest = interest === "all" || (interest === "saved"
        ? saved.has(card.dataset.exploreCard) : card.dataset.interests.split(" ").includes(interest));
      const haystack = normalize(card.dataset.search);
      card.hidden = !matchesInterest || !terms.every(term => haystack.includes(term));
      if (!card.hidden) visible++;
    }
    count.textContent = ko ? `${cards.length}개 중 ${visible}개 가이드` : `${visible} of ${cards.length} guides`;
    if (savedContext) savedContext.hidden = interest !== "saved";
    for (const element of [emptyTitle, emptyDescription]) {
      if (element) element.textContent = element.dataset[interest === "saved" ? "saved" : "default"];
    }
    empty.hidden = visible !== 0;
  }

  for (const button of buttons) {
    const id = button.dataset.saveGuide;
    if (!allowed.has(id)) continue;
    button.addEventListener("click", () => {
      // Merge other tabs' changes without discarding this page's memory-only fallback.
      try {
        if (!memoryOnly) saved = parse(localStorage.getItem(key));
      } catch { /* Keep the current page's selections. */ }
      const removing = saved.has(id);
      if (removing) saved.delete(id); else saved.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...saved]));
        memoryOnly = false;
        feedback.textContent = removing ? (ko ? "저장한 글에서 제외했습니다." : "Removed from saved guides.")
          : (ko ? "이 브라우저에 저장했습니다." : "Saved in this browser.");
      } catch {
        memoryOnly = true;
        feedback.textContent = ko ? "브라우저 저장을 사용할 수 없어 이 페이지에서만 유지됩니다."
          : "Browser storage is unavailable; choices stay on this page only.";
      }
      render();
      if (interest === "saved" && removing) {
        const firstVisible = cards.find(card => !card.hidden);
        (firstVisible?.querySelector("[data-save-guide]") || reset).focus();
      }
    });
    button.hidden = false;
  }
  if (controls) {
    // Align DOM controls and filtering even if native form restoration differs.
    search.value = "";
    filters.forEach(filter => { filter.checked = filter.value === "all"; });
    restoreView();
    for (const filter of filters) filter.addEventListener("change", () => {
      if (filter.checked) { interest = filter.value; render(); rememberView(); }
    });
    const searchChanged = () => { render(); rememberView(); };
    search.addEventListener("input", searchChanged);
    search.addEventListener("search", searchChanged);
    reset.addEventListener("click", () => {
      interest = "all";
      search.value = "";
      filters.forEach(filter => { filter.checked = filter.value === "all"; });
      render();
      rememberView();
      filters[0].focus();
    });
    window.addEventListener("popstate", () => { restoreView(); render(); });
    controls.hidden = false;
  }
  window.addEventListener("storage", event => {
    if (memoryOnly) return;
    if (event.key !== key && event.key !== null) return;
    try { saved = parse(event.key === null ? null : event.newValue); render(); } catch { /* Ignore invalid data. */ }
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) restoreView();
    if (event.persisted && !memoryOnly) {
      try { saved = parse(localStorage.getItem(key)); } catch { /* Storage is optional. */ }
    }
    render();
  });
  render();
})();
