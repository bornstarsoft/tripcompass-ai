# TripCompass AI — Agent Instructions

## Project goal
Build TripCompass AI as an AI destination finder, trip planner, and travel decision engine.

## Tech stack
- Hugo static site
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1 for click logs
- Cloudflare KV for recommendation caching
- Shared Cloudflare Worker AI Gateway for OpenAI recommendations

## Rules
- Do not add API keys or secrets to the repository.
- Do not use external paid APIs unless explicitly requested.
- Keep the first MVP simple, fast, mobile-friendly, and SEO-friendly.
- The site should work without affiliate approvals.
- Booking links should go through `/go/...` routes so clicks can be tracked and partners can be changed later.
- AI results must include a disclaimer that users should verify prices, opening hours, visa rules, availability, and booking terms.
- Do not claim real-time prices unless a verified real-time API is integrated.
- Use English as the main language and maintain the live Korean finder and guides under `/ko/`.

## Current implementation
- English and Korean destination recommendations are live; itinerary pages remain written planning guides.
- Pages uses AI_BACKEND_URL to reach the shared gateway. Keep provider secrets server-side.
- Preserve optional KV caching and GET-only D1 click logging when editing content.
- MVP_PLAN.md preserves the original phase sequence; read its current-status note before interpreting future-tense phase instructions.
- This project's official remote is GitHub, as explicitly confirmed by the owner.
