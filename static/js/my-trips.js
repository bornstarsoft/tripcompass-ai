import { TRIPS, TASKS, parseState, progress } from "./trip-prep-core.js";
import { saveExistingCheck } from "./trip-check-edit.js";

const SAVED_GUIDES_KEY = "tripcompass.saved-guides.v1";

const copy = {
  en: {
    empty: "No preparation saved yet.", saved: "Preparation saved in this browser",
    complete: "All items marked. Recheck before departure.",
    invalid: "Saved progress could not be read. It has not been changed.",
    blocked: "Browser storage is unavailable. Saved progress cannot be shown.",
    start: "Start preparing", resume: "Continue trip", open: "Open workspace", review: "Review trip",
    notStarted: "Not started", unavailable: "Unavailable", quick: done => `${done}/5 checked`,
    count: done => `${done} of ${TASKS.length} items checked`,
    guidesCount: count => `${count} saved ${count === 1 ? "guide" : "guides"}`,
    guidesEmpty: "No guides saved for this city yet.",
    guidesInvalid: "Your saved list could not be read. It has not been changed.",
    guidesBlocked: "Browser storage is unavailable. Your saved list cannot be shown.",
    removed: title => `Removed from saved guides: ${title}. You can undo while this page stays open.`,
    restored: title => `Saved again: ${title}.`,
    editFailed: "Your change could not be saved. Please try again. Travel preparation has not been changed.",
    checkSaved: (title, checked) => `${checked ? "Marked" : "Unmarked"}: ${title}. Saved in this browser.`,
    checkFailed: "This check could not be saved. Please try again; saved guides are unchanged.",
    tripChanged: "Your course or alternative changed in another tab. Review the updated trip before checking again.",
    tripMissing: "This trip has no saved preparation. Open its workspace to start; no record was created.",
    summary: (saved, unreadable) => `${saved} of 3 trips have saved preparation.${unreadable ? ` ${unreadable} could not be read.` : ""}`,
    final: "Recheck your choices and travel conditions before departure."
  },
  ko: {
    empty: "아직 저장한 준비 내용이 없어요.", saved: "이 브라우저에 저장된 여행",
    complete: "모든 항목에 체크했어요. 출발 전 다시 확인하세요.",
    invalid: "저장한 준비 내용을 읽지 못했어요. 기존 기록은 그대로 두었습니다.",
    blocked: "브라우저 저장소를 사용할 수 없어 준비 상태를 표시할 수 없어요.",
    start: "여행 준비 시작", resume: "여행 이어가기", open: "준비함 열기", review: "준비 내용 다시 보기",
    notStarted: "시작 전", unavailable: "확인 불가", quick: done => `${done}/5 확인`,
    count: done => `${TASKS.length}개 중 ${done}개 확인`,
    guidesCount: count => `저장한 가이드 ${count}개`,
    guidesEmpty: "아직 이 도시에 저장한 가이드가 없어요.",
    guidesInvalid: "저장 목록을 읽지 못했어요. 기존 기록은 그대로 두었습니다.",
    guidesBlocked: "브라우저 저장소를 사용할 수 없어 저장 목록을 표시할 수 없어요.",
    removed: title => `저장 해제: ${title}. 이 페이지를 열어 둔 동안 취소할 수 있어요.`,
    restored: title => `다시 저장했어요: ${title}.`,
    editFailed: "변경 내용을 저장하지 못했어요. 다시 시도해 주세요. 여행 준비 기록은 그대로입니다.",
    checkSaved: (title, checked) => `${checked ? "확인 표시" : "확인 해제"}: ${title}. 이 브라우저에 저장했어요.`,
    checkFailed: "체크 변경을 저장하지 못했어요. 다시 시도해 주세요. 저장한 가이드는 그대로입니다.",
    tripChanged: "다른 탭에서 코스나 대안이 바뀌었어요. 변경된 여행 내용을 확인한 뒤 다시 체크해 주세요.",
    tripMissing: "저장된 준비 내용이 없어요. 준비함에서 여행을 시작해 주세요. 기록을 새로 만들지 않았습니다.",
    summary: (saved, unreadable) => `3개 여행 중 ${saved}개에 준비 내용이 있어요.${unreadable ? ` ${unreadable}개는 읽지 못했어요.` : ""}`,
    final: "출발 전 선택한 일정과 여행 조건을 다시 확인하세요."
  }
};

export function mountMyTrips(doc, win) {
  const root = doc.querySelector("[data-my-trips]");
  if (!root) return;
  const text = copy[doc.documentElement.lang === "ko" ? "ko" : "en"];
  const cards = [...root.querySelectorAll("[data-trip-summary]")].map(card => ({
    card, id: card.dataset.tripSummary,
    courses: JSON.parse(card.dataset.courseLabels),
    alternatives: JSON.parse(card.dataset.alternativeLabels),
    tasks: JSON.parse(card.dataset.taskLabels),
    checks: [...card.querySelectorAll("[data-trip-check]")],
    guides: [...card.querySelectorAll("[data-trip-saved-guide]")]
  }));

  const removed = new Set();
  const displayed = new Map();
  function readGuides() {
    let raw;
    try { raw = win.localStorage.getItem(SAVED_GUIDES_KEY); }
    catch { throw Error("guidesBlocked"); }
    if (raw === null) return [];
    try {
      if (typeof raw !== "string" || raw.length > 65536) throw Error("invalid");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw Error("invalid");
      return parsed;
    } catch { throw Error("guidesInvalid"); }
  }

  // Visits only read storage; each explicit edit updates its existing record in place.
  function render() {
    let guideIds = new Set();
    let guideError = "";
    try { guideIds = new Set(readGuides().filter(id => typeof id === "string")); }
    catch (error) { guideError = error.message; }
    for (const id of guideIds) removed.delete(id);
    let saved = 0;
    let unreadable = 0;
    for (const { card, id, courses, alternatives, tasks, guides, checks } of cards) {
      if (!Object.hasOwn(TRIPS, id)) continue;
      let state = null;
      let error = "";
      let raw;
      try { raw = win.localStorage.getItem(TRIPS[id].storageKey); }
      catch { error = "blocked"; }
      if (!error) {
        try { state = parseState(raw, id); }
        catch { error = "invalid"; }
      }
      const find = name => card.querySelector(`[data-trip-${name}]`);
      displayed.set(id, state);
      find("check-feedback").textContent = "";
      const focusedCheck = checks.includes(doc.activeElement);
      for (const input of checks) {
        input.checked = !!state?.checks[input.dataset.tripCheck];
        input.disabled = !state;
      }
      if (!state && focusedCheck) find("action").focus({ preventScroll: true });
      find("guides-feedback").textContent = "";
      // Only prebuilt localized links can be shown; stored IDs never become URLs or HTML.
      let guideCount = 0;
      for (const guide of guides) {
        const guideId = guide.dataset.tripSavedGuide;
        const pending = removed.has(guideId);
        guide.hidden = !!guideError || (!guideIds.has(guideId) && !pending);
        if (!guideError && guideIds.has(guideId)) guideCount++;
        const remove = guide.querySelector("[data-guide-remove]");
        const undo = guide.querySelector("[data-guide-undo]");
        const focused = doc.activeElement === remove || doc.activeElement === undo;
        remove.hidden = pending;
        undo.hidden = !pending;
        guide.querySelector("[data-guide-removed]").hidden = !pending;
        if (!guide.hidden && focused) {
          (pending ? undo : remove).focus({ preventScroll: true });
        }
      }
      find("guides-list").hidden = guides.every(guide => guide.hidden);
      find("guides-status").textContent = guideError ? text[guideError]
        : guideCount ? text.guidesCount(guideCount) : text.guidesEmpty;
      const quick = root.querySelector(`[data-trip-quick="${id}"]`);
      find("details").hidden = !state;
      if (!state) {
        if (error) unreadable++;
        find("status").textContent = text[error || "empty"];
        find("action-label").textContent = text[error ? "open" : "start"];
        quick.textContent = text[error ? "unavailable" : "notStarted"];
        // Clear stale display values when another tab resets or invalidates a record.
        for (const name of ["count", "course", "alternative", "next"]) find(name).textContent = "";
        find("progress").value = 0;
        continue;
      }
      saved++;
      const { done, next } = progress(state);
      quick.textContent = text.quick(done);
      find("status").textContent = text[next ? "saved" : "complete"];
      find("count").textContent = text.count(done);
      find("progress").value = done;
      find("course").textContent = courses[state.course];
      find("alternative").textContent = alternatives[state.alternative];
      find("next").textContent = next ? tasks[next] : text.final;
      find("action-label").textContent = text[next ? "resume" : "review"];
    }
    root.querySelector("[data-trips-summary]").textContent = text.summary(saved, unreadable);
  }

  for (const { card, id, tasks, checks } of cards) {
    if (!Object.hasOwn(TRIPS, id)) continue;
    for (const input of checks) input.addEventListener("change", () => {
      const task = input.dataset.tripCheck;
      if (!TASKS.includes(task)) return;
      const checked = input.checked;
      let feedback = "";
      try {
        const result = saveExistingCheck(win.localStorage, id, task, checked, displayed.get(id));
        feedback = result === "missing" ? text.tripMissing : result === "changed" ? text.tripChanged : text.checkSaved(tasks[task], checked);
      } catch { feedback = text.checkFailed; }
      render();
      card.querySelector("[data-trip-check-feedback]").textContent = feedback;
    });
  }

  for (const { card, guides } of cards) {
    for (const guide of guides) {
      for (const action of ["remove", "undo"]) {
        guide.querySelector(`[data-guide-${action}]`).addEventListener("click", () => {
          const id = guide.dataset.tripSavedGuide;
          const status = card.querySelector("[data-trip-guides-feedback]");
          try {
            // Merge only this ID into the latest list, retaining unknown entries and other-tab edits.
            const current = readGuides();
            if (action === "undo" && !removed.has(id)) return;
            const next = action === "remove" ? current.filter(value => value !== id)
              : current.includes(id) ? current : [...current, id];
            if (action === "remove" ? current.includes(id) : !current.includes(id)) {
              const serialized = JSON.stringify(next);
              if (serialized.length > 65536) throw Error("too large");
              win.localStorage.setItem(SAVED_GUIDES_KEY, serialized);
            }
            if (action === "remove") removed.add(id);
            else removed.delete(id);
            render();
            status.textContent = text[action === "remove" ? "removed" : "restored"](guide.querySelector("a").textContent);
          } catch {
            status.textContent = text.editFailed;
          }
        });
      }
    }
  }
  render();
  win.addEventListener("storage", event => {
    if (event.key === null || event.key === SAVED_GUIDES_KEY || Object.values(TRIPS).some(trip => trip.storageKey === event.key)) render();
  });
  win.addEventListener("pageshow", event => { if (event.persisted) render(); });
}

if (typeof document !== "undefined") mountMyTrips(document, window);
