import { TRIPS, TASKS, parseState, progress } from "./trip-prep-core.js";

const copy = {
  en: {
    empty: "No preparation saved yet.", saved: "Preparation saved in this browser",
    complete: "All items marked. Recheck before departure.",
    invalid: "Saved progress could not be read. It has not been changed.",
    blocked: "Browser storage is unavailable. Saved progress cannot be shown.",
    start: "Start preparing", resume: "Continue trip", open: "Open workspace", review: "Review trip",
    notStarted: "Not started", unavailable: "Unavailable", quick: done => `${done}/5 checked`,
    count: done => `${done} of ${TASKS.length} items checked`,
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
    tasks: JSON.parse(card.dataset.taskLabels)
  }));

  // Read the released records in place. The overview never writes or migrates storage.
  function render() {
    let saved = 0;
    let unreadable = 0;
    for (const { card, id, courses, alternatives, tasks } of cards) {
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
  render();
  win.addEventListener("storage", event => {
    if (event.key === null || Object.values(TRIPS).some(trip => trip.storageKey === event.key)) render();
  });
  win.addEventListener("pageshow", event => { if (event.persisted) render(); });
}

if (typeof document !== "undefined") mountMyTrips(document, window);
