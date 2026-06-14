# Google Search Console URL Submission Checklist

Use this helper after publishing SEO changes so important TripCompass AI pages are not missed during manual URL Inspection.

Run the local URL list:

```bash
bash scripts/list_gsc_urls.sh
```

The script prints the sitemap, homepages, section hubs, and English/Korean SEO landing pages in a copy/paste friendly format. It does not call Google services and does not require secrets.

## Manual Workflow

1. Submit sitemap.xml: `https://tripcompass.ai/sitemap.xml`.
2. Inspect homepage and /ko/: `https://tripcompass.ai/` and `https://tripcompass.ai/ko/`.
3. Inspect SEO landing pages from the English and Korean groups printed by `scripts/list_gsc_urls.sh`.
4. Request indexing for the pages that are ready and accessible.
5. Monitor coverage and impressions after several days.

Indexing is not guaranteed. GSC data can lag, so early coverage, indexing, and query reports should be treated as directional rather than final.

## URL Groups Included

- Sitemap URL
- Homepage and Korean homepage
- English section hubs: `/from-seoul/`, `/compare/`, `/itinerary/`
- Korean section hubs: `/ko/from-seoul/`, `/ko/compare/`, `/ko/itinerary/`
- Current English SEO landing pages
- Current Korean SEO landing pages

## Current SEO Landing Pages

English:

- `https://tripcompass.ai/from-seoul/japan-3-day-trips/`
- `https://tripcompass.ai/compare/fukuoka-vs-osaka/`
- `https://tripcompass.ai/compare/tokyo-vs-osaka/`
- `https://tripcompass.ai/best-short-trips-from-korea/`
- `https://tripcompass.ai/from-seoul/japan-travel-budget/`
- `https://tripcompass.ai/from-seoul/seoul-to-fukuoka-weekend-trip/`
- `https://tripcompass.ai/itinerary/seoul-to-osaka-4-day-itinerary/`
- `https://tripcompass.ai/itinerary/seoul-to-tokyo-4-day-itinerary/`
- `https://tripcompass.ai/from-seoul/best-japan-cities-first-time-travelers/`
- `https://tripcompass.ai/best-short-family-trips-from-korea/`

Korean:

- `https://tripcompass.ai/ko/from-seoul/japan-3-day-trips/`
- `https://tripcompass.ai/ko/compare/fukuoka-vs-osaka/`
- `https://tripcompass.ai/ko/compare/tokyo-vs-osaka/`
- `https://tripcompass.ai/ko/best-short-trips-from-korea/`
- `https://tripcompass.ai/ko/from-seoul/japan-travel-budget/`
- `https://tripcompass.ai/ko/from-seoul/seoul-to-fukuoka-weekend-trip/`
- `https://tripcompass.ai/ko/itinerary/seoul-to-osaka-4-day-itinerary/`
- `https://tripcompass.ai/ko/itinerary/seoul-to-tokyo-4-day-itinerary/`
- `https://tripcompass.ai/ko/from-seoul/best-japan-cities-first-time-travelers/`
- `https://tripcompass.ai/ko/best-short-family-trips-from-korea/`

## Cautions

TripCompass AI pages should stay cautious: no real-time prices, no availability guarantees, no visa, opening-hour, safety, or booking guarantees. This checklist is only for indexing workflow support and does not change content, redirects, or commercial behavior.
