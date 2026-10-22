export const MOMENTS_KEY = "tripcompass.moments-open.v1";

export function mountTripMoments(doc, win) {
  const details = doc.querySelector("#trip-moments");
  if (!details) return;
  let observed = details.open;
  let unsaved = false;

  function restore() {
    // A BFCache return must not replace a newer choice whose write failed.
    if (unsaved) return;
    try {
      const value = win.sessionStorage.getItem(MOMENTS_KEY);
      if (value !== "open" && value !== "closed") return;
      observed = value === "open";
      details.open = observed;
    } catch { /* Native disclosure remains usable without storage. */ }
  }

  function remember() {
    if (details.open === observed) return;
    observed = details.open;
    try {
      win.sessionStorage.setItem(MOMENTS_KEY, observed ? "open" : "closed");
      unsaved = false;
    } catch { unsaved = true; }
  }

  restore();
  details.addEventListener("toggle", remember);
  // Flush a choice even when navigation precedes the queued toggle event.
  win.addEventListener("pagehide", remember);
  win.addEventListener("pageshow", event => { if (event.persisted) restore(); });
}

if (typeof document !== "undefined") mountTripMoments(document, window);
