import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mountTripNotes, parseNote, NOTE_KEYS, NOTE_LIMIT } from "../static/js/trip-note.js";

const cities = Object.keys(NOTE_KEYS);
const raw = text => JSON.stringify({ version: 1, text });
assert.equal(parseNote(null), "");
assert.equal(parseNote(raw("한영 <script> note")), "한영 <script> note");
assert.equal(parseNote(raw("가".repeat(NOTE_LIMIT))).length, NOTE_LIMIT);
for (const invalid of ["{", "null", "[]", raw("x".repeat(241)), JSON.stringify({ version: 2, text: "new" }), JSON.stringify({ version: 1, text: 10 }), " ".repeat(4097)]) assert.throws(() => parseNote(invalid));

function harness(language, records = new Map(), fail = {}) {
  const events = {}, writes = [], doc = { documentElement: { lang: language }, activeElement: null };
  const node = () => ({ value: "", textContent: "", hidden: false, disabled: false, open: false,
    addEventListener(name, fn) { this[name] = fn; }, focus() { doc.activeElement = this; } });
  const roots = cities.map(city => {
    const fields = Object.fromEntries(["input", "form", "save", "status", "preview", "details", "summary", "count", "reload"].map(name => [name, node()]));
    return { dataset: { tripNote: city }, hidden: true, fields, querySelector: selector => fields[selector.slice(11, -1)] };
  });
  doc.querySelectorAll = () => roots;
  const win = {
    localStorage: {
      getItem(k) { if (fail.read) throw Error("PRIVATE"); return records.get(k) ?? null; },
      setItem(k,v) { if (fail.write) throw Error("PRIVATE"); assert.ok(Object.values(NOTE_KEYS).includes(k)); writes.push(k); records.set(k,v); },
      removeItem(k) { if (fail.remove) throw Error("PRIVATE"); assert.ok(Object.values(NOTE_KEYS).includes(k)); writes.push(k); records.delete(k); }
    },
    addEventListener(name,fn) { (events[name] ||= new Set()).add(fn); },
    removeEventListener(name,fn) { events[name]?.delete(fn); }
  };
  mountTripNotes(doc,win);
  return { records, roots, doc, writes, fail, fields: city => roots[cities.indexOf(city)].fields,
    dirty: () => events.beforeunload?.size || 0,
    emit: (name, event = {}) => events[name]?.forEach(fn => fn(event)),
    type(city,text) { const f = this.fields(city); f.input.value=text; f.input.input(); },
    save(city) { let prevented = false; this.fields(city).form.submit({ preventDefault() { prevented=true; } }); assert.ok(prevented); }
  };
}

for (const language of ["en","ko"]) {
  const protectedRecords = new Map([
    ["tripcompass.trip-prep.v1", "original prep"], ["tripcompass.trip-prep.osaka.v1", "original Osaka"], ["tripcompass.trip-prep.tokyo.v1", "original Tokyo"],
    ["tripcompass.saved-guides.v1", '["stay","future","stay"]'], ["tripcompass.reading.fukuoka.v1", "original position"], ["tripcompass.decision.v1", "original decision"]
  ]);
  const h = harness(language, new Map(protectedRecords));
  assert.equal(h.writes.length,0); assert.equal(h.dirty(),0);
  for (const city of cities) {
    const f=h.fields(city); assert.equal(f.save.disabled,true); assert.equal(f.preview.hidden,true);
    const note=language==="ko"?`${city}: 취소 조건 비교\n내일 다시 확인`:`${city}: Compare cancellation terms\nCheck again tomorrow`;
    h.type(city,note); assert.equal(f.save.disabled,false); assert.equal(h.dirty(),1);
    assert.match(f.status.textContent,/Unsaved|저장하지/);
    h.save(city); assert.equal(h.dirty(),0); assert.equal(f.preview.textContent,note);
    assert.equal(f.details.open,false); assert.equal(h.doc.activeElement,f.summary);
    assert.equal(h.records.get(NOTE_KEYS[city]),raw(note));
    const resumed = harness(language==="en"?"ko":"en", h.records);
    assert.equal(resumed.fields(city).input.value,note); assert.equal(resumed.writes.length,0);
    h.type(city,"discard draft"); f.reload.click(); assert.equal(f.input.value,note); assert.equal(h.dirty(),0);
    h.type(city,"x".repeat(241)); h.save(city); assert.equal(h.records.get(NOTE_KEYS[city]),raw(note));
    h.type(city,"<img src=x onerror=alert(1)>"); h.save(city); assert.equal(f.preview.textContent,"<img src=x onerror=alert(1)>");
    h.type(city,""); h.fail.remove=true; h.save(city); assert.ok(h.records.has(NOTE_KEYS[city])); assert.equal(f.input.value,"");
    h.fail.remove=false; h.save(city); assert.equal(h.records.has(NOTE_KEYS[city]),false);
  }
  for (const [k,v] of protectedRecords) assert.equal(h.records.get(k),v);
  h.type("fukuoka","first draft"); h.type("osaka","second draft"); h.save("fukuoka");
  assert.equal(h.dirty(),1,"Another city still has an unsaved draft");
  let prevented=false; h.emit("beforeunload",{preventDefault(){prevented=true;}}); assert.ok(prevented);
  h.fields("osaka").reload.click(); assert.equal(h.dirty(),0,"No guard after every draft is saved or discarded");
  const noOp=[...h.records]; h.save("fukuoka"); assert.deepEqual([...h.records],noOp);
  for (const mode of ["write","read","corrupt","newer","clear","bfcache","other-city"]) {
    const r=new Map([[NOTE_KEYS.fukuoka,raw("old")]]), f=harness(language,r), ui=f.fields("fukuoka");
    f.type("fukuoka","my draft");
    if(mode==="write") f.fail.write=true;
    if(mode==="read") f.fail.read=true;
    if(mode==="corrupt") r.set(NOTE_KEYS.fukuoka,"{");
    if(["newer","bfcache"].includes(mode)) r.set(NOTE_KEYS.fukuoka,raw("newer"));
    if(mode==="clear") r.delete(NOTE_KEYS.fukuoka);
    if(mode==="other-city") {r.set(NOTE_KEYS.osaka,raw("other")); f.emit("storage",{key:NOTE_KEYS.osaka});}
    if(mode==="bfcache") f.emit("pageshow",{persisted:true});
    const before=[...r]; f.save("fukuoka");
    if(mode==="other-city") assert.equal(r.get(NOTE_KEYS.fukuoka),raw("my draft"));
    else { assert.deepEqual([...r],before); assert.equal(ui.input.value,"my draft"); assert.equal(f.dirty(),1); }
    assert.ok(!ui.status.textContent.includes("PRIVATE"));
  }
  const r=new Map([[NOTE_KEYS.fukuoka,raw("old")]]), h2=harness(language,r), ui=h2.fields("fukuoka");
  r.set(NOTE_KEYS.fukuoka,raw("synced")); h2.emit("storage",{key:NOTE_KEYS.fukuoka}); assert.equal(ui.input.value,"synced");
  h2.type("fukuoka","draft"); r.set(NOTE_KEYS.fukuoka,raw("newest")); h2.emit("storage",{key:NOTE_KEYS.fukuoka});
  assert.equal(ui.input.value,"draft"); assert.equal(ui.save.disabled,true); ui.reload.click(); assert.equal(ui.input.value,"newest");
  h2.type("fukuoka","after conflict"); h2.save("fukuoka"); assert.equal(r.get(NOTE_KEYS.fukuoka),raw("after conflict"));
  for(const corrupt of ["{",raw("x".repeat(241))]) {const h3=harness(language,new Map([[NOTE_KEYS.fukuoka,corrupt]]));assert.equal(h3.fields("fukuoka").input.disabled,true);assert.equal(h3.writes.length,0);}
  const fail={read:true}, h4=harness(language,new Map(),fail); assert.equal(h4.fields("fukuoka").input.disabled,true);
  fail.read=false; h4.fields("fukuoka").reload.click(); assert.equal(h4.fields("fukuoka").input.disabled,false);
  h4.type("fukuoka","retry"); fail.write=true; h4.save("fukuoka"); assert.equal(h4.fields("fukuoka").input.value,"retry");
  fail.write=false; h4.save("fukuoka"); assert.equal(h4.records.get(NOTE_KEYS.fukuoka),raw("retry"));
}

if(process.argv[2]) for(const [prefix,title] of [["","For your next visit"],["ko/","다음에 확인할 메모"]]) {
  const html=await readFile(resolve(process.argv[2],prefix+"my-trips/index.html"),"utf8");
  assert.ok(html.includes(title)); assert.ok(html.includes("js/trip-note.js"));
  assert.equal((html.match(/data-trip-note=/g)||[]).length,3);
  const home=await readFile(resolve(process.argv[2],prefix+"index.html"),"utf8");
  assert.ok(!home.includes("data-trip-note")); assert.ok(!home.includes("js/trip-note.js"));
}
console.log("Trip notes passed: EN/KO, three-city isolation, explicit local saves, reload/language, length limits, safe text, draft/conflict/failure handling and unchanged legacy records/homepage.");
