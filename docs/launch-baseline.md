# TripCompass AI Launch Baseline

Status date: 2026-07-25 (KST)

This document records the first operational baseline after Google Search Console submission. It contains aggregate status only and does not store raw referrers, user agents, credentials, or private environment values.

## Day 0 Status

- Google Search Console sitemap submission: owner-confirmed complete.
- GitHub deployment source: local `main` matched `origin/main` before this baseline documentation update.
- Production homepage: English and Korean pages returned HTTP 200.
- Live finder: English and Korean requests returned recommendations through the shared backend.
- KV behavior: a repeated English recommendation request returned `source=cache`.
- `/go` behavior: the Korean hotel route returned HTTP 302.
- Live sitemap: all 28 page URLs from `scripts/list_gsc_urls.sh` were present.
- Old mock UI copy: not present on the English homepage.

## KPI Baseline

The sitemap count below confirms discoverable URLs, not Google indexing. GSC and analytics values can lag and should be filled only from their authoritative dashboards.

| date | live sitemap pages | indexed pages | GSC impressions | GSC clicks | Cloudflare visits | API backend/cache status | /go clicks | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-25 | 28 | pending | pending | pending | pending | backend ok / cache ok | pending | GSC sitemap submission owner-confirmed |

## D1 Click Report Status

The aggregate D1 report was not collected during this session because local Cloudflare CLI authentication was unavailable. No credentials were requested, stored, or added to the repository.

After completing Cloudflare CLI authentication manually, run:

```bash
bash scripts/report_clicks.sh
```

The report remains read-only and summarizes latest clicks, type, destination, country, language, and daily counts. Avoid copying raw operational records into public documents.

## Next Checkpoints

1. Days 1-3: review Cloudflare Web Analytics visits, top paths, countries, and referrers.
2. Days 1-7: review GSC coverage, indexed pages, impressions, clicks, and early queries.
3. Day 7: rerun production QA and the aggregate D1 click report, then fill the KPI baseline.
4. Day 14: compare the second KPI snapshot and apply the decision rules in `docs/launch-monitoring.md`.

Keep all conclusions cautious. Do not infer real-time prices, availability, visa status, opening hours, safety, or booking outcomes from these monitoring signals. Do not add real affiliate links during the baseline period.
