const DISCLAIMER =
  "TripCompass AI provides planning suggestions. Always check current prices, opening hours, visa rules, availability, and booking terms before booking.";

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

function ctaUrls(destinationSlug, countrySlug, departureSlug = "seoul") {
  return {
    hotel: `/go/hotel?destination=${destinationSlug}`,
    flight: `/go/flight?from=${departureSlug}&to=${destinationSlug}`,
    activity: `/go/activity?destination=${destinationSlug}`,
    esim: `/go/esim?country=${countrySlug}`
  };
}

function recommendationsFor(input) {
  const departureSlug = input.departureCity.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seoul";

  const japanSet = [
    {
      name: "Fukuoka",
      country: "Japan",
      score: 94,
      why: [
        "Compact city layout keeps a short trip relaxed.",
        "Strong food scene for ramen, markets, cafes, and casual dining.",
        "Good fit when the group wants Japan without a packed schedule."
      ],
      bestFor: ["Food", "Low-friction weekends", "First Japan trips"],
      cautions: ["Fewer big-city attractions than Tokyo or Osaka.", "Popular food spots may still need reservations."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "3 days",
      ctaUrls: ctaUrls("fukuoka", "japan", departureSlug)
    },
    {
      name: "Osaka",
      country: "Japan",
      score: 90,
      why: [
        "Food, nightlife, shopping, and day trips fit well into 3 to 4 days.",
        "Kyoto, Nara, and Kobe are practical add-ons from one base.",
        "Good option for mixed-interest groups."
      ],
      bestFor: ["Food trips", "Groups", "Kansai day trips"],
      cautions: ["Major areas can feel crowded.", "A 3 day trip may be tight if Kyoto is included."],
      estimatedBudgetLevel: "Balanced to comfort",
      suggestedTripLength: "4 days",
      ctaUrls: ctaUrls("osaka", "japan", departureSlug)
    },
    {
      name: "Tokyo",
      country: "Japan",
      score: 87,
      why: [
        "Largest range of neighborhoods, shopping, dining, and culture.",
        "Strong first-time Japan choice when variety matters most.",
        "Works well if each day is planned by area."
      ],
      bestFor: ["First-time travelers", "Shopping", "Pop culture", "Food variety"],
      cautions: ["Distances are larger than they look.", "Trying to cover everything in 3 days creates backtracking."],
      estimatedBudgetLevel: "Comfort first",
      suggestedTripLength: "3 to 5 days",
      ctaUrls: ctaUrls("tokyo", "japan", departureSlug)
    }
  ];

  const southeastAsiaSet = [
    {
      name: "Da Nang",
      country: "Vietnam",
      score: 91,
      why: [
        "Beach pacing and resort options work well for families and couples.",
        "Hoi An is an easy add-on for a half-day or evening.",
        "Often feels calmer than dense city-break destinations."
      ],
      bestFor: ["Families", "Beach breaks", "Resort value"],
      cautions: ["Check seasonal rain before booking.", "Late flight times can affect the first and last day."],
      estimatedBudgetLevel: "Balanced",
      suggestedTripLength: "4 days",
      ctaUrls: ctaUrls("da-nang", "vietnam", departureSlug)
    },
    {
      name: "Bangkok",
      country: "Thailand",
      score: 86,
      why: [
        "Excellent food, hotels, markets, and city energy.",
        "Good option when travelers want warm weather and variety.",
        "Easy to fill 3 to 4 days without day trips."
      ],
      bestFor: ["Food", "Shopping", "Warm weather", "City breaks"],
      cautions: ["Traffic can slow down plans.", "Heat and rain can change the best daily rhythm."],
      estimatedBudgetLevel: "Save more to comfort",
      suggestedTripLength: "4 days",
      ctaUrls: ctaUrls("bangkok", "thailand", departureSlug)
    },
    {
      name: "Singapore",
      country: "Singapore",
      score: 82,
      why: [
        "Very easy logistics for first-time international travelers.",
        "Strong food, city walks, attractions, and family-friendly planning.",
        "Good fit when comfort and predictability matter."
      ],
      bestFor: ["Families", "First-time travelers", "Clean city logistics"],
      cautions: ["Costs can run higher than nearby Southeast Asia.", "Book popular attractions ahead in busy periods."],
      estimatedBudgetLevel: "Comfort first",
      suggestedTripLength: "3 to 4 days",
      ctaUrls: ctaUrls("singapore", "singapore", departureSlug)
    }
  ];

  const region = input.preferredRegion.toLowerCase();
  return region.includes("southeast") ? southeastAsiaSet : japanSet;
}

export async function onRequestPost({ request }) {
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
          "preferredRegion"
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
    preferredRegion: normalizeText(payload.preferredRegion, "Japan")
  };

  return Response.json({
    source: "mock",
    generatedAt: new Date().toISOString(),
    input,
    recommendations: recommendationsFor(input),
    disclaimer: DISCLAIMER
  });
}
