const FALLBACK_URL = "https://tripcompass.ai/";
const SEARCH_BASE_URL = "https://www.google.com/search";
const INSERT_CLICK_SQL = `
  INSERT INTO clicks (
    type,
    destination,
    country,
    from_city,
    to_city,
    language,
    referrer,
    user_agent,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function routePath(params, requestUrl) {
  if (Array.isArray(params?.path)) {
    return params.path.join("/");
  }

  if (typeof params?.path === "string") {
    return params.path;
  }

  return new URL(requestUrl).pathname.replace(/^\/go\/?/, "");
}

function normalizeRouteType(value) {
  return String(value || "")
    .split("/")
    .filter(Boolean)[0]
    ?.toLowerCase() || "";
}

function normalizeParam(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  const cleaned = String(raw || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);

  return cleaned || fallback;
}

function nullableParam(searchParams, name) {
  return normalizeParam(searchParams, name, "") || null;
}

function searchRedirect(query, preservedParams = {}) {
  const url = new URL(SEARCH_BASE_URL);
  url.searchParams.set("q", query);

  for (const [key, value] of Object.entries(preservedParams)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function redirectResponse(location) {
  return Response.redirect(location || FALLBACK_URL, 302);
}

function destinationSearch(type, searchParams) {
  const destination = normalizeParam(searchParams, "destination", "travel destination");

  if (type === "hotel") {
    // Future affiliate hotel deep links can replace this generic search URL after partner approval.
    return searchRedirect(`hotels in ${destination}`, { destination });
  }

  if (type === "activity") {
    // Future affiliate activity deep links can replace this generic search URL after partner approval.
    return searchRedirect(`activities in ${destination}`, { destination });
  }

  return FALLBACK_URL;
}

function destinationDetails(type, searchParams) {
  const destination = normalizeParam(searchParams, "destination", "travel destination");

  return {
    type,
    destination,
    country: null,
    fromCity: null,
    toCity: null,
    location: destinationSearch(type, searchParams)
  };
}

function flightSearch(searchParams) {
  const fromCity = normalizeParam(searchParams, "from", "seoul");
  const toCity = normalizeParam(searchParams, "to", "destination");

  // Future affiliate flight deep links can replace this generic search URL after partner approval.
  return searchRedirect(`flights from ${fromCity} to ${toCity}`, { from: fromCity, to: toCity });
}

function flightDetails(searchParams) {
  const fromCity = normalizeParam(searchParams, "from", "seoul");
  const toCity = normalizeParam(searchParams, "to", "destination");

  return {
    type: "flight",
    destination: null,
    country: null,
    fromCity,
    toCity,
    location: flightSearch(searchParams)
  };
}

function esimSearch(searchParams) {
  const country = normalizeParam(searchParams, "country", "travel destination");

  // Future affiliate eSIM deep links can replace this generic search URL after partner approval.
  return searchRedirect(`${country} travel esim`, { country });
}

function esimDetails(searchParams) {
  const country = normalizeParam(searchParams, "country", "travel destination");

  return {
    type: "esim",
    destination: null,
    country,
    fromCity: null,
    toCity: null,
    location: esimSearch(searchParams)
  };
}

function detailsForRequest(request, params = {}) {
  const url = new URL(request.url);
  const type = normalizeRouteType(routePath(params, request.url));

  if (type === "hotel" || type === "activity") {
    return destinationDetails(type, url.searchParams);
  }

  if (type === "flight") {
    return flightDetails(url.searchParams);
  }

  if (type === "esim") {
    return esimDetails(url.searchParams);
  }

  return {
    type: type || "unknown",
    destination: nullableParam(url.searchParams, "destination"),
    country: nullableParam(url.searchParams, "country"),
    fromCity: nullableParam(url.searchParams, "from"),
    toCity: nullableParam(url.searchParams, "to"),
    location: FALLBACK_URL
  };
}

function headerValue(request, name) {
  const value = request.headers.get(name);
  return value && value.trim() ? value.trim().slice(0, 500) : null;
}

function languageParam(request) {
  const raw = new URL(request.url).searchParams.get("lang");
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z-]/g, "")
    .slice(0, 16);

  return cleaned || null;
}

function clickRecord(request, details) {
  return {
    type: details.type,
    destination: details.destination,
    country: details.country,
    fromCity: details.fromCity,
    toCity: details.toCity,
    language: languageParam(request) || headerValue(request, "accept-language"),
    referrer: headerValue(request, "referer") || headerValue(request, "referrer"),
    userAgent: headerValue(request, "user-agent"),
    createdAt: new Date().toISOString()
  };
}

async function logClick(db, record) {
  if (!db || typeof db.prepare !== "function") {
    return;
  }

  await db
    .prepare(INSERT_CLICK_SQL)
    .bind(
      record.type,
      record.destination,
      record.country,
      record.fromCity,
      record.toCity,
      record.language,
      record.referrer,
      record.userAgent,
      record.createdAt
    )
    .run();
}

function scheduleClickLog(context, record) {
  const db = context?.env?.DB;

  if (!db) {
    return;
  }

  const logPromise = logClick(db, record).catch(() => {});

  try {
    if (typeof context.waitUntil === "function") {
      context.waitUntil(logPromise);
      return;
    }
  } catch {}

  logPromise.catch(() => {});
}

export function onRequest(context) {
  try {
    const details = detailsForRequest(context.request, context.params);

    if (context.request.method === "GET") {
      scheduleClickLog(context, clickRecord(context.request, details));
    }

    return redirectResponse(details.location);
  } catch {
    return redirectResponse(FALLBACK_URL);
  }
}
