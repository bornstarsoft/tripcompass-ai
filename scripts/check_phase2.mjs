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
  preferredRegion: "Japan",
  language: "en"
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
assert.equal(recommendJson.input.language, "en");
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
  assert.match(item.ctaUrls.hotel, /country=/);
  assert.match(item.ctaUrls.hotel, /lang=en/);
  assert.match(item.ctaUrls.flight, /lang=en/);
}

assert.match(recommendJson.disclaimer, /Always check current prices/i);

const defaultLanguageResponse = await recommend({
  request: new Request("https://tripcompass.ai/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...recommendPayload, language: undefined })
  })
});
assert.equal(defaultLanguageResponse.status, 200);
const defaultLanguageJson = await defaultLanguageResponse.json();
assert.equal(defaultLanguageJson.input.language, "en");
assert.equal(defaultLanguageJson.recommendations[0].name, "Fukuoka");

const koreanResponse = await recommend({
  request: new Request("https://tripcompass.ai/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...recommendPayload, language: "ko" })
  })
});
assert.equal(koreanResponse.status, 200);
const koreanJson = await koreanResponse.json();
assert.equal(koreanJson.input.language, "ko");
assert.equal(koreanJson.recommendations.length, 3);
assert.equal(koreanJson.recommendations[0].name, "후쿠오카");
assert.equal(koreanJson.recommendations[0].country, "일본");
assert.match(koreanJson.recommendations[0].why.join(" "), /짧은|음식|일본/);
assert.match(koreanJson.disclaimer, /예약 전/);
assert.match(koreanJson.recommendations[0].ctaUrls.hotel, /destination=fukuoka/);
assert.match(koreanJson.recommendations[0].ctaUrls.hotel, /country=japan/);
assert.match(koreanJson.recommendations[0].ctaUrls.hotel, /lang=ko/);

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
assert.match(homepage, /js\/language\.js/);
assert.match(homepage, /data-language="?en"?/);
assert.match(homepage, /data-dynamic-results/);
assert.match(homepage, /data-static-results/);
assert.match(homepage, /Live AI planning assistant/);
assert.match(homepage, /Get AI recommendations/);
assert.match(homepage, /AI recommendation results/);
assert.match(homepage, /Destination matches for short trips from Korea/);
assert.match(homepage, /name="?language"? value="?en"?/);
assert.match(homepage, /Fukuoka/);
assert.match(homepage, /Osaka/);
assert.match(homepage, /Tokyo/);
assert.match(homepage, /Da Nang/);
assert.doesNotMatch(homepage, /MOCK API PREVIEW|Mock API preview|View sample matches|SAMPLE RECOMMENDATIONS|Sample recommendations|Mock result cards|These cards are static examples/i);

const appJs = await readFile(join(outDir, "js", "destination-finder.js"), "utf8");
assert.match(appJs, /\/api\/recommend/);
assert.match(appJs, /fetch/);
assert.match(appJs, /renderRecommendations/);
assert.match(appJs, /currentLanguage/);
assert.match(appJs, /language:/);
assert.match(appJs, /Get AI recommendations/);
assert.match(appJs, /Asking TripCompass AI for destination matches/);
assert.match(appJs, /AI recommendations are ready/);
assert.match(appJs, /could not refresh AI recommendations/);
assert.doesNotMatch(appJs, /Finding mock matches|Mock API results|fallbackReason/);

const languageJs = await readFile(join(outDir, "js", "language.js"), "utf8");
assert.match(languageJs, /localStorage/);
assert.match(languageJs, /data-language-suggestion/);
assert.match(languageJs, /browserLanguage\.startsWith\("ko"\)/);
