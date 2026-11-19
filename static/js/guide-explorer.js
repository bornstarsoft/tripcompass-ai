(() => {
  const root = document.querySelector("[data-guide-experience]");
  if (!root) return;
  const key = "tripcompass.saved-guides.v1";
  const allowed = new Set(root.dataset.guideIds.split(","));
  const ko = document.documentElement.lang === "ko";
  const feedback = root.querySelector("[data-guide-feedback]");
  const buttons = [...root.querySelectorAll("[data-save-guide]")];
  const savedReturn = root.querySelector("[data-saved-guide-return]");
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
  const libraryOnly = root.querySelector("[data-library-saved-only]");
  const libraryCount = root.querySelector("[data-library-count]");
  const libraryCompare = root.querySelector("[data-library-compare]");
  const libraryGroups = libraryOnly ? [...root.querySelectorAll("[data-library-group]")].map(group => ({
    group, items: [...group.querySelectorAll("[data-library-item]")].map(row => ({
      row, id: row.querySelector("[data-save-guide]")?.dataset.saveGuide
    }))
  })) : [];
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase().trim();
  const parse = value => {
    const ids = JSON.parse(value || "[]");
    return new Set(Array.isArray(ids) ? ids.filter(id => allowed.has(id)) : []);
  };
  let saved = new Set();
  let memoryOnly = false;
  let savedUnavailable = false;
  function loadSaved(read) {
    try {
      saved = parse(read());
      savedUnavailable = false;
      return true;
    } catch { savedUnavailable = true; return false; }
  }
  loadSaved(() => localStorage.getItem(key));
  let interest = "all";
  const viewKey = "tripcompassExplorerView";
  const libraryViewKey = "tripcompassItineraryView";

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

  function rememberEntryView(key, view) {
    try {
      const state = window.history.state;
      if (state !== null && (typeof state !== "object" || Array.isArray(state))) return;
      window.history.replaceState({ ...state, [key]: view }, "");
    } catch { /* A blocked or rate-limited history write must not stop filtering. */ }
  }

  function rememberView() {
    rememberEntryView(viewKey, {
      version: 1, path: window.location.pathname, interest, search: search.value.slice(0, 100)
    });
  }

  function restoreLibraryView() {
    try {
      const view = window.history.state?.[libraryViewKey];
      libraryOnly.checked = view?.version === 1 && view.path === window.location.pathname && view.savedOnly === true;
    } catch { /* Leave the current checkbox usable if the browser blocks history. */ }
  }

  function render() {
    for (const button of buttons) {
      const selected = saved.has(button.dataset.saveGuide);
      const label = selected ? (ko ? "저장 해제" : "Remove saved guide") : (ko ? "글 저장" : "Save guide");
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${label}: ${button.dataset.guideTitle}`);
      button.querySelector("[data-save-label]").textContent = label;
    }
    if (savedReturn) {
      const id = savedReturn.dataset.savedGuideReturn;
      const show = saved.has(id) && !memoryOnly && !savedUnavailable;
      if (!show && document.activeElement === savedReturn) buttons.find(button => button.dataset.saveGuide === id)?.focus();
      savedReturn.hidden = !show;
    }
    renderLibrary();
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

  function renderLibrary() {
    if (!libraryOnly) return;
    let visible = 0;
    for (const { group, items } of libraryGroups) {
      let groupVisible = false;
      for (const { row, id } of items) {
        const show = !libraryOnly.checked || saved.has(id);
        if (!show && row.contains(document.activeElement)) libraryOnly.focus();
        row.hidden = !show;
        if (show) { groupVisible = true; visible++; }
      }
      group.hidden = !groupVisible;
    }
    libraryCount.hidden = !libraryOnly.checked;
    if (libraryCompare) {
      const hideCompare = !libraryOnly.checked || visible < 2 || savedUnavailable || memoryOnly;
      if (hideCompare && document.activeElement === libraryCompare) libraryOnly.focus();
      libraryCompare.hidden = hideCompare;
    }
    const label = savedUnavailable && !memoryOnly
      ? (ko ? "저장한 가이드 목록을 읽을 수 없어요." : "Your saved guides could not be read.")
      : visible === 0 ? (ko ? "이 목록에 저장한 가이드가 아직 없어요." : "No saved guides in this list yet.")
      : (ko ? `저장한 가이드 ${visible}개` : `${visible} saved ${visible === 1 ? "guide" : "guides"}`);
    if (libraryOnly.checked && libraryCount.textContent !== label) libraryCount.textContent = label;
  }

  for (const button of buttons) {
    const id = button.dataset.saveGuide;
    if (!allowed.has(id)) continue;
    button.addEventListener("click", () => {
      // Merge other tabs' changes without discarding this page's memory-only fallback.
      if (!memoryOnly) loadSaved(() => localStorage.getItem(key));
      const removing = saved.has(id);
      if (removing) saved.delete(id); else saved.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...saved]));
        memoryOnly = false;
        savedUnavailable = false;
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
  if (libraryOnly) {
    restoreLibraryView();
    libraryOnly.addEventListener("change", () => {
      renderLibrary();
      rememberEntryView(libraryViewKey, { version: 1, path: window.location.pathname, savedOnly: libraryOnly.checked });
    });
    window.addEventListener("popstate", () => { restoreLibraryView(); renderLibrary(); });
    root.querySelector("[data-library-filter]").hidden = false;
  }
  window.addEventListener("storage", event => {
    if (memoryOnly) return;
    if (event.key !== key && event.key !== null) return;
    if (loadSaved(() => event.key === null ? null : event.newValue) || libraryOnly || savedReturn) render();
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) {
      restoreView();
      if (libraryOnly) restoreLibraryView();
    }
    if (event.persisted && !memoryOnly) {
      loadSaved(() => localStorage.getItem(key));
    }
    render();
  });
  render();
})();
