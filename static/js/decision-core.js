export const CITIES = ["fukuoka", "osaka", "tokyo"];
export const PRIORITIES = ["budget", "time", "food", "shopping", "ease"];
export const STORAGE_KEY = "tripcompass.decision.v1";
const DAY = 86400000;
const HOUR = 3600000;

export function defaultState() {
  return {
    version: 1, from: "seoul", people: 2, rooms: 1, budget: null, buffer: 3,
    options: ["fukuoka", "osaka"].map(city => ({ city, airfare: null, hotel: null, nights: 3, other: null, arrival: null, departure: null })),
    opinions: [{ priority: "budget", pick: "" }, { priority: "time", pick: "" }]
  };
}

// Interpret local Japan clock values without the viewer's timezone or DST.
export function localTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const stamp = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 16) !== value) return null;
  const year = Number(value.slice(0, 4));
  return year >= 2020 && year <= 2100 ? stamp : null;
}

export function validateState(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || raw.version !== 1 || !Array.isArray(raw.options) || raw.options.length !== 2 || !Array.isArray(raw.opinions) || raw.opinions.length !== 2) {
    return { state: null, errors: ["state"] };
  }
  function number(value, key, min, max, optional = false, step = 1) {
    if (value === "" || value === null || value === undefined) {
      if (!optional) errors.push(key);
      return null;
    }
    if (!["string", "number"].includes(typeof value) || !/^\d+(\.\d+)?$/.test(String(value))) {
      errors.push(key);
      return null;
    }
    const result = Number(value);
    if (!Number.isFinite(result) || result < min || result > max || !Number.isInteger(result / step)) errors.push(key);
    return result;
  }
  function choice(value, allowed, key) {
    if (!allowed.includes(value)) errors.push(key);
    return value;
  }
  function date(value, key) {
    if (value === "" || value === null || value === undefined) return null;
    if (localTime(value) === null) errors.push(key);
    return value;
  }
  const state = {
    version: 1,
    from: choice(raw.from, ["seoul", "busan", "incheon"], "from"),
    people: number(raw.people, "people", 1, 6),
    rooms: number(raw.rooms, "rooms", 1, 6),
    budget: number(raw.budget, "budget", 0, 100000000, true),
    buffer: number(raw.buffer, "buffer", 0, 12, false, 0.5),
    options: raw.options.map((option, i) => {
      const item = option || {};
      const result = {
        city: choice(item.city, CITIES, `city${i}`),
        airfare: number(item.airfare, `airfare${i}`, 0, 100000000, true),
        hotel: number(item.hotel, `hotel${i}`, 0, 100000000, true),
        nights: number(item.nights, `nights${i}`, 1, 14),
        other: number(item.other, `other${i}`, 0, 100000000, true),
        arrival: date(item.arrival, `arrival${i}`),
        departure: date(item.departure, `departure${i}`)
      };
      const arrival = localTime(result.arrival);
      const departure = localTime(result.departure);
      if (arrival !== null && departure !== null && (departure <= arrival || departure - arrival > 14 * DAY)) errors.push(`departure${i}`);
      return result;
    }),
    opinions: raw.opinions.map((opinion, i) => ({
      priority: choice(opinion?.priority, PRIORITIES, `priority${i}`),
      pick: choice(opinion?.pick, ["", ...raw.options.map(item => item?.city).filter(city => CITIES.includes(city))], `pick${i}`)
    }))
  };
  if (state.options[0].city === state.options[1].city) errors.push("city1");
  return { state, errors: [...new Set(errors)] };
}

export function estimateTime(option, buffer) {
  const arrival = localTime(option.arrival);
  const departure = localTime(option.departure);
  if (arrival === null || departure === null || departure <= arrival || departure - arrival > 14 * DAY) return null;
  const start = arrival + buffer * HOUR;
  const end = departure - buffer * HOUR;
  let milliseconds = 0;
  for (let day = Math.floor(arrival / DAY) * DAY; day <= departure; day += DAY) {
    milliseconds += Math.max(0, Math.min(end, day + 22 * HOUR) - Math.max(start, day + 8 * HOUR));
  }
  return {
    hours: Math.round(milliseconds / HOUR * 10) / 10,
    calendarNights: Math.floor(departure / DAY) - Math.floor(arrival / DAY)
  };
}

export function summarize(state) {
  const results = state.options.map(option => {
    const entered = [option.airfare, option.hotel, option.other].filter(value => value !== null).length;
    const subtotal = (option.airfare ?? 0) * state.people + (option.hotel ?? 0) * state.rooms * option.nights + (option.other ?? 0);
    return {
      entered, complete: entered === 3, subtotal: entered ? subtotal : null,
      perPerson: entered ? subtotal / state.people : null,
      budgetDifference: entered === 3 && state.budget !== null ? subtotal - state.budget : null,
      time: estimateTime(option, state.buffer)
    };
  });
  return {
    results,
    costDifference: results.every(item => item.complete) ? results[0].subtotal - results[1].subtotal : null,
    timeDifference: results.every(item => item.time !== null) ? Math.round((results[0].time.hours - results[1].time.hours) * 10) / 10 : null
  };
}

export function encodeState(raw) {
  const { state, errors } = validateState(raw);
  if (errors.length) throw new Error("Invalid decision board");
  return `#plan=${encodeURIComponent(JSON.stringify(state))}`;
}

export function decodeState(fragment) {
  if (typeof fragment !== "string" || fragment.length > 6000 || !fragment.startsWith("#plan=")) throw new Error("Invalid decision link");
  const raw = JSON.parse(decodeURIComponent(fragment.slice(6)));
  const { state, errors } = validateState(raw);
  if (errors.length) throw new Error("Invalid decision board");
  return state;
}

export function goLinks(city, from, language) {
  if (!CITIES.includes(city) || !["seoul", "busan", "incheon"].includes(from)) throw new Error("Unsupported search");
  const lang = language === "ko" ? "ko" : "en";
  return {
    hotel: `/go/hotel?destination=${city}&country=japan&lang=${lang}`,
    flight: `/go/flight?from=${from}&to=${city}&country=japan&lang=${lang}`,
    activity: `/go/activity?destination=${city}&country=japan&lang=${lang}`,
    esim: `/go/esim?country=japan&lang=${lang}`
  };
}
