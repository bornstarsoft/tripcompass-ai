# TripCompass AI Affiliate Readiness

This note helps TripCompass AI decide when `/go` click intent is strong enough to consider real affiliate partner links. It is intentionally cautious: no real affiliate IDs yet, no real affiliate links, and no partner-specific claims.

TripCompass AI should keep user-facing copy conservative: no real-time price claims, no availability guarantees, no visa/opening-hour/safety guarantees, and no booking guarantees. Users should continue to verify prices, availability, opening hours, entry rules, cancellation terms, and booking conditions before booking.

## Current Baseline

- `/go` routes are the public click layer for hotel, flight, activity, and eSIM intent.
- D1 click logs record click type, destination, country, language, and related request context.
- `scripts/report_clicks.sh` can summarize the D1 click logs through read-only reports.
- Safe generic redirects stay in place until partner approval and tracking rules are reviewed.

## When to Consider Real Affiliate Links

Consider real affiliate links only when the baseline signals show useful intent and operations remain stable:

- There are enough /go clicks by type to see which booking category users actually choose.
- There is repeated hotel/activity/eSIM intent rather than a single one-off click.
- Organic traffic beginning to appear in Google Search Console supports the SEO pages sending qualified visitors.
- Production checks show no broken /go routes and redirects still work for English and Korean CTAs.
- Affiliate disclosure, tracking rules, and partner terms are reviewed before any live partner IDs are used.

Do not switch to real affiliate links just because a page exists. The better trigger is repeated intent from search visitors and live AI finder users.

## Possible Future Partner Categories

These are categories to evaluate later. This document does not add partner URLs, partner IDs, or commercial claims.

| Category | What to measure first | Cautious notes |
| --- | --- | --- |
| hotel search | Hotel clicks by destination and language | Do not claim lowest prices or availability. |
| flight search | Flight clicks by origin, destination, and country | Do not claim fare accuracy or schedule availability. |
| activities/tours | Activity clicks by destination and page context | Do not claim opening hours, capacity, or ticket availability. |
| eSIM | eSIM clicks by country and language | Do not claim device compatibility or coverage guarantees. |

## Readiness Review Checklist

Before adding any real affiliate IDs:

- Run `bash scripts/report_clicks.sh` and save a short aggregate summary.
- Confirm hotel, activity, or eSIM intent repeats across more than one day.
- Check Google Search Console for organic impressions and clicks to the related landing pages.
- Run `bash scripts/check_production_live.sh` and verify `/go` redirects still respond.
- Confirm the affiliate disclosure page is appropriate for the planned partner category.
- Keep `/go` routes as the visible content links so partner changes do not require editing every page.

## Hold Conditions

Keep generic redirects if:

- `/go` clicks are too sparse to show intent.
- Most clicks come from testing rather than organic sessions.
- A route, destination parameter, language value, or redirect check is failing.
- Partner terms require disclosures or tracking behavior that the current site has not reviewed.
- Adding partner links would create unsupported claims about price, availability, visas, opening hours, safety, or bookings.
