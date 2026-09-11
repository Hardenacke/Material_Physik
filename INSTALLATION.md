# Installation in `Material_Physik`

Die Dateien dieses Pakets sind so vorbereitet, dass sie in das Stammverzeichnis des lokalen Repositorys

`C:\Users\johar\OneDrive\Schule\Material_Physik`

kopiert werden können.

## Vorgehen

1. Inhalt dieses Pakets in das Stammverzeichnis `Material_Physik` kopieren.
2. Vorhandene `package.json` und `AGENTS.md` durch die Versionen aus diesem Paket ersetzen. Bestehende Präsentationsskripte bleiben unverändert erhalten.
3. In VS Code `git status` prüfen.
4. Änderungen committen und pushen.
5. Auf GitHub einmal `Settings` → `Pages` → `Build and deployment` → `Source: GitHub Actions` wählen.

Danach wird bei jedem Push auf `main` die Lernpfad-Übersicht automatisch neu erzeugt und veröffentlicht.

## Empfohlener Codex-Auftrag für neue Lernpfade

> Erstelle den Lernpfad direkt im passenden Themengebiet unter `lernpfade/<slug>/index.html`. Lege daneben eine `meta.json` gemäß `AGENTS.md` an. Bearbeite `data.json` nicht manuell; das Verzeichnis wird automatisch erzeugt.
