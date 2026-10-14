import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]);
const { STORAGE_KEY, COURSES, ALTERNATIVES, TASKS, initialState, parseState, progress } =
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
function harness({ language = "en", stored = null, readFail = false, writeFail = false, removeFail = false, home = false, absent = false } = {}) {
  const storage = new Map([[STORAGE_KEY, stored], ["tripcompass.saved-guides.v1", '["tokyo","stay"]'], ["tripcompass.decision.v1", "keep"]]);
  const io = { readFail, writeFail, removeFail, writes: 0, removes: 0 };
  const fields = {};
  for (const name of ["status", "start", "create", "workspace", "confirm", "reset", "summary", "progress", "next", "cancel", "delete"]) fields[name] = node();
  const courses = COURSES.map(value => Object.assign(node(), { value }));
  const alternatives = ALTERNATIVES.map(value => Object.assign(node(), { value }));
  const checks = TASKS.map(id => Object.assign(node({ prepCheck: id }), { parentElement: { textContent: `${language} ${id}` } }));
  const entry = node();
  const events = {};
  const page = {
    contains: () => true,
    querySelector: selector => fields[selector.replace("[data-prep-", "").replace("]", "")],
    querySelectorAll: selector => ({ '[name="prep-course"]': courses, '[name="prep-alternative"]': alternatives, "[data-prep-check]": checks })[selector]
  };
  const doc = { documentElement: { lang: language }, activeElement: null,
    querySelector: () => home || absent ? null : page, querySelectorAll: () => absent ? [] : [entry] };
  const win = {
    localStorage: {
      getItem(key) { if (io.readFail) throw new Error("PRIVATE DIAGNOSTIC"); return storage.get(key) ?? null; },
      setItem(key, value) { if (io.writeFail) throw new Error("PRIVATE DIAGNOSTIC"); storage.set(key, value); io.writes++; },
      removeItem(key) { if (io.removeFail) throw new Error("PRIVATE DIAGNOSTIC"); storage.delete(key); io.removes++; }
    },
    addEventListener(type, callback) { events[type] = callback; }
  };
  mountTripPrep(doc, win);
  return { fields, courses, alternatives, checks, entry, events, io, storage,
    click: name => fields[name].handlers.click(),
    state: () => parseState(storage.get(STORAGE_KEY)),
    choose: (group, value) => { const inputs = group === "course" ? courses : alternatives; inputs.forEach(input => { input.checked = input.value === value; }); inputs.find(input => input.checked).handlers.change(); },
    check: (id, checked = true) => { const input = checks.find(input => input.dataset.prepCheck === id); input.checked = checked; input.handlers.change(); }
  };
}

for (const language of ["en", "ko"]) {
  const ui = harness({ language });
  assert.equal(ui.io.writes, 0);
  assert.equal(ui.fields.start.hidden, false);
  assert.equal(ui.fields.workspace.hidden, true);
  ui.click("create");
  assert.deepEqual(ui.state(), initialState());
  assert.equal(ui.fields.workspace.hidden, false);
  assert.ok(ui.courses[0].focused);
  ui.check("hotel");
  ui.check("weather");
  ui.check("transport");
  ui.choose("alternative", "dazaifu");
  assert.equal(ui.state().checks.hotel, true);
  assert.equal(ui.state().checks.weather, false);
  assert.equal(ui.state().checks.transport, false);
  ui.choose("course", "parents");
  assert.equal(progress(ui.state()).done, 0);
  TASKS.forEach(id => ui.check(id));
  assert.deepEqual(progress(ui.state()), { done: 5, next: null });
  assert.equal(ui.fields.progress.value, 5);
  assert.equal(ui.fields.next.attributes.href, "#prep-checklist");
  ui.check("hotel", false);
  assert.equal(ui.fields.next.attributes.href, "#prep-task-hotel");
  const reloaded = harness({ language: language === "en" ? "ko" : "en", stored: ui.storage.get(STORAGE_KEY) });
  assert.equal(reloaded.courses.find(input => input.checked).value, "parents");
  assert.equal(reloaded.alternatives.find(input => input.checked).value, "dazaifu");
  assert.equal(reloaded.fields.progress.value, 4);
  assert.equal(reloaded.io.writes, 0);
  const home = harness({ language, home: true, stored: ui.storage.get(STORAGE_KEY) });
  assert.match(home.entry.textContent, /Continue|이어보기/);
  ui.click("reset");
  assert.equal(ui.fields.confirm.hidden, false);
  assert.ok(ui.fields.cancel.focused);
  ui.click("cancel");
  assert.equal(ui.fields.confirm.hidden, true);
  assert.equal(ui.state().course, "parents");
  ui.click("reset"); ui.click("delete");
  assert.equal(ui.state(), null);
  assert.equal(ui.storage.get("tripcompass.saved-guides.v1"), '["tokyo","stay"]');
  assert.equal(ui.storage.get("tripcompass.decision.v1"), "keep");
  assert.equal(ui.fields.start.hidden, false);
  assert.ok(ui.fields.create.focused);

  const blocked = harness({ language, readFail: true, writeFail: true });
  blocked.click("create"); blocked.check("hotel"); blocked.choose("alternative", "rain"); blocked.check("flights");
  assert.equal(blocked.fields.progress.value, 2);
  assert.equal(blocked.io.writes, 0);
  assert.match(blocked.fields.status.textContent, /Not saved|저장되지/);
  blocked.events.storage({ key: STORAGE_KEY }); blocked.events.pageshow({ persisted: true });
  assert.equal(blocked.fields.progress.value, 2);
  assert.doesNotMatch(blocked.fields.status.textContent, /PRIVATE/);
  const failedReset = harness({ language, stored: JSON.stringify(initialState()), removeFail: true });
  failedReset.click("reset"); failedReset.click("delete");
  assert.ok(failedReset.state());
  assert.equal(failedReset.fields.workspace.hidden, false);
  assert.match(failedReset.fields.status.textContent, /Could not remove|지우지 못/);
}

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
  const html = await readFile(resolve(root, prefix, "my-trip/index.html"), "utf8");
  assert.match(html, /data-trip-prep/);
  assert.equal((html.match(/data-prep-check=/g) || []).length, 5);
  assert.equal((html.match(/data-save-guide=/g) || []).length, 6);
  assert.match(html, /data-prep-workspace hidden/);
  assert.match(html, /<noscript>/);
  assert.match(html, /fukuoka-rain/);
  assert.match(html, /travel-days/);
  assert.match(html, /hreflang=en/);
  assert.match(html, /hreflang=ko/);
  const home = await readFile(resolve(root, prefix, "index.html"), "utf8");
  assert.match(home, /data-trip-entry/);
  assert.match(home, /data-guide-ids=[^ >]*travel-days/);
}
console.log("Trip preparation check passed: EN/KO state, persistence, progress, alternatives, cross-tab merge, reset isolation, failure handling, no network and built pages.");

const liveCheck = await readFile("scripts/check_production_live.sh", "utf8");
for (const marker of ["for language in en ko", "$prefix/my-trip/", "data-prep-delete", "data-save-guide",
  "js/trip-prep-core.js", "interactive QA remains a browser check"]) assert.ok(liveCheck.includes(marker));
