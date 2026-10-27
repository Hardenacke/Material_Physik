import { readFile, mkdir, writeFile } from 'node:fs/promises';
const api = JSON.parse(await readFile(new URL('../docs/referenz/api/openapi.json', import.meta.url), 'utf8'));
api.info.title = 'Physik-Wettkampf-API – Cloudflare-Umsetzung';
api.info.version = '1.1.0';
api.info.description = 'Implementierter Schüler- und Verwaltungsvertrag. Ausschließlich HTTPS im Produktivbetrieb.';
api.servers = [{ url: 'http://127.0.0.1:8787', description: 'Lokaler Testserver; produktiv die eigene Worker-Herkunft einsetzen.' }];
const s = api.components.schemas;
const string = { type: 'string' }, integer = { type: 'integer' };
Object.assign(s.Competition.properties, { groupId: string, status: { enum: ['draft', 'published', 'closed', 'archived'] },
  totalQuestions: integer, demo: { type: 'boolean' },
  schedule: { type: 'object', required: ['startsAt', 'endsAt'], properties: { startsAt: { type: ['string', 'null'] }, endsAt: { type: ['string', 'null'] } }, additionalProperties: false },
  season: { type: 'object', required: ['kind', 'timeZone'], properties: { kind: { enum: ['continuous', 'calendar-month'] }, timeZone: { const: 'Europe/Berlin' } }, additionalProperties: false }
});
s.Competition.required.push('groupId', 'status', 'totalQuestions', 'demo', 'schedule', 'season');
Object.assign(s.Catalog.properties, { serverNow: integer, alias: string }); s.Catalog.required.push('serverNow', 'alias');
s.AttemptView.properties.attempt = { anyOf: [{ type: 'null' }, { $ref: '#/components/schemas/Attempt' }] };
// Bei keinem bisherigen Versuch fehlen rules; bei existierendem Versuch sind sie vorhanden.
s.AttemptView.required = s.AttemptView.required.filter(k => k !== 'rules');
const period = structuredClone(s.Competition.properties.period);
s.Leaderboard = { type: 'object', additionalProperties: false,
  properties: { serverNow: integer, period, leaderboard: { type: 'array', items: { $ref: '#/components/schemas/LeaderboardEntry' } }, revision: integer,
    archivedRevision: integer, archiveState: { enum: ['disabled', 'pending', 'synced'] } },
  required: ['serverNow', 'period', 'leaderboard', 'revision', 'archivedRevision', 'archiveState'] };
api.components.securitySchemes.AdminBearer = { type: 'http', scheme: 'bearer', description: 'Getrennter Administrationsschlüssel (ADMIN_TOKEN), kein Schülercode.' };
const ok = schema => ({ description: 'Erfolgreich', content: { 'application/json': { schema } } });
const errors = { default: { description: 'Fehler; Status entsprechend API.md', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, properties, required });
s.CompetitionView = object({ serverNow: integer, competition: { $ref: '#/components/schemas/Competition' } });
for (const path of ['/api/v1/competitions/{competitionId}', '/api/v1/competitions/{competitionId}/versions/{competitionVersion}'])
  api.paths[path].get.responses['200'] = ok({ $ref: '#/components/schemas/CompetitionView' });
const parameter = (name, schema = string) => ({ name, in: 'path', required: true, schema });
const operation = (summary, parameters, response, body) => ({ summary, security: [{ AdminBearer: [] }], parameters,
  ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: body } } } } : {}), responses: { 200: ok(response), ...errors } });
const person = object({ id: string, alias: { type: 'string', minLength: 1, maxLength: 40 }, hash: { type: 'string', pattern: '^[a-f0-9]{64}$' }, enabled: { type: 'boolean' } });
api.paths['/api/v1/health'] = { get: { summary: 'Anonymer Dienststatus', security: [], responses: { 200: ok(object({ status: { const: 'ok' }, subject: { const: 'physik' } })) } } };
api.paths['/api/v1/admin/groups/{groupId}/participants'] = { post: operation('Teilnehmende importieren / Code wechseln', [parameter('groupId')], object({ imported: integer }), object({ participants: { type: 'array', minItems: 1, maxItems: 100, items: person } })) };
api.paths['/api/v1/admin/groups/{groupId}/disable'] = { post: operation('Code sperren', [parameter('groupId')], object({ disabled: { const: true } }), object({ id: string })) };
const scope = '/api/v1/admin/competitions/{competitionId}/versions/{competitionVersion}/periods/{periodId}';
const params = [parameter('competitionId'), parameter('competitionVersion', { type: 'integer', minimum: 1 }), parameter('periodId')];
api.paths[scope + '/status'] = { get: operation('Raumstatus', params, object({ revision: integer, archivedRevision: integer, final: { type: 'boolean' }, active: integer, control: { enum: [null, 'closed'] } })) };
api.paths[scope + '/close'] = { post: operation('Wertung endgültig schließen', params, object({ closed: { const: true } }), object({})) };
api.paths['/api/v1/admin/archive'] = { get: operation('Archivaufträge zählen', [], object({ jobs: { type: 'array', items: object({ state: { enum: ['pending', 'done', 'blocked'] }, count: integer }) } })) };
await mkdir(new URL('../api/', import.meta.url), { recursive: true });
await writeFile(new URL('../api/openapi.json', import.meta.url), JSON.stringify(api, null, 2) + '\n');
console.log('Implementierten OpenAPI-Vertrag erzeugt.');
