---
title: "Privacy Policy"
description: "How TripCompass AI processes travel preferences, recommendation caching, language settings, and outbound search clicks."
eyebrow: "Privacy"
disclaimer: false
weight: 100
---

TripCompass AI currently offers a finder without account registration or payment checkout. This notice describes the data used by the finder and search links.

## Travel Preferences and AI Processing

Submitting the finder sends your departure city, trip length, budget style, travel period, interests, traveler group, preferred region, and language to TripCompass AI. When a cached result is not available, these preferences are passed through our Cloudflare-hosted AI gateway to OpenAI to generate recommendations.

Recommendations are cached in Cloudflare KV with a seven-day expiry. The cache key includes normalized travel preferences and language so matching requests can reuse a result. This is a cache lifetime, not a promise that every service provider deletes all related data after seven days. Do not enter names, passport details, booking references, payment information, or other sensitive information.

## Search Click Logs

When you click a hotel, flight, activity, or eSIM search link, TripCompass AI attempts to record the search type, destination, country, departure and arrival cities where supplied, language, referring page, browser user-agent, and timestamp in Cloudflare D1. These records help us understand search intent and check link performance. The click record does not include an IP address, though hosting providers may process network information to deliver and protect the service.

The application does not currently enforce automatic expiry for D1 click records. The seven-day recommendation cache expiry does not apply to click logs.

## Browser Settings

Your selected language and whether you dismissed the Korean-language suggestion are stored in this browser's local storage. You can remove these preferences by clearing site data. Browser language can be used to suggest Korean; it does not force a redirect.

## Saved Guides and Content Filters

Saving a guide stores only its guide identifier in this browser's localStorage. It does not create an account or download an offline copy. English and Korean versions share the saved list. You can remove an individual guide with its save button or clear site data to remove the list. People using the same browser profile may see these choices.

Guide search and interest filters run locally and do not send the search text or saved list to the AI API or a separate analytics service. Normal page requests still reach our hosting provider, and the existing click logging applies when you follow `/go/` booking-search links. If browser storage is blocked, saved choices last only on the current page.

## Fukuoka, Osaka and Tokyo Trip Preparation

The [My trips overview](/my-trips/) reads those three preparation records and the existing saved-guide list to display your choices, checks, next steps and bookmarked guides by city. Visiting does not write records. Explicitly removing a saved guide or undoing that removal changes only the existing bookmark list, never preparation or decision-board records. Undo is kept in page memory, without a timer, and is lost on reload or a fresh navigation. Removed shared guides affect all their cities. No contents are sent to a server. Unreadable or unavailable storage is shown as unavailable data, not an empty trip or saved list; failed edits are not reported as saved. The Korean overview at [/ko/my-trips/](/ko/my-trips/) uses the same records and opens Korean guides. Ordinary new guide visits start fresh; explicit Continue reading, context-bound reload and history restoration are described below. No offline copy is downloaded.

The My trips overview also lets you check or uncheck items for a trip already started in its workspace. Each edit changes only that item's boolean in the existing city record; it does not change your course, alternative, other trips, saved guides or decision board. It reads the latest record before editing, does not recreate a reset trip and does not overwrite unreadable records. Failed saves revert the displayed check to the readable saved value, or show the trip as unavailable. The same records are used in both languages and the preparation workspaces.

The [Fukuoka preparation workspace](/my-trip/), [Osaka preparation workspace](/my-trip/osaka/) and [Tokyo preparation workspace](/my-trip/tokyo/) each save your selected base course, one alternative and five checklist values in this browser after you start that trip. Changes are saved locally; no account, cloud synchronization, AI request or analytics event is created. No dates, names, booking references or free-text notes are collected by the workspace.

English and Korean use the same preparation state for each city on this browser profile. The three cities use separate records; starting, editing or resetting one does not migrate or delete either other city's preparation. People sharing that profile may see it. Resetting preparation removes only that city's storage key, not other trips, saved guides, language settings or decision-board data. Clearing site data removes all of these local choices. A storage failure is shown as page-only progress, not a successful save. Saved guides in all workspaces use the same bookmark list as the existing guide explorer.

Checklist marks are personal notes, not booking confirmations. Following a `/go` link still uses the search-click logging described above. The workspace does not send checklist values to those links.

## Guide Reading Position

When you leave or hide a preparation-context guide, the browser can save one latest reading record per city in separate localStorage keys, `tripcompass.reading.fukuoka.v1`, `tripcompass.reading.osaka.v1` and `tripcompass.reading.tokyo.v1`. Each contains the city/task identifier, course/alternative context, last-save time, checklist disclosure flags and a section or position anchor. It does not contain checklist answers, bookmarks, full browsing history or booking details. My trips shows the corresponding localized guide and task, with an explicit Continue reading link. A single-use sessionStorage handoff restores that position only after this action, on the matching guide within two minutes. No reading data is sent to a server or synced between devices. Normal hosting requests still occur.

Use Forget reading position on a city's overview to remove its reading record without changing preparation or bookmarks. Undo removal can restore that exact record for two minutes after deletion, including after reloading the same overview visit in the same tab. Reload never extends this deadline and does not restore the reading record automatically. One optional snapshot per city uses sessionStorage keys `tripcompass.reading-undo.<city>.v1`, with the deleted reading value, deletion time and a random history-entry marker. It is consumed on the next overview load; a valid pending undo can be saved again on departure with the original deadline. Expired snapshots are rejected, and a leftover snapshot may remain in tab storage until the next overview visit or the tab session ends. Ordinary navigation, language changes and Back/Forward visits do not transfer undo. No snapshot is sent to a server. Browser session restoration may retain tab storage, but the deadline and visit checks still apply. Blocked storage/history or abrupt termination can prevent reload recovery; immediate undo can still work while the page remains open. A newer reading record or a reset/changed preparation context prevents the older record from being restored. Failed deletion does not create an undo, and failed restoration can be retried within the original deadline. Clearing site data removes all reading records. Resetting preparation still removes only its preparation record: a reading record is hidden while preparation is absent or its course/alternative differs, and can become available again if the same choices are saved later. Storage failure or missing referrer can prevent resuming; the ordinary guide link remains usable. Shared browser profiles share these records. Closing a browser does not necessarily delete localStorage, and abrupt termination may lose the latest position.

When reading a guide from a preparation item, this tab can retain its expanded checklist state and reading position for reload, Back/Forward navigation and an explicit English/Korean language switch. The site uses browser history state, one temporary sessionStorage reload snapshot and one single-use language-switch snapshot. Reload state is linked to a local random visit marker; a language transfer is checked against the corresponding guide, referring page and a two-minute validity window. These snapshots do not contain preparation checks, saved-guide lists or booking information and are not sent to a server. They are not an account or cross-device reading history. A fresh visit does not resume an unrelated visit's position; blocked browser storage or missing referrer information can prevent language restoration. Clearing site data removes these snapshots, and ending the browser session may discard them.

## Trip Decision Board

The [trip decision board](/decision-board/) calculates costs and time estimates in your browser without sending its input fields to the AI API. "Save on this device" stores a snapshot in this browser's localStorage; resetting the board removes that saved snapshot. On a shared device, other people using the same browser profile may be able to view it.

Share links contain the entered costs, dates, and choices in the URL fragment (after `#`). The fragment is not sent in the page's HTTP request, but anyone with the full link can read the snapshot. Browser history and the service you use to send the link may retain it. Shared copies cannot be revoked by resetting your local board. Edits do not synchronize between people; create a new link to share updated inputs. Existing `/go` click logging still applies to booking/search links.

## Service Providers

Cloudflare hosts the site, processes requests, and provides the cache and click-log storage. OpenAI processes recommendation requests sent through the gateway. These providers may retain service or security data under their own policies; this page does not promise zero retention by those providers.

## External Sites

Search buttons currently open Google search results using the destination or route in the link. External search and booking sites have their own privacy policies and terms. TripCompass AI does not receive your payment details or booking confirmation from these searches.

## Contact

See the [contact page](/contact/) for the current availability of a service support channel.
