import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]);
const { STORAGE_KEY, TRIPS, TASKS, initialState, parseState, progress } =
  await import(pathToFileURL(resolve(root, "js/trip-prep-core.js")));
const { mountTripPrep } = await import(pathToFileURL(resolve(root, "js/trip-prep.js")));
const clone = state => JSON.parse(JSON.stringify(state));
assert.equal(parseState(null), null);
for (const raw of ["broken", "null", "[]", "x".repeat(2049), JSON.stringify({ ...initialState(), version: 2 }),
  JSON.stringify({ ...initialState(), course: "javascript:alert(1)" }),
  JSON.stringify({ ...initialState(), alternative: "unknown" }),
  JSON.stringify({ ...initialState(), checks: { flights: "true" } })]) assert.throws(() => parseState(raw));
assert.deepEqual(parseState(JSON.stringify({ ...initialState(), secret: "discard", checks: { ...initialState().checks, extra: true } })), initialState());

function node(dataset = {}) {
  return { dataset, hidden: true, textContent: "", value: "", checked: false, attributes: {}, handlers: {},
    parentElement: { textContent: "Task" },
    addEventListener(type, callback) { this.handlers[type] = callback; },
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() { this.focused = true; }
  };
}
function harness({ language = "en", destination = "fukuoka", stored = null, readFail = false, writeFail = false, removeFail = false, home = false, absent = false, storageMap = null, entryIds = [destination] } = {}) {
  const trip = TRIPS[destination];
  const storage = storageMap || new Map([[trip.storageKey, stored], ["tripcompass.saved-guides.v1", '["tokyo","stay"]'], ["tripcompass.decision.v1", "keep"]]);
  const io = { readFail, writeFail, removeFail, writes: 0, removes: 0 };
  const fields = {};
  for (const name of ["status", "start", "create", "workspace", "confirm", "reset", "summary", "progress", "next", "cancel", "delete"]) fields[name] = node();
  const courses = trip.courses.map(value => Object.assign(node(), { value }));
  const alternatives = trip.alternatives.map(value => Object.assign(node(), { value }));
  const checks = TASKS.map(id => Object.assign(node({ prepCheck: id }), { parentElement: { textContent: `${language} ${id}` } }));
  const entries = entryIds.map(id => node({ tripEntry: id, startLabel: `Prepare ${id}`, continueLabel: `Continue ${id}` }));
  const entry = entries[0];
  const events = {};
  const page = {
    dataset: { tripPrep: destination },
    contains: () => true,
    querySelector: selector => fields[selector.replace("[data-prep-", "").replace("]", "")],
    querySelectorAll: selector => ({ '[name="prep-course"]': courses, '[name="prep-alternative"]': alternatives, "[data-prep-check]": checks })[selector]
  };
  const doc = { documentElement: { lang: language }, activeElement: null,
    querySelector: () => home || absent ? null : page, querySelectorAll: () => absent ? [] : entries };
  const win = {
    localStorage: {
      getItem(key) { if (io.readFail) throw new Error("PRIVATE DIAGNOSTIC"); return storage.get(key) ?? null; },
      setItem(key, value) { if (io.writeFail) throw new Error("PRIVATE DIAGNOSTIC"); storage.set(key, value); io.writes++; },
      removeItem(key) { if (io.removeFail) throw new Error("PRIVATE DIAGNOSTIC"); storage.delete(key); io.removes++; }
    },
    addEventListener(type, callback) { const previous = events[type]; events[type] = event => { previous?.(event); callback(event); }; }
  };
  mountTripPrep(doc, win);
  return { fields, courses, alternatives, checks, entry, entries, events, io, storage,
    click: name => fields[name].handlers.click(),
    state: () => parseState(storage.get(trip.storageKey), destination),
    choose: (group, value) => { const inputs = group === "course" ? courses : alternatives; inputs.forEach(input => { input.checked = input.value === value; }); inputs.find(input => input.checked).handlers.change(); },
    check: (id, checked = true) => { const input = checks.find(input => input.dataset.prepCheck === id); input.checked = checked; input.handlers.change(); }
  };
}

for (const destination of Object.keys(TRIPS)) {
for (const language of ["en", "ko"]) {
  const trip = TRIPS[destination];
  const initial = () => initialState(destination);
  const ui = harness({ language, destination });
  assert.equal(ui.io.writes, 0);
  assert.equal(ui.fields.start.hidden, false);
  assert.equal(ui.fields.workspace.hidden, true);
  ui.click("create");
  assert.deepEqual(ui.state(), initial());
  assert.equal(ui.fields.workspace.hidden, false);
  assert.ok(ui.courses[0].focused);
  ui.check("hotel");
  ui.check("weather");
  ui.check("transport");
  ui.choose("alternative", trip.alternatives[2]);
  assert.equal(ui.state().checks.hotel, true);
  assert.equal(ui.state().checks.weather, false);
  assert.equal(ui.state().checks.transport, false);
  ui.choose("course", trip.courses[1]);
  assert.equal(progress(ui.state()).done, 0);
  TASKS.forEach(id => ui.check(id));
  assert.deepEqual(progress(ui.state()), { done: 5, next: null });
  assert.equal(ui.fields.progress.value, 5);
  assert.equal(ui.fields.next.attributes.href, "#prep-checklist");
  ui.check("hotel", false);
  assert.equal(ui.fields.next.attributes.href, "#prep-task-hotel");
  const reloaded = harness({ destination, language: language === "en" ? "ko" : "en", stored: ui.storage.get(trip.storageKey) });
  assert.equal(reloaded.courses.find(input => input.checked).value, trip.courses[1]);
  assert.equal(reloaded.alternatives.find(input => input.checked).value, trip.alternatives[2]);
  assert.equal(reloaded.fields.progress.value, 4);
  assert.equal(reloaded.io.writes, 0);
  const home = harness({ language, destination, home: true, stored: ui.storage.get(trip.storageKey) });
  assert.match(home.entry.textContent, /Continue|이어보기/);
  ui.click("reset");
  assert.equal(ui.fields.confirm.hidden, false);
  assert.ok(ui.fields.cancel.focused);
  ui.click("cancel");
  assert.equal(ui.fields.confirm.hidden, true);
  assert.equal(ui.state().course, trip.courses[1]);
  ui.click("reset"); ui.click("delete");
  assert.equal(ui.state(), null);
  assert.equal(ui.storage.get("tripcompass.saved-guides.v1"), '["tokyo","stay"]');
  assert.equal(ui.storage.get("tripcompass.decision.v1"), "keep");
  assert.equal(ui.fields.start.hidden, false);
  assert.ok(ui.fields.create.focused);

  const blocked = harness({ language, destination, readFail: true, writeFail: true });
  blocked.click("create"); blocked.check("hotel"); blocked.choose("alternative", trip.alternatives[1]); blocked.check("flights");
  assert.equal(blocked.fields.progress.value, 2);
  assert.equal(blocked.io.writes, 0);
  assert.match(blocked.fields.status.textContent, /Not saved|저장되지/);
  blocked.events.storage({ key: trip.storageKey }); blocked.events.pageshow({ persisted: true });
  assert.equal(blocked.fields.progress.value, 2);
  assert.doesNotMatch(blocked.fields.status.textContent, /PRIVATE/);
  const failedReset = harness({ language, destination, stored: JSON.stringify(initial()), removeFail: true });
  failedReset.click("reset"); failedReset.click("delete");
  assert.ok(failedReset.state());
  assert.equal(failedReset.fields.workspace.hidden, false);
  assert.match(failedReset.fields.status.textContent, /Could not remove|지우지 못/);
}
}

assert.equal(TRIPS.fukuoka.storageKey, "tripcompass.trip-prep.v1", "Do not migrate released Fukuoka records");
assert.notEqual(TRIPS.osaka.storageKey, TRIPS.fukuoka.storageKey);
assert.throws(() => parseState(JSON.stringify(initialState()), "osaka"));
assert.throws(() => parseState(JSON.stringify(initialState("osaka"))));
for (const destination of ["tokyo", "__proto__", "constructor"]) assert.throws(() => initialState(destination));
for (const destination of Object.keys(TRIPS)) {
  for (const raw of ["broken", "x".repeat(2049), JSON.stringify({ ...initialState(destination), alternative: "unknown" }),
    JSON.stringify({ ...initialState(destination), checks: { hotel: "true" } })]) assert.throws(() => parseState(raw, destination));
  const corrupt = harness({ destination, stored: "broken" });
  assert.equal(corrupt.io.writes, 0);
  corrupt.click("create");
  assert.deepEqual(corrupt.state(), initialState(destination));
}
const legacy = JSON.stringify({ ...initialState(), course: "parents", alternative: "rain" });
const shared = new Map([[STORAGE_KEY, legacy], ["tripcompass.saved-guides.v1", '["fukuoka-rain","osaka-nara"]'], ["tripcompass.decision.v1", "keep"]]);
const osaka = harness({ destination: "osaka", storageMap: shared });
assert.equal(osaka.io.writes, 0);
osaka.click("create"); osaka.choose("alternative", "kyoto"); osaka.check("transport");
osaka.choose("alternative", "nara");
assert.equal(osaka.state().alternative, "nara", "Only one Day 3 destination");
assert.equal(osaka.state().checks.transport, false);
assert.equal(shared.get(STORAGE_KEY), legacy, "Osaka must not modify legacy preparation");
const otherOsaka = harness({ destination: "osaka", storageMap: shared, language: "ko" });
otherOsaka.check("hotel"); osaka.check("flights");
assert.equal(osaka.state().checks.hotel, true, "Merge other-tab Osaka changes");
otherOsaka.events.storage({ key: TRIPS.osaka.storageKey });
assert.equal(otherOsaka.fields.progress.value, 2);
const bothHome = harness({ home: true, storageMap: shared, entryIds: ["fukuoka", "osaka"] });
assert.deepEqual(bothHome.entries.map(entry => entry.textContent), ["Continue fukuoka", "Continue osaka"]);
osaka.click("reset"); osaka.click("delete");
bothHome.events.storage({ key: TRIPS.osaka.storageKey });
assert.deepEqual(bothHome.entries.map(entry => entry.textContent), ["Continue fukuoka", "Prepare osaka"]);
assert.equal(shared.get(STORAGE_KEY), legacy);
assert.equal(shared.get("tripcompass.saved-guides.v1"), '["fukuoka-rain","osaka-nara"]');
osaka.click("create"); osaka.check("hotel");
const osakaRecord = shared.get(TRIPS.osaka.storageKey);
const fukuoka = harness({ storageMap: shared });
fukuoka.click("reset"); fukuoka.click("delete");
assert.equal(shared.get(TRIPS.osaka.storageKey), osakaRecord, "Fukuoka reset must preserve Osaka");

const tabs = harness({ stored: JSON.stringify(initialState()) });
const other = clone(initialState()); other.checks.hotel = true;
tabs.storage.set(STORAGE_KEY, JSON.stringify(other));
tabs.check("flights");
assert.equal(tabs.state().checks.hotel, true, "Preserve an unseen other-tab edit");
assert.equal(tabs.state().checks.flights, true);
other.course = "parents";
tabs.storage.set(STORAGE_KEY, JSON.stringify(other));
tabs.events.storage({ key: STORAGE_KEY });
assert.ok(tabs.courses[1].checked);
tabs.storage.delete(STORAGE_KEY); tabs.events.pageshow({ persisted: true });
assert.equal(tabs.fields.workspace.hidden, true);
tabs.storage.set(STORAGE_KEY, JSON.stringify(other)); tabs.events.storage({ key: null });
assert.equal(tabs.fields.workspace.hidden, false);
tabs.io.readFail = true; tabs.io.writeFail = true;
tabs.check("departure");
assert.equal(tabs.fields.progress.value, 2, "Transient read failure retains existing in-memory progress");
const invalid = harness({ stored: '{"version":99}' });
assert.equal(invalid.io.writes, 0);
assert.match(invalid.fields.status.textContent, /could not be read/);
invalid.click("create");
assert.deepEqual(invalid.state(), initialState());
assert.equal(harness({ absent: true }).io.writes, 0);

const script = await readFile(resolve(root, "js/trip-prep.js"), "utf8");
assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|sendBeacon|innerHTML|console\.|\/api\/|OPENAI/);
for (const prefix of ["", "ko/"]) {
 for (const destination of Object.keys(TRIPS)) {
  const path = destination === "fukuoka" ? "my-trip/" : "my-trip/osaka/";
  const html = await readFile(resolve(root, prefix, path, "index.html"), "utf8");
  assert.match(html, /data-trip-prep/);
  assert.equal((html.match(/data-prep-check=/g) || []).length, 5);
  assert.equal((html.match(/data-save-guide=/g) || []).length, destination === "fukuoka" ? 6 : 5);
  assert.match(html, /data-prep-workspace hidden/);
  assert.match(html, /<noscript>/);
  assert.match(html, /fukuoka-rain/);
  assert.match(html, /travel-days/);
  assert.match(html, /hreflang=en/);
  assert.match(html, /hreflang=ko/);
  assert.ok(html.includes(`destination=${destination}&amp;country=japan`));
  assert.ok(html.includes(`to=${destination}&amp;country=japan`));
  assert.ok(html.includes(`lang=${prefix ? "ko" : "en"}`));
  assert.ok(html.includes(`https://tripcompass.ai/${prefix}${path}`));
  assert.match(html, /my-trip\/osaka\//);
  assert.match(html, /osaka-nara/);
  for (const id of TRIPS[destination].courses) assert.ok(html.includes(`value=${id}`));
  for (const id of TRIPS[destination].alternatives) assert.ok(html.includes(`value=${id}`));
 }
  const home = await readFile(resolve(root, prefix, "index.html"), "utf8");
  assert.match(home, /data-trip-entry/);
  assert.match(home, /data-guide-ids=[^ >]*travel-days/);
  assert.match(home, /data-trip-entry=osaka/);
  assert.match(home, /data-trip-entry=fukuoka/);
  for (const id of ["osaka-kyoto", "osaka-nara", "osaka-doguyasuji"]) assert.ok(home.includes(id));
  for (const slug of ["seoul-to-osaka-4-day-itinerary", "osaka-or-kyoto-day-trip", "osaka-to-nara-temple-park-day", "osaka-doguyasuji-kitchenware-walk"]) {
    const guide = await readFile(resolve(root, prefix, "itinerary", slug, "index.html"), "utf8");
    assert.match(guide, /data-trip-entry=osaka/);
    assert.doesNotMatch(guide, /data-trip-entry=fukuoka/);
  }
}
console.log("Trip preparation check passed: EN/KO state, persistence, progress, alternatives, cross-tab merge, reset isolation, failure handling, no network and built pages.");

const liveCheck = await readFile("scripts/check_production_live.sh", "utf8");
for (const marker of ["for language in en ko", "$prefix/my-trip/", "data-prep-delete", "data-save-guide",
  "js/trip-prep-core.js", "interactive QA remains a browser check"]) assert.ok(liveCheck.includes(marker));
