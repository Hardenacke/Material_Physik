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

Die Website zeigt die Struktur:

```text
Jahrgang
└── Themengebiet
    └── Lernpfade
```

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
