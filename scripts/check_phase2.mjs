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
assert.match(homepage, /AI destination finder and trip planner/);
assert.match(homepage, /Start with the finder/);
assert.match(homepage, /Compare destinations/);
assert.match(homepage, />Finder</);
assert.match(homepage, />Planner</);
assert.match(homepage, />Compare</);
assert.match(homepage, />From Seoul</);
assert.match(homepage, />English</);
assert.match(homepage, />Korean</);
assert.match(homepage, /name="?language"? value="?en"?/);
assert.match(homepage, /Fukuoka/);
assert.match(homepage, /Osaka/);
assert.match(homepage, /Tokyo/);
assert.match(homepage, /Da Nang/);
assert.doesNotMatch(homepage, /MOCK API PREVIEW|Mock API preview|View sample matches|SAMPLE RECOMMENDATIONS|Sample recommendations|Mock result cards|These cards are static examples/i);

const koreanHome = await readFile(join(outDir, "ko", "index.html"), "utf8");
assert.match(koreanHome, /data-language="?ko"?/);
assert.match(koreanHome, /js\/destination-finder\.js/);
assert.match(koreanHome, /img\/tripcompass-hero\.png/);
assert.match(koreanHome, /AI 여행지 추천 및 여행 계획/);
assert.match(koreanHome, /TripCompass AI/);
assert.match(koreanHome, /어디로 갈지 고르고, 일정을 계획하고, 예약 전 비교하세요\./);
assert.match(koreanHome, /AI 추천 시작/);
assert.match(koreanHome, /여행지 비교/);
assert.match(koreanHome, /href=["']?#destination-finder/);
assert.match(koreanHome, /AI 여행지 추천/);
assert.match(koreanHome, /AI 추천 받기/);
assert.match(koreanHome, /출발지/);
assert.match(koreanHome, /여행 기간/);
assert.match(koreanHome, /여행 시기/);
assert.match(koreanHome, /예산 스타일/);
assert.match(koreanHome, /여행 인원/);
assert.match(koreanHome, /선호 지역/);
assert.match(koreanHome, /여행 스타일/);
assert.match(koreanHome, /name="?language"? value="?ko"?/);
assert.match(koreanHome, /data-dynamic-results/);
assert.match(koreanHome, /data-static-results/);
assert.match(koreanHome, /호텔 검색/);
assert.match(koreanHome, /항공권 검색/);
assert.match(koreanHome, /액티비티 찾기/);
assert.match(koreanHome, /eSIM 확인/);
assert.match(koreanHome, /예약 전/);
assert.match(koreanHome, /\/go\/hotel\?destination=fukuoka&amp;country=japan&amp;lang=ko/);
assert.match(koreanHome, />추천</);
assert.match(koreanHome, />일정</);
assert.match(koreanHome, />비교</);
assert.match(koreanHome, />한국 출발</);
assert.match(koreanHome, />English</);
assert.match(koreanHome, />한국어</);
assert.match(koreanHome, /여행 선택지를 좁힐 수 있도록 도와드립니다/);
assert.match(koreanHome, /예약 전 최신 가격, 영업시간, 비자 규정, 예약 가능 여부, 예약 조건을 반드시 확인하세요/);
assert.doesNotMatch(koreanHome, /한국어 섹션 준비|1단계 범위|영어를 기본 언어로 먼저 구축|이후 단계에서 확장/);

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
assert.match(appJs, /호텔 검색/);
assert.match(appJs, /항공권 검색/);
assert.match(appJs, /액티비티 찾기/);
assert.match(appJs, /eSIM 확인/);
assert.match(appJs, /AI 추천을 불러왔습니다/);
assert.doesNotMatch(appJs, /Finding mock matches|Mock API results|fallbackReason/);

const languageJs = await readFile(join(outDir, "js", "language.js"), "utf8");
assert.match(languageJs, /localStorage/);
assert.match(languageJs, /data-language-suggestion/);
assert.match(languageJs, /browserLanguage\.startsWith\("ko"\)/);

const oldMockCopyPattern =
  /MOCK API PREVIEW|Mock API preview|View sample matches|SAMPLE RECOMMENDATIONS|Sample recommendations|Mock result cards|These cards are static examples/i;
const seoPages = [
  {
    path: ["from-seoul", "japan-3-day-trips", "index.html"],
    url: "https://tripcompass.ai/from-seoul/japan-3-day-trips/",
    koreanUrl: "https://tripcompass.ai/ko/from-seoul/japan-3-day-trips/",
    title: /Best Japan 3 Day Trips From Seoul/,
    links: [
      /\/compare\/fukuoka-vs-osaka\//,
      /\/compare\/tokyo-vs-osaka\//,
      /\/from-seoul\/japan-travel-budget\//,
      /\/best-short-trips-from-korea\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=fukuoka&amp;country=japan&amp;lang=en/,
      /\/go\/flight\?from=seoul&amp;to=fukuoka&amp;country=japan&amp;lang=en/
    ]
  },
  {
    path: ["compare", "fukuoka-vs-osaka", "index.html"],
    url: "https://tripcompass.ai/compare/fukuoka-vs-osaka/",
    koreanUrl: "https://tripcompass.ai/ko/compare/fukuoka-vs-osaka/",
    title: /Fukuoka vs Osaka: Which Is Better for a Short Food Trip\?/,
    links: [
      /\/from-seoul\/japan-3-day-trips\//,
      /\/from-seoul\/japan-travel-budget\//,
      /\/compare\/tokyo-vs-osaka\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=fukuoka&amp;country=japan&amp;lang=en/,
      /\/go\/activity\?destination=osaka&amp;country=japan&amp;lang=en/
    ]
  },
  {
    path: ["compare", "tokyo-vs-osaka", "index.html"],
    url: "https://tripcompass.ai/compare/tokyo-vs-osaka/",
    koreanUrl: "https://tripcompass.ai/ko/compare/tokyo-vs-osaka/",
    title: /Tokyo vs Osaka: Which Is Better for First-Time Travelers\?/,
    links: [
      /\/from-seoul\/japan-3-day-trips\//,
      /\/from-seoul\/japan-travel-budget\//,
      /\/compare\/fukuoka-vs-osaka\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=tokyo&amp;country=japan&amp;lang=en/,
      /\/go\/flight\?from=seoul&amp;to=osaka&amp;country=japan&amp;lang=en/
    ]
  },
  {
    path: ["best-short-trips-from-korea", "index.html"],
    url: "https://tripcompass.ai/best-short-trips-from-korea/",
    koreanUrl: "https://tripcompass.ai/ko/best-short-trips-from-korea/",
    title: /Best Short Trips From Korea/,
    links: [
      /\/#destination-finder/,
      /\/from-seoul\/japan-3-day-trips\//,
      /\/compare\/tokyo-vs-osaka\//,
      /\/compare\/fukuoka-vs-osaka\//,
      /\/from-seoul\/japan-travel-budget\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=da-nang&amp;country=vietnam&amp;lang=en/,
      /\/go\/esim\?country=japan&amp;lang=en/
    ]
  },
  {
    path: ["from-seoul", "japan-travel-budget", "index.html"],
    url: "https://tripcompass.ai/from-seoul/japan-travel-budget/",
    koreanUrl: "https://tripcompass.ai/ko/from-seoul/japan-travel-budget/",
    title: /Japan Travel Budget From Seoul/,
    links: [
      /\/#destination-finder/,
      /\/from-seoul\/japan-3-day-trips\//,
      /\/compare\/tokyo-vs-osaka\//,
      /\/compare\/fukuoka-vs-osaka\//
    ],
    goLinks: [
      /\/go\/flight\?from=seoul&amp;to=fukuoka&amp;country=japan&amp;lang=en/,
      /\/go\/hotel\?destination=osaka&amp;country=japan&amp;lang=en/
    ]
  }
];

for (const page of seoPages) {
  const html = await readFile(join(outDir, ...page.path), "utf8");
  assert.match(html, page.title);
  assert.match(html, /Who this page is for/);
  assert.match(html, /Best-fit travelers/);
  assert.match(html, /Suggested trip length/);
  assert.match(html, /Budget considerations/);
  assert.match(html, /Cautions/);
  assert.match(html, /Next-step CTA links/);
  assert.match(html, /Always check current prices, opening hours, visa rules, availability, and booking terms before booking/);
  assert.doesNotMatch(html, oldMockCopyPattern);
  assert.doesNotMatch(html, /real-time lowest prices|guaranteed availability|confirmed visa rules|guaranteed booking/i);
  for (const link of page.links) {
    assert.match(html, link);
  }
  for (const link of page.goLinks) {
    assert.match(html, link);
  }
}

const oldKoreanPrepPattern = /한국어 섹션 준비|1단계 범위|영어를 기본 언어로 먼저 구축|이후 단계에서 확장/;
const koreanSeoPages = [
  {
    path: ["ko", "from-seoul", "japan-3-day-trips", "index.html"],
    url: "https://tripcompass.ai/ko/from-seoul/japan-3-day-trips/",
    englishUrl: "https://tripcompass.ai/from-seoul/japan-3-day-trips/",
    title: /서울 출발 일본 3일 여행지 추천/,
    links: [
      /\/ko\/#destination-finder/,
      /\/ko\/compare\/fukuoka-vs-osaka\//,
      /\/ko\/compare\/tokyo-vs-osaka\//,
      /\/ko\/from-seoul\/japan-travel-budget\//,
      /\/ko\/best-short-trips-from-korea\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=fukuoka&amp;country=japan&amp;lang=ko/,
      /\/go\/flight\?from=seoul&amp;to=fukuoka&amp;country=japan&amp;lang=ko/
    ]
  },
  {
    path: ["ko", "compare", "fukuoka-vs-osaka", "index.html"],
    url: "https://tripcompass.ai/ko/compare/fukuoka-vs-osaka/",
    englishUrl: "https://tripcompass.ai/compare/fukuoka-vs-osaka/",
    title: /후쿠오카 vs 오사카/,
    links: [
      /\/ko\/from-seoul\/japan-3-day-trips\//,
      /\/ko\/from-seoul\/japan-travel-budget\//,
      /\/ko\/compare\/tokyo-vs-osaka\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=fukuoka&amp;country=japan&amp;lang=ko/,
      /\/go\/activity\?destination=osaka&amp;country=japan&amp;lang=ko/
    ]
  },
  {
    path: ["ko", "compare", "tokyo-vs-osaka", "index.html"],
    url: "https://tripcompass.ai/ko/compare/tokyo-vs-osaka/",
    englishUrl: "https://tripcompass.ai/compare/tokyo-vs-osaka/",
    title: /도쿄 vs 오사카/,
    links: [
      /\/ko\/from-seoul\/japan-3-day-trips\//,
      /\/ko\/from-seoul\/japan-travel-budget\//,
      /\/ko\/compare\/fukuoka-vs-osaka\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=tokyo&amp;country=japan&amp;lang=ko/,
      /\/go\/flight\?from=seoul&amp;to=osaka&amp;country=japan&amp;lang=ko/
    ]
  },
  {
    path: ["ko", "best-short-trips-from-korea", "index.html"],
    url: "https://tripcompass.ai/ko/best-short-trips-from-korea/",
    englishUrl: "https://tripcompass.ai/best-short-trips-from-korea/",
    title: /한국에서 가기 좋은 짧은 해외여행/,
    links: [
      /\/ko\/#destination-finder/,
      /\/ko\/from-seoul\/japan-3-day-trips\//,
      /\/ko\/compare\/tokyo-vs-osaka\//,
      /\/ko\/compare\/fukuoka-vs-osaka\//,
      /\/ko\/from-seoul\/japan-travel-budget\//
    ],
    goLinks: [
      /\/go\/hotel\?destination=da-nang&amp;country=vietnam&amp;lang=ko/,
      /\/go\/esim\?country=japan&amp;lang=ko/
    ]
  },
  {
    path: ["ko", "from-seoul", "japan-travel-budget", "index.html"],
    url: "https://tripcompass.ai/ko/from-seoul/japan-travel-budget/",
    englishUrl: "https://tripcompass.ai/from-seoul/japan-travel-budget/",
    title: /서울 출발 일본 여행 예산/,
    links: [
      /\/ko\/#destination-finder/,
      /\/ko\/from-seoul\/japan-3-day-trips\//,
      /\/ko\/compare\/tokyo-vs-osaka\//,
      /\/ko\/compare\/fukuoka-vs-osaka\//
    ],
    goLinks: [
      /\/go\/flight\?from=seoul&amp;to=fukuoka&amp;country=japan&amp;lang=ko/,
      /\/go\/hotel\?destination=osaka&amp;country=japan&amp;lang=ko/
    ]
  }
];

for (const page of koreanSeoPages) {
  const html = await readFile(join(outDir, ...page.path), "utf8");
  assert.match(html, page.title);
  assert.match(html, /lang="?ko"?/);
  assert.match(html, /이런 사람에게 추천/);
  assert.match(html, /추천 여행 기간/);
  assert.match(html, /예산 고려사항/);
  assert.match(html, /주의할 점/);
  assert.match(html, /다음 단계 CTA/);
  assert.match(html, /예약 전 최신 가격, 영업시간, 비자 규정, 예약 가능 여부, 예약 조건을 반드시 확인하세요/);
  assert.doesNotMatch(html, oldKoreanPrepPattern);
  assert.doesNotMatch(html, /실시간 최저가|예약 가능을 보장|비자 규정을 보장|예약을 보장/);
  for (const link of page.links) {
    assert.match(html, link);
  }
  for (const link of page.goLinks) {
    assert.match(html, link);
  }
}

const koreanFromSeoulIndex = await readFile(join(outDir, "ko", "from-seoul", "index.html"), "utf8");
assert.match(koreanFromSeoulIndex, /서울 출발 여행/);
assert.match(koreanFromSeoulIndex, /\/ko\/from-seoul\/japan-3-day-trips\//);
assert.match(koreanFromSeoulIndex, /\/ko\/from-seoul\/japan-travel-budget\//);
assert.doesNotMatch(koreanFromSeoulIndex, oldKoreanPrepPattern);

const koreanCompareIndex = await readFile(join(outDir, "ko", "compare", "index.html"), "utf8");
assert.match(koreanCompareIndex, /여행지 비교/);
assert.match(koreanCompareIndex, /\/ko\/compare\/fukuoka-vs-osaka\//);
assert.match(koreanCompareIndex, /\/ko\/compare\/tokyo-vs-osaka\//);
assert.doesNotMatch(koreanCompareIndex, oldKoreanPrepPattern);

for (const englishPage of seoPages) {
  const html = await readFile(join(outDir, ...englishPage.path), "utf8");
  assert.match(html, englishPage.title);
}

const sitemap = await readFile(join(outDir, "sitemap.xml"), "utf8");
for (const page of seoPages) {
  assert.match(sitemap, new RegExp(`<loc>${page.url}</loc>`));
}
for (const page of koreanSeoPages) {
  assert.match(sitemap, new RegExp(`<loc>${page.url}</loc>`));
}

const robots = await readFile(join(outDir, "robots.txt"), "utf8");
assert.match(robots, /User-agent:\s*\*/);
assert.match(robots, /Allow:\s*\//);
assert.doesNotMatch(robots, /Disallow:\s*\/(?:ko|compare|from-seoul|best-short-trips-from-korea)/i);
assert.match(robots, /Sitemap:\s*https:\/\/tripcompass\.ai\/sitemap\.xml/);

function getSingleMatch(html, pattern, label) {
  const match = html.match(pattern);
  assert.ok(match, `Missing ${label}`);
  return match[1];
}

function assertHeadSeo(html, { canonical, alternateEn, alternateKo, lang, titlePattern, descriptionPattern }) {
  assert.match(html, new RegExp(`<html lang=${lang}\\b`));
  assert.match(html, titlePattern);
  assert.match(html, descriptionPattern);
  assert.match(html, new RegExp(`<link rel=canonical href=${canonical.replaceAll("/", "\\/")}>`));
  assert.match(html, new RegExp(`<link rel=alternate hreflang=en href=${alternateEn.replaceAll("/", "\\/")}>`));
  assert.match(html, new RegExp(`<link rel=alternate hreflang=ko href=${alternateKo.replaceAll("/", "\\/")}>`));
  assert.match(html, /<link rel=alternate hreflang=x-default href=https:\/\/tripcompass\.ai\/>/);
}

assertHeadSeo(homepage, {
  canonical: "https://tripcompass.ai/",
  alternateEn: "https://tripcompass.ai/",
  alternateKo: "https://tripcompass.ai/ko/",
  lang: "en",
  titlePattern: /<title>TripCompass AI \| Find where to go, plan what to do, compare what to book\.<\/title>/,
  descriptionPattern: /<meta name=description content="Find where to go, plan what to do, compare what to book with TripCompass AI\.">/
});

assertHeadSeo(koreanHome, {
  canonical: "https://tripcompass.ai/ko/",
  alternateEn: "https://tripcompass.ai/",
  alternateKo: "https://tripcompass.ai/ko/",
  lang: "ko",
  titlePattern: /<title>TripCompass AI 한국어 \| TripCompass AI<\/title>/,
  descriptionPattern: /<meta name=description content="한국에서 출발하는 짧은 해외여행을 AI 추천으로 비교하세요\.">/
});

for (const page of seoPages) {
  const html = await readFile(join(outDir, ...page.path), "utf8");
  assertHeadSeo(html, {
    canonical: page.url,
    alternateEn: page.url,
    alternateKo: page.koreanUrl,
    lang: "en",
    titlePattern: page.title,
    descriptionPattern: /<meta name=description content="[^"]{40,}">/
  });
}

for (const page of koreanSeoPages) {
  const html = await readFile(join(outDir, ...page.path), "utf8");
  assertHeadSeo(html, {
    canonical: page.url,
    alternateEn: page.englishUrl,
    alternateKo: page.url,
    lang: "ko",
    titlePattern: page.title,
    descriptionPattern: /<meta name=description content="[^"]{20,}">/
  });
}

const seoMetaPages = [
  { html: homepage, url: "https://tripcompass.ai/" },
  { html: koreanHome, url: "https://tripcompass.ai/ko/" },
  ...seoPages.map((page) => ({
    html: null,
    url: page.url,
    path: page.path
  })),
  ...koreanSeoPages.map((page) => ({
    html: null,
    url: page.url,
    path: page.path
  }))
];

const seenTitles = new Map();
const seenDescriptions = new Map();
for (const page of seoMetaPages) {
  const html = page.html ?? (await readFile(join(outDir, ...page.path), "utf8"));
  const title = getSingleMatch(html, /<title>([^<]+)<\/title>/, `${page.url} title`);
  const description = getSingleMatch(html, /<meta name=description content="([^"]+)">/, `${page.url} description`);
  assert.ok(!seenTitles.has(title), `Duplicate title: ${title}`);
  assert.ok(!seenDescriptions.has(description), `Duplicate meta description: ${description}`);
  seenTitles.set(title, page.url);
  seenDescriptions.set(description, page.url);
}

for (const expectedLink of [
  /\/compare\/tokyo-vs-osaka\//,
  /\/compare\/fukuoka-vs-osaka\//,
  /\/from-seoul\/japan-3-day-trips\//,
  /\/from-seoul\/japan-travel-budget\//,
  /\/best-short-trips-from-korea\//
]) {
  assert.match(homepage, expectedLink);
}

for (const expectedLink of [
  /\/ko\/compare\/tokyo-vs-osaka\//,
  /\/ko\/compare\/fukuoka-vs-osaka\//,
  /\/ko\/from-seoul\/japan-3-day-trips\//,
  /\/ko\/from-seoul\/japan-travel-budget\//,
  /\/ko\/best-short-trips-from-korea\//
]) {
  assert.match(koreanHome, expectedLink);
}
