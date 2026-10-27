import {readFile, readdir, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {validateConfig, validateBank} from '../src/vertrag.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const banks=[];const errors=[];const warnings=[];
for(const file of (await readdir(resolve(root,'fragenpools'))).filter(x=>x.endsWith('.json'))) {
  try {
    const bank=await load(resolve(root,'fragenpools',file));validateBank(bank);banks.push(bank);
    if(bank.demo)warnings.push(`${file}: Demonstrationspool; vor regelmäßigem Dauerbetrieb erweitern.`);
    for(const q of bank.questions) if(q.figure) await access(resolve(root,'../../klasse-8/01-optische-instrumente/lernpfade/wettkaempfe',q.figure.src));
  }catch(e){errors.push(`${file}: ${e.message}`);}
}
for(const file of (await readdir(resolve(root,'wettkaempfe'))).filter(x=>x.endsWith('.json'))) {
  try {
    const c=await load(resolve(root,'wettkaempfe',file));
    const bank=banks.find(b=>b.id===c.bank.id&&b.version===c.bank.version);
    validateConfig(c,bank);
    console.log(`${c.id}: ${c.status}, ${c.season.kind}, ${Object.values(c.selection.counts).reduce((a,b)=>a+b,0)} Fragen`);
  }catch(e){errors.push(`${file}: ${e.message}`);}
}
for(const m of warnings)console.warn(`HINWEIS: ${m}`);
for(const m of errors)console.error(`FEHLER: ${m}`);
if(errors.length)process.exitCode=1;else console.log('Alle Konfigurationen sind gültig.');
