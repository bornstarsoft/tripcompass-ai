import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequest } from "../functions/go/[[path]].js";

async function redirectFor(path, query = "") {
  const url = `https://tripcompass.ai/go/${path}${query}`;
  return onRequest({
    request: new Request(url, {
      headers: {
        referer: "https://tripcompass.ai/",
        "user-agent": "TripCompass Phase 3 Check"
      }
    }),
    params: { path }
  });
}

function assertRedirect(response, expectedParts, expectedParams = {}) {
  assert.equal(response.status, 302);
  const location = response.headers.get("location");
  assert.ok(location, "Redirect response should include Location header");

  for (const part of expectedParts) {
    assert.match(location, part);
  }

  assert.doesNotMatch(location, /affiliate|affid|tag=|utm_/i);
  const redirectUrl = new URL(location);
  for (const [key, value] of Object.entries(expectedParams)) {
    assert.equal(redirectUrl.searchParams.get(key), value);
  }

  return location;
}

assertRedirect(
  await redirectFor("hotel", "?destination=fukuoka"),
  [/^https:\/\/www\.google\.com\/search\?/, /hotels/i, /fukuoka/i],
  { destination: "fukuoka" }
);
assertRedirect(
  await redirectFor("flight", "?from=seoul&to=fukuoka"),
  [/^https:\/\/www\.google\.com\/search\?/, /flights/i, /seoul/i, /fukuoka/i],
  { from: "seoul", to: "fukuoka" }
);
assertRedirect(
  await redirectFor("activity", "?destination=osaka"),
  [/^https:\/\/www\.google\.com\/search\?/, /activities/i, /osaka/i],
  { destination: "osaka" }
);
assertRedirect(
  await redirectFor("esim", "?country=japan"),
  [/^https:\/\/www\.google\.com\/search\?/, /esim/i, /japan/i],
  { country: "japan" }
);

assertRedirect(await redirectFor("hotel"), [/^https:\/\/www\.google\.com\/search\?/, /hotels/i, /travel/i]);
assertRedirect(await redirectFor("flight", "?from=&to="), [/^https:\/\/www\.google\.com\/search\?/, /flights/i, /seoul/i, /destination/i]);
assertRedirect(await redirectFor("unknown", "?destination=fukuoka"), [/^https:\/\/tripcompass\.ai\/$/]);

const schema = await readFile("db/schema.sql", "utf8");
for (const expected of [
  "CREATE TABLE IF NOT EXISTS clicks",
  "id",
  "type",
  "destination",
  "country",
  "from_city",
  "to_city",
  "language",
  "referrer",
  "user_agent",
  "created_at"
]) {
  assert.match(schema, new RegExp(`\\b${expected.replaceAll(" ", "\\s+")}\\b`, "i"));
}

assert.doesNotMatch(schema, /OPENAI|sk-[A-Za-z0-9_-]{20,}/);
