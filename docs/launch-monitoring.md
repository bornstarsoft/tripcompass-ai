# TripCompass AI Launch Monitoring

This document sets a lightweight 14-day baseline for watching early SEO, AI finder usage, and `/go` click-through signals after Google Search Console submission.

TripCompass AI should remain cautious in public reporting and user-facing copy: no real-time prices, no availability guarantees, no visa guarantees, no opening-hour guarantees, and no booking guarantees. Do not add real affiliate links until partner approval and tracking rules are clear.

## 14-Day Launch Checklist

Use this checklist during the first two weeks after each launch or SEO deploy.

| Day | Check | Notes |
| --- | --- | --- |
| Day 0 | submit sitemap | Submit `https://tripcompass.ai/sitemap.xml` in Google Search Console. |
| Day 0 | inspect homepage | Inspect `https://tripcompass.ai/` and request indexing if appropriate. |
| Day 0 | inspect /ko/ | Inspect `https://tripcompass.ai/ko/` and request indexing if appropriate. |
| Day 0 | inspect the 10 SEO landing pages | Inspect the five English and five Korean SEO landing pages from the sitemap. |
| Day 0 | run production live QA after deploys | Run `bash scripts/check_production_live.sh` after deployment and after any important environment change. |
| Days 1-3 | review Cloudflare Web Analytics | Check visits, top paths, countries, referrers, and any unusual traffic drops. |
| Days 1-7 | review GSC coverage/impressions | Watch indexed pages, crawl status, impressions, clicks, and queries without treating early data as final. |
| Days 1-14 | review D1 /go click logs | Check whether hotel, flight, activity, and eSIM routes receive useful early click signals. |
| Days 7 and 14 | summarize weekly KPI table | Capture the weekly KPI snapshot below and note any changes made. |

## D1 Query Snippets

Run these against the Cloudflare D1 database that contains the `clicks` table. Keep reports aggregate where possible; avoid sharing raw user-agent or referrer data outside operational debugging.

### Latest Clicks

```sql
SELECT
  id,
  type,
  destination,
  country,
  from_city,
  to_city,
  language,
  referrer,
  user_agent,
  created_at
FROM clicks
ORDER BY created_at DESC
LIMIT 50;
```

### Clicks by Type

```sql
SELECT
  type,
  COUNT(*) AS clicks
FROM clicks
GROUP BY type
ORDER BY clicks DESC;
```

### Clicks by Destination

```sql
SELECT
  destination,
  COUNT(*) AS clicks
FROM clicks
WHERE destination IS NOT NULL
GROUP BY destination
ORDER BY clicks DESC;
```

### Clicks by Language

```sql
SELECT
  COALESCE(language, 'unknown') AS language,
  COUNT(*) AS clicks
FROM clicks
GROUP BY language
ORDER BY clicks DESC;
```

### Daily Click Counts

```sql
SELECT
  date(created_at) AS click_date,
  COUNT(*) AS clicks
FROM clicks
GROUP BY date(created_at)
ORDER BY click_date DESC
LIMIT 30;
```

## Weekly KPI Table

Copy this table once per week during launch monitoring.

| date | indexed pages | GSC impressions | GSC clicks | Cloudflare visits | API backend/cache status | /go clicks | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD |  |  |  |  | backend ok / cache ok / fallback observed |  |  |

## Decision Rules

### When to Add More SEO Pages

Add more SEO pages when Google Search Console shows impressions for nearby-trip queries, at least some pages are indexed, and current pages have enough stable internal links to support expansion. Prioritize pages that answer real decision questions, such as destination comparisons, short-trip budgets, and from-Korea route planning.

Do not add pages only to chase thin keyword variants. Each new page should help users choose where to go, what to compare, or what to verify before booking.

### When to Apply Affiliate Links

Apply real affiliate links only after partner approval, tracking requirements, disclosure text, and redirect behavior are reviewed. Keep `/go` routes as the public link layer so partners can change without editing every content page.

Do not add real affiliate links during baseline monitoring. Until approval, keep safe generic redirects and clear affiliate disclosure.

### When to Improve Korean Content

Improve Korean content when `/ko/` pages show impressions, Korean-language queries, Korean homepage finder usage, or Korean `/go` clicks. Start with clearer Korean titles, more specific Korea-departure examples, and better internal links between Korean destination comparisons and budget pages.

Avoid making Korean pages a direct translation-only layer. They should stay natural for Korea-based travelers and keep stable English slugs in `/go` parameters.

### When to Keep Focusing on AI Finder UX

Keep focusing on AI finder UX when production QA shows backend/cache stability but Cloudflare visits do not lead to recommendation requests or `/go` clicks. Review form labels, defaults, loading copy, recommendation card clarity, and CTA placement before adding more pages.

If API responses fall back often, diagnose backend and cache health before changing the frontend. User-facing copy should remain safe and avoid exposing internal fallback details.
