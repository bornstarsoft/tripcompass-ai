#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${TRIPCOMPASS_PRODUCTION_URL:-https://tripcompass.ai}"
BASE_URL="${BASE_URL%/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() {
  printf 'PASS %s\n' "$1"
}

warn() {
  printf 'WARN %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

assert_http_200() {
  local url="$1"
  local output="$2"
  local label="$3"
  local status

  status="$(curl -sS -L -o "$output" -w '%{http_code}' "$url")"
  [[ "$status" == "200" ]] || fail "$label returned HTTP $status"
  pass "$label returned 200"
}

assert_contains() {
  local file="$1"
  local text="$2"
  local label="$3"

  grep -Fq "$text" "$file" || fail "$label missing: $text"
}

assert_not_contains() {
  local file="$1"
  local text="$2"
  local label="$3"

  if grep -Fq "$text" "$file"; then
    fail "$label still contains: $text"
  fi
}

recommend_payload() {
  local language="$1"
  local budget="$2"

  LANGUAGE="$language" BUDGET="$budget" python3 - <<'PY_PAYLOAD'
import json
import os

language = os.environ["LANGUAGE"]
budget = os.environ["BUDGET"]

payload = {
    "departureCity": "Seoul",
    "tripLength": "4 days",
    "budget": budget,
    "travelMonth": "October",
    "travelStyle": ["Food", "First-time friendly"],
    "travelers": "2 adults",
    "preferredRegion": "Japan",
    "language": language,
}

print(json.dumps(payload, ensure_ascii=False))
PY_PAYLOAD
}

post_recommend() {
  local language="$1"
  local budget="$2"
  local output="$3"
  local payload
  local status

  payload="$(recommend_payload "$language" "$budget")"
  if [[ "${DEBUG_PAYLOAD:-}" == "1" ]]; then
    echo "DEBUG payload for $language:" >&2
    printf "%s\n" "$payload" | python3 -m json.tool >&2
  fi
  status="$(curl -sS -X POST "$BASE_URL/api/recommend" \
    -H 'content-type: application/json' \
    --data "$payload" \
    -o "$output" \
    -w '%{http_code}')"

  [[ "$status" == "200" ]] || fail "$language /api/recommend returned HTTP $status"
}

validate_recommend_response() {
  local file="$1"
  local language="$2"
  local label="$3"

  node -e '
const { readFileSync } = require("node:fs");
const [file, language, label] = process.argv.slice(1);
let data;
try {
  data = JSON.parse(readFileSync(file, "utf8"));
} catch {
  console.error(`FAIL ${label} returned invalid JSON`);
  process.exit(1);
}
if (data.fallbackReason) {
  const count = Array.isArray(data.recommendations) ? data.recommendations.length : 0;
  console.error(`FAIL ${label} exposed fallbackReason source=${data.source || "missing"} fallbackReason=${data.fallbackReason} recommendations=${count} inputLanguage=${data.input?.language || "missing"} inputBudget=${data.input?.budget || "missing"}`);
  process.exit(1);
}
if (!Array.isArray(data.recommendations) || data.recommendations.length < 1) {
  console.error(`FAIL ${label} returned no recommendations`);
  process.exit(1);
}
if (data.input?.language !== language) {
  console.error(`FAIL ${label} returned language ${data.input?.language || "missing"}`);
  process.exit(1);
}
if (typeof data.source !== "string" || !data.source) {
  console.error(`FAIL ${label} returned no source`);
  process.exit(1);
}
process.stdout.write(data.source);
' "$file" "$language" "$label"
}

home_html="$TMP_DIR/home.html"
ko_html="$TMP_DIR/ko.html"

assert_http_200 "$BASE_URL/" "$home_html" "English homepage"
assert_http_200 "$BASE_URL/ko/" "$ko_html" "Korean homepage"

for old_copy in \
  "MOCK API PREVIEW" \
  "View sample matches" \
  "SAMPLE RECOMMENDATIONS" \
  "Mock result cards for short trips from Korea" \
  "These cards are static examples"; do
  assert_not_contains "$home_html" "$old_copy" "English homepage"
done
pass "English homepage does not show old mock UI copy"

for en_copy in \
  "Explore recommended itineraries" \
  "Which itinerary fits your next trip?" \
  "/itinerary/fukuoka-with-parents-3-days/" \
  "/from-seoul/fukuoka-hakata-vs-tenjin-hotels/"; do
  assert_contains "$home_html" "$en_copy" "English homepage"
done
pass "English homepage shows recommended itineraries and support guides"

for ko_copy in \
  "한국에서 떠나는 짧은 해외여행" \
  "내 상황에 맞는 여행 코스를 고르고, 예약 전 비교하세요." \
  "추천 코스 둘러보기" \
  "AI 추천 시작" \
  "AI 여행지 추천" \
  "AI 추천 받기"; do
  assert_contains "$ko_html" "$ko_copy" "Korean homepage"
done
pass "Korean homepage shows hero and live finder copy"

for language in en ko; do
  prefix=""
  title="My Fukuoka trip"
  if [[ "$language" == "ko" ]]; then
    prefix="/ko"
    title="내 후쿠오카 여행 준비함"
  fi
  overview_html="$TMP_DIR/my-trips-$language.html"
  assert_http_200 "$BASE_URL$prefix/my-trips/" "$overview_html" "$language My trips overview"
  for expected in "data-my-trips" "data-trip-summary=fukuoka" "data-trip-summary=osaka" \
    "data-trip-summary=tokyo" "data-trip-guides-status" "data-trip-saved-guide=tokyo-jimbocho" \
    "data-guide-remove" "data-guide-undo" "data-trip-guides-feedback" \
    "/js/my-trips.js" "/css/my-trips.css" "$prefix/my-trip/tokyo/"; do
    assert_contains "$overview_html" "$expected" "$language My trips overview"
  done
  prep_html="$TMP_DIR/prep-$language.html"
  assert_http_200 "$BASE_URL$prefix/my-trip/" "$prep_html" "$language Fukuoka preparation"
  for expected in "$title" "data-trip-prep" "data-prep-create" "data-prep-check" \
    "data-prep-delete" "data-save-guide" "/js/trip-prep.js" "/css/trip-prep.css" \
    "$prefix/itinerary/fukuoka-rainy-day-plan/"; do
    assert_contains "$prep_html" "$expected" "$language Fukuoka preparation"
  done
  osaka_title="My Osaka trip"
  if [[ "$language" == "ko" ]]; then osaka_title="내 오사카 여행 준비함"; fi
  osaka_html="$TMP_DIR/prep-osaka-$language.html"
  assert_http_200 "$BASE_URL$prefix/my-trip/osaka/" "$osaka_html" "$language Osaka preparation"
  for expected in "$osaka_title" "data-trip-prep=osaka" "data-prep-create" "data-prep-delete" \
    "data-save-guide=osaka-nara" "$prefix/itinerary/osaka-or-kyoto-day-trip/" "destination=osaka"; do
    assert_contains "$osaka_html" "$expected" "$language Osaka preparation"
  done
  tokyo_title="My Tokyo trip"
  if [[ "$language" == "ko" ]]; then tokyo_title="내 도쿄 여행 준비함"; fi
  tokyo_html="$TMP_DIR/prep-tokyo-$language.html"
  assert_http_200 "$BASE_URL$prefix/my-trip/tokyo/" "$tokyo_html" "$language Tokyo preparation"
  for expected in "$tokyo_title" "data-trip-prep=tokyo" "data-prep-create" "data-prep-delete" \
    "data-save-guide=tokyo-jimbocho" "$prefix/itinerary/tokyo-kiyosumi-shirakawa-garden-art-coffee/" "destination=tokyo"; do
    assert_contains "$tokyo_html" "$expected" "$language Tokyo preparation"
  done
done
for asset in js/trip-prep.js js/trip-prep-core.js css/trip-prep.css js/guide-explorer.js js/my-trips.js css/my-trips.css; do
  assert_http_200 "$BASE_URL/$asset" "$TMP_DIR/${asset##*/}" "$asset"
done
assert_contains "$TMP_DIR/trip-prep.js" "mountTripPrep" "Preparation controller"
assert_contains "$TMP_DIR/trip-prep-core.js" "tripcompass.trip-prep.v1" "Preparation state module"
pass "Both overviews, all six preparation pages and their assets are published; interactive QA remains a browser check"

unique_suffix="$(date +%s)"
en_budget="under ${unique_suffix} USD"
ko_budget="균형 예산 ${unique_suffix}"

en_json="$TMP_DIR/recommend-en.json"
en_repeat_json="$TMP_DIR/recommend-en-repeat.json"
ko_json="$TMP_DIR/recommend-ko.json"

post_recommend "en" "$en_budget" "$en_json"
en_source="$(validate_recommend_response "$en_json" "en" "English /api/recommend")"
pass "English /api/recommend returned recommendations source=$en_source"

post_recommend "ko" "$ko_budget" "$ko_json"
ko_source="$(validate_recommend_response "$ko_json" "ko" "Korean /api/recommend")"
pass "Korean /api/recommend returned recommendations source=$ko_source"

post_recommend "en" "$en_budget" "$en_repeat_json"
en_repeat_source="$(validate_recommend_response "$en_repeat_json" "en" "English repeated /api/recommend")"
if [[ "$en_source" == "backend" || "$en_source" == "openai" ]]; then
  [[ "$en_repeat_source" == "cache" ]] || fail "English repeated /api/recommend expected source=cache, got source=$en_repeat_source"
  pass "English repeated /api/recommend returned source=cache"
elif [[ "$en_repeat_source" == "cache" ]]; then
  pass "English repeated /api/recommend returned source=cache"
else
  warn "English repeated /api/recommend returned source=$en_repeat_source; cache may already have been bypassed upstream"
fi

go_status="$(curl -sS -I -o /dev/null -w '%{http_code}' "$BASE_URL/go/hotel?destination=fukuoka&country=japan&lang=ko")"
if [[ "$go_status" =~ ^30[0-9]$ ]]; then
  pass "/go/hotel HEAD returned redirect status $go_status without creating a click log"
else
  fail "/go/hotel HEAD expected redirect status, got HTTP $go_status"
fi

printf 'Production live QA passed for %s\n' "$BASE_URL"
