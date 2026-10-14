export const STORAGE_KEY = "tripcompass.trip-prep.v1";
export const COURSES = ["fukuoka", "parents"];
export const ALTERNATIVES = ["none", "rain", "dazaifu"];
export const TASKS = ["flights", "hotel", "transport", "weather", "departure"];
// Keep the released Fukuoka key and record shape intact; each trip owns its reset.
export const TRIPS = {
  fukuoka: { storageKey: STORAGE_KEY, courses: COURSES, alternatives: ALTERNATIVES },
  osaka: { storageKey: "tripcompass.trip-prep.osaka.v1", courses: ["osaka", "doguyasuji"], alternatives: ["none", "kyoto", "nara"] }
};

function config(destination) {
  if (!Object.hasOwn(TRIPS, destination)) throw new Error("invalid");
  return TRIPS[destination];
}

export function initialState(destination = "fukuoka") {
  return { version: 1, course: config(destination).courses[0], alternative: "none", checks: Object.fromEntries(TASKS.map(id => [id, false])) };
}

export function parseState(value, destination = "fukuoka") {
  const trip = config(destination);
  if (!value) return null;
  if (typeof value !== "string" || value.length > 2048) throw new Error("invalid");
  const raw = JSON.parse(value);
  if (!raw || raw.version !== 1 || !trip.courses.includes(raw.course) || !trip.alternatives.includes(raw.alternative)
      || !raw.checks || TASKS.some(id => typeof raw.checks[id] !== "boolean")) throw new Error("invalid");
  return { version: 1, course: raw.course, alternative: raw.alternative,
    checks: Object.fromEntries(TASKS.map(id => [id, raw.checks[id]])) };
}

export function progress(state) {
  return { done: TASKS.filter(id => state.checks[id]).length, next: TASKS.find(id => !state.checks[id]) || null };
}
