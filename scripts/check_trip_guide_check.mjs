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
    const progressSection = { hidden: true }, progressText = { textContent: "" }, remainingHeading = { hidden: true };
    const progressBar = { value: 0, setAttribute(name, value) { this[name] = value; } };
    const remainingRows = TASKS.map(id => ({ dataset: { guideRemainingTask: id }, hidden: true, contains(el) { return el === this; } }));
    const allStatus = { textContent: "" };
    const allInputs = TASKS.map(id => ({ dataset: { guideAllCheck: id }, checked: false, disabled: true, addEventListener(_, fn) { this.change = fn; } }));
    const disclosure = {}, checklist = { contains(el) { return el === disclosure || allInputs.includes(el); } };
    return { dataset: { guideReturn: `#prep-${city}-${task}`, guideCity: city, guideTask: task }, input, status, link, nextSection, complete, nextRows, progressSection, progressText, progressBar, remainingHeading, remainingRows, allStatus, allInputs, checklist, disclosure,
      querySelectorAll: selector => ({ "[data-guide-next-task]": nextRows, "[data-guide-remaining-task]": remainingRows, "[data-guide-all-check]": allInputs })[selector],
      querySelector: selector => ({ "[data-guide-check]": input, "[data-guide-check-status]": status, "[data-guide-next]": nextSection, "[data-guide-next-complete]": complete, "[data-guide-progress]": progressSection, "[data-guide-progress-text]": progressText, "[data-guide-progress-bar]": progressBar, "[data-guide-remaining-heading]": remainingHeading, "[data-guide-all-status]": allStatus, "[data-guide-checklist]": checklist, a: link })[selector] };
  });
  const doc = { documentElement: { lang }, activeElement: null, querySelectorAll: () => panels };
  mountGuideChecks(doc, win);
  const edit = (checked, index = 0) => { panels[index].input.checked = checked; doc.activeElement = panels[index].input; panels[index].input.change(); };
  const editAll = (task, checked, index = 0) => { const input = panels[index].allInputs.find(input => input.dataset.guideAllCheck === task); input.checked = checked; doc.activeElement = input; input.change(); };
  return { values, writes, events, storage, win, panels, doc, edit, editAll, key: TRIPS[city].storageKey };
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
      const remaining = TASKS.filter(id => !state.checks[id]);
      const done = TASKS.length - remaining.length;
      assert.equal(panel.progressSection.hidden, false);
      assert.deepEqual(panel.allInputs.map(input => input.checked), TASKS.map(id => state.checks[id]));
      assert.ok(panel.allInputs.every(input => !input.disabled));
      assert.equal(panel.progressBar.value, done);
      assert.equal(panel.progressText.textContent, lang === "ko" ? `5개 중 ${done}개 체크 (${done * 20}%) · ${remaining.length}개 남음` : `${done}/5 marked (${done * 20}%) · ${remaining.length} remaining`);
      assert.equal(panel.progressBar["aria-valuetext"], panel.progressText.textContent);
      assert.equal(panel.remainingHeading.hidden, !remaining.length);
      assert.deepEqual(panel.remainingRows.filter(row => !row.hidden).map(row => row.dataset.guideRemainingTask), remaining);
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

const summary = fixture("ko");
summary.storage.failWrite = true; summary.edit(true);
assert.ok(summary.panels.every(p => p.progressBar.value === 0 && p.remainingRows.every(r => !r.hidden)), "Failed writes retain saved progress");
summary.storage.failWrite = false; summary.edit(true);
assert.ok(summary.panels.every(p => p.progressBar.value === 1 && p.remainingRows[1].hidden));
summary.doc.activeElement = summary.panels[1].remainingRows[0];
const updated = JSON.parse(summary.values.get(summary.key)); updated.checks.flights = true;
summary.values.set(summary.key, JSON.stringify(updated)); summary.events.storage({ key: summary.key });
assert.equal(summary.doc.activeElement, summary.panels[1].input, "Removed remaining link recovers focus");
assert.ok(summary.panels.every(p => p.progressBar.value === 2));
for (const mode of ["missing", "corrupt", "blocked", "invalid-context"]) {
  const s = fixture();
  if (mode === "missing") s.values.delete(s.key);
  if (mode === "corrupt") s.values.set(s.key, "PRIVATE invalid");
  if (mode === "blocked") s.storage.blocked = true;
  if (mode === "invalid-context") s.win.location.hash = "#unknown";
  s.events.pageshow();
  assert.ok(s.panels.every(p => p.progressSection.hidden && p.progressText.textContent === "" && p.remainingRows.every(r => r.hidden)), "Unavailable progress is hidden, not claimed zero");
  assert.equal(s.writes.length, 0);
}
console.log("Guide city progress passed: 960 localized states, exact remaining order/count, accessible progress, rollback, unavailable-state hiding and focus recovery without new writes.");

for (const lang of ["en", "ko"]) for (const city of Object.keys(TRIPS)) for (const context of TASKS) for (const task of TASKS) {
  const f = fixture(lang, city, context), before = new Map(f.values);
  for (const [checked, index] of [[true, 0], [false, 1]]) {
    f.editAll(task, checked, index);
    const expected = new Map(before), state = JSON.parse(before.get(f.key)); state.checks[task] = checked;
    expected.set(f.key, JSON.stringify(state));
    assert.deepEqual(f.values, expected, "Only selected boolean changes; other city/bookmark/extra data stays intact");
    assert.equal(f.doc.activeElement, f.panels[index].allInputs.find(input => input.dataset.guideAllCheck === task), "Focus stays on edited control");
    assert.ok(f.panels.every(p => p.allInputs.find(input => input.dataset.guideAllCheck === task).checked === checked));
    assert.ok(f.panels.every(p => p.input.checked === (context === task && checked)));
    assert.ok(f.panels.every(p => p.progressBar.value === Number(checked)));
    assert.match(f.panels[index].allStatus.textContent, lang === "ko" ? /저장했어요/ : /Saved in this browser/);
    assert.equal(f.panels[1-index].allStatus.textContent, "", "No duplicate announcement");
    assert.ok(f.panels.every(p => p.status.textContent === ""));
  }
}
for (const lang of ["en", "ko"]) {
  const f = fixture(lang), original = new Map(f.values);
  f.storage.failWrite = true; f.editAll("weather", true);
  assert.deepEqual(f.values, original);
  assert.ok(f.panels.every(p => !p.allInputs[3].checked && p.progressBar.value === 0));
  assert.match(f.panels[0].allStatus.textContent, lang === "ko" ? /못했어요/ : /could not/);
  assert.ok(!f.panels[0].allStatus.textContent.includes("PRIVATE"));
  f.storage.failWrite = false;
  const latest = JSON.parse(f.values.get(f.key)); latest.checks.transport = true;
  f.values.set(f.key, JSON.stringify(latest)); f.editAll("weather", true);
  assert.ok(f.panels.every(p => p.progressBar.value === 2 && p.allInputs[2].checked && p.allInputs[3].checked));
  latest.checks.weather = true; latest.course = "parents";
  f.values.set(f.key, JSON.stringify(latest)); f.editAll("departure", true);
  assert.equal(JSON.parse(f.values.get(f.key)).checks.departure, false, "Reject stale course");
  assert.match(f.panels[0].allStatus.textContent, lang === "ko" ? /바뀌었어요/ : /changed/);
  f.values.delete(f.key); f.editAll("departure", true, 1);
  assert.equal(f.values.has(f.key), false);
  assert.equal(f.doc.activeElement, f.panels[1].link, "Focus leaves unavailable checklist");
  assert.ok(f.panels.every(p => p.progressSection.hidden && p.allInputs.every(input => input.disabled)));
  assert.ok(f.panels[1].status.textContent.length > 0, "Reset notice remains outside hidden summary");
  f.values.set(f.key, "PRIVATE bad"); f.editAll("flights", true);
  assert.equal(f.values.get(f.key), "PRIVATE bad");
  f.storage.blocked = true; f.events.storage({ key: null });
  assert.ok(f.panels.every(p => p.allInputs.every(input => input.disabled)));
  f.storage.blocked = false; f.values.set(f.key, JSON.stringify(initialState())); f.events.pageshow({ persisted: true });
  assert.ok(f.panels.every(p => p.allInputs.every(input => !input.disabled && !input.checked)));
  f.win.location.hash = "#unknown"; f.events.hashchange(); const count = f.writes.length; f.editAll("hotel", true);
  assert.equal(f.writes.length, count, "Inactive full checklist cannot write");
}
console.log("Guide full checklist passed: 300 targeted edits, synchronized controls, 960 restored states, record isolation, localized feedback, rollback/retry and stale/reset protection.");
const disclosureReset = fixture();
disclosureReset.doc.activeElement = disclosureReset.panels[0].disclosure;
disclosureReset.values.delete(disclosureReset.key); disclosureReset.events.storage({ key: null });
assert.equal(disclosureReset.doc.activeElement, disclosureReset.panels[0].link, "Unavailable disclosure recovers focus too");
