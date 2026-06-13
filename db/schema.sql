CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  destination TEXT,
  country TEXT,
  from_city TEXT,
  to_city TEXT,
  language TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks (created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_type ON clicks (type);
