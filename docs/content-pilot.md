# Content-First Bilingual Guides

## Scope

The original Korean pilot was deployed in commit `244efe9`. The English parity follow-up, generated artwork, saved-guide controls and supplemental bilingual guides were deployed in `f7646a9` on 2026-10-14, together with the Fukuoka preparation MVP. GitHub CI, Cloudflare Pages and public launch QA passed. Dated local-validation entries below describe their original implementation checkpoints, not the current deployment status. See `docs/trip-preparation.md` for production interaction checks. The release upgrades the corresponding existing English URLs for these courses:

- `/ko/from-seoul/seoul-to-fukuoka-weekend-trip/`: Friday-evening arrival, one full day, two nights.
- `/ko/itinerary/seoul-to-osaka-4-day-itinerary/`: Osaka base, Kyoto as a replacement day rather than an extra stop.
- `/ko/itinerary/seoul-to-tokyo-4-day-itinerary/`: cafe/shopping interests, one neighborhood cluster per full day.

Both homepages put these courses before the finder and use the same course layout, photos and editorial depth. English copy, alternative text and photo captions are localized; author, source and license records are shared. Existing URLs are preserved. The decision board remains a secondary tool and its behavior is unchanged.

No AI/provider/API schema, `/go` behavior, D1, KV or environment settings change. Reading a course needs no JavaScript or AI request. AI still suggests destinations; it does not edit these itineraries. Booking links remain generic searches with stable English parameters and `lang=en` or `lang=ko`; no affiliate IDs are introduced.

## Focused Support Guides

Two support topics in both languages answer different decisions, not keyword variants of the weekend course:

- `/ko/itinerary/fukuoka-with-parents-3-days/`: one outing per day, hotel rest, room needs and a park-or-shopping choice rather than both.
- `/ko/from-seoul/fukuoka-hakata-vs-tenjin-hotels/`: area selection by arrival plans, actual station exit and room conditions. No hotel ranking, live quote or area-filtered search is implied. The guide omits the park photograph because it does not illustrate either hotel area.

English counterparts use the same paths without `/ko`. Both homepages, Fukuoka weekend courses and relevant section hubs link to their language's guides. Family and comparison pages in both languages link into concrete courses; comparisons use equal trip lengths and explicit omissions. All five guide pairs have reciprocal alternates and context-preserving language switching. Official Fukuoka airport, city and subway sources were checked on 2026-09-12 for terminal connections and area/facility context only; no accessibility or operating-time guarantee is made. The English text carries forward that source scope rather than claiming a new field inspection.

## Discovery And Sharing Follow-Up

Both itinerary hubs collect the four detailed itineraries across content sections, including the Fukuoka weekend page under `/from-seoul/`. The table uses page metadata and the shared course registry for duration and traveler fit; the hotel-area guide stays outside the itinerary rows. Older English itinerary guides remain linked. Finder and Planner in the English header now lead directly to the live homepage finder and itinerary hub; the earlier overview URLs are preserved.

Open Graph and Twitter card metadata use each page's existing title, description, canonical URL and language. The five guide pairs now use 1200px JPEG renditions of their generated editorial covers, with localized alternative text identifying them as AI illustrations. Other pages use the new generated waterfront hero. Sharing metadata does not guarantee how a particular app crops, caches or displays a preview. No social account, review, price or booking claim is added.

## Interest-Based Guide Discovery

The homepage explorer now includes all five guide pairs: Fukuoka weekend, Osaka food and neighborhoods, Tokyo cafes and shopping, Fukuoka with parents, and hotel-area selection. `data/explore.toml` holds shared stable IDs, paths, tags, image references and bilingual copy. Each card highlights a concrete decision addressed in the existing guide. The guide opens with three practical takeaways and a contents shortcut; historical location photographs remain separately labeled below the article.

Seven native radio options select all guides, weekend, food, cafes/shopping, parents, hotel areas or saved guides. Search matches local English and Korean card titles and summaries, with a 100-character limit. A zero-result view offers a reset. Without JavaScript, all five linked cards and complete guides remain visible; unusable controls stay hidden.

Bookmark buttons store only known guide IDs under `tripcompass.saved-guides.v1` in localStorage after a user action. Saved choices are shared between languages on the same origin and browser profile, not between devices. Storage failures retain current-page choices and show a generic notice. No account, offline download, new analytics event or AI request is added by search, filtering or saving. The privacy notice documents this local behavior. Saved status is not proof of user satisfaction and is not collected as a business metric.

Six images were created using Codex's built-in image generation: one hero and five covers. See [Generated Travel Artwork](generated-art.md) for exact prompts, source assets, rendering sizes and the distinction between conceptual art and licensed location photographs. All home and guide images are locally served; there is no runtime image-generation request.

## Sharing And Print Tools

All five guide pairs have progressively enhanced copy-link and print controls. Copy uses the page's canonical URL without query strings or fragments, only on a user click. If clipboard access is unavailable, a readonly link field is revealed and selected. No share provider, storage, tracking request or AI request is added. Controls remain hidden without JavaScript; content, links and the browser's own print function still work.

The guide-only print stylesheet removes navigation, tools and the sticky contents column. It retains the source-review date, original page URL, photo credits, source links, itinerary text and final planning disclaimer. The button opens the browser print dialog; PDF export depends on the browser and does not create a saved or offline copy automatically. Printed suggestions are not current operating information or booking confirmation.

Copy, printer and bookmark icons are vendored from Lucide 0.468.0. The source and ISC notice are published at `/licenses/lucide.txt`; no runtime icon dependency is added. `scripts/check_course_tools.mjs` runs in Phase 2 with mocked browser APIs and covers both languages, unavailable clipboard access, print failure, safe URLs and duplicate clicks. `scripts/check_guide_explorer.mjs` covers local search, interests, saving, invalid/blocked storage and cross-tab state without network requests.

## Editorial Standard

Each course includes who it suits, day-by-day choices, omitted stops and why, hotel-area tradeoffs, weather/energy alternatives, budget categories, cautions and next steps. Sources checked on 2026-09-12 establish place/area context, not verified journey times, current fares, opening hours or inventory. The text is an editorial planning proposal, not a firsthand travel review.

Keep source checks scoped. Do not turn a content review date into an assertion that every linked service was freshly verified. Before expanding, check official area and operator information again; add actual firsthand evidence only when it exists. Do not publish invented restaurant experiences, ratings, guaranteed walking times, live prices or guaranteed entry/booking claims.

## Photo Provenance

Photo records and license links are in `data/courses.toml`, rendered with each use. Originals are local in `assets/img/courses/`. Hugo generates 480px and 960px WebP variants; the UI may crop for consistent framing. These historical photographs illustrate the places, not current operating conditions or a TripCompass visit. No external photo request is required at runtime.

- Fukuoka: [Ohori Park 20170505-1.jpg](https://commons.wikimedia.org/wiki/File:Ohori_Park_20170505-1.jpg), そらみみ, 2017-05-05. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Resized/reformatted versions remain under that license.
- Osaka: [Dotonbori 20230603.jpg](https://commons.wikimedia.org/wiki/File:D%C5%8Dtonbori_20230603.jpg), Nkon21, 2023-06-03. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- Tokyo: [Omotesando Avenue](https://commons.wikimedia.org/wiki/File:Omotesando_Avenue_at_sunset_from_pedestrian_bridge,_Jingumae,_Shibuya,_Tokyo.jpg), gog.creator, 2026-08-05. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Input asset is Wikimedia's 1280px rendition.

License grants apply to the photographs, not endorsements by the photographers or depicted businesses. Preserve attribution on future reuse. No claims of site-wide licensing changes are made.

The previous planning-desk hero is a separate Codex-generated illustration, as confirmed by the owner on 2026-09-12, and remains on the decision board. The new hero and covers are separately recorded in `docs/generated-art.md`. See `docs/image-provenance.md`; the photo licenses above do not apply to any of these generated assets.

## Measurement After Deployment

Record the deployment date and release commit first. The local source change alone is not a live launch. The production QA script now expects the content-first copy, so it will reject the old deployment until these changes are released.

1. Run all Phase 1-5 checks and the strict Hugo build, then production live QA after an authorized deployment.
2. Inspect both language versions of the three updated courses, the two support guides, the four day-choice guides, the Jimbocho/Doguyasuji/Kiyosumi-Shirakawa interest guides and the arrival/departure-day guide in GSC after deployment. The inventory is now 52 pages, including the decision boards and Fukuoka preparation workspaces; existing course URLs have not moved.
3. Record GSC impressions/clicks and Cloudflare visits per course weekly. Compare equal windows; early indexing and reporting delays make the first days inconclusive.
4. Use `scripts/report_clicks.sh` for aggregate `/go` intent. Where D1 `referrer` includes a full same-origin path, inspect attribution to the three course paths; missing/origin-only referrers remain unattributed. Do not infer course-level click rates from aggregate destination totals. No new tracking events are added by this pilot.
5. Review at two and four weeks without treating those dates as indexing or traffic guarantees. Prioritize improvements to pages already receiving relevant impressions; inspect indexing and page quality before adding pages with no evidence of discovery. If visits appear without search clicks, review the usefulness and placement of the next step before increasing AI features.

| Week ending | Course path | GSC impressions | GSC clicks | Cloudflare visits | Attributable /go clicks | Unattributed clicks / caveats | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | | | | | | | |

Visits, GSC clicks and `/go` requests are different measurements. `/go` clicks are not completed bookings, commission or unique humans. Filters, bots, repeated clicks and reporting lag can affect comparisons. Real affiliate integration remains a separately approved step under `docs/affiliate-readiness.md`.

## Validation

### Day-Choice Content Expansion: 2026-09-22

This is implementation and validation work, not a deployed release. Two new topics each have an English and Korean page:

- `/itinerary/osaka-or-kyoto-day-trip/`: a concrete choice for the spare full day in the existing Osaka course, including what to give up, one-area Kyoto planning, common versus additional costs, and a night-before check.
- `/itinerary/fukuoka-rainy-day-plan/`: a Hakata-or-Tenjin replacement for the existing park day, with meal/rest priorities, optional browsing prompts, spending limits and departure-day cautions.

Korean paths add `/ko` to these paths. These are chosen editorial gaps in current guides, not claims of measured search demand. No new city itinerary, firsthand experience or live-service promise is implied. The homepages link both questions below the five-card course explorer; existing course, parents and hotel-area pages link the relevant guide. Both itinerary hubs also list the new pages. The original five-card search/save scope is unchanged; these additional reading links remain visible independently of its filters.

New pages reuse the existing Osaka and conceptual hotel-neighborhood illustrations with AI notices. They do not depict verified Kyoto sights, either Fukuoka mall or rainy conditions. The shared planning-guide layout reuses the existing typography, contents column, copy-link and print controls without adding interactive state or backend calls. Sharing previews, reciprocal alternates and the GSC inventory cover all four pages.

Official pages were opened directly on 2026-09-22, without a search engine: Kyoto City [areas](https://kyoto.travel/en/areas/), [transport](https://kyoto.travel/en/getting-around), [responsible travel](https://kyoto.travel/en/responsible-travel/), [JR Hakata City](https://www.jrhakatacity.com/) and [Tenjin Underground Mall](https://www.tenchika.com/). Review scope is area/facility context; exact schedules, fares, availability, forecasts and personal access needs remain unverified. Day structures and decision questions are original editorial proposals rather than copied operator itineraries. Readers must follow local guidance when weather or service disruption makes an outing inappropriate.

`scripts/check_planning_guides.py` runs in Phase 2 and checks the four built pages, both alternative plans, source links and review date, optimized image references, tools, internal entry points, language-specific safe search URLs and sitemap/alternate metadata. The updated launch-health inventory requires the corresponding deployment before it can pass in production.

### Tokyo Interest Guide: 2026-09-22

`/itinerary/tokyo-jimbocho-books-cafes/` and its `/ko` counterpart add a bookshop-and-cafe half-day, rather than another version of the general Tokyo itinerary. Readers choose one of two named starting points, decide what to remove from the existing course, browse with or without Japanese reading ability, and separate optional purchases from essential travel spending. One shop plus a rest is a complete plan; a second shop is optional. No visit, timed walk, stock check or cafe availability is claimed.

The venue/context sources are [GO TOKYO](https://www.gotokyo.org/en/destinations/central-tokyo/kanda-and-jimbocho/index.html), Jimbocho Book Center's [cafe](https://www.jimbocho-book.jp/cafe/) and [access](https://www.jimbocho-book.jp/access/) pages, [Tokyodo's store guide](https://www.tokyodo-web.co.jp/floor/), and [Tokyo Metro's Jimbocho guide](https://www.tokyometro.jp/lang_en/station/jimbocho/index.html), opened directly on 2026-09-22. They support the district character, venue identity and addresses, not date-specific menus, seats, opening hours or accessibility guarantees. The route and browsing prompts are original editorial suggestions. The existing Tokyo AI cover is reused and is not presented as an image of these bookshops.

Both homepages, itinerary hubs, Tokyo 4-day courses and Tokyo/Osaka comparisons link to the new guide in their own language. The article links back to the finder, Tokyo course, comparison and budget guide. Search/save scope remains the original five-card explorer. `scripts/check_planning_guides.py` now covers all six planning-guide pages, including this pair's incoming links, primary sources, reciprocal language metadata and generic Tokyo `/go` links. GSC and launch-health inventories include the new URLs, but deployment is still a separate step.

Local validation on 2026-09-22 passed all Phase 1-5 checks, the strict Hugo build and `git diff --check`. Browser checks covered both Jimbocho pages at 1440px, 390px and 320px: images decoded, tables stayed within the viewport and contents links cleared the header. Homepage entry links and context-preserving language switching worked. Both pages remained readable without JavaScript, and print styles retained sources and the planning disclaimer while hiding navigation, artwork and tools. This verifies local implementation, not production availability or indexing.

### Osaka Interest Guide: 2026-09-22

`/itinerary/osaka-doguyasuji-kitchenware-walk/` and its `/ko` counterpart add a Namba half-day around tableware and food models. The article separates browsing from a confirmed making session, gives optional observation prompts and a purchase/packing checklist, and identifies the shopping block to replace. It is not a new city itinerary, firsthand review, product ranking or promise of workshop places. This topic fills an editorial gap; no measured search demand or traffic gain is claimed.

The [shopping street](https://www.doguyasuji.or.jp/), its [Kyoya listing](https://www.doguyasuji.or.jp/shop/kyouya/), [access guide](https://www.doguyasuji.or.jp/access/), [experience guide](https://www.doguyasuji.or.jp/experience/) and [Design Pocket's own site](https://www.designpocket.net/) were opened directly on 2026-09-22. They support area character, store identity and activity information, not travel-date availability, hours, product suitability or participation eligibility. No schedules, prices, source photographs, event promotions or ratings are copied into the guide. The existing Osaka AI illustration remains visibly labeled as a conceptual scene, not either shop.

Entry points include both homepages, itinerary hubs, Osaka 4-day courses, Fukuoka/Osaka comparisons and Jimbocho guides. The new pair links back to related courses, the budget guide and the language-specific finder; generic `/go` search parameters remain unchanged. The five-card search/save scope, backend and commercial behavior are untouched. The planning-guide validator covers all eight built pages, their source links, safe CTAs, incoming links and language metadata. GSC and launch-health inventories are updated for the next authorized deployment, not evidence of a live release.

Local checks on 2026-09-22 passed Phase 1-5, the strict Hugo build and `git diff --check`. Browser QA covered both Doguyasuji pages at 1440px, 390px and 320px: images loaded, three tables stayed within the viewport and contents jumps cleared the header. Homepage entry and language switching retained the selected article. Both pages remained readable without JavaScript; print styles kept source links and disclaimers while hiding navigation, art and tools. No production API requests, remote click reports, commit or deployment were part of this validation.

### Dazaifu Day-Choice Guide: 2026-09-22

`/itinerary/fukuoka-dazaifu-shrine-museum-day/` and its `/ko` counterpart answer a gap deliberately left out of the city-focused weekend: when to replace that day with Dazaifu. The article compares shrine-first, museum-first and staying in Fukuoka, distinguishes the national museum from the shrine's museum, and includes return-journey, ticket-scope and night-before checks. It does not make the existing city course longer or present a day trip as an easier default for parents. This is an editorial choice, not evidence of measured demand.

Dazaifu Tenmangu's [first-visit](https://www.dazaifutenmangu.or.jp/en/plan/first-time-visitors/), [nearby-attractions](https://www.dazaifutenmangu.or.jp/en/plan/dazaifu-sightseeing/) and [access](https://www.dazaifutenmangu.or.jp/en/plan/getting-to-dazaifu-tenmangu/) pages, plus Kyushu National Museum's [homepage](https://www.kyuhaku.jp/en/), [FAQ](https://www.kyuhaku.jp/en/visit/visit_qanda.html) and [visit guidance](https://www.kyuhaku.jp/en/visit/visit_top.html), were opened directly on 2026-09-22. They support place identity, context and planning references, not confirmed travel-date operation. No source photographs, timetables, fares or admission prices are republished. The existing Fukuoka AI artwork is labeled as conceptual, not a shrine or museum photograph.

Both homepages, itinerary hubs, Fukuoka weekend guides and parents courses link to the new pair. Each article connects back to the city course, hotel-area, rain-plan, parents and budget guides and its language's finder. The five-card explorer scope and all API, gateway, cache, click-logging and commercial behavior remain unchanged. The planning-guide validator now covers ten pages, including the two alternatives, sources, localized search links, incoming links and language metadata. Updated GSC and launch-health inventories require a separate authorized deployment before production checks can pass.

Local checks on 2026-09-22 passed Phase 1-5, the strict Hugo build and `git diff --check`. Browser QA covered both Dazaifu pages at 1440px, 390px and 320px: images decoded, three tables stayed within the viewport and contents jumps cleared the header. Homepage entry and language switching retained the article. Both pages remained readable without JavaScript; print styles kept all six source links and the planning disclaimer while hiding navigation, artwork and tools. No production API requests, remote click reports, commit or deployment were part of this validation.

### Kiyosumi-Shirakawa Interest Guide: 2026-09-22

`/itinerary/tokyo-kiyosumi-shirakawa-garden-art-coffee/` and its `/ko` counterpart offer a garden-and-cafe or exhibition-and-cafe alternative to the existing Tokyo shopping and Jimbocho half-days. The break counts as one of the two choices. Looking prompts, a closure/weather decision, ticket-scope checks and explicit omissions help readers choose a smaller outing, not another mandatory district. This fills an editorial gap, not a measured traffic opportunity or a firsthand recommendation.

The [GO TOKYO area guide](https://www.gotokyo.org/en/destinations/eastern-tokyo/kiyosumi-shirakawa/index.html), [Kiyosumi Gardens](https://www.tokyo-park.or.jp/park/kiyosumi/), MOT's [exhibitions](https://www.mot-art-museum.jp/en/exhibitions/) and [visitor information](https://www.mot-art-museum.jp/en/guide/museum-info/), and [Tokyo Metro's station page](https://www.tokyometro.jp/lang_en/station/kiyosumi-shirakawa/index.html) were opened directly on 2026-09-22. Review scope is area/venue identity and places to verify a visit. The pages do not reproduce prices, schedules, source photos or temporary exhibition lists. No cafe, seat, travel-date operation or accessibility condition was confirmed. The existing Tokyo AI illustration remains labeled as a conceptual street, not the garden, museum or a particular cafe.

Both homepages, itinerary hubs, Tokyo four-day guides and Jimbocho guides link to the new pair. Each links to its language's finder, Tokyo comparison and budget guide. The planning validator now covers twelve pages with source links, reciprocal language metadata, imagery, safe generic `/go` queries and incoming links. GSC and launch-health inventories are prepared for a separately authorized deployment. The five-card search/save scope and all API, gateway, cache, click logging and commercial behavior remain unchanged.

Local validation on 2026-09-22 passed Phase 1-5, the strict Hugo build and `git diff --check`. Browser QA covered both new pages at 1440px, 390px and 320px: images decoded, three tables fit the viewport and contents links cleared the header. Homepage entry and language switching preserved the article. Both pages remained readable without JavaScript; print styles retained all five source links and the planning disclaimer while hiding navigation, artwork and tools. No production API requests, remote click reports, commit or deployment were performed.

### Nara Day-Choice Guide: 2026-09-22

`/itinerary/osaka-to-nara-temple-park-day/` and its `/ko` counterpart turn a previously mentioned side-trip alternative into a concrete, small day. Readers compare Nara with Kyoto and staying in Osaka, replace Day 3, distinguish Kintetsu-Nara from JR Nara, and choose Todaiji as the main visit. The park segment is adjustable and feeding deer is not required. The content is an editorial choice, not evidence of measured search demand, a tested route or a risk-free family trip.

The six linked sources were opened directly on 2026-09-22: Visit Nara's [park area](https://www.visitnara.jp/destinations/area/nara-park/), [transport overview](https://www.visitnara.jp/travel-to-nara/) and [deer guidance](https://www.visitnara.jp/venues/S01487/), plus Todaiji's [access](https://www.todaiji.or.jp/en/access/), [admission guidance](https://www.todaiji.or.jp/en/information/haikan/) and [Great Buddha Hall introduction](https://www.todaiji.or.jp/en/information/daibutsuden/). They support context, identity and places to recheck a visit, not travel-date operation. No source photographs, fixed journey times, current fares, opening schedules or animal-encounter promises are republished.

The pair has a new Codex-generated park illustration with localized AI labels, responsive WebP renditions and matching JPEG social previews. Its imagined scene is not a temple photograph, an exact park map or evidence of accessible paths. The generation and corrective-edit prompts are recorded in [Generated Travel Artwork](generated-art.md). Its cover-only entry does not expand the five-card homepage search/save scope.

Both homepages, itinerary hubs, Osaka four-day courses and Osaka/Kyoto comparison guides link to the pair. The pages link back to related courses, the budget guide and the language-specific finder. Generic hotel searches use `destination=osaka`; activity searches use `destination=nara`, with `country=japan` and the page language. No API, gateway, cache, D1 or `/go` behavior changes. Tests and the GSC/launch-health inventory cover these URLs for a separately authorized release.

Local checks on 2026-09-22 passed Phase 1-5, the strict Hugo build and `git diff --check`. Browser QA covered both Nara guides at 1440px, 390px and 320px: the new cover decoded and was visually inspected, three tables fit the viewport, and contents jumps cleared the header. Homepage entry and language switching preserved the article. Both pages remained readable without JavaScript; print styles kept all six source links and the planning disclaimer while hiding navigation, artwork and tools. No production API calls, remote click reports, commit or deployment were performed.

### Arrival and Departure Guide: 2026-09-23

`/itinerary/japan-arrival-departure-day-plan/` and its `/ko` counterpart add a reusable first/last-day checklist to the three city courses. Readers separate bag storage from early check-in, ask the hotel about collection and delayed arrival, include the luggage detour when working backward from airline guidance, and retain one optional meal or walk. A private planning-note table and a budget comparison make the guide useful without live data or another attraction. This is an editorial gap, not evidence of measured search demand.

The [Fukuoka](https://www.fukuoka-airport.jp/en/access/), [Haneda](https://tokyo-haneda.com/en/access/index.html) and [Narita](https://www.narita-airport.jp/en/access/) airport references were opened directly on 2026-09-22. Their scope is access-reference context, not travel-date schedules, airport-arrival advice or storage confirmation. Attempts to retrieve Kansai/JR references failed, so no operator-specific Osaka route is asserted. The guide tells readers to check their own airline and actual route. No fixed departure-time formula, hotel storage promise, source photograph or fare is published. The existing luggage/planning AI cover is reused with its visible illustration label.

Both homepages and itinerary hubs link to the pair. Each of the three EN/KO city courses links from its final day, and the new guide links back to those courses, the Fukuoka hotel-area guide, budget guide and language-specific finder. Three generic hotel searches use stable city slugs and the correct language. The planning and discovery validators cover the pair; GSC and launch-health inventories are prepared for a separately authorized release. No API, gateway, D1, KV, finder, redirect or affiliate behavior changed.

Local validation on 2026-09-23 passed all Phase 1-5 checks, the strict Hugo build and `git diff --check`. The generated inventory contains 50 monitored pages, with 16 supplemental planning-guide pages. Browser QA covered both new pages at 1440px, 390px and 320px: artwork decoded, three tables fit and contents jumps cleared the header. Homepage links and language switching preserved the article. Both pages remained readable without JavaScript; print styling kept all three source links and the planning disclaimer while hiding navigation, artwork and tools. The browser reported a missing local favicon, unrelated to this content change. No production API calls, remote click queries, commit or deployment were performed.

### Existing Checks

`scripts/check_courses.py` is included in `bash scripts/check_phase2.sh`. It checks course-first ordering in both homepages, all five guide pairs, local optimized photos and credits, source links, day-by-day sections, related-course links and language-correct `/go` links. `scripts/check_discovery.py` additionally checks both complete itinerary libraries, direct header links, localized sharing metadata, local image renditions and reciprocal preview images. The existing content and GSC validators cover canonical URLs, reciprocal alternates, internal anchors and sitemap inventory. No provider, API schema or finder behavior changes are part of parity work.

Local browser QA on 2026-09-12 covered both homepages at 1440px, 390px and 320px, and all ten detailed guide URLs at 1440px and 320px. Images decoded successfully, pages had no horizontal overflow, and contents shortcuts cleared the sticky header. Interest filters, English/Korean search, save/unsave across languages and guide pages, zero-result reset and no-JavaScript reading were exercised. Parent-guide print samples in both languages retained source credits and the booking disclaimer. These are local checks, not production deployment evidence or a guarantee for every browser.
