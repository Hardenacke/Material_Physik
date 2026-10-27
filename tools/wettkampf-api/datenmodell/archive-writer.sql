CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS archive_jobs (
  target_path TEXT NOT NULL, instance_id TEXT NOT NULL, revision INTEGER NOT NULL,
  payload_hash TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL
    CHECK(status IN ('pending','writing','written','blocked')),
  attempts INTEGER NOT NULL DEFAULT 0, next_retry_at INTEGER NOT NULL,
  github_sha TEXT, last_error_code TEXT,
  PRIMARY KEY(target_path,instance_id,revision)
);
CREATE INDEX IF NOT EXISTS due_jobs ON archive_jobs(status,next_retry_at);
