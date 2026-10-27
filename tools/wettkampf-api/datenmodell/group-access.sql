CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY, alias TEXT NOT NULL, code_hash TEXT UNIQUE NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)), created_at INTEGER NOT NULL
);
-- IDs sind die privaten, freigegebenen Wettbewerbe dieser Lerngruppe.
CREATE TABLE IF NOT EXISTS memberships (
  competition_id TEXT NOT NULL, participant_id TEXT NOT NULL,
  PRIMARY KEY(competition_id,participant_id)
);
