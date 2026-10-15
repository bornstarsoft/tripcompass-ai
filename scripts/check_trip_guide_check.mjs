import assert from "node:assert/strict";
import { initialState, TRIPS, parseState, TASKS } from "../static/js/trip-prep-core.js";
import { saveExistingCheck } from "../static/js/trip-check-edit.js";
import { mountGuideChecks } from "../static/js/trip-guide-check.js";

function fixture(lang = "en", city = "fukuoka", task = "hotel", hash = `#prep-${city}-${task}`) {
  const values = new Map(Object.entries(TRIPS).map(([id, trip]) => [trip.storageKey, JSON.stringify({ ...initialState(id), extra: "keep", checks: { ...initialState(id).checks, future: "keep" } })]));
  values.set("tripcompass.saved-guides.v1", '["stay","stay","future-id"]');
  values.set("tripcompass.decision.v1", "unchanged");
  const events = {}, writes = [];
  const storage = {
    blocked: false, failWrite: false,
    getItem(key) { if (this.blocked) throw Error("PRIVATE"); return values.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite) throw Error("PRIVATE"); writes.push(key); values.set(key, value); }
  };
  const win = { localStorage: storage, location: { hash }, requestAnimationFrame: fn => fn(), addEventListener: (event, fn) => { events[event] = fn; } };
  const panels = Array.from({ length: 2 }, () => {
    const input = { checked: false, disabled: true, addEventListener(_, fn) { this.change = fn; }, focus() { doc.activeElement = input; }, scrollIntoView() {} };
    const status = { textContent: "" }, link = { focus() { doc.activeElement = link; }, scrollIntoView() {} };
    const nextSection = { hidden: true }, complete = { hidden: true };
    const nextRows = TASKS.map(id => ({ dataset: { guideNextTask: id }, hidden: true, contains(el) { return el === this; } }));
    return { dataset: { guideReturn: `#prep-${city}-${task}`, guideCity: city, guideTask: task }, input, status, link, nextSection, complete, nextRows,
      querySelectorAll: () => nextRows,
      querySelector: selector => ({ "[data-guide-check]": input, "[data-guide-check-status]": status, "[data-guide-next]": nextSection, "[data-guide-next-complete]": complete, a: link })[selector] };
  });
  const doc = { documentElement: { lang }, activeElement: null, querySelectorAll: () => panels };
  mountGuideChecks(doc, win);
  const edit = (checked, index = 0) => { panels[index].input.checked = checked; doc.activeElement = panels[index].input; panels[index].input.change(); };
  return { values, writes, events, storage, win, panels, doc, edit, key: TRIPS[city].storageKey };
}

for (const lang of ["en", "ko"]) for (const city of Object.keys(TRIPS)) for (const task of TASKS) {
  const f = fixture(lang, city, task), before = new Map(f.values);
  assert.equal(f.writes.length, 0, "Visits do not write");
  f.edit(true);
  assert.ok(f.panels.every(p => p.input.checked && !p.input.disabled));
  assert.match(f.panels[0].status.textContent, lang === "ko" ? /저장했어요/ : /Saved in this browser/);
  assert.equal(f.panels[1].status.textContent, "", "No duplicate success announcement");
  const expected = JSON.parse(before.get(f.key)); expected.checks[task] = true;
  assert.deepEqual(JSON.parse(f.values.get(f.key)), expected);
  for (const [key, value] of before) if (key !== f.key) assert.equal(f.values.get(key), value);
  f.edit(false, 1);
  assert.equal(f.values.get(f.key), before.get(f.key));
  assert.ok(f.panels.every(p => !p.input.checked));
  f.events.pageshow(); assert.equal(f.writes.length, 2);
}

for (const lang of ["en", "ko"]) {
  const f = fixture(lang);
  const latest = JSON.parse(f.values.get(f.key)); latest.checks.flights = true;
  f.values.set(f.key, JSON.stringify(latest)); f.edit(true);
  assert.equal(JSON.parse(f.values.get(f.key)).checks.flights, true, "Merge latest other task");
  f.storage.failWrite = true; const before = f.values.get(f.key); f.edit(false);
  assert.equal(f.values.get(f.key), before); assert.ok(f.panels.every(p => p.input.checked));
  assert.match(f.panels[0].status.textContent, lang === "ko" ? /못했어요/ : /could not/);
  assert.ok(!f.panels[0].status.textContent.includes("PRIVATE"));
  f.storage.failWrite = false; f.edit(false); assert.ok(!f.panels[0].input.checked);
  const changed = JSON.parse(f.values.get(f.key)); changed.course = "parents";
  f.values.set(f.key, JSON.stringify(changed)); f.edit(true);
  assert.equal(JSON.parse(f.values.get(f.key)).checks.hotel, false, "Reject stale course");
  assert.match(f.panels[0].status.textContent, lang === "ko" ? /바뀌었어요/ : /changed/);
  f.values.delete(f.key); f.edit(true);
  assert.equal(f.values.has(f.key), false, "Never recreate a reset");
  assert.ok(f.panels.every(p => p.input.disabled));
  assert.equal(f.doc.activeElement, f.panels[0].link);
  f.values.set(f.key, "bad JSON"); f.events.storage({ key: f.key });
  f.edit(true); assert.equal(f.values.get(f.key), "bad JSON");
  f.storage.blocked = true; f.events.storage({ key: null });
  assert.ok(f.panels.every(p => p.input.disabled));
  f.storage.blocked = false; f.values.set(f.key, JSON.stringify(initialState()));
  f.events.storage({ key: f.key }); assert.ok(f.panels.every(p => !p.input.disabled));
  f.win.location.hash = "#prep-osaka-hotel"; f.events.hashchange();
  const count = f.writes.length; f.edit(true); assert.equal(f.writes.length, count, "Inactive panel cannot edit");
  f.win.location.hash = "#prep-fukuoka-hotel"; f.events.hashchange();
  assert.ok(f.panels.every(p => !p.input.disabled));
}
const absent = fixture("en", "fukuoka", "hotel", "");
assert.ok(absent.panels.every(p => p.input.disabled)); assert.equal(absent.writes.length, 0);
const f = fixture();
const previous = parseState(f.values.get(f.key));
assert.throws(() => saveExistingCheck(f.storage, "__proto__", "hotel", true, previous));
assert.throws(() => saveExistingCheck(f.storage, "fukuoka", "bad", true, previous));
assert.throws(() => saveExistingCheck(f.storage, "fukuoka", "hotel", "true", previous));
assert.equal(saveExistingCheck(f.storage, "fukuoka", "hotel", false, previous), "saved");
assert.equal(f.writes.length, 0, "No redundant write");
console.log("Guide task editing passed: 30 localized contexts, check/uncheck, record isolation, fresh merges, rollback/retry, stale/reset protection and storage/history updates.");

for (const lang of ["en", "ko"]) for (const city of Object.keys(TRIPS)) for (const task of TASKS) {
  const f = fixture(lang, city, task);
  for (let mask = 0; mask < 32; mask++) {
    const state = initialState(city);
    TASKS.forEach((id, i) => { state.checks[id] = !!(mask & (1 << i)); });
    f.values.set(f.key, JSON.stringify(state));
    f.events.storage({ key: f.key });
    const next = state.checks[task] ? TASKS.find(id => !state.checks[id]) : null;
    for (const panel of f.panels) {
      assert.equal(panel.nextSection.hidden, !next);
      assert.equal(panel.complete.hidden, !state.checks[task] || !!next);
      assert.deepEqual(panel.nextRows.filter(row => !row.hidden).map(row => row.dataset.guideNextTask), next ? [next] : []);
    }
  }
  assert.equal(f.writes.length, 0, "Computing next steps never writes");
}
const next = fixture();
next.storage.failWrite = true; next.edit(true);
assert.ok(next.panels.every(p => p.nextSection.hidden && p.complete.hidden), "Failed check cannot advance");
next.storage.failWrite = false; next.edit(true);
assert.equal(next.panels[0].nextRows.find(row => !row.hidden).dataset.guideNextTask, "flights");
next.doc.activeElement = next.panels[0].nextRows[0];
const state = JSON.parse(next.values.get(next.key)); state.checks.flights = true;
next.values.set(next.key, JSON.stringify(state)); next.events.storage({ key: next.key });
assert.equal(next.doc.activeElement, next.panels[0].input, "Disappearing next link recovers focus");
assert.equal(next.panels[0].nextRows.find(row => !row.hidden).dataset.guideNextTask, "transport");
next.storage.blocked = true; next.events.storage({ key: null });
assert.ok(next.panels.every(p => p.nextSection.hidden && p.complete.hidden));
next.storage.blocked = false; next.win.location.hash = "#unknown"; next.events.hashchange();
assert.ok(next.panels.every(p => p.nextSection.hidden && p.complete.hidden));
next.win.location.hash = "#prep-fukuoka-hotel"; next.events.hashchange();
assert.equal(next.doc.activeElement, next.panels[0].input, "New context focuses active task");
next.doc.activeElement = next.panels[1].input; next.events.pageshow({ persisted: true });
assert.equal(next.doc.activeElement, next.panels[1].input, "History restoration does not force top focus");
console.log("Next task checks passed: 960 state/context combinations, saved-state-only progression, completion/uncheck, storage updates, invalid context and focus recovery.");
