#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tripcompass_gsc_inventory.XXXXXX")"
OUT_DIR="$WORK_DIR/public"
URL_OUTPUT="$WORK_DIR/gsc-urls.txt"
URLS_FILE="$WORK_DIR/urls.txt"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"

hugo --minify --panicOnWarning --destination "$OUT_DIR" >/dev/null
bash scripts/list_gsc_urls.sh > "$URL_OUTPUT"
rg '^https://tripcompass\.ai/' "$URL_OUTPUT" > "$URLS_FILE"

url_count="$(wc -l < "$URLS_FILE" | tr -d ' ')"
if [[ "$url_count" -ne 29 ]]; then
  printf "GSC inventory check failed: expected 29 listed URLs, found %s.\n" "$url_count" >&2
  exit 1
fi

duplicate_urls="$(sort "$URLS_FILE" | uniq -d)"
if [[ -n "$duplicate_urls" ]]; then
  printf "GSC inventory check failed: duplicate URLs found:\n%s\n" "$duplicate_urls" >&2
  exit 1
fi

sitemap="$OUT_DIR/sitemap.xml"
page_count=0

while IFS= read -r url; do
  if [[ "$url" == "https://tripcompass.ai/sitemap.xml" ]]; then
    continue
  fi

  if ! rg -Fq "<loc>${url}</loc>" "$sitemap"; then
    printf "GSC inventory check failed: URL missing from sitemap.xml: %s\n" "$url" >&2
    exit 1
  fi

  page_count=$((page_count + 1))
done < "$URLS_FILE"

if [[ "$page_count" -ne 28 ]]; then
  printf "GSC inventory check failed: expected 28 page URLs, checked %s.\n" "$page_count" >&2
  exit 1
fi

printf "GSC inventory check passed: %s page URLs match sitemap.xml.\n" "$page_count"
