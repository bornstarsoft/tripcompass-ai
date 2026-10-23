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
  fukuoka: ["fukuoka", "parents", "stay", "fukuoka-rain", "fukuoka-dazaifu", "travel-days", "plan-b"],
  osaka: ["osaka", "osaka-kyoto", "osaka-nara", "osaka-doguyasuji", "travel-days", "plan-b"],
  tokyo: ["tokyo", "tokyo-jimbocho", "tokyo-kiyosumi", "travel-days", "plan-b"]
};

function harness(language = "en", records = new Map(), blocked = [], oldMarkup = false) {
  const events = {};
  const doc = { documentElement: { lang: language } };
  const summary = { textContent: "" };
  const quick = Object.fromEntries(ids.map(id => [id, { textContent: "" }]));
  const cards = ids.map(id => {
    const labels = values => JSON.stringify(Object.fromEntries(values.map(value => [value, `${language}:${id}:${value}`])));
    const fields = Object.fromEntries(["status", "details", "count", "progress", "course", "alternative", "next", "action", "action-label", "guides-status", "guides-jump", "guides-list", "guides-feedback", "check-feedback"].map(name => [name, { textContent: "", hidden: true, value: 0, focus() { doc.activeElement = this; } }]));
    if (oldMarkup) delete fields["guides-jump"];
    const checks = TASKS.map(task => ({ dataset: { tripCheck: task }, checked: false, disabled: true,
      addEventListener(type, fn) { this[type] = fn; }, focus() { doc.activeElement = this; } }));
    const guides = cityGuides[id].map(id => {
      const controls = Object.fromEntries(["remove", "undo", "removed"].map(action => {
        const node = { hidden: false, addEventListener(type, fn) { this[type] = fn; }, focus() { doc.activeElement = this; } };
        return [`[data-guide-${action}]`, node];
      }));
      controls.a = { textContent: `${language}:${id}` };
      return { dataset: { tripSavedGuide: id }, hidden: true, controls, querySelector: selector => controls[selector] };
    });
    return { fields, guides, checks, dataset: { tripSummary: id, courseLabels: labels(TRIPS[id].courses), alternativeLabels: labels(TRIPS[id].alternatives), taskLabels: labels(TASKS) },
      querySelectorAll: selector => selector === "[data-trip-check]" ? checks : guides,
      querySelector: selector => fields[selector.slice(11, -1)] };
  });
  const page = { querySelector: selector => selector === "[data-trips-summary]" ? summary : quick[selector.split('"')[1]], querySelectorAll: () => cards };
  let writes = 0;
  let failWrites = false;
  const win = {
    localStorage: {
      getItem(key) { if (blocked.includes(key)) throw Error("PRIVATE"); return records.get(key) ?? null; },
      setItem(key, value) { assert.ok([bookmarkKey, ...ids.map(id => TRIPS[id].storageKey)].includes(key)); if (failWrites) throw Error("PRIVATE"); writes++; records.set(key, value); },
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
  const old = harness(language, new Map([[bookmarkKey, '["stay"]']]), [], true);
  assert.match(old.cards[0].fields["guides-status"].textContent, /1/);
  assert.equal(old.writes(), 0, "New script tolerates previously cached markup");
}

for (const language of ["en", "ko"]) {
  const raw = '["stay","osaka-nara","tokyo-jimbocho","travel-days","stay","unknown-future-id","<script>PRIVATE</script>",null,17]';
  const records = new Map([[bookmarkKey, raw], [TRIPS.fukuoka.storageKey, JSON.stringify(initialState())]]);
  const before = [...records];
  const ui = harness(language, records);
  const visible = () => ui.cards.map(card => card.guides.filter(guide => !guide.hidden).map(guide => guide.dataset.tripSavedGuide));
  assert.deepEqual(visible(), [["stay", "travel-days"], ["osaka-nara", "travel-days"], ["tokyo-jimbocho", "travel-days"]]);
  assert.ok(ui.cards[1].fields.details.hidden, "Bookmarks must work without starting a trip");
  assert.ok(ui.cards.every(card => /2/.test(card.fields["guides-status"].textContent)));
  assert.ok(ui.cards.every(card => card.fields["guides-jump"].textContent === (language === "ko" ? "저장한 가이드 2개" : "2 saved guides")));
  assert.deepEqual([...records], before, "Unknown and duplicate IDs must remain byte-equivalent");
  records.set(bookmarkKey, '["tokyo-kiyosumi"]');
  ui.events.storage({ key: bookmarkKey, newValue: records.get(bookmarkKey) });
  assert.deepEqual(visible(), [[], [], ["tokyo-kiyosumi"]]);
  assert.equal(ui.cards[0].fields["guides-jump"].textContent, language === "ko" ? "저장한 가이드 0개" : "0 saved guides");
  assert.equal(ui.cards[2].fields["guides-jump"].textContent, language === "ko" ? "저장한 가이드 1개" : "1 saved guide");
  assert.match(ui.cards[0].fields["guides-status"].textContent, /No guides|아직/);
  assert.ok(ui.cards[0].fields["guides-list"].hidden);
  records.set(bookmarkKey, JSON.stringify(Object.values(cityGuides).flat()));
  ui.events.pageshow({ persisted: true });
  assert.deepEqual(visible().map(guides => guides.length), [7, 6, 5]);
  for (const [i, count] of [7, 6, 5].entries()) assert.equal(ui.cards[i].fields["guides-jump"].textContent, language === "ko" ? `저장한 가이드 ${count}개` : `${count} saved guides`);
  for (const bad of ["broken PRIVATE", "{}", "null", "", "x".repeat(65537)]) {
    records.set(bookmarkKey, bad);
    ui.events.storage({ key: bookmarkKey });
    assert.deepEqual(visible(), [[], [], []]);
    assert.ok(ui.cards.every(card => card.fields["guides-jump"].textContent === (language === "ko" ? "저장한 가이드" : "Saved guides")), "Unreadable is not zero");
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
  assert.ok(blocked.cards.every(card => card.fields["guides-jump"].textContent === (language === "ko" ? "저장한 가이드" : "Saved guides")));
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
  assert.equal((html.match(/data-trip-saved-guide=/g) || []).length, 18);
  assert.equal((html.match(/data-trip-guides-status/g) || []).length, 3);
  assert.equal((html.match(/data-trip-guides-jump/g) || []).length, 3);
  for (const city of ids) {
    assert.ok(html.includes(`href=#saved-guides-${city}`));
    assert.ok(html.includes(`aria-labelledby="trip-title-${city} saved-jump-${city}"`));
    assert.ok(html.includes(`id=saved-guides-${city} tabindex=-1`));
    assert.ok(html.includes(`id=saved-jump-${city}`));
  }
  assert.equal((html.match(/<small>(Shared guide|공통 가이드)<\/small>/g) || []).length, 6);
  assert.match(html, prefix ? /저장한 가이드/ : /Saved guides/);
  assert.doesNotMatch(html, /js\/guide-explorer.js|data-save-guide=/, "Only the overview controller handles edits here");
  assert.equal((html.match(/data-guide-remove\b/g) || []).length, 18);
  assert.equal((html.match(/data-guide-undo/g) || []).length, 18);
  assert.equal((html.match(/data-trip-guides-feedback/g) || []).length, 3);
  assert.equal((html.match(/data-trip-check=/g) || []).length, 15);
  assert.equal((html.match(/data-trip-check-feedback/g) || []).length, 3);
  assert.match(html, prefix ? /준비 체크/ : /Preparation checklist/);
  for (const id of new Set(Object.values(cityGuides).flat())) assert.ok(html.includes(`data-trip-saved-guide=${id}`));
  assert.match(html, new RegExp(`href=${prefix}/itinerary/tokyo-jimbocho-books-cafes/`));
  assert.match(html, new RegExp(`href=${prefix}/itinerary/osaka-to-nara-temple-park-day/`));
  for (const path of ["/my-trip/", "/my-trip/osaka/", "/my-trip/tokyo/"]) {
    assert.ok(html.includes(`href=${prefix}${path}`));
    const workspace = await readFile(resolve(root, `.${prefix}${path}index.html`), "utf8");
    assert.ok(workspace.includes(`href=${prefix}/my-trips/`));
  }
  const home = await readFile(resolve(root, `.${prefix}/index.html`), "utf8");
  assert.ok(!home.includes("data-trip-guides-jump"));
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
  assert.equal(ui.cards[0].fields["guides-jump"].textContent, language === "ko" ? "저장한 가이드 1개" : "1 saved guide");
  assert.equal(ui.doc.activeElement, row("fukuoka", "stay").querySelector("[data-guide-undo]"));
  press("osaka", "travel-days", "remove");
  assert.ok(ids.every(city => !row(city, "travel-days").querySelector("[data-guide-undo]").hidden));
  assert.match(ui.cards[0].fields["guides-status"].textContent, /No guides|아직/);
  assert.equal(ui.cards[0].fields["guides-list"].hidden, false, "Last removal must retain undo");
  assert.equal(ui.cards[0].fields["guides-jump"].textContent, language === "ko" ? "저장한 가이드 0개" : "0 saved guides");
  records.set(bookmarkKey, JSON.stringify([...saved(), "tokyo-jimbocho"]));
  press("fukuoka", "stay", "undo");
  assert.deepEqual(saved(), ["unknown", null, 17, "tokyo-jimbocho", "stay"]);
  assert.equal(ui.doc.activeElement, row("fukuoka", "stay").querySelector("[data-guide-remove]"));
  press("tokyo", "travel-days", "undo");
  assert.equal(ui.cards[1].fields["guides-feedback"].textContent, "", "Clear stale shared-guide feedback in other cities");
  assert.ok(ids.every(city => row(city, "travel-days").querySelector("[data-guide-undo]").hidden));
  assert.equal(saved().filter(id => id === "travel-days").length, 1);
  assert.deepEqual(ui.cards.map(card => card.fields["guides-jump"].textContent), language === "ko" ? ["저장한 가이드 2개", "저장한 가이드 1개", "저장한 가이드 2개"] : ["2 saved guides", "1 saved guide", "2 saved guides"]);
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
for (const language of ["en", "ko"]) for (const [index, city] of ids.entries()) {
  const records = new Map(ids.map(id => [TRIPS[id].storageKey, JSON.stringify(initialState(id))]));
  records.set(bookmarkKey, '["stay","stay","future-id","travel-days"]');
  records.set("tripcompass.decision.v1", "unchanged");
  const key = TRIPS[city].storageKey;
  const protectedRecords = [...records].filter(([name]) => name !== key);
  const blocked = [];
  const ui = harness(language, records, blocked);
  const card = ui.cards[index];
  const toggle = (task, checked) => {
    const input = card.checks.find(input => input.dataset.tripCheck === task);
    input.focus(); input.checked = checked; input.change();
    return input;
  };
  assert.equal(ui.writes(), 0);
  const flights = toggle("flights", true);
  assert.equal(JSON.parse(records.get(key)).checks.flights, true);
  assert.equal(card.fields.progress.value, 1);
  assert.equal(ui.doc.activeElement, flights);
  assert.equal(card.fields.next.textContent, `${language}:${city}:hotel`);
  toggle("flights", false);
  assert.equal(card.fields.progress.value, 0);
  const fresh = JSON.parse(records.get(key));
  fresh.checks.hotel = true;
  fresh.futureField = "keep";
  fresh.checks.futureCheck = "keep";
  records.set(key, JSON.stringify(fresh));
  toggle("flights", true);
  assert.deepEqual(JSON.parse(records.get(key)), { ...fresh, checks: { ...fresh.checks, flights: true } });
  for (const task of TASKS) toggle(task, true);
  assert.equal(card.fields.progress.value, 5);
  assert.match(card.fields.status.textContent, /Recheck|다시 확인/);
  toggle("weather", false);
  assert.equal(card.fields.next.textContent, `${language}:${city}:weather`);
  const beforeFailure = records.get(key);
  ui.failWrites(true);
  toggle("weather", true);
  assert.equal(records.get(key), beforeFailure);
  assert.equal(card.checks[3].checked, false, "Failed write must roll checkbox back");
  assert.match(card.fields["check-feedback"].textContent, /could not|못했/);
  ui.failWrites(false);
  toggle("weather", true);
  assert.equal(card.checks[3].checked, true);
  for (const field of ["course", "alternative"]) {
    const changed = JSON.parse(records.get(key));
    changed[field] = TRIPS[city][field === "course" ? "courses" : "alternatives"][1];
    changed.checks.flights = false;
    const raw = JSON.stringify(changed);
    records.set(key, raw);
    toggle("flights", true);
    assert.equal(records.get(key), raw, "Do not mark an unseen changed course/alternative");
    assert.match(card.fields["check-feedback"].textContent, /another tab|다른 탭/);
    assert.equal(card.checks[0].checked, false);
  }
  toggle("flights", true);
  assert.equal(card.checks[0].checked, true, "Retry after reviewing current trip");
  records.delete(key);
  toggle("hotel", true);
  assert.equal(records.has(key), false, "Never recreate a reset trip");
  assert.ok(card.checks.every(input => input.disabled && !input.checked));
  assert.equal(ui.doc.activeElement, card.fields.action);
  for (const bad of ['PRIVATE invalid', '{"version":2}', 'x'.repeat(2049)]) {
    records.set(key, bad);
    toggle("hotel", true);
    assert.equal(records.get(key), bad);
    assert.ok(card.checks.every(input => input.disabled));
    assert.doesNotMatch(card.fields["check-feedback"].textContent, /PRIVATE/);
  }
  records.set(key, JSON.stringify(initialState(city)));
  ui.events.storage({ key });
  assert.ok(card.checks.every(input => !input.disabled));
  blocked.push(key);
  toggle("flights", true);
  assert.equal(JSON.parse(records.get(key)).checks.flights, false);
  assert.ok(card.checks.every(input => input.disabled));
  blocked.pop();
  ui.events.pageshow({ persisted: true });
  assert.ok(card.checks.every(input => !input.disabled));
  assert.deepEqual([...records].filter(([name]) => name !== key), protectedRecords);
  const guide = ui.cards[0].guides.find(guide => guide.dataset.tripSavedGuide === "stay");
  guide.querySelector("[data-guide-remove]").click();
  toggle("flights", true);
  assert.equal(guide.querySelector("[data-guide-undo]").hidden, false, "Checklist edits preserve pending guide undo");
  guide.querySelector("[data-guide-undo]").click();
  assert.ok(JSON.parse(records.get(bookmarkKey)).includes("stay"));
  assert.equal(JSON.parse(records.get(key)).checks.flights, true);
}
console.log("My trips checks passed: city checklist edits, fresh-state merging, rollback/reset protection, bookmark undo, bilingual guide jump counts/anchors and record isolation.");
