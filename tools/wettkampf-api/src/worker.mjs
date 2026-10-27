import definitions from './deployment.generated.mjs';
import { periodFor, availability } from './zeitraum.mjs';
import { fingerprint } from './fingerabdruck.mjs';
import { exact, slug, uuid, HttpError, json, readJSON, digest, call, errorResponse } from './http.mjs';
export { GroupAccess } from './group-access.mjs';
export { RoomState } from './room-state.mjs';
export { ArchiveWriter } from './archive-writer.mjs';

function definition(id, version) {
  const matches = definitions.filter(d => d.config.id === id && (!version || d.config.version === +version));
  const found = matches.sort((a, b) => b.config.version - a.config.version)[0];
  if (!found) throw new HttpError(404, 'Wettbewerb nicht gefunden.');
  return found;
}
function publicConfig(d, now) {
  const c = d.config;
  return { id: c.id, version: c.version, subject: 'physik', title: c.title, grade: c.grade, groupId: c.groupId,
    status: c.status, availability: availability(c, now), period: periodFor(c, now),
    rules: c.rules, attempts: c.attempts, schedule: c.schedule, season: c.season,
    selectionCounts: c.selection.counts, totalQuestions: Object.values(c.selection.counts).reduce((a, b) => a + b, 0), demo: d.bank.demo };
}
function selectedPeriod(c, id, now) {
  if (id === 'gesamt' && c.season.kind === 'continuous') return periodFor(c, now);
  if (c.season.kind !== 'calendar-month' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(id)) throw new HttpError(404, 'Zeitraum nicht gefunden.');
  const p = periodFor(c, Date.parse(`${id}-15T12:00:00Z`));
  if (p.id !== id || p.startsAt >= p.endsAt) throw new HttpError(404, 'Zeitraum liegt außerhalb des Wettbewerbs.');
  return p;
}
async function admin(request, env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32 || !token || await digest(token) !== await digest(env.ADMIN_TOKEN))
    throw new HttpError(401, 'Administrationszugang erforderlich.');
}
async function authenticate(request, env, groupId) {
  const code = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!code) throw new HttpError(401, 'Persönlicher Zugangscode erforderlich.');
  return call(env.GROUP_ACCESS, `physik/${groupId}`, { action: 'authenticate', hash: await digest(code),
    ipHash: await digest(request.headers.get('CF-Connecting-IP') || 'local') });
}
async function route(request, env) {
  const u = new URL(request.url); const path = u.pathname; const now = Date.now();
  if (path === '/api/v1/health' && request.method === 'GET') return json({ status: 'ok', subject: 'physik' });
  if (path.startsWith('/api/v1/admin/')) {
    await admin(request, env);
    const group = path.match(/^\/api\/v1\/admin\/groups\/([a-z0-9-]+)\/(participants|disable)$/);
    if (group) {
      if (request.method !== 'POST') throw new HttpError(405, 'POST erforderlich.');
      if (!definitions.some(d => d.config.groupId === group[1])) throw new HttpError(404, 'Gruppe nicht konfiguriert.');
      const body = await readJSON(request);
      exact(body, group[2] === 'participants' ? ['participants'] : ['id']);
      return json(await call(env.GROUP_ACCESS, `physik/${group[1]}`, { action: group[2] === 'participants' ? 'import' : 'disable', ...body }));
    }
    if (path === '/api/v1/admin/archive' && request.method === 'GET') return json(await call(env.ARCHIVE_WRITER, 'physik', { action: 'status' }));
    const match = path.match(/^\/api\/v1\/admin\/competitions\/([a-z0-9-]+)\/versions\/(\d+)\/periods\/([a-z0-9-]+)\/(status|close)$/);
    if (!match) throw new HttpError(404, 'Verwaltungspfad nicht gefunden.');
    if (request.method !== (match[4] === 'close' ? 'POST' : 'GET')) throw new HttpError(405, 'Methode passt nicht.');
    if (match[4] === 'close') exact(await readJSON(request), []);
    const d = definition(match[1], match[2]); const period = selectedPeriod(d.config, match[3], now);
    return json(await call(env.ROOM_STATE, `physik/${d.config.id}/v${d.config.version}/${period.id}`, { ...d, period, allowCreate: period.id === periodFor(d.config, now).id, action: match[4] }));
  }
  if (path === '/api/v1/catalog') {
    if (request.method !== 'GET') throw new HttpError(405, 'GET erforderlich.');
    const groupId = u.searchParams.get('groupId');
    if (!slug(groupId) || !definitions.some(d => d.config.groupId === groupId)) throw new HttpError(404, 'Gruppe nicht gefunden.');
    const person = await authenticate(request, env, groupId);
    return json({ serverNow: now, alias: person.alias, competitions: definitions.filter(d => d.config.groupId === groupId && d.config.status !== 'draft').map(d => publicConfig(d, now)) });
  }
  const match = path.match(/^\/api\/v1\/competitions\/([a-z0-9-]+)(?:\/versions\/(\d+))?(?:\/periods\/([a-z0-9-]+)\/(leaderboard|attempts)(?:\/(current|[a-f0-9-]+)(?:\/(next|answer))?)?)?$/);
  if (!match) throw new HttpError(404, 'API-Pfad nicht gefunden.');
  const [, id, version, periodId, resource, attemptId, operation] = match;
  const d = definition(id, version); const person = await authenticate(request, env, d.config.groupId);
  if (d.config.status === 'draft') throw new HttpError(404, 'Wettbewerb ist noch nicht freigegeben.');
  if (!resource) {
    if (request.method !== 'GET') throw new HttpError(405, 'GET erforderlich.');
    return json({ serverNow: now, competition: publicConfig(d, now) });
  }
  if (!version) throw new HttpError(400, 'Eine Version ist erforderlich.');
  const period = selectedPeriod(d.config, periodId, now);
  if (d.config.season.kind === 'calendar-month' && period.id > periodFor(d.config, now).id) throw new HttpError(404, 'Zukünftige Wertung noch nicht verfügbar.');
  let action = resource === 'leaderboard' ? 'leaderboard' : attemptId === 'current' ? 'current' : attemptId ? (operation || 'get') : 'start';
  if (resource === 'leaderboard' && attemptId) throw new HttpError(404, 'API-Pfad nicht gefunden.');
  if (attemptId && attemptId !== 'current' && !uuid(attemptId)) throw new HttpError(400, 'Ungültige Versuch-ID.');
  const mutation = ['start', 'next', 'answer'].includes(action);
  if (request.method !== (mutation ? 'POST' : 'GET')) throw new HttpError(405, 'Methode passt nicht zur Aktion.');
  if (action === 'start' && period.id !== periodFor(d.config, now).id) throw new HttpError(409, 'Bitte den aktuellen Zeitraum wählen.');
  let body, key, requestHash;
  if (mutation) {
    key = request.headers.get('Idempotency-Key');
    if (!uuid(key)) throw new HttpError(400, 'UUID als Idempotency-Key erforderlich.');
    body = await readJSON(request); exact(body, action === 'answer' ? ['questionId', 'answerId'] : []);
    if (action === 'answer' && (!slug(body.questionId) || (body.answerId !== null && !slug(body.answerId)))) throw new HttpError(400, 'Ungültige Antwortkennung.');
    requestHash = await fingerprint([path, body]);
  }
  return json(await call(env.ROOM_STATE, `physik/${id}/v${version}/${period.id}`, { ...d, period, allowCreate: period.id === periodFor(d.config, now).id, person, action, attemptId, body, key, requestHash }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const origin = request.headers.get('Origin');
    const allowed = new Set([url.origin, ...(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)]);
    if (origin && !allowed.has(origin)) return json({ error: 'Herkunft nicht freigegeben.' }, 403);
    let response;
    if (request.method === 'OPTIONS') response = new Response(null, { status: 204 });
    else {
      try { response = await route(request, env); } catch (error) { response = errorResponse(error); }
    }
    const headers = new Headers(response.headers);
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin); headers.set('Vary', 'Origin');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
    }
    if (response.status === 429) headers.set('Retry-After', '60');
    return new Response(response.body, { status: response.status, headers });
  }
};
