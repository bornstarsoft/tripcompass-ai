const DISCLAIMER =
  "TripCompass AI provides planning suggestions. Always verify prices, opening hours, transit options, availability, and booking terms before booking.";

function normalizeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function readPayload(request) {
  if (request.method !== "POST") {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

function mockTokyoItinerary() {
  return [
    {
      day: 1,
      title: "Arrival, Shibuya, and Harajuku",
      pace: "Light",
      stops: ["Hotel bag drop", "Shibuya Crossing", "Miyashita Park", "Harajuku or Omotesando"],
      bookingChecks: ["Airport transfer timing", "Dinner reservation if needed"]
    },
    {
      day: 2,
      title: "Asakusa, Ueno, and Akihabara",
      pace: "Moderate",
      stops: ["Asakusa", "Ueno Park or museums", "Akihabara", "Neighborhood dinner"],
      bookingChecks: ["Museum hours", "Activity tickets for themed cafes or attractions"]
    },
    {
      day: 3,
      title: "Ginza, Tokyo Station, and Flexible Favorites",
      pace: "Flexible",
      stops: ["Ginza or Tsukiji area", "Tokyo Station", "Shopping buffer", "Airport transfer"],
      bookingChecks: ["Luggage storage", "Final train or airport bus schedule"]
    }
  ];
}

export async function onRequest({ request }) {
  const payload = await readPayload(request);
  const destination = normalizeText(payload.destination, "Tokyo");
  const tripLength = normalizeText(payload.tripLength, "3 days");

  return Response.json({
    source: "mock",
    destination,
    tripLength,
    generatedAt: new Date().toISOString(),
    days: mockTokyoItinerary(),
    ctaUrls: {
      hotel: `/go/hotel?destination=${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      activity: `/go/activity?destination=${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      esim: "/go/esim?country=japan"
    },
    disclaimer: DISCLAIMER
  });
}
