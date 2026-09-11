const catalogRoot = document.getElementById("catalog");
const summaryRoot = document.getElementById("summary");
const searchInput = document.getElementById("search");

let catalogData = null;

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function totalLearningPaths(classes) {
  return classes.reduce(
    (sum, schoolClass) => sum + schoolClass.topics.reduce((topicSum, topic) => topicSum + topic.learningPaths.length, 0),
    0
  );
}

function createText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function filteredClasses(query) {
  if (!query) return catalogData.classes;
  const needle = normalize(query);

  return catalogData.classes
    .map((schoolClass) => {
      const classMatches = normalize(`${schoolClass.title} ${schoolClass.description}`).includes(needle);
      const topics = schoolClass.topics
        .map((topic) => {
          const topicMatches = normalize(`${topic.title} ${topic.description}`).includes(needle);
          const learningPaths = topic.learningPaths.filter((item) =>
            normalize(`${item.title} ${item.description}`).includes(needle)
          );

          if (classMatches || topicMatches) return { ...topic };
          if (learningPaths.length) return { ...topic, learningPaths };
          return null;
        })
        .filter(Boolean);

      return topics.length ? { ...schoolClass, topics } : null;
    })
    .filter(Boolean);
}

function render(query = "") {
  const classes = filteredClasses(query.trim());
  catalogRoot.replaceChildren();

  const count = totalLearningPaths(classes);
  summaryRoot.textContent = query.trim()
    ? `${count} passende${count === 1 ? "r" : ""} Lernpfad${count === 1 ? "" : "e"}`
    : `${catalogData.classes.length} Bereiche · ${totalLearningPaths(catalogData.classes)} Lernpfad${totalLearningPaths(catalogData.classes) === 1 ? "" : "e"}`;

  if (!classes.length) {
    catalogRoot.appendChild(createText("p", "empty-state", "Keine passenden Lernpfade gefunden."));
    return;
  }

  for (const schoolClass of classes) {
    const section = document.createElement("section");
    section.className = "class-section";

    const header = document.createElement("div");
    header.className = "class-header";
    header.appendChild(createText("h2", "", schoolClass.title));

    const classCount = schoolClass.topics.reduce((sum, topic) => sum + topic.learningPaths.length, 0);
    header.appendChild(createText("span", "count", `${schoolClass.topics.length} Themen · ${classCount} Lernpfade`));
    section.appendChild(header);

    const topicList = document.createElement("div");
    topicList.className = "topic-list";

    for (const topic of schoolClass.topics) {
      const details = document.createElement("details");
      details.className = "topic";
      details.open = Boolean(query.trim());

      const summary = document.createElement("summary");
      summary.appendChild(createText("span", "", topic.title));
      summary.appendChild(createText("span", "count", `${topic.learningPaths.length} Lernpfad${topic.learningPaths.length === 1 ? "" : "e"}`));
      details.appendChild(summary);

      const body = document.createElement("div");
      body.className = "topic-body";

      if (topic.description) {
        body.appendChild(createText("p", "topic-description", topic.description));
      }

      if (!topic.learningPaths.length) {
        body.appendChild(createText("p", "empty-topic", "Noch keine Lernpfade vorhanden."));
      } else {
        const grid = document.createElement("div");
        grid.className = "path-grid";

        for (const item of topic.learningPaths) {
          const link = document.createElement("a");
          link.className = "path-card";
          link.href = encodeURI(item.url);
          link.appendChild(createText("span", "path-title", item.title));
          if (item.description) {
            link.appendChild(createText("span", "path-description", item.description));
          }
          grid.appendChild(link);
        }

        body.appendChild(grid);
      }

      details.appendChild(body);
      topicList.appendChild(details);
    }

    section.appendChild(topicList);
    catalogRoot.appendChild(section);
  }
}

async function start() {
  try {
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

searchInput.addEventListener("input", () => {
  if (catalogData) render(searchInput.value);
});

start();
