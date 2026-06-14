#!/usr/bin/env bash
set -euo pipefail

DB_NAME="tripcompass-ai-db"

run_report() {
  local title="$1"
  local sql="$2"

  printf "\n== %s ==\n" "$title"
  wrangler d1 execute "$DB_NAME" --remote --command "$sql"
}

run_report "Latest 20 clicks" "SELECT id, type, destination, country, from_city, to_city, language, created_at FROM clicks ORDER BY created_at DESC LIMIT 20;"

run_report "Clicks by type" "SELECT COALESCE(type, 'unknown') AS type, COUNT(*) AS clicks FROM clicks GROUP BY type ORDER BY clicks DESC;"

run_report "Clicks by destination" "SELECT COALESCE(destination, 'unknown') AS destination, COUNT(*) AS clicks FROM clicks GROUP BY destination ORDER BY clicks DESC;"

run_report "Clicks by country" "SELECT COALESCE(country, 'unknown') AS country, COUNT(*) AS clicks FROM clicks GROUP BY country ORDER BY clicks DESC;"

run_report "Clicks by language" "SELECT COALESCE(language, 'unknown') AS language, COUNT(*) AS clicks FROM clicks GROUP BY language ORDER BY clicks DESC;"

run_report "Daily click counts" "SELECT date(created_at) AS click_date, COUNT(*) AS clicks FROM clicks GROUP BY date(created_at) ORDER BY click_date DESC LIMIT 30;"
