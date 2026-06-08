CREATE TABLE IF NOT EXISTS signal_cells (
  cell_id TEXT PRIMARY KEY,
  latitude INTEGER NOT NULL,
  longitude INTEGER NOT NULL,
  signal_count INTEGER NOT NULL DEFAULT 0,
  last_signal_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signal_cells_recent_count
ON signal_cells (last_signal_at DESC, signal_count DESC);
