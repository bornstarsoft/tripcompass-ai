import { TRIPS } from "./trip-prep-core.js";
import { parseReading } from "./trip-reading.js";

export const UNDO_TTL = 120000;
export const UNDO_KEYS = Object.fromEntries(Object.keys(TRIPS).map(city => [city, `tripcompass.reading-undo.${city}.v1`]));
const ENTRY = "tripcompassReadingUndoEntry";
const PATHS = ["/my-trips/", "/ko/my-trips/"];
const counterpart = (from, to) => from.origin === to.origin && PATHS.includes(from.pathname) &&
  PATHS.includes(to.pathname) && from.pathname !== to.pathname && !to.search && !to.hash;
export const undoFresh = at => Number.isFinite(at) && Date.now() >= at && Date.now() - at < UNDO_TTL;

// Reload uses an entry marker; explicit language navigation uses a checked referrer.
export function readingUndoReload(win, doc) {
  let previous = null, entry = null, navigation = null, language = null;
  const path = win.location?.pathname;
  function renew() {
    entry = null; language = null;
    try {
      const state = win.history.state;
      if (state !== null && (typeof state !== "object" || Array.isArray(state))) return;
      const next = { id: win.crypto.randomUUID(), path };
      win.history.replaceState({ ...state, [ENTRY]: next }, "");
      entry = next;
    } catch { /* No reload transfer without an isolated history entry. */ }
  }
  try {
    const state = win.history.state;
    if (!PATHS.includes(path) ||
        (state !== null && (typeof state !== "object" || Array.isArray(state)))) throw Error("invalid");
    previous = state?.[ENTRY];
    navigation = win.performance.getEntriesByType("navigation")[0]?.type;
    renew();
  } catch { entry = null; }
  function discard(city) {
    try { win.sessionStorage.removeItem(UNDO_KEYS[city]); } catch { /* Optional tab storage. */ }
  }
  doc?.addEventListener?.("click", event => {
    language = null;
    const link = event.target?.closest?.("[data-language-switcher] a[data-language-option]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
    try {
      const from = new URL(win.location.origin + path), to = new URL(link.href, from);
      if (counterpart(from, to)) language = { from: from.href, to: to.href, event };
    } catch { /* A malformed link must not prevent normal navigation. */ }
  }, true);
  function languageArrival(saved) {
    try {
      if (navigation !== "navigate" || saved.language?.to !== win.location.href) return false;
      const from = new URL(saved.language.from), here = new URL(win.location.href), ref = new URL(doc.referrer);
      return counterpart(from, here) && saved.path === from.pathname &&
        ref.origin === from.origin && ref.pathname === from.pathname;
    } catch { return false; }
  }
  return {
    take(city) {
      try {
        const raw = win.sessionStorage.getItem(UNDO_KEYS[city]);
        // A denied consume is not accepted; the rotated entry also prevents replay.
        win.sessionStorage.removeItem(UNDO_KEYS[city]);
        if (!entry || !raw || raw.length > 4096) return null;
        const saved = JSON.parse(raw);
        if (saved?.version !== 1 || !undoFresh(saved.at)) return null;
        const reloaded = navigation === "reload" && saved.entry === previous?.id && previous?.path === path && saved.path === path;
        if (!reloaded && !languageArrival(saved)) return null;
        const record = parseReading(saved.raw, city);
        return record ? { raw: saved.raw, record, at: saved.at } : null;
      } catch { return null; }
    },
    save(city, removed) {
      discard(city);
      try {
        if (!entry || !removed || !undoFresh(removed.at)) return;
        const transfer = language && !language.event.defaultPrevented ? { from: language.from, to: language.to } : null;
        win.sessionStorage.setItem(UNDO_KEYS[city], JSON.stringify({ version: 1, entry: entry.id, path, raw: removed.raw, at: removed.at, language: transfer }));
      } catch { /* Immediate undo still works when reload persistence is unavailable. */ }
    },
    discard,
    renew
  };
}
