# Prüfstand vom 27. Oktober 2026

Geprüft unter Windows mit Node.js 24.22.1 und Wrangler 4.153.0.
Die Physikdateien des ZIP wurden als Ausgangsmaterial übernommen. Die Anwendung
arbeitet unabhängig vom Mathematikteil. Es wurden keine Cloudflare-Ressourcen
angelegt und keine Git-Commits oder Pushes ausgeführt.

| Prüfung | Ergebnis |
| --- | --- |
| `npm run check` | Drei Demokonfigurationen und der Optikpool gültig; Abbildungen vorhanden |
| `npm test` | 41 Tests bestanden: 31 übernommene Regeltests und 10 zusätzliche Adapter-/Archivtests |
| `npm run test:integration` | Erfolgreich gegen einen frischen lokalen Wrangler-Server mit echten Durable Objects |
| `npm run dry-run` | Worker einschließlich drei SQLite-Durable-Object-Bindings und öffentlicher Assets erfolgreich gebaut |
| Browserprüfung mit installiertem Edge über Playwright | Desktop 1280 × 900 und Mobilansicht 390 × 844 erfolgreich; keine JavaScript-Laufzeitfehler |
| `npm run build:site` im Repository | Portal im Katalog und Website-Artefakt; keine privaten Serverdateien in `_site/` |
| `npm run build:pptx` im Repository | Alle 22 Präsentationen erfolgreich erzeugt; vorhandene Originaldateien nach dem Prüflauf erhalten |
| `git diff --check` | Keine Whitespace-Fehler |
| Ignore-Regeln | `.dev.vars`, `.local/`, `private/`, Servermodul mit Lösungen und `node_modules/` ausgeschlossen |

Die zusätzlichen Tests prüfen dauerhafte Requestbelege, Eigentümerschaft,
Definitionenbindung, erneutes Initialisieren mit demselben Speicher, Fristenwirkung
trotz Fachfehler, doppelte Alarme, Schließen mit laufender Frage, Versuchslimits
nach Detailbereinigung, Codewechsel, Sperren und fehlgeschlagene Anmeldungen.
Gültige Zugänge hinter einer gemeinsamen Schul-IP werden unabhängig begrenzt.
Archivtests simulieren private Repositoryprüfung, wiederholte Revisionen, einen
Ausfall mit späterer Wiederholung sowie fremde Instanzen.

Die HTTP-Prüfung deckt insbesondere Bearer-Anmeldung, CORS, fremde Versuch-IDs,
verbotene Clientfelder, Nachrichten über 16 KiB, identische Requestschlüssel,
umgeordnete JSON-Felder, drei verbrauchte Leben, Rangliste, Sperrung und
endgültige Schließung ab. Die Browserprüfung umfasst außerdem Codeeingabe,
Wettbewerbsauswahl, Fragenöffnung, Überspringen, Wiederaufnahme nach Neuladen und
Abmeldung; der Code wird weder in `localStorage` noch `sessionStorage` abgelegt.

## Noch extern zu prüfen

- Tatsächliche Veröffentlichung und Konto-/Tarifkonfiguration bei Cloudflare.
- Echter GitHub-Token und private Archivschreibvorgänge, falls diese Option aktiviert wird.
- iPad, Safari, VoiceOver, reale Verbindungswechsel und schulischer Mehrgerätebetrieb.
- Fachprüfung eines erweiterten privaten Fragenpools und schulische Aufbewahrung/Löschung.

Die Screenshots und das einmalige Browserprüfskript befinden sich ausschließlich im
ignorierten Ordner `.local/`. Der Integrationstest benötigt einen separaten frischen
Speicher, weil er die lokale Testwertung absichtlich schließt. Reproduzierbare
Befehle stehen in der README. Die ursprünglichen Prüfbehauptungen des ZIP stehen
unverändert unter `referenz/PRUEFPROTOKOLL.md` und sind von dieser Prüfung zu unterscheiden.
