# TripCompass AI — MVP Plan

## Tech stack
- Hugo static site
- GitHub repository
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1 for click logs later
- Cloudflare KV for cache later
- OpenAI API later
- No custom web server for MVP

## Phase 1: Static Hugo site
Create a Hugo site with custom lightweight layouts.

Required pages:
- /
- /destination-finder/
- /trip-planner/
- /compare/
- /compare/tokyo-vs-osaka/
- /compare/fukuoka-vs-osaka/
- /itinerary/tokyo-3-days/
- /itinerary/osaka-4-days/
- /from-seoul/
- /from-seoul/japan-3-day-trips/
- /ko/
- /about/
- /contact/
- /privacy/
- /terms/
- /affiliate-disclosure/

Homepage hero:
TripCompass AI
Find where to go, plan what to do, compare what to book.

Homepage should include:
- AI destination finder form UI
- Static mock result cards
- CTA buttons through /go/... links
- Clear disclaimer

## Phase 2: Mock API
Add Cloudflare Pages Functions:
- /api/recommend
- /api/itinerary

For now, return mock JSON. Do not call OpenAI yet.

## Phase 3: Link router
Add:
- /go/hotel?destination=fukuoka
- /go/flight?from=seoul&to=fukuoka
- /go/activity?destination=osaka
- /go/esim?country=japan

For now, redirect to safe generic search URLs.
Later these will become affiliate deep links.

## Phase 4: D1 click logging
Add db/schema.sql with a clicks table.
Assume future D1 binding name: DB.
If logging fails, users should still be redirected.

## Phase 5: OpenAI integration
Only after the static site, mock API, and /go/ router work:
- Use OPENAI_API_KEY from Cloudflare environment variables only
- Never expose API keys in browser JavaScript
- Return structured JSON
- Include disclaimers
- Keep fallback mock responses

## Phase 6: SEO content expansion
Add comparison, itinerary, and from-Seoul pages.

Initial content priorities:
1. Tokyo vs Osaka for first-time travelers
2. Fukuoka vs Osaka for a 3-day trip
3. Best 3-day trips from Seoul
4. Best weekend trips from Korea to Japan
5. Tokyo 3 day itinerary
6. Osaka 4 day itinerary
7. Fukuoka 3 day itinerary
8. Da Nang 4 day family itinerary
9. Japan trip budget from Seoul
10. Best short trips from Busan to Japan

## Build requirement
The project must build successfully with:

hugo --minify

## Cloudflare Pages settings
Framework preset: Hugo
Build command: hugo --minify
Build output directory: public
Production branch: main
