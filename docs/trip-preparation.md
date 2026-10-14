# Trip Preparation Workspaces

## Osaka Expansion

The Osaka workspace uses `/my-trip/osaka/` and `/ko/my-trip/osaka/`, the existing Osaka artwork and five bilingual guides. Choose the base Namba/Shinsaibashi day or replace part of its shopping with Doguyasuji. Separately choose one Day 3: stay in Osaka, replace it with one Kyoto area, or replace it with Nara. The choices do not combine Kyoto and Nara or add extra days. Workshops and travel conditions require the traveler's own checks.

The shared layout/controller now uses city-specific data under `data/trip_prep/`. Fukuoka keeps its released URLs, `tripcompass.trip-prep.v1` key and version-1 shape, without migration or automatic writes. Osaka uses `tripcompass.trip-prep.osaka.v1` with the same limited shape and its own allowed course/alternative IDs. Each reset affects only that city. Home and itinerary-hub links independently resume each saved trip; relevant guides link to their city workspace, and both workspaces have city navigation.

Both cities share guide bookmarks. The known-ID union includes Osaka/Kyoto, Nara and Doguyasuji so new page visits and saves do not discard either city's supported guides. No new API requests, analytics, accounts, server storage, backend routing or affiliate behavior are added. The sitemap inventory expands to 54 page URLs; SEO landing-page count remains 40. Phase 2 tests cover both cities/languages, legacy records, invalid/cross-city values, independent reset, same-city synchronization, independent homepage labels and bookmark preservation. Release and production evidence for this expansion will be recorded after validation.

Local validation on 2026-10-14 passed Phase 1-5, covering 63 built content pages and 54 monitored sitemap URLs. Isolated Chromium checks passed English/Korean at 320px, 390px and 1440px: loaded artwork, no horizontal overflow, 44px choice/check/city targets, unobscured next-task anchors, keyboard checks, alternative replacement, reload, language switching, independent homepage resume, legacy Fukuoka preservation, shared bookmarks, two-tab synchronization and reset cancel/confirm. Separate 320px contexts passed no-JavaScript reading, blocked-storage notices and corrupt-state recovery in both languages. No preparation API/search requests or application page errors occurred; the known local favicon 404 is unrelated. Physical-device and Safari tests remain NOT_RUN.

## Original Fukuoka Release

English `/my-trip/` and Korean `/ko/my-trip/` connect existing courses and support guides to a browser-local preparation state. The MVP was deployed on 2026-10-14 in `f7646a9`. It is a retention pilot, not evidence of improved retention.

## Scope

- One Fukuoka trip: weekend or parents course; no alternative, rain plan or Dazaifu replacement day.
- Five user-marked checks: flights, hotel, transport, weather and departure. These are notes, not verified travel conditions or booking confirmations.
- A changed base course clears all checks. A changed alternative clears transport and weather only. Other check changes merge the latest same-browser other-tab state.
- Six reading links reuse the existing bookmark controls and storage key. The shared known-ID list includes the three new support-guide IDs, so bookmarking on an older course does not erase them. The homepage explorer still displays its original five cards; the preparation library displays the six relevant saved states.
- Homepages, itinerary hubs and relevant course/support pages expose a preparation link. A readable saved trip changes it to a continue link. No automatic redirect or account is required.
- The existing comparison board remains independent and is linked, not silently imported or synchronized.

## Storage Boundaries

`tripcompass.trip-prep.v1` contains only version, known course ID, alternative ID and five booleans. Parsing is length-limited, validates the supported version and values, and discards extra properties. Reading never creates or rewrites state. Starting or changing preparation writes locally. No dates, free text, identity, new analytics, AI requests or server storage are added.

The English and Korean pages share the key on the same origin/browser profile. There is no cross-device sync or offline download. On blocked storage, progress remains on the current page with an explicit not-saved notice; navigation can lose it. A corrupt or unsupported stored record is not overwritten until the user starts again. Cross-tab and browser-history restores refresh readable state; memory-only changes are retained on the current page.

Reset requires an inline confirmation and removes only the preparation key. Bookmarks, language choices and comparison-board data remain. If deletion fails, the UI does not claim success or hide the current preparation. Last-write-wins applies to simultaneous edits of the same field; this is not collaborative editing.

## Validation and Release

`scripts/check_trip_prep.mjs` runs within Phase 2. It covers initial/reloaded state, both languages, progress, course changes, alternative changes, corrupted data, cross-tab merging, browser-history restore, blocked reads/writes, failed deletion and reset isolation. It also checks generated controls and the absence of networking or unsafe HTML insertion in the controller.

Browser QA must check 1440px, 390px and 320px in both languages; keyboard operation, starting, saving, reload, language switch, home resume, existing bookmarks, reset cancel/confirm, no JavaScript and blocked storage. Existing Phase 1-5 checks and the strict Hugo build remain release gates. The monitored sitemap inventory includes both tool URLs (52 pages plus the sitemap); SEO landing-page count remains 40.

No backend routing, AI Gateway, D1 schema, KV binding, environment variable, API schema, `/go` destination or affiliate behavior changes. Generic search links keep stable English slugs and the current language. The owner explicitly authorized final review, commit, deployment and production QA on 2026-10-14.

Local Chromium QA on 2026-10-14 passed both languages at 1440px, 390px and 320px: no horizontal overflow, loaded artwork, 44px-or-larger choice/check label targets and an unobscured next-task anchor. Keyboard checkbox input, reload, language switching, homepage resume, older bookmark compatibility, two-tab synchronization and reset cancel/confirm passed. Separate contexts covered no JavaScript, blocked storage, corrupt state and failed deletion in both languages. No API requests were made by these flows. The existing missing local favicon produced a 404; no application page errors were observed. These checks do not establish physical-device/Safari compatibility or production deployment.

Final local Phase 1-5 checks, `hugo --minify --panicOnWarning` and `git diff --check` passed on 2026-10-14. The shared content validator covers 61 built HTML pages. The earlier local implementation did not commit or deploy; the separately authorized release includes all accumulated content/UI changes.

## Production Browser QA: 2026-10-14

Against `https://tripcompass.ai`, using an isolated Chromium profile:

- Korean start, parents course, rain alternative, keyboard checkbox, saved hotel/rain guides and reload restored the same state. English switching preserved the course, alternative, two checks and saved-guide buttons.
- English homepage continue link reopened the prepared trip. English/Korean tabs synchronized checklist edits in both directions.
- Reset cancel retained the checklist. Confirmed reset removed only preparation and updated the other tab; saved-guide values and pressed states remained.
- Both languages were inspected at 320px, 390px and 1440px. Artwork loaded and no horizontal overflow was observed. English choice/check labels measured at least 44px high across these widths.
- Separate 320px contexts tested both languages with normal storage, JavaScript disabled, storage blocked and corrupt stored JSON. All six reading links stayed available; blocked storage showed the local-only warning, and corrupt state could be replaced by starting again. No page errors or `/api`/`/go` requests were emitted by these flows.
- Screenshots were inspected locally; they are QA artifacts, not repository assets. The public launch check separately verified backend/cache responses and HEAD redirects without generating a click row.

Physical devices and Safari were not tested. An optional WebKit launch could not run because the CLI's required browser binary was not installed; no global browser installation was performed. The preparation flow is browser-local, not cross-device synchronization, offline access or a verified booking record. See `docs/operations.md` for CI and deployment evidence.
