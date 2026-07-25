#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${TRIPCOMPASS_PRODUCTION_URL:-https://tripcompass.ai}"
BASE_URL="${BASE_URL%/}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tripcompass_launch_health.XXXXXX")"
LIVE_SITEMAP="$TMP_DIR/sitemap.xml"
LISTED_OUTPUT="$TMP_DIR/listed-output.txt"
LISTED_URLS="$TMP_DIR/listed-urls.txt"
WITH_D1=false

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

case "${1:-}" in
  "")
    ;;
  --with-d1)
    WITH_D1=true
    ;;
  *)
    printf "Usage: bash scripts/check_launch_health.sh [--with-d1]\n" >&2
    exit 2
    ;;
esac

cd "$ROOT_DIR"

printf "== Production live QA ==\n"
bash scripts/check_production_live.sh

printf "\n== Production sitemap inventory ==\n"
curl -fsS "$BASE_URL/sitemap.xml" -o "$LIVE_SITEMAP"
bash scripts/list_gsc_urls.sh > "$LISTED_OUTPUT"
rg '^https://tripcompass\.ai/' "$LISTED_OUTPUT" > "$LISTED_URLS"

duplicate_urls="$(sort "$LISTED_URLS" | uniq -d)"
if [[ -n "$duplicate_urls" ]]; then
  printf "FAIL duplicate GSC inventory URLs found:\n%s\n" "$duplicate_urls" >&2
  exit 1
fi

page_count=0
while IFS= read -r url; do
  if [[ "$url" == "https://tripcompass.ai/sitemap.xml" ]]; then
    continue
  fi

  if ! rg -Fq "<loc>${url}</loc>" "$LIVE_SITEMAP"; then
    printf "FAIL production sitemap missing URL: %s\n" "$url" >&2
    exit 1
  fi

  page_count=$((page_count + 1))
done < "$LISTED_URLS"

if [[ "$page_count" -ne 28 ]]; then
  printf "FAIL expected 28 production page URLs, checked %s.\n" "$page_count" >&2
  exit 1
fi

printf "PASS production sitemap contains all %s monitored page URLs\n" "$page_count"

if [[ "$WITH_D1" == true ]]; then
  printf "\n== Aggregate D1 click report ==\n"
  bash scripts/report_clicks.sh
else
  printf "\nINFO D1 report skipped; rerun with --with-d1 after Cloudflare CLI authentication.\n"
fi

printf "Launch health check passed for %s\n" "$BASE_URL"
