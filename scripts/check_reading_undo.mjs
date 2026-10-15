import assert from "node:assert/strict";
import { TRIPS, TASKS, initialState } from "../static/js/trip-prep-core.js";
import { READING_KEYS } from "../static/js/trip-reading.js";
import { mountMyTripsReading } from "../static/js/my-trips-reading.js";
import { UNDO_KEYS, UNDO_TTL } from "../static/js/trip-reading-undo.js";

function fixture(language = "en", prior = null, navigation = "navigate", options = {}) {
  const map = prior?.map || new Map(), session = prior?.session || new Map(), events = {}, writes = [], timers = new Map();
  const docEvents = {};
  const doc = { documentElement: { lang: language }, activeElement: null, referrer: options.referrer ?? prior?.win.location.href ?? "",
    addEventListener(name, fn) { (docEvents[name] ||= []).push(fn); } };
  const node = () => ({ hidden: true, textContent: "", addEventListener(type, fn) { this[type] = fn; }, focus() { doc.activeElement = this; } });
  const cards = Object.keys(TRIPS).map(city => {
    const state = { ...initialState(city), extra: "keep" };
    if (!prior) map.set(TRIPS[city].storageKey, JSON.stringify(state));
    const record = { version: 1, city, task: "hotel", course: state.course, alternative: state.alternative, at: Date.now(), open: [true, false], reading: { kind: "section", key: "budget", fraction: .25, ratio: .5 }, extra: "keep" };
    if (!prior) map.set(READING_KEYS[city], JSON.stringify(record, null, 2));
    const fields = { "[data-reading-status]": node(), "[data-reading-clear]": node(), "[data-reading-undo]": node() };
    const rows = TASKS.map(task => {
      const link = { ...node(), href: `https://tripcompass.ai/${city}/#prep-${city}-${task}`, target: "", hasAttribute: () => false };
      return { dataset: { readingTask: task }, hidden: true, link, querySelector: () => link, contains: item => item === link };
    });
    return { dataset: { tripReading: city }, fields, rows, querySelector: name => fields[name], querySelectorAll: () => rows };
  });
  if (!prior) { map.set("tripcompass.saved-guides.v1", '["stay","stay","future"]'); map.set("tripcompass.decision.v1", "keep"); }
  const blocked = { read: false, write: false, remove: false, ...options };
  const history = { state: prior?.win.history.state || { unrelated: "keep" }, replaceState(state) { if (blocked.history) throw Error("PRIVATE"); this.state = state; } };
  let sequence = 0;
  const win = { location: new URL(`https://tripcompass.ai/${language === "ko" ? "ko/" : ""}my-trips/`), history,
    performance: { getEntriesByType: () => [{ type: navigation }] }, crypto: { randomUUID: () => `${Math.random()}` },
    setTimeout(fn) { timers.set(++sequence, fn); return sequence; }, clearTimeout(id) { timers.delete(id); },
    sessionStorage: {
      getItem(key) { if (blocked.sessionRead) throw Error("PRIVATE"); return session.get(key) ?? null; },
      setItem(key, value) { if (blocked.sessionWrite) throw Error("PRIVATE"); session.set(key, value); },
      removeItem(key) { if (blocked.sessionRemove) throw Error("PRIVATE"); session.delete(key); }
    },
    localStorage: {
      getItem(key) { if (blocked.read) throw Error("PRIVATE"); return map.get(key) ?? null; },
      setItem(key, value) { assert.ok(Object.values(READING_KEYS).includes(key)); if (blocked.write) throw Error("PRIVATE"); writes.push(key); map.set(key, value); },
      removeItem(key) { assert.ok(Object.values(READING_KEYS).includes(key)); if (blocked.remove) throw Error("PRIVATE"); writes.push(key); map.delete(key); }
    }, addEventListener(name, fn) { (events[name] ||= []).push(fn); } };
  doc.querySelectorAll = () => cards;
  mountMyTripsReading(doc, win);
  const emit = (name, event = {}) => events[name]?.forEach(fn => fn(event));
  const control = (city, kind) => cards.find(card => card.dataset.tripReading === city).fields[`[data-reading-${kind}]`];
  const click = (city, kind) => { const button = control(city, kind); button.focus(); button.click(); };
  const languageClick = (overrides = {}, eventOverrides = {}) => {
    const link = { href: `https://tripcompass.ai/${language === "en" ? "ko/" : ""}my-trips/`, target: "", hasAttribute: () => false, ...overrides };
    const event = { button: 0, target: { closest: () => link }, ...eventOverrides };
    docEvents.click?.forEach(fn => fn(event)); return event;
  };
  return { doc, cards, map, session, win, timers, writes, blocked, emit, control, click, languageClick };
}

for (const language of ["en", "ko"]) for (const city of Object.keys(TRIPS)) {
  const f = fixture(language), before = [...f.map], key = READING_KEYS[city], raw = f.map.get(key);
  assert.equal(f.writes.length, 0, "Visits never write");
  f.click(city, "clear"); assert.equal(f.map.has(key), false); assert.equal(f.control(city, "undo").hidden, false);
  assert.equal(f.doc.activeElement, f.control(city, "undo"));
  f.blocked.read = true; f.click(city, "undo");
  assert.equal(f.map.has(key), false); assert.equal(f.control(city, "undo").hidden, false);
  assert.match(f.control(city, "status").textContent, /could not|못했/);
  f.blocked.read = false;
  f.blocked.write = true; f.click(city, "undo");
  assert.equal(f.map.has(key), false); assert.equal(f.control(city, "undo").hidden, false);
  assert.match(f.control(city, "status").textContent, /could not|못했/);
  assert.doesNotMatch(f.control(city, "status").textContent, /PRIVATE/);
  f.blocked.write = false; f.click(city, "undo");
  assert.equal(f.map.get(key), raw, "Exact original bytes, timestamp and extra fields restored");
  assert.equal(f.control(city, "undo").hidden, true);
  assert.equal(f.doc.activeElement, f.cards.find(c => c.dataset.tripReading === city).rows[1].link);
  assert.deepEqual([...f.map].sort(), before.sort(), "Preparation/bookmarks/other city records preserved");
  const count = f.writes.length; f.control(city, "undo").click(); assert.equal(f.writes.length, count, "No duplicate undo");
  f.click(city, "clear"); f.click(city, "undo"); assert.equal(f.map.get(key), raw, "Repeated cycles");
}
for (const mode of ["remove-failed", "read-failed", "newer", "corrupt-newer", "reset", "course", "alternative", "storage-clear", "pagehide", "stale-delete"]) {
  const f = fixture(), city = "fukuoka", key = READING_KEYS[city], raw = f.map.get(key);
  if (mode === "remove-failed" || mode === "read-failed") {
    f.blocked[mode === "remove-failed" ? "remove" : "read"] = true; f.click(city, "clear");
    assert.equal(f.map.get(key), raw); assert.equal(f.control(city, "undo").hidden, true); continue;
  }
  const newer = JSON.stringify({ ...JSON.parse(raw), task: "flights", at: Date.now() });
  if (mode === "stale-delete") {
    f.map.set(key, newer); f.click(city, "clear"); assert.equal(f.map.get(key), newer); assert.equal(f.control(city, "undo").hidden, true); continue;
  }
  f.click(city, "clear");
  if (mode === "newer") f.map.set(key, newer);
  if (mode === "corrupt-newer") f.map.set(key, "{");
  if (mode === "reset") f.map.delete(TRIPS[city].storageKey);
  if (["course", "alternative"].includes(mode)) { const s = initialState(); s[mode] = TRIPS[city][mode === "course" ? "courses" : "alternatives"][1]; f.map.set(TRIPS[city].storageKey, JSON.stringify(s)); }
  if (mode === "storage-clear") f.emit("storage", { key: null });
  if (mode === "pagehide") { f.emit("pagehide"); f.emit("pageshow", { persisted: true }); }
  const before = [...f.map]; f.click(city, "undo");
  assert.deepEqual([...f.map], before, `${mode}: never overwrite or recreate`);
  assert.equal(f.control(city, "undo").hidden, true);
}
const multi = fixture();
const originals = Object.fromEntries(Object.keys(TRIPS).map(city => [city, multi.map.get(READING_KEYS[city])]));
for (const city of Object.keys(TRIPS)) multi.click(city, "clear");
multi.click("osaka", "undo"); assert.equal(multi.map.get(READING_KEYS.osaka), originals.osaka);
for (const city of ["fukuoka", "tokyo"]) assert.equal(multi.control(city, "undo").hidden, false);
multi.emit("storage", { key: TRIPS.fukuoka.storageKey, newValue: null });
multi.click("fukuoka", "undo"); assert.equal(multi.map.has(READING_KEYS.fukuoka), false, "Even a delayed reset event cancels undo");
multi.emit("storage", { key: READING_KEYS.tokyo, newValue: originals.tokyo });
multi.click("tokyo", "undo"); assert.equal(multi.map.has(READING_KEYS.tokyo), false, "A replacement event cancels older undo even if later removed");
const checks = fixture(); checks.click("tokyo", "clear");
const latest = initialState("tokyo"); latest.checks.hotel = true;
checks.map.set(TRIPS.tokyo.storageKey, JSON.stringify(latest));
checks.emit("storage", { key: TRIPS.tokyo.storageKey, newValue: JSON.stringify(latest) });
checks.click("tokyo", "undo"); assert.equal(checks.map.get(TRIPS.tokyo.storageKey), JSON.stringify(latest), "Latest checks are not rolled back");
assert.ok(checks.map.has(READING_KEYS.tokyo));
console.log("Reading undo passed: EN/KO three cities, exact restoration, focus, repeated cycles, failures/retry, stale/reset/newer-record protection, independent undo and page lifetime.");

const realNow = Date.now;
let now = realNow(); Date.now = () => now;
try {
  for (const language of ["en", "ko"]) for (const city of Object.keys(TRIPS)) {
    const f = fixture(language), before = [...f.map].sort(), key = READING_KEYS[city], raw = f.map.get(key);
    f.click(city, "clear"); const deletedAt = now; f.emit("pagehide");
    assert.ok(f.session.has(UNDO_KEYS[city]));
    now += 20000;
    const reloaded = fixture(language, f, "reload");
    assert.equal(reloaded.control(city, "undo").hidden, false); assert.equal(reloaded.doc.activeElement, null, "Reload does not steal focus");
    assert.equal(reloaded.session.has(UNDO_KEYS[city]), false, "Snapshot consumed");
    reloaded.emit("pagehide"); assert.equal(JSON.parse(reloaded.session.get(UNDO_KEYS[city])).at, deletedAt, "Reload never extends lifetime");
    const again = fixture(language, reloaded, "reload"); again.click(city, "undo");
    assert.equal(again.map.get(key), raw); assert.deepEqual([...again.map].sort(), before);
    assert.equal(again.win.history.state.unrelated, "keep");
    again.emit("pagehide"); assert.equal(again.session.has(UNDO_KEYS[city]), false, "Consumed undo never reappears");
  }
  for (const mode of ["expired", "future", "navigate", "back_forward", "language", "wrong-entry", "malformed", "oversized", "wrong-city", "newer", "reset", "checks", "sessionRead", "sessionRemove", "history"]) {
    const f = fixture(), key = READING_KEYS.fukuoka, sk = UNDO_KEYS.fukuoka;
    f.click("fukuoka", "clear"); f.emit("pagehide");
    if (mode === "expired") now += UNDO_TTL;
    if (mode === "future") now -= 1;
    if (mode === "wrong-entry") f.win.history.state.tripcompassReadingUndoEntry.id = "wrong";
    if (mode === "malformed") f.session.set(sk, "{");
    if (mode === "oversized") f.session.set(sk, "x".repeat(4097));
    if (mode === "wrong-city") { const s=JSON.parse(f.session.get(sk)); s.raw=JSON.stringify({...JSON.parse(s.raw),city:"tokyo"}); f.session.set(sk,JSON.stringify(s)); }
    if (mode === "newer") f.map.set(key, "{");
    if (mode === "reset") f.map.delete(TRIPS.fukuoka.storageKey);
    if (mode === "checks") { const s=JSON.parse(f.map.get(TRIPS.fukuoka.storageKey)); s.checks.hotel=true; f.map.set(TRIPS.fukuoka.storageKey,JSON.stringify(s)); }
    const before = [...f.map];
    const reloaded = fixture(mode === "language" ? "ko" : "en", f, ["navigate","back_forward"].includes(mode) ? mode : "reload", { [mode]: true });
    assert.equal(reloaded.control("fukuoka", "undo").hidden, mode !== "checks", mode);
    if (mode !== "checks") { reloaded.click("fukuoka", "undo"); assert.deepEqual([...f.map], before, `${mode}: no writes`); }
    else { reloaded.click("fukuoka", "undo"); assert.equal(JSON.parse(f.map.get(TRIPS.fukuoka.storageKey)).checks.hotel,true); }
  }
  const f = fixture(); f.click("tokyo", "clear"); now += UNDO_TTL;
  for (const fn of [...f.timers.values()]) fn();
  assert.equal(f.control("tokyo", "undo").hidden, true); assert.match(f.control("tokyo", "status").textContent, /expired/);
  assert.equal(f.doc.activeElement,f.control("tokyo","status"));
  const all = fixture(), allBefore = [...all.map].sort();
  for (const city of Object.keys(TRIPS)) all.click(city,"clear");
  all.emit("pagehide"); const restoredAll=fixture("en",all,"reload");
  for (const city of ["tokyo","fukuoka","osaka"]) {
    assert.equal(restoredAll.control(city,"undo").hidden,false); restoredAll.click(city,"undo");
  }
  assert.deepEqual([...restoredAll.map].sort(),allBefore,"All three pending undos survive one reload independently");
  const late = fixture(); late.click("osaka","clear"); now += UNDO_TTL; late.click("osaka","undo");
  assert.equal(late.map.has(READING_KEYS.osaka),false,"Throttled timers cannot extend undo");
  const denied = fixture(); denied.click("fukuoka","clear"); denied.blocked.sessionWrite=true; denied.emit("pagehide");
  assert.equal(fixture("en",denied,"reload").control("fukuoka","undo").hidden,true);
  const bf = fixture(); bf.click("fukuoka","clear"); bf.emit("pagehide"); bf.blocked.sessionRemove=true; bf.emit("pageshow",{persisted:true}); bf.blocked.sessionRemove=false;
  assert.equal(fixture("en",bf,"reload").control("fukuoka","undo").hidden,true,"BFCache invalidates even a denied snapshot cleanup");
} finally { Date.now = realNow; }
console.log("Reload undo passed: EN/KO three cities, repeated reload, original deadline, expiry/focus, entry isolation, blocked storage/history, BFCache invalidation and exact record preservation.");

now = realNow(); Date.now = () => now;
try {
  for (const language of ["en", "ko"]) {
    const f = fixture(language), before=[...f.map].sort(), deletedAt=now;
    for (const city of Object.keys(TRIPS)) f.click(city,"clear");
    let current=f, lang=language;
    for (let i=0;i<3;i++) {
      current.languageClick(); current.emit("pagehide"); now+=15000;
      for(const city of Object.keys(TRIPS)) assert.equal(JSON.parse(current.session.get(UNDO_KEYS[city])).at,deletedAt);
      lang=lang==="en"?"ko":"en";current=fixture(lang,current,"navigate");
      for(const city of Object.keys(TRIPS)) assert.equal(current.control(city,"undo").hidden,false);
      assert.equal(current.doc.activeElement,null,"Language arrival does not steal focus");
      current.emit("pagehide"); current=fixture(lang,current,"reload");
    }
    for(const city of ["tokyo","fukuoka","osaka"]) current.click(city,"undo");
    assert.deepEqual([...current.map].sort(),before,"Language switching preserves exact reading and other records");
    current.emit("pagehide");
    assert.equal(current.session.size,0,"Consumed undo is not reissued");
  }
  for(const language of ["en","ko"]) for(const mode of ["expired","future","no-click","same-language","external","query","hash","modified","middle","target","download","cancelled","late-cancelled","ordinary-click","no-referrer","wrong-referrer","reload","back_forward","newer","reset","course","checks","blocked-write","blocked-read","blocked-remove","blocked-history","replay"]) {
    const f=fixture(language),key=READING_KEYS.fukuoka;f.click("fukuoka","clear");
    const other=language==="en"?"ko":"en",target=`https://tripcompass.ai/${other==="ko"?"ko/":""}my-trips/`;
    const links={"same-language":{href:f.win.location.href},external:{href:"https://example.com/ko/my-trips/"},query:{href:target+"?x=1"},hash:{href:target+"#x"},target:{target:"_blank"},download:{hasAttribute:()=>true}};
    const events={modified:{ctrlKey:true},middle:{button:1},cancelled:{defaultPrevented:true}};
    if(mode!=="no-click") {const event=f.languageClick(links[mode],events[mode]);if(mode==="late-cancelled")event.defaultPrevented=true;}
    if(mode==="ordinary-click")f.languageClick({}, {target:{closest:()=>null}});
    if(mode==="blocked-write")f.blocked.sessionWrite=true;
    f.emit("pagehide");
    if(mode==="expired")now+=UNDO_TTL;
    if(mode==="future")now-=1;
    if(mode==="newer")f.map.set(key,"{");
    if(mode==="reset")f.map.delete(TRIPS.fukuoka.storageKey);
    if(["course","checks"].includes(mode)){const s=JSON.parse(f.map.get(TRIPS.fukuoka.storageKey));if(mode==="course")s.course="parents";else s.checks.hotel=true;f.map.set(TRIPS.fukuoka.storageKey,JSON.stringify(s));}
    const options={sessionRead:mode==="blocked-read",sessionRemove:mode==="blocked-remove",history:mode==="blocked-history"};
    if(mode==="no-referrer")options.referrer="";
    if(mode==="wrong-referrer")options.referrer="https://example.com/my-trips/";
    let arrived=fixture(other,f,["reload","back_forward"].includes(mode)?mode:"navigate",options);
    if(mode==="replay")arrived=fixture(other,arrived,"navigate");
    assert.equal(arrived.control("fukuoka","undo").hidden,mode!=="checks",mode);
    const before=[...arrived.map];arrived.click("fukuoka","undo");
    if(mode!=="checks")assert.deepEqual([...arrived.map],before,mode+": no stale writes");
    else assert.equal(JSON.parse(arrived.map.get(TRIPS.fukuoka.storageKey)).checks.hotel,true);
  }
} finally { Date.now=realNow; }
console.log("Language undo passed: EN/KO repeated switches plus reload, original deadline, exact records, guarded navigation/referrer, single-use handoff, failures and newer/reset protection.");
