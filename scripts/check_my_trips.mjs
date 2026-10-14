import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]);
const { TRIPS, TASKS, initialState } = await import(pathToFileURL(resolve(root, "js/trip-prep-core.js")));
const { mountMyTrips } = await import(pathToFileURL(resolve(root, "js/my-trips.js")));
const ids = Object.keys(TRIPS);

function harness(language = "en", records = new Map(), blocked = []) {
  const events = {};
  const summary = { textContent: "" };
  const quick = Object.fromEntries(ids.map(id => [id, { textContent: "" }]));
  const cards = ids.map(id => {
    const labels = values => JSON.stringify(Object.fromEntries(values.map(value => [value, `${language}:${id}:${value}`])));
    const fields = Object.fromEntries(["status", "details", "count", "progress", "course", "alternative", "next", "action-label"].map(name => [name, { textContent: "", hidden: true, value: 0 }]));
    return { fields, dataset: { tripSummary: id, courseLabels: labels(TRIPS[id].courses), alternativeLabels: labels(TRIPS[id].alternatives), taskLabels: labels(TASKS) },
      querySelector: selector => fields[selector.slice(11, -1)] };
  });
  const page = { querySelector: selector => selector === "[data-trips-summary]" ? summary : quick[selector.split('"')[1]], querySelectorAll: () => cards };
  let writes = 0;
  const win = {
    localStorage: {
      getItem(key) { if (blocked.includes(key)) throw Error("PRIVATE"); return records.get(key) ?? null; },
      setItem() { writes++; }, removeItem() { writes++; }, clear() { writes++; }
    },
    addEventListener: (type, fn) => { events[type] = fn; }
  };
  const doc = { documentElement: { lang: language }, querySelector: () => page };
  mountMyTrips(doc, win);
  return { cards, summary, quick, events, writes: () => writes, render: () => mountMyTrips(doc, win) };
}

for (const language of ["en", "ko"]) {
  const records = new Map([["tripcompass.saved-guides.v1", '["tokyo","osaka-nara","stay"]'], ["tripcompass.decision.v1", "unchanged"]]);
  const empty = harness(language, records);
  assert.ok(empty.cards.every(card => card.fields.details.hidden));
  assert.match(empty.summary.textContent, /0/);
  assert.ok(empty.cards.every(card => /Start preparing|여행 준비 시작/.test(card.fields["action-label"].textContent)));
  for (const [i, id] of ids.entries()) {
    const state = initialState(id);
    state.course = TRIPS[id].courses[1];
    state.alternative = TRIPS[id].alternatives[2];
    TASKS.forEach((task, index) => { state.checks[task] = index < [1, 3, 5][i]; });
    records.set(TRIPS[id].storageKey, JSON.stringify(state));
  }
  const before = [...records];
  const ui = harness(language, records);
  assert.deepEqual(ui.cards.map(card => card.fields.progress.value), [1, 3, 5]);
  assert.match(ui.quick.osaka.textContent, /3\/5/);
  assert.ok(ui.cards.every(card => !card.fields.details.hidden));
  ids.forEach((id, i) => {
    assert.equal(ui.cards[i].fields.course.textContent, `${language}:${id}:${TRIPS[id].courses[1]}`);
    assert.equal(ui.cards[i].fields.alternative.textContent, `${language}:${id}:${TRIPS[id].alternatives[2]}`);
  });
  assert.equal(ui.cards[0].fields.next.textContent, `${language}:fukuoka:hotel`);
  assert.equal(ui.cards[1].fields.next.textContent, `${language}:osaka:weather`);
  assert.match(ui.cards[2].fields.status.textContent, /Recheck|다시 확인/);
  assert.match(ui.cards[2].fields["action-label"].textContent, /Review|다시 보기/);
  ui.events.pageshow({ persisted: true });
  ui.events.storage({ key: null });
  assert.deepEqual([...records], before, "Overview must preserve every record byte-for-byte");
  assert.equal(ui.writes(), 0);
  records.delete(TRIPS.osaka.storageKey);
  ui.events.storage({ key: TRIPS.osaka.storageKey });
  assert.equal(ui.cards[1].fields.details.hidden, true);
  assert.equal(ui.cards[1].fields.course.textContent, "");
  assert.equal(ui.cards[1].fields.progress.value, 0);
  assert.match(ui.quick.osaka.textContent, /Not started|시작 전/);
  assert.equal(ui.cards[0].fields.progress.value, 1);
  records.set(TRIPS.tokyo.storageKey, '<script>PRIVATE</script>');
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.cards[2].fields.details.hidden, true);
  assert.match(ui.quick.tokyo.textContent, /Unavailable|확인 불가/);
  assert.match(ui.cards[2].fields.status.textContent, /not been changed|그대로/);
  assert.doesNotMatch(JSON.stringify(ui.cards), /PRIVATE/);
  assert.match(ui.summary.textContent, /could not be read|읽지 못/);
  assert.equal(records.get(TRIPS.tokyo.storageKey), '<script>PRIVATE</script>');
  assert.equal(ui.writes(), 0);
  const blocked = harness(language, records, [TRIPS.fukuoka.storageKey]);
  assert.match(blocked.cards[0].fields.status.textContent, /unavailable|사용할 수 없어/);
  assert.ok(blocked.cards[0].fields.details.hidden);
  assert.equal(blocked.writes(), 0);
  const denied = harness(language, records, ids.map(id => TRIPS[id].storageKey));
  assert.ok(denied.cards.every(card => card.fields.details.hidden));
  assert.doesNotMatch(denied.summary.textContent, /PRIVATE/);
}
mountMyTrips({ querySelector: () => null }, {});

const source = await readFile(resolve(root, "js/my-trips.js"), "utf8");
assert.doesNotMatch(source, /setItem|removeItem|\.clear\(|fetch\(|innerHTML/);
for (const prefix of ["", "/ko"]) {
  const html = await readFile(resolve(root, `.${prefix}/my-trips/index.html`), "utf8");
  assert.match(html, prefix ? /<h1>내 여행<\/h1>/ : /<h1>My trips<\/h1>/);
  for (const id of ids) assert.match(html, new RegExp(`data-trip-summary=${id}`));
  assert.equal((html.match(/data-trip-action-label/g) || []).length, 3);
  assert.match(html, /<noscript>/);
  assert.match(html, /js\/my-trips.js/);
  assert.match(html, /css\/my-trips.css/);
  assert.match(html, /data-task-labels=/);
  for (const path of ["/my-trip/", "/my-trip/osaka/", "/my-trip/tokyo/"]) {
    assert.ok(html.includes(`href=${prefix}${path}`));
    const workspace = await readFile(resolve(root, `.${prefix}${path}index.html`), "utf8");
    assert.ok(workspace.includes(`href=${prefix}/my-trips/`));
  }
  const home = await readFile(resolve(root, `.${prefix}/index.html`), "utf8");
  assert.ok(home.includes(`href=${prefix}/my-trips/`));
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`<loc>https://tripcompass.ai${prefix}/my-trips/</loc>`));
}
console.log("My trips checks passed: bilingual read-only summaries, mixed states, errors, cross-tab/reset, existing records and discovery.");
