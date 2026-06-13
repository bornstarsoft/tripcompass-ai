# TripCompass AI — Agent Instructions

## Project goal
Build TripCompass AI as an AI destination finder, trip planner, and travel decision engine.

## Tech stack
- Hugo static site
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1 for click logs
- Cloudflare KV for cache later
- OpenAI API for AI recommendations later

## Rules
- Do not add API keys or secrets to the repository.
- Do not use external paid APIs unless explicitly requested.
- Keep the first MVP simple, fast, mobile-friendly, and SEO-friendly.
- The site should work without affiliate approvals.
- Booking links should go through `/go/...` routes so clicks can be tracked and partners can be changed later.
- AI results must include a disclaimer that users should verify prices, opening hours, visa rules, availability, and booking terms.
- Do not claim real-time prices unless a verified real-time API is integrated.
- Use English as the main language and prepare `/ko/` for Korean.
