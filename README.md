# Physik – lokale Git-/GitHub-Struktur mit fortlaufenden Wiederholungspräsentationen

Test der lokalen GitHub-Verknüpfung
Diese Struktur ist dafür gedacht, **lokal im Git-Repository** gepflegt und anschließend mit GitHub synchronisiert zu werden.
Für jedes Themenfeld liegt unter `praesentation/` eine fertige PowerPoint-Datei und eine editierbare Datei `praesentation.json`.

## Prinzip der fortlaufenden Präsentation

Die `.pptx`-Datei wird **nicht direkt als Binärdatei gepflegt**. Stattdessen werden neue Stunden in `praesentation/praesentation.json` ergänzt. Danach erzeugt der Generator alle PowerPoint-Dateien neu. Dadurch kann auch ein Codex-Agent die Inhalte zuverlässig bearbeiten.

Beispiel für eine neue Stunde im Feld `lessons`:

```json
{
  "title": "Stunde 03 – Wärmeleitung",
  "date": "2026-09-18",
  "learned": [
    "Wärmeleitung benötigt keinen Stofftransport.",
    "Metalle leiten Wärme meist besser als Holz oder Kunststoff."
  ],
  "experiment": "Metall- und Holzstab werden an einem Ende erwärmt; Temperaturentwicklung vergleichen.",
  "key": "Wärme wird bei der Wärmeleitung durch Wechselwirkungen benachbarter Teilchen weitergegeben.",
  "check": [
    "Warum fühlt sich Metall bei Raumtemperatur oft kälter an als Holz?",
    "Nenne einen guten und einen schlechten Wärmeleiter."
  ]
}
```

## Präsentationen bauen

1. Node.js installieren.
2. Im Repository einmal `npm install` ausführen.
3. Danach `npm run build:pptx` starten.

Unter Windows kann alternativ `build-presentations.ps1` ausgeführt werden.

### Automatisch bei jeder Änderung aktualisieren

Für die Arbeit mit Codex oder einem Editor kann die Überwachung einmal gestartet werden:

```powershell
.\watch-presentations.ps1
```

oder plattformunabhängig mit:

```bash
npm run watch:pptx
```

Solange die Überwachung läuft, wird jede Änderung an einer `praesentation.json` erkannt und die PowerPoint-Dateien werden automatisch neu erzeugt.

## Empfohlener Workflow nach jeder Physikstunde

1. Im passenden Themenordner `praesentation/praesentation.json` öffnen.
2. Einen neuen Eintrag unter `lessons` ergänzen.
3. Bei laufendem `npm run watch:pptx` wird die PowerPoint automatisch aktualisiert; andernfalls `npm run build:pptx` ausführen.
4. Änderungen mit Git committen und zu GitHub pushen.

Die Präsentation wächst damit Stunde für Stunde. Die ersten Folien bleiben als kompakte Grundübersicht erhalten; jede ergänzte Unterrichtsstunde erzeugt automatisch eine weitere Rückblickfolie.

## Für Codex

Die Regeln für automatisierte Bearbeitung stehen zusätzlich in `AGENTS.md`.
