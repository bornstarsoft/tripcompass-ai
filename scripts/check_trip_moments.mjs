import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2]);
const { MOMENTS_KEY, mountTripMoments } = await import(pathToFileURL(resolve(root, "js/trip-moments.js")));

function harness(records, options = {}) {
  const events = {}, writes = [], reads = [];
  let readBlocked = options.readBlocked, writeBlocked = options.writeBlocked;
  const details = { open: options.open ?? false, addEventListener(type, fn) { events[type] = fn; } };
  const win = {
    get localStorage() { assert.fail("Never access personal records"); },
    get sessionStorage() {
      if (options.storageBlocked) throw Error("unavailable");
      return {
        getItem(key) { assert.equal(key, MOMENTS_KEY); if (readBlocked) throw Error("unavailable"); reads.push(key); return records.get(key) ?? null; },
        setItem(key, value) { assert.equal(key, MOMENTS_KEY); assert.ok(["open", "closed"].includes(value)); if (writeBlocked) throw Error("unavailable"); writes.push(value); records.set(key, value); },
        removeItem() { assert.fail("Never delete records"); },
        clear() { assert.fail("Never clear records"); }
      };
    },
    addEventListener(type, fn) { events[type] = fn; }
  };
  mountTripMoments({ querySelector: selector => { assert.equal(selector, "#trip-moments"); return details; } }, win);
  return { details, events, writes, reads, blockRead: value => { readBlocked = value; }, blockWrite: value => { writeBlocked = value; }, toggle(value) { details.open = value; events.toggle(); } };
}

const fixtures = [["tripcompass.saved-guides.v1", '["plan-b","travel-days"]'], ["tripcompass.note-draft.fukuoka.v1", "private draft"], ["tripcompass.trip-prep.v1", "unchanged"]];
for (const initial of [null, "open", "closed", "", "true", "OPEN", "<script>", "x".repeat(10000)]) {
  const records = new Map(fixtures);
  if (initial !== null) records.set(MOMENTS_KEY, initial);
  const before = [...records];
  const ui = harness(records);
  assert.equal(ui.details.open, initial === "open");
  ui.events.toggle();
  ui.events.pagehide();
  assert.deepEqual([...records], before, "Mount/restoration must not write or repair");
  assert.deepEqual(ui.writes, []);
  ui.toggle(!ui.details.open);
  assert.equal(ui.writes.length, 1);
  const restored = harness(records);
  assert.equal(restored.details.open, ui.details.open, "Reload/language use one session preference");
  restored.events.toggle();
  assert.deepEqual(restored.writes, [], "Programmatic restoration toggle is read-only");
  for (const [key, value] of fixtures) assert.equal(records.get(key), value);
}

{
  const records = new Map([[MOMENTS_KEY, "closed"]]), ui = harness(records);
  ui.details.open = true;
  ui.events.pagehide();
  assert.equal(records.get(MOMENTS_KEY), "open", "Departure flushes queued toggle");
  ui.events.toggle();
  assert.deepEqual(ui.writes, ["open"]);
  records.set(MOMENTS_KEY, "closed");
  ui.events.pageshow({ persisted: false });
  assert.equal(ui.details.open, true);
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.details.open, false, "BFCache uses the latest same-tab choice");
  ui.events.toggle();
  assert.deepEqual(ui.writes, ["open"]);
  records.set(MOMENTS_KEY, "broken");
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.details.open, false);
  ui.blockRead(true);
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.details.open, false);
}

for (const options of [{storageBlocked:true}, {readBlocked:true}, {writeBlocked:true}]) {
  const records = new Map(fixtures), ui = harness(records, options);
  ui.toggle(true);
  assert.equal(ui.details.open, true, "Native toggle survives storage failure");
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.details.open, true);
  ui.toggle(false);
  assert.equal(ui.details.open, false);
  for (const [key, value] of fixtures) assert.equal(records.get(key), value);
}
{
  const records = new Map([[MOMENTS_KEY, "closed"]]), ui = harness(records, {writeBlocked:true});
  ui.toggle(true);
  ui.events.pageshow({ persisted: true });
  assert.equal(ui.details.open, true, "Failed new choice must not revert on BFCache return");
  ui.blockWrite(false);
  ui.toggle(false); ui.toggle(true);
  assert.equal(records.get(MOMENTS_KEY), "open", "Later toggles can recover");
}
mountTripMoments({ querySelector: () => null }, { get sessionStorage() { assert.fail("Absent module must not access storage"); } });

for (const prefix of ["", "ko/"]) {
  const overview = await readFile(resolve(root, prefix, "my-trips/index.html"), "utf8");
  assert.equal((overview.match(/src=["']?\/js\/trip-moments\.js/g) || []).length, 1);
  const home = await readFile(resolve(root, prefix, "index.html"), "utf8");
  assert.ok(!home.includes("trip-moments"));
}
assert.ok((await readFile(resolve(root, "privacy/index.html"), "utf8")).includes(MOMENTS_KEY));
console.log("Moments session preference passed: reload/language, read-only restoration, departure flush, BFCache, invalid/blocked storage and personal-record isolation.");
