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
bash scripts/check_launch_health.sh
```

The launch health check runs the live English/Korean/API checks and confirms that all monitored URLs remain in the production sitemap. It uses a HEAD request for `/go` redirect QA so the check does not create a D1 click row.

The public check does not require secrets and must not print Cloudflare or OpenAI environment values. After completing Cloudflare CLI authentication manually, add the aggregate D1 report with `bash scripts/check_launch_health.sh --with-d1`.

The public QA submits two distinct AI requests plus a repeated cache check; these can consume provider usage and populate KV. Its HEAD redirect check avoids adding new D1 click rows, but older GET-based QA runs may be present in historical click totals. A working public site does not by itself prove which commit Cloudflare deployed.

## Continuous Integration

The configured GitHub Actions workflow is `.github/workflows/ci.yml`, for pushes to `main`, pull requests, and manual dispatches. The workflow runs Phase 1-5 checks, the strict Hugo build, and `git diff --check`.

Its last recorded push was rejected because the GitHub token lacked workflow permission. The local configuration and passing local checks do not confirm a successful GitHub Actions run; verify the remote workflow after authentication is updated.

CI uses no TripCompass, Cloudflare, or OpenAI secrets and does not call production APIs or D1. Production health remains an explicit operation through `bash scripts/check_launch_health.sh`.

## Google Search Console Checklist

After deploying SEO content changes, use Google Search Console to:

- Submit `https://tripcompass.ai/sitemap.xml`.
- Inspect `https://tripcompass.ai/`.
- Inspect `https://tripcompass.ai/ko/`.
- Inspect the 20 current English and Korean SEO landing pages (10 English and 10 Korean).
- Run `bash scripts/list_gsc_urls.sh` for the current copy/paste URL inventory.
- Run `bash scripts/check_gsc_inventory.sh` to confirm every listed page appears in the generated sitemap.
- Monitor coverage, indexing status, and query impressions for both English and Korean pages.

## Trust Boundaries

TripCompass AI provides planning suggestions only. Keep user-facing copy cautious: no real-time prices, no availability guarantees, no visa guarantees, and no booking guarantees. Users should verify prices, opening hours, visa rules, availability, and booking terms before booking.
