import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { onRequestPost as recommend } from "../functions/api/recommend.js";
import { onRequest as itinerary } from "../functions/api/itinerary.js";

const outDir = process.argv[2];
assert.ok(outDir, "Expected generated Hugo output directory argument");

const recommendPayload = {
  departureCity: "Seoul",
  tripLength: "4 days",
  budget: "Balanced",
  travelMonth: "October",
  travelStyle: ["food", "first-time"],
  travelers: "2 adults",
  preferredRegion: "Japan"
};

const recommendResponse = await recommend({
  request: new Request("https://tripcompass.ai/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(recommendPayload)
  })
});

assert.equal(recommendResponse.status, 200);
assert.match(recommendResponse.headers.get("content-type"), /application\/json/);

const recommendJson = await recommendResponse.json();
assert.equal(recommendJson.source, "mock");
assert.equal(recommendJson.input.departureCity, "Seoul");
assert.equal(recommendJson.recommendations.length, 3);

for (const item of recommendJson.recommendations) {
  assert.equal(typeof item.name, "string");
  assert.equal(typeof item.country, "string");
  assert.equal(typeof item.score, "number");
  assert.ok(item.score > 0 && item.score <= 100);
  assert.ok(Array.isArray(item.why));
  assert.ok(item.why.length > 0);
  assert.ok(Array.isArray(item.bestFor));
  assert.ok(Array.isArray(item.cautions));
  assert.equal(typeof item.estimatedBudgetLevel, "string");
  assert.equal(typeof item.suggestedTripLength, "string");
  assert.ok(item.ctaUrls.hotel.startsWith("/go/hotel?"));
  assert.ok(item.ctaUrls.flight.startsWith("/go/flight?"));
  assert.ok(item.ctaUrls.activity.startsWith("/go/activity?"));
  assert.ok(item.ctaUrls.esim.startsWith("/go/esim?"));
}

assert.match(recommendJson.disclaimer, /Always check current prices/i);

const itineraryResponse = await itinerary({
  request: new Request("https://tripcompass.ai/api/itinerary", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ destination: "Tokyo", tripLength: "3 days" })
  })
});

assert.equal(itineraryResponse.status, 200);
const itineraryJson = await itineraryResponse.json();
assert.equal(itineraryJson.source, "mock");
assert.equal(itineraryJson.destination, "Tokyo");
assert.equal(itineraryJson.days.length, 3);
for (const day of itineraryJson.days) {
  assert.equal(typeof day.day, "number");
  assert.equal(typeof day.title, "string");
  assert.ok(Array.isArray(day.stops));
  assert.ok(day.stops.length >= 3);
}
assert.match(itineraryJson.disclaimer, /verify prices/i);

const homepage = await readFile(join(outDir, "index.html"), "utf8");
assert.match(homepage, /js\/destination-finder\.js/);
assert.match(homepage, /data-dynamic-results/);
assert.match(homepage, /data-static-results/);
assert.match(homepage, /Fukuoka/);
assert.match(homepage, /Osaka/);
assert.match(homepage, /Tokyo/);
assert.match(homepage, /Da Nang/);

const appJs = await readFile(join(outDir, "js", "destination-finder.js"), "utf8");
assert.match(appJs, /\/api\/recommend/);
assert.match(appJs, /fetch/);
assert.match(appJs, /renderRecommendations/);
