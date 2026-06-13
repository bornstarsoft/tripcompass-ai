const FALLBACK_URL = "https://tripcompass.ai/";
const SEARCH_BASE_URL = "https://www.google.com/search";

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

function flightSearch(searchParams) {
  const fromCity = normalizeParam(searchParams, "from", "seoul");
  const toCity = normalizeParam(searchParams, "to", "destination");

  // Future affiliate flight deep links can replace this generic search URL after partner approval.
  return searchRedirect(`flights from ${fromCity} to ${toCity}`, { from: fromCity, to: toCity });
}

function esimSearch(searchParams) {
  const country = normalizeParam(searchParams, "country", "travel destination");

  // Future affiliate eSIM deep links can replace this generic search URL after partner approval.
  return searchRedirect(`${country} travel esim`, { country });
}

function locationForRequest(request, params = {}) {
  const url = new URL(request.url);
  const type = normalizeRouteType(routePath(params, request.url));

  if (type === "hotel" || type === "activity") {
    return destinationSearch(type, url.searchParams);
  }

  if (type === "flight") {
    return flightSearch(url.searchParams);
  }

  if (type === "esim") {
    return esimSearch(url.searchParams);
  }

  return FALLBACK_URL;
}

export function onRequest({ request, params }) {
  try {
    return redirectResponse(locationForRequest(request, params));
  } catch {
    return redirectResponse(FALLBACK_URL);
  }
}
