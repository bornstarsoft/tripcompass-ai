import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mountTripNotes, parseNote, parseDraft, NOTE_KEYS, DRAFT_KEYS, NOTE_LIMIT } from "../static/js/trip-note.js";

const cities = Object.keys(NOTE_KEYS);
const raw = text => JSON.stringify({ version: 1, text });
assert.equal(parseNote(null), "");
assert.equal(parseNote(raw("한영 <script> note")), "한영 <script> note");
assert.equal(parseNote(raw("가".repeat(NOTE_LIMIT))).length, NOTE_LIMIT);
for (const invalid of ["{", "null", "[]", raw("x".repeat(241)), JSON.stringify({ version: 2, text: "new" }), JSON.stringify({ version: 1, text: 10 }), " ".repeat(4097)]) assert.throws(() => parseNote(invalid));

function harness(language, records = new Map(), fail = {}, drafts = new Map()) {
  const events = {}, writes = [], prompts = [], doc = { documentElement: { lang: language }, activeElement: null };
  const node = () => ({ value: "", textContent: "", hidden: false, disabled: false, open: false,
    addEventListener(name, fn) { this[name] = fn; }, focus() { doc.activeElement = this; } });
  const roots = cities.map(city => {
    const fields = Object.fromEntries(["input", "form", "save", "status", "preview", "details", "summary", "count", "reload"].map(name => [name, node()]));
    return { dataset: { tripNote: city }, hidden: true, fields, querySelector: selector => fields[selector.slice(11, -1)] };
  });
  doc.querySelectorAll = () => roots;
  const win = {
    confirm(message) {
      prompts.push(message);
      if (fail.confirm) throw Error("PRIVATE");
      return !fail.cancel;
    },
    sessionStorage: {
      getItem(k) { if (fail.draftRead) throw Error("PRIVATE"); return drafts.get(k) ?? null; },
      setItem(k,v) { if (fail.draftWrite) throw Error("PRIVATE"); assert.ok(Object.values(DRAFT_KEYS).includes(k)); drafts.set(k,v); },
      removeItem(k) { if (fail.draftRemove) throw Error("PRIVATE"); assert.ok(Object.values(DRAFT_KEYS).includes(k)); drafts.delete(k); }
    },
    localStorage: {
      getItem(k) { if (fail.read) throw Error("PRIVATE"); return records.get(k) ?? null; },
      setItem(k,v) { if (fail.write) throw Error("PRIVATE"); assert.ok(Object.values(NOTE_KEYS).includes(k)); writes.push(k); records.set(k,v); },
      removeItem(k) { if (fail.remove) throw Error("PRIVATE"); assert.ok(Object.values(NOTE_KEYS).includes(k)); writes.push(k); records.delete(k); }
    },
    addEventListener(name,fn) { (events[name] ||= new Set()).add(fn); },
    removeEventListener(name,fn) { events[name]?.delete(fn); }
  };
  mountTripNotes(doc,win);
  return { records, drafts, roots, doc, writes, prompts, fail, fields: city => roots[cities.indexOf(city)].fields,
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
    h.type(city,note); assert.equal(f.save.disabled,false); assert.equal(h.dirty(),0);
    assert.match(f.status.textContent,/Draft kept|임시 보관/);
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
  assert.equal(h.dirty(),0,"Persisted drafts do not interrupt language switching");
  h.fail.draftWrite=true; h.type("osaka","unprotected draft");
  assert.equal(h.dirty(),1,"Failed draft persistence still warns before departure");
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
    else { assert.deepEqual([...r],before); assert.equal(ui.input.value,"my draft"); assert.equal(f.dirty(),0); }
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

for (const language of ["en", "ko"]) {
  const h=harness(language);
  for(const city of cities) h.type(city,`  ${city} 메모\nDraft  `);
  assert.equal(h.writes.length,0,"Typing must not save or overwrite durable notes");
  for(const next of [language,language==="ko"?"en":"ko"]) {
    const resumed=harness(next,h.records,{},h.drafts);
    for(const city of cities) {
      const ui=resumed.fields(city);
      assert.equal(ui.input.value,`  ${city} 메모\nDraft  `);
      assert.equal(ui.details.open,true); assert.equal(ui.preview.hidden,true);
      assert.equal(resumed.doc.activeElement,null,"Restoration must not steal focus");
    }
    assert.equal(resumed.writes.length,0); assert.equal(resumed.dirty(),0);
  }
  const saved=harness(language,h.records,{},h.drafts);
  saved.save("fukuoka"); assert.equal(saved.drafts.has(DRAFT_KEYS.fukuoka),false);
  h.emit("pageshow",{persisted:true});
  assert.equal(h.fields("fukuoka").input.value,"fukuoka 메모\nDraft","BFCache must not revive a saved draft");
  saved.fields("osaka").reload.click(); h.emit("pageshow",{persisted:true});
  assert.equal(h.fields("osaka").input.value,"","BFCache must not revive a discarded draft");
  assert.equal(h.fields("tokyo").input.value,"  tokyo 메모\nDraft  ");
  h.type("fukuoka","");
  const deletion=harness(language,h.records,{},h.drafts);
  assert.equal(deletion.fields("fukuoka").input.value,"");
  assert.equal(deletion.fields("fukuoka").save.disabled,false,"Intentional empty drafts survive reload");
  deletion.save("fukuoka"); assert.equal(h.records.has(NOTE_KEYS.fukuoka),false);

  const conflict=harness(language,new Map([[NOTE_KEYS.fukuoka,raw("old")]]));
  conflict.type("fukuoka","my draft"); conflict.records.set(NOTE_KEYS.fukuoka,raw("new"));
  const resumed=harness(language,conflict.records,{},conflict.drafts), ui=resumed.fields("fukuoka");
  assert.equal(ui.input.value,"my draft"); assert.equal(ui.preview.textContent,"new"); assert.equal(ui.save.disabled,true);
  resumed.save("fukuoka"); assert.equal(resumed.records.get(NOTE_KEYS.fukuoka),raw("new"));
  resumed.fail.draftRemove=true; ui.reload.click(); assert.equal(ui.input.value,"my draft");
  resumed.fail.draftRemove=false; ui.reload.click(); assert.equal(ui.input.value,"new");
  assert.equal(resumed.drafts.has(DRAFT_KEYS.fukuoka),false);

  const failed=harness(language,new Map(),{draftWrite:true}); failed.type("tokyo","retain me");
  assert.equal(failed.dirty(),1); assert.equal(failed.fields("tokyo").input.value,"retain me");
  assert.ok(!failed.fields("tokyo").status.textContent.includes("PRIVATE"));
  failed.fail.draftWrite=false; failed.type("tokyo","retain me now"); assert.equal(failed.dirty(),0);
  failed.fail.draftRemove=true; failed.save("tokyo");
  const stale=harness(language,failed.records,{},failed.drafts);
  assert.equal(stale.fields("tokyo").input.value,"retain me now"); assert.equal(stale.fields("tokyo").save.disabled,true);
  assert.equal(stale.drafts.has(DRAFT_KEYS.tokyo),false,"Cleanup failure must not resurrect a saved draft");
  const whitespace=harness(language,new Map([[NOTE_KEYS.osaka,raw("same")]]));
  whitespace.type("osaka","same "); whitespace.fail.draftRemove=true; whitespace.save("osaka");
  assert.equal(whitespace.fields("osaka").input.value,"same ","Failed no-change cleanup retains the edit for retry");
  whitespace.fail.draftRemove=false; whitespace.save("osaka"); assert.equal(whitespace.drafts.has(DRAFT_KEYS.osaka),false);
  const revert=harness(language);
  revert.type("tokyo","older draft"); revert.fail.draftRemove=true; revert.type("tokyo","");
  assert.equal(revert.dirty(),1,"Failed draft removal still guards against stale recovery");
  revert.emit("pageshow",{persisted:true}); assert.equal(revert.fields("tokyo").input.value,"");
  revert.emit("storage",{key:NOTE_KEYS.tokyo}); assert.equal(revert.fields("tokyo").input.value,"");
  revert.fail.draftRemove=false; revert.fields("tokyo").reload.click(); assert.equal(revert.dirty(),0);
  for(const invalid of ["{","null",JSON.stringify({version:2,text:"bad",base:null}),JSON.stringify({version:1,text:"bad"}),JSON.stringify({version:1,text:"x".repeat(241),base:null}),"x".repeat(16385)]) {
    assert.throws(()=>parseDraft(invalid));
    const broken=harness(language,new Map([[NOTE_KEYS.fukuoka,raw("safe")]]),{},new Map([[DRAFT_KEYS.fukuoka,invalid]]));
    assert.equal(broken.fields("fukuoka").input.value,"safe"); assert.equal(broken.writes.length,0);
  }
  const blocked=harness(language,new Map(),{draftRead:true}); blocked.type("osaka","new draft");
  assert.equal(blocked.dirty(),0,"Read failure need not prevent a later successful draft write");
}

for (const language of ["en", "ko"]) for (const city of cities) {
  const records = new Map([[NOTE_KEYS[city], raw("saved baseline")], ["tripcompass.saved-guides.v1", '["stay"]']]);
  for (const draft of ["private draft\nwith whitespace ", "", "saved baseline "]) {
    const h = harness(language, new Map(records)), ui = h.fields(city);
    ui.reload.click();
    assert.equal(h.prompts.length, 0, "Clean reload needs no confirmation");
    h.type(city, draft);
    const beforeDrafts = [...h.drafts], beforeRecords = [...h.records];
    for (const mode of ["cancel", "confirm"]) {
      h.fail[mode] = true;
      ui.reload.click();
      h.fail[mode] = false;
      assert.equal(ui.input.value, draft);
      assert.deepEqual([...h.drafts], beforeDrafts);
      assert.deepEqual([...h.records], beforeRecords);
      assert.equal(h.doc.activeElement, ui.input);
      assert.ok(!ui.status.textContent.includes("PRIVATE"));
    }
    assert.match(h.prompts[0], language === "ko" ? /작성 중인 내용을 버리고/ : /Discard your current draft/);
    assert.ok(h.prompts.every(message => !message.includes(draft.trim() || "saved baseline")), "Never embed note text in dialogs");
    const resumed = harness(language === "ko" ? "en" : "ko", h.records, {}, h.drafts);
    assert.equal(resumed.fields(city).input.value, draft, "Cancellation survives reload/language");
    resumed.fields(city).reload.click();
    assert.equal(resumed.fields(city).input.value, "saved baseline");
    assert.equal(h.drafts.has(DRAFT_KEYS[city]), false);
    assert.deepEqual([...h.records], beforeRecords, "Confirmed discard never writes durable records");
    assert.equal(h.writes.length + resumed.writes.length, 0);
  }
  const h = harness(language, new Map(records), { draftWrite: true, cancel: true }), ui = h.fields(city);
  h.type(city, "unsaved draft"); const warning = ui.status.textContent;
  ui.reload.click(); assert.equal(ui.status.textContent, warning); assert.equal(h.dirty(), 1);
  h.records.set(NOTE_KEYS[city], raw("newer saved note")); h.emit("storage", {key:NOTE_KEYS[city]});
  const conflict = ui.status.textContent;
  ui.reload.click(); assert.equal(ui.status.textContent, conflict); assert.equal(ui.save.disabled, true);
  h.fail.cancel = false; ui.reload.click();
  assert.equal(ui.input.value, "newer saved note"); assert.equal(h.dirty(), 0);
}

if(process.argv[2]) for(const [prefix,title] of [["","For your next visit"],["ko/","다음에 확인할 메모"]]) {
  const html=await readFile(resolve(process.argv[2],prefix+"my-trips/index.html"),"utf8");
  assert.ok(html.includes(title)); assert.ok(html.includes("js/trip-note.js"));
  assert.equal((html.match(/data-trip-note=/g)||[]).length,3);
  const home=await readFile(resolve(process.argv[2],prefix+"index.html"),"utf8");
  assert.ok(!home.includes("data-trip-note")); assert.ok(!home.includes("js/trip-note.js"));
}
console.log("Trip notes passed: EN/KO, three-city isolation, explicit saves, tab drafts across reload/language/BFCache, confirmed discard/cancel/unavailable dialogs, blank drafts, length limits, safe text, conflicts/storage failures and unchanged legacy records/homepage.");
