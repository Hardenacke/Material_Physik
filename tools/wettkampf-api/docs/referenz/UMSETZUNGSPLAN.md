# Umsetzung in Material_Physik

## Zielstruktur in den Repositories

| Öffentlich in `Material_Physik` | Privat in `Material_Physik_Wettkampf_API` | Privat in `Material_Physik_Ergebnisse` |
| --- | --- | --- |
| `wettkaempfe/index.html` | `src/worker.mjs` | `snapshots/…/latest.json` |
| `wettkaempfe/app.js` | `src/group-access.mjs` | `perioden/…/final.json` |
| `wettkaempfe/style.css` | `src/room-state.mjs` | `README.md` mit Aufbewahrung |
| `wettkaempfe/config.js` | `src/archive-writer.mjs` | Keine Zugangscodes |
| `wettkaempfe/assets/` | `src/spiel.mjs`, `zeitraum.mjs`, `vertrag.mjs` | Keine Lösungen |
| `wettkaempfe/vendor/katex/` | `fragenpools/`, `wettkaempfe/`, `datenmodell/` | Keine Einzelantworten |

Die Dateien `index.html`, `app.js`, `style.css`, Worker-Adapter und KaTeX sind
Zieldateien der Umsetzung und noch nicht in diesem Architekturpaket enthalten.
`public-vorlage/` enthält ausschließlich die öffentliche Konfigurationsvorlage und
die vorhandenen SVGs für den Prototyp. Der Regelkern ist bereits ausführbar.

## Schritt 1: Inhalte und Konfiguration

Die gelieferten `backend/`-Dateien in einer privaten Arbeitskopie übernehmen.
Node.js 24 verwenden; für den Referenzkern sind keine externen Abhängigkeiten nötig.
Mit `npm run check` und `npm test` prüfen. Beispielpools fachlich erweitern und
Unicode-Formeln bei Bedarf in LaTeX-Segmente überführen. Einen Entwurf für eine
Testklasse festlegen. Die reguläre Lerngruppe erst nach Funktionstest verwenden.

## Schritt 2: Persistenz und HTTP ergänzen

Die drei SQL-Schemata je zuständiger Durable-Object-Klasse ausführen. Migrationen
über eine eigene Migrationstabelle versionieren; niemals produktive Tabellen beim
Start neu anlegen und löschen. `GroupAccess` pro Gruppe, `RoomState` pro
Wettbewerbsversion/Zeitraum und einen `ArchiveWriter` je Fach anbinden.

Den Worker `physik-wettkampf-api` mit ausschließlich eigenen Namespaces und eigenem GitHub-Secret
anlegen. Der GitHub-Token benötigt nur auf `Material_Physik_Ergebnisse` die Berechtigung `Contents:
Read and write`. Authentifizierung und Mitgliedschaft auf jedem geschützten Pfad
erzwingen. `openapi.json` und `API_VERTRAG.md` beschreiben den Vertrag.

Die öffentliche Herkunft ist zunächst `https://hardenacke.github.io`, ohne Repositorypfad
und ohne abschließenden Slash. CORS ist nur eine Browserregel; die Zugriffskontrolle
bleibt auch bei direkten API-Aufrufen erforderlich. Maximal 16 KiB pro Request, JSON
und strikte Felder. Antworten mit `Cache-Control: no-store`.

Der Adapter muss die Referenzfunktionen in dauerhafte Transaktionen einbetten:
zuerst authentifizieren, Zustand laden, fällige Fristen auswerten, wiederholte Requests
prüfen, Fachaktion anwenden, Bestwert und Outbox aktualisieren, speichern, erst dann
antworten. Externe GitHub-Aufrufe finden außerhalb der Spieltransaktion statt.
Wird nach der Fristprüfung eine ungültige Fachaktion erkannt, muss die bereits
fällige Fristwirkung trotzdem gespeichert werden: Fachfehler im Transaktionsablauf
als Ergebnis behandeln und erst nach dem Commit als HTTP-Fehler ausgeben. Ein
ungefangen geworfener Fehler würde sonst auch die gültige Fristwirkung zurückrollen.

## Schritt 3: Allgemeines Portal

Eine eigenständige Oberfläche unter `wettkaempfe/` entwickeln. Sie liest nach Anmeldung
den freigegebenen Katalog. Links können eine Wettbewerbs-ID als Auswahl vorgeben;
persönliche Codes gehören nicht in URLs. Ein vorhandener aktiver Versuch wird nach
Neuladen wieder geladen; Browseruhren steuern nur die Anzeige.

Für iPads: große Schaltflächen, Antwortbuttons während eines Requests sperren,
angezeigten Timer aus Serverzeit und Deadline ableiten, Hoch-/Querformat und
Verbindungswechsel prüfen. Beim Hintergrundwechsel Polling pausieren; bei Rückkehr
zuerst Status laden. Die aktive Frage läuft auf dem Server weiter. Antwortauswahl
per Tastatur und VoiceOver erreichbar machen. Formeln mit lokalem KaTeX rendern.

Übung erhält eine öffentliche, von Wettkampflösungen getrennte Bank. Die bisherige
Seite `klasse-8/01-optische-instrumente/lernpfade/quiz-optik/index.html` kann vorerst bestehen bleiben und zusätzlich auf das neue Portal
verweisen. Keine Schüleransicht mit Tokens, Datenbanknamen oder Verwaltungsanweisungen füllen.

Nur neue öffentliche Quelldateien in `Material_Physik` übernehmen und die vorhandenen
Buildregeln anwenden. Generierte Kataloge und `_site` nicht manuell pflegen.

```bash
npm run build:site
```

Die genaue Katalogaufnahme der neuen fachweiten Portalrubrik in der dann aktuellen
Repositorystruktur prüfen; diese Architektur ändert die bestehenden Repositories nicht.

## Schritt 4: Dauerbetrieb und Monatsabschluss

Beim Start des ersten Raums Konfiguration, Hash und Instanz-ID dauerhaft binden.
Alarme setzen auf das Minimum aus offener Fragefrist, Versuchsendfrist, Periodenende,
Archivwiederholung und Aufräumtermin. Jeder Alarmlauf plant den nächsten nötigen Termin;
keine Sekundenschleife und kein dauerhaft offener Lehrkraftbrowser.

Nach Abschluss eines Versuchs Bestwert und Archivauftrag gemeinsam speichern. Der
Archiver serialisiert GitHub-Schreibvorgänge und meldet die bestätigte Revision zurück.
Monatsabschluss und Wiederherstellung mit absichtlich verspäteten Alarmen testen.

## Schritt 5: Migration des bisherigen Quiz

Das alte Backend `physik-quiz-api` und seine Raumdateien zunächst weiterlaufen lassen.
Keine bestehende Durable-Object-Klasse und keinen Namespace löschen. Alte Räume
bei Bedarf schließen und ihre letzte Archivrevision bestätigen lassen.

Die bestehenden zwölf Wettkampffragen sind bereits als Demonstrationspool übernommen;
Versionsnummern gehören zum neuen Vertragsformat und sind kein Import alter Punktestände.
Alte Ergebnisdateien bleiben lesbar archiviert. Keine automatische Übernahme in neue
Ranglisten: wiederholbare Bestwerte und alte Einmalversuche haben unterschiedliche Regeln.
Alte Teilnahme-Codes werden nicht kopiert; neue gruppenbezogene Zugänge gezielt ausgeben.

Zuerst nur neue Testraum-IDs und ein separates Archivpräfix `architektur-v1/` einsetzen.
Erst nach Abnahme Portalverweise umstellen. Ein Rückweg ist die Verlinkung auf die
alte Quizseite; dadurch werden neue Spielstände nicht gelöscht.

## Abnahme vor Veröffentlichung

- Zwei Geräte mit unterschiedlichen Codes: Wiederaufnahme und gemeinsame Rangliste.
- Drei Fehler oder drei Zeitabläufe: genau drei Leben verbraucht, Ende ohne weitere Frage.
- Wiederholter Antwortrequest: keine zusätzlichen Punkte, gleiche Request-ID mit anderem Inhalt: 409.
- Zweiter Tab: derselbe aktive Versuch, kein paralleler Neustart.
- Falscher Code, andere Lerngruppe, fremde Versuch-ID und Code des anderen Fachs: abweisen.
- Dauerbetrieb: neuer Versuch nach Cooldown, schlechterer Versuch ändert Bestwert nicht.
- Monatswechsel und Zeitumstellung: alte Wertung bleibt fest, neuer Monat bekommt eigene Wertung.
- Serverneustart: aktive Frist unverändert. Verspäteter Alarm: genau eine Auswertung.
- GitHub-Ausfall und Schreibkonflikt: Spiel bleibt nutzbar, Abgleich holt geordnet nach.
- Worker-Upgrade mit anderer Konfiguration derselben Version: kontrolliert abweisen.
- iPad Safari/Chrome, Hoch-/Querformat, VoiceOver und langsame Verbindung praktisch prüfen.

Diese Abnahme ist für die künftigen Adapter erforderlich. Die mitgelieferten Tests
prüfen den lokalen Regelkern und ersetzen keine Bereitstellungs- oder Endgeräteprüfung.
