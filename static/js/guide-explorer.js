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
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase().trim();
  const parse = value => {
    const ids = JSON.parse(value || "[]");
    return new Set(Array.isArray(ids) ? ids.filter(id => allowed.has(id)) : []);
  };
  let saved = new Set();
  let memoryOnly = false;
  try { saved = parse(localStorage.getItem(key)); } catch { /* Storage is optional. */ }
  let interest = "all";

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
    for (const filter of filters) filter.addEventListener("change", () => {
      if (filter.checked) { interest = filter.value; render(); }
    });
    search.addEventListener("input", render);
    search.addEventListener("search", render);
    reset.addEventListener("click", () => {
      interest = "all";
      search.value = "";
      filters.forEach(filter => { filter.checked = filter.value === "all"; });
      render();
      filters[0].focus();
    });
    controls.hidden = false;
  }
  window.addEventListener("storage", event => {
    if (memoryOnly) return;
    if (event.key !== key && event.key !== null) return;
    try { saved = parse(event.key === null ? null : event.newValue); render(); } catch { /* Ignore invalid data. */ }
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted && !memoryOnly) {
      try { saved = parse(localStorage.getItem(key)); render(); } catch { /* Storage is optional. */ }
    }
  });
  render();
})();
