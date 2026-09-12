# Content-First Korean Pilot

## Scope

Implementation, not deployment. Upgrade three existing Korean URLs rather than adding near-duplicate search pages:

- `/ko/from-seoul/seoul-to-fukuoka-weekend-trip/`: Friday-evening arrival, one full day, two nights.
- `/ko/itinerary/seoul-to-osaka-4-day-itinerary/`: Osaka base, Kyoto as a replacement day rather than an extra stop.
- `/ko/itinerary/seoul-to-tokyo-4-day-itinerary/`: cafe/shopping interests, one neighborhood cluster per full day.

The Korean homepage puts these courses before the finder. The English homepage and English guides remain unchanged for this pilot. Existing paired URLs, canonical links and hreflang remain in place. The decision board remains available as a secondary tool; no additional decision-board development is included.

No AI/provider/API schema, `/go` behavior, D1, KV or environment settings change. Reading a course needs no JavaScript or AI request. AI still suggests destinations; it does not edit these itineraries. Booking links remain generic searches with stable English parameters and `lang=ko`; no affiliate IDs are introduced.

## Focused Support Guides

Two Korean-only additions answer different decisions, not keyword variants of the weekend course:

- `/ko/itinerary/fukuoka-with-parents-3-days/`: one outing per day, hotel rest, room needs and a park-or-shopping choice rather than both.
- `/ko/from-seoul/fukuoka-hakata-vs-tenjin-hotels/`: area selection by arrival plans, actual station exit and room conditions. No hotel ranking, live quote or area-filtered search is implied. The guide omits the park photograph because it does not illustrate either hotel area.

Both are linked from the Korean homepage, Fukuoka weekend course and relevant section hubs. Korean family and comparison pages link into the concrete courses; comparisons now use equal trip lengths and explicit omissions. English counterparts are not invented. Official Fukuoka airport, city and subway sources were checked on 2026-09-12 for terminal connections and area/facility context only; no accessibility or operating-time guarantee is made.

## Editorial Standard

Each course includes who it suits, day-by-day choices, omitted stops and why, hotel-area tradeoffs, weather/energy alternatives, budget categories, cautions and next steps. Sources checked on 2026-09-12 establish place/area context, not verified journey times, current fares, opening hours or inventory. The text is an editorial planning proposal, not a firsthand travel review.

Keep source checks scoped. Do not turn a content review date into an assertion that every linked service was freshly verified. Before expanding, check official area and operator information again; add actual firsthand evidence only when it exists. Do not publish invented restaurant experiences, ratings, guaranteed walking times, live prices or guaranteed entry/booking claims.

## Photo Provenance

Photo records and license links are in `data/courses.toml`, rendered with each use. Originals are local in `assets/img/courses/`. Hugo generates 480px and 960px WebP variants; the UI may crop for consistent framing. These historical photographs illustrate the places, not current operating conditions or a TripCompass visit. No external photo request is required at runtime.

- Fukuoka: [Ohori Park 20170505-1.jpg](https://commons.wikimedia.org/wiki/File:Ohori_Park_20170505-1.jpg), そらみみ, 2017-05-05. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Resized/reformatted versions remain under that license.
- Osaka: [Dotonbori 20230603.jpg](https://commons.wikimedia.org/wiki/File:D%C5%8Dtonbori_20230603.jpg), Nkon21, 2023-06-03. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- Tokyo: [Omotesando Avenue](https://commons.wikimedia.org/wiki/File:Omotesando_Avenue_at_sunset_from_pedestrian_bridge,_Jingumae,_Shibuya,_Tokyo.jpg), gog.creator, 2026-08-05. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Input asset is Wikimedia's 1280px rendition.

License grants apply to the photographs, not endorsements by the photographers or depicted businesses. Preserve attribution on future reuse. No claims of site-wide licensing changes are made.

## Measurement After Deployment

Record the deployment date and release commit first. The local source change alone is not a live launch. The production QA script now expects the content-first copy, so it will reject the old deployment until these changes are released.

1. Run all Phase 1-5 checks and the strict Hugo build, then production live QA after an authorized deployment.
2. Inspect the three updated existing URLs and the two support guides in GSC after deployment. The inventory is now 32 pages, including the earlier decision boards; existing course URLs have not moved.
3. Record GSC impressions/clicks and Cloudflare visits per course weekly. Compare equal windows; early indexing and reporting delays make the first days inconclusive.
4. Use `scripts/report_clicks.sh` for aggregate `/go` intent. Where D1 `referrer` includes a full same-origin path, inspect attribution to the three course paths; missing/origin-only referrers remain unattributed. Do not infer course-level click rates from aggregate destination totals. No new tracking events are added by this pilot.
5. Review at two and four weeks without treating those dates as indexing or traffic guarantees. Prioritize improvements to pages already receiving relevant impressions; inspect indexing and page quality before adding pages with no evidence of discovery. If visits appear without search clicks, review the usefulness and placement of the next step before increasing AI features.

| Week ending | Course path | GSC impressions | GSC clicks | Cloudflare visits | Attributable /go clicks | Unattributed clicks / caveats | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | | | | | | | |

Visits, GSC clicks and `/go` requests are different measurements. `/go` clicks are not completed bookings, commission or unique humans. Filters, bots, repeated clicks and reporting lag can affect comparisons. Real affiliate integration remains a separately approved step under `docs/affiliate-readiness.md`.

## Validation

`scripts/check_courses.py` is included in `bash scripts/check_phase2.sh`. It checks course-first ordering, the three existing courses and two support guides, local optimized photos and credits, source links, day-by-day sections, related-course links, safe `/go` links, and unchanged English content roles. The existing content and GSC validators cover canonical URLs, alternates, internal anchors and sitemap inventory.
