import assert from "node:assert/strict";
import { mountGuideLanguage } from "../static/js/trip-guide-language.js";

const KEY = "tripcompass.guide-language.v1";
function fixture(prefix = "", city = "fukuoka", shared = new Map()) {
  const here = new URL(`https://tripcompass.ai${prefix}/guide/#prep-${city}-hotel`);
  const other = new URL(`${prefix ? "" : "/ko"}/guide/${here.hash}`, here.origin);
  const node = (top, bottom = top + 50) => ({ getClientRects: () => [1], getBoundingClientRect: () => ({ top, bottom }) });
  const links = [{ href: other.href, target: "", hasAttribute: () => false, addEventListener(_, fn) { this.click = fn; } }];
  const panels = [0, 1].map(index => {
    const summary = node(index ? 1100 : 90), row = node(index ? 1200 : 130);
    const input = { dataset: { guideAllCheck: "hotel" }, closest: () => row };
    const details = { open: index === 0 }, progress = { hidden: false };
    return { ...node(index ? 1000 : 0, index ? 1600 : 600), details, progress, summary, row, hidden: false,
      querySelector: key => ({ "summary": summary, "[data-guide-checklist]": details, "[data-guide-progress]": progress })[key],
      querySelectorAll: key => key === "[data-guide-all-check]" ? [input] : [] };
  });
  const headings = [node(2000), node(3000)];
  const prose = { ...node(2000, 4000), dataset: { guideReadingSections: '["overview","budget"]' }, querySelectorAll: () => headings };
  const doc = { documentElement: { scrollHeight: 6000 }, referrer: "",
    querySelectorAll: () => links,
    querySelector: key => key === ".site-header" ? node(0, 100) : prose };
  const win = { location: here, innerHeight: 800, scrollY: 1500,
    performance: { getEntriesByType: () => [{ type: "navigate" }] },
    sessionStorage: { getItem: key => shared.get(key) ?? null, setItem: (key, value) => shared.set(key, value), removeItem: key => shared.delete(key) } };
  Object.defineProperty(win, "localStorage", { get() { throw Error("Do not access trip records"); } });
  let remembered = 0;
  const view = mountGuideLanguage(doc, win, () => panels, () => remembered++);
  return { doc, win, panels, headings, prose, links, view, shared, remembered: () => remembered,
    click: event => links[0].click({ button: 0, ...event }) };
}

for (const prefix of ["", "/ko"]) for (const city of ["fukuoka", "osaka", "tokyo"]) {
  const source = fixture(prefix, city);
  source.shared.set("unrelated", "keep"); source.click();
  const transfer = JSON.parse(source.shared.get(KEY));
  assert.deepEqual(transfer.open, [true, false]);
  assert.equal(transfer.reading.kind, "panel"); assert.equal(transfer.reading.key, "summary");
  assert.equal(source.remembered(), 1, "Remember source before native language navigation");
  const dest = fixture(prefix ? "" : "/ko", city, source.shared);
  dest.doc.referrer = source.win.location.origin + source.win.location.pathname;
  const taken = dest.view.take({ type: "pageshow" });
  assert.ok(taken); assert.deepEqual(taken.open, [true, false]);
  assert.equal(taken.address, dest.win.location.pathname + dest.win.location.hash);
  assert.equal(dest.shared.has(KEY), false, "Transfer consumed once");
  assert.equal(dest.shared.get("unrelated"), "keep");
  dest.panels[0].summary.getBoundingClientRect = () => ({ top: 250, bottom: 300 });
  assert.equal(dest.view.scrollTop(taken.reading), 1660, "Translated layout uses anchor offset, not source scrollY");
  assert.equal(dest.view.take({ type: "pageshow" }), null, "No stale replay");
}

for (const event of [{ button: 1 }, { metaKey: true }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }, { defaultPrevented: true }]) {
  const f = fixture(); f.click(event); assert.equal(f.shared.size, 0);
}
for (const mode of ["same", "external", "different-guide", "different-task", "target", "download", "hidden", "unavailable", "blocked-write"]) {
  const f = fixture();
  if (mode === "same") f.links[0].href = f.win.location.href;
  if (mode === "external") f.links[0].href = "https://example.com/ko/guide/#prep-fukuoka-hotel";
  if (mode === "different-guide") f.links[0].href = "https://tripcompass.ai/ko/other/#prep-fukuoka-hotel";
  if (mode === "different-task") f.links[0].href = "https://tripcompass.ai/ko/guide/#prep-fukuoka-weather";
  if (mode === "target") f.links[0].target = "_blank";
  if (mode === "download") f.links[0].hasAttribute = () => true;
  if (mode === "hidden") f.panels[0].hidden = true;
  if (mode === "unavailable") f.panels[0].progress.hidden = true;
  if (mode === "blocked-write") f.win.sessionStorage.setItem = () => { throw Error("PRIVATE"); };
  assert.doesNotThrow(() => f.click()); assert.equal(f.shared.size, 0);
}
for (const change of [
  t => { t.version = 2; }, t => { t.to += "other"; }, t => { t.from = "https://example.com/guide/"; },
  t => { t.at = Date.now() - 120001; }, t => { t.at = Date.now() + 10000; },
  t => { t.open = [true]; }, t => { t.open[0] = "true"; },
  t => { t.reading.ratio = -1; }, t => { t.reading.kind = "unknown"; },
  t => { t.reading.index = 9; }, t => { t.reading.offset = null; },
  t => { t.reading = { kind: "section", ratio: 0.5, index: 3, count: 2, fraction: 0.5 }; }
]) {
  const f = fixture(); f.click(); const transfer = JSON.parse(f.shared.get(KEY)); change(transfer);
  f.shared.set(KEY, JSON.stringify(transfer));
  const dest = fixture("/ko", "fukuoka", f.shared); dest.doc.referrer = "https://tripcompass.ai/guide/";
  assert.equal(dest.view.take({ type: "pageshow" }), null); assert.equal(f.shared.has(KEY), false);
}
for (const mode of ["referrer", "malformed", "oversized", "blocked-read", "blocked-remove", "reload", "bfcache"]) {
  const source = fixture(); source.click(); const f = fixture("/ko", "fukuoka", source.shared);
  f.doc.referrer = mode === "referrer" ? "https://tripcompass.ai/other/" : "https://tripcompass.ai/guide/";
  if (mode === "malformed") f.shared.set(KEY, "{");
  if (mode === "oversized") f.shared.set(KEY, " ".repeat(4097));
  if (mode === "blocked-read") f.win.sessionStorage.getItem = () => { throw Error("PRIVATE"); };
  if (mode === "blocked-remove") f.win.sessionStorage.removeItem = () => { throw Error("PRIVATE"); };
  if (mode === "reload") f.win.performance.getEntriesByType = () => [{ type: "reload" }];
  assert.equal(f.view.take({ type: "pageshow", persisted: mode === "bfcache" }), null);
}
const article = fixture();
article.panels.forEach(panel => { panel.getBoundingClientRect = () => ({ top: -2000, bottom: -1000 }); });
article.headings[0].getBoundingClientRect = () => ({ top: -84, bottom: -34 });
article.headings[1].getBoundingClientRect = () => ({ top: 716, bottom: 766 });
article.click(); const position = JSON.parse(article.shared.get(KEY)).reading;
assert.deepEqual(position, { kind: "section", key: "overview", fraction: 0.25, ratio: 1500 / 5200 });
article.headings[0].getBoundingClientRect = () => ({ top: 0, bottom: 50 });
article.headings[1].getBoundingClientRect = () => ({ top: 1200, bottom: 1250 });
assert.equal(article.view.scrollTop(position), 1684, "Preserve relative position within the translated section");
article.headings.pop(); assert.ok(Math.abs(article.view.scrollTop(position) - 1500) < 0.01, "Changed section structure falls back safely");
const merged = fixture();
merged.panels.forEach(panel => { panel.getBoundingClientRect = () => ({ top: -2000, bottom: -1000 }); });
merged.headings.splice(0, 2, ...[-84, 16, 716].map(top => ({ getBoundingClientRect: () => ({ top, bottom: top + 50 }) })));
merged.prose.dataset.guideReadingSections = '["audience","audience","budget"]';
merged.click();
assert.deepEqual(JSON.parse(merged.shared.get(KEY)).reading, { kind: "section", key: "audience", fraction: 0.25, ratio: 1500 / 5200 }, "English audience headings combine into the corresponding Korean section");
console.log("Guide language passed: EN/KO three-city handoff, panel/section anchors, one-use/expiry, native navigation, invalid/blocked storage and record isolation.");
