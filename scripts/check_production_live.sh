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

  node -e '
const [language, budget] = process.argv.slice(1);
process.stdout.write(JSON.stringify({
  departureCity: "Seoul",
  tripLength: "4 days",
  budget,
  travelMonth: "October",
  travelStyle: ["Food", "First-time friendly"],
  travelers: "2 adults",
  preferredRegion: "Japan",
  language
}));
' "$language" "$budget"
}

post_recommend() {
  local language="$1"
  local budget="$2"
  local output="$3"
  local payload
  local status

  payload="$(recommend_payload "$language" "$budget")"
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
  console.error(`FAIL ${label} exposed fallbackReason`);
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

for ko_copy in \
  "AI 여행지 추천 및 여행 계획" \
  "어디로 갈지 고르고, 일정을 계획하고, 예약 전 비교하세요." \
  "AI 추천 시작" \
  "AI 여행지 추천" \
  "AI 추천 받기"; do
  assert_contains "$ko_html" "$ko_copy" "Korean homepage"
done
pass "Korean homepage shows hero and live finder copy"

unique_suffix="tripcompass-live-$(date -u +%Y%m%dT%H%M%SZ)-$$"
en_budget="Production live QA ${unique_suffix} en"
ko_budget="Production live QA ${unique_suffix} ko"

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

go_status="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/go/hotel?destination=fukuoka&country=japan&lang=ko")"
if [[ "$go_status" =~ ^30[0-9]$ ]]; then
  pass "/go/hotel returned redirect status $go_status"
else
  fail "/go/hotel expected redirect status, got HTTP $go_status"
fi

printf 'Production live QA passed for %s\n' "$BASE_URL"
