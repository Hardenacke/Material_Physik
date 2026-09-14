const catalogRoot = document.getElementById("catalog");
const summaryRoot = document.getElementById("summary");
const searchInput = document.getElementById("search");

let catalogData = null;
let route = { classId: "", topicId: "" };
let lastMaterialRoute = "";

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createButton(className, text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function applyTheme(element, theme) {
  if (!theme) return element;
  if (theme.accent) {
    element.style.setProperty("--topic-accent", theme.accent);
    element.style.setProperty("--card-accent", theme.accent);
  }
  if (theme.accentDark) {
    element.style.setProperty("--topic-accent-dark", theme.accentDark);
  }
  if (theme.accentSoft) {
    element.style.setProperty("--topic-accent-soft", theme.accentSoft);
  }
  return element;
}

function totalsForClass(schoolClass) {
  return schoolClass.topics.reduce(
    (total, topic) => ({
      learningPaths: total.learningPaths + (topic.learningPaths || []).length,
      files: total.files + (topic.files || []).length
    }),
    { learningPaths: 0, files: (schoolClass.support || []).length }
  );
}

function totalsForCatalog(classes) {
  return classes.reduce(
    (total, schoolClass) => {
      const classTotals = totalsForClass(schoolClass);
      return {
        topics: total.topics + schoolClass.topics.length,
        learningPaths: total.learningPaths + classTotals.learningPaths,
        files: total.files + classTotals.files
      };
    },
    { topics: 0, learningPaths: 0, files: 0 }
  );
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function parseHash() {
  const parts = window.location.hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);

  route = {
    classId: parts[0] || "",
    topicId: parts[1] || ""
  };
}

function navigate(classId, topicId = "") {
  const nextHash = classId
    ? `#/${encodeURIComponent(classId)}${topicId ? `/${encodeURIComponent(topicId)}` : ""}`
    : "#/";

  if (window.location.hash === nextHash) {
    parseHash();
    render();
  } else {
    window.location.hash = nextHash;
  }
}

function findClass(classId) {
  return catalogData.classes.find((schoolClass) => schoolClass.id === classId) || null;
}

function findTopic(schoolClass, topicId) {
  return schoolClass.topics.find((topic) => topic.id === topicId) || null;
}

function topicOwnMatchesQuery(topic, query) {
  if (!query) return true;
  return normalize(`${topic.title} ${topic.description}`).includes(normalize(query));
}

function topicMatchesQuery(topic, query) {
  if (!query) return true;
  const needle = normalize(query);
  const learningPathText = (topic.learningPaths || [])
    .map((item) => `${item.title} ${item.description}`)
    .join(" ");
  const fileText = (topic.files || [])
    .map((item) => `${item.title} ${item.category} ${item.type}`)
    .join(" ");

  return topicOwnMatchesQuery(topic, query) ||
    normalize(learningPathText).includes(needle) ||
    normalize(fileText).includes(needle);
}

function supportMatchesQuery(schoolClass, query) {
  if (!query) return true;
  return resourcesForQuery(schoolClass.support || [], query).length > 0;
}

function classMatchesQuery(schoolClass, query) {
  if (!query) return true;
  if (classOwnMatchesQuery(schoolClass, query)) return true;
  if (supportMatchesQuery(schoolClass, query)) return true;
  return schoolClass.topics.some((topic) => topicMatchesQuery(topic, query));
}

function classOwnMatchesQuery(schoolClass, query) {
  if (!query) return true;
  return normalize(`${schoolClass.title} ${schoolClass.description}`).includes(normalize(query));
}

function topicsForClass(schoolClass, query) {
  if (classOwnMatchesQuery(schoolClass, query)) return schoolClass.topics;
  return schoolClass.topics.filter((topic) => topicMatchesQuery(topic, query));
}

function resourcesForQuery(items, query) {
  if (!query) return items;
  const needle = normalize(query);
  return items.filter((item) =>
    normalize(`${item.title} ${item.description || ""} ${item.category || ""} ${item.type || ""} ${item.fileName || ""}`).includes(needle)
  );
}

function setSummary(text) {
  summaryRoot.textContent = text;
}

function renderBreadcrumb(schoolClass, topic) {
  const breadcrumb = document.createElement("nav");
  breadcrumb.className = "breadcrumb";
  breadcrumb.setAttribute("aria-label", "Pfad");

  breadcrumb.appendChild(createButton("crumb-button", "Klassen und Kurse", () => navigate("")));

  if (schoolClass) {
    breadcrumb.appendChild(createText("span", "crumb-separator", "/"));
    breadcrumb.appendChild(createButton("crumb-button", schoolClass.title, () => navigate(schoolClass.id)));
  }

  if (topic) {
    breadcrumb.appendChild(createText("span", "crumb-separator", "/"));
    breadcrumb.appendChild(createText("span", "crumb-current", topic.title));
  }

  return breadcrumb;
}

function renderHome(query) {
  const classes = catalogData.classes.filter((schoolClass) => classMatchesQuery(schoolClass, query));
  const totals = totalsForCatalog(classes);

  catalogRoot.replaceChildren();
  setSummary(query
    ? `${classes.length} passende Bereiche · ${plural(totals.topics, "Thema", "Themen")}`
    : `${catalogData.classes.length} Bereiche · ${plural(totals.topics, "Thema", "Themen")} · ${plural(totals.learningPaths, "Lernpfad", "Lernpfade")} · ${plural(totals.files, "Datei", "Dateien")}`
  );

  const header = document.createElement("section");
  header.className = "view-header";
  header.appendChild(createText("p", "step-label", "Schritt 1 von 2"));
  header.appendChild(createText("h2", "", "Klasse oder Kurs auswählen"));
  header.appendChild(createText("p", "view-copy", "Wähle zuerst den Bereich aus. Danach erscheinen die Themenfelder dieses Bereichs mit den passenden Lernpfaden und Materialien."));
  catalogRoot.appendChild(header);

  if (!classes.length) {
    catalogRoot.appendChild(createText("p", "empty-state", "Keine passenden Klassen oder Kurse gefunden."));
    return;
  }

  const grid = document.createElement("div");
  grid.className = "class-grid";

  for (const schoolClass of classes) {
    const classTotals = totalsForClass(schoolClass);
    const button = createButton("class-card", "", () => navigate(schoolClass.id));
    button.appendChild(createText("span", "card-kicker", "Bereich"));
    button.appendChild(createText("span", "class-title", schoolClass.title));
    if (schoolClass.description) {
      button.appendChild(createText("span", "card-description", schoolClass.description));
    }
    button.appendChild(createText(
      "span",
      "card-meta",
      `${plural(schoolClass.topics.length, "Thema", "Themen")} · ${plural(classTotals.learningPaths, "Lernpfad", "Lernpfade")} · ${plural(classTotals.files, "Datei", "Dateien")}`
    ));
    grid.appendChild(button);
  }

  catalogRoot.appendChild(grid);
}

function renderTopicPicker(schoolClass, topics, selectedTopic) {
  const section = document.createElement("section");
  section.className = "topic-picker-section";
  section.appendChild(createText("p", "step-label", "Schritt 2 von 2"));
  section.appendChild(createText("h2", "", "Themenfeld auswählen"));

  const grid = document.createElement("div");
  grid.className = "topic-grid";

  for (const topic of topics) {
    const button = createButton("topic-button", "", () => navigate(schoolClass.id, topic.id));
    applyTheme(button, topic.theme);
    if (selectedTopic && selectedTopic.id === topic.id) {
      button.classList.add("is-selected");
      button.setAttribute("aria-current", "true");
    }
    button.appendChild(createText("span", "topic-title", topic.title));
    if (topic.description) {
      button.appendChild(createText("span", "topic-description", topic.description));
    }
    button.appendChild(createText(
      "span",
      "card-meta",
      `${plural((topic.learningPaths || []).length, "Lernpfad", "Lernpfade")} · ${plural((topic.files || []).length, "Datei", "Dateien")}`
    ));
    grid.appendChild(button);
  }

  section.appendChild(grid);
  return section;
}

function renderSupportLink(item, theme) {
  const link = document.createElement("a");
  link.className = "file-link";
  applyTheme(link, theme);
  link.href = encodeURI(item.url);

  const copy = document.createElement("span");
  copy.className = "file-copy";
  copy.appendChild(createText("span", "file-title", item.title));
  if (item.description) {
    copy.appendChild(createText("span", "file-description", item.description));
  }
  link.appendChild(copy);

  const meta = document.createElement("span");
  meta.className = "file-meta";
  meta.appendChild(createText("span", "badge", item.category || "Unterstützung"));
  meta.appendChild(createText("span", "badge soft", item.type || "Datei"));
  link.appendChild(meta);

  return link;
}

function renderClassSupport(schoolClass, query) {
  const supportQuery = classOwnMatchesQuery(schoolClass, query) ? "" : query;
  const materials = resourcesForQuery(schoolClass.support || [], supportQuery);
  if (!materials.length) return null;

  const theme = { accent: "#c85f48", accentDark: "#23454a", accentSoft: "#faebe5" };
  const section = document.createElement("section");
  section.className = "support-section";
  section.appendChild(createText("p", "step-label", "Unterstützung"));
  section.appendChild(createText("h2", "", "Question Shells"));
  section.appendChild(createText("p", "view-copy", "Jahrgangsbezogene Vorlagen zum Formulieren von Physik- und Versuchsfragen."));

  const list = document.createElement("div");
  list.className = "support-list";
  for (const material of materials) {
    list.appendChild(renderSupportLink(material, theme));
  }

  section.appendChild(list);
  return section;
}

function renderLearningPaths(topic, query) {
  const learningPaths = resourcesForQuery(topic.learningPaths || [], query);
  const section = document.createElement("section");
  section.className = "resource-section";
  section.appendChild(createText("h3", "", "Lernpfade"));

  if (!learningPaths.length) {
    section.appendChild(createText("p", "empty-topic", query ? "Keine passenden Lernpfade gefunden." : "Noch keine Lernpfade vorhanden."));
    return section;
  }

  const grid = document.createElement("div");
  grid.className = "path-grid";

  for (const item of learningPaths) {
    const link = document.createElement("a");
    link.className = "path-card";
    applyTheme(link, topic.theme);
    link.href = encodeURI(item.url);
    link.appendChild(createText("span", "path-title", item.title));
    if (item.description) {
      link.appendChild(createText("span", "path-description", item.description));
    }
    grid.appendChild(link);
  }

  section.appendChild(grid);
  return section;
}

function renderFiles(topic, query) {
  const files = resourcesForQuery(topic.files || [], query);
  const section = document.createElement("section");
  section.className = "resource-section";
  section.appendChild(createText("h3", "", "Dateien"));

  if (!files.length) {
    section.appendChild(createText("p", "empty-topic", query ? "Keine passenden Dateien gefunden." : "Noch keine Dateien vorhanden."));
    return section;
  }

  const list = document.createElement("div");
  list.className = "file-list";

  for (const item of files) {
    const link = document.createElement("a");
    link.className = "file-link";
    applyTheme(link, topic.theme);
    link.href = encodeURI(item.url);
    link.appendChild(createText("span", "file-title", item.title));

    const meta = document.createElement("span");
    meta.className = "file-meta";
    meta.appendChild(createText("span", "badge", item.category || "Datei"));
    meta.appendChild(createText("span", "badge soft", item.type || "Datei"));
    link.appendChild(meta);
    list.appendChild(link);
  }

  section.appendChild(list);
  return section;
}

function renderTopicDetail(topic, query) {
  const resourceQuery = topicOwnMatchesQuery(topic, query) ? "" : query;
  const learningPaths = resourcesForQuery(topic.learningPaths || [], resourceQuery);
  const files = resourcesForQuery(topic.files || [], resourceQuery);
  const detail = document.createElement("section");
  detail.className = "topic-detail";
  detail.id = "themenmaterial";
  applyTheme(detail, topic.theme);

  const header = document.createElement("div");
  header.className = "topic-detail-header";
  header.appendChild(createText("p", "card-kicker", "Materialien zum Themenfeld"));
  header.appendChild(createText("h2", "", topic.title));
  if (topic.description) {
    header.appendChild(createText("p", "view-copy", topic.description));
  }
  header.appendChild(createText(
    "p",
    "resource-count",
    `${plural(learningPaths.length, "Lernpfad", "Lernpfade")} · ${plural(files.length, "Datei", "Dateien")}`
  ));

  detail.appendChild(header);
  detail.appendChild(renderLearningPaths(topic, resourceQuery));
  detail.appendChild(renderFiles(topic, resourceQuery));

  return detail;
}

function renderClassPage(schoolClass, query) {
  const topics = topicsForClass(schoolClass, query);
  const selectedTopic = route.topicId ? findTopic(schoolClass, route.topicId) : null;
  const visibleSelectedTopic = selectedTopic && topicMatchesQuery(selectedTopic, query) ? selectedTopic : null;

  catalogRoot.replaceChildren();

  const totals = totalsForClass(schoolClass);
  setSummary(`${schoolClass.title} · ${plural(schoolClass.topics.length, "Thema", "Themen")} · ${plural(totals.learningPaths, "Lernpfad", "Lernpfade")} · ${plural(totals.files, "Datei", "Dateien")}`);

  catalogRoot.appendChild(renderBreadcrumb(schoolClass, visibleSelectedTopic));

  const header = document.createElement("section");
  header.className = "view-header";
  header.appendChild(createText("p", "step-label", "Ausgewählter Bereich"));
  header.appendChild(createText("h2", "", schoolClass.title));
  header.appendChild(createText("p", "view-copy", "Wähle ein Themenfeld aus. Darunter werden die zugehörigen Lernpfade und Dateien angezeigt."));
  catalogRoot.appendChild(header);

  if (!topics.length) {
    catalogRoot.appendChild(createText("p", "empty-state", "Keine passenden Themenfelder gefunden."));
    const supportSection = renderClassSupport(schoolClass, query);
    if (supportSection) {
      catalogRoot.appendChild(supportSection);
    }
    return;
  }

  catalogRoot.appendChild(renderTopicPicker(schoolClass, topics, visibleSelectedTopic));

  const supportSection = renderClassSupport(schoolClass, query);
  if (supportSection) {
    catalogRoot.appendChild(supportSection);
  }

  if (visibleSelectedTopic) {
    catalogRoot.appendChild(renderTopicDetail(visibleSelectedTopic, query));
    const materialRoute = `${route.classId}/${route.topicId}`;
    const material = document.getElementById("themenmaterial");
    if (route.topicId && material && materialRoute !== lastMaterialRoute) {
      material.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    lastMaterialRoute = materialRoute;
  } else {
    lastMaterialRoute = `${route.classId}/`;
    const empty = document.createElement("section");
    empty.className = "empty-panel";
    empty.appendChild(createText("h3", "", "Noch kein Themenfeld ausgewählt"));
    empty.appendChild(createText("p", "", "Wähle oben ein Themenfeld aus, um Lernpfade und Dateien zu sehen."));
    catalogRoot.appendChild(empty);
  }
}

function render() {
  if (!catalogData) return;
  const query = searchInput.value.trim();

  if (!route.classId) {
    renderHome(query);
    return;
  }

  const schoolClass = findClass(route.classId);
  if (!schoolClass) {
    navigate("");
    return;
  }

  renderClassPage(schoolClass, query);
}

async function start() {
  try {
    parseHash();
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalogData = await response.json();
    render();
  } catch (error) {
    summaryRoot.textContent = "";
    catalogRoot.replaceChildren();
    const message = document.createElement("div");
    message.className = "error";
    message.textContent = "Das automatische Verzeichnis konnte nicht geladen werden. Prüfe, ob der GitHub-Pages-Build erfolgreich war.";
    catalogRoot.appendChild(message);
    console.error(error);
  }
}

window.addEventListener("hashchange", () => {
  parseHash();
  render();
});

searchInput.addEventListener("input", () => {
  render();
});

document.addEventListener("pointerdown", (event) => {
  const target = event.target.closest(".class-card, .topic-button, .path-card, .file-link, .crumb-button");
  if (!target) return;

  target.classList.remove("is-pressing");
  target.offsetWidth;
  target.classList.add("is-pressing");
  window.setTimeout(() => target.classList.remove("is-pressing"), 180);
});

start();
