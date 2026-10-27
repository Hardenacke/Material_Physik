# Vertrag der geplanten Wettkampf-API

Maschinenlesbare Fassung: `api/openapi.json`, OpenAPI 3.1.
Dieser Vertrag beschreibt die noch zu implementierende HTTP-Anbindung des Regelkerns.
Alle Pfade beginnen mit `/api/v1`. Keine GitHub-Zugangsdaten werden an Browser ausgegeben.

| Methode und Pfad | Zweck |
| --- | --- |
| `GET /catalog?groupId=GRUPPE` | Freigegebene Wettbewerbe der authentifizierten Person |
| `GET /competitions/ID` | Öffentliche Regeln und aktuell freigegebene Version |
| `GET /competitions/ID/versions/V` | Gebundene Version und aktueller Zeitraum |
| `GET /competitions/ID/versions/V/periods/P/leaderboard` | Bestwerte genau dieser Wertung |
| `POST /competitions/ID/versions/V/periods/P/attempts` | Aktiven Versuch fortsetzen oder neuen anlegen |
| `GET /competitions/ID/versions/V/periods/P/attempts/current` | Eigener aktiver, sonst letzter Versuch; `null` falls keiner |
| `GET /competitions/ID/versions/V/periods/P/attempts/A` | Eigenen gespeicherten Versuch abrufen |
| `POST /competitions/ID/versions/V/periods/P/attempts/A/next` | Genau eine Frage öffnen |
| `POST /competitions/ID/versions/V/periods/P/attempts/A/answer` | Aktive Frage beantworten |

`V` ist die Wettbewerbsversionsnummer, `P` ist `gesamt` oder `YYYY-MM`.
Ein neuer Versuch muss zum vom Server ermittelten aktuellen Zeitraum gehören.
Die Versionsangabe verhindert, dass alte Links unbeabsichtigt auf veränderte Regeln zeigen.
Alte Versuchspfade bleiben für ihre Eigentümer lesbar, soweit ihre Aufbewahrung reicht.

Alle API-Aufrufe erfordern `Authorization: Bearer PERSOENLICHER_CODE` und eine
gültige Mitgliedschaft. GET-Anfragen bleiben ohne Body. POST-Anfragen senden
`Content-Type: application/json`, höchstens 16 KiB, und einen eindeutigen
UUID-Header `Idempotency-Key`. Für `attempts` und `next` ist der Body `{}`.
Für `answer` lautet er beispielsweise:

```json
{"questionId":"q5","answerId":"c"}
```

`answerId: null` bedeutet bewusstes Überspringen und kostet ein Leben. Ein Client
meldet einen angenommenen Zeitablauf nicht als Antwort: Er lädt den Status neu;
der Server entscheidet anhand der gespeicherten Frist. Fremde Felder, insbesondere
Punkte, Leben, Serverzeiten oder Antwortschlüssel, werden abgewiesen.

Idempotenzbelege sind an Teilnehmer-ID, Operation und Inhaltsfingerabdruck gebunden.
Eine Wiederholung mit gleichem Schlüssel liefert die gespeicherte Wirkung, kein neues
Spiel. Bei geändertem Body oder anderer Operation gibt es 409. Nach Ablauf der Belege
verhindern zusätzlich Frage-ID, Phase und Eigentümerschaft eine erneute Punktebuchung.
`attempts` bleibt auch dann durch den eindeutigen aktiven Versuch abgesichert.

Die Antwort für einen Versuch enthält `serverNow`, die gespeicherten öffentlichen
Regeln und `attempt`. Darin liegen Punkte, Leben, Phase, Fortschritt, Endfrist und
höchstens die aktuell geöffnete Frage. Vor dem Öffnen wird keine folgende Frage
übertragen. Lösungen und Erklärungen werden erst nach Auflösung der betreffenden
Frage als `feedback` ausgegeben. Öffentliche Fragen werden über eine Positivliste
gebildet; private Poolfelder werden nicht durch ein unkontrolliertes Objektkopieren ausgegeben.

Ranglistenantworten enthalten nur `rank`, `alias`, `score`, `maxPoints`, `endedAt`
und Metadaten zur Wertung und Archivbestätigung. Teilnehmer-ID, Codes, Hashes und
Einzelantworten bleiben privat. Rangliste standardmäßig alle fünf Sekunden abfragen,
bei verborgenem Tab pausieren und bei Fehlern mit wachsendem Abstand erneut versuchen.

| HTTP-Status | Bedeutung |
| --- | --- |
| 200 | Anfrage ausgeführt oder gespeicherte Wirkung wiederholt |
| 400 | Ungültiger JSON-Inhalt oder unbekannte Antwortoption |
| 401 | Persönlicher Code fehlt, ist gesperrt oder ungültig |
| 403 | Keine Mitgliedschaft oder fremder Versuch |
| 404 | Wettbewerb, Version, Zeitraum oder Versuch unbekannt |
| 409 | Frist/Phase/Version passt nicht, Limit/Cooldown oder Idempotenzkonflikt |
| 413 / 415 | Nachricht zu groß / falscher Inhaltstyp |
| 429 | Temporäre Anfragerate überschritten; Wartezeit beachten |
| 503 | Benötigter Live-Dienst vorübergehend nicht verfügbar |

Ein GitHub-Archivfehler macht einen erfolgreichen Spielzug nicht zu 503. Stattdessen
meldet das Metadatum `archiveState` den ausstehenden Abgleich. Es gelten `no-store`,
exakte CORS-Ursprünge und `X-Content-Type-Options: nosniff`. Fehler enthalten keine
Secrets oder internen Stacktraces.

Administrationsoperationen sind hier absichtlich keine Schülerendpunkte. Import,
Freigabe, Sperre, Schließen und Restore erfolgen in der ersten Ausbaustufe über
separat authentifizierte lokale Verwaltungswerkzeuge. Diese sind noch umzusetzen.
