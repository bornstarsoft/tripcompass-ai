import assert from "node:assert/strict";
import { onRequestPost as recommend } from "../functions/api/recommend.js";

const basePayload = {
  departureCity: "Seoul",
  tripLength: "4 days",
  budget: "Balanced",
  travelMonth: "October",
  travelStyle: ["Food", "First-time friendly"],
  travelers: "2 adults",
  preferredRegion: "Japan",
  language: "en"
};

function recommendationSet(language = "en") {
  if (language === "ko") {
    return [
      {
        name: "후쿠오카",
        slug: "fukuoka",
        country: "일본",
        countrySlug: "japan",
        score: 94,
        why: ["짧은 일정에 동선이 단순합니다.", "음식 여행 만족도가 높습니다."],
        bestFor: ["음식 여행", "첫 일본 여행"],
        cautions: ["인기 식당은 대기가 있을 수 있습니다."],
        estimatedBudgetLevel: "균형형",
        suggestedTripLength: "3일"
      },
      {
        name: "오사카",
        slug: "osaka",
        country: "일본",
        countrySlug: "japan",
        score: 90,
        why: ["음식과 쇼핑, 근교 일정이 잘 맞습니다."],
        bestFor: ["친구 여행", "간사이 일정"],
        cautions: ["주요 지역은 붐빌 수 있습니다."],
        estimatedBudgetLevel: "균형형",
        suggestedTripLength: "4일"
      },
      {
        name: "도쿄",
        slug: "tokyo",
        country: "일본",
        countrySlug: "japan",
        score: 87,
        why: ["선택지가 넓고 첫 여행에 좋습니다."],
        bestFor: ["쇼핑", "대중문화"],
        cautions: ["동선을 지역별로 묶어야 합니다."],
        estimatedBudgetLevel: "편안함 우선",
        suggestedTripLength: "3~5일"
      }
    ];
  }

  return [
    {
      name: "Fukuoka",
      slug: "fukuoka",
      country: "Japan",
      countrySlug: "japan",
      score: 94,
      why: ["Compact layout keeps a short trip relaxed.", "Food options are strong."],
      bestFor: ["Food", "First Japan trips"],
      cautions: ["Popular restaurants may need reservations."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "3 days"
    },
    {
      name: "Osaka",
      slug: "osaka",
      country: "Japan",
      countrySlug: "japan",
      score: 90,
      why: ["Food, shopping, and day trips fit well."],
      bestFor: ["Groups", "Kansai day trips"],
      cautions: ["Major areas can feel crowded."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "4 days"
    },
    {
      name: "Tokyo",
      slug: "tokyo",
      country: "Japan",
      countrySlug: "japan",
      score: 87,
      why: ["It has the widest range of neighborhoods and dining."],
      bestFor: ["First-time travelers", "Shopping"],
      cautions: ["Plan by area to avoid backtracking."],
      estimatedBudgetLevel: "Comfort first",
      suggestedTripLength: "3 to 5 days"
    }
  ];
}

function responseJson(recommendations) {
  return {
    output_text: JSON.stringify({ recommendations })
  };
}

function createFetchMock(responseFactory) {
  const calls = [];
  const fetchMock = async (url, init = {}) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const result = responseFactory(calls.at(-1));

    if (result instanceof Error) {
      throw result;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  fetchMock.calls = calls;
  return fetchMock;
}

async function postRecommend(payload, options = {}) {
  return recommend({
    request: new Request("https://tripcompass.ai/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }),
    env: options.env,
    fetch: options.fetch
  });
}

function assertRecommendationShape(item, language) {
  assert.equal(typeof item.name, "string");
  assert.equal(typeof item.slug, "string");
  assert.equal(typeof item.country, "string");
  assert.equal(typeof item.countrySlug, "string");
  assert.equal(typeof item.score, "number");
  assert.ok(item.score > 0 && item.score <= 100);
  assert.ok(Array.isArray(item.why));
  assert.ok(Array.isArray(item.bestFor));
  assert.ok(Array.isArray(item.cautions));
  assert.match(item.ctaUrls.hotel, new RegExp(`destination=${item.slug}`));
  assert.match(item.ctaUrls.hotel, new RegExp(`country=${item.countrySlug}`));
  assert.match(item.ctaUrls.hotel, new RegExp(`lang=${language}`));
  assert.match(item.ctaUrls.flight, new RegExp(`lang=${language}`));
  assert.match(item.ctaUrls.esim, new RegExp(`country=${item.countrySlug}`));
}

const noKeyFetch = createFetchMock(() => new Error("should not call OpenAI without a key"));
const noKeyResponse = await postRecommend(basePayload, { env: {}, fetch: noKeyFetch });
assert.equal(noKeyResponse.status, 200);
const noKeyJson = await noKeyResponse.json();
assert.equal(noKeyJson.source, "mock");
assert.equal(noKeyJson.input.language, "en");
assert.equal(noKeyFetch.calls.length, 0);
assert.equal(noKeyJson.recommendations[0].slug, "fukuoka");
assert.equal(noKeyJson.recommendations[0].countrySlug, "japan");

const englishFetch = createFetchMock((call) => {
  assert.equal(call.url, "https://api.openai.com/v1/responses");
  assert.equal(call.init.headers.Authorization, "Bearer test-openai-key");
  assert.doesNotMatch(call.init.body, /test-openai-key/);
  assert.equal(call.body.model, "gpt-5.4-mini");
  assert.equal(call.body.text.format.type, "json_schema");
  assert.match(JSON.stringify(call.body.input), /English/);
  assert.doesNotMatch(JSON.stringify(call.body.input), /translate/i);
  return responseJson(recommendationSet("en"));
});

const englishResponse = await postRecommend(basePayload, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: englishFetch
});
assert.equal(englishResponse.status, 200);
const englishJson = await englishResponse.json();
assert.equal(englishJson.source, "openai");
assert.equal(englishJson.input.language, "en");
assert.equal(englishJson.recommendations.length, 3);
assert.match(englishJson.disclaimer, /Always check current prices/i);
for (const item of englishJson.recommendations) {
  assertRecommendationShape(item, "en");
}

const overrideModelFetch = createFetchMock((call) => {
  assert.equal(call.body.model, "gpt-5.4");
  return responseJson(recommendationSet("en"));
});
const overrideModelResponse = await postRecommend(basePayload, {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-5.4"
  },
  fetch: overrideModelFetch
});
const overrideModelJson = await overrideModelResponse.json();
assert.equal(overrideModelJson.source, "openai");
assert.equal(overrideModelFetch.calls.length, 1);

const koreanFetch = createFetchMock((call) => {
  assert.match(JSON.stringify(call.body.input), /Korean/);
  assert.doesNotMatch(JSON.stringify(call.body.input), /translate/i);
  return responseJson(recommendationSet("ko"));
});

const koreanResponse = await postRecommend({ ...basePayload, language: "ko" }, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: koreanFetch
});
assert.equal(koreanResponse.status, 200);
const koreanJson = await koreanResponse.json();
assert.equal(koreanJson.source, "openai");
assert.equal(koreanJson.input.language, "ko");
assert.equal(koreanJson.recommendations[0].name, "후쿠오카");
assert.equal(koreanJson.recommendations[0].slug, "fukuoka");
assert.equal(koreanJson.recommendations[0].countrySlug, "japan");
assert.match(koreanJson.recommendations[0].ctaUrls.hotel, /destination=fukuoka/);
assert.match(koreanJson.recommendations[0].ctaUrls.hotel, /country=japan/);
assert.match(koreanJson.recommendations[0].ctaUrls.hotel, /lang=ko/);
assert.match(koreanJson.disclaimer, /예약 전/);

const unsupportedLanguageFetch = createFetchMock(() => responseJson(recommendationSet("en")));
const unsupportedLanguageResponse = await postRecommend({ ...basePayload, language: "ja" }, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: unsupportedLanguageFetch
});
const unsupportedLanguageJson = await unsupportedLanguageResponse.json();
assert.equal(unsupportedLanguageJson.source, "openai");
assert.equal(unsupportedLanguageJson.input.language, "en");
assert.match(unsupportedLanguageJson.recommendations[0].ctaUrls.hotel, /lang=en/);

const failedFetch = createFetchMock(() => new Error("network failed"));
const failedResponse = await postRecommend({ ...basePayload, language: "ko" }, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: failedFetch
});
const failedJson = await failedResponse.json();
assert.equal(failedJson.source, "mock");
assert.equal(failedJson.input.language, "ko");
assert.equal(failedJson.recommendations[0].name, "후쿠오카");

const invalidJsonFetch = createFetchMock(() => ({ output_text: "{not json" }));
const invalidJsonResponse = await postRecommend(basePayload, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: invalidJsonFetch
});
const invalidJson = await invalidJsonResponse.json();
assert.equal(invalidJson.source, "mock");

const invalidValidationFetch = createFetchMock(() => responseJson([
  {
    name: "Fukuoka",
    country: "Japan",
    score: 94,
    why: ["Missing slug and countrySlug"],
    bestFor: ["Food"],
    cautions: ["Check details."],
    estimatedBudgetLevel: "Balanced",
    suggestedTripLength: "3 days"
  }
]));
const invalidValidationResponse = await postRecommend(basePayload, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: invalidValidationFetch
});
const invalidValidationJson = await invalidValidationResponse.json();
assert.equal(invalidValidationJson.source, "mock");

assert.equal(englishFetch.calls.length, 1);
assert.equal(koreanFetch.calls.length, 1);
assert.equal(failedFetch.calls.length, 1);
