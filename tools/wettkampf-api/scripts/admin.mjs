import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = resolve(root, '.local');
const [command, ...argv] = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) {
  if (!['--group', '--aliases', '--file', '--url', '--id', '--competition', '--version', '--period'].includes(argv[i]) || !argv[i + 1] || Object.hasOwn(args, argv[i])) throw new Error('Ungültiges Argument.');
  args[argv[i]] = argv[i + 1];
}
const validSlug = x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length <= 64;
const saveNew = (path, value) => writeFile(path, value, { flag: 'wx', mode: 0o600 });
async function api(path, method = 'GET', body) {
  const base = new URL(args['--url'] || 'http://127.0.0.1:8787');
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) throw new Error('HTTPS oder lokale Adresse erforderlich.');
  const token = process.env.ADMIN_TOKEN || (await readFile(resolve(local, 'admin-token.txt'), 'utf8')).trim();
  const result = await fetch(new URL(`/api/v1/admin/${path}`, base), { method, headers: {
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'
  }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const value = await result.json();
  if (!result.ok) throw new Error(`${result.status}: ${value.error}`);
  return value;
}
await mkdir(local, { recursive: true });
if (command === 'init') {
  let token;
  try { token = (await readFile(resolve(local, 'admin-token.txt'), 'utf8')).trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    token = randomBytes(32).toString('base64url');
    await saveNew(resolve(local, 'admin-token.txt'), token + '\n');
  }
  try { await access(resolve(root, '.dev.vars')); }
  catch { await saveNew(resolve(root, '.dev.vars'), `ADMIN_TOKEN="${token}"\n`); }
  console.log('Lokale Administration vorbereitet. Schlüssel: .local/admin-token.txt (privat halten).');
} else if (command === 'create' || command === 'rotate') {
  const group = args['--group'];
  if (!validSlug(group)) throw new Error('--group als Gruppenkennung erforderlich.');
  let aliases;
  if (command === 'rotate') {
    if (!validSlug(args['--id']) || !args['--aliases']) throw new Error('rotate benötigt --id und --aliases mit genau einem Pseudonym.');
    aliases = JSON.parse(await readFile(resolve(args['--aliases']), 'utf8'));
    if (!Array.isArray(aliases) || aliases.length !== 1) throw new Error('Genau ein Pseudonym erforderlich.');
  } else aliases = args['--aliases'] ? JSON.parse(await readFile(resolve(args['--aliases']), 'utf8')) : ['Licht 01', 'Licht 02', 'Licht 03', 'Licht 04', 'Licht 05', 'Licht 06'];
  if (!Array.isArray(aliases) || !aliases.length || aliases.length > 100 || aliases.some(a => typeof a !== 'string' || !a.trim() || a.length > 40) || new Set(aliases).size !== aliases.length) throw new Error('1–100 verschiedene Pseudonyme als JSON-Array erforderlich.');
  const people = aliases.map(alias => { const code = randomBytes(32).toString('base64url'); return {
    id: command === 'rotate' ? args['--id'] : 'person-' + randomBytes(12).toString('hex'), alias, code
  }; });
  const stamp = Date.now();
  const codesPath = resolve(local, `codes-${group}-${stamp}.json`);
  const importPath = resolve(local, `import-${group}-${stamp}.json`);
  await saveNew(codesPath, JSON.stringify({ groupId: group, participants: people }, null, 2) + '\n');
  await saveNew(importPath, JSON.stringify({ participants: people.map(({ code, ...p }) => ({ ...p, hash: createHash('sha256').update(code).digest('hex'), enabled: true })) }, null, 2) + '\n');
  console.log(`Private Ausgabeliste: ${codesPath}\nImportdatei (nur Hashes): ${importPath}`);
} else if (command === 'import') {
  if (!validSlug(args['--group']) || !args['--file']) throw new Error('--group und --file erforderlich.');
  const data = JSON.parse(await readFile(resolve(args['--file']), 'utf8'));
  if (!Array.isArray(data.participants)) throw new Error('participants fehlt.');
  let imported = 0;
  for (let i = 0; i < data.participants.length; i += 40) imported += (await api(`groups/${args['--group']}/participants`, 'POST', { participants: data.participants.slice(i, i + 40) })).imported;
  console.log(`${imported} Zugänge importiert.`);
} else if (command === 'disable') {
  if (!validSlug(args['--group']) || !validSlug(args['--id'])) throw new Error('--group und --id erforderlich.');
  console.log(JSON.stringify(await api(`groups/${args['--group']}/disable`, 'POST', { id: args['--id'] })));
} else if (command === 'status' || command === 'close') {
  if (!validSlug(args['--competition']) || !/^\d+$/.test(args['--version'] || '') || !/^(gesamt|\d{4}-(0[1-9]|1[0-2]))$/.test(args['--period'] || '')) throw new Error('--competition, --version und --period erforderlich.');
  console.log(JSON.stringify(await api(`competitions/${args['--competition']}/versions/${args['--version']}/periods/${args['--period']}/${command}`, command === 'close' ? 'POST' : 'GET', command === 'close' ? {} : undefined), null, 2));
} else if (command === 'archive') {
  console.log(JSON.stringify(await api('archive'), null, 2));
} else {
  throw new Error('Befehle: init, create, import, rotate, disable, status, close, archive. Siehe README.md.');
}
