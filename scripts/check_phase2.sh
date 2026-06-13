#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${TMPDIR:-/tmp}/tripcompass_phase2_public"

cd "$ROOT_DIR"
rm -rf "$OUT_DIR"
hugo --minify --panicOnWarning --destination "$OUT_DIR"
node scripts/check_phase2.mjs "$OUT_DIR"
