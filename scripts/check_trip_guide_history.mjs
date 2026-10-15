import assert from "node:assert/strict";
import { mountGuideHistory } from "../static/js/trip-guide-history.js";

const KEY = "tripcompassGuideView";
function fixture(prefix = "", city = "fukuoka") {
  const frames = [], writes = [], scrolls = [];
  const url = new URL(`https://tripcompass.ai${prefix}/guide/#prep-${city}-hotel`);
  const doc = { activeElement: null };
  const win = {
    location: url, scrollX: 0, scrollY: 1800,
    history: { state: { unrelated: { keep: true } }, replaceState(state) { this.state = structuredClone(state); writes.push(state); } },
    performance: { getEntriesByType: () => [{ type: "navigate" }] },
    requestAnimationFrame: fn => frames.push(fn),
    scrollTo: value => scrolls.push(value)
  };
  for (const storage of ["localStorage", "sessionStorage"]) Object.defineProperty(win, storage, { get() { throw Error("History must not access saved records"); } });
  const panels = Array.from({ length: 2 }, (_, index) => {
    const details = { open: index === 1 }, progress = { hidden: false };
    const fallback = { focus() { doc.activeElement = this; }, scrollIntoView() { this.scrolled = true; } };
    const link = {
      dataset: { guideAllLink: "transport" }, href: `https://tripcompass.ai${prefix}/other/#prep-${city}-transport`, target: "",
      hasAttribute: () => false, getClientRects: () => [1], getBoundingClientRect: () => ({ top: 380 }),
      addEventListener(_, handler) { this.click = handler; }, focus() { doc.activeElement = this; }
    };
    return { dataset: { guideReturn: url.hash }, hidden: false, link, details, progress, fallback,
      querySelectorAll: () => [link], querySelector: selector => ({ "[data-guide-checklist]": details, "[data-guide-progress]": progress, "[data-guide-return-link]": fallback })[selector] };
  });
  doc.querySelectorAll = () => panels;
  const view = mountGuideHistory(doc, win);
  const click = (index = 1, event = {}) => panels[index].link.click({ button: 0, ...event });
  const flush = () => { while (frames.length) frames.shift()(); };
  return { doc, win, panels, writes, scrolls, view, click, flush };
}

for (const prefix of ["", "/ko"]) for (const city of ["fukuoka", "osaka", "tokyo"]) {
  for (const event of [{ type: "pageshow", persisted: true }, { type: "pageshow" }, { type: "popstate" }]) {
    const f = fixture(prefix, city);
    assert.equal(f.writes.length, 0, "No visit-time writes");
    f.click(); const saved = structuredClone(f.win.history.state);
    assert.deepEqual(saved.unrelated, { keep: true });
    assert.deepEqual(saved[KEY].open, [false, true]);
    f.panels.forEach(p => { p.details.open = false; });
    f.win.performance.getEntriesByType = () => [{ type: "back_forward" }];
    assert.equal(f.view.restore(event), true);
    if (event.type === "popstate") assert.equal(f.view.restore({ type: "hashchange" }), true, "Restore wins over hash focus");
    f.flush();
    assert.deepEqual(f.panels.map(p => p.details.open), [false, true]);
    assert.equal(f.doc.activeElement, f.panels[1].link);
    assert.deepEqual(f.scrolls, [{ left: 0, top: 1800, behavior: "instant" }]);
    assert.deepEqual(f.win.history.state, saved, "Restoration does not write history or records");
    assert.equal(f.writes.length, 1);
  }
}

for (const event of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) {
  const f = fixture(); f.click(1, event); assert.equal(f.writes.length, 0);
}
for (const mode of ["target", "download", "hidden", "same", "external", "foreign-state", "failure"]) {
  const f = fixture(), link = f.panels[1].link;
  if (mode === "target") link.target = "_blank";
  if (mode === "download") link.hasAttribute = () => true;
  if (mode === "hidden") f.panels[1].hidden = true;
  if (mode === "same") link.href = f.win.location.href;
  if (mode === "external") link.href = "https://example.com/";
  if (mode === "foreign-state") f.win.history.state = "keep";
  if (mode === "failure") f.win.history.replaceState = () => { throw Error("PRIVATE"); };
  assert.doesNotThrow(() => f.click()); assert.equal(f.writes.length, 0);
}
for (const change of [
  s => { s.address = "/other/#prep-fukuoka-hotel"; }, s => { s.version = 2; },
  s => { s.open = [true]; }, s => { s.open = [true, "yes"]; },
  s => { s.panel = 2; }, s => { s.task = "unknown"; },
  s => { s.y = NaN; }, s => { s.x = -1; }, s => { s.offset = Infinity; }
]) {
  const f = fixture(); f.click(); change(f.win.history.state[KEY]);
  assert.equal(f.view.restore({ type: "popstate" }), false); f.flush(); assert.equal(f.scrolls.length, 0);
}
const fresh = fixture(); fresh.click();
assert.equal(fresh.view.restore({ type: "pageshow" }), false, "Fresh navigation does not restore stale UI");
fresh.win.performance.getEntriesByType = () => [{ type: "reload" }];
assert.equal(fresh.view.restore({ type: "pageshow" }), false, "Reload starts compact");
assert.equal(fresh.view.restore({ type: "hashchange" }), false);
const reset = fixture(); reset.click(); reset.panels[1].progress.hidden = true;
assert.equal(reset.view.restore({ type: "popstate" }), true); reset.flush();
assert.equal(reset.doc.activeElement, reset.panels[1].fallback); assert.ok(reset.panels[1].fallback.scrolled);
assert.equal(reset.scrolls.length, 0, "Do not restore into an unavailable checklist");
const moved = fixture(); moved.click(); moved.view.restore({ type: "popstate" });
moved.win.location.hash = "#prep-fukuoka-transport"; moved.flush(); assert.equal(moved.scrolls.length, 0);
const resized = fixture(); resized.click(); resized.panels[1].link.getBoundingClientRect = () => ({ top: 500 });
resized.view.restore({ type: "popstate" }); resized.flush(); assert.equal(resized.scrolls[0].top, 1920, "Anchor compensates for changed layout");
const blocked = fixture(); blocked.click(); Object.defineProperty(blocked.win.history, "state", { get() { throw Error("PRIVATE"); } });
assert.equal(blocked.view.restore({ type: "popstate" }), false);
const both = fixture(); both.panels.forEach(p => { p.details.open = true; }); both.click();
both.panels.forEach(p => { p.details.open = false; }); both.view.restore({ type: "popstate" }); both.flush();
assert.ok(both.panels.every(p => p.details.open), "Both expanded panels restore independently");
both.win.performance = {}; assert.equal(both.view.restore({ type: "pageshow" }), false);
console.log("Guide history passed: EN/KO three-city entry isolation, BFCache/cold history, disclosure/position/focus, safe navigation, invalid/blocked history, reset fallback; no saved-record access.");
