const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-5.5";
const SUPPORTED_LANGUAGES = new Set(["en", "ko"]);
const ENGLISH_DISCLAIMER =
  "TripCompass AI provides planning suggestions. Always check current prices, opening hours, visa rules, availability, and booking terms before booking.";
const KOREAN_DISCLAIMER =
  "TripCompass AI는 여행 계획 제안을 제공합니다. 예약 전 최신 가격, 영업시간, 비자 규정, 예약 가능 여부, 예약 조건을 반드시 확인하세요.";

const RECOMMENDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          country: { type: "string" },
          countrySlug: { type: "string" },
          score: { type: "number" },
          why: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string" }
          },
          bestFor: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: { type: "string" }
          },
          cautions: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string" }
          },
          estimatedBudgetLevel: { type: "string" },
          suggestedTripLength: { type: "string" }
        },
        required: [
          "name",
          "slug",
          "country",
          "countrySlug",
          "score",
          "why",
          "bestFor",
          "cautions",
          "estimatedBudgetLevel",
          "suggestedTripLength"
        ]
      }
    }
  },
  required: ["recommendations"]
};

function normalizeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeList(value, fallback) {
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return cleaned.length ? cleaned : fallback;
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return fallback;
}

function normalizeLanguage(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase().replace("_", "-") : "";
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : "en";
}

function disclaimerFor(language) {
  return language === "ko" ? KOREAN_DISCLAIMER : ENGLISH_DISCLAIMER;
}

function languageName(language) {
  return language === "ko" ? "Korean" : "English";
}

function departureSlugFor(input) {
  return input.departureCity.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seoul";
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function ctaUrls(destinationSlug, countrySlug, departureSlug = "seoul", language = "en") {
  const lang = normalizeLanguage(language);

  return {
    hotel: `/go/hotel?destination=${destinationSlug}&country=${countrySlug}&lang=${lang}`,
    flight: `/go/flight?from=${departureSlug}&to=${destinationSlug}&country=${countrySlug}&lang=${lang}`,
    activity: `/go/activity?destination=${destinationSlug}&country=${countrySlug}&lang=${lang}`,
    esim: `/go/esim?country=${countrySlug}&lang=${lang}`
  };
}

function completeRecommendation(item, input) {
  const slug = normalizeSlug(item.slug);
  const countrySlug = normalizeSlug(item.countrySlug);

  return {
    name: item.name,
    slug,
    country: item.country,
    countrySlug,
    score: item.score,
    why: item.why,
    bestFor: item.bestFor,
    cautions: item.cautions,
    estimatedBudgetLevel: item.estimatedBudgetLevel,
    suggestedTripLength: item.suggestedTripLength,
    ctaUrls: ctaUrls(slug, countrySlug, departureSlugFor(input), input.language)
  };
}

function recommendationsFor(input) {
  const isKorean = input.language === "ko";

  const japanSet = isKorean ? [
    {
      name: "후쿠오카",
      slug: "fukuoka",
      country: "일본",
      countrySlug: "japan",
      score: 94,
      why: [
        "짧은 일정에도 이동 동선이 단순해 부담이 적습니다.",
        "라멘, 시장, 카페, 캐주얼 식당까지 음식 여행 만족도가 높습니다.",
        "빡빡한 일정 없이 일본 분위기를 느끼고 싶은 여행자에게 잘 맞습니다."
      ],
      bestFor: ["음식 여행", "가벼운 주말여행", "첫 일본 여행"],
      cautions: ["도쿄나 오사카보다 대형 명소 선택지는 적습니다.", "인기 식당은 예약이나 대기가 필요할 수 있습니다."],
      estimatedBudgetLevel: "균형형",
      suggestedTripLength: "3일"
    },
    {
      name: "오사카",
      slug: "osaka",
      country: "일본",
      countrySlug: "japan",
      score: 90,
      why: [
        "음식, 야경, 쇼핑, 근교 당일치기를 3~4일 안에 구성하기 좋습니다.",
        "교토, 나라, 고베를 한 숙소에서 실용적으로 다녀올 수 있습니다.",
        "관심사가 다른 동행이 함께 가도 선택지가 넓습니다."
      ],
      bestFor: ["음식 여행", "친구/그룹 여행", "간사이 근교 일정"],
      cautions: ["주요 상권은 붐빌 수 있습니다.", "3일 일정에 교토까지 넣으면 빠듯할 수 있습니다."],
      estimatedBudgetLevel: "균형형에서 편안함 우선",
      suggestedTripLength: "4일"
    },
    {
      name: "도쿄",
      slug: "tokyo",
      country: "일본",
      countrySlug: "japan",
      score: 87,
      why: [
        "동네, 쇼핑, 음식, 문화 선택지가 가장 넓습니다.",
        "다양성을 중요하게 보는 첫 일본 여행자에게 강한 선택지입니다.",
        "하루 단위로 지역을 묶으면 이동 낭비를 줄일 수 있습니다."
      ],
      bestFor: ["첫 여행", "쇼핑", "대중문화", "다양한 음식"],
      cautions: ["이동 거리가 생각보다 깁니다.", "3일 안에 모든 것을 보려 하면 동선이 꼬일 수 있습니다."],
      estimatedBudgetLevel: "편안함 우선",
      suggestedTripLength: "3~5일"
    }
  ] : [
    {
      name: "Fukuoka",
      slug: "fukuoka",
      country: "Japan",
      countrySlug: "japan",
      score: 94,
      why: [
        "Compact city layout keeps a short trip relaxed.",
        "Strong food scene for ramen, markets, cafes, and casual dining.",
        "Good fit when the group wants Japan without a packed schedule."
      ],
      bestFor: ["Food", "Low-friction weekends", "First Japan trips"],
      cautions: ["Fewer big-city attractions than Tokyo or Osaka.", "Popular food spots may still need reservations."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "3 days"
    },
    {
      name: "Osaka",
      slug: "osaka",
      country: "Japan",
      countrySlug: "japan",
      score: 90,
      why: [
        "Food, nightlife, shopping, and day trips fit well into 3 to 4 days.",
        "Kyoto, Nara, and Kobe are practical add-ons from one base.",
        "Good option for mixed-interest groups."
      ],
      bestFor: ["Food trips", "Groups", "Kansai day trips"],
      cautions: ["Major areas can feel crowded.", "A 3 day trip may be tight if Kyoto is included."],
      estimatedBudgetLevel: "Balanced to comfort",
      suggestedTripLength: "4 days"
    },
    {
      name: "Tokyo",
      slug: "tokyo",
      country: "Japan",
      countrySlug: "japan",
      score: 87,
      why: [
        "Largest range of neighborhoods, shopping, dining, and culture.",
        "Strong first-time Japan choice when variety matters most.",
        "Works well if each day is planned by area."
      ],
      bestFor: ["First-time travelers", "Shopping", "Pop culture", "Food variety"],
      cautions: ["Distances are larger than they look.", "Trying to cover everything in 3 days creates backtracking."],
      estimatedBudgetLevel: "Comfort first",
      suggestedTripLength: "3 to 5 days"
    }
  ];

  const southeastAsiaSet = isKorean ? [
    {
      name: "다낭",
      slug: "da-nang",
      country: "베트남",
      countrySlug: "vietnam",
      score: 91,
      why: [
        "해변 중심의 느긋한 일정과 리조트 선택지가 가족, 커플 여행에 잘 맞습니다.",
        "호이안은 반나절이나 저녁 일정으로 붙이기 쉽습니다.",
        "복잡한 도시 여행보다 여유로운 분위기를 원할 때 좋습니다."
      ],
      bestFor: ["가족 여행", "해변 휴식", "리조트 가성비"],
      cautions: ["예약 전 우기와 계절별 날씨를 확인하세요.", "늦은 항공편은 첫날과 마지막 날 일정을 줄일 수 있습니다."],
      estimatedBudgetLevel: "균형형",
      suggestedTripLength: "4일"
    },
    {
      name: "방콕",
      slug: "bangkok",
      country: "태국",
      countrySlug: "thailand",
      score: 86,
      why: [
        "음식, 호텔, 시장, 도시 에너지가 강한 선택지입니다.",
        "따뜻한 날씨와 다양한 일정을 원하는 여행자에게 잘 맞습니다.",
        "근교 이동 없이도 3~4일을 충분히 채울 수 있습니다."
      ],
      bestFor: ["음식", "쇼핑", "따뜻한 날씨", "도시 여행"],
      cautions: ["교통 체증이 일정에 영향을 줄 수 있습니다.", "더위와 비에 맞춰 하루 리듬을 조정하세요."],
      estimatedBudgetLevel: "절약형에서 편안함 우선",
      suggestedTripLength: "4일"
    },
    {
      name: "싱가포르",
      slug: "singapore",
      country: "싱가포르",
      countrySlug: "singapore",
      score: 82,
      why: [
        "처음 해외여행을 가는 사람도 이동과 계획이 쉽습니다.",
        "음식, 도시 산책, 명소, 가족 친화 일정이 균형 잡혀 있습니다.",
        "편안함과 예측 가능한 동선을 중요하게 볼 때 좋은 선택지입니다."
      ],
      bestFor: ["가족 여행", "첫 해외여행", "편한 도시 동선"],
      cautions: ["주변 동남아 도시보다 비용이 높을 수 있습니다.", "인기 명소는 성수기에 미리 예약하는 편이 좋습니다."],
      estimatedBudgetLevel: "편안함 우선",
      suggestedTripLength: "3~4일"
    }
  ] : [
    {
      name: "Da Nang",
      slug: "da-nang",
      country: "Vietnam",
      countrySlug: "vietnam",
      score: 91,
      why: [
        "Beach pacing and resort options work well for families and couples.",
        "Hoi An is an easy add-on for a half-day or evening.",
        "Often feels calmer than dense city-break destinations."
      ],
      bestFor: ["Families", "Beach breaks", "Resort value"],
      cautions: ["Check seasonal rain before booking.", "Late flight times can affect the first and last day."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "4 days"
    },
    {
      name: "Bangkok",
      slug: "bangkok",
      country: "Thailand",
      countrySlug: "thailand",
      score: 86,
      why: [
        "Excellent food, hotels, markets, and city energy.",
        "Good option when travelers want warm weather and variety.",
        "Easy to fill 3 to 4 days without day trips."
      ],
      bestFor: ["Food", "Shopping", "Warm weather", "City breaks"],
      cautions: ["Traffic can slow down plans.", "Heat and rain can change the best daily rhythm."],
      estimatedBudgetLevel: "Save more to comfort",
      suggestedTripLength: "4 days"
    },
    {
      name: "Singapore",
      slug: "singapore",
      country: "Singapore",
      countrySlug: "singapore",
      score: 82,
      why: [
        "Very easy logistics for first-time international travelers.",
        "Strong food, city walks, attractions, and family-friendly planning.",
        "Good fit when comfort and predictability matter."
      ],
      bestFor: ["Families", "First-time travelers", "Clean city logistics"],
      cautions: ["Costs can run higher than nearby Southeast Asia.", "Book popular attractions ahead in busy periods."],
      estimatedBudgetLevel: "Comfort first",
      suggestedTripLength: "3 to 4 days"
    }
  ];

  const region = input.preferredRegion.toLowerCase();
  const recommendations = region.includes("southeast") || region.includes("동남아") ? southeastAsiaSet : japanSet;
  return recommendations.map((item) => completeRecommendation(item, input));
}

function openAISystemPrompt(input) {
  const targetLanguage = languageName(input.language);

  return [
    "You are TripCompass AI, an AI destination finder for short international trips from Korea.",
    `Generate all user-facing text directly in ${targetLanguage}.`,
    "Return exactly 3 practical destination recommendations.",
    "Keep slug and countrySlug as stable lowercase English URL slugs such as fukuoka, osaka, tokyo, da-nang, japan, vietnam, thailand, singapore.",
    "Do not include real-time prices, availability, visa rules, opening hours, safety guarantees, booking guarantees, affiliate IDs, or external URLs.",
    "Do not include ctaUrls; the server will attach safe /go routes.",
    "Favor Japan and nearby Asia unless the user's preferredRegion points elsewhere."
  ].join(" ");
}

function openAIUserPrompt(input) {
  return JSON.stringify({
    task: "Recommend destinations for this trip request.",
    input
  });
}

function openAIRequestBody(input) {
  return {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: openAISystemPrompt(input) }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: openAIUserPrompt(input) }]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tripcompass_recommendations",
        strict: true,
        schema: RECOMMENDATION_SCHEMA
      }
    },
    max_output_tokens: 1800
  };
}

function apiKeyFromEnv(env = {}) {
  return typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.trim() ? env.OPENAI_API_KEY.trim() : "";
}

function extractOutputText(openAIJson) {
  if (typeof openAIJson?.output_text === "string") {
    return openAIJson.output_text;
  }

  for (const item of openAIJson?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 300) : null;
}

function cleanStringList(value, minItems, maxItems) {
  if (!Array.isArray(value)) {
    return null;
  }

  const cleaned = value
    .map(cleanString)
    .filter(Boolean)
    .slice(0, maxItems);

  return cleaned.length >= minItems ? cleaned : null;
}

function validateRecommendation(item, input) {
  const name = cleanString(item?.name);
  const slug = normalizeSlug(item?.slug);
  const country = cleanString(item?.country);
  const countrySlug = normalizeSlug(item?.countrySlug);
  const score = Number(item?.score);
  const why = cleanStringList(item?.why, 1, 4);
  const bestFor = cleanStringList(item?.bestFor, 1, 5);
  const cautions = cleanStringList(item?.cautions, 1, 4);
  const estimatedBudgetLevel = cleanString(item?.estimatedBudgetLevel);
  const suggestedTripLength = cleanString(item?.suggestedTripLength);

  if (!name || !slug || !country || !countrySlug || !Number.isFinite(score) || score <= 0 || score > 100) {
    return null;
  }

  if (!why || !bestFor || !cautions || !estimatedBudgetLevel || !suggestedTripLength) {
    return null;
  }

  return completeRecommendation(
    {
      name,
      slug,
      country,
      countrySlug,
      score,
      why,
      bestFor,
      cautions,
      estimatedBudgetLevel,
      suggestedTripLength
    },
    input
  );
}

function validateOpenAIRecommendations(value, input) {
  if (!Array.isArray(value?.recommendations) || value.recommendations.length < 3) {
    return null;
  }

  const recommendations = value.recommendations.slice(0, 3).map((item) => validateRecommendation(item, input));
  return recommendations.every(Boolean) ? recommendations : null;
}

async function fetchOpenAIRecommendations(input, env, fetcher) {
  const apiKey = apiKeyFromEnv(env);

  if (!apiKey || typeof fetcher !== "function") {
    return null;
  }

  try {
    const response = await fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(openAIRequestBody(input))
    });

    if (!response.ok) {
      return null;
    }

    const openAIJson = await response.json();
    const outputText = extractOutputText(openAIJson);
    const parsed = JSON.parse(outputText);
    return validateOpenAIRecommendations(parsed, input);
  } catch {
    return null;
  }
}

function responsePayload(source, input, recommendations) {
  return {
    source,
    generatedAt: new Date().toISOString(),
    input,
    recommendations,
    disclaimer: disclaimerFor(input.language)
  };
}

export async function onRequestPost({ request, env = {}, fetch: contextFetch } = {}) {
  let payload = {};

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: "Invalid JSON body",
        expectedFields: [
          "departureCity",
          "tripLength",
          "budget",
          "travelMonth",
          "travelStyle",
          "travelers",
          "preferredRegion",
          "language"
        ]
      },
      { status: 400 }
    );
  }

  const input = {
    departureCity: normalizeText(payload.departureCity, "Seoul"),
    tripLength: normalizeText(payload.tripLength, "3 to 4 days"),
    budget: normalizeText(payload.budget, "Balanced"),
    travelMonth: normalizeText(payload.travelMonth, "Flexible"),
    travelStyle: normalizeList(payload.travelStyle, ["Food", "First-time friendly"]),
    travelers: normalizeText(payload.travelers, "2 travelers"),
    preferredRegion: normalizeText(payload.preferredRegion, "Japan"),
    language: normalizeLanguage(payload.language)
  };

  const fetcher = contextFetch || globalThis.fetch;
  const openAIRecommendations = await fetchOpenAIRecommendations(input, env, fetcher);

  if (openAIRecommendations) {
    return Response.json(responsePayload("openai", input, openAIRecommendations));
  }

  return Response.json(responsePayload("mock", input, recommendationsFor(input)));
}
