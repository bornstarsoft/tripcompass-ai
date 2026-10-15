import { TRIPS } from "./trip-prep-core.js";
import { parseReading } from "./trip-reading.js";

export const UNDO_TTL = 120000;
export const UNDO_KEYS = Object.fromEntries(Object.keys(TRIPS).map(city => [city, `tripcompass.reading-undo.${city}.v1`]));
const ENTRY = "tripcompassReadingUndoEntry";
export const undoFresh = at => Number.isFinite(at) && Date.now() >= at && Date.now() - at < UNDO_TTL;

// Only reload of this history entry may consume the outgoing document's snapshot.
export function readingUndoReload(win) {
  let previous = null, entry = null, reload = false;
  const path = win.location?.pathname;
  function renew() {
    entry = null;
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
    if (!["/my-trips/", "/ko/my-trips/"].includes(path) ||
        (state !== null && (typeof state !== "object" || Array.isArray(state)))) throw Error("invalid");
    previous = state?.[ENTRY];
    reload = win.performance.getEntriesByType("navigation")[0]?.type === "reload";
    renew();
  } catch { entry = null; }
  function discard(city) {
    try { win.sessionStorage.removeItem(UNDO_KEYS[city]); } catch { /* Optional tab storage. */ }
  }
  return {
    take(city) {
      try {
        const raw = win.sessionStorage.getItem(UNDO_KEYS[city]);
        // A denied consume is not accepted; the rotated entry also prevents replay.
        win.sessionStorage.removeItem(UNDO_KEYS[city]);
        if (!entry || !reload || !raw || raw.length > 4096) return null;
        const saved = JSON.parse(raw);
        if (saved?.version !== 1 || saved.entry !== previous?.id || previous?.path !== path ||
            saved.path !== path || !undoFresh(saved.at)) return null;
        const record = parseReading(saved.raw, city);
        return record ? { raw: saved.raw, record, at: saved.at } : null;
      } catch { return null; }
    },
    save(city, removed) {
      discard(city);
      try {
        if (!entry || !removed || !undoFresh(removed.at)) return;
        win.sessionStorage.setItem(UNDO_KEYS[city], JSON.stringify({ version: 1, entry: entry.id, path, raw: removed.raw, at: removed.at }));
      } catch { /* Immediate undo still works when reload persistence is unavailable. */ }
    },
    discard,
    renew
  };
}
