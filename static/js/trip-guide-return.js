import { MY_TRIPS_PATHS, isMyTripsAnchor } from "./my-trips-location.js";

export function mountGuideReturn(doc, win) {
  const panels = [...doc.querySelectorAll("[data-guide-return]")];
  const overview = MY_TRIPS_PATHS.includes(win.location.pathname) && doc.querySelector("[data-my-trips]");
  const languages = [...doc.querySelectorAll("[data-language-switcher] a")].map(link => ({ link, href: link.getAttribute("href") }));

  function showReturn() {
    // Only contexts generated from this article's task mappings are accepted.
    const context = panels.find(panel => panel.dataset.guideReturn === win.location.hash)?.dataset.guideReturn;
    for (const panel of panels) panel.hidden = panel.dataset.guideReturn !== context;
    const hash = win.location.hash;
    const section = overview && isMyTripsAnchor(hash) && doc.getElementById(hash.slice(1));
    const overviewHash = section && overview.contains(section) && !section.closest("[hidden]") ? hash : "";
    for (const { link, href } of languages) {
      if (overview && !MY_TRIPS_PATHS.includes(href)) continue;
      link.setAttribute("href", href + (context || overviewHash));
    }
  }

  function focusTask() {
    const row = [...doc.querySelectorAll("[data-trip-task-row]")].find(item => `#${item.id}` === win.location.hash);
    if (!row) return;
    const checkbox = row.querySelector("input");
    const target = checkbox && !checkbox.disabled && checkbox.getClientRects().length
      ? checkbox : row.closest("[data-trip-summary]").querySelector("[data-trip-action]");
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }

  showReturn();
  win.addEventListener("hashchange", () => { showReturn(); focusTask(); });
  // pageshow runs after the overview modules restore saved checks, including history restores.
  win.addEventListener("pageshow", () => { showReturn(); focusTask(); });
}

if (typeof document !== "undefined") mountGuideReturn(document, window);
