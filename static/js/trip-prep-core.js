export const STORAGE_KEY = "tripcompass.trip-prep.v1";
export const COURSES = ["fukuoka", "parents"];
export const ALTERNATIVES = ["none", "rain", "dazaifu"];
export const TASKS = ["flights", "hotel", "transport", "weather", "departure"];

export function initialState() {
  return { version: 1, course: "fukuoka", alternative: "none", checks: Object.fromEntries(TASKS.map(id => [id, false])) };
}

export function parseState(value) {
  if (!value) return null;
  if (typeof value !== "string" || value.length > 2048) throw new Error("invalid");
  const raw = JSON.parse(value);
  if (!raw || raw.version !== 1 || !COURSES.includes(raw.course) || !ALTERNATIVES.includes(raw.alternative)
      || !raw.checks || TASKS.some(id => typeof raw.checks[id] !== "boolean")) throw new Error("invalid");
  return { version: 1, course: raw.course, alternative: raw.alternative,
    checks: Object.fromEntries(TASKS.map(id => [id, raw.checks[id]])) };
}

export function progress(state) {
  return { done: TASKS.filter(id => state.checks[id]).length, next: TASKS.find(id => !state.checks[id]) || null };
}
