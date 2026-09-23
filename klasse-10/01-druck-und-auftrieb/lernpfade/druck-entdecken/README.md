# Druck entdecken – mehrseitiger Lernpfad

## Dateien
- `index.html` – Schritt 1: Vorwissen
- `erkundung.html` – Schritt 2: Druckwaage erkunden
- `auswertung.html` – Schritt 3: Messwerte auswerten
- `regel.html` – Schritt 4: Druckformel herleiten
- `uebungen.html` – Schritt 5: Formel anwenden und festigen
- `Druckwaage_Simulation.html` – vorhandene Simulation
- `assets/style.css` – gemeinsames Layout
- `assets/app.js` – Fortschritt, Freischaltung, HyperFrames-Fallback
- `hyperframes/gewichtskraft.html` – HyperFrames-Komposition zur Wiederholung
- `hyperframes/druckvergleich.html` – HyperFrames-Komposition zur Sicherung

## Navigation
Der Lernpfad ist **nicht mehr eine lange Einzelseite**. Jeder Schritt liegt in einer eigenen HTML-Datei. Neu ergänzt ist eine fünfte Übungsseite.
Die nächste Seite wird erst nach der vorgesehenen Lernhandlung freigeschaltet.
Der Fortschritt wird über `localStorage` gespeichert.

## HyperFrames
Die Seiten laden den offiziellen `@hyperframes/player` über jsDelivr und betten die beiden lokalen HyperFrames-Kompositionen als `<hyperframes-player>` ein.
Wenn die Bibliothek offline nicht geladen werden kann, schaltet `assets/app.js` automatisch auf ein normales lokales `iframe` um. Dadurch bleibt der Lernpfad auch ohne Internet nutzbar; lediglich der offizielle HyperFrames-Player entfällt.

## GitHub Pages
Alle Dateien und Ordner gemeinsam in denselben Repository-Ordner hochladen. Einstieg ist `index.html`.
