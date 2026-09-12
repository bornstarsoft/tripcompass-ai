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

## Trip Decision Board

The [trip decision board](/decision-board/) calculates costs and time estimates in your browser without sending its input fields to the AI API. "Save on this device" stores a snapshot in this browser's localStorage; resetting the board removes that saved snapshot. On a shared device, other people using the same browser profile may be able to view it.

Share links contain the entered costs, dates, and choices in the URL fragment (after `#`). The fragment is not sent in the page's HTTP request, but anyone with the full link can read the snapshot. Browser history and the service you use to send the link may retain it. Shared copies cannot be revoked by resetting your local board. Edits do not synchronize between people; create a new link to share updated inputs. Existing `/go` click logging still applies to booking/search links.

## Service Providers

Cloudflare hosts the site, processes requests, and provides the cache and click-log storage. OpenAI processes recommendation requests sent through the gateway. These providers may retain service or security data under their own policies; this page does not promise zero retention by those providers.

## External Sites

Search buttons currently open Google search results using the destination or route in the link. External search and booking sites have their own privacy policies and terms. TripCompass AI does not receive your payment details or booking confirmation from these searches.

## Contact

See the [contact page](/contact/) for the current availability of a service support channel.
