const KEY = "tripcompassGuideView";

export function mountGuideHistory(doc, win) {
  const noop = { restore: () => false };
  try { if (!win.history?.replaceState) return noop; } catch { return noop; }
  const panels = [...doc.querySelectorAll("[data-guide-return]")];
  const active = () => panels.filter(panel => panel.dataset.guideReturn === win.location.hash);
  const address = () => win.location.pathname + win.location.search + win.location.hash;
  let traversalAddress = null;
  let revision = 0;

  for (const panel of panels) for (const link of panel.querySelectorAll("[data-guide-all-link]")) {
    link.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
      const current = active();
      if (!current.includes(panel) || panel.hidden || !link.getClientRects().length) return;
      try {
        const destination = new URL(link.href, win.location.href);
        if (destination.origin !== win.location.origin || destination.href === win.location.href) return;
        const state = win.history.state;
        if (state !== null && (typeof state !== "object" || Array.isArray(state))) return;
        // Per-entry UI only: never store trip records or change native link navigation.
        win.history.replaceState({ ...state, [KEY]: {
          version: 1, address: address(),
          open: current.map(item => item.querySelector("[data-guide-checklist]").open),
          panel: current.indexOf(panel), task: link.dataset.guideAllLink,
          x: win.scrollX, y: win.scrollY, offset: link.getBoundingClientRect().top
        } }, "");
      } catch { /* Native navigation still works if history state is unavailable. */ }
    });
  }

  function restore(event) {
    const id = ++revision;
    const here = address();
    const traversal = event?.type === "popstate" || event?.persisted ||
      (event?.type === "pageshow" && win.performance?.getEntriesByType?.("navigation")?.[0]?.type === "back_forward") ||
      (event?.type === "hashchange" && traversalAddress === here);
    traversalAddress = event?.type === "popstate" ? here : null;
    if (!traversal) return false;
    try {
      const saved = win.history.state?.[KEY];
      const current = active();
      if (!saved || saved.version !== 1 || saved.address !== here || !current.length ||
          !Array.isArray(saved.open) || saved.open.length !== current.length || saved.open.some(value => typeof value !== "boolean") ||
          !Number.isInteger(saved.panel) || saved.panel < 0 || saved.panel >= current.length ||
          ![saved.x, saved.y, saved.offset].every(Number.isFinite) || saved.x < 0 || saved.y < 0) return false;
      const panel = current[saved.panel];
      const link = [...panel.querySelectorAll("[data-guide-all-link]")].find(link => link.dataset.guideAllLink === saved.task);
      if (!link) return false;
      current.forEach((item, index) => { item.querySelector("[data-guide-checklist]").open = saved.open[index]; });
      // Let native history scrolling finish before restoring the clicked link's viewport position.
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
        if (revision !== id || address() !== here) return;
        if (panel.querySelector("[data-guide-progress]").hidden) {
          const fallback = panel.querySelector("[data-guide-return-link]");
          fallback.focus({ preventScroll: true });
          fallback.scrollIntoView({ block: "start", behavior: "instant" });
          return;
        }
        if (link.getClientRects().length) {
          link.focus({ preventScroll: true });
          win.scrollTo({ left: saved.x, top: Math.max(0, win.scrollY + link.getBoundingClientRect().top - saved.offset), behavior: "instant" });
        } else {
          win.scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
        }
      }));
      return true;
    } catch { return false; }
  }
  return { restore };
}
