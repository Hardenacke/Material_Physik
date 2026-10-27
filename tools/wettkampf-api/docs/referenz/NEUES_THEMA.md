# Einen weiteren Physik-Wettkampf anlegen

Die Architektur bindet ein Thema über Konfiguration ein. Es werden keine Seiten und
Server pro Einzelquiz benötigt. Eine Klasse kann mehrere freigegebene Wettbewerbe haben.

1. Einen neuen privaten Fragenpool in `backend/fragenpools/` anlegen. Eigene ID, Version,
   Jahrgang und Fach `physik` setzen. Alle Aufgaben enthalten `id`, `family`,
   `difficulty`, `prompt`, Antwortoptionen, richtige Option und Erklärung.
2. Aufgaben auf `basis`, `aufbau`, `knifflig` verteilen. Varianten desselben Konzepts mit
   derselben `family` kennzeichnen; eine Familie gehört zu genau einer Stufe. Die Zahl
   unterschiedlicher Familien muss den Auswahlplan erfüllen.
3. Eine Konfiguration aus `backend/wettkaempfe/` kopieren oder `npm run neu` im Backend
   verwenden. Neue ID, Titel, Gruppe und Poolreferenz eintragen. Stufenanteile an den
   neuen Pool anpassen; der Generator startet mit vier Fragen pro Stufe.
4. Veranstaltungsform wählen: `continuous` mit offenem Ende, `calendar-month` für
   Monatswertung oder ein konkretes Zeitfenster. Versuchslimit `null` bedeutet beliebig
   viele Versuche; `1` bedeutet einen Versuch je Zeitraum.
5. `npm run check` und `npm test` ausführen. Bei Formelsegmenten zusätzlich das spätere
   KaTeX-Rendering prüfen. Beispiele und Pool bleiben privat.
6. Im fertig implementierten System die Lerngruppe importieren, Mitgliedschaften
   freigeben und `draft` bewusst veröffentlichen. Danach die unveränderliche Definition
   im privaten Backend bereitstellen. Unter der bestehenden Portaladresse erscheint
   der Wettbewerb im Katalog dieser Lerngruppe.

Die Schritte 1–5 funktionieren mit diesem Paket lokal. Schritt 6 setzt die noch
zu implementierenden GroupAccess-/RoomState-Adapter, Veröffentlichung und Oberfläche voraus.

Beispiel für Inhaltssegmente mit einer Formel:

```json
[
  {
    "type": "text",
    "value": "Der Einfallswinkel eines Lichtstrahls beträgt "
  },
  {
    "type": "math",
    "value": "\\alpha=35^\\circ"
  },
  {
    "type": "text",
    "value": ". Bestimmen Sie den Reflexionswinkel."
  }
]
```

Dieses Format dient der Darstellung; der Server berechnet aus Schüler-LaTeX keinen
Programmcode. In dieser Fassung werden ausschließlich angebotene Antwort-IDs geprüft.

Regeländerung oder fachliche Korrektur nach Freigabe: neuen Pool und/oder neue
Wettkampfversion anlegen, alte Wertung erhalten. Eine neue Klasse benötigt eine eigene
Gruppe und Wettbewerbs-ID, damit ihre Rangliste getrennt bleibt. Neue Monatswertungen
verwenden dieselbe freigegebene Definition; veränderte Monatsaufgaben würden eine
zusätzliche versionierte Poolrotation benötigen, die hier noch nicht vorgesehen ist.
