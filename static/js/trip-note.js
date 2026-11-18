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
    planFields: ["Keep:", "Alternative:", "Recheck:"],
    noTemplateRoom: "There is not enough room to add the prompts. Your draft is unchanged.",
    discardConfirm: "Discard your current draft and load the saved note? Your other trip records will not change.",
    kept: "Your draft is unchanged. You can keep editing.",
    copied: "Saved note copied. Check its contents before sharing.",
    manualCopy: "Automatic copying is unavailable. Copy the selected saved note.",
    copyChanged: "The saved note changed. Load the saved note and try copying again.",
    copyUnavailable: "The saved note could not be checked. Nothing was changed; try again.",
    downloadReady: "Check your downloads for the saved note. The file will not update automatically.",
    downloadChanged: "The saved note changed. Load it before trying to download again.",
    downloadFailed: "The file could not be created. Try copying the saved note instead.",
    importInvalid: "Choose a non-empty UTF-8 TXT file within 240 characters. Your note is unchanged.",
    importFailed: "The file could not be loaded. Your note is unchanged.",
    importChanged: "The saved note changed while the file was opening. Review it before trying again.",
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
    planFields: ["남길 일정:", "대안:", "다시 확인할 것:"],
    noTemplateRoom: "양식을 추가할 공간이 부족해요. 작성하던 메모는 그대로입니다.",
    discardConfirm: "작성 중인 내용을 버리고 저장된 메모를 불러올까요? 다른 여행 기록은 바뀌지 않습니다.",
    kept: "작성 중인 내용을 그대로 유지했어요. 계속 수정할 수 있습니다.",
    copied: "저장된 메모를 복사했어요. 전달하기 전에 내용을 확인해 주세요.",
    manualCopy: "자동 복사를 사용할 수 없어요. 선택된 저장 메모를 복사해 주세요.",
    copyChanged: "저장된 메모가 바뀌었어요. 저장된 메모를 불러온 뒤 다시 복사해 주세요.",
    copyUnavailable: "저장된 메모를 확인하지 못했어요. 기존 내용은 그대로이니 다시 시도해 주세요.",
    downloadReady: "다운로드 목록에서 저장 메모를 확인하세요. 파일은 자동으로 갱신되지 않습니다.",
    downloadChanged: "저장된 메모가 바뀌었어요. 최신 메모를 불러온 뒤 다시 받아 주세요.",
    downloadFailed: "파일을 만들지 못했어요. 저장된 메모를 복사해 보세요.",
    importInvalid: "내용이 있는 240자 이내의 UTF-8 TXT 파일을 골라 주세요. 메모는 그대로입니다.",
    importFailed: "파일을 읽지 못했어요. 메모는 그대로입니다.",
    importChanged: "파일을 여는 동안 저장된 메모가 바뀌었어요. 내용을 확인한 뒤 다시 시도해 주세요.",
    count: n => `${n} / 240`
  }
};

function hasPlanFields(value) {
  const lines = value.split("\n");
  return Object.values(copy).some(({ planFields }) =>
    planFields.every(field => lines.some(line => line.startsWith(field))));
}

async function readNoteFile(file, Decoder) {
  if (!/\.txt$/i.test(file.name) || file.size < 1 || file.size > NOTE_LIMIT * 3 + 3) return null;
  const bytes = await file.arrayBuffer();
  let text;
  try { text = new Decoder("utf-8", { fatal: true }).decode(bytes).replace(/\r\n?/g, "\n"); }
  catch { return null; }
  return text.length <= NOTE_LIMIT && text.trim() && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) ? text : null;
}

export function mountTripNotes(doc, win) {
  const text = copy[doc.documentElement.lang === "ko" ? "ko" : "en"];
  const draftShortcuts = doc.querySelector("[data-note-draft-shortcuts]");
  const savedShortcuts = doc.querySelector("[data-note-saved-shortcuts]");
  function updateShortcut(nav, link, visible) {
    if (!link) return;
    if (!visible && doc.activeElement === link) doc.querySelector("#trip-selector")?.focus();
    link.hidden = !visible;
    nav.hidden = !nav.querySelector("a:not([hidden])");
  }
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
    const planTemplate = find("plan-template");
    const importButton = find("import"), importFile = find("import-file");
    const canImport = importButton && importFile && typeof win.TextDecoder === "function" &&
      typeof win.File?.prototype.arrayBuffer === "function";
    const draftShortcut = draftShortcuts?.querySelector(`[data-note-draft-city="${city}"]`);
    const savedShortcut = savedShortcuts?.querySelector(`[data-note-saved-city="${city}"]`);
    const copyButton = find("copy"), copyTools = find("copy-tools"), copyStatus = find("copy-status");
    const copyManual = find("copy-manual"), copyText = find("copy-text");
    const canCopy = copyButton && copyTools && copyStatus && copyManual && copyText;
    const downloadButton = find("download");
    const canDownload = canCopy && downloadButton && typeof win.Blob === "function" &&
      win.URL?.createObjectURL && win.URL?.revokeObjectURL && "download" in doc.createElement("a");
    let copyBusy = false, readingFile = false, editorRevision = 0;
    let baseline, original = "", dirty = false, blocked = false, conflict = false, unprotected = false;
    dirtyChecks.push(() => unprotected);
    function updateExportButtons() {
      const disabled = copyBusy || dirty || conflict || blocked || !original;
      if (canCopy) copyButton.disabled = disabled;
      if (canDownload) downloadButton.disabled = disabled;
    }
    function updateImportButton() {
      if (canImport) importButton.disabled = readingFile || dirty || conflict || blocked;
    }
    function controls() {
      editorRevision++;
      dirty = input.value !== original;
      updateShortcut(draftShortcuts, draftShortcut, dirty);
      updateShortcut(savedShortcuts, savedShortcut, !dirty && !blocked && !conflict && Boolean(original.trim()));
      save.disabled = blocked || conflict || !dirty || input.value.length > NOTE_LIMIT;
      if (planTemplate) planTemplate.disabled = blocked || conflict || hasPlanFields(input.value);
      updateImportButton();
      find("count").textContent = text.count(input.value.length);
      if (canCopy) {
        copyTools.hidden = !original || blocked;
        updateExportButtons();
        copyManual.hidden = true; copyText.value = ""; copyStatus.textContent = "";
      }
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
    function edited() {
      controls();
      keepDraft();
      if (!blocked && !conflict) status.textContent = input.value.length > NOTE_LIMIT ? text.tooLong : unprotected ? text.draftFailed : dirty ? text.draft : "";
    }
    input.addEventListener("input", edited);
    if (canImport) {
      importButton.hidden = false;
      importButton.addEventListener("click", () => {
        if (!importButton.disabled) importFile.click();
      });
      importFile.addEventListener("change", async () => {
        const file = importFile.files[0];
        importFile.value = "";
        if (!file || importButton.disabled) return;
        const revision = editorRevision, saved = baseline;
        readingFile = true;
        updateImportButton();
        try {
          const imported = await readNoteFile(file, win.TextDecoder);
          // Typing, reloading, saving or a storage refresh takes priority over a pending file.
          if (revision !== editorRevision) return;
          if (imported === null) { status.textContent = text.importInvalid; return; }
          if (win.localStorage.getItem(NOTE_KEYS[city]) !== saved) {
            load();
            status.textContent = text.importChanged;
            return;
          }
          input.value = imported;
          edited();
          input.focus();
        } catch { if (revision === editorRevision) status.textContent = text.importFailed; }
        finally { readingFile = false; updateImportButton(); }
      });
    }
    draftShortcut?.addEventListener("click", event => {
      if (dirty && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) details.open = true;
    });
    if (planTemplate) {
      planTemplate.hidden = false;
      planTemplate.addEventListener("click", () => {
        if (planTemplate.disabled) return;
        const current = input.value;
        const gap = !current || current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n";
        const appended = current + gap + text.planFields.map(line => line + " ").join("\n");
        if (appended.length > NOTE_LIMIT) { status.textContent = text.noTemplateRoom; return; }
        input.value = appended;
        edited();
        input.focus();
        const start = current.length + gap.length + text.planFields[0].length + 1;
        input.setSelectionRange(start, start);
      });
    }
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
    find("reload").addEventListener("click", () => {
      if (dirty || unprotected) {
        // A suppressed or unavailable dialog must never authorize discarding text.
        let confirmed = false;
        try { confirmed = win.confirm(text.discardConfirm) === true; } catch { /* Keep the draft. */ }
        if (!confirmed) {
          if (!blocked && !conflict && !unprotected) status.textContent = text.kept;
          if (!blocked) input.focus();
          return;
        }
      }
      load(true);
      if (!blocked) input.focus();
    });
    function exportMatches(saved, changed) {
      try {
        const raw = win.localStorage.getItem(NOTE_KEYS[city]);
        parseNote(raw);
        if (raw === saved) return true;
        copyStatus.textContent = changed;
      } catch { copyStatus.textContent = text.copyUnavailable; }
      copyManual.hidden = true; copyText.value = "";
      return false;
    }
    if (canCopy) copyButton.addEventListener("click", async () => {
      if (copyButton.disabled || !original) return;
      const revision = editorRevision, saved = baseline, note = original;
      // Never export a draft or silently substitute an unseen newer saved value.
      function current() {
        return revision === editorRevision && exportMatches(saved, text.copyChanged);
      }
      if (!current()) return;
      copyBusy = true; updateExportButtons();
      copyManual.hidden = true; copyText.value = ""; copyStatus.textContent = "";
      try {
        await win.navigator.clipboard.writeText(note);
        if (current()) copyStatus.textContent = text.copied;
      } catch {
        if (current()) {
          copyText.value = note; copyManual.hidden = false;
          copyStatus.textContent = text.manualCopy;
          copyText.focus(); copyText.select();
        }
      } finally {
        copyBusy = false;
        updateExportButtons();
      }
    });
    if (canDownload) {
      downloadButton.hidden = false;
      downloadButton.addEventListener("click", () => {
        if (downloadButton.disabled || !original || !exportMatches(baseline, text.downloadChanged)) return;
        copyManual.hidden = true; copyText.value = "";
        const link = doc.createElement("a");
        let url;
        try {
          url = win.URL.createObjectURL(new win.Blob([original], { type: "text/plain;charset=utf-8" }));
          link.href = url;
          link.download = `tripcompass-${city}-note.txt`;
          link.hidden = true;
          doc.body.append(link);
          link.click();
          copyStatus.textContent = text.downloadReady;
        } catch { copyStatus.textContent = text.downloadFailed; }
        finally {
          link.remove();
          if (url) win.setTimeout(() => win.URL.revokeObjectURL(url), 30_000);
        }
      });
    }
    load(); root.hidden = false;
    win.addEventListener("storage", event => { if (event.key === null || event.key === NOTE_KEYS[city]) refresh(); });
    win.addEventListener("pageshow", () => {
      // Native form restoration also happens on non-BFCache history visits.
      // Reconcile with shared saved/draft state after that restoration.
      if (unprotected) refresh();
      else load();
    });
  }
}

if (typeof document !== "undefined") mountTripNotes(document, window);
