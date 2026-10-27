export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function json(value, status = 200) {
  return Response.json(value, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  } });
}
export function exact(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== fields.length || fields.some(k => !Object.hasOwn(value, k)))
    throw new HttpError(400, 'Die Felder passen nicht zum Vertrag.');
}
export const slug = x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length <= 64;
export const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export async function readJSON(request, max = 16384) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new HttpError(415, 'application/json erforderlich.');
  if (Number(request.headers.get('content-length')) > max) throw new HttpError(413, 'Nachricht zu groß.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'JSON fehlt.');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new HttpError(413, 'Nachricht zu groß.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new HttpError(400, 'Ungültiges JSON.'); }
}
export async function call(namespace, name, payload) {
  const stub = namespace.get(namespace.idFromName(name));
  const response = await stub.fetch('https://internal/', { method: 'POST', body: JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new HttpError(response.status, body.error || 'Dienst nicht verfügbar.');
  return body;
}
export function errorResponse(error) {
  return json({ error: error.status ? error.message : 'Dienst vorübergehend nicht verfügbar.' }, error.status || 503);
}
export async function digest(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
