# Betrieb des Physik-Wettkampfsystems

## Veröffentlichung und Verwaltung

Die Lehrkraft pflegt private JSON-Konfigurationen in VS Code. Die erste Ausbaustufe
benötigt keine zusätzliche Verwaltungswebsite. Der mitgelieferte Generator erzeugt
nur lokale Entwürfe; Veröffentlichung, Teilnehmendenimport, Sperren, Schließen und
Archivexport sind noch zu implementierende Verwaltungsoperationen.

Die Veröffentlichung setzt einen Wettbewerb von `draft` auf `published` und bindet
einen unveränderlichen Konfigurations- und Poolstand. Steuerzustände liegen getrennt
vom Fingerabdruck der Spieldefinition: Schließen und Archivieren verändern keine Regeln.
`closed` lässt keinen neuen Versuch und keine neue Frage zu. Bereits geöffnete Fragen
werden noch bis zur gespeicherten Deadline gewertet, danach werden wartende Versuche
mit vorhandenem Punktestand beendet. Schließen darf keine ungelösten Dauerpausen erzeugen.
`archived` ist erst nach dem Abschluss aller Versuche und Bestätigung des finalen
Archivauftrags möglich. Eine Wiedereröffnung nutzt eine neue Wettbewerbs-ID oder Version.

Sperren eines Codes wirkt auf weitere Anfragen und wird unabhängig vom laufenden
Versuch geprüft. Ein Codewechsel behält Personen-ID und Bestwerte bei, sperrt den alten
Hash und gibt einen neuen Klartextcode nur der berechtigten Person. Ein Verlust des
Codes erzeugt daher keinen zusätzlichen Versuch.

## Dauerbetrieb ohne laufenden Rechner

Veröffentlichte offene Konfigurationen haben kein Enddatum. Bei Zugriff wacht der
Server auf; wichtige Zustände stehen im dauerhaften Speicher. Nur fällige Arbeit
benötigt einen Alarm. Im Monatsbetrieb endet die alte Wertung automatisch. Es gibt
keine Zusage für unterbrechungsfreien Betrieb und keine Bindung an einen offenen Browser.
Beide Fächer funktionieren unabhängig, solange ihre jeweils eigenen Dienste erreichbar sind.

Die Lebensdauer persönlicher Zugänge richtet sich nach der Lerngruppe und nicht nach
einzelnen Monaten. Gruppenverwaltung und Mitgliedschaften werden am Schuljahreswechsel
bewusst erneuert. Eine Gruppenkennung ist kein Geheimnis; sie ersetzt den Code nicht.

## Archivierung und Wiederholungen

Geplante Zielpfade unter dem privaten Repository `Material_Physik_Ergebnisse`:

```text
architektur-v1/snapshots/WETTKAMPF-ID/v1/ZEITRAUM/latest.json
architektur-v1/perioden/WETTKAMPF-ID/v1/ZEITRAUM/final.json
```

`ZEITRAUM` ist `gesamt` oder beispielsweise `2026-10`. Ein Archiv enthält Fach,
Wettkampf-ID/-Version, Zeitraum, Regel- und Poolfingerabdruck, Instanz-ID, Revision,
Erstellungszeit und Bestwertzusammenfassungen. Kein Code, Codehash, Klarname,
Lösungsschlüssel und keine gewählte Einzelantwort gelangen in diese Dateien.
Die Ergebnisdateien werden weder öffentlich noch direkt über Pages ausgeliefert.

Bei Änderungen wird zunächst ein dauerhafter Auftrag mit der aktuellen Revision
gespeichert. `latest.json` wird gesammelt geschrieben: als Vorgabe frühestens nach
15 Sekunden, bei anhaltender Aktivität höchstens einmal pro Minute pro Wertung.
Beim Periodenabschluss zusätzlich `final.json` schreiben. Keine GitHub-Schreibanfrage
pro Antwort oder Ranglistenabfrage. Die Live-Rangliste darf noch nicht archivierte
Punkte anzeigen; ihr Metadatum benennt die zuletzt bestätigte Archivrevision.

RoomState sendet den Auftrag an den fachweisen ArchiveWriter; dieser bestätigt die
dauerhafte Aufnahme. Bis zur Erfolgsmeldung behält RoomState seine Outbox. Ein Job
wird nach Zielpfad, Instanz-ID und Revision dedupliziert. Nach einem Neustart wird
der Status angefangener Schreibjobs auf unklar gesetzt und über den Zielinhalt geprüft.
Eine bereits geschriebene Revision wird nicht noch einmal als neue Änderung verbucht.

Der Writer verarbeitet GitHub-Schreiboperationen nacheinander. Beim Update liest er
die aktuelle Datei-SHA. Bei 409/422 erneut lesen und den Revisions-/Instanzstand
prüfen. Eine ältere Revision überschreibt keine neuere. Ein fremder Instanzbezeichner
führt zu einem blockierten Job und einer sichtbaren Störung statt zum stillen Überschreiben.
Bei 429 oder einem Antwortheader mit vorgeschriebener Wartezeit entsprechend warten;
bei vorübergehenden Fehlern mit wachsendem Abstand erneut versuchen. Bei 401/403
Berechtigung oder Token prüfen und keine schnelle Endlosschleife auslösen.

## Fristen und Aufräumen

Pro RoomState wird ein Alarm auf den frühesten fälligen Termin gesetzt. Im Handler
alle fälligen Fristen, Abschlussaktionen und Archivaufträge idempotent auswerten,
anschließend den nächsten Alarm speichern. Auch jeder API-Aufruf prüft Grenzen,
damit ein verzögerter Alarm keine zusätzliche Antwortzeit eröffnet.

Die Detailversuche dürfen nicht unbegrenzt wachsen. Ein konfigurierbarer betrieblicher
Aufbewahrungsplan trennt kurzlebige Request-Belege, Versuchdetails, aktuelle Bestwerte,
Jahresgruppen und Archive. Beispiel für eine technische Planung: Request-Belege 24 Stunden,
abgeschlossene Versuchdetails 90 Tage, Bestwerte bis zum Ende der freigegebenen Wertung.
Diese Zeiträume sind Entwurfswerte und müssen für den schulischen Einsatz festgelegt werden.
Aktive Versuche und noch nicht bestätigte Archivaufträge werden nicht vorzeitig entfernt.

Bestwerte liegen als eigenständige dauerhafte Zusammenfassung vor. Beim Löschen alter
Versuchdetails bleibt dadurch die aktuelle Rangliste erhalten. Eine Wiederherstellung
aus GitHub allein stellt nur Bestwerte und Regeln wieder her, keine aktiven Fristen,
Codes oder vollständigen Versuchshistorien. Dafür ist eine getrennte geschützte
Sicherung der Live-Daten erforderlich; einen Restore zuerst unter einer Testinstanz üben.

Schließen oder Löschen einer aktuellen GitHub-Datei entfernt keine älteren Git-Versionen.
Bei einem Löschvorgang auch Codezuordnungen, Speicher, Historie und Sicherungskopien
gezielt behandeln. Keine automatische Archivierung vollständiger Codelisten in Git.

## Betriebsbeobachtung

Wichtige Anzeigen für die Lehrkraft: offene Versuche, ältester ausstehender Archivauftrag,
letzte bestätigte Revision, blockierte Jobs und Konfigurationsfehler. Keine vollständigen
Authorization-Header oder Request-Bodys protokollieren. Ein read-only Testzugang darf
keine administrativen Aktionen freischalten. Laufende Plattformkosten und Kontogrenzen
vor einer tatsächlichen Bereitstellung anhand der dann aktuellen Tarifdaten prüfen.
