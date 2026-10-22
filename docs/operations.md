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

The launch health check runs the live English/Korean/API checks, checks both My trips overviews, all six Fukuoka/Osaka/Tokyo preparation pages and their assets, and confirms that all 60 monitored URLs remain in the production sitemap. Preparation persistence, language switching, overview updates and reset still require browser QA; an HTTP 200 alone is not an interaction test. It uses a HEAD request for `/go` redirect QA so the check does not create a D1 click row.

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

## My Trips Guide Return Release: 2026-10-15

- Application commit: `dfc9320e1400ff9fe87c9f890ca07ebaa88225b2`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed locally; content/inventory counts remain 67/58.
- GitHub CI: [run 38586981913](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38586981913), success for that SHA. The earlier overlapping run was cancelled; the replacement completed successfully.
- Cloudflare Pages: deployment `b016fdb1-4392-499d-b368-1facc96aa0f2`, success for the same SHA. [Immutable deployment](https://b016fdb1.tripcompass-ai.pages.dev).
- Production Chromium passed 30 EN/KO task-guide round trips, top/bottom keyboard links, task focus, language switching/reload, unchanged saved records and 320/390/768/920/1440px layouts. Invalid contexts and no-JS/empty/corrupt/blocked states passed. Screenshots inspected. Checklist/workspace sync/bookmark undo/save-failure/reset regressions passed; details in `docs/trip-preparation.md`.
- Launch health passed both overviews and six workspaces, EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 58 monitored sitemap URLs. Six deployed JS/CSS files matched the commit by SHA-256.
- Return context is a fixed fragment, with no storage, arbitrary redirect, tracking or API call. No backend/gateway, D1/KV, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run.

## Guide Task Editing Release: 2026-10-15

- Application commit: `4cb399b8d10fef015261167ab313e35efdb09336`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed locally; content/inventory counts remain 67/58.
- GitHub CI: [run 38589182847](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38589182847), success for that SHA.
- Cloudflare Pages: deployment `80c99148-5bdb-4e89-a365-47be761d2dcc`, success for the same SHA. [Immutable deployment](https://80c99148.tripcompass-ai.pages.dev).
- Production Chromium passed 30 EN/KO article check/uncheck/return flows, top/bottom controls, keyboard, record isolation, language/reload, overview/workspace two-way sync and 320/390/768/920/1440px layouts. Failure/retry, stale/reset protection, read-only navigation and no-JS/empty/corrupt/blocked fallbacks passed. Existing overview and bookmark-undo regressions passed; screenshots inspected. Details: `docs/trip-preparation.md`.
- Launch health passed both overviews and six workspaces, EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 58 monitored sitemap URLs. Eight deployed navigation/editing/preparation/bookmark assets matched the commit by SHA-256.
- The shared edit helper retains the overview's existing write rules. No new storage key/migration, backend/gateway, D1/KV, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run.

## Guide Next Task Release: 2026-10-15

- Application commit: `f6dc2bcec2641bc522aea0cc02cb67546403736e`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38658133380](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38658133380), success for that SHA.
- Cloudflare Pages: deployment `1d4f733c-696e-4259-be90-19765b60f9e3`, success for the same SHA. [Immutable deployment](https://1d4f733c.tripcompass-ai.pages.dev).
- Production Chromium passed 30 sequential marks, 8 same-article and 16 cross-article next-guide transitions, next overview links, focus, completion/uncheck, language/reload, cross-tab refresh and failed-save/reset cases. EN/KO passed 320/390/768/920/1440px; screenshots inspected. Existing article editing/return/fallback and overview/bookmark-undo regression suites passed. Details: `docs/trip-preparation.md`.
- Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs. Eight deployed JS/CSS assets matched the commit by SHA-256. Browser preparation tests made no API/search calls and reported no application errors.
- No storage writer/key/migration, backend/gateway, D1/KV, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run. Checked items remain personal notes, not guarantees about booking or travel conditions.

## Guide City Progress Release: 2026-10-15

- Application commit: `f3b0674ffc07a49e590009d9d65b7af6aa1211be`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38659090527](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38659090527), success for that SHA.
- Cloudflare Pages: deployment `9ccb521a-243c-46ab-9cfc-65e7a7df4d47`, success for the same SHA. [Immutable deployment](https://9ccb521a.tripcompass-ai.pages.dev).
- Production Chromium passed 30 EN/KO progress contexts and remaining-guide links, saved-state counts, current-item labels, edits, reload/language, cross-tab focus, completion/uncheck, failure/retry and unavailable/no-JS states. Both languages passed 320/390/768/920/1440px; screenshots inspected. Existing next-step and overview/bookmark-undo regressions passed. Details: `docs/trip-preparation.md`.
- Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs. Eight deployed assets matched the commit by SHA-256. Browser preparation tests reported no application errors or API/search calls.
- No storage writer/key/migration, backend/gateway, D1/KV, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run. Progress represents personal preparation notes, not booking or travel-condition guarantees.

## Full Guide Checklist Release: 2026-10-15

- Application commit: `2ebbe8141e26e95880a212217bd4cfcf68a47903`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38690897573](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38690897573), success for that SHA.
- Cloudflare Pages: deployment `89b6da61-0c6d-4fb7-aa4e-1fcc91630134`, success for the same SHA. [Immutable deployment](https://89b6da61.tripcompass-ai.pages.dev).
- Production Chromium passed 30 EN/KO contexts and 60 full-list edits, keyboard disclosure, synchronized controls, completion/uncheck, reload/language, two-way overview changes, failure/retry and stale/reset focus recovery. Both languages passed 320/390/768/920/1440px; screenshots inspected. Progress/remaining-guide and overview/bookmark-undo regressions passed. Details: `docs/trip-preparation.md`.
- Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs. Eight deployed assets matched the commit by SHA-256. Browser preparation tests reported no application errors or API/search calls.
- No shared storage helper/key/migration, backend/gateway, D1/KV, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run. Checks remain personal notes, not verified bookings or travel conditions.

## Full Checklist Guide Links Release: 2026-10-15

- Application commit: `0a6f777763837ce680ca44aa9394081fcfb6dbfb`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38692601974](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38692601974), success for that SHA.
- Cloudflare Pages: deployment `0a708809-5482-45d9-84f3-bc81c1c3bb4f`, success for the same SHA. [Immutable deployment](https://0a708809.tripcompass-ai.pages.dev).
- Production Chromium passed 60 EN/KO keyboard guide/overview round trips, including marked/current tasks and same-article navigation. All five links stayed available in fully marked lists. Navigation, reload and language changes preserved raw preparation/bookmark/decision data. EN/KO passed 320/390/768/920/1440px with separate 44px targets; screenshots inspected. Details: `docs/trip-preparation.md`.
- Production full-checklist regression passed 30 contexts/60 edits, synchronized controls, cross-tab updates, failed-write retry and stale/reset protection. Overview/workspace synchronization, bookmark removal/undo and unavailable/no-JS regressions also passed.
- Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs. Eight deployed assets matched local files by SHA-256; both languages contained the template update. Browser navigation reported no application errors or preparation API/search calls.
- No JavaScript/storage writer/key/migration, backend/gateway, D1/KV, environment, `/go` or affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run. Checks remain personal notes, not verified bookings or travel conditions.

## Guide History Restoration Release: 2026-10-15

- Application commit: `7a112c1b07f5ba26de68f2b1c32e7692d8c985a8`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38695631400](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38695631400), success for that SHA.
- Cloudflare Pages: deployment `9da0ed99-6b66-4f15-8e4b-3241b359f960`, success for the same SHA. [Immutable deployment](https://9da0ed99.tripcompass-ai.pages.dev).
- Production Chromium passed 24 EN/KO round trips each with actual BFCache and cold restoration, including same-document task fragments, independently/both expanded panels, repeated Back/Forward, position/focus and compact fresh reloads. Raw preparation/bookmark/decision records stayed unchanged during navigation. Both languages passed 320/390/768/920/1440px; screenshots inspected. Details: `docs/trip-preparation.md`.
- Production touch-mobile latest-check preservation, reset fallback and blocked-history navigation passed in both browser configurations. Existing full-checklist (30 contexts/60 edits), overview/workspace, saved-guide removal/undo and unavailable/no-JS regressions passed.
- Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs. Nine deployed assets matched the commit by SHA-256. Browser history checks reported no application errors or preparation API/search calls.
- Only per-entry UI state uses `history.state`; no new local/session storage record or migration. Backend/gateway, D1/KV, environment, API, `/go` and affiliate behavior are unchanged. Physical-device/Safari, D1 reporting and retention measurement were not run.

## Guide Reload Restoration Release: 2026-10-15

- Application commit: `1db2b1ef11a9c18354b14ee49831989075cfed76`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38701883217](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38701883217), success for that SHA.
- Cloudflare Pages: deployment `9455a550-801c-487e-be4b-cc318ddf44c1`, success for the same SHA. [Immutable deployment](https://9455a550.tripcompass-ai.pages.dev).
- Production Chromium passed 46 EN/KO three-city reloads, independent/both/collapsed checklists, reading position, repeated reloads, fresh visits/new tabs and preserved raw records. Both languages passed 320/390/768/920/1440px; screenshots inspected. Existing history restoration passed 24 actual-BFCache and 24 cold-history round trips, including repeated traversal and same-document tasks.
- Touch-mobile reload/Back/latest-check/reset/failed-history tests and eight blocked/malformed/wrong-entry/reset cases passed. Full-list 30 contexts/60 edits, overview/workspace, bookmark removal/undo and unavailable/no-JS regressions passed. No application errors or preparation API/search calls.
- Nine deployed assets matched the commit; the browser-only reading-position privacy note is published. Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs.
- Only UI state is added to one optional tab-local `sessionStorage` slot, guarded by a History API entry marker and exact URL context. No preparation/bookmark/decision record migration or writer changes. Backend/gateway, D1/KV, environment, API, `/go` and affiliate behavior are unchanged. Physical-device/Safari, D1 reporting and retention measurement were not run.

## Guide Language Continuity Release: 2026-10-15

- Application commit: `89fab05fd423838982ceedb43f9f3584a6fe9c4f`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38705314398](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38705314398), success for that SHA.
- Cloudflare Pages: deployment `6f118b2b-d6ae-4004-8d6d-b30e429270dc`, success for the same SHA. [Immutable deployment](https://6f118b2b.tripcompass-ai.pages.dev).
- Production Chromium passed 30 contexts/80 EN/KO switches, checklist/semantic-section position, independent/both/collapsed lists, repeated switches, reload and native Back/Forward. Both languages passed 320/390/768/920/1440px; screenshots inspected. Twelve touch-mobile/keyboard/blocked/expired/reset cases passed. The test waits for initial page load/focus before placing the reading position.
- Existing history regression passed 24 round trips including actual BFCache. Full-list 30 contexts/60 edits, cross-tab/failure/reset handling, overview/workspace, bookmark removal/undo and unavailable/no-JS regressions passed. Preparation/bookmark/decision records were preserved outside deliberate edits. No application errors or preparation API/search calls occurred.
- Ten deployed assets matched the commit by SHA-256; the privacy notice is published. Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and 58 monitored sitemap URLs.
- One optional, single-use tab-local UI transfer is added, with a two-minute lifetime and counterpart/referrer/context checks. No preparation/bookmark/decision record migration. Backend/gateway, D1/KV, environment, API, `/go` and affiliate behavior are unchanged. Physical-device/Safari, D1 reporting and retention measurement were not run. Details: `docs/trip-preparation.md`.

## My Trips Reading Resume Release: 2026-10-15

- Application commit: `3ab4358f245e33ec72feb34bbf7d9be960945449`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38709488749](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38709488749), success for that SHA.
- Cloudflare Pages: deployment `36c23658-8335-44bf-a9a9-da9f69681d6d`, success for the same SHA. [Immutable deployment](https://36c23658.tripcompass-ai.pages.dev).
- Production Chromium passed 30 EN/KO city/task contexts, localized last-guide/task summaries, opposite-language Continue reading, checklist/semantic-section position, independent/both/collapsed lists, reload and city-isolated forget. Existing preparation/bookmark/decision records were preserved outside deliberate edits. Both languages passed 320/390/768/920/1440px and 44px resume targets; screenshots inspected.
- Eighteen touch-mobile cases passed same-language resume/edit/reload, blocked/corrupt storage, reset/changed preparation, fresh navigation and cross-tab updates/forget. Six overview return/resume/Forward flows passed with actual BFCache. Overview/workspace, bookmark removal/undo and unavailable/no-JS regressions passed, with no application errors or preparation API/search calls.
- Nine deployed assets matched the commit by SHA-256; privacy notice published. Launch health passed EN/KO `source=backend`, repeated `source=cache`, HEAD 302 and 58 monitored sitemap URLs.
- One bounded reading record per city and one guarded single-use session handoff are new. Preparation reset keeps its prior scope; Forget reading position removes only the selected city's reading record. No preparation/bookmark/decision migration or writer changes, backend/gateway/D1/KV/environment/API/redirect/affiliate changes. Physical-device/Safari, D1 reporting and retention measurement were not run. Details: `docs/trip-preparation.md`.

## My Trips Reading Undo Release: 2026-10-15

- Application commit: `72b12e43ceb62b2b8bb0e4c40bf56951e031f05e`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38716522313](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38716522313), success for that SHA.
- Cloudflare Pages: deployment `2e7b7321-18fd-4bf7-9c17-e79c3fc12425`, success for the same SHA. [Immutable deployment](https://2e7b7321.tripcompass-ai.pages.dev). Existing Git integration used without infrastructure or credential changes.
- Production Chromium passed 30 EN/KO city/task delete-undo-resume-reload contexts with exact original reading records, keyboard focus and unchanged preparation/bookmark/decision records. Both languages passed 320/390/768/920/1440px, 44px undo targets and screenshot inspection.
- Twenty-four touch-mobile cases passed failures/retry, newer or unreadable replacement protection, reset/course changes, checklist-only edits, independent city undo and reload/language page lifetime. Six actual-BFCache deletion-lifetime cases and six ordinary overview Back/resume/Forward regressions passed. Existing overview/workspace/checklist/bookmark-undo and unavailable/no-JS behavior passed, with no application errors or preparation API/search calls.
- Six deployed JS/CSS assets matched the commit by SHA-256; privacy notice published. Launch health passed EN/KO `source=backend`, repeated `source=cache`, HEAD 302 and 58 monitored sitemap URLs.
- Undo holds one deleted record per city in current-page memory only. No new storage key or persistent deletion history, preparation/bookmark/decision migration, backend/gateway/D1/KV/environment/API/redirect/affiliate changes. Physical-device/Safari, D1 queries and retention measurement were not run. Details: `docs/trip-preparation.md`.

## Reading Undo Reload Release: 2026-10-15

- Application commit: `c19d1e2f2d168cd3c4585d80a1ea3ae8db8f7ad0`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38720027353](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38720027353), success for that SHA.
- Cloudflare Pages: deployment `eb66a9b5-4efc-44bf-ba41-76d7dd0b1da0`, success for the same SHA. [Immutable deployment](https://eb66a9b5.tripcompass-ai.pages.dev). No infrastructure or credential changes.
- Production Chromium passed 30 EN/KO city/task contexts with two reloads before explicit undo, exact reading restoration, disclosures/section position and guide reload. Both languages passed 320/390/768/920/1440px, 44px controls and screenshot inspection.
- Twenty-four touch-mobile failure/retry/newer/reset/multicity cases, ten deadline/storage/history/fresh-entry guards and six actual-BFCache invalidation cases passed. Existing overview/workspace/checklist/bookmark-undo and unavailable/no-JS regressions passed. Original preparation/bookmark/decision records were preserved outside deliberate edits; no application errors or preparation API/search calls.
- Six deployed JS assets matched the commit, including `trip-reading-undo.js`; privacy notice published. Launch health passed EN/KO `source=backend`, repeated `source=cache`, HEAD 302 and all 58 monitored sitemap URLs.
- Undo now expires two minutes after deletion and can survive repeated reloads of the same overview visit. Optional per-city tab snapshots and a rotated history marker do not migrate or change preparation/bookmark/decision records. Ordinary navigation and language changes do not transfer undo. No backend/gateway/D1/KV/environment/API/redirect/affiliate changes. Physical-device/Safari, D1 queries and retention measurement were not run. Details: `docs/trip-preparation.md`.

## Reading Undo Language Release: 2026-10-15

- Application commit: `60e2a872cae518fdc4fd68d2dc397d0c05f261ad`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 38722329055](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/38722329055), success for that SHA.
- Cloudflare Pages: deployment `e6f3896f-6c66-42eb-930e-de2e3df8e34b`, success for the same SHA. [Immutable deployment](https://e6f3896f.tripcompass-ai.pages.dev). Existing Git integration; no infrastructure or credential changes.
- Production Chromium passed 30 EN/KO city/task contexts, each with three language switches plus reloads before explicit undo, exact record restoration, localized resume, disclosure/section position and guide reload. Both languages passed 320/390/768/920/1440px, 44px controls and screenshot inspection.
- Twenty-four touch-mobile failure/retry/newer/reset/multicity cases, 14 language deadline/storage/history/referrer/navigation guards, ten reload guards and six actual-BFCache invalidation cases passed. Existing overview/workspace/checklist/bookmark-undo and no-JS/unavailable-state regressions passed. Preparation/bookmark/decision values remained unchanged outside deliberate edits; no application errors or preparation API/search calls occurred.
- Six deployed JS assets matched the validated source; privacy notice published. Launch health passed EN/KO `source=backend`, repeated `source=cache`, HEAD 302 and all 58 monitored sitemap URLs. D1 queries were not run.
- Explicit same-tab header language switching now carries pending undo for the remaining original two-minute deletion window. No timer restart, automatic restoration, new localStorage key or preparation/bookmark migration. Ordinary navigation and Back/Forward do not transfer undo. This supersedes the previous release's language-navigation limitation. No backend/gateway/D1/KV/environment/API/redirect/affiliate changes. Physical-device/Safari and retention measurement remain NOT_RUN. Details: `docs/trip-preparation.md`.

## Next-visit Notes Release: 2026-10-23

- Application commit: `e5537f5a88bcec29137c041a360e3bbd0ddd7acc`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 39804721931](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/39804721931), success for that SHA.
- Cloudflare Pages: deployment `1bebcd0f-0bda-4eed-b1bc-dc9ba063ed03`, success for the same SHA. [Immutable deployment](https://1bebcd0f.tripcompass-ai.pages.dev). Existing Git integration, no credential/infrastructure changes.
- English/Korean My trips now offers an optional 240-character next-visit note per city. Explicit local save only, independent keys, shared user-written text across languages, stale-draft protection and safe failure feedback. No note contents are sent to AI/analytics/search links. No homepage controls added; both generated homepages match the pre-change build byte-for-byte.
- Production Chromium: six city/language flows at 320/390/768/1440px, inspected screenshots, keyboard/touch save, reload/language persistence, deletion, safe text and unsaved-departure warning/cancel passed. Sixteen mobile failure/conflict/limit/no-JS cases, six existing preparation/bookmark/reading undo/resume regressions and two actual-BFCache refreshes passed. An initial cross-tab touch timeout did not recur in the unchanged full suite in a fresh browser. Existing records remained intact outside deliberate test edits; passing runs had no application errors or preparation API/search calls.
- Five deployed JS/CSS assets matched source and the privacy notice was published. Launch health passed EN/KO backend, repeated cache, HEAD 302 and 58 monitored sitemap URLs. No backend/gateway/D1/KV/environment/API/redirect/affiliate behavior changed. Physical-device/Safari, D1 queries and actual retention impact remain NOT_RUN. Details: `docs/next-visit-notes.md`.

## Note Draft Recovery Release: 2026-10-23

- Application commit: `dd4a3cf9d5a3fff2c7c3412a0f5fd9b663ed1cb1`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed; content/inventory counts remain 67/58.
- GitHub CI: [run 39812112144](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/39812112144), success for that SHA.
- Cloudflare Pages: deployment `383da70e-725d-4f4c-b573-21b69178cab5`, success for the same SHA. [Immutable deployment](https://383da70e.tripcompass-ai.pages.dev). Existing Git integration; no credential or infrastructure changes.
- Per-city tab drafts now survive reload and EN/KO switching without changing saved notes until explicit Save note. Editors reopen without focus stealing; blank drafts, conflicts, blocked storage and stale BFCache pages are handled. No homepage changes or migrations of existing preparation/bookmark/reading records.
- Local and production Chromium passed eight draft-recovery/failure cases, six save/record-preservation flows, 16 edge cases, six checklist/bookmark/reading regressions and six actual-BFCache save/discard/edit cases. Both languages passed 320/390/768/1440px with inspected screenshots, no overflow and 44px controls. No application errors or preparation API/search calls occurred.
- Four deployed assets match source and the privacy notice is published. Launch health passed EN/KO backend recommendations, repeated cache, HEAD 302 and 58 sitemap URLs. Physical-device/Safari, D1 queries and retention measurement NOT_RUN. Details and storage limitations: `docs/next-visit-notes.md`.

## Plan B Guide Release: 2026-10-23

- Application commit: `1d7f27375a60c83bacfa420ed8602d7a77edf85d`, pushed to GitHub `main` with owner approval. Phase 1-5, strict Hugo and whitespace checks passed locally; inventory is now 69 content pages and 60 monitored URLs.
- Cloudflare Pages: deployment `43853b13-ce3e-4957-87f9-0a8d6eaafd19`, success for the same SHA. [Immutable deployment](https://43853b13.tripcompass-ai.pages.dev). Existing Git integration; no infrastructure or credential changes.
- GitHub CI: [run 39815176854](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/39815176854) was queued at the last successful status read. A later public API read returned HTTP 403. Remote CI is unconfirmed, not PASS; check the latest main run after this documentation update.
- New guides: `/itinerary/japan-plan-b/` and `/ko/itinerary/japan-plan-b/`. Rain, low energy and a late start each lead to a smaller-day decision, with Fukuoka/Osaka/Tokyo sections, existing related guides and links back to each city's My trips. City overviews, itinerary hubs, arrival/departure and Fukuoka rain guides provide entry links. The guide reuses an existing AI planning illustration and clearly identifies editorial review rather than new official-source verification.
- Both homepages remain byte-identical to the pre-change build. No new controls, storage keys or writers were added. Existing saved notes and same-tab drafts remain separate; the guide explains their limits without promising reminders or offline access. Return-visit value is a product hypothesis, not a measured retention improvement.
- Local and production Chromium passed six EN/KO city round trips, 320/390/768/1440px with inspected screenshots and 44px entry links, visible section targets, no-JS access, exact legacy records and draft recovery. Six existing checklist/bookmark/reading undo/resume regressions passed. No application errors or preparation API/search calls occurred.
- An initial publication-date UTC mismatch and cramped mobile table were fixed before local passing reruns. Production image checks were corrected to await image loading; the full suite then passed. A fresh fixed-viewport capture confirmed the Korean 320px layout after a viewport-switch screenshot artifact.
- Four deployed storage assets match source. Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 60 monitored sitemap URLs. No backend/gateway, D1/KV, environment, API, `/go` or affiliate behavior changed. No real-time price, availability, entry-rule, safety or booking guarantees were added. Physical-device/Safari, D1 queries and retention measurement remain NOT_RUN.

## Plan B Saved-guide Follow-up: 2026-10-23

- Scope: the existing EN/KO Plan B guide now includes an evening priority/drop decision and a morning keep/shorten/rest review. This is editorial planning content, not fresh verification of travel conditions or measured retention improvement. No additional URLs or homepage cards; inventory stays at 69 content pages/60 monitored URLs.
- A stable `plan-b` bookmark uses the existing saved-guide controller and key. Both language articles and all three city libraries offer Save guide; My trips shows it as a shared guide with existing removal/undo. Removing the shared bookmark affects all three city lists. No new storage, automatic reminders, account sync or offline availability is claimed. Other preparation, reading and note writers are unchanged.
- Local QA passed Phase 1-5, strict Hugo, whitespace, EN/KO save/reload/language, three-city shared undo, cross-tab updates, homepage saves retaining the new ID, no-JS and blocked-storage feedback. Chromium at 320/390/768/1440px passed with inspected screenshots and 44px controls. Existing records/drafts survived navigation, and six checklist/bookmark/reading regressions passed. No application errors or preparation API/search requests. Homepage HTML is identical except its non-visible allowed bookmark IDs. Initial fixture counts were updated for the added library entries before passing reruns.
- Application commit: `5f91afe7177a6eebc1d027e959d268efb5c2cac4`, pushed to GitHub main. [GitHub CI run 39817590051](https://github.com/bornstarsoft/tripcompass-ai/actions/runs/39817590051) is Success, verified on its public execution page.
- Production publication verified: the EN/KO Plan B and My trips HTML and four storage assets (`guide-explorer.js`, `my-trips.js`, `trip-note.js`, `trip-prep-core.js`) match the validated local build byte-for-byte. The public checks API returned 403, so a Pages deployment ID/same-SHA control-plane result was not obtained. No identity or credential changes were made to bypass the API limit.
- Production Chromium passed the same save/reload/language/shared-undo/cross-tab/homepage-preservation and no-JS/blocked-storage checks at 320/390/768/1440px; screenshots inspected. Existing records/drafts and six checklist/bookmark/reading undo/resume regressions passed, with no application errors or preparation API/search requests. Launch health passed EN/KO `source=backend`, repeat `source=cache`, HEAD 302 and all 60 monitored sitemap URLs.
- Physical-device/Safari, D1 queries and retention measurement NOT_RUN. No backend/gateway, D1/KV, environment, API, `/go` or affiliate changes; static JS/CSS are unchanged.

## Google Search Console Checklist

After deploying SEO content changes, use Google Search Console to:

- Submit `https://tripcompass.ai/sitemap.xml`.
- Inspect `https://tripcompass.ai/`.
- Inspect `https://tripcompass.ai/ko/`.
- Inspect the 42 current English and Korean SEO landing pages (21 English and 21 Korean) after the matching content release is deployed.
- Run `bash scripts/list_gsc_urls.sh` for the current copy/paste URL inventory.
- Run `bash scripts/check_gsc_inventory.sh` to confirm every listed page appears in the generated sitemap.
- Monitor coverage, indexing status, and query impressions for both English and Korean pages.

## Trust Boundaries

The Fukuoka preparation MVP at `/my-trip/`, Osaka at `/my-trip/osaka/` and Tokyo at `/my-trip/tokyo/`, plus their Korean equivalents under `/ko/`, are documented in `docs/trip-preparation.md`. They save independent browser-local choices and checklist flags, share guide bookmarks and add no analytics or AI call. All three cities were deployed and production-tested on 2026-10-14. The monitored URL inventory includes all six workspaces; existing backend/cache/click-log responsibilities are unchanged.

The content-first bilingual guides are documented in `docs/content-pilot.md`, including course URLs, photo licenses, English parity scope and post-deployment measurements. `docs/image-provenance.md` separately records the owner's confirmation that the hero was generated with Codex. Public QA copy checks require the corresponding deployment; local checks alone do not establish that production has changed.

The finder stops waiting after 60 seconds and restores its submit button and starting ideas on request failure. This browser-side timeout does not guarantee cancellation of an AI request already running on the server or prevent provider charges. A successful fallback response is presented as starting ideas, not as newly personalized recommendations; internal diagnostic fields are not displayed.

TripCompass AI provides planning suggestions only. Keep user-facing copy cautious: no real-time prices, no availability guarantees, no visa guarantees, and no booking guarantees. Users should verify prices, opening hours, visa rules, availability, and booking terms before booking.
