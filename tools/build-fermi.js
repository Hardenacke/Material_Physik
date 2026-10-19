const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, "fermi-tasks.json"), "utf8"));
const contentRoots = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && (/^klasse-\d+$/.test(entry.name) || entry.name === "ef" || /^q\d.*-(grundkurs|leistungskurs)$/.test(entry.name)));

function escape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function head(title, taskPage = false) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#6752b5">
  <title>${escape(title)}</title>
  <link rel="stylesheet" href="../../../../assets/fermi.css">
${taskPage ? '  <script src="../../../../assets/fermi.js" defer></script>' : ""}
</head>`;
}

function taskPage(task) {
  return `${head(task.title + " · Fermi-Aufgabe Physik", true)}
<body>
<main class="wrap">
  <nav class="page-nav" aria-label="Seitennavigation">
    <a class="back" data-back href="index.html">← Zur Aufgabenübersicht</a>
    <a class="library-link" href="${escape(task.catalogUrl)}">Zusatzaufgaben im Themenbereich</a>
  </nav>
  <header>
    <p class="eyebrow">Fermi-Aufgabe ${task.id} · ${escape(task.level)}</p>
    <h1 id="task-title" tabindex="-1">${escape(task.title)}</h1>
    <nav aria-label="Aufgabenschritte">
      <ol class="step-nav">
        <li><a class="step-link" href="#aufgabe" aria-current="step"><span class="step-number">1</span>Aufgabe</a></li>
        <li><a class="step-link" href="#loesungsweg"><span class="step-number">2</span>Eigener Lösungsweg</a></li>
      </ol>
    </nav>
    <p class="step-label" data-step-label aria-live="polite">Schritt 1 von 2 · Aufgabe</p>
  </header>
  <article class="task-card" aria-labelledby="task-title">
    <p class="task-question">${escape(task.question)}</p>
    <figure class="task-image">
      <img src="${escape(task.imageUrl)}" width="1536" height="1024" alt="${escape("Illustration: " + task.imageAlt)}" decoding="async">
      <figcaption>${task.id === 4 || task.id === 18 ? "Illustration · nicht maßstabsgetreu" : "Illustration zur Aufgabensituation"}</figcaption>
    </figure>
  </article>
  <section class="stage" id="aufgabe" aria-label="Aufgabe ansehen">
    <nav class="stage-actions" aria-label="Weiter zum eigenen Lösungsweg">
      <a class="button primary" href="#loesungsweg">Weiter: Eigener Lösungsweg →</a>
    </nav>
  </section>
  <section class="stage" id="loesungsweg" aria-labelledby="work-title" hidden>
    <h2 id="work-title" tabindex="-1">Euer eigener Lösungsweg</h2>
    <p class="work-prompt">Findet eine mögliche Antwort und entwickelt dazu euren eigenen Lösungsweg.</p>
    <nav class="stage-actions" aria-label="Zurück oder weitere Aufgabe wählen">
      <a class="button" href="#aufgabe">← Zurück zur Aufgabe</a>
      <a class="button" href="index.html">Weitere Aufgabe wählen</a>
    </nav>
  </section>
  <noscript><p>Entwickelt einen eigenen Lösungsweg zu dieser Aufgabe.</p></noscript>
</main>
</body>
</html>
`;
}

const found = new Map();
for (const school of contentRoots) {
  for (const topic of fs.readdirSync(path.join(ROOT, school.name), { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const topicPath = path.join(ROOT, school.name, topic.name);
    const folder = path.join(topicPath, "lernmaterial", "fermi-physik");
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder).filter((name) => /^\d+-.+\.meta\.json$/.test(name))) {
      const metaPath = path.join(folder, file);
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      if (meta.type !== "aufgabe") continue;
      const id = Number(file.split("-")[0]);
      if (found.has(id)) throw new Error(`Doppelte Fermi-Aufgabe: ${id}`);
      found.set(id, { folder, topicPath, metaPath, meta, file: file.replace(/\.meta\.json$/, ".html"), topicRoute: `${school.name}/${topic.name}` });
    }
  }
}

if (found.size !== tasks.length || new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new Error("Die Aufgabendaten müssen zu den vorhandenen Fermi-Aufgaben passen und eindeutige Nummern haben.");
const grouped = new Map();
for (const task of tasks) {
  const source = found.get(task.id);
  if (!source) throw new Error(`Aufgabe ${task.id} fehlt im Repository.`);
  const imageName = `fermi-${String(task.id).padStart(2, "0")}.webp`;
  const imagePath = path.join(source.topicPath, "bilder", "fermi-physik", imageName);
  if (!fs.existsSync(imagePath)) throw new Error(`Aufgabenbild fehlt: ${path.relative(ROOT, imagePath)}`);
  const entry = { ...task, ...source, title: source.meta.title, level: source.meta.level,
    imageUrl: `../../bilder/fermi-physik/${imageName}`,
    catalogUrl: `../../../../index.html#/${source.topicRoute}/zusatzaufgaben` };
  write(path.join(source.folder, source.file), taskPage(entry));
  write(source.metaPath, JSON.stringify({ ...source.meta, description: task.question }, null, 2) + "\n");
  write(imagePath.replace(/\.webp$/, ".meta.json"), JSON.stringify({ visible: false }, null, 2) + "\n");
  if (!grouped.has(source.topicPath)) grouped.set(source.topicPath, []);
  grouped.get(source.topicPath).push(entry);
}

for (const [topicPath, entries] of grouped) {
  entries.sort((a, b) => a.id - b.id);
  const previous = fs.readFileSync(path.join(entries[0].folder, "index.html"), "utf8");
  const title = (previous.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1];
  if (!title) throw new Error(`Titel der Aufgabenübersicht fehlt: ${topicPath}`);
  const cards = entries.map((task) => `    <a class="tile" href="${escape(task.file)}">
      <img src="${escape(task.imageUrl)}" width="1536" height="1024" alt="" loading="lazy" decoding="async">
      <div class="tile-copy"><span class="eyebrow">Aufgabe ${task.id} · ${escape(task.level)}</span><h2>${escape(task.title)}</h2><p>${escape(task.question)}</p></div>
    </a>`).join("\n");
  write(path.join(entries[0].folder, "index.html"), `${head("Fermi-Aufgaben Physik")}
<body><main class="wrap">
  <nav class="page-nav" aria-label="Seitennavigation"><a class="back" href="${escape(entries[0].catalogUrl)}">← Zurück: Zusatzaufgaben</a></nav>
  <header><p class="eyebrow">Zusatzaufgaben · Physik</p><h1>${title}</h1><p>Wählt eine Aufgabe und entwickelt euren eigenen Lösungsweg.</p></header>
  <section class="task-grid" aria-label="Fermi-Aufgaben">
${cards}
  </section>
  <footer class="footer"><a href="Fermi-Aufgaben_Physik.md" download>Aufgaben als Markdown herunterladen</a></footer>
</main></body></html>
`);
  const markdown = `# ${title}\n\n` + entries.map((task) => `## ${task.id}. ${task.title}\n\n${task.question}\n\n![${task.imageAlt}](${task.imageUrl})\n\n[Eigenen Lösungsweg entwickeln](${task.file}#loesungsweg)`).join("\n\n") + "\n";
  write(path.join(entries[0].folder, "Fermi-Aufgaben_Physik.md"), markdown);
}

console.log(`${tasks.length} Fermi-Aufgaben und ${grouped.size} Übersichten mit Bildern und zwei offenen Aufgabenschritten erzeugt.`);
