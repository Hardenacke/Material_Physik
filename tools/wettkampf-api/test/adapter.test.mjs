import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { RoomState } from '../src/room-state.mjs';
import { GroupAccess } from '../src/group-access.mjs';
import { ArchiveWriter } from '../src/archive-writer.mjs';
import { periodFor } from '../src/zeitraum.mjs';
import { fingerprint, definitionFingerprint } from '../src/fingerabdruck.mjs';
const bank = JSON.parse(readFileSync(new URL('../fragenpools/optik-8-demo.json', import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../wettkaempfe/physik-optik-dauer.json', import.meta.url), 'utf8')); config.status = 'published';
function context() {
  const db = new DatabaseSync(':memory:');
  const ctx = { alarm: null, blockConcurrencyWhile: action => action(), storage: {
    sql: { exec(sql, ...params) { const rows = db.prepare(sql).all(...params); return { toArray: () => rows, one: () => { assert.equal(rows.length, 1); return rows[0]; } }; } },
    transactionSync(action) { db.exec('BEGIN'); try { const value = action(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } },
    async setAlarm(time) { ctx.alarm = time; },
    async deleteAlarm() { ctx.alarm = null; }
  } }; return ctx;
}
async function roomFixture() {
  const ctx = context(); const room = new RoomState(ctx, { ARCHIVE_MODE: 'disabled' });
  const payload = { config, bank, configHash: await definitionFingerprint(config), bankHash: await fingerprint(bank), period: periodFor(config, Date.now()), person: { id: 'person-1', alias: 'Licht 01' } };
  async function send(action, fields = {}) {
    const response = await room.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify({ ...payload, action, ...fields }) }));
    return { status: response.status, value: await response.json() };
  }
  return { ctx, room, payload, send };
}
test('persistenter Adapter: gleicher Request, fremder Versuch und gebundene Definition', async () => {
  const f = await roomFixture();
  const key = crypto.randomUUID(); const first = await f.send('start', { key, requestHash: 'start' });
  const duplicate = await f.send('start', { key, requestHash: 'start' });
  assert.deepEqual(duplicate.value, first.value);
  assert.equal((await f.send('start', { key, requestHash: 'different' })).status, 409);
  const foreign = await f.send('get', { attemptId: first.value.attempt.id, person: { id: 'person-2', alias: 'Andere Person' } });
  assert.equal(foreign.status, 403);
  assert.equal((await f.send('start', { configHash: 'changed' })).status, 409);
  const recreated = new RoomState(f.ctx, { ARCHIVE_MODE: 'disabled' });
  const response = await recreated.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify({ ...f.payload, action: 'current' }) }));
  assert.equal((await response.json()).attempt.id, first.value.attempt.id);
});
test('fällige Frist bleibt trotz ungültiger Fachaktion gespeichert', async () => {
  const f = await roomFixture(); const id = (await f.send('start')).value.attempt.id;
  await f.send('next', { attemptId: id });
  const attempt = f.room.load(id); attempt.current.deadline = Date.now() - 1000; f.room.save(attempt);
  assert.equal((await f.send('answer', { attemptId: id, body: { questionId: 'fremde-frage', answerId: 'a' } })).status, 409);
  assert.equal(f.room.load(id).lives, 2);
  await f.room.alarm(); await f.room.alarm();
  assert.equal(f.room.load(id).lives, 2);
});
test('Schließen beendet wartende Versuche und lässt eine offene Frage bis zur Frist laufen', async () => {
  const f = await roomFixture(); const waiting = (await f.send('start')).value.attempt.id;
  const secondPerson = { id: 'person-2', alias: 'Licht 02' };
  const active = (await f.send('start', { person: secondPerson })).value.attempt.id;
  await f.send('next', { person: secondPerson, attemptId: active });
  await f.send('close');
  assert.equal(f.room.load(waiting).phase, 'finished');
  assert.equal(f.room.load(active).phase, 'playing');
  const a = f.room.load(active); a.current.deadline = Date.now() - 10; f.room.save(a);
  await f.room.alarm();
  assert.equal(f.room.load(active).phase, 'finished');
  assert.equal(f.room.get('binding').final, true);
  assert.equal((await f.send('start')).status, 409);
});
test('Versuchslimit und Bestwert überleben die Löschung alter Versuchsdetails', async () => {
  const f = await roomFixture(); const c = structuredClone(config); c.attempts.maxPerPeriod = 1;
  f.payload.config = c; f.payload.configHash = await definitionFingerprint(c);
  const id = (await f.send('start')).value.attempt.id;
  const a = f.room.load(id); a.hardEnd = Date.now() - 91 * 86400000; f.room.save(a);
  await f.room.alarm();
  assert.equal(f.room.load(id), null);
  assert.equal((await f.send('start')).status, 409);
  assert.equal((await f.send('leaderboard')).value.leaderboard.length, 1);
});
test('Codewechsel und Sperre wirken ohne Authentifizierungscache', async () => {
  const ctx = context(); const group = new GroupAccess(ctx);
  const send = async body => { const res = await group.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify(body) })); return { status: res.status, body: await res.json() }; };
  const person = { id: 'person-1', alias: 'Licht 01', hash: 'a'.repeat(64), enabled: true };
  assert.equal((await send({ action: 'import', participants: [person] })).status, 200);
  assert.equal((await send({ action: 'authenticate', hash: person.hash, ipHash: 'ip' })).status, 200);
  await send({ action: 'import', participants: [{ ...person, hash: 'b'.repeat(64) }] });
  assert.equal((await send({ action: 'authenticate', hash: person.hash, ipHash: 'ip' })).status, 401);
  assert.equal((await send({ action: 'authenticate', hash: 'b'.repeat(64), ipHash: 'ip' })).body.id, person.id);
  await send({ action: 'disable', id: person.id });
  assert.equal((await send({ action: 'authenticate', hash: 'b'.repeat(64), ipHash: 'ip' })).status, 401);
});
test('fehlgeschlagene Anmeldungen werden begrenzt', async () => {
  const group = new GroupAccess(context()); let status;
  for (let i = 0; i < 121; i++) status = (await group.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify({ action: 'authenticate', hash: 'a'.repeat(64), ipHash: 'ip' }) }))).status;
  assert.equal(status, 429);
});
test('eine gemeinsame Schul-IP begrenzt gültige Zugänge unabhängig voneinander', async () => {
  const group = new GroupAccess(context());
  const send = async body => group.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify(body) }));
  const participants = Array.from({ length: 10 }, (_, i) => ({ id: `person-${i}`, alias: `Licht ${i}`, hash: String(i).repeat(64), enabled: true }));
  assert.equal((await send({ action: 'import', participants })).status, 200);
  for (let i = 0; i < 200; i++) assert.equal((await send({ action: 'authenticate', hash: participants[i % 10].hash, ipHash: 'gemeinsame-schul-ip' })).status, 200);
});
function archiveFixture() {
  const ctx = context(); const env = { ARCHIVE_REPOSITORY: 'owner/results', GITHUB_TOKEN: 'test-only', ARCHIVE_PREFIX: 'test' };
  const writer = new ArchiveWriter(ctx, env);
  const payload = { subject: 'physik', competitionId: 'optik-test', version: 1, period: 'gesamt', instanceId: 'instance-test', revision: 1, final: false, leaderboard: [] };
  const send = async p => { const res = await writer.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify({ action: 'write', payload: p }) })); return { status: res.status, body: await res.json() }; };
  return { ctx, writer, payload, send };
}
test('Archiver schreibt nur in ein privates Repository und dedupliziert Revisionen', async t => {
  const f = archiveFixture(); const files = new Map(); let writes = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url === 'https://api.github.com/repos/owner/results') return Response.json({ private: true });
    if (init.method === 'PUT') { writes++; const body = JSON.parse(init.body); files.set(url.split('?')[0], body.content); return Response.json({ content: { sha: 'sha' } }); }
    const content = files.get(url.split('?')[0]); return content ? Response.json({ sha: 'sha', content }) : new Response('', { status: 404 });
  });
  assert.equal((await f.send(f.payload)).status, 200);
  assert.equal((await f.send(f.payload)).status, 200); assert.equal(writes, 1);
  assert.equal((await f.send({ ...f.payload, revision: 2, final: true })).status, 200); assert.equal(writes, 3);
  assert.equal((await f.send({ ...f.payload, instanceId: 'foreign', revision: 3 })).status, 409);
});
test('Archivausfall bleibt dauerhaft ausstehend und wird per Alarm nachgeholt', async t => {
  const f = archiveFixture(); let offline = true;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (offline) throw new Error('Netzwerkfehler');
    if (url === 'https://api.github.com/repos/owner/results') return Response.json({ private: true });
    return init.method === 'PUT' ? Response.json({ content: {} }) : new Response('', { status: 404 });
  });
  assert.equal((await f.send(f.payload)).status, 503);
  assert.equal(f.writer.sql.exec('SELECT state FROM jobs').one().state, 'pending'); assert.ok(f.ctx.alarm > Date.now());
  const recreated = new ArchiveWriter(f.ctx, f.writer.env);
  offline = false; recreated.sql.exec('UPDATE jobs SET retry = 0'); await recreated.alarm();
  assert.equal(recreated.sql.exec('SELECT state FROM jobs').one().state, 'done');
});
test('öffentliche Ergebnisrepositories werden vor einem Schreibversuch abgewiesen', async t => {
  const f = archiveFixture(); let puts = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => { if (init.method === 'PUT') puts++; return Response.json({ private: false }); });
  assert.equal((await f.send(f.payload)).status, 503); assert.equal(puts, 0);
});
