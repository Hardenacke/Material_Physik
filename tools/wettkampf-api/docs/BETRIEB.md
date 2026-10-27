# Betrieb, Aufbewahrung und Wiederherstellung

## Vor einem Wettbewerb

Eigene Aufgaben prüfen und in `private/` ablegen. Gruppenkennung, Zeitfenster, Versuchslimit
und Version bewusst setzen. Für einen Termin UTC-Zeitpunkte angeben und in Berliner
Ortszeit gegenprüfen. Ein Klassenwettbewerb hat standardmäßig einen Versuch, ein
Dauer- oder Monatswettbewerb beliebig viele mit 30 Sekunden Abstand. Standardregeln:
drei Leben, 60 Sekunden pro Frage und maximal 30 Minuten pro Versuch.

Für neue Personen sichere Codes erzeugen, Hashes importieren und die Codes einzeln
ausgeben. Zwei Geräte mit getrennten Codes testen. Falscher Code, gesperrter Code und
fremder Versuch müssen abgewiesen werden. Bei einer veröffentlichten Definition keine
Frage oder Regel unter derselben Versionsnummer ersetzen.

## Abschluss und Beobachtung

`admin -- status` zeigt aktive Versuche und die bestätigte Archivrevision.
`admin -- close` beendet wartende Versuche und lässt bereits geöffnete Fragen bis zu
ihrer Deadline laufen. Die Schließung ist dauerhaft gespeichert. Ein neues Event
erhält eine neue ID oder Version. Für das Ende eines dauerhaft laufenden Angebots
auch die bereitgestellte Konfiguration schließen, damit keine neuen Monate entstehen.

Das optionale Archiv meldet Aufträge als `pending`, `done` oder `blocked`.
Bei Instanzkonflikten keine neuen Ergebnisse über alte Archivdateien schreiben.
Zunächst Herkunft klären; ein bewusst neu angelegtes Testsystem benötigt ein neues
Archivpräfix oder neue Wettbewerbskennungen. Pseudonyme sind in den Archivdateien
sichtbar, Codes, Hashes und Einzelantworten fehlen.

## Technische Aufbewahrung

| Daten | Implementierter Zeitraum |
| --- | --- |
| Minutenweise Rate-Belege | Aktuelle und vorherige Minute, bei weiteren Anfragen bereinigt |
| Idempotenzbelege | 24 Stunden, durch Raumalarm bereinigt |
| Abgeschlossene Detailversuche | 90 Tage; aktive Versuche bleiben erhalten |
| Versuchszähler und Bestwerte | Bleiben bis zur bewussten Auflösung des betreffenden Raums erhalten |
| Codehashes und Gruppenpseudonyme | Bleiben bis zur bewussten Gruppenbereinigung erhalten; Sperren sind sofort möglich |
| GitHub-Archiv | Keine automatische Löschung; Repositoryhistorie und Sicherungen separat berücksichtigen |

Diese technischen Werte sind keine rechtliche Vorgabe. Vor Schuleinsatz eine passende
Aufbewahrung und Löschroutine festlegen. Ein datenschutzbezogener Einzelpersonenexport
oder vollständiger Löschautomat ist noch nicht enthalten. Sperren verhindert weitere
Nutzung, ist aber keine Datenlöschung. Für eine komplette Gruppenbereinigung am
Schuljahresende Speicher und Archiv gezielt über die Cloudflare-/GitHub-Verwaltung behandeln.

## Sicherung und Wiederherstellung

Cloudflare ist der maßgebliche Live-Speicher. Das optionale GitHub-Archiv enthält nur
Bestwertzusammenfassungen; es rekonstruiert keine Codezuordnungen, aktiven Fragen oder
vollständigen Versuche. Gruppen-/Codezuordnung und private Definitionsdateien deshalb
separat geschützt sichern. Private Inhalte werden aus diesem öffentlichen Repository
bewusst nicht mit Git synchronisiert.

SQLite-basierte Durable Objects unterstützen laut Cloudflare
[Point-in-time Recovery](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).
Eine Wiederherstellung mit aktuellen Cloudflare-Werkzeugen zuerst unter einer separaten
Testinstanz üben. Nach einem Restore die bisherige Instanz-ID des Archivs berücksichtigen;
ein neu erzeugter Raum darf keine gleichnamigen Dateien einer fremden Instanz überschreiben.
Die Umsetzung stellt keinen automatischen Komplett-Restore bereit.

## Abnahme auf Endgeräten

Vor produktivem Einsatz iPad Safari/Chrome, Tastatur, VoiceOver, Hoch-/Querformat,
Tabwechsel, Neuladen, Verbindungsunterbrechung und Monatswechsel praktisch prüfen.
Die lokalen Tests prüfen die API und die Persistenz, ersetzen aber keine schulische
Fachprüfung und keine tatsächliche Endgeräteabnahme.
