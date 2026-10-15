import { TRIPS, TASKS, parseState } from "./trip-prep-core.js";

export const READING_KEYS = Object.fromEntries(Object.keys(TRIPS).map(city => [city, `tripcompass.reading.${city}.v1`]));
const TRANSFER = "tripcompass.guide-resume.v1";
const matches = (record, state) => state && record.course === state.course && record.alternative === state.alternative;

export function parseReading(raw, city) {
  if (raw === null) return null;
  if (typeof raw !== "string" || raw.length > 2048 || !Object.hasOwn(TRIPS, city)) throw Error("invalid");
  const r = JSON.parse(raw), p = r?.reading;
  if (!r || r.version !== 1 || r.city !== city || !TASKS.includes(r.task) ||
      !TRIPS[city].courses.includes(r.course) || !TRIPS[city].alternatives.includes(r.alternative) ||
      !Number.isFinite(r.at) || r.at < 0 || r.at > Date.now() + 60000 ||
      !Array.isArray(r.open) || r.open.length !== 2 || r.open.some(x => typeof x !== "boolean") ||
      !p || !Number.isFinite(p.ratio) || p.ratio < 0 || p.ratio > 1) throw Error("invalid");
  if (p.kind === "panel") {
    if (![0, 1].includes(p.index) || !Number.isFinite(p.offset) || Math.abs(p.offset) > 100000 ||
        !["return", "current", "progress", "summary", "next", ...TASKS.map(x => `task:${x}`), ...TASKS.map(x => `remaining:${x}`)].includes(p.key)) throw Error("invalid");
  } else if (p.kind === "section") {
    if (typeof p.key !== "string" || !/^[a-z-]{1,64}$/.test(p.key) || !Number.isFinite(p.fraction) || p.fraction < 0 || p.fraction > 1) throw Error("invalid");
  } else if (p.kind !== "page") throw Error("invalid");
  return r;
}

export function readReading(storage, city) {
  const state = parseState(storage.getItem(TRIPS[city].storageKey), city);
  const record = parseReading(storage.getItem(READING_KEYS[city]), city);
  return record && matches(record, state) ? record : null;
}

export function queueReading(win, link, record) {
  const target = new URL(link.href, win.location.href);
  if (target.origin !== win.location.origin || target.hash !== `#prep-${record.city}-${record.task}`) return;
  win.sessionStorage.setItem(TRANSFER, JSON.stringify({ version: 1, to: target.href, from: win.location.href, at: Date.now(), record }));
}

export function mountGuideReading(doc, win, active, position) {
  // Only an existing preparation context can produce a city reading record.
  const seen = new Map();
  function begin() {
    const panel = active()[0], city = panel?.dataset.guideCity;
    if (!Object.hasOwn(TRIPS, city) || seen.has(city)) return;
    try { seen.set(city, parseState(win.localStorage.getItem(TRIPS[city].storageKey), city)); } catch { seen.set(city, null); }
  }
  begin();
  function save() {
    try {
      const panels = active(), city = panels[0]?.dataset.guideCity, task = panels[0]?.dataset.guideTask;
      if (!Object.hasOwn(TRIPS, city) || panels.length !== 2 || !TASKS.includes(task) ||
          panels.some(panel => panel.hidden || panel.querySelector("[data-guide-progress]").hidden)) return;
      const state = parseState(win.localStorage.getItem(TRIPS[city].storageKey), city);
      if (!seen.get(city) || !matches(seen.get(city), state)) return;
      const record = { version: 1, city, task, course: state.course, alternative: state.alternative, at: Date.now(),
        open: panels.map(panel => panel.querySelector("[data-guide-checklist]").open), reading: position.capture() };
      const raw = JSON.stringify(record);
      parseReading(raw, city);
      win.localStorage.setItem(READING_KEYS[city], raw);
    } catch { /* Reading history is optional; never modify preparation or block navigation. */ }
  }
  // Capture before same-document task links change context as well as normal exits.
  doc.addEventListener("click", event => {
    const link = event.target?.closest?.("a[href]");
    if (link && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !link.target && !link.hasAttribute("download")) save();
  }, true);
  win.addEventListener("hashchange", begin);
  win.addEventListener("storage", event => {
    for (const city of seen.keys()) if (event.key === READING_KEYS[city] && event.newValue === null) seen.set(city, null);
    for (const city of seen.keys()) if (event.key === null || event.key === TRIPS[city].storageKey) {
      try {
        if (!matches(seen.get(city) || {}, parseState(win.localStorage.getItem(TRIPS[city].storageKey), city))) seen.set(city, null);
      } catch { seen.set(city, null); }
    }
  });
  function take(event) {
    if (event?.type !== "pageshow" || event.persisted || win.performance?.getEntriesByType?.("navigation")?.[0]?.type !== "navigate") return null;
    try {
      const raw = win.sessionStorage.getItem(TRANSFER);
      if (!raw) return null;
      win.sessionStorage.removeItem(TRANSFER);
      if (raw.length > 4096) return null;
      const transfer = JSON.parse(raw), here = new URL(win.location.href), from = new URL(transfer.from), ref = new URL(doc.referrer);
      if (transfer.version !== 1 || transfer.to !== here.href || from.origin !== here.origin ||
          !["/my-trips/", "/ko/my-trips/"].includes(from.pathname) || ref.origin !== from.origin || ref.pathname !== from.pathname ||
          !Number.isFinite(transfer.at) || Date.now() - transfer.at < 0 || Date.now() - transfer.at > 120000) return null;
      const panels = active(), city = panels[0]?.dataset.guideCity, task = panels[0]?.dataset.guideTask;
      const r = parseReading(JSON.stringify(transfer.record), city);
      if (!r || panels.length !== 2 || r.task !== task || here.hash !== `#prep-${city}-${task}` ||
          !matches(r, parseState(win.localStorage.getItem(TRIPS[city].storageKey), city))) return null;
      // A forgotten or replaced reading record must not be replayed by an older tab.
      if (JSON.stringify(readReading(win.localStorage, city)) !== JSON.stringify(r)) return null;
      return { version: 1, address: here.pathname + here.search + here.hash, open: r.open,
        panel: r.reading.kind === "panel" ? r.reading.index : 0, task: null, x: 0, y: 0, offset: 0, reading: r.reading };
    } catch { return null; }
  }
  return { save, take };
}
