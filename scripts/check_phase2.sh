#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${TMPDIR:-/tmp}/tripcompass_phase2_public"

cd "$ROOT_DIR"
rm -rf "$OUT_DIR"
hugo --minify --panicOnWarning --destination "$OUT_DIR"
node scripts/check_phase2.mjs "$OUT_DIR"
node scripts/check_finder_ui.mjs "$OUT_DIR"
node scripts/check_decision.mjs "$OUT_DIR"
node scripts/check_course_tools.mjs "$OUT_DIR"
node scripts/check_guide_explorer.mjs "$OUT_DIR"
node scripts/check_trip_prep.mjs "$OUT_DIR"
node scripts/check_my_trips.mjs "$OUT_DIR"
node scripts/check_saved_comparison.mjs "$OUT_DIR"
python3 scripts/check_my_trips_links.py "$OUT_DIR"
python3 scripts/check_trip_moments.py "$OUT_DIR"
node scripts/check_trip_moments.mjs "$OUT_DIR"
node scripts/check_trip_guide_return.mjs
node scripts/check_trip_guide_check.mjs
node scripts/check_trip_guide_history.mjs
node scripts/check_trip_guide_language.mjs
node scripts/check_trip_reading.mjs
node scripts/check_reading_undo.mjs
node scripts/check_trip_notes.mjs "$OUT_DIR"
python3 scripts/check_content.py "$OUT_DIR"
python3 scripts/check_courses.py "$OUT_DIR"
python3 scripts/check_discovery.py "$OUT_DIR"
python3 scripts/check_planning_guides.py "$OUT_DIR"
python3 scripts/check_plan_b.py "$OUT_DIR"
