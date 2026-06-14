import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

    if (result instanceof Response) {
      return result;
    }

    const status = typeof result?.status === "number" ? result.status : 200;
    const body = Object.prototype.hasOwnProperty.call(result || {}, "body") ? result.body : result;

    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    });
  };

  fetchMock.calls = calls;
  return fetchMock;
}

function createCacheMock(options = {}) {
  const getCalls = [];
  const putCalls = [];
  const store = new Map(Object.entries(options.initial || {}));

  return {
    getCalls,
    putCalls,
    async get(key, type) {
      getCalls.push({ key, type });

      if (options.throwOnGet) {
        throw new Error("cache get failed");
      }

      if (!store.has(key)) {
        return null;
      }

      const value = store.get(key);
      return type === "json" && typeof value === "string" ? JSON.parse(value) : value;
    },
    async put(key, value, putOptions) {
      putCalls.push({ key, value, options: putOptions });

      if (options.throwOnPut) {
        throw new Error("cache put failed");
      }

      store.set(key, value);
    }
  };
}

async function postRecommend(payload, options = {}) {
  const request = new Request("https://tripcompass.ai/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (options.cf) {
    Object.defineProperty(request, "cf", {
      value: options.cf
    });
  }

  return recommend({
    request,
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
assert.equal(noKeyJson.fallbackReason, "missing_openai_key");
assert.equal(noKeyJson.input.language, "en");
assert.equal(noKeyFetch.calls.length, 0);
assert.equal(noKeyJson.recommendations[0].slug, "fukuoka");
assert.equal(noKeyJson.recommendations[0].countrySlug, "japan");

const tooLongFetch = createFetchMock(() => new Error("should not call OpenAI for invalid input"));
const tooLongCache = createCacheMock();
const tooLongResponse = await postRecommend(
  {
    ...basePayload,
    departureCity: "Seoul".repeat(300),
    travelStyle: ["Food", "x".repeat(300)]
  },
  {
    env: {
      OPENAI_API_KEY: "test-openai-key",
      CACHE: tooLongCache
    },
    fetch: tooLongFetch
  }
);
assert.equal(tooLongResponse.status, 200);
const tooLongJson = await tooLongResponse.json();
assert.equal(tooLongJson.source, "mock");
assert.equal(tooLongJson.fallbackReason, "input_validation_failed");
assert.equal(tooLongFetch.calls.length, 0);
assert.equal(tooLongCache.getCalls.length, 0);

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

const cachedRecommendations = recommendationSet("ko").map((item) => ({
  ...item,
  ctaUrls: {
    hotel: `/go/hotel?destination=${item.slug}&country=${item.countrySlug}&lang=ko`,
    flight: `/go/flight?from=seoul&to=${item.slug}&country=${item.countrySlug}&lang=ko`,
    activity: `/go/activity?destination=${item.slug}&country=${item.countrySlug}&lang=ko`,
    esim: `/go/esim?country=${item.countrySlug}&lang=ko`
  }
}));
const cacheHitFetch = createFetchMock(() => new Error("should not call OpenAI on cache hit"));
const cacheHitKey =
  "recommend:v1:language=ko:departureCity=Seoul:tripLength=4%20days:budget=Balanced:travelMonth=October:travelStyle=First-time%20friendly%2CFood:travelers=2%20adults:preferredRegion=Japan";
const cacheHitCache = createCacheMock({
  initial: {
    [cacheHitKey]: JSON.stringify({ recommendations: cachedRecommendations })
  }
});
const cacheHitResponse = await postRecommend({ ...basePayload, language: "ko", travelStyle: [" Food ", "First-time friendly"] }, {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    CACHE: cacheHitCache
  },
  fetch: cacheHitFetch
});
const cacheHitJson = await cacheHitResponse.json();
assert.equal(cacheHitJson.source, "cache");
assert.equal(cacheHitJson.input.language, "ko");
assert.equal(cacheHitFetch.calls.length, 0);
assert.equal(cacheHitCache.getCalls.length, 1);
assert.equal(cacheHitCache.putCalls.length, 0);
assert.equal(cacheHitCache.getCalls[0].type, "json");
assert.equal(cacheHitCache.getCalls[0].key, cacheHitKey);
for (const expectedPart of [
  "language=ko",
  "departureCity=Seoul",
  "tripLength=4%20days",
  "budget=Balanced",
  "travelMonth=October",
  "travelStyle=First-time%20friendly%2CFood",
  "travelers=2%20adults",
  "preferredRegion=Japan"
]) {
  assert.match(cacheHitCache.getCalls[0].key, new RegExp(expectedPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const cacheMissFetch = createFetchMock(() => responseJson(recommendationSet("en")));
const cacheMissCache = createCacheMock();
const cacheMissResponse = await postRecommend(basePayload, {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    CACHE: cacheMissCache
  },
  fetch: cacheMissFetch
});
const cacheMissJson = await cacheMissResponse.json();
assert.equal(cacheMissJson.source, "openai");
assert.equal(cacheMissFetch.calls.length, 1);
assert.equal(cacheMissCache.getCalls.length, 1);
assert.equal(cacheMissCache.putCalls.length, 1);
assert.equal(cacheMissCache.putCalls[0].key, cacheMissCache.getCalls[0].key);
assert.equal(cacheMissCache.putCalls[0].options.expirationTtl, 604800);
assert.match(cacheMissCache.putCalls[0].key, /language=en/);
const cachedPayload = JSON.parse(cacheMissCache.putCalls[0].value);
assert.equal(cachedPayload.recommendations.length, 3);
assert.equal(cachedPayload.recommendations[0].slug, "fukuoka");

const backendSecretValue = "opaque-test-token";
const backendSuccessFetch = createFetchMock((call) => {
  assert.equal(call.url, "https://ai-backend.example/recommend");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers["content-type"], "application/json");
  assert.equal(call.init.headers.Authorization, undefined);
  assert.equal(call.init.headers["X-TripCompass-Backend-Secret"], backendSecretValue);
  assert.equal(call.body.language, "ko");
  assert.equal(call.body.departureCity, "Seoul");
  assert.deepEqual(call.body.travelStyle, ["First-time friendly", "Food"]);
  assert.doesNotMatch(call.init.body, /test-openai-key|opaque-test-token|api\.openai\.com|gpt-5\.4-mini/);
  return { recommendations: recommendationSet("ko") };
});
const backendSuccessCache = createCacheMock();
const backendSuccessResponse = await postRecommend({ ...basePayload, language: "ko" }, {
  env: {
    AI_BACKEND_URL: "https://ai-backend.example/recommend",
    DIRECT_OPENAI_IN_PRODUCTION: "true",
    CF_PAGES_BRANCH: "main",
    OPENAI_API_KEY: "test-openai-key",
    AI_BACKEND_SECRET: backendSecretValue,
    CACHE: backendSuccessCache
  },
  fetch: backendSuccessFetch
});
const backendSuccessJson = await backendSuccessResponse.json();
assert.equal(backendSuccessJson.source, "backend");
assert.equal(backendSuccessJson.input.language, "ko");
assert.equal(backendSuccessJson.recommendations[0].name, "후쿠오카");
assert.match(backendSuccessJson.recommendations[0].ctaUrls.hotel, /lang=ko/);
assert.equal(backendSuccessFetch.calls.length, 1);
assert.equal(backendSuccessCache.getCalls.length, 1);
assert.equal(backendSuccessCache.putCalls.length, 1);

const backendFailureFetch = createFetchMock((call) => {
  assert.equal(call.url, "https://ai-backend.example/recommend");
  assert.equal(call.init.headers["X-TripCompass-Backend-Secret"], undefined);
  return new Error("backend unavailable");
});
const backendFailureResponse = await postRecommend(basePayload, {
  env: {
    AI_BACKEND_URL: "https://ai-backend.example/recommend",
    OPENAI_API_KEY: "test-openai-key"
  },
  fetch: backendFailureFetch
});
const backendFailureJson = await backendFailureResponse.json();
assert.equal(backendFailureJson.source, "mock");
assert.equal(backendFailureJson.fallbackReason, "ai_backend_fetch_failed");
assert.equal(backendFailureFetch.calls.length, 1);
assert.equal(backendFailureJson.recommendations[0].slug, "fukuoka");

async function assertBackendHttpFallback(status, fallbackReason) {
  const backendHttpFetch = createFetchMock((call) => {
    assert.equal(call.url, "https://ai-backend.example/recommend");
    assert.equal(call.init.headers["X-TripCompass-Backend-Secret"], backendSecretValue);
    return {
      status,
      body: {
        error: "do-not-expose-backend-body",
        secret: backendSecretValue
      }
    };
  });
  const backendHttpResponse = await postRecommend(basePayload, {
    env: {
      AI_BACKEND_URL: "https://ai-backend.example/recommend",
      AI_BACKEND_SECRET: backendSecretValue,
      OPENAI_API_KEY: "test-openai-key"
    },
    fetch: backendHttpFetch
  });
  const backendHttpJson = await backendHttpResponse.json();
  const backendHttpText = JSON.stringify(backendHttpJson);

  assert.equal(backendHttpJson.source, "mock");
  assert.equal(backendHttpJson.fallbackReason, fallbackReason);
  assert.equal(backendHttpFetch.calls.length, 1);
  assert.doesNotMatch(backendHttpText, /do-not-expose-backend-body|opaque-test-token/);
}

await assertBackendHttpFallback(401, "ai_backend_http_401");
await assertBackendHttpFallback(403, "ai_backend_http_403");

const missingBackendFetch = createFetchMock(() => new Error("should not call OpenAI by default in production"));
const missingBackendResponse = await postRecommend(basePayload, {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    CF_PAGES_BRANCH: "main"
  },
  fetch: missingBackendFetch
});
const missingBackendJson = await missingBackendResponse.json();
assert.equal(missingBackendJson.source, "mock");
assert.equal(missingBackendJson.fallbackReason, "missing_ai_backend_url");
assert.equal(missingBackendFetch.calls.length, 0);

const directProductionWarnCalls = [];
const originalWarnForDirectProduction = console.warn;
const directProductionFetch = createFetchMock((call) => {
  assert.equal(call.url, "https://api.openai.com/v1/responses");
  assert.equal(call.init.headers.Authorization, "Bearer test-openai-key");
  return responseJson(recommendationSet("en"));
});
console.warn = (...args) => {
  directProductionWarnCalls.push(args);
};

let directProductionResponse;
try {
  directProductionResponse = await postRecommend(basePayload, {
    env: {
      OPENAI_API_KEY: "test-openai-key",
      CF_PAGES_BRANCH: "main",
      DIRECT_OPENAI_IN_PRODUCTION: "true"
    },
    fetch: directProductionFetch,
    cf: {
      colo: "ICN",
      country: "KR"
    }
  });
} finally {
  console.warn = originalWarnForDirectProduction;
}

const directProductionJson = await directProductionResponse.json();
assert.equal(directProductionJson.source, "openai");
assert.equal(directProductionFetch.calls.length, 1);
assert.equal(directProductionWarnCalls.length, 1);
assert.equal(String(directProductionWarnCalls[0][0]), "tripcompass_direct_openai_production_test colo=ICN country=KR");
assert.doesNotMatch(JSON.stringify(directProductionJson), /tripcompass_direct_openai_production_test|colo=ICN|country=KR/);

const backendCacheHitFetch = createFetchMock(() => new Error("should not call backend on cache hit"));
const backendCacheHitCache = createCacheMock({
  initial: {
    [cacheHitKey]: JSON.stringify({ recommendations: cachedRecommendations })
  }
});
const backendCacheHitResponse = await postRecommend({ ...basePayload, language: "ko", travelStyle: ["Food", "First-time friendly"] }, {
  env: {
    AI_BACKEND_URL: "https://ai-backend.example/recommend",
    CACHE: backendCacheHitCache
  },
  fetch: backendCacheHitFetch
});
const backendCacheHitJson = await backendCacheHitResponse.json();
assert.equal(backendCacheHitJson.source, "cache");
assert.equal(backendCacheHitFetch.calls.length, 0);
assert.equal(backendCacheHitCache.getCalls.length, 1);
assert.equal(backendCacheHitCache.putCalls.length, 0);

const cacheReadFailureFetch = createFetchMock(() => responseJson(recommendationSet("en")));
const cacheReadFailureCache = createCacheMock({ throwOnGet: true });
const cacheReadFailureResponse = await postRecommend(basePayload, {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    CACHE: cacheReadFailureCache
  },
  fetch: cacheReadFailureFetch
});
const cacheReadFailureJson = await cacheReadFailureResponse.json();
assert.equal(cacheReadFailureJson.source, "openai");
assert.equal(cacheReadFailureFetch.calls.length, 1);
assert.equal(cacheReadFailureCache.getCalls.length, 1);
assert.equal(cacheReadFailureCache.putCalls.length, 1);
assert.equal(cacheReadFailureJson.fallbackReason, undefined);

const cacheWriteFailureFetch = createFetchMock(() => responseJson(recommendationSet("en")));
const cacheWriteFailureCache = createCacheMock({ throwOnPut: true });
const cacheWriteFailureResponse = await postRecommend(basePayload, {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    CACHE: cacheWriteFailureCache
  },
  fetch: cacheWriteFailureFetch
});
const cacheWriteFailureJson = await cacheWriteFailureResponse.json();
assert.equal(cacheWriteFailureJson.source, "openai");
assert.equal(cacheWriteFailureFetch.calls.length, 1);
assert.equal(cacheWriteFailureCache.getCalls.length, 1);
assert.equal(cacheWriteFailureCache.putCalls.length, 1);
assert.equal(cacheWriteFailureJson.fallbackReason, undefined);

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
assert.equal(failedJson.fallbackReason, "openai_fetch_failed");
assert.equal(failedJson.input.language, "ko");
assert.equal(failedJson.recommendations[0].name, "후쿠오카");

async function assertOpenAIHttpFallback(status, fallbackReason) {
  const warnCalls = [];
  const originalWarn = console.warn;
  const httpFetch = createFetchMock(() => ({
    status,
    body: {
      error: {
        type: "invalid_request_error",
        code: "model_not_found",
        message: "do-not-log raw OpenAI body or sk-test-secret"
      },
      requestHeaders: {
        Authorization: "Bearer do-not-log"
      }
    }
  }));

  console.warn = (...args) => {
    warnCalls.push(args);
  };

  let httpResponse;
  try {
    httpResponse = await postRecommend(basePayload, {
      env: { OPENAI_API_KEY: "test-openai-key" },
      fetch: httpFetch
    });
  } finally {
    console.warn = originalWarn;
  }

  const httpJson = await httpResponse.json();
  const clientResponseText = JSON.stringify(httpJson);
  const serverLogText = JSON.stringify(warnCalls);

  assert.equal(httpResponse.status, 200);
  assert.equal(httpJson.source, "mock");
  assert.equal(httpJson.fallbackReason, fallbackReason);
  assert.equal(httpFetch.calls.length, 1);
  assert.equal(httpJson.error, undefined);
  assert.equal(httpJson.openaiStatus, undefined);
  assert.equal(httpJson.openaiErrorType, undefined);
  assert.equal(httpJson.openaiErrorCode, undefined);
  assert.doesNotMatch(clientResponseText, /invalid_request_error|model_not_found|do-not-log|Authorization|Bearer|sk-test-secret/i);
  assert.equal(warnCalls.length, 1);
  assert.match(String(warnCalls[0][0]), /OpenAI non-2xx response/);
  assert.deepEqual(warnCalls[0][1], {
    status,
    errorType: "invalid_request_error",
    errorCode: "model_not_found"
  });
  assert.doesNotMatch(serverLogText, /do-not-log|Authorization|Bearer|sk-test-secret/i);
}

await assertOpenAIHttpFallback(400, "openai_http_400");
await assertOpenAIHttpFallback(401, "openai_http_401");
await assertOpenAIHttpFallback(403, "openai_http_403");
await assertOpenAIHttpFallback(404, "openai_http_404");
await assertOpenAIHttpFallback(429, "openai_http_429");
await assertOpenAIHttpFallback(500, "openai_http_5xx");
await assertOpenAIHttpFallback(418, "openai_http_other");

const invalidJsonFetch = createFetchMock(() => ({ output_text: "{not json" }));
const invalidJsonResponse = await postRecommend(basePayload, {
  env: { OPENAI_API_KEY: "test-openai-key" },
  fetch: invalidJsonFetch
});
const invalidJson = await invalidJsonResponse.json();
assert.equal(invalidJson.source, "mock");
assert.equal(invalidJson.fallbackReason, "openai_invalid_json");

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
assert.equal(invalidValidationJson.fallbackReason, "openai_validation_failed");

assert.equal(englishFetch.calls.length, 1);
assert.equal(koreanFetch.calls.length, 1);
assert.equal(failedFetch.calls.length, 1);

const productionLiveScript = await readFile("scripts/check_production_live.sh", "utf8");
assert.match(productionLiveScript, /^#!\/usr\/bin\/env bash/);
assert.match(productionLiveScript, /https:\/\/tripcompass\.ai/);
assert.match(productionLiveScript, /\$BASE_URL\/"/);
assert.match(productionLiveScript, /\$BASE_URL\/ko\//);
assert.match(productionLiveScript, /\/api\/recommend/);
assert.match(productionLiveScript, /fallbackReason/);
assert.match(productionLiveScript, /source=cache/);
assert.match(productionLiveScript, /\/go\/hotel\?destination=fukuoka&country=japan&lang=ko/);
assert.match(productionLiveScript, /unique_suffix="\$\(date \+%s\)"/);
assert.match(productionLiveScript, /en_budget="under \$\{unique_suffix\} USD"/);
assert.match(productionLiveScript, /ko_budget="균형 예산 \$\{unique_suffix\}"/);
assert.match(productionLiveScript, /curl/);
assert.match(productionLiveScript, /node/);
assert.doesNotMatch(productionLiveScript, /OPENAI_API_KEY|AI_BACKEND_SECRET=/);

const operationsNote = await readFile("docs/operations.md", "utf8");
for (const expectedText of [
  "TripCompass Pages calls AI_BACKEND_URL",
  "bornstar-ai-gateway stores OPENAI_API_KEY",
  "Pages stores AI_BACKEND_SECRET",
  "D1 logs /go clicks",
  "KV caches recommendation results",
  "Pages should not keep OPENAI_API_KEY after gateway migration"
]) {
  assert.match(operationsNote, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(operationsNote, /no real-time prices/i);
assert.match(operationsNote, /no availability guarantees/i);
assert.match(operationsNote, /no visa guarantees/i);
assert.match(operationsNote, /no booking guarantees/i);

const launchMonitoring = await readFile("docs/launch-monitoring.md", "utf8");
for (const expectedText of [
  "14-Day Launch Checklist",
  "submit sitemap",
  "inspect homepage",
  "inspect /ko/",
  "inspect the 10 SEO landing pages",
  "bash scripts/check_production_live.sh",
  "Cloudflare Web Analytics",
  "GSC coverage",
  "D1 /go click logs",
  "latest clicks",
  "clicks by type",
  "clicks by destination",
  "clicks by language",
  "daily click counts",
  "Weekly KPI Table",
  "indexed pages",
  "GSC impressions",
  "GSC clicks",
  "Cloudflare visits",
  "API backend/cache status",
  "/go clicks",
  "Decision Rules"
]) {
  assert.match(launchMonitoring, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}
assert.match(launchMonitoring, /SELECT\s+id,\s*type,\s*destination,\s*country,\s*from_city,\s*to_city,\s*language,\s*referrer,\s*user_agent,\s*created_at\s+FROM\s+clicks/is);
assert.match(launchMonitoring, /GROUP BY\s+type/is);
assert.match(launchMonitoring, /GROUP BY\s+destination/is);
assert.match(launchMonitoring, /GROUP BY\s+language/is);
assert.match(launchMonitoring, /date\(created_at\)/i);
assert.match(launchMonitoring, /no real-time prices/i);
assert.match(launchMonitoring, /no availability guarantees/i);
assert.match(launchMonitoring, /no visa guarantees/i);
assert.match(launchMonitoring, /no booking guarantees/i);
assert.match(launchMonitoring, /Do not add real affiliate links/i);

const clickReportScript = await readFile("scripts/report_clicks.sh", "utf8");
assert.match(clickReportScript, /^#!\/usr\/bin\/env bash/);
assert.match(clickReportScript, /wrangler d1 execute "\$DB_NAME" --remote --command/);
assert.match(clickReportScript, /DB_NAME="tripcompass-ai-db"/);
for (const expectedReport of [
  "Latest 20 clicks",
  "Clicks by type",
  "Clicks by destination",
  "Clicks by country",
  "Clicks by language",
  "Daily click counts"
]) {
  assert.match(clickReportScript, new RegExp(expectedReport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(clickReportScript, /LIMIT 20/);
assert.match(clickReportScript, /GROUP BY type/);
assert.match(clickReportScript, /GROUP BY destination/);
assert.match(clickReportScript, /GROUP BY country/);
assert.match(clickReportScript, /GROUP BY language/);
assert.match(clickReportScript, /date\(created_at\)/i);
assert.doesNotMatch(clickReportScript, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i);
assert.doesNotMatch(clickReportScript, /OPENAI_API_KEY|AI_BACKEND_SECRET|printenv|\bexport\b/);

const affiliateReadiness = await readFile("docs/affiliate-readiness.md", "utf8");
for (const expectedText of [
  "Affiliate Readiness",
  "D1 click logs",
  "enough /go clicks by type",
  "repeated hotel/activity/eSIM intent",
  "organic traffic beginning to appear",
  "no broken /go routes",
  "hotel search",
  "flight search",
  "activities/tours",
  "eSIM",
  "no real affiliate IDs yet"
]) {
  assert.match(affiliateReadiness, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}
assert.match(affiliateReadiness, /no real-time price claims/i);
assert.match(affiliateReadiness, /no availability guarantees/i);
assert.match(affiliateReadiness, /no visa\/opening-hour\/safety guarantees/i);
assert.match(affiliateReadiness, /no booking guarantees/i);
assert.doesNotMatch(affiliateReadiness, /https?:\/\/(www\.)?(booking|agoda|expedia|klook|kkday|airalo|skyscanner)\./i);

const gscUrlScript = await readFile("scripts/list_gsc_urls.sh", "utf8");
assert.match(gscUrlScript, /^#!\/usr\/bin\/env bash/);
assert.doesNotMatch(gscUrlScript, /curl|fetch|googleapis|gcloud|OPENAI_API_KEY|AI_BACKEND_SECRET|wrangler/i);
for (const expectedUrl of [
  "https://tripcompass.ai/sitemap.xml",
  "https://tripcompass.ai/",
  "https://tripcompass.ai/ko/",
  "https://tripcompass.ai/from-seoul/",
  "https://tripcompass.ai/compare/",
  "https://tripcompass.ai/itinerary/",
  "https://tripcompass.ai/ko/from-seoul/",
  "https://tripcompass.ai/ko/compare/",
  "https://tripcompass.ai/ko/itinerary/",
  "https://tripcompass.ai/from-seoul/japan-3-day-trips/",
  "https://tripcompass.ai/compare/fukuoka-vs-osaka/",
  "https://tripcompass.ai/compare/tokyo-vs-osaka/",
  "https://tripcompass.ai/best-short-trips-from-korea/",
  "https://tripcompass.ai/from-seoul/japan-travel-budget/",
  "https://tripcompass.ai/from-seoul/seoul-to-fukuoka-weekend-trip/",
  "https://tripcompass.ai/itinerary/seoul-to-osaka-4-day-itinerary/",
  "https://tripcompass.ai/itinerary/seoul-to-tokyo-4-day-itinerary/",
  "https://tripcompass.ai/from-seoul/best-japan-cities-first-time-travelers/",
  "https://tripcompass.ai/best-short-family-trips-from-korea/",
  "https://tripcompass.ai/ko/from-seoul/japan-3-day-trips/",
  "https://tripcompass.ai/ko/compare/fukuoka-vs-osaka/",
  "https://tripcompass.ai/ko/compare/tokyo-vs-osaka/",
  "https://tripcompass.ai/ko/best-short-trips-from-korea/",
  "https://tripcompass.ai/ko/from-seoul/japan-travel-budget/",
  "https://tripcompass.ai/ko/from-seoul/seoul-to-fukuoka-weekend-trip/",
  "https://tripcompass.ai/ko/itinerary/seoul-to-osaka-4-day-itinerary/",
  "https://tripcompass.ai/ko/itinerary/seoul-to-tokyo-4-day-itinerary/",
  "https://tripcompass.ai/ko/from-seoul/best-japan-cities-first-time-travelers/",
  "https://tripcompass.ai/ko/best-short-family-trips-from-korea/"
]) {
  assert.match(gscUrlScript, new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const gscChecklist = await readFile("docs/gsc-submission-checklist.md", "utf8");
for (const expectedText of [
  "Google Search Console URL Submission Checklist",
  "scripts/list_gsc_urls.sh",
  "Submit sitemap.xml",
  "Inspect homepage and /ko/",
  "Inspect SEO landing pages",
  "Request indexing",
  "Monitor coverage and impressions",
  "Indexing is not guaranteed",
  "GSC data can lag"
]) {
  assert.match(gscChecklist, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}
assert.match(gscChecklist, /https:\/\/tripcompass\.ai\/sitemap\.xml/);
assert.match(gscChecklist, /https:\/\/tripcompass\.ai\/ko\/from-seoul\/japan-3-day-trips\//);
assert.doesNotMatch(gscChecklist, /affiliate ID|real affiliate link|googleapis|API key/i);
