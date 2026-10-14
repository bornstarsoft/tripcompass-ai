import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]);
const { TRIPS, TASKS, initialState } = await import(pathToFileURL(resolve(root, "js/trip-prep-core.js")));
const { mountMyTrips } = await import(pathToFileURL(resolve(root, "js/my-trips.js")));
const ids = Object.keys(TRIPS);
const bookmarkKey = "tripcompass.saved-guides.v1";
const cityGuides = {
  fukuoka: ["fukuoka", "parents", "stay", "fukuoka-rain", "fukuoka-dazaifu", "travel-days"],
  osaka: ["osaka", "osaka-kyoto", "osaka-nara", "osaka-doguyasuji", "travel-days"],
  tokyo: ["tokyo", "tokyo-jimbocho", "tokyo-kiyosumi", "travel-days"]
};

function harness(language = "en", records = new Map(), blocked = []) {
  const events = {};
  const doc = { documentElement: { lang: language } };
  const summary = { textContent: "" };
  const quick = Object.fromEntries(ids.map(id => [id, { textContent: "" }]));
  const cards = ids.map(id => {
    const labels = values => JSON.stringify(Object.fromEntries(values.map(value => [value, `${language}:${id}:${value}`])));
    const fields = Object.fromEntries(["status", "details", "count", "progress", "course", "alternative", "next", "action-label", "guides-status", "guides-list", "guides-feedback"].map(name => [name, { textContent: "", hidden: true, value: 0 }]));
    const guides = cityGuides[id].map(id => {
      const controls = Object.fromEntries(["remove", "undo", "removed"].map(action => {
        const node = { hidden: false, addEventListener(type, fn) { this[type] = fn; }, focus() { doc.activeElement = this; } };
        return [`[data-guide-${action}]`, node];
      }));
      controls.a = { textContent: `${language}:${id}` };
      return { dataset: { tripSavedGuide: id }, hidden: true, controls, querySelector: selector => controls[selector] };
    });
    return { fields, guides, dataset: { tripSummary: id, courseLabels: labels(TRIPS[id].courses), alternativeLabels: labels(TRIPS[id].alternatives), taskLabels: labels(TASKS) },
      querySelectorAll: () => guides,
      querySelector: selector => fields[selector.slice(11, -1)] };
  });
  const page = { querySelector: selector => selector === "[data-trips-summary]" ? summary : quick[selector.split('"')[1]], querySelectorAll: () => cards };
  let writes = 0;
  let failWrites = false;
  const win = {
    localStorage: {
      getItem(key) { if (blocked.includes(key)) throw Error("PRIVATE"); return records.get(key) ?? null; },
      setItem(key, value) { assert.equal(key, bookmarkKey); if (failWrites) throw Error("PRIVATE"); writes++; records.set(key, value); },
      removeItem() { assert.fail("Unexpected deletion"); }, clear() { assert.fail("Unexpected clear"); }
    },
    addEventListener: (type, fn) => { events[type] = fn; }
  };
  doc.querySelector = () => page;
  mountMyTrips(doc, win);
  return { cards, summary, quick, events, doc, failWrites: value => { failWrites = value; }, writes: () => writes, render: () => mountMyTrips(doc, win) };
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

for (const language of ["en", "ko"]) {
  const raw = '["stay","osaka-nara","tokyo-jimbocho","travel-days","stay","unknown-future-id","<script>PRIVATE</script>",null,17]';
  const records = new Map([[bookmarkKey, raw], [TRIPS.fukuoka.storageKey, JSON.stringify(initialState())]]);
  const before = [...records];
  const ui = harness(language, records);
  const visible = () => ui.cards.map(card => card.guides.filter(guide => !guide.hidden).map(guide => guide.dataset.tripSavedGuide));
  assert.deepEqual(visible(), [["stay", "travel-days"], ["osaka-nara", "travel-days"], ["tokyo-jimbocho", "travel-days"]]);
  assert.ok(ui.cards[1].fields.details.hidden, "Bookmarks must work without starting a trip");
  assert.ok(ui.cards.every(card => /2/.test(card.fields["guides-status"].textContent)));
  assert.deepEqual([...records], before, "Unknown and duplicate IDs must remain byte-equivalent");
  records.set(bookmarkKey, '["tokyo-kiyosumi"]');
  ui.events.storage({ key: bookmarkKey, newValue: records.get(bookmarkKey) });
  assert.deepEqual(visible(), [[], [], ["tokyo-kiyosumi"]]);
  assert.match(ui.cards[0].fields["guides-status"].textContent, /No guides|아직/);
  assert.ok(ui.cards[0].fields["guides-list"].hidden);
  records.set(bookmarkKey, JSON.stringify(Object.values(cityGuides).flat()));
  ui.events.pageshow({ persisted: true });
  assert.deepEqual(visible().map(guides => guides.length), [6, 5, 4]);
  for (const bad of ["broken PRIVATE", "{}", "null", "", "x".repeat(65537)]) {
    records.set(bookmarkKey, bad);
    ui.events.storage({ key: bookmarkKey });
    assert.deepEqual(visible(), [[], [], []]);
    assert.ok(ui.cards.every(card => /could not be read|읽지 못/.test(card.fields["guides-status"].textContent)));
    assert.doesNotMatch(JSON.stringify(ui.cards), /PRIVATE/);
    assert.equal(records.get(bookmarkKey), bad);
    assert.equal(ui.cards[0].fields.details.hidden, false, "Bookmark error must not hide preparation");
  }
  records.delete(bookmarkKey);
  ui.events.storage({ key: null });
  assert.ok(ui.cards.every(card => /No guides|아직/.test(card.fields["guides-status"].textContent)));
  records.set(bookmarkKey, raw);
  const blocked = harness(language, records, [bookmarkKey]);
  assert.ok(blocked.cards.every(card => card.fields["guides-list"].hidden));
  assert.ok(blocked.cards.every(card => /unavailable|사용할 수 없어/.test(card.fields["guides-status"].textContent)));
  assert.equal(blocked.cards[0].fields.details.hidden, false);
  assert.equal(blocked.writes(), 0);
  assert.equal(ui.writes(), 0);
  assert.equal(records.get(bookmarkKey), raw);
}

const source = await readFile(resolve(root, "js/my-trips.js"), "utf8");
assert.doesNotMatch(source, /removeItem|\.clear\(|fetch\(|innerHTML/);
assert.match(source, /setItem\(SAVED_GUIDES_KEY, serialized\)/);
for (const prefix of ["", "/ko"]) {
  const html = await readFile(resolve(root, `.${prefix}/my-trips/index.html`), "utf8");
  assert.match(html, prefix ? /<h1>내 여행<\/h1>/ : /<h1>My trips<\/h1>/);
  for (const id of ids) assert.match(html, new RegExp(`data-trip-summary=${id}`));
  assert.equal((html.match(/data-trip-action-label/g) || []).length, 3);
  assert.match(html, /<noscript>/);
  assert.match(html, /js\/my-trips.js/);
  assert.match(html, /css\/my-trips.css/);
  assert.match(html, /data-task-labels=/);
  assert.equal((html.match(/data-trip-saved-guide=/g) || []).length, 15);
  assert.equal((html.match(/data-trip-guides-status/g) || []).length, 3);
  assert.equal((html.match(/<small>(Shared guide|공통 가이드)<\/small>/g) || []).length, 3);
  assert.match(html, prefix ? /저장한 가이드/ : /Saved guides/);
  assert.doesNotMatch(html, /js\/guide-explorer.js|data-save-guide=/, "Only the overview controller handles edits here");
  assert.equal((html.match(/data-guide-remove\b/g) || []).length, 15);
  assert.equal((html.match(/data-guide-undo/g) || []).length, 15);
  assert.equal((html.match(/data-trip-guides-feedback/g) || []).length, 3);
  for (const id of new Set(Object.values(cityGuides).flat())) assert.ok(html.includes(`data-trip-saved-guide=${id}`));
  assert.match(html, new RegExp(`href=${prefix}/itinerary/tokyo-jimbocho-books-cafes/`));
  assert.match(html, new RegExp(`href=${prefix}/itinerary/osaka-to-nara-temple-park-day/`));
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
for (const language of ["en", "ko"]) {
  const records = new Map(ids.map(id => [TRIPS[id].storageKey, JSON.stringify(initialState(id))]));
  records.set("tripcompass.decision.v1", "untouched");
  const preparation = [...records];
  records.set(bookmarkKey, JSON.stringify(["stay", "stay", "travel-days", "unknown", null, 17]));
  const blocked = [];
  const ui = harness(language, records, blocked);
  const row = (city, id) => ui.cards[ids.indexOf(city)].guides.find(guide => guide.dataset.tripSavedGuide === id);
  const press = (city, id, action) => {
    const button = row(city, id).querySelector(`[data-guide-${action}]`);
    button.focus(); button.click();
  };
  const saved = () => JSON.parse(records.get(bookmarkKey));
  press("fukuoka", "stay", "remove");
  assert.deepEqual(saved(), ["travel-days", "unknown", null, 17]);
  assert.equal(row("fukuoka", "stay").hidden, false, "Undo stays beside the removed guide");
  assert.equal(ui.doc.activeElement, row("fukuoka", "stay").querySelector("[data-guide-undo]"));
  press("osaka", "travel-days", "remove");
  assert.ok(ids.every(city => !row(city, "travel-days").querySelector("[data-guide-undo]").hidden));
  assert.match(ui.cards[0].fields["guides-status"].textContent, /No guides|아직/);
  assert.equal(ui.cards[0].fields["guides-list"].hidden, false, "Last removal must retain undo");
  records.set(bookmarkKey, JSON.stringify([...saved(), "tokyo-jimbocho"]));
  press("fukuoka", "stay", "undo");
  assert.deepEqual(saved(), ["unknown", null, 17, "tokyo-jimbocho", "stay"]);
  assert.equal(ui.doc.activeElement, row("fukuoka", "stay").querySelector("[data-guide-remove]"));
  press("tokyo", "travel-days", "undo");
  assert.equal(ui.cards[1].fields["guides-feedback"].textContent, "", "Clear stale shared-guide feedback in other cities");
  assert.ok(ids.every(city => row(city, "travel-days").querySelector("[data-guide-undo]").hidden));
  assert.equal(saved().filter(id => id === "travel-days").length, 1);
  ui.failWrites(true);
  const beforeFailure = records.get(bookmarkKey);
  press("fukuoka", "stay", "remove");
  assert.equal(records.get(bookmarkKey), beforeFailure);
  assert.equal(row("fukuoka", "stay").querySelector("[data-guide-remove]").hidden, false);
  assert.match(ui.cards[0].fields["guides-feedback"].textContent, /could not|못했/);
  ui.failWrites(false);
  press("fukuoka", "stay", "remove");
  ui.failWrites(true);
  press("fukuoka", "stay", "undo");
  assert.ok(!saved().includes("stay"));
  assert.equal(row("fukuoka", "stay").querySelector("[data-guide-undo]").hidden, false);
  ui.failWrites(false);
  blocked.push(bookmarkKey);
  press("fukuoka", "stay", "undo");
  assert.ok(!saved().includes("stay"));
  blocked.pop();
  records.set(bookmarkKey, "PRIVATE broken");
  press("fukuoka", "stay", "undo");
  assert.equal(records.get(bookmarkKey), "PRIVATE broken", "Do not overwrite corrupt storage");
  records.set(bookmarkKey, '["stay","tokyo"]');
  press("fukuoka", "stay", "undo");
  assert.deepEqual(saved(), ["stay", "tokyo"], "Another tab's restoration must not duplicate IDs");
  press("fukuoka", "stay", "remove");
  records.set(bookmarkKey, '["stay","osaka"]');
  ui.events.storage({ key: bookmarkKey });
  assert.equal(row("fukuoka", "stay").querySelector("[data-guide-undo]").hidden, true);
  press("fukuoka", "stay", "remove");
  ui.events.pageshow({ persisted: true });
  assert.equal(row("fukuoka", "stay").querySelector("[data-guide-undo]").hidden, false);
  const reloaded = harness(language, records);
  assert.equal(reloaded.cards[0].guides.find(guide => guide.dataset.tripSavedGuide === "stay").hidden, true);
  assert.deepEqual([...records].filter(([key]) => key !== bookmarkKey), preparation);
  assert.doesNotMatch(JSON.stringify(ui.cards), /PRIVATE/);
}
console.log("My trips checks passed: remove/undo, shared guides, latest-list merging, failures, focus, bilingual links and unchanged preparation records.");
