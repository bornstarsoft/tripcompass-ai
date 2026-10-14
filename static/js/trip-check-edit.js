import { TRIPS, TASKS, parseState } from "./trip-prep-core.js";

export function saveExistingCheck(storage, city, task, checked, previous) {
  if (!Object.hasOwn(TRIPS, city) || !TASKS.includes(task) || typeof checked !== "boolean") throw Error("invalid");
  const key = TRIPS[city].storageKey;
  const raw = storage.getItem(key);
  const current = parseState(raw, city);
  if (!current || !previous) return "missing";
  if (current.course !== previous.course || current.alternative !== previous.alternative) return "changed";
  // Merge only the requested check into the latest record, preserving extra fields.
  if (current.checks[task] !== checked) {
    const next = JSON.parse(raw);
    next.checks[task] = checked;
    const serialized = JSON.stringify(next);
    if (serialized.length > 2048) throw Error("invalid");
    storage.setItem(key, serialized);
  }
  return "saved";
}
