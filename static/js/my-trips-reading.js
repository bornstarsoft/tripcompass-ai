import { TRIPS, parseState } from "./trip-prep-core.js";
import { READING_KEYS, parseReading, readReading, queueReading } from "./trip-reading.js";
import { readingUndoReload, undoFresh, UNDO_TTL } from "./trip-reading-undo.js";

export function mountMyTripsReading(doc, win) {
  const ko = doc.documentElement.lang === "ko";
  const cards = [...doc.querySelectorAll("[data-trip-reading]")];
  const reloadUndo = readingUndoReload(win);
  win.addEventListener("pageshow", event => { if (event.persisted) reloadUndo.renew(); });
  for (const card of cards) {
    const city = card.dataset.tripReading;
    if (!Object.hasOwn(TRIPS, city)) continue;
    const rows = [...card.querySelectorAll("[data-reading-task]")];
    const status = card.querySelector("[data-reading-status]");
    const clear = card.querySelector("[data-reading-clear]");
    const undo = card.querySelector("[data-reading-undo]");
    let removed = reloadUndo.take(city), displayedRaw = null, timer = null;
    function expire() {
      if (!removed || undoFresh(removed.at)) return false;
      removed = null; reloadUndo.discard(city);
      return true;
    }
    function scheduleExpiry() {
      if (timer !== null) win.clearTimeout?.(timer);
      timer = removed ? win.setTimeout?.(() => render(), Math.max(0, UNDO_TTL - (Date.now() - removed.at))) : null;
    }
    const matches = (record, state) => state && record.course === state.course && record.alternative === state.alternative;
    function current() {
      const raw = win.localStorage.getItem(READING_KEYS[city]);
      const record = parseReading(raw, city);
      const state = parseState(win.localStorage.getItem(TRIPS[city].storageKey), city);
      return { raw, state, record: record && matches(record, state) ? record : null };
    }
    function announce(message) { status.hidden = false; status.textContent = message; }
    function render() {
      const expired = expire();
      let record = null, failed = false;
      try {
        if (removed && win.localStorage.getItem(READING_KEYS[city]) !== null) removed = null;
        const latest = current(); record = latest.record;
        if (removed && (latest.raw !== null || !matches(removed.record, latest.state))) removed = null;
        displayedRaw = record ? latest.raw : null;
      } catch { failed = true; displayedRaw = null; }
      const row = record && rows.find(row => row.dataset.readingTask === record.task);
      const focusedRow = rows.find(item => item.contains(doc.activeElement));
      const focusedClear = clear === doc.activeElement, focusedUndo = undo === doc.activeElement;
      for (const item of rows) item.hidden = item !== row;
      clear.hidden = !row;
      undo.hidden = !removed;
      status.hidden = !!row;
      status.textContent = failed ? (ko ? "읽던 위치를 확인할 수 없어요. 기존 기록은 그대로입니다." : "Your reading position is unavailable. Existing records are unchanged.")
        : expired ? (ko ? "취소 가능 시간이 지났어요. 읽던 위치는 삭제된 상태입니다." : "Undo time has expired. The reading position remains removed.")
        : removed ? (ko ? "읽던 위치를 지웠어요. 삭제 후 2분 동안 취소할 수 있어요." : "Reading position removed. Undo is available for 2 minutes after removal.")
          : (ko ? "최근 읽던 준비 가이드가 없어요." : "No recent preparation guide.");
      if ((focusedRow && focusedRow !== row) || (focusedClear && clear.hidden) || (focusedUndo && undo.hidden)) {
        (removed ? undo : row ? row.querySelector("[data-reading-link]") : status).focus({ preventScroll: true });
      }
      scheduleExpiry();
    }
    for (const row of rows) {
      const link = row.querySelector("[data-reading-link]");
      link.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || link.target || link.hasAttribute("download")) return;
        try {
          const record = readReading(win.localStorage, city);
          if (record?.task === row.dataset.readingTask) queueReading(win, link, record);
        } catch { /* The ordinary localized guide link remains usable. */ }
      });
    }
    clear.addEventListener("click", () => {
      try {
        const latest = current();
        if (!latest.record || latest.raw !== displayedRaw) { render(); return; }
        win.localStorage.removeItem(READING_KEYS[city]);
        removed = { raw: latest.raw, record: latest.record, at: Date.now() };
        render();
      }
      catch {
        announce(ko ? "읽던 위치를 지우지 못했어요. 다시 시도해 주세요." : "The reading position could not be removed. Please try again.");
      }
    });
    undo.addEventListener("click", () => {
      if (!removed) return;
      if (!undoFresh(removed.at)) { render(); return; }
      try {
        if (win.localStorage.getItem(READING_KEYS[city]) !== null) {
          removed = null; render();
          announce(ko ? "기록이 바뀌어 이전 위치를 복원하지 않았어요." : "Your records changed; the earlier position was not restored.");
          return;
        }
        const latest = current();
        if (latest.raw !== null || !matches(removed.record, latest.state)) {
          removed = null; render();
          announce(ko ? "기록이 바뀌어 이전 위치를 복원하지 않았어요." : "Your records changed; the earlier position was not restored.");
          return;
        }
        win.localStorage.setItem(READING_KEYS[city], removed.raw);
        removed = null; render();
        announce(ko ? "읽던 위치를 복원했어요." : "Reading position restored.");
      } catch {
        announce(ko ? "읽던 위치를 복원하지 못했어요. 다시 시도해 주세요." : "The reading position could not be restored. Please try again.");
      }
    });
    render();
    win.addEventListener("storage", event => {
      if (event.key === null || [READING_KEYS[city], TRIPS[city].storageKey].includes(event.key)) {
        if (event.key === null || (event.key === READING_KEYS[city] && event.newValue != null)) removed = null;
        if (removed && event.key === TRIPS[city].storageKey) {
          try { if (!matches(removed.record, parseState(event.newValue, city))) removed = null; }
          catch { removed = null; }
        }
        render();
      }
    });
    win.addEventListener("pagehide", () => {
      try {
        const latest = current();
        if (latest.raw !== null || (removed && !matches(removed.record, latest.state))) removed = null;
      } catch { removed = null; }
      reloadUndo.save(city, removed);
      removed = null;
      if (timer !== null) win.clearTimeout?.(timer);
    });
    win.addEventListener("pageshow", event => {
      if (event.persisted) reloadUndo.discard(city);
      render();
    });
  }
}

if (typeof document !== "undefined") mountMyTripsReading(document, window);
