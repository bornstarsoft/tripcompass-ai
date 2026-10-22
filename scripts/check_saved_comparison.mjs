import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]);
const { defaultState, encodeState, STORAGE_KEY } = await import(pathToFileURL(resolve(root, "js/decision-core.js")));
const { mountSavedComparison } = await import(pathToFileURL(resolve(root, "js/my-trips-comparison.js")));
const names = { en: { fukuoka: "Fukuoka", osaka: "Osaka", tokyo: "Tokyo" }, ko: { fukuoka: "후쿠오카", osaka: "오사카", tokyo: "도쿄" } };

function harness(lang, records) {
  const events = {};
  let reads = 0, blocked = false;
  const cities = { textContent: "", dataset: { cityLabels: JSON.stringify(names[lang]) } };
  const section = { hidden: true, querySelector: () => cities };
  const win = {
    get localStorage() {
      if (blocked) throw Error("PRIVATE");
      return {
        getItem(key) { assert.equal(key, STORAGE_KEY); reads++; return records.get(key) ?? null; },
        setItem() { assert.fail("Must not write"); },
        removeItem() { assert.fail("Must not delete"); },
        clear() { assert.fail("Must not clear"); }
      };
    },
    addEventListener(type, fn) { events[type] = fn; }
  };
  mountSavedComparison({ querySelector: () => section }, win);
  return { section, cities, events, reads: () => reads, block: value => { blocked = value; } };
}

for (const lang of ["en", "ko"]) {
  const records = new Map([["tripcompass.saved-guides.v1", '["stay","travel-days"]'], ["tripcompass.trip-prep.v1", "untouched"], ["tripcompass.return-note.fukuoka.v1", "private note"], ["tripcompass.reading.fukuoka.v1", "unchanged"]]);
  const ui = harness(lang, records);
  assert.ok(ui.section.hidden);
  const untouched = [...records];
  for (const first of Object.keys(names[lang])) for (const second of Object.keys(names[lang])) {
    if (first === second) continue;
    const state = defaultState();
    state.options[0].city = first;
    state.options[1].city = second;
    state.budget = 9876543;
    state.options[0].arrival = "2027-01-01T12:00";
    const saved = encodeState(state);
    records.set(STORAGE_KEY, saved);
    ui.events.storage({ key: STORAGE_KEY });
    assert.equal(ui.section.hidden, false);
    assert.equal(ui.cities.textContent, `${names[lang][first]} / ${names[lang][second]}`);
    assert.equal(records.get(STORAGE_KEY), saved);
    assert.doesNotMatch(ui.cities.textContent, /9876543|2027|private/);
    ui.events.pageshow({ persisted: true });
    assert.equal(ui.section.hidden, false);
  }
  const reads = ui.reads();
  ui.events.storage({ key: "unrelated" });
  assert.equal(ui.reads(), reads);
  ui.block(true);
  ui.events.pageshow({ persisted: true });
  assert.ok(ui.section.hidden);
  assert.equal(ui.cities.textContent, "");
  ui.block(false);
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.section.hidden, false);
  for (const invalid of ["", "#plan=%", "#plan=null", "#plan=" + "x".repeat(6001), '#plan={"version":2}', encodeState(defaultState()).replace('fukuoka', '%3Cscript%3EPRIVATE%3C/script%3E')]) {
    records.set(STORAGE_KEY, invalid);
    ui.events.storage({ key: STORAGE_KEY });
    assert.ok(ui.section.hidden);
    assert.equal(ui.cities.textContent, "");
    assert.equal(records.get(STORAGE_KEY), invalid, "Do not repair or overwrite invalid records");
  }
  records.delete(STORAGE_KEY);
  ui.events.storage({ key: null });
  assert.ok(ui.section.hidden);
  assert.deepEqual([...records], untouched);

  const prefix = lang === "ko" ? "ko/" : "";
  const html = await readFile(resolve(root, prefix, "my-trips/index.html"), "utf8");
  assert.match(html, /<section[^>]*data-saved-comparison[^>]*hidden/);
  assert.ok(html.includes("js/my-trips-comparison.js"));
  assert.ok(html.includes(`/${prefix}from-seoul/japan-travel-budget/#recheck`));
  assert.match(html, new RegExp(`data-comparison-resume href=["']?/${prefix}decision-board/["' >]`));
  assert.ok(html.includes(lang === "ko" ? "저장한 여행 비교" : "Your saved trip comparison"));
  const guide = await readFile(resolve(root, prefix, "from-seoul/japan-travel-budget/index.html"), "utf8");
  assert.ok(guide.includes(`/${prefix}my-trips/#saved-comparison`));
  const home = await readFile(resolve(root, prefix, "index.html"), "utf8");
  assert.ok(!home.includes("my-trips-comparison"), "Do not add a homepage module");
}
mountSavedComparison({ querySelector: () => null }, { get localStorage() { assert.fail("No page means no storage access"); } });
console.log("Saved comparison passed: EN/KO city pairs, read-only storage, privacy, reset/corruption/blocked storage, pageshow, cross-tab refresh and localized return links.");
