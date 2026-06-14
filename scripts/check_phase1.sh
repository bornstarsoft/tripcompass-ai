#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${TMPDIR:-/tmp}/tripcompass_phase1_public"

cd "$ROOT_DIR"
rm -rf "$OUT_DIR"
hugo --minify --destination "$OUT_DIR"

required_pages=(
  "index.html"
  "destination-finder/index.html"
  "trip-planner/index.html"
  "compare/index.html"
  "compare/tokyo-vs-osaka/index.html"
  "compare/fukuoka-vs-osaka/index.html"
  "itinerary/tokyo-3-days/index.html"
  "itinerary/osaka-4-days/index.html"
  "from-seoul/index.html"
  "from-seoul/japan-3-day-trips/index.html"
  "ko/index.html"
  "about/index.html"
  "contact/index.html"
  "privacy/index.html"
  "terms/index.html"
  "affiliate-disclosure/index.html"
  "robots.txt"
  "_routes.json"
  "js/language.js"
)

for page in "${required_pages[@]}"; do
  test -f "$OUT_DIR/$page" || {
    echo "Missing generated file: $page" >&2
    exit 1
  }
done

homepage="$OUT_DIR/index.html"
for text in \
  "TripCompass AI" \
  "Find where to go, plan what to do, compare what to book." \
  "AI destination finder" \
  "Fukuoka" \
  "Osaka" \
  "Tokyo" \
  "Da Nang" \
  "TripCompass AI provides planning suggestions. Always check current prices, opening hours, visa rules, availability, and booking terms before booking." \
  "/go/hotel?destination=fukuoka" \
  "/go/flight?from=seoul&amp;to=osaka" \
  "/go/activity?destination=tokyo" \
  "/go/esim?country=vietnam"; do
  grep -Fq "$text" "$homepage" || {
    echo "Homepage missing expected text: $text" >&2
    exit 1
  }
done

for text in \
  'data-language=en' \
  'data-language-switcher' \
  'data-language-suggestion' \
  'js/language.js' \
  'hreflang=en' \
  'hreflang=ko' \
  'hreflang=x-default' \
  '/ko/' \
  'lang=en'; do
  grep -Fq "$text" "$homepage" || {
    echo "Homepage missing Phase 5A language text: $text" >&2
    exit 1
  }
done

ko_page="$OUT_DIR/ko/index.html"
for text in \
  'lang=ko' \
  'data-language=ko' \
  'data-language-switcher' \
  'hreflang=en' \
  'hreflang=ko' \
  'hreflang=x-default'; do
  grep -Fq "$text" "$ko_page" || {
    echo "Korean page missing Phase 5A language text: $text" >&2
    exit 1
  }
done

locale_registry="$ROOT_DIR/data/locales.toml"
for code in en ko ja zh-tw vi th id; do
  grep -Fq "code = \"$code\"" "$locale_registry" || {
    echo "Locale registry missing code: $code" >&2
    exit 1
  }
done
grep -Fq 'path = "/ko/"' "$locale_registry" || {
  echo "Locale registry missing Korean path" >&2
  exit 1
}

grep -Fq '"/api/*"' "$OUT_DIR/_routes.json" || {
  echo "_routes.json missing /api/* include" >&2
  exit 1
}
grep -Fq '"/go/*"' "$OUT_DIR/_routes.json" || {
  echo "_routes.json missing /go/* include" >&2
  exit 1
}

if grep -R -E "sk-[A-Za-z0-9_-]{20,}" "$ROOT_DIR" \
  --exclude-dir=.git \
  --exclude-dir=public \
  --exclude-dir=resources \
  --exclude-dir=node_modules >/dev/null; then
  echo "Potential secret-like token found" >&2
  exit 1
fi
