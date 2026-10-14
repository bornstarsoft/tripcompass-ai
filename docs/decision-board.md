# Trip Decision Board MVP

English: `/decision-board/`. Korean: `/ko/decision-board/`.

This is a client-side decision tool for two Japan destination options, not another AI call or a booking service. It uses the existing hero asset, language alternates and `/go` routes. No backend, gateway, D1 schema or KV configuration is changed.

## Calculations

- Currency is KRW only; no exchange-rate conversion or price feed is used.
- Airfare is a return fare per person. Hotel cost is per room per paid night. Other costs cover the whole group and trip.
- Blank optional amounts are unknown. Explicit zero is an entered zero cost. Cost comparisons and budget differences require all three categories for both options or the relevant option respectively. Even complete inputs are not verified quotes.
- Time uses naive Japan local clock values, independent of the viewer's timezone. It sums overlap with 08:00-22:00 after arrival and departure buffers (3 hours each by default, editable). It does not deduct meal times, local trips, or opening-hour restrictions. Actual sightseeing time is not guaranteed.
- Trips longer than 14 days, invalid dates, negative or oversized amounts, and duplicate city options are rejected. Hotel nights can differ from the calendar interval with a visible warning.
- Opinions are manually entered choices. Their priority labels never generate city ratings or inferred consensus. They are not authenticated votes.

## Storage and Sharing

Saving is explicit and uses `tripcompass.decision.v1` in localStorage. Reset removes that key. No account, automatic cloud storage, analytics event, or AI request is added.

Share URLs carry a validated versioned JSON snapshot in `#plan=...`. The fragment is not part of the HTTP request, but recipients, browser history and messaging providers can retain the full link. Only share intentionally; resetting cannot revoke another person's copy. There is no live collaboration or automatic return of a companion's choice. They must generate and send a new link to return changes. Costs, dates and choices cross language pages only in the fragment. Unknown fields are discarded; arbitrary text and URLs are not supported inputs.

An invalid shared snapshot opens blank defaults without overwriting the local saved copy. Edits invalidate a displayed share link. Missing storage or clipboard permissions do not prevent calculations or manual link copying.

## Verification

`bash scripts/check_phase2.sh` runs `scripts/check_decision.mjs` plus the existing generated-content and finder tests. Phase 5 validates the expanded GSC inventory of 34 clean page URLs (the original 28, two decision boards and four English/Korean support guides). Do not submit snapshot fragments to search engines.

Browser QA should exercise both locales, blank and partial costs, a complete group budget, overnight dates, changed city choices, save/reload/reset, language switching, valid/invalid shared links, unavailable storage/clipboard, and mobile layout. All fixtures must be synthetic, not current fare claims.
