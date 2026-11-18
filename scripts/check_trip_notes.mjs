import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  const events = {}, writes = [], prompts = [], clipboard = [], doc = { documentElement: { lang: language }, activeElement: null };
  const downloads = [], urls = new Map(), timers = [];
  let nextUrl = 0;
  const node = () => ({ value: "", textContent: "", hidden: false, disabled: false, open: false,
    addEventListener(name, fn) { this[name] = fn; }, focus() { doc.activeElement = this; }, select() { this.selected = true; },
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } });
  const roots = cities.map(city => {
    const fields = Object.fromEntries(["input", "form", "save", "status", "preview", "details", "summary", "count", "reload", ...(fail.legacy ? [] : ["copy", "copy-tools", "copy-status", "copy-manual", "copy-text", "plan-template", "download", "import", "import-file"])].map(name => [name, node()]));
    if (fields.download) fields.download.hidden = true;
    if (fields.import) {
      fields.import.hidden = true;
      fields["import-file"].files = [];
      fields["import-file"].click = function () { this.opened = true; };
    }
    return { dataset: { tripNote: city }, hidden: true, fields, querySelector: selector => fields[selector.slice(11, -1)] };
  });
  const shortcutLinks = new Map(cities.map(city => [city, { ...node(), hidden: true }]));
  const savedLinks = new Map(cities.map(city => [city, { ...node(), hidden: true }]));
  const selector = node();
  const menu = links => ({
    hidden: true,
    querySelector(query) {
      if (query.endsWith(":not([hidden])")) return [...links.values()].find(link => !link.hidden);
      return links.get(query.match(/"([a-z]+)"/)?.[1]);
    }
  });
  const shortcuts = menu(shortcutLinks), savedMenu = menu(savedLinks);
  doc.querySelector = query => query === "#trip-selector" ? selector : fail.noShortcuts ? null : {
    "[data-note-draft-shortcuts]": shortcuts, "[data-note-saved-shortcuts]": savedMenu
  }[query];
  doc.querySelectorAll = () => roots;
  doc.createElement = tag => {
    assert.equal(tag, "a");
    return { download: "", click() { downloads.push({ name: this.download, blob: urls.get(this.href) }); }, remove() {} };
  };
  doc.body = { append() {} };
  const win = {
    File: fail.noImport ? undefined : File,
    TextDecoder,
    Blob: fail.noDownload ? undefined : Blob,
    URL: {
      createObjectURL(blob) {
        if (fail.download) throw Error("PRIVATE");
        const url = "blob:fixture-" + nextUrl++;
        urls.set(url, blob);
        return url;
      },
      revokeObjectURL(url) { urls.delete(url); }
    },
    setTimeout(fn) { timers.push(fn); },
    navigator: fail.noClipboard ? {} : { clipboard: { writeText(value) {
      clipboard.push(value);
      if (fail.clipboard) return Promise.reject(Error("PRIVATE"));
      return fail.pending || Promise.resolve();
    } } },
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
  return { records, drafts, roots, doc, writes, prompts, clipboard, downloads, urls, timers, fail, shortcuts, shortcutLinks, savedMenu, savedLinks, selector, fields: city => roots[cities.indexOf(city)].fields,
    dirty: () => events.beforeunload?.size || 0,
    emit: (name, event = {}) => events[name]?.forEach(fn => fn(event)),
    type(city,text) { const f = this.fields(city); f.input.value=text; f.input.input(); },
    save(city) { let prevented = false; this.fields(city).form.submit({ preventDefault() { prevented=true; } }); assert.ok(prevented); }
  };
}

for (const language of ["en", "ko"]) {
  const records = new Map([[NOTE_KEYS.fukuoka, raw("Private saved note")], [NOTE_KEYS.osaka, raw("  ")], [NOTE_KEYS.tokyo, "{"]]);
  const ui = harness(language, records);
  const visible = links => cities.filter(city => !links.get(city).hidden);
  assert.deepEqual(visible(ui.savedLinks), ["fukuoka"], "Only a valid nonblank saved note gets a link");
  assert.equal(ui.savedMenu.hidden, false);
  assert.equal(ui.writes.length, 0);
  assert.equal(ui.savedLinks.get("fukuoka").textContent, "", "Note content never goes into the shortcut");
  ui.type("fukuoka", "New draft");
  assert.deepEqual(visible(ui.shortcutLinks), ["fukuoka"], "Draft link takes precedence");
  assert.equal(ui.savedMenu.hidden, true);
  ui.save("fukuoka");
  assert.equal(ui.shortcuts.hidden, true);
  assert.deepEqual(visible(ui.savedLinks), ["fukuoka"], "Explicit save restores the saved link");
  records.set(NOTE_KEYS.osaka, raw("Saved in another tab"));
  ui.emit("storage", { key: NOTE_KEYS.osaka });
  assert.deepEqual(visible(ui.savedLinks), ["fukuoka", "osaka"]);
  ui.savedLinks.get("osaka").focus();
  records.delete(NOTE_KEYS.osaka);
  ui.emit("storage", { key: NOTE_KEYS.osaka });
  assert.equal(ui.doc.activeElement, ui.selector, "Focus is not lost when a remote change removes a link");
  assert.deepEqual(visible(ui.savedLinks), ["fukuoka"]);
  ui.type("fukuoka", "");
  ui.save("fukuoka");
  assert.equal(ui.savedMenu.hidden, true);
  assert.deepEqual(ui.writes, [NOTE_KEYS.fukuoka, NOTE_KEYS.fukuoka]);
  const blocked = harness(language, new Map([[NOTE_KEYS.tokyo, raw("Saved")]]), { read:true });
  assert.equal(blocked.savedMenu.hidden, true);
}

for (const language of ["en", "ko"]) {
  const base = raw("Saved baseline");
  const ui = harness(language, new Map([[NOTE_KEYS.fukuoka, base]]));
  assert.equal(ui.shortcuts.hidden, true, "A saved note alone is not an unsaved draft");
  ui.type("fukuoka", "");
  ui.type("osaka", "Unfinished idea");
  const visible = h => cities.filter(city => !h.shortcutLinks.get(city).hidden);
  assert.deepEqual(visible(ui), ["fukuoka", "osaka"], "Intentional blank edits still count");
  assert.equal(ui.shortcuts.hidden, false);
  const translated = harness(language === "ko" ? "en" : "ko", ui.records, {}, ui.drafts);
  assert.deepEqual(visible(translated), ["fukuoka", "osaka"]);
  const jump = translated.shortcutLinks.get("osaka");
  translated.fields("osaka").details.open = false;
  jump.click({ ctrlKey: true });
  assert.equal(translated.fields("osaka").details.open, false, "Leave modified navigation native");
  jump.click({});
  assert.equal(translated.fields("osaka").details.open, true);
  assert.equal(translated.fields("osaka").input.value, "Unfinished idea");
  assert.equal(translated.writes.length, 0, "Navigating does not save a draft");
  translated.save("osaka");
  assert.deepEqual(visible(translated), ["fukuoka"]);
  translated.shortcutLinks.get("fukuoka").focus();
  translated.fields("fukuoka").reload.click();
  assert.deepEqual(visible(translated), []);
  assert.equal(translated.shortcuts.hidden, true);
  assert.equal(translated.records.get(NOTE_KEYS.fukuoka), base);
  assert.deepEqual(translated.writes, [NOTE_KEYS.osaka]);
  const blocked = harness(language, new Map(), {draftWrite: true});
  blocked.type("tokyo", "Still here");
  assert.deepEqual(visible(blocked), ["tokyo"], "An in-page draft is still reachable if tab storage fails");
  const absent = harness(language, new Map(), {noShortcuts: true});
  absent.type("tokyo", "Workspace also still edits");
  assert.equal(absent.shortcuts.hidden, true);
}

for (const language of ["en", "ko"]) {
  const first = language === "ko" ? "남길 일정:" : "Keep:";
  const block = language === "ko" ? "남길 일정: \n대안: \n다시 확인할 것: " : "Keep: \nAlternative: \nRecheck: ";
  for (const city of cities) {
    const saved = new Map([[NOTE_KEYS[city], raw("Original note")]]);
    const ui = harness(language, saved);
    const f = ui.fields(city), button = f["plan-template"];
    assert.equal(button.disabled, false);
    ui.type(city, "Unfinished draft\n");
    button.click();
    const expected = "Unfinished draft\n\n" + block;
    assert.equal(f.input.value, expected);
    assert.equal(ui.doc.activeElement, f.input);
    assert.equal(f.input.selectionStart, expected.indexOf(first) + first.length + 1);
    assert.equal(parseDraft(ui.drafts.get(DRAFT_KEYS[city])).text, expected);
    assert.equal(saved.get(NOTE_KEYS[city]), raw("Original note"));
    assert.equal(ui.writes.length, 0);
    button.click();
    assert.equal(f.input.value, expected, "No duplicate prompt insertion");
    const translated = harness(language === "ko" ? "en" : "ko", saved, {}, ui.drafts);
    assert.equal(translated.fields(city).input.value, expected);
    assert.equal(translated.fields(city)["plan-template"].disabled, true);
    ui.type(city, "A".repeat(230));
    button.click();
    assert.equal(f.input.value.length, 230, "Do not truncate a draft at the existing limit");
    assert.match(f.status.textContent, /않|그대로|unchanged/);
    saved.set(NOTE_KEYS[city], raw("Changed elsewhere"));
    ui.emit("storage", {key: NOTE_KEYS[city]});
    assert.equal(button.disabled, true);
    assert.equal(ui.writes.length, 0);
  }
  const unavailable = harness(language, new Map(), {read: true});
  assert.equal(unavailable.fields("fukuoka")["plan-template"].disabled, true);
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

for (const language of ["en", "ko"]) for (const city of cities) {
  const records = new Map([[NOTE_KEYS[city], raw("latest saved")]]);
  const h = harness(language, records), ui = h.fields(city);
  // Browser form restoration may replace the value after mount, without an input event.
  ui.input.value = "obsolete browser value";
  h.emit("pageshow", {persisted:false});
  assert.equal(ui.input.value, "latest saved");
  assert.equal(ui.save.disabled, true);
  assert.equal(h.writes.length, 0);
  h.type(city, "current shared draft");
  ui.input.value = "obsolete browser draft";
  h.emit("pageshow", {persisted:false});
  assert.equal(ui.input.value, "current shared draft");
  assert.equal(ui.details.open, true);
  h.fail.draftWrite = true;
  h.type(city, "unprotected current edit");
  h.emit("pageshow", {persisted:false});
  assert.equal(ui.input.value, "unprotected current edit");
  assert.equal(h.dirty(), 1);
  assert.equal(records.get(NOTE_KEYS[city]), raw("latest saved"));
}

if(process.argv[2]) for(const [prefix,title] of [["","For your next visit"],["ko/","다음에 확인할 메모"]]) {
  const html=await readFile(resolve(process.argv[2],prefix+"my-trips/index.html"),"utf8");
  const version = createHash("sha256").update(await readFile(resolve(process.argv[2], "js/trip-note.js"))).digest("hex").slice(0, 12);
  assert.ok(html.includes(title)); assert.ok(html.includes(`js/trip-note.js?v=${version}`));
  assert.equal((html.match(/data-note-plan-template hidden/g)||[]).length,3);
  assert.equal((html.match(/data-trip-note=/g)||[]).length,3);
  assert.equal((html.match(/data-note-copy-tools hidden/g)||[]).length,3);
  assert.equal((html.match(/data-note-copy-text readonly/g)||[]).length,3);
  assert.ok(html.includes(prefix ? "저장된 메모 복사" : "Copy saved note"));
  assert.equal((html.match(/data-note-download /g)||[]).length,3);
  assert.equal((html.match(/data-note-import-file hidden/g)||[]).length,3);
  assert.ok(html.includes("css/trip-note.css"));
  assert.ok(html.includes("data-note-draft-shortcuts aria-labelledby=trip-drafts-title hidden"));
  assert.equal((html.match(/data-note-draft-city=/g)||[]).length,3);
  assert.ok(html.includes("data-note-saved-shortcuts aria-labelledby=trip-saved-notes-title hidden"));
  assert.equal((html.match(/data-note-saved-city=/g)||[]).length,3);
  const help = `href=/${prefix}itinerary/japan-arrival-departure-day-plan/#use-the-note target=_blank rel=noopener`;
  assert.equal(html.split(help).length - 1, 3);
  for (const city of cities) {
    assert.ok(html.includes(`href=#next-visit-note-${city} data-note-draft-city=${city}`));
    assert.ok(html.includes(`href=#note-title-${city} data-note-saved-city=${city}`));
    assert.ok(html.includes(`<h3 id=note-title-${city} tabindex=-1>${title}</h3>`));
    assert.equal(html.split(`id=next-visit-note-${city}>`).length - 1, 1);
    const path = city === "fukuoka" ? "my-trip/" : `my-trip/${city}/`;
    const workspace = await readFile(resolve(process.argv[2], prefix + path + "index.html"), "utf8");
    assert.equal((workspace.match(/data-trip-note=/g) || []).length, 1);
    assert.ok(workspace.includes(`data-trip-note=${city}`));
    assert.ok(workspace.includes(`<h2 id=note-title-${city}>${title}</h2>`));
    assert.ok(workspace.includes(`id=next-visit-note-${city}>`));
    assert.equal(workspace.split(help).length - 1, 1);
    assert.equal((workspace.match(/js\/trip-note.js/g) || []).length, 1);
    assert.ok(workspace.includes(`js/trip-note.js?v=${version}`));
    assert.equal((workspace.match(/data-note-plan-template hidden/g)||[]).length,1);
    assert.ok(workspace.includes("css/trip-note.css"));
    assert.equal((workspace.match(/data-note-download /g)||[]).length,1);
    assert.equal((workspace.match(/data-note-import-file hidden/g)||[]).length,1);
    assert.ok(!workspace.includes("css/my-trips.css"));
    assert.ok(!workspace.includes("data-note-draft-shortcuts"));
    assert.ok(!workspace.includes("data-note-saved-shortcuts"));
    assert.ok(workspace.indexOf(`data-trip-note=${city}`) < workspace.indexOf("data-prep-workspace"), "Notes remain available before starting or after resetting preparation");
    assert.ok(workspace.includes(prefix ? "메모, 다른 여행 준비함" : "Notes, other trips"));
  }
  const home=await readFile(resolve(process.argv[2],prefix+"index.html"),"utf8");
  assert.ok(!home.includes("data-trip-note")); assert.ok(!home.includes("js/trip-note.js"));
  assert.ok(!home.includes("css/trip-note.css"));
  assert.ok(!home.includes("#use-the-note"));
  assert.ok(!home.includes("data-note-draft-shortcuts"));
  assert.ok(!home.includes("data-note-saved-shortcuts"));
}
console.log("Trip notes passed: EN/KO, three-city isolation, explicit saves, tab drafts across reload/language/BFCache, confirmed discard/cancel/unavailable dialogs, blank drafts, length limits, safe text, conflicts/storage failures and unchanged legacy records/homepage.");

for (const language of ["en", "ko"]) for (const city of cities) {
  const note = `${city}: compare two ideas\n한영 <b>literal</b>`;
  const h = harness(language, new Map([[NOTE_KEYS[city], raw(note)], ["tripcompass.saved-guides.v1", '["plan-b"]']]));
  const f = h.fields(city), before = [...h.records];
  assert.equal(h.clipboard.length, 0, "No automatic export");
  assert.equal(f["copy-tools"].hidden, false);
  await f.copy.click(); assert.deepEqual(h.clipboard, [note]);
  assert.match(f["copy-status"].textContent, language === "ko" ? /복사했어요/ : /copied/);
  assert.equal(f["copy-manual"].hidden, true);
  h.type(city, "not saved"); await f.copy.click();
  assert.equal(h.clipboard.length, 1, "Dirty drafts must never be copied");
  assert.equal(f.copy.disabled, true); assert.equal(f["copy-status"].textContent, "");
  f.reload.click(); h.fail.clipboard = true; await f.copy.click();
  assert.equal(f["copy-text"].value, note); assert.equal(f["copy-text"].selected, true);
  assert.equal(h.doc.activeElement, f["copy-text"]); assert.equal(f["copy-manual"].hidden, false);
  assert.equal(f.input.value, note); assert.equal(h.writes.length, 0);
  assert.deepEqual([...h.records], before); assert.equal(h.drafts.size, 0);
  h.type(city, "draft after failed copy");
  assert.equal(f["copy-manual"].hidden, true); assert.equal(f["copy-text"].value, "");
  f.reload.click(); h.fail.read = true; await f.copy.click();
  assert.equal(h.clipboard.length, 2, "Unreadable saved value blocks export");
  assert.ok(!f["copy-status"].textContent.includes("PRIVATE"));
  h.fail.read = false; h.records.set(NOTE_KEYS[city], raw("newer unseen")); await f.copy.click();
  assert.equal(h.clipboard.length, 2, "Recheck before clipboard call");
  f.reload.click(); h.fail.clipboard = false; await f.copy.click();
  assert.equal(h.clipboard.at(-1), "newer unseen");
  h.records.delete(NOTE_KEYS[city]); h.emit("storage", {key:NOTE_KEYS[city]});
  assert.equal(f["copy-tools"].hidden, true); assert.equal(f["copy-text"].value, "");
  for (const change of ["draft", "storage", "bfcache"]) {
    let reject;
    const pending = new Promise((resolve, fail) => { reject = fail; });
    const d = harness(language, new Map([[NOTE_KEYS[city], raw(note)]]), {pending}), ui = d.fields(city);
    const action = ui.copy.click(); await ui.copy.click();
    assert.equal(d.clipboard.length, 1, "Duplicate requests are blocked");
    if(change === "draft") d.type(city, "keep editing");
    else { d.records.set(NOTE_KEYS[city], raw("updated")); d.emit(change === "storage" ? "storage" : "pageshow", {key:NOTE_KEYS[city],persisted:true}); }
    const focus = d.doc.activeElement;
    reject(Error("PRIVATE")); await action;
    assert.equal(ui["copy-manual"].hidden, true, "Late failure must not show stale text");
    assert.equal(ui["copy-status"].textContent, ""); assert.equal(d.doc.activeElement, focus);
    assert.equal(ui.copy.disabled, change === "draft"); assert.equal(d.writes.length, 0);
  }
  const legacy = harness(language, new Map(), {legacy:true}); legacy.type(city,"old markup"); legacy.save(city);
  assert.equal(legacy.records.get(NOTE_KEYS[city]), raw("old markup"));
  const absent = harness(language, new Map([[NOTE_KEYS[city],raw(note)]]), {noClipboard:true});
  await absent.fields(city).copy.click();
  assert.equal(absent.fields(city)["copy-text"].value,note);
  assert.equal(absent.clipboard.length,0);
  for(const invalid of [null,"{",raw(""),raw("x".repeat(241))]){
    const bad=harness(language,new Map(invalid===null?[]:[[NOTE_KEYS[city],invalid]]));
    assert.equal(bad.fields(city)["copy-tools"].hidden,true);
    await bad.fields(city).copy.click();assert.equal(bad.clipboard.length,0);
  }
  let done;
  const race=harness(language,new Map([[NOTE_KEYS[city],raw(note)]]),{pending:new Promise(resolve=>{done=resolve})});
  const action=race.fields(city).copy.click();
  race.records.set(NOTE_KEYS[city],raw("new value before event"));done();await action;
  assert.match(race.fields(city)["copy-status"].textContent,language==="ko"?/바뀌었어요/:/changed/);
  assert.equal(race.fields(city)["copy-manual"].hidden,true);
}
console.log("Saved note copying passed: explicit clean saved text only, EN/KO three-city isolation, manual fallback, no record writes, race guards and legacy markup.");

for (const language of ["en", "ko"]) for (const city of cities) {
  const note = "Keep: 한 권역\nAlternative: wait";
  const h = harness(language, new Map([[NOTE_KEYS[city], raw(note)], ["tripcompass.saved-guides.v1", '["plan-b"]']]));
  const f = h.fields(city), before = [...h.records];
  assert.equal(h.downloads.length, 0, "No automatic downloads");
  assert.equal(f.download.hidden, false);
  assert.equal(f.download.disabled, false);
  f.download.click();
  assert.deepEqual(h.downloads.map(file => file.name), [`tripcompass-${city}-note.txt`]);
  assert.equal(await h.downloads[0].blob.text(), note);
  assert.equal(h.downloads[0].blob.type, "text/plain;charset=utf-8");
  h.timers.forEach(fn => fn());
  assert.equal(h.urls.size, 0);
  h.type(city, "Unpublished draft");
  f.download.click();
  assert.equal(h.downloads.length, 1);
  f.reload.click();
  h.fail.read = true;
  f.download.click();
  h.fail.read = false;
  assert.equal(h.downloads.length, 1, "Storage failure blocks download");
  assert.deepEqual([...h.records], before);
  h.records.set(NOTE_KEYS[city], raw("New note not yet loaded"));
  f.download.click();
  assert.equal(h.downloads.length, 1, "Do not download stale or unseen content");
  assert.match(f["copy-status"].textContent, language === "ko" ? /바뀌었어요/ : /changed/);
  f.reload.click();
  h.fail.download = true;
  f.download.click();
  assert.match(f["copy-status"].textContent, language === "ko" ? /복사해/ : /copying/);
  assert.ok(!f["copy-status"].textContent.includes("PRIVATE"));
  assert.equal(h.writes.length, 0);
  assert.equal(h.drafts.size, 0);
  const unsupported = harness(language, new Map([[NOTE_KEYS[city], raw(note)]]), {noDownload:true});
  assert.equal(unsupported.fields(city).download.hidden, true);
  assert.equal(unsupported.fields(city).copy.disabled, false, "Keep existing copy as a fallback");
}
console.log("Saved note download passed: exact UTF-8 text, opt-in only, fresh-baseline and draft guards, failure fallback and no record writes.");

function selectNoteFile(ui, city, file) {
  const control = ui.fields(city)["import-file"];
  control.files = file ? [file] : [];
  return control.change();
}

for (const language of ["en", "ko"]) for (const city of cities) {
  const original = raw("Existing saved note"), records = new Map([[NOTE_KEYS[city], original]]);
  const note = "Keep: 한 권역\nAlternative: wait";
  const valid = new File(["\ufeff" + note.replace("\n", "\r\n")], `tripcompass-${city}-note.TXT`);
  const ui = harness(language, records);
  const f = ui.fields(city);
  assert.equal(f.import.hidden, false);
  f.import.click();
  assert.equal(f["import-file"].opened, true);
  await selectNoteFile(ui, city, null);
  assert.equal(f.input.value, "Existing saved note");
  for (const bad of [
    new File([""], "empty.txt"), new File(["  "], "blank.txt"), new File(["abc"], "file.html"),
    new File([Uint8Array.of(0xff, 0xfe)], "invalid.txt"), new File(["a\0b"], "binary.txt"),
    new File(["a".repeat(241)], "over-limit.txt"), new File(["가".repeat(1000)], "too-many-bytes.txt")
  ]) {
    await selectNoteFile(ui, city, bad);
    assert.equal(f.input.value, "Existing saved note");
    assert.equal(ui.drafts.size, 0);
    assert.match(f.status.textContent, /UTF-8 TXT/);
  }
  await selectNoteFile(ui, city, valid);
  assert.equal(f.input.value, note);
  assert.equal(records.get(NOTE_KEYS[city]), original);
  assert.equal(ui.writes.length, 0);
  assert.equal(parseDraft(ui.drafts.get(DRAFT_KEYS[city])).text, note);
  assert.equal(f.import.disabled, true);
  await selectNoteFile(ui, city, new File(["Other text"], "other.txt"));
  assert.equal(f.input.value, note, "Do not replace an existing draft");
  ui.save(city);
  assert.equal(records.get(NOTE_KEYS[city]), raw(note));
  assert.equal(ui.drafts.size, 0);
  const unsupported = harness(language, records, { noImport: true });
  assert.equal(unsupported.fields(city).import.hidden, true);

  for (const interrupt of ["typing", "other-tab"]) {
    let release;
    const delayed = {name: "slow.txt", size: 4, arrayBuffer: () => new Promise(resolve => { release = resolve; })};
    const race = harness(language, new Map([[NOTE_KEYS[city], original]]));
    const action = selectNoteFile(race, city, delayed);
    if (interrupt === "typing") race.type(city, "User typed");
    else race.records.set(NOTE_KEYS[city], raw("Changed in other tab"));
    release(new TextEncoder().encode("Test"));
    await action;
    assert.equal(race.fields(city).input.value, interrupt === "typing" ? "User typed" : "Changed in other tab");
    assert.equal(race.writes.length, 0);
  }
}
console.log("TXT draft import passed: bounded UTF-8 input, existing draft protection, explicit save and async-change guards.");
