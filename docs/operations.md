# TripCompass AI Operations

This note captures the current production responsibilities after the shared AI Gateway migration.

## Live Request Path

- TripCompass Pages calls AI_BACKEND_URL from `/api/recommend`.
- bornstar-ai-gateway stores OPENAI_API_KEY as a Worker secret and calls OpenAI from the gateway.
- Pages stores AI_BACKEND_SECRET and forwards it to the gateway as `X-TripCompass-Backend-Secret`.
- Pages should not keep OPENAI_API_KEY after gateway migration.
- KV caches recommendation results for repeated normalized finder requests.
- D1 logs /go clicks from the booking/search link router.

## Production QA

Run the public live check from the repo root:

```bash
bash scripts/check_production_live.sh
```

The script uses only public TripCompass endpoints. It does not require secrets and must not print Cloudflare or OpenAI environment values.

## Google Search Console Checklist

After deploying SEO content changes, use Google Search Console to:

- Submit `https://tripcompass.ai/sitemap.xml`.
- Inspect `https://tripcompass.ai/`.
- Inspect `https://tripcompass.ai/ko/`.
- Inspect the 10 English and Korean SEO landing pages:
  - `https://tripcompass.ai/from-seoul/japan-3-day-trips/`
  - `https://tripcompass.ai/compare/fukuoka-vs-osaka/`
  - `https://tripcompass.ai/compare/tokyo-vs-osaka/`
  - `https://tripcompass.ai/best-short-trips-from-korea/`
  - `https://tripcompass.ai/from-seoul/japan-travel-budget/`
  - `https://tripcompass.ai/ko/from-seoul/japan-3-day-trips/`
  - `https://tripcompass.ai/ko/compare/fukuoka-vs-osaka/`
  - `https://tripcompass.ai/ko/compare/tokyo-vs-osaka/`
  - `https://tripcompass.ai/ko/best-short-trips-from-korea/`
  - `https://tripcompass.ai/ko/from-seoul/japan-travel-budget/`
- Monitor coverage, indexing status, and query impressions for both English and Korean pages.

## Trust Boundaries

TripCompass AI provides planning suggestions only. Keep user-facing copy cautious: no real-time prices, no availability guarantees, no visa guarantees, and no booking guarantees. Users should verify prices, opening hours, visa rules, availability, and booking terms before booking.
