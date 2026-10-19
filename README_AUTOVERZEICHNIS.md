# Automatisches Lernpfad-Verzeichnis

Dieses Paket ergänzt die bestehende Physiksammlung um eine automatisch erzeugte GitHub-Pages-Übersicht.

## Funktionsprinzip

```text
Codex erstellt einen Lernpfad
        ↓
Datei liegt unter <Jahrgang>/<Thema>/lernpfade/
        ↓
git push auf main
        ↓
GitHub Actions startet
        ↓
tools/build-catalog.js durchsucht die Ordner
        ↓
data.json wird automatisch erzeugt
        ↓
_site wird gebaut
        ↓
GitHub Pages wird veröffentlicht
```

Die Website zeigt die Struktur auf vier getrennten Ansichten:

```text
1. Klasse oder Kurs auswählen
2. Themenbereich auswählen
3. Materialart auswählen (z. B. Lernpfade, Simulationen, Prüfungsvorbereitung)
4. Material in der eigenen Übersicht auswählen und öffnen
```

Jede Unterseite hat oben und unten einen Zurück-Button zur vorherigen Ebene.
Der Navigationspfad erlaubt direkte Sprünge zu den übergeordneten Übersichten.
Die Browsernavigation und direkte Links funktionieren auf allen Ebenen, etwa
`#/ef/01-grundlagen-der-mechanik/simulationen`. Bestehende Kurs-, Themen- und
Materiallinks bleiben gültig. Die Suche filtert die Auswahl auf jeder Ebene;
Materialarten ohne Inhalte erscheinen nicht. Kursbezogene Question Shells sind
über eine eigene Kachel und Materialseite in der Kursübersicht erreichbar.
Der Ordner `unterstuetzung/` erscheint dabei nicht zusätzlich als Themenbereich.

Das helle Farbkonzept verbindet Mint, Lavendel, Rosé und Apricot. Materialarten
haben feste Akzentfarben, die auf ihrer Materialseite wiederkehren. Kacheln
und Navigationsbuttons bestätigen die Auswahl durch Aufleuchten, eine Farbwelle
und eine kurze Wackelbewegung. Dies funktioniert auch mit Touch und Tastatur.
Die Systemeinstellung für reduzierte Bewegung unterbindet Animationen und
öffnet die nächste Übersicht ohne die kurze Animationspause. Materialdownloads
und das Öffnen von Links in neuen Tabs behalten ihr gewohntes Verhalten.

## Neue Lernpfade

Bevorzugte Struktur:

```text
klasse-8/
└── 01-optische-instrumente/
    └── lernpfade/
        └── reflexionsgesetz/
            ├── index.html
            └── meta.json
```

Beispiel `meta.json`:

```json
{
  "title": "Reflexionsgesetz",
  "description": "Interaktiver Lernpfad zur Reflexion von Licht.",
  "type": "lernpfad",
  "visible": true,
  "order": 10
}
```

Auch die bisherige Struktur mit einzelnen HTML-Dateien direkt unter `lernpfade/` wird automatisch erkannt. Der Generator liest dann den HTML-`<title>` aus. Optional kann zu `lernpfad-auftrieb.html` eine Datei `lernpfad-auftrieb.meta.json` angelegt werden.

Weitere sichtbare Materialien werden automatisch der passenden Materialart im jeweiligen Themenbereich zugeordnet, z. B. Präsentationen, Bilder oder Simulationen. Sonstige Dateien erscheinen unter **Weitere Materialien**. Interne JSON-Dateien wie `praesentation.json`, `meta.json`, `thema.json` oder `jahrgang.json` werden nicht angezeigt.

## Fermi-Aufgaben als Zusatzaufgaben

Die 31 importierten Fermi-Aufgaben liegen nach Jahrgang und Themenfeld unter
`lernmaterial/fermi-physik/`. Auf Pages erscheinen sie auf der eigenen Materialseite
**Zusatzaufgaben**, jeweils mit dem Label **Aufgabe**. Sie sind über die
Themenbereiche erreichbar und über Titel, Aufgabenstellung,
Jahrgang, Kategorie und Suchbegriffe wie „Fermi“ auffindbar.

Beispiel für die Metadaten neben `01-wasser-im-wasserkocher.html`:

```json
{
  "title": "Wasser im Wasserkocher",
  "description": "Schätzt die benötigte Wärmeenergie.",
  "type": "aufgabe",
  "level": "Klasse 5/6",
  "tags": ["Fermi-Aufgabe"],
  "visible": true,
  "order": 1
}
```

Der Dateiname lautet `01-wasser-im-wasserkocher.meta.json`. Das Dateiformat
bleibt im Katalog als `HTML` erhalten; `type: "aufgabe"` in den Metadaten
bestimmt die Kategorie „Zusatzaufgabe“ und das Label „Aufgabe“.

Jeder Themenordner enthält eine lokale Aufgabenübersicht `index.html` und
die zugehörigen Aufgaben aus `Fermi-Aufgaben_Physik.md` als Download. Ihre
jeweiligen `.meta.json`-Dateien mit `"visible": false` verhindern doppelte
Einträge im Katalog. Rücklinks führen über die lokale Übersicht zum
Themenfeld auf Pages, auch unter einem GitHub-Pages-Projektpfad.

Die ursprünglichen Jahrgangsangaben der Aufgaben bleiben erhalten. Bei
übergreifenden Angaben wie „Klasse 9/10“ liegt die Aufgabe einmal im
fachlich passenden Themenfeld eines dieser Jahrgänge. Für Klasse 6 wurden
die Themenfelder „Schall“ und „Licht“ ergänzt.

Die neue Datei [Prompt_Fermi-Aufgaben_Physik.md](Prompt_Fermi-Aufgaben_Physik.md)
enthält den mitgelieferten Fachprompt für künftige Agentenaufträge und die
Regeln zur Einbindung weiterer Aufgaben. Sie wird nicht in die Schülerwebsite
kopiert. Die vorhandene `AGENTS.md` bleibt unverändert.

Jede Fermi-Aufgabe hat zwei Ansichten: zuerst eine kurze Aufgabenstellung mit
einem passenden Bild, danach die offene Aufforderung zum eigenen Lösungsweg.
Aufgabentext und Bild bleiben auch im zweiten Schritt sichtbar. Es gibt keine
Eingabefelder, vorgegebenen Teilschritte, Formelhinweise oder Musterlösungen.
Die lokalen Übersichten und Markdown-Downloads enthalten dieselben kurzen Texte.
Die Bilder liegen im jeweiligen Themenordner unter `bilder/fermi-physik/`;
ihre Metadaten verhindern zusätzliche Katalogeinträge.

Die Texte und Bildbeschreibungen werden zentral in `tools/fermi-tasks.json`
gepflegt. `npm run build:fermi` erzeugt daraus die vorhandenen HTML-Seiten,
Metadaten, lokalen Übersichten und Markdown-Sammlungen. Dieser Schritt ist auch
in `npm run build:site` enthalten. Die Bildprompts und ihre zugehörigen Dateien
sind in `tools/fermi-image-prompts.json` dokumentiert.

## Klausurvorbereitung

Im EF-Themenfeld **Grundlagen der Mechanik** liegt der interaktive
**Aufgabenpool Kinematik – Physik EF** unter dem bestehenden Pfad
`lernmaterial/klausurvorbereitung/Aufgabe_Zwei_Fallhoehen_interaktiv.html`.
Er ersetzt das bisherige Tool „Zwei Fallhöhen vergleichen“ und enthält
51 Aufgaben in sieben Themenbereichen mit direkter Ergebnisprüfung,
gestuften Tipps und Musterlösungen. Die Formeln sind vollständig als
MathML vorgerendert und benötigen keine CDN-Verbindung. Die Diagramme
enthalten beschriftete SVG-Achsen mit Einheiten und Zahlenmaßstäben;
Lösungskurven werden erst mit der Musterlösung eingeblendet.

Das Themenfeld zeigt eine Kachel **Prüfungsvorbereitung**, die zur eigenen
Materialübersicht führt. Das bestehende Label **Klausurvorbereitung** bleibt
bei den Materialien erhalten. Der Einführungstext verweist auf Aufgaben,
Tipps und Musterlösungen zur Vorbereitung auf Tests und Klausuren.

Weitere Materialien erhalten neben der HTML-Datei eine gleichnamige
`.meta.json` mit `"type": "klausurvorbereitung"`. Titel, Beschreibung,
Jahrgang (`level`), Suchbegriffe (`tags`), Sichtbarkeit und Reihenfolge werden
wie bei den Zusatzaufgaben gepflegt. Der Katalog führt diese Materialien
einmal in der Kategorie „Klausurvorbereitung“; das Dateiformat bleibt HTML.

## Lokal testen

Für den automatischen GitHub-Pages-Build ist lokal kein zusätzliches npm-Paket nötig. Falls Node.js installiert ist:

```powershell
npm run build:catalog
npm run build:site
```

Danach liegt die fertige Website unter `_site/`.

## Einmalige GitHub-Einstellung

Nach dem ersten Push auf GitHub:

1. Repository auf GitHub öffnen.
2. `Settings` → `Pages`.
3. Unter `Build and deployment` als Quelle `GitHub Actions` wählen.
4. Unter `Actions` prüfen, ob der Workflow **Physiksammlung veröffentlichen** erfolgreich durchläuft.

Danach reicht jeder normale Push auf `main`. Das Verzeichnis und GitHub Pages werden automatisch neu gebaut.

## Optionale Metadaten für Jahrgänge und Themen

In einem Jahrgangsordner kann optional `jahrgang.json` liegen:

```json
{
  "title": "Klasse 8",
  "order": 8,
  "visible": true
}
```

In einem Themenordner kann optional `thema.json` liegen:

```json
{
  "title": "Optische Instrumente",
  "description": "Reflexion, Brechung und optische Geräte",
  "order": 1,
  "visible": true
}
```

Ohne diese Dateien werden Namen und Reihenfolge automatisch aus der vorhandenen Ordnerstruktur bestimmt.
