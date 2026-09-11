const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const watched = new Map();
let building = false;
let pending = false;

function findJson(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '_qa'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...findJson(p));
    else if (ent.name === 'praesentation.json') out.push(p);
  }
  return out;
}

function snapshot() {
  for (const file of findJson(ROOT)) {
    try { watched.set(file, fs.statSync(file).mtimeMs); } catch (_) {}
  }
}

function build() {
  if (building) { pending = true; return; }
  building = true;
  console.log('\nÄnderung erkannt – Präsentationen werden aktualisiert …');
  const child = spawn(process.execPath, [path.join(__dirname, 'build-presentations.js')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', code => {
    building = false;
    if (code !== 0) console.error(`Build fehlgeschlagen (Exit ${code}).`);
    else console.log('Aktualisierung abgeschlossen. Weitere Änderungen werden überwacht.');
    if (pending) { pending = false; setTimeout(build, 200); }
  });
}

snapshot();
console.log(`Überwachung aktiv: ${watched.size} Präsentationsquellen.`);
console.log('Nach dem Speichern einer praesentation.json werden die PowerPoint-Dateien automatisch neu erzeugt.');
console.log('Beenden mit Strg+C.');

setInterval(() => {
  const currentFiles = findJson(ROOT);
  let changed = false;
  const currentSet = new Set(currentFiles);

  for (const file of currentFiles) {
    let mtime;
    try { mtime = fs.statSync(file).mtimeMs; } catch (_) { continue; }
    if (!watched.has(file) || watched.get(file) !== mtime) {
      watched.set(file, mtime);
      changed = true;
    }
  }
  for (const old of [...watched.keys()]) {
    if (!currentSet.has(old)) { watched.delete(old); changed = true; }
  }
  if (changed) build();
}, 900);
