# AGENTS.md – Regeln für Codex

- PowerPoint-Dateien unter `**/praesentation/*.pptx` **nicht direkt binär bearbeiten**.
- Inhaltliche Änderungen immer in der zugehörigen `praesentation.json` vornehmen.
- Neue Unterrichtsstunden ausschließlich als neues Objekt im Array `lessons` ergänzen; bestehende Stunden nicht ohne Auftrag überschreiben.
- Nach Änderungen `npm run build:pptx` ausführen.
- Dateinamen, Ordnernamen und relative Pfade beibehalten, damit Links auf GitHub Pages stabil bleiben.
- Schülerrelevante Materialien in die Themenordner `lernmaterial`, `lernpfade`, `arbeitsblaetter`, `simulationen`, `bilder` einsortieren.
- Präsentationsfolien knapp halten: pro Stundenrückblick maximal 3 Punkte unter `learned`, ein Experiment/Beispiel, ein zentraler Merksatz bzw. eine Formel und 2–3 kurze Checkfragen.
- Formeln als Unicode/Plaintext erfassen (z. B. `v = Δs/Δt`), damit der Generator sie zuverlässig in PowerPoint schreibt.
- Läuft `npm run watch:pptx`, genügt das Speichern der JSON-Datei; andernfalls nach jeder inhaltlichen Änderung den Build manuell starten.


# Physiksammlung

## Grundregel

Arbeite ausschließlich innerhalb dieses Repositorys.

Erzeugte Unterrichtsmaterialien sollen direkt als Dateien im passenden
lokalen Ordner gespeichert werden. Inhalte sollen nicht nur im Chat
ausgegeben werden.

## Ordner

- Arbeitsblätter → arbeitsblaetter/
- Lernpfade → lernpfade/
- Simulationen → simulationen/
- Bilder → bilder/
- Präsentationen → praesentation/
- Lösungen → loesungen/

## Neue Materialien

Neue Materialien immer in das fachlich passende Themenfeld einordnen.

Bestehende Ordnerstrukturen nicht ohne ausdrückliche Anweisung verändern.

## Git

Keine Commits und keine Pushes ohne ausdrückliche Aufforderung durchführen.