import { TRIPS } from "./trip-prep-core.js";
import { READING_KEYS, readReading, queueReading } from "./trip-reading.js";

export function mountMyTripsReading(doc, win) {
  const ko = doc.documentElement.lang === "ko";
  const cards = [...doc.querySelectorAll("[data-trip-reading]")];
  for (const card of cards) {
    const city = card.dataset.tripReading;
    if (!Object.hasOwn(TRIPS, city)) continue;
    const rows = [...card.querySelectorAll("[data-reading-task]")];
    const status = card.querySelector("[data-reading-status]");
    const clear = card.querySelector("[data-reading-clear]");
    function render() {
      let record = null, failed = false;
      try { record = readReading(win.localStorage, city); } catch { failed = true; }
      const row = record && rows.find(row => row.dataset.readingTask === record.task);
      const hadFocus = rows.some(item => item.contains(doc.activeElement)) || clear === doc.activeElement;
      for (const item of rows) item.hidden = item !== row;
      clear.hidden = !row;
      status.hidden = !!row;
      status.textContent = failed ? (ko ? "읽던 위치를 확인할 수 없어요. 기존 기록은 그대로입니다." : "Your reading position is unavailable. Existing records are unchanged.")
        : (ko ? "최근 읽던 준비 가이드가 없어요." : "No recent preparation guide.");
      if (hadFocus && !row) status.focus({ preventScroll: true });
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
      try { win.localStorage.removeItem(READING_KEYS[city]); render(); }
      catch {
        status.hidden = false;
        status.textContent = ko ? "읽던 위치를 지우지 못했어요. 다시 시도해 주세요." : "The reading position could not be removed. Please try again.";
      }
    });
    render();
    win.addEventListener("storage", event => { if (event.key === null || [READING_KEYS[city], TRIPS[city].storageKey].includes(event.key)) render(); });
    win.addEventListener("pageshow", () => render());
  }
}

if (typeof document !== "undefined") mountMyTripsReading(document, window);
