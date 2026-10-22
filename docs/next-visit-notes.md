# Next-visit Notes

## Purpose and Scope

WORK-ID: MY-TRIPS-RETURN-NOTE. The owner authorized a small retention improvement and production deployment on 2026-10-23. This is an implementation/validation release, not evidence of increased return visits.

The hypothesis is that remembering an unfinished decision (for example, comparing cancellation terms at two hotels) makes the next visit useful. Each city in My trips has one small next-visit note, visible above the last-read guide and preparation list. The editor is collapsed until opened; saved text remains visible. The English and Korean homepages are unchanged, including their rendered HTML. No banner, notification permission, subscription, account or new AI request is added.

## Storage and Editing

- One optional localStorage key per city: `tripcompass.return-note.fukuoka.v1`, `.osaka.v1`, `.tokyo.v1`; each stores `{version: 1, text}`. Text is limited to 240 UTF-16 code units, matching native textarea maxlength. Whitespace at the edges is trimmed on explicit save.
- Both languages show the same user-written note; there is no translation call. Saved notes survive reload and later visits in that browser profile, not another device. A note can be saved before starting preparation.
- Visits do not write. Save note updates only that city; saving an empty note removes only its note key. Preparation, bookmarks, decision-board and reading data are untouched. Resetting a workspace intentionally does not delete its independent note.
- Drafts remain page-local until explicitly saved. Beforeunload is registered only while a draft differs from the loaded value, then removed after save/reload. The browser may warn about leaving; abrupt/mobile termination can still lose drafts. This is not a backup or cross-device synchronization.
- Clean editors refresh on relevant storage events and BFCache return. Dirty editors retain their draft, reject a save against a changed baseline, and offer Load saved note. That action explicitly replaces the draft with the current saved value. A failed write/delete preserves the draft for retry. Denied or malformed reads disable editing until a successful reload; unreadable records are not overwritten.
- Notes render with textContent/value, not HTML or generated URLs. No data is sent to AI, analytics or `/go`. The editor cautions against entering personal/booking/payment details; privacy documentation explains shared-browser visibility and deletion.

## Validation

`scripts/check_trip_notes.mjs` runs in Phase 2. It covers both languages, all cities, length limits, safe text, explicit save/delete, no visit writes, exact legacy-record preservation, failed read/write/delete, changed-note conflicts, cross-tab refresh and draft departure guards. Generated-page checks assert that only the overviews load the feature.

Browser release gates: EN/KO at 320/390/768/1440px; keyboard and touch save; reopening in the other language and after reload; saved-text preview; no horizontal overflow; 44px controls; cross-tab stale drafts and retry; invalid/blocked storage and no-JS; existing checklist/bookmark/reading undo regression tests. Physical-device/Safari and actual retention measurement must be reported separately.

Local Chromium QA on 2026-10-23 passed six city/language save flows, four widths in both languages, screenshot inspection, explicit deletion, literal HTML-like text, draft departure warning/cancel and byte-equivalent legacy records. Sixteen mobile failure/conflict/limit/no-JS cases passed. Six city/language regression flows passed checklist editing, saved-guide removal/undo, reading-position deletion plus language switch/reload/undo and semantic resume, with all notes preserved. Two actual-BFCache returns refreshed changed notes. No application errors or preparation API/search calls occurred. A previous task's temporary browser script was no longer present; a new regression fixture was created and run successfully instead. Physical-device/Safari and retention measurement are NOT_RUN.

## Follow-up Measurement

Do not add more homepage controls solely because this feature shipped. Ask a few travelers whether they can return to an unfinished decision without reconstructing it. Existing Web Analytics and aggregate `/go` reports cannot attribute return visits or conversions specifically to notes. Review that qualitative feedback and owner-provided aggregate traffic before expanding. No note contents should be collected for measurement.
