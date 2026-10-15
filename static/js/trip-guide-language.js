const TRANSFER = "tripcompass.guide-language.v1";
const MAX_AGE = 120000;
const plainPath = path => path.replace(/^\/ko\//, "/");
const address = url => url.pathname + url.search + url.hash;

export function mountGuideLanguage(doc, win, active, rememberSource = () => {}) {
  const links = [...doc.querySelectorAll("[data-language-switcher] a[data-language-option]")];
  const readingLine = () => Math.max(0, doc.querySelector(".site-header")?.getBoundingClientRect().bottom || 0) + 16;
  const pageRange = () => Math.max(1, doc.documentElement.scrollHeight - win.innerHeight);
  const clamp = value => Math.max(0, Math.min(1, value));
  const visible = node => node && node.getClientRects().length;
  function sections(prose) {
    try {
      const headings = [...prose.querySelectorAll(":scope > h2")];
      const keys = JSON.parse(prose.dataset.guideReadingSections);
      if (!Array.isArray(keys) || keys.length !== headings.length || keys.some(key => typeof key !== "string" || !/^[a-z-]+$/.test(key))) return [];
      // A translated section may span more than one heading (for example, audience).
      return headings.map((node, index) => ({ node, key: keys[index] })).filter((item, index) => keys.indexOf(item.key) === index);
    } catch { return []; }
  }
  const opposite = (from, to) => from.origin === to.origin &&
    plainPath(from.pathname) === plainPath(to.pathname) &&
    from.pathname.startsWith("/ko/") !== to.pathname.startsWith("/ko/") && from.hash === to.hash;

  function panelAnchors(panel) {
    const anchors = [
      ["return", panel.querySelector("[data-guide-return-link]")],
      ["current", panel.querySelector(".guide-task-check")],
      ["progress", panel.querySelector("[data-guide-progress-text]")],
      ["summary", panel.querySelector("summary")],
      ["next", panel.querySelector("[data-guide-next]")]
    ];
    for (const input of panel.querySelectorAll("[data-guide-all-check]")) anchors.push([`task:${input.dataset.guideAllCheck}`, input.closest(".guide-checklist-item")]);
    for (const row of panel.querySelectorAll("[data-guide-remaining-task]")) anchors.push([`remaining:${row.dataset.guideRemainingTask}`, row]);
    return anchors.filter(([, node]) => visible(node));
  }

  function capturePosition(current) {
    const line = readingLine();
    const ratio = clamp(win.scrollY / pageRange());
    for (const [index, panel] of current.entries()) {
      const box = panel.getBoundingClientRect();
      if (box.top > line || box.bottom <= line) continue;
      const anchors = panelAnchors(panel).sort((a, b) => a[1].getBoundingClientRect().top - b[1].getBoundingClientRect().top);
      const entry = anchors.filter(([, node]) => node.getBoundingClientRect().top <= line).at(-1) || anchors[0];
      if (entry) return { kind: "panel", index, key: entry[0], offset: entry[1].getBoundingClientRect().top - line, ratio };
    }
    const prose = doc.querySelector("article .prose");
    const headings = sections(prose);
    const index = headings.findLastIndex(item => item.node.getBoundingClientRect().top <= line);
    if (index >= 0 && prose.getBoundingClientRect().bottom > line) {
      const start = headings[index].node.getBoundingClientRect().top;
      const end = headings[index + 1]?.node.getBoundingClientRect().top ?? prose.getBoundingClientRect().bottom;
      return { kind: "section", key: headings[index].key, fraction: clamp((line - start) / Math.max(1, end - start)), ratio };
    }
    return { kind: "page", ratio };
  }

  for (const link of links) link.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
    try {
      const from = new URL(win.location.href), to = new URL(link.href, from);
      const current = active();
      if (!opposite(from, to) || !current.length || current.some(panel => panel.hidden || panel.querySelector("[data-guide-progress]").hidden)) return;
      rememberSource();
      win.sessionStorage.setItem(TRANSFER, JSON.stringify({
        version: 1, from: from.href, to: to.href, at: Date.now(),
        open: current.map(panel => panel.querySelector("[data-guide-checklist]").open),
        reading: capturePosition(current)
      }));
    } catch { /* Optional UI handoff must never stop the language link. */ }
  });

  function take(event) {
    if (event?.type !== "pageshow" || event.persisted || win.performance?.getEntriesByType?.("navigation")?.[0]?.type !== "navigate") return null;
    try {
      const raw = win.sessionStorage.getItem(TRANSFER);
      if (!raw) return null;
      // Consume even rejected transfers; a later unrelated visit must not reuse them.
      win.sessionStorage.removeItem(TRANSFER);
      if (raw.length > 4096) return null;
      const transfer = JSON.parse(raw), here = new URL(win.location.href);
      if (!transfer || transfer.version !== 1 || transfer.to !== here.href || !Number.isFinite(transfer.at) ||
          Date.now() - transfer.at < 0 || Date.now() - transfer.at > MAX_AGE) return null;
      const from = new URL(transfer.from), referrer = new URL(doc.referrer);
      if (!opposite(from, here) || referrer.origin !== from.origin || referrer.pathname !== from.pathname || referrer.search !== from.search ||
          !links.some(link => new URL(link.href, here).pathname === from.pathname)) return null;
      const current = active(), reading = transfer.reading;
      if (!current.length || !Array.isArray(transfer.open) || transfer.open.length !== current.length || transfer.open.some(value => typeof value !== "boolean") ||
          !reading || !Number.isFinite(reading.ratio) || reading.ratio < 0 || reading.ratio > 1) return null;
      if (reading.kind === "panel") {
        if (!Number.isInteger(reading.index) || reading.index < 0 || reading.index >= current.length ||
            typeof reading.key !== "string" || !Number.isFinite(reading.offset)) return null;
      } else if (reading.kind === "section") {
        if (typeof reading.key !== "string" || !/^[a-z-]{1,64}$/.test(reading.key) ||
            !Number.isFinite(reading.fraction) || reading.fraction < 0 || reading.fraction > 1) return null;
      } else if (reading.kind !== "page") return null;
      return { version: 1, address: address(here), open: transfer.open, panel: reading.kind === "panel" ? reading.index : 0, task: null, x: 0, y: 0, offset: 0, reading };
    } catch { return null; }
  }

  function scrollTop(reading) {
    if (reading.kind === "panel") {
      const node = panelAnchors(active()[reading.index]).find(([key]) => key === reading.key)?.[1];
      if (node) return Math.max(0, win.scrollY + node.getBoundingClientRect().top - readingLine() - reading.offset);
    } else if (reading.kind === "section") {
      const prose = doc.querySelector("article .prose");
      const headings = sections(prose), index = headings.findIndex(item => item.key === reading.key);
      if (index >= 0) {
        const start = headings[index].node.getBoundingClientRect().top;
        const end = headings[index + 1]?.node.getBoundingClientRect().top ?? prose.getBoundingClientRect().bottom;
        return Math.max(0, win.scrollY + start + (end - start) * reading.fraction - readingLine());
      }
    }
    return reading.ratio * pageRange();
  }
  return { take, scrollTop, capture: () => capturePosition(active()) };
}
