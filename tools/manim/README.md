# Manim-Erklärvideos

Die drei Skripte aus `Manim_Erklaervideos_Paket.zip` sind in die Physiksammlung
übernommen. Alle Videos enthalten eingeblendete Erklärungen und keine Tonspur.

| Video | Jahrgang und Themenfeld | Python-Quelle und fertige MP4 |
|---|---|---|
| Reflexion, Spiegelbild, Brechung und Sammellinse | Klasse 8 · Optische Instrumente | `klasse-8/01-optische-instrumente/lernmaterial/erklaervideos/reflexion-und-brechung/optik_klasse8.*` |
| Reflexionsgesetz mit veränderlichem Winkel | Klasse 8 · Optische Instrumente | `klasse-8/01-optische-instrumente/lernmaterial/erklaervideos/reflexionsgesetz/reflexionsgesetz.*` |
| Äquivalenzumformungen | Klasse 8 · Bewegung, mathematische Rechenhilfe | `klasse-8/03-bewegung/lernmaterial/erklaervideos/aequivalenzumformungen/aequivalenzumformungen.*` |

Das Gleichungsbeispiel ist eine fachübergreifende Unterstützung zum Rechnen
mit physikalischen Formeln. Es erklärt selbst noch keine Bewegungsformel.

## Erneut rendern

Im Repository ist eine lokale Umgebung `.venv-manim` mit Python 3.12 eingerichtet.
Folgender Befehl funktioniert auch ohne global installiertes Node.js:

```powershell
.\.venv-manim\Scripts\node.exe tools/render-videos.js
```

Mit Node.js im Suchpfad alternativ:

```powershell
npm run build:videos
npm run build:videos -- --only reflexion-und-brechung
npm run build:videos -- --preview
```

`--only` akzeptiert den Namen eines Videoordners. Eine Endfassung wird als
1920 × 1080 Pixel, 30 fps, H.264/yuv420p erzeugt. Der gemeinsame Renderer findet
`video.json` automatisch unter `<Jahrgang>/<Thema>/lernmaterial/erklaervideos/<Video>/`.
Er legt fertige MP4-Dateien neben den Python-Quellen ab und aktualisiert
Laufzeit, Dateigröße und Vorschaubild in den Metadaten. Das MP4 wird für einen
schnellen Wiedergabestart im Browser vorbereitet (`faststart`).

Der Node-Befehl baut nach erfolgreichen Endfassungen auch Katalog und `_site`.
Vorschauen liegen ausschließlich in `.build/manim/<Video>/vorschau.mp4` und
ersetzen keine Endfassung. Eine fehlgeschlagene Szenenberechnung ersetzt das
bisherige Video ebenfalls nicht. Bilder liegen im jeweiligen Themenordner unter
`bilder/erklaervideos/`. Zwischendateien und Python-Umgebungen sind Git-ignoriert.

Die Szeneninhalte werden in den Python-Dateien bearbeitet. `video.json` steuert
den gemeinsamen Renderer und die Anzeige auf Pages. `inhalt.json` zum langen
Optikvideo ist ein Drehbuch-Export mit geplanten Zeiten, keine Szenenkonfiguration.
Der direkte Aufruf von `optik_klasse8.py` aus dem ursprünglichen Paket funktioniert
weiterhin; für aktualisierte Metadaten, Vorschaubilder und Pages den gemeinsamen
Renderbefehl verwenden.

## Einrichtung auf einem weiteren Rechner

Mit installiertem `uv` und Node.js, aus der Repository-Wurzel:

```powershell
$env:UV_CACHE_DIR = Join-Path (Get-Location) '.build/uv-cache'
$env:UV_PYTHON_INSTALL_DIR = Join-Path (Get-Location) '.build/python'
uv venv .venv-manim --python 3.12
uv pip install --python .venv-manim/Scripts/python.exe -r tools/manim/requirements.txt
npm run build:videos
```

Optional kann Node.js wie auf diesem Rechner in derselben Umgebung installiert
werden: `uv pip install --python .venv-manim/Scripts/python.exe nodejs-wheel`.
Unter macOS/Linux lauten die Umgebungspfade `.venv-manim/bin/python` und
`.venv-manim/bin/node`. Ein anderer Interpreter lässt sich über `MANIM_PYTHON`
als vollständiger Dateipfad einstellen.

Geprüft wurde Manim Community 0.21.0 mit Python 3.12.14 unter Windows.
Die kurzen Beispiele verwenden jetzt Unicode-Text statt `MathTex`; LaTeX ist
für diese drei Videos nicht erforderlich. Installation siehe auch
[offizielle Manim-Dokumentation](https://docs.manim.community/en/stable/installation/uv.html).

## Anzeige auf GitHub Pages

Die Klassenübersicht zeigt die Videos unter **Unterstützung → Erklärvideos**.
Im Themenfeld erscheinen native Videoplayer mit Steuerung, Vorschaubild,
Download, Hinweis auf den fehlenden Ton und einer kurzen Checkfrage.
Die Filme starten erst auf Wunsch und laden beim Seitenaufruf nicht vollständig.

Der vorhandene Pages-Workflow kopiert die eingecheckten MP4-Dateien beim nächsten
autorisierten Push auf `main` zusammen mit der Website. Er rendert nicht selbst.
Die neuen Quellen, Metadaten, MP4s, Vorschaubilder und Website-Änderungen gehören
deshalb gemeinsam in einen späteren Commit. Der Renderbefehl führt weder Commits
noch Pushes aus. Lokale Tests allein veröffentlichen noch nichts auf GitHub Pages.

## Paketprüfung und Anpassungen

Die ZIP enthält 16 Dateien: drei Python-Skripte, Metadaten, Drehbuch, Dokumentation
und Konfiguration. Es waren keine fertigen Videos enthalten. CRC-Prüfung des
Archivs und alle 15 Einträge in `SHA256SUMS.txt` wurden erfolgreich geprüft.
Die enthaltene Integrationsanleitung wurde als Dokumentation ausgewertet.
Vorhandene Repository-Konfigurationen wurden gezielt ergänzt.

Die optischen Konstruktionen wurden in der Vorschau geprüft: Winkel zum Lot,
virtuelles Spiegelbild, Brechung zum Lot und drei Strahlen durch dieselbe
Bildspitze. Im Linsenbeispiel gilt bei f = 12 cm und g = 30 cm: b = 20 cm;
aus G = 9 cm ergibt sich ein umgekehrtes Bild mit B = 6 cm.
Die doppelte Kapitelnummer im Optikskript wurde korrigiert (Sammellinse: 3).
Die beiden kurzen Beispiele wurden ohne Änderung der Rechenschritte bzw.
Strahlgeometrie auf Text ohne LaTeX umgestellt.

## Geprüfte Endfassungen

| Video | Dauer | Dateigröße |
|---|---:|---:|
| Optik | 137,5 s | 6,72 MB |
| Reflexionsgesetz | 34,0 s | 0,86 MB |
| Äquivalenzumformungen | 37,2 s | 0,95 MB |

Alle drei Endfassungen wurden vollständig mit FFmpeg decodiert. Auflösung,
Bildrate, H.264/yuv420p, vorangestellte MP4-Metadaten und identische Kopien im
Pages-Artefakt wurden geprüft. Im lokalen Edge-Browser wurden Wiedergabe,
Pause, Sprung zur Videomitte, Suche, Klassenverknüpfungen und die Ansicht bei
390 Pixeln Breite getestet. Der Testserver unterstützte HTTP-Teilabrufe.
Es traten keine JavaScript- oder HTTP-Fehler auf. Ein Test auf einem echten
iPad bzw. auf der veröffentlichten Pages-Adresse steht noch aus.

Katalog- und Website-Build waren erfolgreich. Der laut AGENTS.md erforderliche
PowerPoint-Build erzeugte 22 Präsentationen erfolgreich; anschließend wurden
die unveränderten ursprünglichen Präsentationsdateien wiederhergestellt, um
unnötige Binäränderungen durch diesen Funktionstest zu vermeiden.
Messwerte und Prüfsummen stehen in [pruefbericht.json](pruefbericht.json).
