import assert from "node:assert/strict";
import { mountGuideHistory } from "../static/js/trip-guide-history.js";

const KEY = "tripcompassGuideView";
function fixture(prefix = "", city = "fukuoka", reloadStorage = false) {
  const frames = [], writes = [], scrolls = [];
  const events = {}, documentEvents = {};
  const url = new URL(`https://tripcompass.ai${prefix}/guide/#prep-${city}-hotel`);
  const doc = { activeElement: null, visibilityState: "visible", addEventListener: (name, handler) => { documentEvents[name] = handler; } };
  const win = {
    location: url, scrollX: 0, scrollY: 1800,
    addEventListener: (name, handler) => { events[name] = handler; },
    history: { state: { unrelated: { keep: true } }, replaceState(state) { this.state = structuredClone(state); writes.push(state); } },
    performance: { getEntriesByType: () => [{ type: "navigate" }] },
    requestAnimationFrame: fn => frames.push(fn),
    scrollTo: value => scrolls.push(value)
  };
  Object.defineProperty(win, "localStorage", { get() { throw Error("History must not access saved records"); } });
  const session = new Map(); let nextId = 0;
  if (reloadStorage) {
    win.crypto = { randomUUID: () => `entry-${++nextId}` };
    win.sessionStorage = {
      getItem: key => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, value)
    };
  } else Object.defineProperty(win, "sessionStorage", { get() { throw Error("Tab storage blocked"); } });
  const panels = Array.from({ length: 2 }, (_, index) => {
    const details = { open: index === 1 }, progress = { hidden: false };
    const fallback = { focus() { doc.activeElement = this; }, scrollIntoView() { this.scrolled = true; } };
    const link = {
      dataset: { guideAllLink: "transport" }, href: `https://tripcompass.ai${prefix}/other/#prep-${city}-transport`, target: "",
      hasAttribute: () => false, getClientRects: () => [1], getBoundingClientRect: () => ({ top: 380 }),
      addEventListener(_, handler) { this.click = handler; }, focus() { doc.activeElement = this; }
    };
    return { dataset: { guideReturn: url.hash }, hidden: false, link, details, progress, fallback,
      contains: element => element === link || element === details,
      querySelectorAll: () => [link], querySelector: selector => ({ "[data-guide-checklist]": details, "[data-guide-progress]": progress, "[data-guide-return-link]": fallback })[selector] };
  });
  doc.querySelectorAll = selector => selector === "[data-guide-return]" ? panels : [];
  const view = mountGuideHistory(doc, win);
  const click = (index = 1, event = {}) => panels[index].link.click({ button: 0, ...event });
  const flush = () => { while (frames.length) frames.shift()(); };
  return { doc, win, panels, writes, scrolls, view, click, flush, events, documentEvents, session };
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
assert.equal(fresh.view.restore({ type: "pageshow" }), true, "Reload restores the current entry");
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

for (const prefix of ["", "/ko"]) for (const city of ["fukuoka", "osaka", "tokyo"]) {
  for (const open of [[false, false], [true, false], [false, true], [true, true]]) {
    const f = fixture(prefix, city);
    f.panels.forEach((panel, i) => { panel.details.open = open[i]; });
    f.doc.activeElement = f.panels[1].details;
    f.win.scrollY = 2456;
    f.events.pagehide();
    assert.deepEqual(f.win.history.state.unrelated, { keep: true });
    assert.equal(f.win.history.state[KEY].task, null, "Reading position needs no guide click");
    assert.equal(f.win.history.state[KEY].panel, 1);
    f.panels.forEach(panel => { panel.details.open = false; });
    f.doc.activeElement = null;
    f.win.scrollY = 0;
    f.win.performance.getEntriesByType = () => [{ type: "reload" }];
    assert.equal(f.view.restore({ type: "pageshow" }), true);
    f.flush();
    assert.deepEqual(f.panels.map(panel => panel.details.open), open);
    assert.equal(f.doc.activeElement, null, "Reload must not steal focus from free reading");
    assert.equal(f.scrolls.at(-1).top, 2456);
    f.win.scrollY = 321;
    f.panels.forEach(panel => { panel.details.open = false; });
    f.events.pagehide();
    f.view.restore({ type: "pageshow" }); f.flush();
    assert.equal(f.scrolls.at(-1).top, 321, "Repeated reload uses latest position");
    assert.deepEqual(f.panels.map(panel => panel.details.open), [false, false], "Explicit collapse persists");
  }
}
const hidden = fixture();
hidden.documentEvents.visibilitychange(); assert.equal(hidden.writes.length, 0);
hidden.doc.visibilityState = "hidden"; hidden.documentEvents.visibilitychange();
assert.equal(hidden.writes.length, 1, "Mobile background captures reading state");
const departure = fixture(); departure.click(); departure.events.pagehide();
assert.equal(departure.win.history.state[KEY].task, "transport", "Departure preserves the related-link anchor for Back");
departure.view.restore({ type: "popstate" }); departure.flush(); departure.win.scrollY = 120;
departure.events.pagehide();
assert.equal(departure.win.history.state[KEY].task, "transport", "Native Forward retains the currently focused related guide anchor");
departure.doc.activeElement = null; departure.events.pagehide();
assert.equal(departure.win.history.state[KEY].task, null, "Reload after Back does not reuse a stale link anchor");
assert.equal(departure.win.history.state[KEY].y, 120);
for (const mode of ["no-context", "hidden", "reset", "failure", "foreign-state"]) {
  const f = fixture();
  if (mode === "no-context") f.win.location.hash = "#article";
  if (mode === "hidden") f.panels[0].hidden = true;
  if (mode === "reset") f.panels[0].progress.hidden = true;
  if (mode === "failure") f.win.history.replaceState = () => { throw Error("PRIVATE"); };
  if (mode === "foreign-state") f.win.history.state = "keep";
  assert.doesNotThrow(() => f.events.pagehide()); assert.equal(f.writes.length, 0);
}
const reloadReset = fixture(); reloadReset.events.pagehide(); reloadReset.panels[0].progress.hidden = true;
reloadReset.win.performance.getEntriesByType = () => [{ type: "reload" }];
reloadReset.view.restore({ type: "pageshow" }); reloadReset.flush();
assert.equal(reloadReset.doc.activeElement, reloadReset.panels[0].fallback);
assert.equal(reloadReset.scrolls.length, 0);
const RELOAD = "tripcompass.guide-view.v1", ENTRY = "tripcompassGuideEntry";
for (const prefix of ["", "/ko"]) for (const city of ["fukuoka", "osaka", "tokyo"]) {
  const f = fixture(prefix, city, true);
  const beforeDeparture = structuredClone(f.win.history.state);
  assert.equal(f.session.size, 0, "No snapshot before departure");
  f.events.pagehide();
  assert.equal(f.session.size, 1, "One bounded tab-local UI snapshot");
  f.win.history.state = beforeDeparture; // Chromium reload can capture history before pagehide.
  f.panels.forEach(panel => { panel.details.open = false; });
  f.win.scrollY = 0;
  f.win.performance.getEntriesByType = () => [{ type: "reload" }];
  assert.equal(f.view.restore({ type: "pageshow" }), true); f.flush();
  assert.deepEqual(f.panels.map(panel => panel.details.open), [false, true]);
  assert.equal(f.scrolls.at(-1).top, 1800);
  assert.deepEqual(f.win.history.state.unrelated, { keep: true });
  const stored = f.session.get(RELOAD);
  for (const bad of ["{", "null", JSON.stringify({ entry: "another-entry", saved: JSON.parse(stored).saved }), JSON.stringify({ entry: beforeDeparture[ENTRY].id, saved: { version: 99 } })]) {
    f.session.set(RELOAD, bad);
    assert.equal(f.view.restore({ type: "pageshow" }), false, "Reject invalid or another entry's snapshot");
  }
  f.session.set(RELOAD, stored);
  f.win.performance.getEntriesByType = () => [{ type: "navigate" }];
  assert.equal(f.view.restore({ type: "pageshow" }), false, "Fresh navigation does not borrow reload UI");
  f.win.location.hash = `#prep-${city}-weather`;
  f.view.restore({ type: "hashchange" });
  // No matching panel: do not assign an entry or reuse another task's UI.
  assert.equal(f.win.history.state[ENTRY].id, beforeDeparture[ENTRY].id);
  f.win.location.hash = `#prep-${city}-hotel`;
  f.win.history.state = { unrelated: { keep: true } };
  f.view.restore({ type: "pageshow" });
  assert.notEqual(f.win.history.state[ENTRY].id, beforeDeparture[ENTRY].id, "A new entry gets its own marker");
  f.win.performance.getEntriesByType = () => [{ type: "reload" }];
  assert.equal(f.view.restore({ type: "pageshow" }), false);
}
for (const operation of ["getItem", "setItem"]) {
  const f = fixture("", "fukuoka", true);
  f.win.sessionStorage[operation] = () => { throw Error("PRIVATE"); };
  assert.doesNotThrow(() => f.events.pagehide());
  f.win.performance.getEntriesByType = () => [{ type: "reload" }];
  assert.equal(f.view.restore({ type: "pageshow" }), true, "Blocked tab storage still permits history fallback");
}
console.log("Guide history passed: EN/KO three-city reload/Back restoration, independent disclosures, reading/link position, bounded tab snapshot/entry isolation, mobile lifecycle, invalid/blocked storage/history, reset fallback; no preparation/bookmark storage access.");
