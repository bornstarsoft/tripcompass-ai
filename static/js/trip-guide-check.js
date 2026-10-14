import { TRIPS, TASKS, parseState } from "./trip-prep-core.js";
import { saveExistingCheck } from "./trip-check-edit.js";

const copy = {
  en: {
    missing: "No saved preparation for this city. Return to My trips to open its workspace; no record was created.",
    unavailable: "Saved preparation could not be read. Existing records have not been changed.",
    changed: "Your course or alternative changed in another tab. Review the updated trip before checking again.",
    failed: "This check could not be saved. Please try again; saved guides are unchanged.",
    marked: "Marked. Saved in this browser.", unmarked: "Unmarked. Saved in this browser."
  },
  ko: {
    missing: "이 도시의 저장된 준비 내용이 없어요. 내 여행에서 준비함을 열어 주세요. 기록을 새로 만들지 않았습니다.",
    unavailable: "저장한 준비 내용을 읽지 못했어요. 기존 기록은 그대로 두었습니다.",
    changed: "다른 탭에서 코스나 대안이 바뀌었어요. 변경된 여행 내용을 확인한 뒤 다시 체크해 주세요.",
    failed: "체크 변경을 저장하지 못했어요. 다시 시도해 주세요. 저장한 가이드는 그대로입니다.",
    marked: "확인 표시를 이 브라우저에 저장했어요.", unmarked: "확인 해제를 이 브라우저에 저장했어요."
  }
};

export function mountGuideChecks(doc, win) {
  const text = copy[doc.documentElement.lang === "ko" ? "ko" : "en"];
  const panels = [...doc.querySelectorAll("[data-guide-return]")].map(panel => ({
    panel, city: panel.dataset.guideCity, task: panel.dataset.guideTask,
    input: panel.querySelector("[data-guide-check]"), status: panel.querySelector("[data-guide-check-status]")
  })).filter(item => item.input && item.status && Object.hasOwn(TRIPS, item.city) && TASKS.includes(item.task));
  const displayed = new Map();
  const active = item => item.panel.dataset.guideReturn === win.location.hash;

  function render() {
    for (const item of panels) {
      let state = null;
      let message = "";
      if (active(item)) {
        try {
          state = parseState(win.localStorage.getItem(TRIPS[item.city].storageKey), item.city);
          if (!state) message = text.missing;
        } catch { message = text.unavailable; }
      }
      displayed.set(item.panel, state);
      item.input.checked = !!state?.checks[item.task];
      item.input.disabled = !state;
      item.status.textContent = message;
      if (!state && doc.activeElement === item.input) item.panel.querySelector("a").focus({ preventScroll: true });
    }
  }

  for (const item of panels) item.input.addEventListener("change", () => {
    if (!active(item)) { render(); return; }
    const checked = item.input.checked;
    let feedback;
    try {
      const result = saveExistingCheck(win.localStorage, item.city, item.task, checked, displayed.get(item.panel));
      feedback = result === "saved" ? text[checked ? "marked" : "unmarked"] : text[result];
    } catch { feedback = text.failed; }
    render();
    // Update both checkboxes, but announce the action only where it happened.
    item.status.textContent = feedback;
  });
  render();
  win.addEventListener("hashchange", render);
  win.addEventListener("pageshow", render);
  win.addEventListener("storage", event => {
    if (event.key === null || panels.some(item => active(item) && TRIPS[item.city].storageKey === event.key)) render();
  });
}

if (typeof document !== "undefined") mountGuideChecks(document, window);
