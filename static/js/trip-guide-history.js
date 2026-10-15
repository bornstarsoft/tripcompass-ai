import { mountGuideLanguage } from "./trip-guide-language.js";

const KEY = "tripcompassGuideView";
const ENTRY = "tripcompassGuideEntry";
const RELOAD = "tripcompass.guide-view.v1";

export function mountGuideHistory(doc, win) {
  const noop = { restore: () => false };
  try { if (!win.history?.replaceState) return noop; } catch { return noop; }
  const panels = [...doc.querySelectorAll("[data-guide-return]")];
  const active = () => panels.filter(panel => panel.dataset.guideReturn === win.location.hash);
  const address = () => win.location.pathname + win.location.search + win.location.hash;
  const languageView = mountGuideLanguage(doc, win, active, () => rememberDeparture());
  let traversalAddress = null;
  let revision = 0;
  let departing = null;

  function ensureEntry() {
    try {
      if (!active().length) return;
      const state = win.history.state;
      if (state !== null && (typeof state !== "object" || Array.isArray(state))) return;
      if (state?.[ENTRY]?.address === address() && typeof state[ENTRY].id === "string") return;
      if (!win.crypto?.randomUUID) return;
      win.history.replaceState({ ...state, [ENTRY]: { address: address(), id: win.crypto.randomUUID() } }, "");
    } catch { /* A denied entry marker must not prevent reading or navigation. */ }
  }
  ensureEntry();

  function remember(panel, link) {
    try {
      const current = active();
      if (!current.length || current.some(item => item.hidden || item.querySelector("[data-guide-progress]").hidden)) return;
      if (!current.includes(panel)) panel = current.find(item => item.contains(doc.activeElement)) || current[0];
      const state = win.history.state;
      if (state !== null && (typeof state !== "object" || Array.isArray(state))) return;
      // Per-entry UI only: never store trip records or change native navigation.
      const saved = {
        version: 1, address: address(),
        open: current.map(item => item.querySelector("[data-guide-checklist]").open),
        panel: current.indexOf(panel), task: link?.dataset.guideAllLink ?? null,
        x: win.scrollX, y: win.scrollY, offset: link ? link.getBoundingClientRect().top : 0
      };
      // Reload can capture history before pagehide; keep one tab-local UI snapshot.
      if (state?.[ENTRY]?.address === address() && typeof state[ENTRY].id === "string") {
        try { win.sessionStorage.setItem(RELOAD, JSON.stringify({ entry: state[ENTRY].id, saved })); } catch { /* Optional UI persistence only. */ }
      }
      win.history.replaceState({ ...state, [KEY]: saved }, "");
    } catch { /* Navigation still works if history state is unavailable. */ }
  }

  function rememberDeparture() {
    const target = departing;
    if (target && active().includes(target.panel) && target.link.getClientRects().length) remember(target.panel, target.link);
    else {
      const panel = active().find(item => [...item.querySelectorAll("[data-guide-all-link]")].includes(doc.activeElement));
      remember(panel, panel ? doc.activeElement : null);
    }
  }
  // pagehide covers reload without disabling BFCache; hidden covers mobile suspension.
  win.addEventListener("pagehide", () => { revision++; rememberDeparture(); });
  doc.addEventListener("visibilitychange", () => { if (doc.visibilityState === "hidden") rememberDeparture(); });

  for (const panel of panels) for (const link of panel.querySelectorAll("[data-guide-all-link]")) {
    link.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
      const current = active();
      if (!current.includes(panel) || panel.hidden || !link.getClientRects().length) return;
      try {
        const destination = new URL(link.href, win.location.href);
        if (destination.origin !== win.location.origin || destination.href === win.location.href) return;
        departing = { panel, link };
        remember(panel, link);
      } catch { /* Native navigation still works if history state is unavailable. */ }
    });
  }

  function restore(event) {
    departing = null;
    ensureEntry();
    const id = ++revision;
    const here = address();
    const traversal = event?.type === "popstate" || event?.persisted ||
      (event?.type === "pageshow" && ["back_forward", "reload"].includes(win.performance?.getEntriesByType?.("navigation")?.[0]?.type)) ||
      (event?.type === "hashchange" && traversalAddress === here);
    traversalAddress = event?.type === "popstate" ? here : null;
    const translated = languageView.take(event);
    if (!traversal && !translated) return false;
    try {
      const state = win.history.state;
      let saved = translated || state?.[KEY];
      if (event?.type === "pageshow" && win.performance?.getEntriesByType?.("navigation")?.[0]?.type === "reload") {
        try {
          const snapshot = JSON.parse(win.sessionStorage.getItem(RELOAD));
          if (state?.[ENTRY]?.address === here && typeof state[ENTRY].id === "string" && snapshot?.entry === state[ENTRY].id) saved = snapshot.saved;
        } catch { /* Fall back to available history state if tab storage is blocked. */ }
      }
      const current = active();
      if (!saved || saved.version !== 1 || saved.address !== here || !current.length ||
          !Array.isArray(saved.open) || saved.open.length !== current.length || saved.open.some(value => typeof value !== "boolean") ||
          !Number.isInteger(saved.panel) || saved.panel < 0 || saved.panel >= current.length ||
          ![saved.x, saved.y, saved.offset].every(Number.isFinite) || saved.x < 0 || saved.y < 0) return false;
      const panel = current[saved.panel];
      const link = [...panel.querySelectorAll("[data-guide-all-link]")].find(link => link.dataset.guideAllLink === saved.task);
      if (saved.task !== null && !link) return false;
      current.forEach((item, index) => { item.querySelector("[data-guide-checklist]").open = saved.open[index]; });
      // Let native scrolling finish, then restore the link anchor or free reading position.
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
        if (revision !== id || address() !== here) return;
        if (panel.querySelector("[data-guide-progress]").hidden) {
          const fallback = panel.querySelector("[data-guide-return-link]");
          fallback.focus({ preventScroll: true });
          fallback.scrollIntoView({ block: "start", behavior: "instant" });
          return;
        }
        if (translated) {
          win.scrollTo({ left: 0, top: languageView.scrollTop(translated.reading), behavior: "instant" });
          remember(panel);
        } else if (link?.getClientRects().length) {
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
