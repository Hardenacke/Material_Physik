const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "data.json");

const CLASS_DEFAULTS = {
  "klasse-5": { title: "Klasse 5", order: 5 },
  "klasse-8": { title: "Klasse 8", order: 8 },
  "klasse-9": { title: "Klasse 9", order: 9 },
  "klasse-10": { title: "Klasse 10", order: 10 },
  ef: { title: "EF", order: 11 },
  "q1-q2-grundkurs": { title: "Q1/Q2 Grundkurs", order: 12 },
  "q1-q2-leistungskurs": { title: "Q1/Q2 Leistungskurs", order: 13 }
};

const GERMAN_WORDS = {
  waerme: "Wärme",
  energieuebertragung: "Energieübertragung",
  elektrizitaet: "Elektrizität"
};

const LOWERCASE_WORDS = new Set([
  "und", "oder", "der", "die", "das", "des", "den", "dem", "in", "im",
  "am", "an", "auf", "aus", "bei", "für", "mit", "nach", "von", "zu", "zur", "zum"
]);

const RESOURCE_EXTENSIONS = new Set([
  ".html", ".htm", ".md", ".pdf", ".pptx", ".docx", ".xlsx", ".csv",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp4", ".webm", ".mp3", ".wav"
]);

const CATEGORY_BY_FOLDER = {
  arbeitsblaetter: "Arbeitsblatt",
  bilder: "Bild",
  lernmaterial: "Lernmaterial",
  lernpfade: "Lernpfad-Datei",
  praesentation: "Präsentation",
  simulationen: "Simulation"
};

const DEFAULT_THEME = {
  accent: "#1e8a83",
  accentDark: "#23454a",
  accentSoft: "#e4f4ef"
};

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`WARNUNG: Ungültige JSON-Datei ${path.relative(ROOT, filePath)}: ${error.message}`);
    return null;
  }
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function colorOrFallback(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback;
}

function readTheme(meta) {
  const theme = meta.theme || {};
  return {
    accent: colorOrFallback(theme.accent, DEFAULT_THEME.accent),
    accentDark: colorOrFallback(theme.accentDark, DEFAULT_THEME.accentDark),
    accentSoft: colorOrFallback(theme.accentSoft, DEFAULT_THEME.accentSoft)
  };
}

function humanize(value) {
  const cleaned = value
    .replace(/^\d+[._-]?/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("de-DE");
      if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      if (GERMAN_WORDS[lower]) return GERMAN_WORDS[lower];
      return lower.charAt(0).toLocaleUpperCase("de-DE") + lower.slice(1);
    })
    .join(" ");
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(text) {
  return decodeEntities(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function readMarkdownInfo(filePath) {
  try {
    const markdown = fs.readFileSync(filePath, "utf8").slice(0, 200000);
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    return {
      title: titleMatch ? titleMatch[1].trim() : "",
      description: ""
    };
  } catch {
    return { title: "", description: "" };
  }
}

function readHtmlInfo(filePath) {
  try {
    const html = fs.readFileSync(filePath, "utf8").slice(0, 200000);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let description = "";

    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of metaTags) {
      if (!/\bname\s*=\s*["']description["']/i.test(tag)) continue;
      const contentMatch = tag.match(/\bcontent\s*=\s*["']([\s\S]*?)["']/i);
      if (contentMatch) {
        description = decodeEntities(contentMatch[1].trim());
        break;
      }
    }

    return {
      title: titleMatch ? stripTags(titleMatch[1]) : "",
      description
    };
  } catch {
    return { title: "", description: "" };
  }
}

function repoRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function createLearningPath(htmlPath, metaPath, fallbackName) {
  const meta = readJson(metaPath) || {};
  if (meta.visible === false) return null;

  const htmlInfo = readHtmlInfo(htmlPath);
  return {
    id: repoRelative(htmlPath),
    title: meta.title || htmlInfo.title || humanize(fallbackName),
    description: meta.description || htmlInfo.description || "",
    order: toNumber(meta.order, 9999),
    url: repoRelative(htmlPath)
  };
}

function scanLearningPaths(topicPath) {
  const learningPathDir = path.join(topicPath, "lernpfade");
  if (!fs.existsSync(learningPathDir) || !fs.statSync(learningPathDir).isDirectory()) return [];

  const entries = fs.readdirSync(learningPathDir, { withFileTypes: true });
  const results = [];

  // Bestehende Struktur: HTML-Dateien direkt unter lernpfade/.
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html") || entry.name.startsWith("_")) continue;
    const stem = path.basename(entry.name, path.extname(entry.name));
    const htmlPath = path.join(learningPathDir, entry.name);
    const metaPath = path.join(learningPathDir, `${stem}.meta.json`);
    const item = createLearningPath(htmlPath, metaPath, stem);
    if (item) results.push(item);
  }

  // Bevorzugte neue Struktur: lernpfade/<slug>/index.html + meta.json.
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const folderPath = path.join(learningPathDir, entry.name);
    const htmlPath = path.join(folderPath, "index.html");
    if (!fs.existsSync(htmlPath)) continue;
    const metaPath = path.join(folderPath, "meta.json");
    const item = createLearningPath(htmlPath, metaPath, entry.name);
    if (item) results.push(item);
  }

  return results.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));
}

function isInternalResource(filePath) {
  const name = path.basename(filePath);
  const ext = path.extname(name).toLowerCase();

  if (name.startsWith(".") || name.startsWith("_")) return true;
  if (ext === ".json") return true;
  if (!RESOURCE_EXTENSIONS.has(ext)) return true;

  return false;
}

function isLearningPathHtml(filePath, topicPath) {
  const relative = path.relative(topicPath, filePath).split(path.sep);
  const ext = path.extname(filePath).toLowerCase();
  return relative[0] === "lernpfade" && (ext === ".html" || ext === ".htm");
}

function resourceCategory(filePath, topicPath) {
  const firstFolder = path.relative(topicPath, filePath).split(path.sep)[0];
  return CATEGORY_BY_FOLDER[firstFolder] || "Datei";
}

function resourceTitle(filePath, topicPath) {
  const ext = path.extname(filePath).toLowerCase();
  const relative = path.relative(topicPath, filePath).split(path.sep);
  const stem = path.basename(filePath, ext);

  if (relative[0] === "praesentation" && ext === ".pptx" && /_wiederholung$/i.test(stem)) {
    return "Wiederholungspräsentation";
  }

  if (ext === ".md") {
    const markdownInfo = readMarkdownInfo(filePath);
    if (markdownInfo.title) return markdownInfo.title;
  }

  if (ext === ".html" || ext === ".htm") {
    const htmlInfo = readHtmlInfo(filePath);
    if (htmlInfo.title) return htmlInfo.title;
  }

  return humanize(stem);
}

function scanFiles(topicPath) {
  const results = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (isInternalResource(entryPath)) continue;
      if (isLearningPathHtml(entryPath, topicPath)) continue;

      const ext = path.extname(entryPath).toLowerCase();
      results.push({
        id: repoRelative(entryPath),
        title: resourceTitle(entryPath, topicPath),
        category: resourceCategory(entryPath, topicPath),
        type: ext ? ext.slice(1).toUpperCase() : "Datei",
        url: repoRelative(entryPath)
      });
    }
  }

  walk(topicPath);

  return results.sort((a, b) =>
    a.category.localeCompare(b.category, "de") ||
    a.title.localeCompare(b.title, "de")
  );
}

function isClassFolder(name) {
  return /^klasse-\d+$/i.test(name) || name === "ef" || /^q\d.*-(grundkurs|leistungskurs)$/i.test(name);
}

function scanTopics(classPath) {
  return fs.readdirSync(classPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("_"))
    .map((entry) => {
      const topicPath = path.join(classPath, entry.name);
      const meta = readJson(path.join(topicPath, "thema.json")) || {};
      if (meta.visible === false) return null;

      return {
        id: entry.name,
        title: meta.title || humanize(entry.name),
        description: meta.description || "",
        order: toNumber(meta.order, toNumber((entry.name.match(/^(\d+)/) || [])[1], 9999)),
        theme: readTheme(meta),
        learningPaths: scanLearningPaths(topicPath),
        files: scanFiles(topicPath)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));
}

function scanClasses() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isClassFolder(entry.name))
    .map((entry) => {
      const classPath = path.join(ROOT, entry.name);
      const meta = readJson(path.join(classPath, "jahrgang.json")) || {};
      if (meta.visible === false) return null;

      const defaults = CLASS_DEFAULTS[entry.name] || {};
      return {
        id: entry.name,
        title: meta.title || defaults.title || humanize(entry.name),
        description: meta.description || "",
        order: toNumber(meta.order, defaults.order ?? 9999),
        topics: scanTopics(classPath)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));
}

const catalog = {
  generatedAt: new Date().toISOString(),
  classes: scanClasses()
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

const learningPathCount = catalog.classes.reduce(
  (sum, schoolClass) => sum + schoolClass.topics.reduce((topicSum, topic) => topicSum + topic.learningPaths.length, 0),
  0
);

const fileCount = catalog.classes.reduce(
  (sum, schoolClass) => sum + schoolClass.topics.reduce((topicSum, topic) => topicSum + topic.files.length, 0),
  0
);

console.log(`Katalog erzeugt: ${catalog.classes.length} Bereiche, ${learningPathCount} Lernpfad(e), ${fileCount} Datei(en).`);
console.log(`Ausgabe: ${repoRelative(OUTPUT)}`);
