# Optik-Quiz Klasse 8 – Mission Optik

Das Quiz aus Optik_Quiz_Klasse_8.zip ist in die vorhandene Cloudflare-Wettbewerbsplattform integriert. Die Gestaltung, der Übungsmodus und die interaktiven Strahlenzeichnungen stammen aus der Vorlage. Wettbewerb und Rangliste werden über die bestehende API gewertet und gespeichert.

## Einstieg

- Wettbewerb: https://physik-wettkampf-api.physik-wettkampf-api.workers.dev/optik-quiz/competition.html
- Wettbewerbsportal: https://physik-wettkampf-api.physik-wettkampf-api.workers.dev/?competition=physik-optik-klasse-8&group=klasse-8-demo
- Üben ohne Anmeldung: index.html

Gruppe: **klasse-8-demo**. Die bereits ausgegebenen persönlichen Zugangscodes funktionieren auch für Mission Optik. Codes werden ausschließlich im Arbeitsspeicher der geöffneten Seite gehalten. Sie gehören weder in Links noch in öffentliche Dateien. Die vorhandene private Ausgabeliste liegt im ignorierten Ordner tools/wettkampf-api/.local/.

## Regeln

Eine Runde umfasst 15 Aufgaben: sechs zu Licht und Schatten, fünf zur Reflexion und vier zur Brechung. Die Reihenfolge innerhalb der Themen und die Antwortoptionen werden gemischt; der Server wählt aus 39 Aufgabenvarianten. Es gibt Auswahlfragen, Winkeleingaben und zwei Aufgaben mit verschiebbarem Strahlengriff. Dieser ist per Maus, Touch und Pfeiltasten bedienbar.

Pro Frage stehen 25 Sekunden zur Verfügung. Eine richtige Antwort bringt 100 Basispunkte und bis zu 100 Zeitbonuspunkte; der Server berechnet den Bonus aus der tatsächlich verstrichenen Zeit und rundet ab. Ein Fehler oder Timeout kostet eines von drei Leben. Ein Versuch endet nach der letzten Frage, nach drei Fehlern oder nach 30 Minuten Gesamtzeit. Die Zeit einer geöffneten Frage läuft auch bei geschlossener Seite weiter.

Die Rangliste berücksichtigt automatisch den besten beendeten Versuch je Zugang. Gleiche Punktzahlen teilen sich einen Platz. Weitere Versuche sind nach 30 Sekunden Pause möglich. Es gibt keinen gesonderten Ergebnis-Upload und keine frei wählbaren Namen: Der persönliche Zugang bestimmt das Pseudonym. Nach erneutem Anmelden wird der vorhandene Versuch mit unveränderten Fristen fortgesetzt. Die Nachbesprechung bleibt dabei erhalten.

## Inhalte bearbeiten und bereitstellen

Die Übungsfragen liegen in quiz-data.js. Der Wettbewerb verwendet den eigenen versionierten Pool tools/wettkampf-api/fragenpools/optik-quiz-klasse-8.json und die Definition tools/wettkampf-api/wettkaempfe/physik-optik-klasse-8.json. Diese wurden aus der Vorlage mit scripts/import-optik-quiz.mjs einmalig erzeugt. Der Import überschreibt keine vorhandenen Dateien. Änderungen an Übungsfragen verändern den Wettbewerb nicht automatisch.

Bereits veröffentlichte Wettbewerbe sind an Pool und Regeln gebunden. Für inhaltliche Änderungen eine neue Pool- und Wettbewerbsversion anlegen und die bisherige Definition erhalten. Die Aufgaben sind öffentlich zum Üben zugänglich; der Pool ist deshalb als Demo gekennzeichnet. Die serverseitige Wertung schützt vor frei erfundenen Punkteständen, macht öffentlich bekannte Fragen aber nicht geheim.

Im Ordner tools/wettkampf-api/: npm run prepare:demo, npm run check, npm test, npm run dry-run und npm run deploy. Keine Commits oder Pushes sind für das Cloudflare-Deployment erforderlich. Für GitHub Pages im Repository npm run build:site ausführen; eine Veröffentlichung der Materialsammlung erfolgt separat.

## Dateien und Technik

- index.html, quiz-data.js, quiz.js, styles.css: Übungsquiz und gemeinsame Darstellung.
- competition.html, competition.js, competition.css: Anmeldung, serverseitig gewertetes Quiz, Wiederaufnahme, Nachbesprechung und Rangliste.
- vendor/katex/: lokale Formelanzeige und Schriften; Lizenz unter vendor/katex/LICENSE.
- cloudflare-config.js: ursprüngliche optionale Konfiguration der Vorlage; im gehosteten Wettbewerb nicht verwendet.
- INTEGRATION.md: tatsächlich verwendete Schnittstellen.
- QUALITAETSPRUEFUNG.md: überprüfte Funktionen und Grenzen.

Fachliche Themen: Lichtquellen, Strahlenmodell, Lichtbündel, durchscheinende Stoffe, Halbschatten, ebener Spiegel, Einfallslot, diffuse Reflexion, Reflexionswinkel, Winkel zum Lot, Lichtbrechung und Strahlenzeichnungen. Grundlage der Vorlage sind das Reflexionsgesetz und die qualitative Brechung zum Lot; das Brechungsgesetz wird nicht vorausgesetzt.
