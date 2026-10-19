const catalogRoot = document.getElementById("catalog");
const summaryRoot = document.getElementById("summary");
const searchInput = document.getElementById("search");

let catalogData = null;
let route = { classId: "", topicId: "", categoryId: "" };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let pendingNavigation = null;
const feedbackTimers = new WeakMap();
const interactiveSelector = ".class-card, .topic-button, .category-card, .path-card, .file-link, .crumb-button, .back-button, .clear-search, .video-download";

const categoryThemes = {
  lernpfade: { accent: "#7358bb", accentDark: "#503989", accentSoft: "#f0ebff" },
  simulationen: { accent: "#168184", accentDark: "#205d61", accentSoft: "#e2f6f1" },
  pruefungsvorbereitung: { accent: "#b34e76", accentDark: "#843554", accentSoft: "#fff0f4" },
  zusatzaufgaben: { accent: "#a36a19", accentDark: "#805015", accentSoft: "#fff4dc" },
  erklaervideos: { accent: "#4777bd", accentDark: "#33568c", accentSoft: "#ecf3ff" },
  freihandversuche: { accent: "#5a8341", accentDark: "#41662e", accentSoft: "#eef7e5" },
  arbeitsblaetter: { accent: "#ae6845", accentDark: "#82482c", accentSoft: "#fff0e6" },
  praesentationen: { accent: "#6269b8", accentDark: "#454b87", accentSoft: "#eff0ff" }
};

const materialCategories = [
  { id: "lernpfade", title: "Lernpfade", description: "Erarbeite die Inhalte Schritt für Schritt mit interaktiven Lernpfaden." },
  { id: "simulationen", title: "Simulationen", description: "Verändere Größen und untersuche physikalische Zusammenhänge." },
  { id: "pruefungsvorbereitung", title: "Prüfungsvorbereitung", description: "Übe für Tests und Klausuren mit Aufgaben, Tipps und Musterlösungen." },
  { id: "zusatzaufgaben", title: "Zusatzaufgaben", description: "Vertiefe dein Wissen mit zusätzlichen Aufgaben und Fermi-Fragen." },
  { id: "erklaervideos", title: "Erklärvideos", description: "Schau dir Erklärungen an und pausiere zum Nachdenken." },
  { id: "freihandversuche", title: "Freihandversuche", description: "Entdecke Physik mit einfachen Experimenten." },
  { id: "arbeitsblaetter", title: "Arbeitsblätter", description: "Bearbeite Aufgaben und halte deine Ergebnisse fest." },
  { id: "praesentationen", title: "Präsentationen", description: "Wiederhole die wichtigsten Inhalte des Unterrichts." },
  { id: "bilder", title: "Bilder", description: "Nutze Abbildungen und Schaubilder zum Themenbereich." },
  { id: "lernmaterial", title: "Lernmaterial", description: "Lies nach und ergänze dein Wissen zum Themenbereich." },
  { id: "loesungen", title: "Lösungen", description: "Vergleiche deine Ergebnisse und prüfe deinen Lösungsweg." },
  { id: "dateien", title: "Weitere Materialien", description: "Hier findest du weitere Dateien zum Themenbereich." }
];

function normalize(value) {
  return String(value || "").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function createText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createButton(className, text, onClick) {
  const button = createText("button", className, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function createLink(className, text, href) {
  const link = createText("a", className, text);
  link.href = href;
  return link;
}

function applyTheme(element, theme) {
  if (!theme) return element;
  if (theme.accent) {
    element.style.setProperty("--topic-accent", theme.accent);
    element.style.setProperty("--card-accent", theme.accent);
  }
  if (theme.accentDark) element.style.setProperty("--topic-accent-dark", theme.accentDark);
  if (theme.accentSoft) element.style.setProperty("--topic-accent-soft", theme.accentSoft);
  return element;
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function totalsForClass(schoolClass) {
  return schoolClass.topics.reduce((total, topic) => ({
    learningPaths: total.learningPaths + (topic.learningPaths || []).length,
    files: total.files + (topic.files || []).length
  }), { learningPaths: 0, files: (schoolClass.support || []).length });
}

function hashFor(classId = "", topicId = "", categoryId = "") {
  return "#/" + [classId, topicId, categoryId].filter(Boolean).map(encodeURIComponent).join("/");
}

function parseHash() {
  let parts;
  try {
    parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    parts = [];
  }
  route = { classId: parts[0] || "", topicId: parts[1] || "", categoryId: parts[2] || "" };
}

function redirect(classId = "", topicId = "") {
  window.location.replace(hashFor(classId, topicId));
}

function categoryForFile(item) {
  if (item.type === "MP4" || item.type === "WEBM") return "erklaervideos";
  return {
    Simulation: "simulationen",
    Klausurvorbereitung: "pruefungsvorbereitung",
    Prüfungsvorbereitung: "pruefungsvorbereitung",
    Zusatzaufgabe: "zusatzaufgaben",
    Erklärvideo: "erklaervideos",
    Freihandversuch: "freihandversuche",
    Arbeitsblatt: "arbeitsblaetter",
    Präsentation: "praesentationen",
    Bild: "bilder",
    Lernmaterial: "lernmaterial",
    Lösung: "loesungen"
  }[item.category] || "dateien";
}

function resourcesForQuery(items, query) {
  if (!query) return items;
  const needle = normalize(query);
  return items.filter((item) => normalize([
    item.title, item.description, item.category, item.label, item.level,
    ...(item.tags || []), item.type, item.fileName
  ].join(" ")).includes(needle));
}

function ownMatchesQuery(item, query) {
  return !query || normalize(`${item.title} ${item.description || ""}`).includes(normalize(query));
}

function groupsForTopic(topic, query = "") {
  return materialCategories.map((category) => {
    const items = category.id === "lernpfade"
      ? topic.learningPaths || []
      : (topic.files || []).filter((item) => categoryForFile(item) === category.id);
    return { ...category, items: ownMatchesQuery(category, query) ? items : resourcesForQuery(items, query) };
  }).filter((category) => category.items.length);
}

function topicMatchesQuery(topic, query) {
  return ownMatchesQuery(topic, query) || groupsForTopic(topic, query).length > 0;
}

function classMatchesQuery(schoolClass, query) {
  return ownMatchesQuery(schoolClass, query) || resourcesForQuery(schoolClass.support || [], query).length > 0 ||
    schoolClass.topics.some((topic) => topicMatchesQuery(topic, query));
}

function resourceQueryFor(schoolClass, topic, query) {
  return ownMatchesQuery(schoolClass, query) || ownMatchesQuery(topic, query) ? "" : query;
}

function trailFor(schoolClass, topic, category) {
  const trail = [{ title: "Klassen und Kurse", url: hashFor() }];
  if (schoolClass) trail.push({ title: schoolClass.title, url: hashFor(schoolClass.id) });
  if (topic) trail.push({ title: topic.title, url: hashFor(schoolClass.id, topic.id) });
  if (category) trail.push({ title: category.title, url: hashFor(schoolClass.id, topic?.id || "unterstuetzung", topic ? category.id : "") });
  return trail;
}

function renderPageNavigation(trail, bottom = false) {
  const navigation = document.createElement("nav");
  navigation.className = bottom ? "page-navigation bottom-navigation" : "page-navigation";
  navigation.setAttribute("aria-label", bottom ? "Zurück zur vorherigen Ebene" : "Seitennavigation");
  const parent = trail[trail.length - 2];
  navigation.appendChild(createLink("back-button", `← Zurück: ${parent.title}`, parent.url));
  if (!bottom) {
    const breadcrumb = document.createElement("ol");
    breadcrumb.className = "breadcrumb";
    breadcrumb.setAttribute("aria-label", "Navigationspfad");
    trail.forEach((entry, index) => {
      const item = document.createElement("li");
      if (index === trail.length - 1) {
        const current = createText("span", "crumb-current", entry.title);
        current.setAttribute("aria-current", "page");
        item.appendChild(current);
      } else {
        item.appendChild(createLink("crumb-button", entry.title, entry.url));
      }
      breadcrumb.appendChild(item);
    });
    navigation.appendChild(breadcrumb);
  }
  return navigation;
}

function renderHeader(title, copy, step, className = "view-header") {
  const header = document.createElement("header");
  header.className = className;
  header.appendChild(createText("p", "step-label", typeof step === "number" ? `Schritt ${step} von 4` : step));
  const heading = createText("h2", "", title);
  heading.tabIndex = -1;
  header.appendChild(heading);
  if (copy) header.appendChild(createText("p", "view-copy", copy));
  return header;
}

function renderEmptyState(message, query) {
  const panel = document.createElement("div");
  panel.className = "empty-state";
  panel.appendChild(createText("p", "", message));
  if (query) panel.appendChild(createButton("clear-search", "Suche löschen", () => {
    searchInput.value = "";
    render();
    searchInput.focus();
  }));
  return panel;
}

function renderHome(query) {
  const classes = catalogData.classes.filter((schoolClass) => classMatchesQuery(schoolClass, query));
  summaryRoot.textContent = query
    ? plural(classes.length, "passender Bereich", "passende Bereiche")
    : `${catalogData.classes.length} Klassen und Kurse · ${plural(catalogData.classes.reduce((sum, schoolClass) => sum + schoolClass.topics.length, 0), "Themenbereich", "Themenbereiche")}`;
  catalogRoot.appendChild(renderHeader("Klasse oder Kurs auswählen", "Wähle deinen Bereich aus. Im nächsten Schritt findest du die zugehörigen Themenbereiche.", 1));
  if (!classes.length) {
    catalogRoot.appendChild(renderEmptyState("Keine passenden Klassen oder Kurse gefunden.", query));
    return;
  }
  const grid = createText("div", "class-grid", "");
  for (const schoolClass of classes) {
    const totals = totalsForClass(schoolClass);
    const card = createLink("class-card", "", hashFor(schoolClass.id));
    card.appendChild(createText("span", "card-kicker", /^klasse-/.test(schoolClass.id) ? "Klasse" : "Kurs"));
    card.appendChild(createText("span", "class-title", schoolClass.title));
    if (schoolClass.description) card.appendChild(createText("span", "card-description", schoolClass.description));
    card.appendChild(createText("span", "card-meta", `${plural(schoolClass.topics.length, "Themenbereich", "Themenbereiche")} · ${plural(totals.learningPaths + totals.files, "Material", "Materialien")}`));
    grid.appendChild(card);
  }
  catalogRoot.appendChild(grid);
}

function renderClassPage(schoolClass, query) {
  const trail = trailFor(schoolClass);
  const topics = ownMatchesQuery(schoolClass, query) ? schoolClass.topics : schoolClass.topics.filter((topic) => topicMatchesQuery(topic, query));
  summaryRoot.textContent = `${schoolClass.title} · ${plural(topics.length, "Themenbereich", "Themenbereiche")}`;
  catalogRoot.appendChild(renderPageNavigation(trail));
  catalogRoot.appendChild(renderHeader(schoolClass.title, "Wähle einen Themenbereich aus. Auf der nächsten Seite entscheidest du, mit welcher Materialart du arbeiten möchtest.", 2));
  const grid = createText("div", "topic-grid", "");
  for (const topic of topics) {
    const card = applyTheme(createLink("topic-button", "", hashFor(schoolClass.id, topic.id)), topic.theme);
    card.appendChild(createText("span", "topic-title", topic.title));
    if (topic.description) card.appendChild(createText("span", "topic-description", topic.description));
    card.appendChild(createText("span", "card-meta", `${plural(groupsForTopic(topic).length, "Materialart", "Materialarten")} · ${plural((topic.learningPaths || []).length + (topic.files || []).length, "Material", "Materialien")}`));
    grid.appendChild(card);
  }
  catalogRoot.appendChild(topics.length ? grid : renderEmptyState("Keine passenden Themenbereiche gefunden.", query));
  const supportQuery = ownMatchesQuery(schoolClass, query) ? "" : query;
  const support = resourcesForQuery(schoolClass.support || [], supportQuery);
  if (support.length) {
    const section = createText("section", "support-section", "");
    section.appendChild(createText("h3", "", "Für den gesamten Kurs"));
    const card = createLink("category-card support-entry", "", hashFor(schoolClass.id, "unterstuetzung"));
    card.appendChild(createText("span", "category-title", "Question Shells"));
    card.appendChild(createText("span", "card-description", "Vorlagen zum Formulieren von Physik- und Versuchsfragen."));
    card.appendChild(createText("span", "card-meta", plural(support.length, "Vorlage", "Vorlagen")));
    section.appendChild(card);
    catalogRoot.appendChild(section);
  }
  catalogRoot.appendChild(renderPageNavigation(trail, true));
}

function renderTopicPage(schoolClass, topic, query) {
  const trail = trailFor(schoolClass, topic);
  const groups = groupsForTopic(topic, resourceQueryFor(schoolClass, topic, query));
  summaryRoot.textContent = `${schoolClass.title} · ${plural(groups.length, "Materialart", "Materialarten")}`;
  catalogRoot.appendChild(renderPageNavigation(trail));
  const section = applyTheme(createText("section", "topic-detail category-picker", ""), topic.theme);
  section.appendChild(renderHeader(topic.title, "Wähle eine Materialart aus. Danach erhältst du eine eigene Übersicht mit den passenden Materialien.", 3, "topic-detail-header"));
  const content = createText("div", "category-content", "");
  content.appendChild(createText("h3", "", "Materialart auswählen"));
  const grid = createText("div", "category-grid", "");
  for (const group of groups) {
    const card = applyTheme(createLink("category-card", "", hashFor(schoolClass.id, topic.id, group.id)), categoryThemes[group.id] || topic.theme);
    card.dataset.category = group.id;
    card.appendChild(createText("span", "category-title", group.title));
    card.appendChild(createText("span", "card-description", group.description));
    card.appendChild(createText("span", "card-meta", plural(group.items.length, "Material", "Materialien")));
    card.appendChild(createText("span", "card-action", "Materialien ansehen →"));
    grid.appendChild(card);
  }
  content.appendChild(groups.length ? grid : renderEmptyState(query ? "Keine passenden Materialarten gefunden." : "Zu diesem Themenbereich sind noch keine Materialien vorhanden.", query));
  section.appendChild(content);
  catalogRoot.appendChild(section);
  catalogRoot.appendChild(renderPageNavigation(trail, true));
}

function renderResourceLink(item, theme, learningPath = false) {
  const link = applyTheme(createLink(learningPath ? "path-card" : "file-link", "", encodeURI(item.url)), theme);
  const copy = createText("span", "file-copy", "");
  copy.appendChild(createText("span", learningPath ? "path-title" : "file-title", item.title));
  if (item.description) copy.appendChild(createText("span", "file-description", item.description));
  link.appendChild(copy);
  if (!learningPath) {
    const meta = createText("span", "file-meta", "");
    meta.appendChild(createText("span", "badge", item.label || item.category || "Datei"));
    if (item.level) meta.appendChild(createText("span", "badge soft", item.level));
    if (item.type) meta.appendChild(createText("span", "badge soft", item.type));
    link.appendChild(meta);
  }
  return link;
}

function renderVideos(items) {
  const grid = createText("div", "video-grid", "");
  for (const item of items) {
    const card = createText("article", "video-card", "");
    card.appendChild(createText("h3", "video-title", item.title));
    if (item.description) card.appendChild(createText("p", "video-description", item.description));
    const player = document.createElement("video");
    player.controls = true;
    player.preload = "none";
    player.playsInline = true;
    player.setAttribute("aria-label", item.title);
    if (item.poster) player.poster = encodeURI(item.poster);
    const source = document.createElement("source");
    source.src = encodeURI(item.url);
    source.type = item.type === "WEBM" ? "video/webm" : "video/mp4";
    player.appendChild(source);
    player.appendChild(createText("p", "", "Dein Browser unterstützt die Videowiedergabe nicht. Nutze den Download unter dem Video."));
    card.appendChild(player);
    const hints = [];
    if (item.durationSeconds) {
      const duration = Math.round(item.durationSeconds);
      hints.push(`${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")} Minuten`);
    }
    if (item.silent) hints.push("Ohne Ton · Erklärungen im Bild");
    hints.push("Zum Nachdenken pausieren");
    card.appendChild(createText("p", "video-hint", hints.join(" · ")));
    const download = createLink("video-download", "Video herunterladen", encodeURI(item.url));
    download.download = item.url.split("/").pop();
    card.appendChild(download);
    if (item.checkQuestion) card.appendChild(createText("p", "video-question", `Prüfe dich: ${item.checkQuestion}`));
    grid.appendChild(card);
  }
  return grid;
}

function renderMaterialList(items, category, theme, query) {
  const section = applyTheme(createText("section", "resource-section", ""), theme);
  section.setAttribute("aria-label", category.title);
  if (!items.length) {
    section.appendChild(renderEmptyState("Keine passenden Materialien gefunden.", query));
  } else if (category.id === "erklaervideos") {
    section.appendChild(renderVideos(items));
  } else {
    const isLearningPath = category.id === "lernpfade";
    const list = createText("div", isLearningPath ? "path-grid" : "file-list", "");
    for (const item of items) list.appendChild(renderResourceLink(item, theme, isLearningPath));
    section.appendChild(list);
  }
  return section;
}

function renderCategoryPage(schoolClass, topic, category, query) {
  const trail = trailFor(schoolClass, topic, category);
  const theme = categoryThemes[category.id] || topic.theme;
  const group = groupsForTopic(topic, resourceQueryFor(schoolClass, topic, query)).find((item) => item.id === category.id);
  const items = group?.items || [];
  summaryRoot.textContent = `${schoolClass.title} · ${topic.title} · ${plural(items.length, "Material", "Materialien")}`;
  catalogRoot.appendChild(renderPageNavigation(trail));
  const section = applyTheme(createText("section", "topic-detail material-page", ""), theme);
  section.dataset.category = category.id;
  section.appendChild(renderHeader(category.title, category.description, 4, "topic-detail-header"));
  section.appendChild(renderMaterialList(items, category, theme, query));
  catalogRoot.appendChild(section);
  catalogRoot.appendChild(renderPageNavigation(trail, true));
}

function renderSupportPage(schoolClass, query) {
  const category = { title: "Question Shells", id: "unterstuetzung" };
  const trail = trailFor(schoolClass, null, category);
  const items = resourcesForQuery(schoolClass.support || [], ownMatchesQuery(schoolClass, query) ? "" : query);
  summaryRoot.textContent = `${schoolClass.title} · ${plural(items.length, "Vorlage", "Vorlagen")}`;
  catalogRoot.appendChild(renderPageNavigation(trail));
  const section = createText("section", "topic-detail material-page", "");
  section.appendChild(renderHeader(category.title, "Jahrgangsbezogene Vorlagen zum Formulieren von Physik- und Versuchsfragen.", "Kursmaterialien", "topic-detail-header"));
  section.appendChild(renderMaterialList(items, category, null, query));
  catalogRoot.appendChild(section);
  catalogRoot.appendChild(renderPageNavigation(trail, true));
}

function render(focusHeading = false) {
  if (!catalogData) return;
  const query = searchInput.value.trim();
  const schoolClass = catalogData.classes.find((item) => item.id === route.classId);
  const topic = schoolClass?.topics.find((item) => item.id === route.topicId);
  const category = topic && groupsForTopic(topic).find((item) => item.id === route.categoryId);
  if (route.classId && !schoolClass) return redirect();
  const isSupportPage = route.topicId === "unterstuetzung" && (schoolClass?.support || []).length > 0;
  if (route.topicId && !topic && !isSupportPage) return redirect(schoolClass.id);
  if (route.categoryId && !category) return redirect(schoolClass.id, isSupportPage ? "unterstuetzung" : topic.id);

  catalogRoot.replaceChildren();
  if (!schoolClass) renderHome(query);
  else if (isSupportPage) renderSupportPage(schoolClass, query);
  else if (!topic) renderClassPage(schoolClass, query);
  else if (!category) renderTopicPage(schoolClass, topic, query);
  else renderCategoryPage(schoolClass, topic, category, query);

  const heading = catalogRoot.querySelector("h2");
  document.title = [category?.title || (isSupportPage ? "Question Shells" : ""), topic?.title, schoolClass?.title, "Physiksammlung"].filter(Boolean).join(" · ");
  if (focusHeading && heading) {
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
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
    catalogRoot.replaceChildren(createText("div", "error", "Das automatische Verzeichnis konnte nicht geladen werden. Prüfe, ob der GitHub-Pages-Build erfolgreich war."));
    console.error(error);
  }
}

function clearPendingNavigation() {
  window.clearTimeout(pendingNavigation);
  pendingNavigation = null;
}

function playSelectionFeedback(target, event) {
  window.clearTimeout(feedbackTimers.get(target));
  target.querySelectorAll(".selection-ripple").forEach((ripple) => ripple.remove());
  target.classList.remove("is-activating");
  const style = getComputedStyle(target);
  target.style.setProperty("--interaction-accent", style.getPropertyValue("--card-accent").trim() || style.getPropertyValue("--accent").trim());
  void target.offsetWidth;
  target.classList.add("is-activating");

  if (!reducedMotion.matches) {
    const bounds = target.getBoundingClientRect();
    const ripple = createText("span", "selection-ripple", "");
    ripple.setAttribute("aria-hidden", "true");
    const diameter = Math.hypot(bounds.width, bounds.height) * 2;
    const fromPointer = (event.type === "pointerdown" || event.detail > 0) && Number.isFinite(event.clientX);
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${fromPointer ? event.clientX - bounds.left : bounds.width / 2}px`;
    ripple.style.top = `${fromPointer ? event.clientY - bounds.top : bounds.height / 2}px`;
    target.appendChild(ripple);
  }

  feedbackTimers.set(target, window.setTimeout(() => {
    target.classList.remove("is-activating");
    target.querySelectorAll(".selection-ripple").forEach((ripple) => ripple.remove());
    feedbackTimers.delete(target);
  }, 460));
}

window.addEventListener("hashchange", () => {
  clearPendingNavigation();
  parseHash();
  render(true);
});
searchInput.addEventListener("input", () => {
  clearPendingNavigation();
  render();
});
document.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = event.target.closest(interactiveSelector);
  if (target) playSelectionFeedback(target, event);
});
document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = event.target.closest(interactiveSelector);
  if (!target || !target.isConnected) return;
  if (!target.classList.contains("is-activating")) playSelectionFeedback(target, event);

  // Allow the confirmation to register before moving to the next overview.
  // Downloads, material links and modified clicks retain their browser behavior.
  const href = target.getAttribute("href");
  if (target.tagName !== "A" || !href?.startsWith("#/") || target.hasAttribute("download") ||
      (target.target && target.target !== "_self")) return;
  event.preventDefault();
  clearPendingNavigation();
  if (reducedMotion.matches) window.location.hash = href;
  else pendingNavigation = window.setTimeout(() => {
    pendingNavigation = null;
    window.location.hash = href;
  }, 150);
});

start();
