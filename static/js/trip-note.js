import { TRIPS } from "./trip-prep-core.js";

export const NOTE_LIMIT = 240;
export const NOTE_KEYS = Object.fromEntries(Object.keys(TRIPS).map(city => [city, `tripcompass.return-note.${city}.v1`]));
export const DRAFT_KEYS = Object.fromEntries(Object.keys(TRIPS).map(city => [city, `tripcompass.note-draft.${city}.v1`]));

export function parseNote(raw) {
  if (raw === null) return "";
  if (typeof raw !== "string" || raw.length > 4096) throw Error("invalid");
  const value = JSON.parse(raw);
  if (value?.version !== 1 || typeof value.text !== "string" || value.text.length > NOTE_LIMIT) throw Error("invalid");
  return value.text;
}

export function parseDraft(raw) {
  if (raw === null) return null;
  if (typeof raw !== "string" || raw.length > 16384) throw Error("invalid");
  const value = JSON.parse(raw);
  if (value?.version !== 1 || typeof value.text !== "string" || value.text.length > NOTE_LIMIT) throw Error("invalid");
  parseNote(value.base);
  return value;
}

const copy = {
  en: {
    empty: "Add a next-visit note", edit: "Edit next-visit note", draft: "Draft kept in this tab. Save note to keep it for later visits.",
    draftFailed: "Your draft is still here, but could not be kept for reload or language switching. Save before leaving.",
    draftUnavailable: "A previous draft could not be restored. Your saved note is unchanged.",
    discardFailed: "Your draft could not be cleared. It is still here; please try again.",
    saved: "Note saved in this browser.", cleared: "Note removed. Other trip records are unchanged.",
    failed: "Your note could not be saved. Your draft is still here; please try again.",
    unavailable: "Your saved note is unavailable. It has not been changed.",
    conflict: "This note changed in another tab. Your draft is still here. Load the saved note before editing again.",
    loaded: "Saved note loaded.", tooLong: "Keep the note within 240 characters.",
    count: n => `${n} / 240`
  },
  ko: {
    empty: "다음에 확인할 메모 남기기", edit: "다음에 확인할 메모 수정", draft: "작성 중인 내용을 이 탭에 임시 보관했어요. 다음 방문에도 보려면 메모를 저장해 주세요.",
    draftFailed: "작성한 내용은 있지만 새로고침·언어 전환을 위한 임시 보관에 실패했어요. 이동 전에 메모를 저장해 주세요.",
    draftUnavailable: "이전 작성 내용을 복원하지 못했어요. 저장된 메모는 그대로입니다.",
    discardFailed: "임시 보관 내용을 지우지 못했어요. 작성 중인 내용은 남아 있으니 다시 시도해 주세요.",
    saved: "이 브라우저에 메모를 저장했어요.", cleared: "메모를 지웠어요. 다른 여행 기록은 그대로입니다.",
    failed: "메모를 저장하지 못했어요. 작성한 내용은 남아 있으니 다시 시도해 주세요.",
    unavailable: "저장된 메모를 읽을 수 없어요. 기존 내용은 그대로입니다.",
    conflict: "다른 탭에서 메모가 바뀌었어요. 작성 중인 내용은 남아 있습니다. 저장된 메모를 불러온 뒤 다시 수정해 주세요.",
    loaded: "저장된 메모를 불러왔어요.", tooLong: "메모는 240자 이내로 작성해 주세요.",
    count: n => `${n} / 240`
  }
};

export function mountTripNotes(doc, win) {
  const text = copy[doc.documentElement.lang === "ko" ? "ko" : "en"];
  const dirtyChecks = [];
  let guarding = false;
  const guard = event => { event.preventDefault(); event.returnValue = ""; };
  function updateGuard() {
    const needed = dirtyChecks.some(check => check());
    if (needed === guarding) return;
    guarding = needed;
    win[needed ? "addEventListener" : "removeEventListener"]("beforeunload", guard);
  }
  for (const root of doc.querySelectorAll("[data-trip-note]")) {
    const city = root.dataset.tripNote;
    if (!Object.hasOwn(NOTE_KEYS, city)) continue;
    const find = name => root.querySelector(`[data-note-${name}]`);
    const input = find("input"), form = find("form"), save = find("save"), status = find("status");
    const preview = find("preview"), details = find("details"), summary = find("summary");
    let baseline, original = "", dirty = false, blocked = false, conflict = false, unprotected = false;
    dirtyChecks.push(() => unprotected);
    function controls() {
      dirty = input.value !== original;
      save.disabled = blocked || conflict || !dirty || input.value.length > NOTE_LIMIT;
      find("count").textContent = text.count(input.value.length);
      updateGuard();
    }
    function keepDraft() {
      try {
        if (input.value.length > NOTE_LIMIT) throw Error("invalid");
        if (dirty) win.sessionStorage.setItem(DRAFT_KEYS[city], JSON.stringify({ version: 1, text: input.value, base: baseline }));
        else win.sessionStorage.removeItem(DRAFT_KEYS[city]);
        unprotected = false;
      } catch { unprotected = true; }
      updateGuard();
    }
    function load(announce = false) {
      try {
        const raw = win.localStorage.getItem(NOTE_KEYS[city]), note = parseNote(raw);
        // Discard only after both the saved value and draft cleanup are available.
        if (announce) {
          try { win.sessionStorage.removeItem(DRAFT_KEYS[city]); }
          catch { status.textContent = text.discardFailed; return; }
        }
        baseline = raw; original = note; input.value = note;
        preview.textContent = note; preview.hidden = !note;
        summary.textContent = note ? text.edit : text.empty;
        blocked = false; conflict = false; unprotected = false; input.disabled = false;
        status.textContent = announce ? text.loaded : "";
        if (!announce) {
          try {
            const draft = parseDraft(win.sessionStorage.getItem(DRAFT_KEYS[city]));
            if (draft) {
              // A successful save may have been followed by failed draft cleanup.
              const alreadySaved = draft.base !== raw && draft.text.trim() === note;
              if (alreadySaved || (draft.base === raw && draft.text === note)) {
                try { win.sessionStorage.removeItem(DRAFT_KEYS[city]); } catch { /* Safe to ignore an obsolete draft. */ }
              } else {
                input.value = draft.text; baseline = draft.base;
                conflict = draft.base !== raw; details.open = true;
                status.textContent = conflict ? text.conflict : text.draft;
              }
            }
          } catch { status.textContent = text.draftUnavailable; }
        }
      } catch {
        blocked = true; input.disabled = true;
        preview.hidden = true; status.textContent = text.unavailable;
      }
      controls();
    }
    function refresh() {
      if (!dirty && !unprotected) { load(); return; }
      try {
        if (win.localStorage.getItem(NOTE_KEYS[city]) !== baseline) {
          conflict = true; status.textContent = text.conflict;
        }
      } catch { blocked = true; status.textContent = text.unavailable; }
      controls();
    }
    input.addEventListener("input", () => {
      controls();
      keepDraft();
      if (!blocked && !conflict) status.textContent = input.value.length > NOTE_LIMIT ? text.tooLong : unprotected ? text.draftFailed : dirty ? text.draft : "";
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (blocked || conflict || !dirty) return;
      if (input.value.length > NOTE_LIMIT) { status.textContent = text.tooLong; return; }
      try {
        // Recheck immediately before writing; a stale draft must not replace a newer note.
        const current = win.localStorage.getItem(NOTE_KEYS[city]);
        parseNote(current);
        if (current !== baseline) { conflict = true; status.textContent = text.conflict; controls(); return; }
        const note = input.value.trim();
        const raw = note ? JSON.stringify({ version: 1, text: note }) : null;
        if (raw === null) win.localStorage.removeItem(NOTE_KEYS[city]);
        else win.localStorage.setItem(NOTE_KEYS[city], raw);
        try { win.sessionStorage.removeItem(DRAFT_KEYS[city]); }
        catch {
          // With no durable change, restoration cannot distinguish this save from an edit.
          if (raw === baseline) { status.textContent = text.discardFailed; return; }
        }
        baseline = raw; original = note; input.value = note;
        preview.textContent = note; preview.hidden = !note;
        summary.textContent = note ? text.edit : text.empty;
        status.textContent = note ? text.saved : text.cleared;
        unprotected = false;
        controls(); details.open = false; summary.focus({ preventScroll: true });
      } catch { status.textContent = text.failed; }
    });
    find("reload").addEventListener("click", () => { load(true); if (!blocked) input.focus(); });
    load(); root.hidden = false;
    win.addEventListener("storage", event => { if (event.key === null || event.key === NOTE_KEYS[city]) refresh(); });
    win.addEventListener("pageshow", event => {
      if (!event.persisted) return;
      // Another overview in this tab may have saved/discarded a cached page's draft.
      if (unprotected) refresh();
      else load();
    });
  }
}

if (typeof document !== "undefined") mountTripNotes(document, window);
