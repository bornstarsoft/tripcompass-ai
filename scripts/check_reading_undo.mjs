import assert from "node:assert/strict";
import { TRIPS, TASKS, initialState } from "../static/js/trip-prep-core.js";
import { READING_KEYS } from "../static/js/trip-reading.js";
import { mountMyTripsReading } from "../static/js/my-trips-reading.js";

function fixture(language = "en") {
  const map = new Map(), events = {}, writes = [];
  const doc = { documentElement: { lang: language }, activeElement: null };
  const node = () => ({ hidden: true, textContent: "", addEventListener(type, fn) { this[type] = fn; }, focus() { doc.activeElement = this; } });
  const cards = Object.keys(TRIPS).map(city => {
    const state = { ...initialState(city), extra: "keep" };
    map.set(TRIPS[city].storageKey, JSON.stringify(state));
    const record = { version: 1, city, task: "hotel", course: state.course, alternative: state.alternative, at: Date.now(), open: [true, false], reading: { kind: "section", key: "budget", fraction: .25, ratio: .5 }, extra: "keep" };
    map.set(READING_KEYS[city], JSON.stringify(record, null, 2));
    const fields = { "[data-reading-status]": node(), "[data-reading-clear]": node(), "[data-reading-undo]": node() };
    const rows = TASKS.map(task => {
      const link = { ...node(), href: `https://tripcompass.ai/${city}/#prep-${city}-${task}`, target: "", hasAttribute: () => false };
      return { dataset: { readingTask: task }, hidden: true, link, querySelector: () => link, contains: item => item === link };
    });
    return { dataset: { tripReading: city }, fields, rows, querySelector: name => fields[name], querySelectorAll: () => rows };
  });
  map.set("tripcompass.saved-guides.v1", '["stay","stay","future"]'); map.set("tripcompass.decision.v1", "keep");
  const blocked = { read: false, write: false, remove: false };
  const win = { location: new URL("https://tripcompass.ai/my-trips/"),
    localStorage: {
      getItem(key) { if (blocked.read) throw Error("PRIVATE"); return map.get(key) ?? null; },
      setItem(key, value) { assert.ok(Object.values(READING_KEYS).includes(key)); if (blocked.write) throw Error("PRIVATE"); writes.push(key); map.set(key, value); },
      removeItem(key) { assert.ok(Object.values(READING_KEYS).includes(key)); if (blocked.remove) throw Error("PRIVATE"); writes.push(key); map.delete(key); }
    }, addEventListener(name, fn) { (events[name] ||= []).push(fn); } };
  doc.querySelectorAll = () => cards;
  mountMyTripsReading(doc, win);
  const emit = (name, event = {}) => events[name]?.forEach(fn => fn(event));
  const control = (city, kind) => cards.find(card => card.dataset.tripReading === city).fields[`[data-reading-${kind}]`];
  const click = (city, kind) => { const button = control(city, kind); button.focus(); button.click(); };
  return { doc, cards, map, writes, blocked, emit, control, click };
}

for (const language of ["en", "ko"]) for (const city of Object.keys(TRIPS)) {
  const f = fixture(language), before = [...f.map], key = READING_KEYS[city], raw = f.map.get(key);
  assert.equal(f.writes.length, 0, "Visits never write");
  f.click(city, "clear"); assert.equal(f.map.has(key), false); assert.equal(f.control(city, "undo").hidden, false);
  assert.equal(f.doc.activeElement, f.control(city, "undo"));
  f.blocked.read = true; f.click(city, "undo");
  assert.equal(f.map.has(key), false); assert.equal(f.control(city, "undo").hidden, false);
  assert.match(f.control(city, "status").textContent, /could not|못했/);
  f.blocked.read = false;
  f.blocked.write = true; f.click(city, "undo");
  assert.equal(f.map.has(key), false); assert.equal(f.control(city, "undo").hidden, false);
  assert.match(f.control(city, "status").textContent, /could not|못했/);
  assert.doesNotMatch(f.control(city, "status").textContent, /PRIVATE/);
  f.blocked.write = false; f.click(city, "undo");
  assert.equal(f.map.get(key), raw, "Exact original bytes, timestamp and extra fields restored");
  assert.equal(f.control(city, "undo").hidden, true);
  assert.equal(f.doc.activeElement, f.cards.find(c => c.dataset.tripReading === city).rows[1].link);
  assert.deepEqual([...f.map].sort(), before.sort(), "Preparation/bookmarks/other city records preserved");
  const count = f.writes.length; f.control(city, "undo").click(); assert.equal(f.writes.length, count, "No duplicate undo");
  f.click(city, "clear"); f.click(city, "undo"); assert.equal(f.map.get(key), raw, "Repeated cycles");
}
for (const mode of ["remove-failed", "read-failed", "newer", "corrupt-newer", "reset", "course", "alternative", "storage-clear", "pagehide", "stale-delete"]) {
  const f = fixture(), city = "fukuoka", key = READING_KEYS[city], raw = f.map.get(key);
  if (mode === "remove-failed" || mode === "read-failed") {
    f.blocked[mode === "remove-failed" ? "remove" : "read"] = true; f.click(city, "clear");
    assert.equal(f.map.get(key), raw); assert.equal(f.control(city, "undo").hidden, true); continue;
  }
  const newer = JSON.stringify({ ...JSON.parse(raw), task: "flights", at: Date.now() });
  if (mode === "stale-delete") {
    f.map.set(key, newer); f.click(city, "clear"); assert.equal(f.map.get(key), newer); assert.equal(f.control(city, "undo").hidden, true); continue;
  }
  f.click(city, "clear");
  if (mode === "newer") f.map.set(key, newer);
  if (mode === "corrupt-newer") f.map.set(key, "{");
  if (mode === "reset") f.map.delete(TRIPS[city].storageKey);
  if (["course", "alternative"].includes(mode)) { const s = initialState(); s[mode] = TRIPS[city][mode === "course" ? "courses" : "alternatives"][1]; f.map.set(TRIPS[city].storageKey, JSON.stringify(s)); }
  if (mode === "storage-clear") f.emit("storage", { key: null });
  if (mode === "pagehide") { f.emit("pagehide"); f.emit("pageshow", { persisted: true }); }
  const before = [...f.map]; f.click(city, "undo");
  assert.deepEqual([...f.map], before, `${mode}: never overwrite or recreate`);
  assert.equal(f.control(city, "undo").hidden, true);
}
const multi = fixture();
const originals = Object.fromEntries(Object.keys(TRIPS).map(city => [city, multi.map.get(READING_KEYS[city])]));
for (const city of Object.keys(TRIPS)) multi.click(city, "clear");
multi.click("osaka", "undo"); assert.equal(multi.map.get(READING_KEYS.osaka), originals.osaka);
for (const city of ["fukuoka", "tokyo"]) assert.equal(multi.control(city, "undo").hidden, false);
multi.emit("storage", { key: TRIPS.fukuoka.storageKey, newValue: null });
multi.click("fukuoka", "undo"); assert.equal(multi.map.has(READING_KEYS.fukuoka), false, "Even a delayed reset event cancels undo");
multi.emit("storage", { key: READING_KEYS.tokyo, newValue: originals.tokyo });
multi.click("tokyo", "undo"); assert.equal(multi.map.has(READING_KEYS.tokyo), false, "A replacement event cancels older undo even if later removed");
const checks = fixture(); checks.click("tokyo", "clear");
const latest = initialState("tokyo"); latest.checks.hotel = true;
checks.map.set(TRIPS.tokyo.storageKey, JSON.stringify(latest));
checks.emit("storage", { key: TRIPS.tokyo.storageKey, newValue: JSON.stringify(latest) });
checks.click("tokyo", "undo"); assert.equal(checks.map.get(TRIPS.tokyo.storageKey), JSON.stringify(latest), "Latest checks are not rolled back");
assert.ok(checks.map.has(READING_KEYS.tokyo));
console.log("Reading undo passed: EN/KO three cities, exact restoration, focus, repeated cycles, failures/retry, stale/reset/newer-record protection, independent undo and page lifetime.");
