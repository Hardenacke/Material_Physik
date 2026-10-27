# Allgemeine Wettkampfarchitektur: Physik

Stand: 27. Oktober 2026. Dieses Fachpaket ist vollständig eigenständig.

**Lieferumfang:** Architektur, API-Vertrag, Datenmodell, private Fragenpoolvorlage,
drei Wettkampfkonfigurationen, Entwurfsgenerator und ausführbare Referenzlogik mit Tests.
Die neue HTTP-API, Durable-Object-Adapter, Codeverwaltung und die allgemeine Wettkampfoberfläche
sind als Umsetzungsaufgaben spezifiziert; sie sind in diesem Paket noch nicht implementiert.
Es ist kein direkt veröffentlichbarer Nachfolger des bisherigen Quiz-Backends.

| Datei oder Ordner | Verwendung |
| --- | --- |
| `ARCHITEKTUR.md` | Bausteine, Abläufe und verbindliche Entscheidungen |
| `API_VERTRAG.md` / `api/openapi.json` | Schnittstellen der geplanten Serveranbindung |
| `UMSETZUNGSPLAN.md` | Einbau in `Material_Physik` und Migration vom bisherigen Quiz |
| `NEUES_THEMA.md` | Weitere Wettbewerbe und Themen ergänzen |
| `BETRIEB.md` | Dauerbetrieb, Ausfälle, Archive und Zugänge |
| `backend/wettkaempfe/` | Offen, monatlich, einmaliger Termin; zunächst `draft` |
| `backend/fragenpools/` | Privater Beispielsatz: Klasse 8, Optik |
| `backend/src/` | Referenz für Auswahl, Zeiträume, Punkte, Versuche, Ranglisten |
| `backend/datenmodell/` | Drei getrennte SQL-Schemata für die geplanten Speicher |
| `backend/schemas/` | JSON-Schemata für Konfiguration und Fragenpool |
| `public-vorlage/` | Öffentliche Konfigurationsvorlage und Abbildungen; noch keine Oberfläche |

Mit **Node.js 24 oder neuer** im Ordner `backend`:

```bash
npm run check
npm test
```

Die Referenz benötigt keine npm-Pakete. Ein `npm install` ist dafür nicht erforderlich.

Einen weiteren Monatswettbewerb als lokalen Entwurf anlegen:

```bash
npm run neu -- --id physik-training-neu --titel "Physik: Training" --gruppe klasse-8-demo --pool optik-8-demo --modus monat
```

`--modus offen` erzeugt eine durchgehende Bestwertliste. `--modus termin` benötigt
zusätzlich `--start` und `--ende` als UTC-Zeitpunkte, beispielsweise
`2026-11-03T08:00:00Z` und `2026-11-03T09:00:00Z` (09:00–10:00 Uhr in Deutschland).
Kein Befehl dieses Pakets veröffentlicht Inhalte oder verändert Konten.

Der Demonstrationspool enthält die zwölf bisherigen Wettkampffragen, je vier pro Stufe.
Die Beispiele ziehen alle zwölf: Mischen allein schafft keine neuen Aufgaben. Für einen
regelmäßig wiederholbaren Wettbewerb den Pool erweitern und die fachliche Vergleichbarkeit prüfen.
Alle Beispiele bleiben bis zur bewussten Freigabe im Status `draft`.

Die private Fragenbank und dieses gesamte Backend niemals nach GitHub Pages kopieren.
Die geplanten öffentlichen Dateien kommen später unter `Material_Physik/wettkaempfe/`.
