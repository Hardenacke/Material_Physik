# Ergänzungen zum API-Vertrag

Der aktuelle maschinenlesbare Vertrag liegt in [`../api/openapi.json`](../api/openapi.json)
und wird mit `npm run build:api` erzeugt. Die neun Schülerpfade stammen aus
`referenz/API_VERTRAG.md`. Jede Anfrage benötigt den persönlichen Bearer-Code der
konfigurierten Lerngruppe. Mutationen benötigen einen UUID-v4-Header `Idempotency-Key`.
Ein öffentlicher, anonymer Status ist `GET /api/v1/health`.

Zusätzliche Administrationspfade erfordern `Authorization: Bearer ADMIN_TOKEN`:

| Methode und Pfad, jeweils unter `/api/v1/admin` | JSON / Ergebnis |
| --- | --- |
| `POST /groups/GRUPPE/participants` | `{"participants":[{"id":"person-1","alias":"Licht 01","hash":"64-stelliger-sha256-hexwert","enabled":true}]}` |
| `POST /groups/GRUPPE/disable` | `{"id":"person-1"}` |
| `GET /competitions/ID/versions/V/periods/P/status` | Aktive Versuche, Revision, bestätigte Archivrevision, Abschluss- und Steuerzustand |
| `POST /competitions/ID/versions/V/periods/P/close` | `{}`; endgültige Schließung dieser Wertung |
| `GET /archive` | Anzahl der Archivaufträge je `pending`, `done`, `blocked` |

Gruppen müssen in den bereitgestellten Definitionen existieren. Ein Import ist ein
Upsert nach Personen-ID und ersetzt damit einen Code bei gleicher Identität. Er
löscht keine anderen Teilnehmer. Pro Request höchstens 100 Personen und 16 KiB;
das Werkzeug teilt Importe in kleinere Blöcke auf.

`Competition` entspricht der Positivliste in `worker.mjs` mit `availability`,
`totalQuestions`, `demo`, `schedule`, `season`, `rules` und `attempts`.
Die Implementierung enthält weder den privaten Pool noch dessen Dateipfad.
`Leaderboard` enthält `serverNow`, `period`, `leaderboard`, `revision`,
`archivedRevision` und `archiveState` (`disabled`, `pending`, `synced`).

Alte Zeiträume sind nur lesbar, wenn es dafür bereits gespeicherte Räume gibt.
Ein Start in einem alten Monat und Zugriffe auf zukünftige Monatswertungen werden abgewiesen.
Schließen ist zusätzlich zum veröffentlichten Konfigurationsstatus als dauerhafte
Raumsteuerung wirksam. Ein geschlossenes Monatszimmer schließt nicht automatisch
die kommenden Monate; dafür den Konfigurationsstatus auf `closed` setzen.
