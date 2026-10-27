# Prüfprotokoll – 27. Oktober 2026

Geprüft mit Node.js 24.22.1 und Python 3.12.14. Die Fachpakete wurden jeweils in
einen getrennten temporären Ordner kopiert und dort ohne das andere Fach ausgeführt.
Die Prüfwerkzeuge benötigen keine produktiven Zugangsdaten.

| Prüfung | Mathematik | Physik |
| --- | --- | --- |
| Regeltests mit node:test | 31 bestanden | 31 bestanden |
| Beispieldaten gegen JSON Schema 2020-12 | 4 gültig | 4 gültig |
| API-Vertrag gegen OpenAPI 3.1 | gültig | gültig |
| SQLite-Schemata, je zweimal initialisiert | 3 gültig | 3 gültig |
| Tatsächliche öffentliche Versuchantworten gegen API-Schema | 3 gültig | 3 gültig |
| Generator: neuer Entwurf, Überschreibschutz, Pfadschutz, fehlende Terminangaben | bestanden | bestanden |
| Ausführung ohne das andere Fach | bestanden | bestanden |

Zusätzlich wurde der SQL-Index gegen einen zweiten aktiven Versuch derselben Person
geprüft. Nach Abschluss des ersten Versuchs lässt er einen neuen Versuch zu.
Alle Abbildungsverweise sind vorhanden; Textdateien enthalten keine unbeabsichtigten
Steuerzeichen. Die Demonstrationspools erfüllen je vier Fragen pro Schwierigkeitsstufe.

Die Regeltests prüfen Stufenanteile und Aufgabenfamilien, Codescope des Fachvertrags,
Konfigurationsversionen, serverseitige Punkte, drei Leben, Fristgleichheit, doppelte
Antworten, Wiederaufnahme, private Lösungsfelder, Cooldown, Einmalmodus, Bestwerte,
geteilte Plätze und Monatsgrenzen mit Sommer-/Winterzeit und Schaltjahr. Außerdem
wird die Definition unabhängig von JSON-Schlüsselreihenfolge und Statusänderungen
gehasht; geänderte Regeln ergeben einen anderen Fingerabdruck.

## Grenzen der durchgeführten Prüfung

HTTP-Router, Authentifizierung, Codeverwaltung, Durable-Object-Adapter, Archivschreiber,
allgemeine Oberfläche und Deployment sind noch nicht implementiert. Die Prüfung
weist daher keine funktionierende Live-Anbindung oder fertige Website nach.
Requestweite Idempotenz, transaktionale Einbettung, Neustartverhalten, GitHub-Konflikte,
Code-Sperrung und Archivwiederholung müssen nach Umsetzung mit den realen Adaptern
getestet werden. Auch iPad-/Browser-, KaTeX- und VoiceOver-Abnahme stehen dann aus.

Die zwölf Fragen pro Fach stammen aus dem bisherigen Quizpaket. Sie dienen hier als
strukturelles Beispiel; es wurde kein größerer Fragenpool erstellt und keine neue
fachdidaktische Validierung vorgenommen. Alle Wettbewerbsbeispiele sind draft.

Keine GitHub-Repositories oder produktiven Dienste wurden verändert. Das bisherige
Quizpaket wurde nicht überschrieben.
