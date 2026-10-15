import assert from "node:assert/strict";
import { TRIPS, TASKS, initialState } from "../static/js/trip-prep-core.js";
import { READING_KEYS, parseReading, readReading, queueReading, mountGuideReading } from "../static/js/trip-reading.js";
import { mountMyTripsReading } from "../static/js/my-trips-reading.js";

const storage = () => {
  const map = new Map(), writes = [];
  return { map, writes, getItem: key => map.get(key) ?? null,
    setItem(key, value) { assert.ok([...Object.values(READING_KEYS), "tripcompass.guide-resume.v1"].includes(key)); writes.push(key); map.set(key, value); },
    removeItem(key) { assert.ok([...Object.values(READING_KEYS), "tripcompass.guide-resume.v1"].includes(key)); map.delete(key); } };
};
const record = (city, task = "hotel") => ({ version: 1, city, task, course: TRIPS[city].courses[0], alternative: "none", at: Date.now(), open: [true, false], reading: { kind: "section", key: "budget", fraction: 0.25, ratio: 0.5 } });
function fixture(city, prefix = "") {
  const localStorage = storage(), sessionStorage = storage(), events = {}, docEvents = {};
  for (const id of Object.keys(TRIPS)) localStorage.map.set(TRIPS[id].storageKey, JSON.stringify(initialState(id)));
  localStorage.map.set("tripcompass.saved-guides.v1", '["stay","stay","unknown"]');
  localStorage.map.set("tripcompass.decision.v1", "keep");
  const win = { localStorage, sessionStorage, location: new URL(`https://tripcompass.ai${prefix}/guide/#prep-${city}-hotel`),
    performance: { getEntriesByType: () => [{ type: "navigate" }] }, addEventListener: (name, fn) => { events[name] = fn; } };
  const panels = [true, false].map(open => ({ dataset: { guideCity: city, guideTask: "hotel" }, hidden: false,
    querySelector: selector => selector === "[data-guide-progress]" ? { hidden: false } : { open } }));
  const doc = { referrer: `https://tripcompass.ai${prefix}/my-trips/`, addEventListener: (name, fn) => { docEvents[name] = fn; } };
  const view = mountGuideReading(doc, win, () => panels, { capture: () => record(city).reading });
  return { win, doc, panels, events, docEvents, view };
}
for (const prefix of ["", "/ko"]) for (const city of Object.keys(TRIPS)) {
  const f = fixture(city, prefix), before = [...f.win.localStorage.map];
  f.view.save();
  const saved = readReading(f.win.localStorage, city);
  assert.equal(saved.task, "hotel"); assert.deepEqual(saved.open, [true, false]);
  assert.deepEqual(before, [...f.win.localStorage.map].filter(([key]) => key !== READING_KEYS[city]));
  for (const task of TASKS) { f.panels.forEach(p => { p.dataset.guideTask = task; }); f.view.save(); assert.equal(readReading(f.win.localStorage, city).task, task); }
  f.panels.forEach(p => { p.dataset.guideTask = "hotel"; }); f.view.save();
  const r = readReading(f.win.localStorage, city), target = f.win.location.href;
  f.win.location = new URL(`https://tripcompass.ai${prefix}/my-trips/`);
  queueReading(f.win, { href: target }, r);
  f.win.location = new URL(target);
  const taken = f.view.take({ type: "pageshow" });
  assert.deepEqual(taken.reading, r.reading); assert.deepEqual(taken.open, r.open);
  assert.equal(f.view.take({ type: "pageshow" }), null, "Consume once");
  const altered = initialState(city); altered.course = TRIPS[city].courses[1];
  f.win.localStorage.map.set(TRIPS[city].storageKey, JSON.stringify(altered));
  assert.equal(readReading(f.win.localStorage, city), null);
  const old = f.win.localStorage.getItem(READING_KEYS[city]); f.view.save();
  assert.equal(f.win.localStorage.getItem(READING_KEYS[city]), old, "Do not save a stale course");
  f.win.localStorage.map.delete(TRIPS[city].storageKey); f.view.save();
  assert.equal(readReading(f.win.localStorage, city), null, "Reset trip is not recreated");
}
for (const mutate of [r => r.version++, r => r.city = "elsewhere", r => r.task = "unknown", r => r.open = [true], r => r.open[0] = "yes", r => r.at = Infinity,
  r => r.reading.ratio = 2, r => r.reading.fraction = -1, r => r.reading.key = "<script>", r => r.reading.kind = "unknown",
  r => r.reading = { kind: "panel", index: 3, key: "summary", offset: 0, ratio: 0.5 }]) {
  const r = record("fukuoka"); mutate(r); assert.throws(() => parseReading(JSON.stringify(r), "fukuoka"));
}
for (const raw of ["{", " ".repeat(2049), "null", "[]"]) assert.throws(() => parseReading(raw, "fukuoka"));
for (const kind of ["panel", "section", "page"]) {
  const r = record("tokyo");
  if (kind === "panel") r.reading = { kind, index: 1, key: "task:departure", offset: -10, ratio: 0.5 };
  if (kind === "page") r.reading = { kind, ratio: 0.5 };
  assert.ok(parseReading(JSON.stringify(r), "tokyo"));
}
for (const mode of ["expired", "wrong-page", "referrer", "wrong-task", "removed", "reset", "changed", "blocked", "reload", "persisted"]) {
  const f = fixture("fukuoka"); f.view.save(); const r = readReading(f.win.localStorage, "fukuoka");
  const t = { version: 1, to: f.win.location.href, from: "https://tripcompass.ai/my-trips/", at: Date.now(), record: r };
  if (mode === "expired") t.at -= 120001;
  if (mode === "wrong-page") t.to += "else";
  if (mode === "wrong-task") t.record.task = "flights";
  if (mode === "referrer") f.doc.referrer = "https://example.com/my-trips/";
  if (mode === "removed") f.win.localStorage.map.delete(READING_KEYS.fukuoka);
  if (mode === "reset") f.win.localStorage.map.delete(TRIPS.fukuoka.storageKey);
  if (mode === "changed") { const s = initialState(); s.alternative = "rain"; f.win.localStorage.map.set(TRIPS.fukuoka.storageKey, JSON.stringify(s)); }
  f.win.sessionStorage.map.set("tripcompass.guide-resume.v1", JSON.stringify(t));
  if (mode === "blocked") f.win.sessionStorage.getItem = () => { throw Error("PRIVATE"); };
  if (mode === "reload") f.win.performance.getEntriesByType = () => [{ type: "reload" }];
  assert.equal(f.view.take({ type: "pageshow", persisted: mode === "persisted" }), null);
}
for (const mode of ["read", "write", "hidden", "forgotten", "reset-event"]) {
  const f = fixture("fukuoka");
  if (mode === "read") f.win.localStorage.getItem = () => { throw Error("PRIVATE"); };
  if (mode === "write") f.win.localStorage.setItem = () => { throw Error("PRIVATE"); };
  if (mode === "hidden") f.panels[0].hidden = true;
  if (mode === "forgotten") f.events.storage({ key: READING_KEYS.fukuoka, newValue: null });
  if (mode === "reset-event") { f.win.localStorage.map.delete(TRIPS.fukuoka.storageKey); f.events.storage({ key: TRIPS.fukuoka.storageKey }); f.win.localStorage.map.set(TRIPS.fukuoka.storageKey, JSON.stringify(initialState())); }
  assert.doesNotThrow(() => f.view.save()); assert.equal(f.win.localStorage.map.has(READING_KEYS.fukuoka), false);
}

// Overview uses prebuilt localized links, never URLs or HTML from stored content.
for (const language of ["en", "ko"]) {
  const f = fixture("fukuoka", language === "ko" ? "/ko" : ""); f.view.save();
  const doc = { documentElement: { lang: language } }, events = {};
  const status = { hidden: false, focus() { doc.activeElement = this; } };
  const clear = { addEventListener: (_, fn) => { clear.click = fn; } };
  const rows = TASKS.map(task => {
    const link = { href: `https://tripcompass.ai${language === "ko" ? "/ko" : ""}/guide/#prep-fukuoka-${task}`, target: "", hasAttribute: () => false, addEventListener: (_, fn) => { link.click = fn; } };
    return { dataset: { readingTask: task }, hidden: true, contains: node => node === link, querySelector: () => link, link };
  });
  doc.querySelectorAll = () => [{ dataset: { tripReading: "fukuoka" }, querySelectorAll: () => rows, querySelector: key => key === "[data-reading-status]" ? status : clear }];
  f.win.location = new URL(`https://tripcompass.ai${language === "ko" ? "/ko" : ""}/my-trips/`);
  f.win.addEventListener = (name, fn) => { events[name] = fn; };
  const before = [...f.win.localStorage.map]; mountMyTripsReading(doc, f.win);
  assert.deepEqual(before, [...f.win.localStorage.map]);
  assert.deepEqual(rows.filter(r => !r.hidden).map(r => r.dataset.readingTask), ["hotel"]);
  const link = rows[1].link; link.click({ button: 0, ctrlKey: true }); assert.equal(f.win.sessionStorage.map.size, 0);
  link.click({ button: 0 }); assert.equal(f.win.sessionStorage.map.size, 1);
  const remove = f.win.localStorage.removeItem;
  f.win.localStorage.removeItem = () => { throw Error("PRIVATE"); }; clear.click();
  assert.equal(clear.hidden, false); assert.match(status.textContent, /could not|못했/); assert.doesNotMatch(status.textContent, /PRIVATE/);
  f.win.localStorage.removeItem = remove; doc.activeElement = clear; clear.click();
  assert.ok(rows.every(r => r.hidden)); assert.equal(doc.activeElement, status);
  assert.deepEqual([...f.win.localStorage.map], before.filter(([key]) => key !== READING_KEYS.fukuoka));
  f.win.localStorage.map.set(READING_KEYS.fukuoka, "{"); events.storage({ key: READING_KEYS.fukuoka });
  assert.match(status.textContent, /unavailable|확인할 수 없/); assert.ok(rows.every(r => r.hidden));
}
console.log("Reading resume passed: EN/KO three cities, task/position validation, one-use handoff, record isolation, stale/reset/blocked storage, safe overview links and forget control.");
