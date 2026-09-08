# TripCompass AI

AI destination finder and trip planner for smarter travel decisions.

TripCompass AI helps Korea-based travelers compare short overseas trips. English is served at `/` and Korean at `/ko/`. The destination finder uses a shared Cloudflare Worker AI Gateway; itinerary pages are written planning guides.

## Local Validation

Requirements: Hugo extended 0.152.2, Node.js 24 or compatible, Python 3, Bash, and ripgrep.

```bash
bash scripts/check_phase1.sh
bash scripts/check_phase2.sh
bash scripts/check_phase3.sh
bash scripts/check_phase4.sh
bash scripts/check_phase5.sh
hugo --minify --panicOnWarning
git diff --check
```

Local phase checks use mocked AI responses and do not require credentials. Phase 2 also checks generated content, internal links, metadata, and booking-search URL parameters. Its frontend tests exercise English/Korean success and fallback messages, request timeouts, retries, and duplicate-submit protection using a lightweight DOM test double.

## Operations and Content

- [Operations](docs/operations.md): gateway, cache, click logging, CI, and explicit production checks.
- [Content review](docs/content-review.md): September 2026 corrections and remaining owner decisions.
- [GSC submission checklist](docs/gsc-submission-checklist.md): current URL inventory.
- [Launch monitoring](docs/launch-monitoring.md): KPI definitions and checkpoints.
- [Historical launch baseline](docs/launch-baseline.md): July 2026 observations, not current measurements.

Keep booking links on `/go/` routes with English destination/country slugs and the appropriate `lang` value. Current redirects use generic search results without affiliate IDs. Travel guidance is for planning; users must verify current details before booking.
