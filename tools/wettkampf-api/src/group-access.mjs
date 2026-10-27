import { exact, slug, HttpError, json, errorResponse } from './http.mjs';

export class GroupAccess {
  constructor(ctx) {
    this.ctx = ctx; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY, alias TEXT NOT NULL, hash TEXT UNIQUE NOT NULL, enabled INTEGER NOT NULL)`);
    this.sql.exec('CREATE TABLE IF NOT EXISTS rates (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)');
    this.sql.exec('INSERT OR IGNORE INTO schema_migrations VALUES (1)');
  }
  rate(key, limit, now) {
    const window = Math.floor(now / 60000);
    this.sql.exec('DELETE FROM rates WHERE window < ?', window - 1);
    const row = this.sql.exec('SELECT * FROM rates WHERE key = ?', key).toArray()[0];
    const count = row?.window === window ? row.count + 1 : 1;
    this.sql.exec('INSERT OR REPLACE INTO rates VALUES (?, ?, ?)', key, window, count);
    if (count > limit) throw new HttpError(429, 'Zu viele Anfragen. Bitte eine Minute warten.');
  }
  async fetch(request) {
    try {
      const p = await request.json();
      const result = this.ctx.storage.transactionSync(() => {
        if (p.action === 'import') {
          if (!Array.isArray(p.participants) || !p.participants.length || p.participants.length > 100)
            throw new HttpError(400, '1–100 Zugänge pro Import erforderlich.');
          for (const item of p.participants) {
            exact(item, ['id', 'alias', 'hash', 'enabled']);
            if (!slug(item.id) || typeof item.alias !== 'string' || !item.alias.trim() || item.alias.length > 40 ||
                !/^[a-f0-9]{64}$/.test(item.hash) || typeof item.enabled !== 'boolean') throw new HttpError(400, 'Ungültiger Zugang.');
            this.sql.exec(`INSERT INTO participants VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
              alias = excluded.alias, hash = excluded.hash, enabled = excluded.enabled`, item.id, item.alias, item.hash, +item.enabled);
          }
          return { imported: p.participants.length };
        }
        if (p.action === 'disable') {
          if (!slug(p.id)) throw new HttpError(400, 'Ungültige Personenkennung.');
          this.sql.exec('UPDATE participants SET enabled = 0 WHERE id = ?', p.id);
          return { disabled: true };
        }
        // Rate-Belege bleiben auch bei einer abgewiesenen Anmeldung erhalten.
        return null;
      });
      if (result) return json(result);
      if (p.action !== 'authenticate') throw new HttpError(404, 'Unbekannte Aktion.');
      // Kein Throw innerhalb einer Transaktion: fehlgeschlagene Versuche müssen zählen.
      this.rate(`code:${p.hash}`, 180, Date.now());
      const person = this.sql.exec('SELECT id, alias FROM participants WHERE hash = ? AND enabled = 1', p.hash).toArray()[0];
      if (!person) {
        // Viele gültige Zugänge können dieselbe Schul-/NAT-Adresse teilen.
        this.rate(`ip:${p.ipHash}`, 120, Date.now());
        throw new HttpError(401, 'Zugangscode ungültig oder gesperrt.');
      }
      return json(person);
    } catch (error) { return errorResponse(error); }
  }
}
