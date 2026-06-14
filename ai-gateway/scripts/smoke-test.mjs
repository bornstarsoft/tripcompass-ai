import assert from "node:assert/strict";
import worker from "../src/index.js";

function requestWithCf(url, options = {}, cf = {}) {
  const request = new Request(url, options);
  Object.defineProperty(request, "cf", {
    value: cf
  });
  return request;
}

function responseJson(recommendations) {
  return {
    output_text: JSON.stringify({ recommendations })
  };
}

function recommendationSet(language = "en") {
  if (language === "ko") {
    return [
      {
        name: "후쿠오카",
        slug: "fukuoka",
        country: "일본",
        countrySlug: "japan",
        score: 94,
        why: ["짧은 일정에 동선이 단순합니다."],
        bestFor: ["음식 여행"],
        cautions: ["예약 전 최신 정보를 확인하세요."],
        estimatedBudgetLevel: "균형형",
        suggestedTripLength: "3일"
      },
      {
        name: "오사카",
        slug: "osaka",
        country: "일본",
        countrySlug: "japan",
        score: 90,
        why: ["음식과 근교 일정이 잘 맞습니다."],
        bestFor: ["친구 여행"],
        cautions: ["주요 지역은 붐빌 수 있습니다."],
        estimatedBudgetLevel: "균형형",
        suggestedTripLength: "4일"
      },
      {
        name: "도쿄",
        slug: "tokyo",
        country: "일본",
        countrySlug: "japan",
        score: 88,
        why: ["선택지가 넓습니다."],
        bestFor: ["쇼핑"],
        cautions: ["동선을 지역별로 묶으세요."],
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
      why: ["Compact layout keeps a short trip relaxed."],
      bestFor: ["Food"],
      cautions: ["Verify booking details before committing."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "3 days"
    },
    {
      name: "Osaka",
      slug: "osaka",
      country: "Japan",
      countrySlug: "japan",
      score: 90,
      why: ["Food and day trips fit well."],
      bestFor: ["Groups"],
      cautions: ["Major areas can be crowded."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "4 days"
    },
    {
      name: "Tokyo",
      slug: "tokyo",
      country: "Japan",
      countrySlug: "japan",
      score: 88,
      why: ["It has the widest range of neighborhoods."],
      bestFor: ["Shopping"],
      cautions: ["Plan by area."],
      estimatedBudgetLevel: "Comfort first",
      suggestedTripLength: "3 to 5 days"
    }
  ];
}

const healthResponse = await worker.fetch(
  requestWithCf(
    "https://bornstar-ai-gateway.example/health",
    {
      headers: {
        "cf-placement": "aws:us-east-1"
      }
    },
    {
      colo: "IAD",
      country: "US"
    }
  ),
  {}
);
assert.equal(healthResponse.status, 200);
assert.deepEqual(await healthResponse.json(), {
  ok: true,
  gateway: "bornstar-ai-gateway",
  colo: "IAD",
  country: "US",
  placement: "aws:us-east-1"
});

const unauthorizedHealthResponse = await worker.fetch(
  new Request("https://bornstar-ai-gateway.example/health"),
  {
    TRIPCOMPASS_BACKEND_SECRET: "test-secret"
  }
);
assert.equal(unauthorizedHealthResponse.status, 401);
assert.deepEqual(await unauthorizedHealthResponse.json(), { error: "Unauthorized" });

const unauthorizedResponse = await worker.fetch(
  new Request("https://bornstar-ai-gateway.example/api/recommend", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ language: "en" })
  }),
  {
    TRIPCOMPASS_BACKEND_SECRET: "test-secret"
  }
);
assert.equal(unauthorizedResponse.status, 401);
assert.deepEqual(await unauthorizedResponse.json(), { error: "Unauthorized" });

const fetchCalls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  fetchCalls.push({
    url,
    init,
    body: JSON.parse(init.body)
  });

  return new Response(JSON.stringify(responseJson(recommendationSet("ko"))), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
};

try {
  const recommendResponse = await worker.fetch(
    new Request("https://bornstar-ai-gateway.example/api/recommend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-TripCompass-Backend-Secret": "test-secret"
      },
      body: JSON.stringify({
        departureCity: "Seoul",
        tripLength: "4 days",
        budget: "Balanced",
        travelMonth: "October",
        travelStyle: ["Food", "First-time friendly"],
        travelers: "2 adults",
        preferredRegion: "Japan",
        language: "ko"
      })
    }),
    {
      OPENAI_API_KEY: "test-openai-key",
      TRIPCOMPASS_BACKEND_SECRET: "test-secret"
    }
  );
  const recommendJson = await recommendResponse.json();

  assert.equal(recommendResponse.status, 200);
  assert.equal(recommendJson.source, "openai");
  assert.equal(recommendJson.input.language, "ko");
  assert.equal(recommendJson.recommendations.length, 3);
  assert.equal(recommendJson.recommendations[0].slug, "fukuoka");
  assert.match(recommendJson.recommendations[0].ctaUrls.hotel, /destination=fukuoka/);
  assert.match(recommendJson.recommendations[0].ctaUrls.hotel, /country=japan/);
  assert.match(recommendJson.recommendations[0].ctaUrls.hotel, /lang=ko/);
  assert.match(recommendJson.disclaimer, /예약 전/);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "https://api.openai.com/v1/responses");
  assert.equal(fetchCalls[0].init.headers.Authorization, "Bearer test-openai-key");
  assert.equal(fetchCalls[0].body.model, "gpt-5.4-mini");
  assert.match(JSON.stringify(fetchCalls[0].body.input), /Korean/);
  assert.doesNotMatch(JSON.stringify(recommendJson), /test-openai-key/);
} finally {
  globalThis.fetch = originalFetch;
}
