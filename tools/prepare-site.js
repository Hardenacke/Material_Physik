const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "_site");

function copy(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function isContentRoot(name) {
  return /^klasse-\d+$/i.test(name) || name === "ef" || /^q\d.*-(grundkurs|leistungskurs)$/i.test(name);
}

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });

for (const file of ["index.html", "data.json"]) {
  const source = path.join(ROOT, file);
  if (!fs.existsSync(source)) {
    throw new Error(`Benötigte Datei fehlt: ${file}`);
  }
  copy(source, path.join(SITE, file));
}

copy(path.join(ROOT, "assets"), path.join(SITE, "assets"));

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || !isContentRoot(entry.name)) continue;
  copy(path.join(ROOT, entry.name), path.join(SITE, entry.name));
}

fs.writeFileSync(path.join(SITE, ".nojekyll"), "", "utf8");
console.log(`GitHub-Pages-Artefakt vorbereitet: ${path.relative(ROOT, SITE)}`);
