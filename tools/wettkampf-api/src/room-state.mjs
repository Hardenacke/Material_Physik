import { admission, createAttempt, settle, answer, openQuestion, view, summary, bestLeaderboard, RuleError } from './spiel.mjs';
import { availability } from './zeitraum.mjs';
import { HttpError, json, errorResponse, call } from './http.mjs';

const DAY = 86400000;
export class RoomState {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    this.sql.exec(`CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, person TEXT NOT NULL,
      phase TEXT NOT NULL, ended INTEGER, deadline INTEGER, data TEXT NOT NULL)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS attempts_person ON attempts(person)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS best (person TEXT PRIMARY KEY, data TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS counts (person TEXT PRIMARY KEY, count INTEGER NOT NULL, last_end INTEGER)');
    this.sql.exec(`CREATE TABLE IF NOT EXISTS receipts (key TEXT PRIMARY KEY, person TEXT NOT NULL,
      fingerprint TEXT NOT NULL, response TEXT NOT NULL, created INTEGER NOT NULL)`);
    this.sql.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)');
    this.sql.exec('INSERT OR IGNORE INTO schema_migrations VALUES (1)');
  }
  get(key) { const row = this.sql.exec('SELECT value FROM meta WHERE key = ?', key).toArray()[0]; return row ? JSON.parse(row.value) : null; }
  put(key, value) { this.sql.exec('INSERT OR REPLACE INTO meta VALUES (?, ?)', key, JSON.stringify(value)); }
  all() { return this.sql.exec('SELECT data FROM attempts').toArray().map(r => JSON.parse(r.data)); }
  load(id) { const row = this.sql.exec('SELECT data FROM attempts WHERE id = ?', id).toArray()[0]; return row ? JSON.parse(row.data) : null; }
  save(a) {
    const deadline = a.phase === 'finished' ? null : Math.min(a.hardEnd, a.current?.deadline ?? Infinity);
    this.sql.exec('INSERT OR REPLACE INTO attempts VALUES (?, ?, ?, ?, ?, ?)', a.id, a.participantId, a.phase, a.endedAt, deadline, JSON.stringify(a));
  }
  binding(p) {
    let meta = this.get('binding');
    if (!meta) {
      if (p.allowCreate === false) throw new HttpError(404, 'Für diesen Zeitraum gibt es keine gespeicherte Wertung.');
      meta = { config: p.config, bank: p.bank, configHash: p.configHash, bankHash: p.bankHash,
        period: p.period, instanceId: crypto.randomUUID(), revision: 0, archivedRevision: 0,
        final: false, archiveDue: null, control: null };
      this.put('binding', meta);
    }
    if (meta.configHash !== p.configHash || meta.bankHash !== p.bankHash) throw new HttpError(409, 'Definition verändert. Bitte eine neue Wettbewerbsversion verwenden.');
    meta.config.status = p.config.status;
    return meta;
  }
  finalize(a, meta, now) {
    const s = summary(a);
    const row = this.sql.exec('SELECT data FROM best WHERE person = ?', a.participantId).toArray()[0];
    const prev = row ? JSON.parse(row.data) : null;
    if (!prev || a.score > prev.score || (a.score === prev.score && a.endedAt < prev.endedAt)) {
      this.sql.exec('INSERT OR REPLACE INTO best VALUES (?, ?)', a.participantId, JSON.stringify(s));
      meta.revision++; meta.archiveDue ??= now + 15000;
    }
    this.sql.exec('UPDATE counts SET last_end = MAX(COALESCE(last_end, 0), ?) WHERE person = ?', a.endedAt, a.participantId);
  }
  advance(meta, now) {
    const closed = meta.control === 'closed' || availability(meta.config, now) === 'closed';
    for (const a of this.all()) {
      const was = a.phase;
      const changed = settle(a, now);
      if (closed && a.phase === 'waiting') {
        a.phase = 'finished'; a.endedAt = now; a.finishReason = 'closed';
      }
      if (changed || a.phase !== was) this.save(a);
      if (was !== 'finished' && a.phase === 'finished') this.finalize(a, meta, now);
    }
    const active = this.sql.exec("SELECT COUNT(*) AS n FROM attempts WHERE phase != 'finished'").one().n;
    if (!meta.final && (closed || (meta.period.endsAt !== null && now >= meta.period.endsAt)) && !active) {
      meta.final = true; meta.revision++; meta.archiveDue = now;
    }
    this.sql.exec('DELETE FROM receipts WHERE created < ?', now - DAY);
    this.sql.exec("DELETE FROM attempts WHERE phase = 'finished' AND ended < ?", now - 90 * DAY);
    this.put('binding', meta);
  }
  leaderboard() { return bestLeaderboard(this.sql.exec('SELECT data FROM best').toArray().map(r => JSON.parse(r.data))); }
  operate(p, meta, now) {
    if (p.action === 'leaderboard') return { serverNow: now, period: meta.period, leaderboard: this.leaderboard(),
      revision: meta.revision, archivedRevision: meta.archivedRevision,
      archiveState: this.env.ARCHIVE_MODE !== 'github' ? 'disabled' : meta.archivedRevision >= meta.revision ? 'synced' : 'pending' };
    if (p.action === 'status') return { revision: meta.revision, archivedRevision: meta.archivedRevision, final: meta.final,
      active: this.sql.exec("SELECT COUNT(*) AS n FROM attempts WHERE phase != 'finished'").one().n, control: meta.control };
    if (p.action === 'close') { meta.control = 'closed'; this.advance(meta, now); return { closed: true }; }
    if (p.action === 'current') {
      const row = this.sql.exec("SELECT data FROM attempts WHERE person = ? ORDER BY (phase != 'finished') DESC, rowid DESC LIMIT 1", p.person.id).toArray()[0];
      return row ? view(JSON.parse(row.data), now) : { serverNow: now, attempt: null };
    }
    if (p.action === 'start') {
      const effective = { ...meta.config, status: meta.control || meta.config.status };
      const own = this.sql.exec('SELECT data FROM attempts WHERE person = ?', p.person.id).toArray().map(r => JSON.parse(r.data));
      const result = admission(effective, own, p.person.id, now);
      if (result.kind === 'resume') return view(this.load(result.attemptId), now);
      if (p.period.id !== meta.period.id) throw new HttpError(409, 'Der Wertungszeitraum hat gewechselt.');
      const count = this.sql.exec('SELECT * FROM counts WHERE person = ?', p.person.id).toArray()[0];
      if (effective.attempts.maxPerPeriod !== null && (count?.count || 0) >= effective.attempts.maxPerPeriod) throw new HttpError(409, 'Alle Versuche sind ausgeschöpft.');
      if (now < (count?.last_end ?? -Infinity) + effective.attempts.cooldownSeconds * 1000) throw new HttpError(409, 'Bitte bis zum nächsten Versuch kurz warten.');
      const a = createAttempt(effective, meta.bank, p.person.id, p.person.alias, now);
      this.save(a);
      this.sql.exec('INSERT INTO counts VALUES (?, 1, NULL) ON CONFLICT(person) DO UPDATE SET count = count + 1', p.person.id);
      return view(a, now);
    }
    const a = this.load(p.attemptId);
    if (!a) throw new HttpError(404, 'Versuch nicht gefunden.');
    if (a.participantId !== p.person.id) throw new HttpError(403, 'Dieser Versuch gehört zu einem anderen Zugang.');
    const was = a.phase;
    if (p.action === 'next') openQuestion(a, now);
    else if (p.action === 'answer') answer(a, p.body.questionId, p.body.answerId, now);
    else if (p.action !== 'get') throw new HttpError(404, 'Unbekannte Aktion.');
    this.save(a);
    if (was !== 'finished' && a.phase === 'finished') this.finalize(a, meta, now);
    return view(a, now);
  }
  async plan() {
    const meta = this.get('binding'); if (!meta) return;
    const deadline = this.sql.exec('SELECT MIN(deadline) AS deadline FROM attempts').one().deadline;
    const end = !meta.final ? meta.period.endsAt : null;
    const archive = this.env.ARCHIVE_MODE === 'github' ? meta.archiveDue : null;
    const receiptCleanup = this.sql.exec('SELECT MIN(created) AS time FROM receipts').one().time;
    const attemptCleanup = this.sql.exec("SELECT MIN(ended) AS time FROM attempts WHERE phase = 'finished'").one().time;
    const next = Math.min(deadline ?? Infinity, end ?? Infinity, archive ?? Infinity,
      receiptCleanup === null ? Infinity : receiptCleanup + DAY + 1000,
      attemptCleanup === null ? Infinity : attemptCleanup + 90 * DAY + 1000);
    if (Number.isFinite(next)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next));
    else await this.ctx.storage.deleteAlarm();
  }
  async fetch(request) {
    try {
      const p = await request.json(); const now = Date.now();
      const result = this.ctx.storage.transactionSync(() => {
        const meta = this.binding(p); this.advance(meta, now);
        // Fachfehler werden als Ergebnis gespeichert; fällige Fristen bleiben committed.
        try {
          const receipt = p.key && this.sql.exec('SELECT * FROM receipts WHERE key = ?', p.key).toArray()[0];
          if (receipt) {
            if (receipt.person !== p.person.id || receipt.fingerprint !== p.requestHash) throw new HttpError(409, 'Idempotency-Key wurde bereits anders verwendet.');
            return { value: JSON.parse(receipt.response) };
          }
          const value = this.operate(p, meta, now);
          if (p.key) this.sql.exec('INSERT INTO receipts VALUES (?, ?, ?, ?, ?)', p.key, p.person.id, p.requestHash, JSON.stringify(value), now);
          this.put('binding', meta);
          return { value };
        } catch (error) {
          this.put('binding', meta);
          return { error: { status: error.status || (error instanceof RuleError ? (error.code === 'ANSWER' ? 400 : 409) : 503), message: error.message } };
        }
      });
      await this.plan();
      if (result.error) throw new HttpError(result.error.status, result.error.status === 503 ? 'Dienst vorübergehend nicht verfügbar.' : result.error.message);
      return json(result.value);
    } catch (error) { return errorResponse(error); }
  }
  async alarm() {
    this.ctx.storage.transactionSync(() => { const meta = this.get('binding'); if (meta) this.advance(meta, Date.now()); });
    const meta = this.get('binding');
    if (meta && this.env.ARCHIVE_MODE === 'github' && meta.archiveDue !== null && meta.archiveDue <= Date.now()) {
      const revision = meta.revision;
      const payload = { subject: 'physik', competitionId: meta.config.id, version: meta.config.version,
        period: meta.period.id, instanceId: meta.instanceId, revision, final: meta.final,
        configHash: meta.configHash, bankHash: meta.bankHash, createdAt: new Date().toISOString(), leaderboard: this.leaderboard() };
      try {
        // Writer bestätigt erst den tatsächlichen GitHub-Schreibvorgang.
        await call(this.env.ARCHIVE_WRITER, 'physik', { action: 'write', payload });
        const latest = this.get('binding'); latest.archivedRevision = Math.max(latest.archivedRevision, revision);
        latest.archiveDue = latest.revision > revision ? Date.now() + 60000 : null; this.put('binding', latest);
      } catch {
        const latest = this.get('binding'); latest.archiveDue = Date.now() + 60000; this.put('binding', latest);
      }
    }
    await this.plan();
  }
}
