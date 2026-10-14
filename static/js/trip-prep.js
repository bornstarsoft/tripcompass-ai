import { TRIPS, TASKS, initialState, parseState, progress } from "./trip-prep-core.js";

export function mountTripPrep(doc, win) {
  const root = doc.querySelector("[data-trip-prep]");
  const entries = [...doc.querySelectorAll("[data-trip-entry]")];
  for (const destination of Object.keys(TRIPS)) {
    mountDestination(doc, win, destination,
      (root?.dataset?.tripPrep || "fukuoka") === destination ? root : null,
      entries.filter(entry => (entry.dataset.tripEntry || "fukuoka") === destination));
  }
}

function mountDestination(doc, win, destination, root, entries) {
  if (!root && !entries.length) return;
  const { storageKey: STORAGE_KEY, courses: COURSES, alternatives: ALTERNATIVES } = TRIPS[destination];
  const ko = doc.documentElement.lang === "ko";
  const say = (en, korean) => ko ? korean : en;
  const find = selector => root?.querySelector(selector);
  const status = find("[data-prep-status]");
  const start = find("[data-prep-start]");
  const create = find("[data-prep-create]");
  const workspace = find("[data-prep-workspace]");
  const confirm = find("[data-prep-confirm]");
  const reset = find("[data-prep-reset]");
  const courses = [...(root?.querySelectorAll('[name="prep-course"]') || [])];
  const alternatives = [...(root?.querySelectorAll('[name="prep-alternative"]') || [])];
  const checks = [...(root?.querySelectorAll("[data-prep-check]") || [])];
  let state = null;
  let memoryOnly = false;
  const message = text => { if (status) status.textContent = text; };
  const temporary = () => message(say("Not saved: changes stay on this page only. Browser storage is unavailable.",
    "저장되지 않았습니다. 브라우저 저장을 사용할 수 없어 변경 내용은 이 페이지에서만 유지됩니다."));

  function read() {
    let raw;
    try { raw = win.localStorage.getItem(STORAGE_KEY); }
    catch { memoryOnly = true; temporary(); return state; }
    try { return parseState(raw, destination); }
    catch { message(say("Saved preparation could not be read. Start again to replace it; saved guides are untouched.",
      "저장된 준비 내용을 읽을 수 없습니다. 다시 시작하면 준비 내용만 교체하고 저장한 글은 유지합니다.")); return null; }
  }

  function render() {
    for (const entry of entries) entry.textContent = state && !memoryOnly
      ? entry.dataset.continueLabel : entry.dataset.startLabel;
    if (!root) return;
    start.hidden = !!state;
    workspace.hidden = !state;
    confirm.hidden = true;
    if (!state) return;
    courses.forEach(input => { input.checked = input.value === state.course; });
    alternatives.forEach(input => { input.checked = input.value === state.alternative; });
    checks.forEach(input => { input.checked = state.checks[input.dataset.prepCheck]; });
    const { done, next } = progress(state);
    find("[data-prep-progress]").value = done;
    find("[data-prep-summary]").textContent = say(`${done} of ${TASKS.length} checked`, `${TASKS.length}개 중 ${done}개 확인`);
    const nextLink = find("[data-prep-next]");
    nextLink.setAttribute("href", next ? `#prep-task-${next}` : "#prep-checklist");
    nextLink.textContent = next
      ? say("Next: ", "다음: ") + checks.find(input => input.dataset.prepCheck === next).parentElement.textContent.trim()
      : say("All marked. Review your checks before departure.", "모두 표시했어요. 출발 전 조건을 다시 확인하세요.");
  }

  function save() {
    try {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      memoryOnly = false;
      message(say("Saved in this browser.", "이 브라우저에 저장했습니다."));
    } catch { memoryOnly = true; temporary(); }
    render();
  }

  function change(update) {
    // Merge the latest other-tab state before changing just the selected field.
    if (!memoryOnly) state = read();
    if (!state) {
      render();
      message(say("Preparation is no longer available. Start again to continue.", "준비 내용이 없어졌습니다. 다시 시작해 주세요."));
      create.focus();
      return;
    }
    update(state);
    save();
  }

  state = read();
  render();
  if (root) {
    create.addEventListener("click", () => {
      if (!memoryOnly) state = read();
      state ||= initialState(destination);
      save();
      courses.find(input => input.checked).focus();
    });
    courses.forEach(input => input.addEventListener("change", () => {
      if (input.checked && COURSES.includes(input.value)) change(value => {
        if (value.course !== input.value) value.checks = initialState(destination).checks;
        value.course = input.value;
      });
    }));
    alternatives.forEach(input => input.addEventListener("change", () => {
      if (input.checked && ALTERNATIVES.includes(input.value)) change(value => {
        if (value.alternative !== input.value) { value.checks.weather = false; value.checks.transport = false; }
        value.alternative = input.value;
      });
    }));
    checks.forEach(input => input.addEventListener("change", () => {
      const id = input.dataset.prepCheck;
      if (TASKS.includes(id)) change(value => { value.checks[id] = input.checked; });
    }));
    reset.addEventListener("click", () => {
      confirm.hidden = false;
      find("[data-prep-cancel]").focus();
    });
    find("[data-prep-cancel]").addEventListener("click", () => { confirm.hidden = true; reset.focus(); });
    find("[data-prep-delete]").addEventListener("click", () => {
      try { win.localStorage.removeItem(STORAGE_KEY); }
      catch {
        message(say("Could not remove browser data. Clear this site's data in browser settings; this preparation has not been reset.",
          "브라우저 데이터를 지우지 못했습니다. 브라우저 설정에서 이 사이트 데이터를 삭제하세요. 준비함은 초기화되지 않았습니다."));
        return;
      }
      state = null;
      memoryOnly = false;
      render();
      message(say("This preparation cleared. Other trips, saved guides and the decision board were kept.", "이 여행 준비 내용을 지웠습니다. 다른 준비함, 저장한 글과 여행 결정표는 유지했습니다."));
      create.focus();
    });
  }
  function sync() {
    if (memoryOnly) return;
    const focused = root?.contains(doc.activeElement) && workspace && !workspace.hidden;
    message("");
    state = read();
    render();
    if (focused && !state) create.focus();
  }
  win.addEventListener("storage", event => { if (event.key === STORAGE_KEY || event.key === null) sync(); });
  win.addEventListener("pageshow", event => { if (event.persisted) sync(); });
}

if (typeof document !== "undefined") mountTripPrep(document, window);
