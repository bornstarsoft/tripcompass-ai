export function mountGuideReturn(doc, win) {
  const panels = [...doc.querySelectorAll("[data-guide-return]")];
  const languages = [...doc.querySelectorAll("[data-language-switcher] a")].map(link => ({ link, href: link.getAttribute("href") }));

  function showReturn() {
    // Only contexts generated from this article's task mappings are accepted.
    const context = panels.find(panel => panel.dataset.guideReturn === win.location.hash)?.dataset.guideReturn;
    for (const panel of panels) panel.hidden = panel.dataset.guideReturn !== context;
    for (const { link, href } of languages) link.setAttribute("href", href + (context || ""));
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
