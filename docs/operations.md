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

The launch health check runs the live English/Korean/API checks, checks both My trips overviews, all six Fukuoka/Osaka/Tokyo preparation pages and their assets, and confirms that all 58 monitored URLs remain in the production sitemap. Preparation persistence, language switching, overview updates and reset still require browser QA; an HTTP 200 alone is not an interaction test. It uses a HEAD request for `/go` redirect QA so the check does not create a D1 click row.

The public check does not require secrets and must not print Cloudflare or OpenAI environment values. After completing Cloudflare CLI authentication manually, add the aggregate D1 report with `bash scripts/check_launch_health.sh --with-d1`.

The public QA submits two distinct AI requests plus a repeated cache check; these can consume provider usage and populate KV. Its HEAD redirect check avoids adding new D1 click rows, but older GET-based QA runs may be present in historical click totals. A working public site does not by itself prove which commit Cloudflare deployed.

## Continuous Integration

The configured GitHub Actions workflow is `.github/workflows/ci.yml`, for pushes to `main`, pull requests, and manual dispatches. The workflow runs Phase 1-5 checks, the strict Hugo build, and `git diff --check`.

GitHub workflow permission was restored and commit `244efe9` was pushed and deployed on 2026-09-12. Its production live QA passed, including both language responses, repeated-request caching and the 32-page sitemap inventory. The first GitHub Actions run ended with exit 127 during phase checks. CI now explicitly installs ripgrep and Python before validation rather than relying on the runner image. Verify the latest remote run separately; a successful Pages deployment does not imply a successful CI run.

CI uses no TripCompass, Cloudflare, or OpenAI secrets and does not call production APIs or D1. Production health remains an explicit operation through `bash scripts/check_launch_health.sh`.

## Release Verification: 2026-10-14

- Release commit: `f7646a96cc65736b2a93b0886a03fdb5fe2831a0`, pushed to GitHub `main` with owner approval.
- GitHub CI: [run 38548326865](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38548326865), success. All Phase 1-5 checks, strict Hugo build and whitespace checks passed locally and in CI.
- Cloudflare Pages: deployment `4460c9ce-015d-4e06-8bc1-78043411d275`, success for the same SHA, confirmed through its GitHub check. [Immutable deployment](https://4460c9ce.tripcompass-ai.pages.dev). Existing Git integration performed the deployment; no bindings or environment settings changed.
- `bash scripts/check_launch_health.sh`: PASS on the production custom domain. English and Korean requests returned `source=backend`, the repeat returned `source=cache`, `/go/hotel` HEAD returned 302, and all 52 monitored page URLs appeared in the live sitemap.
- Both preparation pages and shared assets returned 200. Live preparation JS, state module, bookmark JS and preparation CSS matched the committed files by SHA-256. Interactive production checks are recorded in `docs/trip-preparation.md`.
- The local Wrangler session is expired. It was not needed for Git-triggered deployment or public checks. Authenticate manually before any future CLI-only Cloudflare administration; do not put credentials in the repository.
- No remote D1 query, production GET click, new affiliate link or infrastructure mutation was part of QA. No retention or conversion improvement is established by a successful release.

## Osaka Release Verification: 2026-10-14

- Application commit: `14d1dfd0d9bb77b31a87a261cf2fbff8c894e8ef`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo build and whitespace checks passed locally.
- GitHub CI: [run 38552990929](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38552990929), success for that SHA.
- Cloudflare Pages: deployment `96a1abe9-0d22-4a60-a268-f635028fd9c0`, success for the same SHA. [Immutable deployment](https://96a1abe9.tripcompass-ai.pages.dev). No infrastructure, bindings or environment changes.
- Production launch health: PASS for all four workspace pages; EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 54 monitored sitemap URLs. Preparation controller/core, bookmarks, preparation CSS and global CSS matched local committed files by SHA-256.
- Production Chromium: both languages at 320/390/1440px, legacy Fukuoka preservation, independent Osaka state, reload, language switching, bookmarks, home resume, keyboard, cross-tab edits and isolated reset passed. Separate no-JS, blocked-storage and corrupt-state contexts passed. Details: `docs/trip-preparation.md`.
- Physical-device/Safari testing, D1 reporting and retention measurement were not performed. No real affiliate links, provider changes or production GET search clicks were introduced.

## Tokyo Release Verification: 2026-10-14

- Application commit: `0fe401adb5126b1e450ff8e9cfbadef3aa009c67`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo build and whitespace checks passed locally.
- GitHub CI: [run 38561651451](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38561651451), success for the same SHA.
- Cloudflare Pages: deployment `d1398921-6f2f-4e5e-8818-65f9d4d024c3`, success for the same SHA. [Immutable deployment](https://d1398921.tripcompass-ai.pages.dev). No bindings, environment or infrastructure changes.
- Production launch health: all six preparation URLs, EN/KO backend responses, repeated cache hit, HEAD 302 and 56 monitored sitemap URLs passed. Five live JS/CSS files matched the committed files by SHA-256.
- Production Chromium: Tokyo EN/KO at 320/390/1440px, both existing city records unchanged, three-city resume, bookmarks, keyboard, language switching, reload, two-tab synchronization and isolated reset passed. No-JS, blocked-storage and corrupt-state checks also passed. Details: `docs/trip-preparation.md`.
- Physical-device/Safari tests, D1 reports and retention measurement were not run. No affiliate changes or production GET booking-search clicks were included.

## My Trips Release Verification: 2026-10-14

- Application commit: `1a92539710e91d8f2bc65dd102ac4623c44261a1`, pushed to GitHub `main` with owner approval. Local Phase 1-5, strict Hugo build and whitespace checks passed; 67 built content pages and 58 monitored sitemap URLs.
- GitHub CI: [run 38564048913](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38564048913), success for that SHA.
- Cloudflare Pages: deployment `71603b80-602d-45dd-a183-c169c9aef488`, success for the same SHA. [Immutable deployment](https://71603b80.tripcompass-ai.pages.dev). Existing Git integration used; no binding, environment, gateway or infrastructure changes.
- Production launch health: both My trips overviews and six workspaces returned 200; EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 58 monitored sitemap URLs passed. Overview JS/CSS, global CSS, preparation core/controller and bookmark JS matched the committed files by SHA-256.
- Production Chromium: EN/KO at 320/390/768/920/1440px, keyboard, unchanged three-city records/bookmarks, resume/back links, language switching, cross-tab edits, isolated reset and history/reload passed. No-JS, blocked storage and corrupt-record isolation also passed. See `docs/trip-preparation.md` for scope and the corrected test-initialization timing.
- Physical-device/Safari tests, D1 queries and retention measurement were not run. No affiliate or `/go` changes and no production GET search clicks were included.

## My Trips Saved Guides Release: 2026-10-14

- Application commit: `eee44f32caede43f99a70642ee7d8a3848ede005`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo build and whitespace checks passed locally; content/inventory counts remain 67/58.
- GitHub CI: [run 38566874214](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38566874214), success for that SHA.
- Cloudflare Pages: deployment `97b000e0-4276-4178-a28f-5bc4cf27a738`, success for the same SHA. [Immutable deployment](https://97b000e0.tripcompass-ai.pages.dev). No infrastructure or credential changes.
- Production Chromium passed EN/KO 320/390/768/920/1440px, localized guide opening, keyboard, read-only legacy record preservation, shared-guide cross-tab changes, back/reload and no-JS/blocked/corrupt/empty/unstarted states. Screenshots were inspected. Details: `docs/trip-preparation.md`.
- Launch health passed: both overviews and six workspaces, EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 sitemap URLs. Overview JS/CSS, preparation core/controller and bookmark JS matched the committed files by SHA-256.
- No reading-position tracking, new storage keys, backend/gateway changes, D1/KV changes, `/go` changes or affiliate additions. Physical-device/Safari, D1 queries and retention measurement were not run.

## My Trips Guide Undo Release: 2026-10-14

- Application commit: `76ec46c792e0ad99a01d2b3eab7b5ad7ab322e57`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo build and whitespace checks passed locally; content/inventory counts remain 67/58.
- GitHub CI: [run 38570104597](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38570104597), success for that SHA.
- Cloudflare Pages: deployment `de57457b-8d18-463d-beee-4f3ad0060387`, success for the same SHA. [Immutable deployment](https://de57457b.tripcompass-ai.pages.dev). No binding, environment, credential or infrastructure changes.
- Production Chromium passed English/Korean at 320/390/768/920/1440px: removal/undo, multiple/shared/last-guide behavior, keyboard focus, cross-tab edits, reload/language switching, failed writes/retry and unchanged three-city preparation records. Existing guide navigation and no-JS/blocked/corrupt/empty/unstarted regression flows passed. Screenshots were inspected. Details: `docs/trip-preparation.md`.
- Launch health passed: both overviews and six workspaces, EN/KO backend responses, repeated cache hit, HEAD 302 and all 58 monitored sitemap URLs. Overview JS/CSS, preparation core/controller and bookmark JS matched the committed files by SHA-256.
- Undo is page-memory only, not a persistent deletion history. No new storage keys, AI/gateway changes, D1/KV changes, `/go` changes or affiliate additions. Physical-device/Safari, D1 reporting and retention measurement were not run.

## My Trips Checklist Release: 2026-10-14

- Application commit: `eaae7a48d2854cffa6b9e72b492a51bf663298b8`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo build and whitespace checks passed locally; content/inventory counts remain 67/58.
- GitHub CI: [run 38578710843](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38578710843), success for that SHA.
- Cloudflare Pages: deployment `244ac751-5a2b-4c35-9ba7-ed39d6b5546a`, success for the same SHA. [Immutable deployment](https://244ac751.tripcompass-ai.pages.dev). No infrastructure, binding, environment or credential changes.
- Production Chromium passed EN/KO 320/390/768/920/1440px: city check/uncheck, progress/next task, keyboard focus, original choices and unrelated records retained, reload/language switching, two-way workspace updates, bookmark undo, failed saves/retry, stale reset protection and no-JS/empty/corrupt/blocked cases. Screenshots inspected; details in `docs/trip-preparation.md`.
- Public launch health passed both overviews and six workspaces, EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 sitemap URLs. Five deployed overview/preparation/bookmark JS/CSS hashes matched the commit.
- No new storage keys, migrations, AI/gateway, D1/KV, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run.

## My Trips Task Guide Release: 2026-10-14

- Application commit: `967a22987a4626deb3bfd04cff1e7311ada23f0e`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed locally; content/inventory counts remain 67/58.
- GitHub CI: [run 38581779035](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38581779035), success for that SHA.
- Cloudflare Pages: deployment `babd033d-9f2a-4115-9461-6c7b0f242819`, success for the same SHA. [Immutable deployment](https://babd033d.tripcompass-ai.pages.dev).
- Production Chromium passed all 30 localized task-guide opens, keyboard/click, Back/header navigation, unchanged saved records and EN/KO 320/390/768/920/1440px layouts. Screenshots inspected. Checklist, workspace sync, bookmark undo, failed saves/retry, stale reset and fallback regressions passed; details in `docs/trip-preparation.md`.
- Public launch QA passed both overviews and six workspaces, EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 58 monitored sitemap URLs. Five deployed JS/CSS hashes matched the commit.
- No JavaScript/storage logic, new keys, migration, backend, gateway, infrastructure, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run.

## Google Search Console Checklist

After deploying SEO content changes, use Google Search Console to:

- Submit `https://tripcompass.ai/sitemap.xml`.
- Inspect `https://tripcompass.ai/`.
- Inspect `https://tripcompass.ai/ko/`.
- Inspect the 40 current English and Korean SEO landing pages (20 English and 20 Korean) after the matching content release is deployed.
- Run `bash scripts/list_gsc_urls.sh` for the current copy/paste URL inventory.
- Run `bash scripts/check_gsc_inventory.sh` to confirm every listed page appears in the generated sitemap.
- Monitor coverage, indexing status, and query impressions for both English and Korean pages.

## Trust Boundaries

The Fukuoka preparation MVP at `/my-trip/`, Osaka at `/my-trip/osaka/` and Tokyo at `/my-trip/tokyo/`, plus their Korean equivalents under `/ko/`, are documented in `docs/trip-preparation.md`. They save independent browser-local choices and checklist flags, share guide bookmarks and add no analytics or AI call. All three cities were deployed and production-tested on 2026-10-14. The monitored URL inventory includes all six workspaces; existing backend/cache/click-log responsibilities are unchanged.

The content-first bilingual guides are documented in `docs/content-pilot.md`, including course URLs, photo licenses, English parity scope and post-deployment measurements. `docs/image-provenance.md` separately records the owner's confirmation that the hero was generated with Codex. Public QA copy checks require the corresponding deployment; local checks alone do not establish that production has changed.

The finder stops waiting after 60 seconds and restores its submit button and starting ideas on request failure. This browser-side timeout does not guarantee cancellation of an AI request already running on the server or prevent provider charges. A successful fallback response is presented as starting ideas, not as newly personalized recommendations; internal diagnostic fields are not displayed.

TripCompass AI provides planning suggestions only. Keep user-facing copy cautious: no real-time prices, no availability guarantees, no visa guarantees, and no booking guarantees. Users should verify prices, opening hours, visa rules, availability, and booking terms before booking.
