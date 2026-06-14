#!/usr/bin/env bash
set -euo pipefail

print_group() {
  local title="$1"
  shift

  printf "\n## %s\n" "$title"
  printf "%s\n" "$@"
}

print_group "Sitemap" \
  "https://tripcompass.ai/sitemap.xml"

print_group "Homepage" \
  "https://tripcompass.ai/" \
  "https://tripcompass.ai/ko/"

print_group "Section hubs" \
  "https://tripcompass.ai/from-seoul/" \
  "https://tripcompass.ai/compare/" \
  "https://tripcompass.ai/itinerary/" \
  "https://tripcompass.ai/ko/from-seoul/" \
  "https://tripcompass.ai/ko/compare/" \
  "https://tripcompass.ai/ko/itinerary/"

print_group "English SEO landing pages" \
  "https://tripcompass.ai/from-seoul/japan-3-day-trips/" \
  "https://tripcompass.ai/compare/fukuoka-vs-osaka/" \
  "https://tripcompass.ai/compare/tokyo-vs-osaka/" \
  "https://tripcompass.ai/best-short-trips-from-korea/" \
  "https://tripcompass.ai/from-seoul/japan-travel-budget/" \
  "https://tripcompass.ai/from-seoul/seoul-to-fukuoka-weekend-trip/" \
  "https://tripcompass.ai/itinerary/seoul-to-osaka-4-day-itinerary/" \
  "https://tripcompass.ai/itinerary/seoul-to-tokyo-4-day-itinerary/" \
  "https://tripcompass.ai/from-seoul/best-japan-cities-first-time-travelers/" \
  "https://tripcompass.ai/best-short-family-trips-from-korea/"

print_group "Korean SEO landing pages" \
  "https://tripcompass.ai/ko/from-seoul/japan-3-day-trips/" \
  "https://tripcompass.ai/ko/compare/fukuoka-vs-osaka/" \
  "https://tripcompass.ai/ko/compare/tokyo-vs-osaka/" \
  "https://tripcompass.ai/ko/best-short-trips-from-korea/" \
  "https://tripcompass.ai/ko/from-seoul/japan-travel-budget/" \
  "https://tripcompass.ai/ko/from-seoul/seoul-to-fukuoka-weekend-trip/" \
  "https://tripcompass.ai/ko/itinerary/seoul-to-osaka-4-day-itinerary/" \
  "https://tripcompass.ai/ko/itinerary/seoul-to-tokyo-4-day-itinerary/" \
  "https://tripcompass.ai/ko/from-seoul/best-japan-cities-first-time-travelers/" \
  "https://tripcompass.ai/ko/best-short-family-trips-from-korea/"
