import { readFile, readdir, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { validateConfig, validateBank } from '../src/vertrag.mjs';
import { fingerprint, definitionFingerprint } from '../src/fingerabdruck.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 1 || !['--demo', '--private'].includes(args[0])) throw new Error('--demo oder --private erforderlich.');
const demo = args[0] === '--demo';
const source = demo ? root : resolve(root, 'private');
const load = async path => JSON.parse(await readFile(path, 'utf8'));
const banks = [];
for (const file of await readdir(resolve(source, 'fragenpools'))) {
  if (!file.endsWith('.json')) continue;
  const bank = await load(resolve(source, 'fragenpools', file)); validateBank(bank);
  if (!demo && bank.demo) throw new Error('Private Bereitstellung benötigt eigene Fragen mit demo: false.');
  banks.push(bank);
}
const definitions = []; const identities = new Set();
for (const file of await readdir(resolve(source, 'wettkaempfe'))) {
  if (!file.endsWith('.json')) continue;
  const config = await load(resolve(source, 'wettkaempfe', file));
  const bank = banks.find(b => b.id === config.bank.id && b.version === config.bank.version);
  validateConfig(config, bank);
  if (demo && config.status === 'draft') config.status = 'published';
  const key = `${config.id}/${config.version}`;
  if (identities.has(key)) throw new Error(`Doppelte Definition: ${key}`);
  identities.add(key);
  for (const question of bank.questions) if (question.figure) await access(resolve(root,
    '../../klasse-8/01-optische-instrumente/lernpfade/wettkaempfe', question.figure.src));
  definitions.push({ config, bank, configHash: await definitionFingerprint(config), bankHash: await fingerprint(bank) });
}
if (!definitions.length) throw new Error('Keine Wettbewerbe gefunden.');
await mkdir(resolve(root, 'src'), { recursive: true });
await writeFile(resolve(root, 'src/deployment.generated.mjs'), '// Generiert; enthält private Lösungen. Niemals als statisches Asset ausliefern.\nexport default ' + JSON.stringify(definitions) + ';\n');
console.log(`${definitions.length} Wettbewerbsdefinitionen für ${demo ? 'Demo' : 'private Fragen'} vorbereitet.`);
