import { HttpError, json, errorResponse } from './http.mjs';

const encode = value => btoa(Array.from(new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n'), b => String.fromCharCode(b)).join(''));
const decode = value => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0))));
const publicSnapshot = value => ({
  subject: value.subject, competitionId: value.competitionId, version: value.version,
  period: value.period, instanceId: value.instanceId, revision: value.revision,
  final: value.final, createdAt: value.createdAt,
  leaderboard: value.leaderboard.map(({ rank, alias, score, maxPoints, endedAt }) => ({ rank, alias, score, maxPoints, endedAt }))
});
const restrictToResults = env => env.ARCHIVE_REPOSITORY?.toLowerCase() === 'hardenacke/material_physik' || env.ARCHIVE_ALLOW_PUBLIC === 'true';
const resultPath = path => {
  if (typeof path !== 'string') return false;
  const match = /^ergebnisse\/(snapshots|perioden)\/[a-z0-9]+(?:-[a-z0-9]+)*\/v[1-9]\d*\/(?:gesamt|\d{4}-(?:0[1-9]|1[0-2]))\/(latest|final)\.json$/.exec(path);
  return !!match && (match[1] === 'snapshots' ? match[2] === 'latest' : match[2] === 'final');
};

export class ArchiveWriter {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS jobs (path TEXT PRIMARY KEY, instance TEXT NOT NULL,
      revision INTEGER NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, retry INTEGER NOT NULL)`);
    this.sql.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)');
    this.sql.exec('INSERT OR IGNORE INTO schema_migrations VALUES (1)');
  }
  async github(path, init = {}) {
    // Die Grenze gilt direkt vor jedem GitHub-Aufruf, auch bei direktem Methodenaufruf.
    const method = init.method || 'GET';
    if (!['GET', 'PUT'].includes(method) || (restrictToResults(this.env) && !resultPath(path)))
      throw new HttpError(403, 'GitHub-Zugriff außerhalb der Ergebnisdateien ist gesperrt.');
    const repository = this.env.ARCHIVE_REPOSITORY;
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !this.env.GITHUB_TOKEN) throw new HttpError(503, 'Archivzugang fehlt.');
    if (!this.repositoryVerified) {
      const check = await fetch(`https://api.github.com/repos/${repository}`, { signal: AbortSignal.timeout(10000), headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`, 'User-Agent': 'physik-wettkampf-api', 'Accept': 'application/vnd.github+json'
      } });
      const info = check.ok ? await check.json() : null;
      if (typeof info?.private !== 'boolean') throw new HttpError(503, 'Das Ergebnisrepository ist nicht erreichbar.');
      if (!info.private && this.env.ARCHIVE_ALLOW_PUBLIC !== 'true') throw new HttpError(503, 'Ein öffentliches Ergebnisarchiv benötigt ARCHIVE_ALLOW_PUBLIC=true.');
      this.repositoryVerified = true;
    }
    const url = `https://api.github.com/repos/${repository}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url + (init.method ? '' : `?ref=${encodeURIComponent(this.env.ARCHIVE_BRANCH || 'main')}`), {
      ...init, signal: AbortSignal.timeout(10000), headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`, 'User-Agent': 'physik-wettkampf-api',
        'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'
      }
    });
    if (response.status === 429 || (response.status === 403 && response.headers.has('retry-after'))) {
      const error = new HttpError(503, 'Das Archiv begrenzt momentan Anfragen.');
      const retry = response.headers.get('retry-after');
      error.retryAt = /^\d+$/.test(retry || '') ? Date.now() + Number(retry) * 1000 : Date.parse(retry);
      throw error;
    }
    return response;
  }
  async write(path, payload) {
    for (let conflict = 0; conflict < 3; conflict++) {
      const existing = await this.github(path);
      let sha;
      if (existing.ok) {
        const file = await existing.json(); const old = decode(file.content);
        if (old.instanceId !== payload.instanceId) throw new HttpError(409, 'Andere Archivinstanz am Zielpfad.');
        if (old.revision >= payload.revision) return;
        sha = file.sha;
      } else if (existing.status !== 404) throw new HttpError(503, 'Archiv momentan nicht erreichbar.');
      const result = await this.github(path, { method: 'PUT', body: JSON.stringify({
        message: `Physik: ${payload.competitionId}, ${payload.period}, Revision ${payload.revision}`,
        branch: this.env.ARCHIVE_BRANCH || 'main',
        content: encode(this.env.ARCHIVE_ALLOW_PUBLIC === 'true' ? publicSnapshot(payload) : payload), ...(sha ? { sha } : {})
      }) });
      if (result.ok) return;
      if (![409, 422].includes(result.status)) throw new HttpError(503, 'Archivschreibvorgang fehlgeschlagen.');
    }
    throw new HttpError(503, 'Archivkonflikt; erneuter Versuch folgt.');
  }
  paths(payload) {
    const restricted = restrictToResults(this.env);
    const prefix = this.env.ARCHIVE_PREFIX || (restricted ? 'ergebnisse' : 'architektur-v1');
    if (restricted && prefix !== 'ergebnisse') throw new HttpError(503, 'Dieses Repository erlaubt ausschließlich den Archivordner ergebnisse.');
    if (!/^[a-z0-9-]+$/.test(prefix) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.competitionId || '') ||
        !Number.isSafeInteger(payload.version) || payload.version < 1 ||
        !/^(gesamt|\d{4}-(0[1-9]|1[0-2]))$/.test(payload.period || '')) throw new HttpError(503, 'Ungültiger Archivpfad.');
    const stem = `${payload.competitionId}/v${payload.version}/${payload.period}`;
    return [`${prefix}/snapshots/${stem}/latest.json`, ...(payload.final ? [`${prefix}/perioden/${stem}/final.json`] : [])];
  }
  async drain() {
    for (const job of this.sql.exec("SELECT * FROM jobs WHERE state = 'pending' AND retry <= ? ORDER BY retry LIMIT 5", Date.now()).toArray()) {
      try {
        const payload = JSON.parse(job.payload);
        // Auch vor einer Zieländerung vorgemerkte Aufträge verwenden den aktuellen Ergebnisordner.
        const paths = this.paths(payload);
        const path = job.path.endsWith('/final.json') ? paths[1] : paths[0];
        if (!path) throw new HttpError(503, 'Ungültiger Archivauftrag.');
        await this.write(path, payload);
        this.sql.exec("UPDATE jobs SET state = 'done' WHERE path = ? AND revision = ?", job.path, job.revision);
      } catch (error) {
        this.sql.exec('UPDATE jobs SET state = ?, retry = ? WHERE path = ?', error.status === 409 ? 'blocked' : 'pending', Math.max(Date.now() + 900000, error.retryAt || 0), job.path);
      }
    }
    const next = this.sql.exec("SELECT MIN(retry) AS next FROM jobs WHERE state = 'pending'").one().next;
    if (next !== null) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next));
  }
  async fetch(request) {
      try {
        const p = await request.json();
        if (p.action === 'status') return json({ jobs: this.sql.exec('SELECT state, COUNT(*) AS count FROM jobs GROUP BY state').toArray() });
        const a = p.payload;
        if (p.action !== 'write' || !a) throw new HttpError(400, 'Ungültiger Archivauftrag.');
        const paths = this.paths(a);
        for (const path of paths) {
          const old = this.sql.exec('SELECT * FROM jobs WHERE path = ?', path).toArray()[0];
          if (old && old.instance !== a.instanceId) throw new HttpError(409, 'Archivinstanz stimmt nicht überein.');
          if (!old || old.revision < a.revision) this.sql.exec('INSERT OR REPLACE INTO jobs VALUES (?, ?, ?, ?, ?, ?)', path, a.instanceId, a.revision, JSON.stringify(a), 'pending', Date.now());
        }
        await this.runQueue();
        if (paths.some(path => this.sql.exec('SELECT state FROM jobs WHERE path = ?', path).one().state !== 'done')) throw new HttpError(503, 'Archivauftrag wartet auf Wiederholung.');
        return json({ archivedRevision: a.revision });
      } catch (error) { return errorResponse(error); }
  }
  async runQueue() {
    // Netzwerkaufrufe seriell ausführen, ohne den 30-Sekunden-Timeout von blockConcurrencyWhile.
    this.running ??= this.drain().finally(() => { this.running = null; });
    await this.running;
  }
  async alarm() { await this.runQueue(); }
}
