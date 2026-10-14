# Trip Preparation Workspaces

## My Trips Overview

`/my-trips/` and `/ko/my-trips/` show Fukuoka, Osaka and Tokyo together in a stable city order. Each card reuses the existing illustration and localized guide/task labels. Readable records display the selected course, alternative, count of user-marked checks and next unchecked item. Empty trips offer a start link; completed checklists offer review, not a claim of booking readiness. All actions open the released workspace URLs, including the original Fukuoka `/my-trip/`.

The overview is read-only: it reuses `TRIPS`, `parseState` and `progress` from the released state module, creates no new storage key and does not write, migrate or reset any trip, bookmark or decision-board record. It updates after same-origin storage events and browser-history restores. Unavailable storage and invalid records are distinguished from an unsaved trip and left unchanged. Without JavaScript, all three workspace links remain usable and explain that saved progress needs JavaScript.

Header navigation, home/course entry bands and each workspace link to the overview. A compact three-city status row jumps to each card, avoiding a long mobile scroll to reach Tokyo. Header/language targets are at least 44px high; responsive scroll padding accounts for a wrapped header. Both languages share the same local records and have reciprocal language links, canonical metadata and sitemap entries. The monitored inventory is now 58 page URLs; the SEO landing-page count remains 40. No API, backend, infrastructure, search redirect or affiliate changes are included.

`scripts/check_my_trips.mjs` runs within Phase 2 and covers mixed/complete/empty states, localized labels, no writes, byte-equivalent legacy records and bookmarks, storage failures, malformed records, cross-tab reset and history restore. Browser QA must also cover navigation to/from all three workspaces, both languages, 320/390/1440px layouts, image loading, keyboard and no-JS/blocked-storage states. Production release evidence will be recorded after deployment.

Local Chromium verification on 2026-10-14 passed both languages at 320/390/768/920/1440px: loaded images, no horizontal overflow, 44px header/overview targets, unobscured city jumps, keyboard navigation and all three workspace resume/back links. Existing preparation, bookmarks and decision-board records remained byte-equivalent during reads. EN/KO switching, cross-tab edits, isolated reset, back navigation and reload passed. Separate 320px contexts passed no-JS, blocked-storage and one-corrupt-city checks in both languages, without leaking internal errors or rewriting bad records. Screenshots were visually inspected. No application page errors or preparation API/search calls occurred. Physical-device/Safari testing remains NOT_RUN.

## Tokyo Expansion

Tokyo uses `/my-trip/tokyo/` and `/ko/my-trip/tokyo/`, the existing Tokyo illustration and four bilingual guides. The base 4-day course offers an Asakusa-only Day 3 instead of optional Ueno. A separate, exclusive Day 2 replacement can be Jimbocho books/cafes or Kiyosumi-Shirakawa garden-or-exhibition plus a break. These replace a shopping half-day, not add districts or extend departure day. Actual transfers, opening arrangements, exhibitions and weather still require travelers' checks.

The existing shared controller/layout is unchanged. `data/trip_prep/tokyo.toml` supplies localized choices and guide links; the state registry adds `tripcompass.trip-prep.tokyo.v1`. Released Fukuoka/Osaka keys and record shapes remain untouched, with no migration or visit-time writes. City navigation and home/itinerary/related-guide entries come from the same registry data. Bookmark IDs now include `tokyo-jimbocho` and `tokyo-kiyosumi`, preserving all 13 supported guide IDs across new pages.

The Phase 2 tests exercise all three cities in both languages and verify independent resets, unchanged other-city records, cross-city record rejection, same-city tab merges and independent home resume labels. Generated-page checks cover controls, localized safe search URLs, reciprocal language links and the four-guide library. The GSC inventory adds the two workspaces for 56 page URLs, without changing the 40 SEO landing pages. No backend, AI Gateway, D1/KV, API, environment, /go or affiliate changes are included.

Local verification on 2026-10-14: Phase 1-5 passed, covering 65 built content pages. Isolated Chromium passed Tokyo EN/KO at 320/390/1440px: loaded images, no horizontal overflow, 44px choice/check/city-link targets, unobscured next-task anchors, reload, language switching, keyboard input, two-tab synchronization and reset cancel/confirm. Fukuoka/Osaka records remained byte-equivalent and rendered correctly in both languages at 320px. All three homepage resume links fit and worked independently; saving on the homepage preserved the new Tokyo bookmarks. Separate 320px contexts passed no-JavaScript guide access, blocked-storage notices and corrupt-state recovery in both languages. No preparation API/search calls or application page errors occurred. Physical-device/Safari tests and production QA are not established by these local checks.

### Tokyo Production Verification: 2026-10-14

Commit `0fe401a` passed GitHub CI and deployed through Pages Git integration. On `https://tripcompass.ai`, isolated Chromium repeated the same Tokyo start, Asakusa choice, Jimbocho-to-Kiyosumi replacement, checklist, bookmarks, reload, EN/KO switch, three-city homepage resume, keyboard, cross-tab and reset flows. Fukuoka/Osaka records remained byte-equivalent; both legacy workspaces rendered correctly at 320px in both languages. Tokyo layout/image/touch-target and next-task anchor checks passed at 320/390/1440px in both languages. Screenshots were inspected; no preparation API/search requests or application page errors occurred.

Separate live 320px contexts passed no-JavaScript four-guide reading, blocked-storage warnings and corrupt-state recovery in EN/KO. The public launch check passed all six workspace pages, EN/KO `source=backend`, repeated `source=cache`, HEAD 302 and all 56 monitored sitemap URLs. Five live JS/CSS files matched the release by SHA-256. Physical-device/Safari testing, remote D1 queries and retention measurement remain NOT_RUN. This is browser-local preparation, not cloud synchronization or booking verification. Deployment references are in `docs/operations.md`.

## Osaka Expansion

The Osaka workspace uses `/my-trip/osaka/` and `/ko/my-trip/osaka/`, the existing Osaka artwork and five bilingual guides. Choose the base Namba/Shinsaibashi day or replace part of its shopping with Doguyasuji. Separately choose one Day 3: stay in Osaka, replace it with one Kyoto area, or replace it with Nara. The choices do not combine Kyoto and Nara or add extra days. Workshops and travel conditions require the traveler's own checks.

The shared layout/controller now uses city-specific data under `data/trip_prep/`. Fukuoka keeps its released URLs, `tripcompass.trip-prep.v1` key and version-1 shape, without migration or automatic writes. Osaka uses `tripcompass.trip-prep.osaka.v1` with the same limited shape and its own allowed course/alternative IDs. Each reset affects only that city. Home and itinerary-hub links independently resume each saved trip; relevant guides link to their city workspace, and both workspaces have city navigation.

Both cities share guide bookmarks. The known-ID union includes Osaka/Kyoto, Nara and Doguyasuji so new page visits and saves do not discard either city's supported guides. No new API requests, analytics, accounts, server storage, backend routing or affiliate behavior are added. The sitemap inventory expands to 54 page URLs; SEO landing-page count remains 40. Phase 2 tests cover both cities/languages, legacy records, invalid/cross-city values, independent reset, same-city synchronization, independent homepage labels and bookmark preservation.

Local validation on 2026-10-14 passed Phase 1-5, covering 63 built content pages and 54 monitored sitemap URLs. Isolated Chromium checks passed English/Korean at 320px, 390px and 1440px: loaded artwork, no horizontal overflow, 44px choice/check/city targets, unobscured next-task anchors, keyboard checks, alternative replacement, reload, language switching, independent homepage resume, legacy Fukuoka preservation, shared bookmarks, two-tab synchronization and reset cancel/confirm. Separate 320px contexts passed no-JavaScript reading, blocked-storage notices and corrupt-state recovery in both languages. No preparation API/search requests or application page errors occurred; the known local favicon 404 is unrelated. Physical-device and Safari tests remain NOT_RUN.

### Osaka Production Verification: 2026-10-14

Commit `14d1dfd` was pushed to `main`, passed GitHub CI and deployed through the existing Pages integration. On the production custom domain, isolated Chromium repeated Osaka start, Doguyasuji choice, Kyoto-to-Nara replacement, checklist persistence, language switching, bookmarks, independent home resume, keyboard input, two-tab synchronization and reset cancel/confirm. The legacy Fukuoka record remained byte-equivalent and still rendered correctly; Osaka reset retained both cities' bookmarks. Both languages passed 320px, 390px and 1440px layout/image/touch-target checks. Separate 320px contexts passed no-JavaScript reading, blocked storage and corrupt-state recovery. These browser flows emitted no preparation API/search requests or page errors.

The public launch check passed all four workspace URLs, EN/KO `source=backend`, repeated `source=cache`, HEAD 302 and 54 monitored sitemap pages. Five deployed JS/CSS files matched the release by SHA-256. This is functional verification, not evidence of retention, verified booking conditions or cross-device synchronization. See `docs/operations.md` for the CI and immutable deployment references.

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
