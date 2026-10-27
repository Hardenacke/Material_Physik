-- Pro DO genau ein Fach + Wettkampfversion + Wertungszeitraum.
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY, participant_id TEXT NOT NULL, alias TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('waiting','playing','finished')),
  started_at INTEGER NOT NULL, ended_at INTEGER, hard_end INTEGER NOT NULL,
  question_deadline INTEGER, score INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0),
  state_json TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_person ON attempts(participant_id)
  WHERE phase IN ('waiting','playing');
CREATE INDEX IF NOT EXISTS due_questions ON attempts(question_deadline) WHERE phase='playing';
CREATE INDEX IF NOT EXISTS due_attempts ON attempts(hard_end) WHERE phase IN ('waiting','playing');
CREATE TABLE IF NOT EXISTS best_scores (
  participant_id TEXT PRIMARY KEY, alias TEXT NOT NULL, attempt_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 0), max_points INTEGER NOT NULL,
  ended_at INTEGER NOT NULL, summary_json TEXT NOT NULL
);
-- Kein FK auf attempts: abgelaufene Detailversuche dürfen gelöscht werden,
-- während die freigegebene Bestwertzusammenfassung erhalten bleibt.
CREATE TABLE IF NOT EXISTS request_receipts (
  participant_id TEXT NOT NULL, request_id TEXT NOT NULL, operation TEXT NOT NULL,
  payload_hash TEXT NOT NULL, response_json TEXT NOT NULL, expires_at INTEGER NOT NULL,
  PRIMARY KEY(participant_id,request_id)
);
CREATE TABLE IF NOT EXISTS archive_outbox (
  revision INTEGER PRIMARY KEY, snapshot_json TEXT NOT NULL,
  due_at INTEGER NOT NULL, acknowledged_at INTEGER
);
