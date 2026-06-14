const GATEWAY_NAME = "bornstar-ai-gateway";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
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

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store"
    }
  });
}

function compactText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeLanguage(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase().replace("_", "-") : "";
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : "en";
}

function normalizeList(value, fallback) {
  const rawItems = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const cleaned = rawItems
    .map((item) => compactText(item).slice(0, 80))
    .filter(Boolean);

  return cleaned.length ? Array.from(new Set(cleaned)).sort() : fallback;
}

function normalizeInput(payload = {}) {
  return {
    departureCity: compactText(payload.departureCity).slice(0, 80) || "Seoul",
    tripLength: compactText(payload.tripLength).slice(0, 40) || "3 to 4 days",
    budget: compactText(payload.budget).slice(0, 40) || "Balanced",
    travelMonth: compactText(payload.travelMonth).slice(0, 40) || "Flexible",
    travelStyle: normalizeList(payload.travelStyle, ["Food", "First-time friendly"]),
    travelers: compactText(payload.travelers).slice(0, 80) || "2 travelers",
    preferredRegion: compactText(payload.preferredRegion).slice(0, 80) || "Japan",
    language: normalizeLanguage(payload.language)
  };
}

function disclaimerFor(language) {
  return language === "ko" ? KOREAN_DISCLAIMER : ENGLISH_DISCLAIMER;
}

function languageName(language) {
  return language === "ko" ? "Korean" : "English";
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function departureSlugFor(input) {
  return normalizeSlug(input.departureCity) || "seoul";
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

function validateRecommendations(value, input) {
  if (!Array.isArray(value?.recommendations) || value.recommendations.length < 3) {
    return null;
  }

  const recommendations = value.recommendations.slice(0, 3).map((item) => validateRecommendation(item, input));
  return recommendations.every(Boolean) ? recommendations : null;
}

function modelFromEnv(env = {}) {
  return typeof env.OPENAI_MODEL === "string" && env.OPENAI_MODEL.trim() ? env.OPENAI_MODEL.trim() : DEFAULT_OPENAI_MODEL;
}

function apiKeyFromEnv(env = {}) {
  return typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.trim() ? env.OPENAI_API_KEY.trim() : "";
}

function backendSecretFromEnv(env = {}) {
  return typeof env.TRIPCOMPASS_BACKEND_SECRET === "string" && env.TRIPCOMPASS_BACKEND_SECRET.trim()
    ? env.TRIPCOMPASS_BACKEND_SECRET.trim()
    : "";
}

function isAuthorized(request, env) {
  const secret = backendSecretFromEnv(env);
  return !secret || request.headers.get("X-TripCompass-Backend-Secret") === secret;
}

function openAISystemPrompt(input) {
  const targetLanguage = languageName(input.language);

  return [
    "You are Bornstar AI Gateway generating TripCompass AI destination recommendations.",
    `Generate all user-facing text directly in ${targetLanguage}.`,
    "Return exactly 3 practical destination recommendations.",
    "Keep slug and countrySlug as stable lowercase English URL slugs such as fukuoka, osaka, tokyo, da-nang, japan, vietnam, thailand, singapore.",
    "Do not include real-time prices, availability, visa rules, opening hours, safety guarantees, booking guarantees, affiliate IDs, or external URLs.",
    "Do not include ctaUrls; the gateway will attach safe /go routes.",
    "Favor Japan and nearby Asia unless the user's preferredRegion points elsewhere."
  ].join(" ");
}

function openAIRequestBody(input, model) {
  return {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: openAISystemPrompt(input) }]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              task: "Recommend destinations for this trip request.",
              input
            })
          }
        ]
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

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleHealth(request, env) {
  if (!isAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = {
    ok: true,
    gateway: GATEWAY_NAME
  };
  const colo = request.cf?.colo;
  const country = request.cf?.country;
  const placement = request.headers.get("cf-placement");

  if (colo) {
    body.colo = colo;
  }

  if (country) {
    body.country = country;
  }

  if (placement) {
    body.placement = placement;
  }

  return jsonResponse(body);
}

async function handleRecommend(request, env) {
  if (!isAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const payload = await readJson(request);
  if (!payload) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const apiKey = apiKeyFromEnv(env);
  if (!apiKey) {
    return jsonResponse({ error: "OpenAI API key is not configured" }, 500);
  }

  const input = normalizeInput(payload);
  const openAIResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(openAIRequestBody(input, modelFromEnv(env)))
  });

  if (!openAIResponse.ok) {
    return jsonResponse({ error: "OpenAI request failed" }, 502);
  }

  let parsed;
  try {
    const openAIJson = await openAIResponse.json();
    parsed = JSON.parse(extractOutputText(openAIJson));
  } catch {
    return jsonResponse({ error: "OpenAI returned invalid JSON" }, 502);
  }

  const recommendations = validateRecommendations(parsed, input);
  if (!recommendations) {
    return jsonResponse({ error: "OpenAI recommendation validation failed" }, 502);
  }

  return jsonResponse({
    source: "openai",
    generatedAt: new Date().toISOString(),
    input,
    recommendations,
    disclaimer: disclaimerFor(input.language)
  });
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return handleHealth(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/recommend") {
      return handleRecommend(request, env);
    }

    return jsonResponse({ error: "Not found" }, 404);
  }
};
