import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultState, validateState, summarize, localTime, estimateTime, encodeState, decodeState, goLinks } from "../static/js/decision-core.js";

const blank = defaultState();
assert.deepEqual(validateState(blank).errors, []);
const emptySummary = summarize(blank);
assert.equal(emptySummary.results[0].subtotal, null);
assert.equal(emptySummary.costDifference, null);
assert.equal(emptySummary.timeDifference, null);
assert.equal(emptySummary.results[0].budgetDifference, null);
assert.equal(validateState({ ...blank, budget: "" }).state.budget, null);

const complete = defaultState();
complete.people = 4;
complete.rooms = 2;
complete.budget = 2000000;
Object.assign(complete.options[0], { airfare: 300000, hotel: 100000, nights: 3, other: 200000, arrival: "2026-10-02T20:00", departure: "2026-10-05T10:00" });
Object.assign(complete.options[1], { airfare: 400000, hotel: 100000, nights: 3, other: 200000, arrival: "2026-10-02T10:00", departure: "2026-10-05T20:00" });
const summary = summarize(complete);
assert.equal(summary.results[0].subtotal, 2000000);
assert.equal(summary.results[0].perPerson, 500000);
assert.equal(summary.results[0].budgetDifference, 0);
assert.equal(summary.results[1].budgetDifference, 400000);
assert.equal(summary.costDifference, -400000);
assert.equal(summary.results[0].time.hours, 28);
assert.equal(summary.results[1].time.hours, 46);
assert.equal(summary.timeDifference, -18);
assert.equal(summary.results[0].time.calendarNights, 3);
assert.equal(estimateTime({ arrival: "2026-10-02T10:00", departure: "2026-10-02T14:00" }, 3).hours, 0);
assert.equal(estimateTime({ arrival: null, departure: "2026-10-02T14:00" }, 3), null);
assert.equal(localTime("2026-02-30T10:00"), null);
assert.equal(localTime("2026-10-02T25:00"), null);
assert.notEqual(localTime("2028-02-29T10:00"), null);

const partial = structuredClone(complete);
partial.options[0].other = null;
assert.equal(summarize(partial).costDifference, null);
assert.equal(summarize(partial).results[0].budgetDifference, null);
assert.equal(summarize(partial).results[0].entered, 2);
partial.options[0].other = 0;
assert.equal(summarize(partial).results[0].complete, true);

for (const [key, value] of [["people", 0], ["people", 1.5], ["rooms", 7], ["budget", -1], ["budget", "NaN"], ["budget", "1e8"], ["budget", "<script>"], ["budget", []], ["buffer", 13], ["buffer", 1.25]]) {
  assert.ok(validateState({ ...blank, [key]: value }).errors.includes(key));
}
for (const patch of [{ city: "osaka" }, { airfare: 100000001 }, { nights: 0 }, { arrival: "2026-10-02T10:00", departure: "2026-10-02T09:00" }, { arrival: "2026-10-02T10:00", departure: "2026-11-02T10:00" }]) {
  const invalid = defaultState();
  Object.assign(invalid.options[0], patch);
  assert.ok(validateState(invalid).errors.length);
  assert.throws(() => encodeState(invalid));
}
const badPick = defaultState();
badPick.opinions[0].pick = "tokyo";
assert.ok(validateState(badPick).errors.includes("pick0"));
complete.opinions[0].pick = "fukuoka";
assert.deepEqual(decodeState(encodeState(complete)), complete);
assert.deepEqual(decodeState(encodeState(blank)), blank);
for (const fragment of ["#plan=%", "#plan=null", "#plan={}", "#plan=" + "a".repeat(6001), "#anything", "#plan=%7B%22version%22%3A2%7D"]) assert.throws(() => decodeState(fragment));
const unknownFields = { ...blank, secret: "must-not-copy" };
assert.ok(!decodeURIComponent(encodeState(unknownFields)).includes("must-not-copy"));

for (const language of ["en", "ko"]) {
  for (const city of ["fukuoka", "osaka", "tokyo"]) {
    for (const [type, href] of Object.entries(goLinks(city, "busan", language))) {
      const url = new URL(href, "https://tripcompass.ai");
      assert.equal(url.pathname, `/go/${type}`);
      assert.equal(url.searchParams.get("lang"), language);
      assert.equal(url.searchParams.get("country"), "japan");
      if (type === "flight") { assert.equal(url.searchParams.get("from"), "busan"); assert.equal(url.searchParams.get("to"), city); }
    }
  }
}
assert.throws(() => goLinks("../evil", "seoul", "en"));
const out = process.argv[2];
const sitemap = await readFile(join(out, "sitemap.xml"), "utf8");
for (const prefix of ["", "ko/"]) {
  const html = await readFile(join(out, prefix, "decision-board/index.html"), "utf8");
  assert.match(html, /data-board-form/);
  assert.match(html, /data-decision-copy/);
  assert.match(html, /js\/decision-board.js/);
  assert.match(html, /<noscript>/);
  assert.ok(sitemap.includes(`https://tripcompass.ai/${prefix}decision-board/`));
  const home = await readFile(join(out, prefix, "index.html"), "utf8");
  assert.ok(home.includes(`/${prefix}decision-board/`));
}
console.log("Decision board check passed: budget units, missing values, time windows, validation, snapshots, safe CTAs and EN/KO pages.");
