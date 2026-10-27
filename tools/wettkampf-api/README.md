# Physik-Wettbewerbe auf Cloudflare

Diese Umsetzung ergänzt den Physik-Regelkern aus `Wettkampf_Architekturen_Mathe_Physik.zip`
um eine Spieloberfläche, eine HTTP-API, drei SQLite-basierte Durable-Object-Klassen,
Zugangsverwaltung und eine optionale Ergebnisarchivierung. Mathematik ist nicht beteiligt.

Die Ergebnisse dieser Arbeitskopie sollen direkt im bestehenden GitHub-Repository
`Hardenacke/Material_Physik` unter [`ergebnisse/`](../../ergebnisse/README.md) erscheinen.
Dazu ist die öffentliche Archivierung ausdrücklich freigegeben. Der GitHub-Token
benötigt **Contents: Read and write** für **Material_Physik** und wird ausschließlich
als Worker-Secret `GITHUB_TOKEN` hinterlegt. Die aktualisierte Konfiguration und der
Worker werden gemeinsam mit `npm.cmd run deploy` veröffentlicht.

**Einstieg:** [Cloudflare einrichten](docs/CLOUDFLARE.md) ·
[Architektur](docs/ARCHITEKTUR.md) · [Betrieb](docs/BETRIEB.md) ·
[Prüfstand](docs/PRUEFSTAND.md).

Die Schüleroberfläche liegt passend zum Optikbeispiel unter
[`klasse-8/01-optische-instrumente/lernpfade/wettkaempfe/`](../../klasse-8/01-optische-instrumente/lernpfade/wettkaempfe/index.html).
Sie bietet nach Anmeldung alle Wettbewerbe der jeweiligen Gruppe, auch zu weiteren Themen.
Cloudflare liefert diese Oberfläche und die API gemeinsam aus. Die vorhandene
GitHub-Pages-Sammlung behält ihre Pfade und ihren Veröffentlichungsprozess.

Neu: **[Mission Optik · Klasse 8](../../klasse-8/01-optische-instrumente/lernpfade/wettkaempfe/optik-quiz/README.md)**
übernimmt das Quiz aus `Optik_Quiz_Klasse_8.zip` mit 15 Aufgaben, Winkeleingaben und
zwei Strahlenzeichnungen. Es ist als `physik-optik-klasse-8`, Version 1, für die
bestehende Gruppe `klasse-8-demo` freigegeben. Die vorhandenen Codes gelten weiter.
Direkter Einstieg: `https://physik-wettkampf-api.physik-wettkampf-api.workers.dev/optik-quiz/competition.html`.
Wertung, Fristen und Rangliste werden serverseitig verwaltet. Der Übungsmodus bleibt
unter `optik-quiz/index.html` ohne Anmeldung verfügbar. Die Aufgaben sind öffentliche
Übungsdaten; der neue Pool ergänzt die zwölf bisherigen Demofragen.

## Lokal starten

Voraussetzung: Node.js 24 und npm. Aus diesem Ordner:

```powershell
npm ci
npm run prepare:demo
npm run admin -- init
npm run check
npm test
npm run dev
```

Danach `http://127.0.0.1:8787` öffnen. Ein zweites Terminal im selben Ordner:

```powershell
npm run admin -- create --group klasse-8-demo
# Den ausgegebenen Importdateinamen verwenden:
npm run admin -- import --group klasse-8-demo --file .local/import-klasse-8-demo-ZEITSTEMPEL.json
```

Die zugehörige Datei `.local/codes-klasse-8-demo-ZEITSTEMPEL.json` enthält die persönlichen
Codes. Gruppe `klasse-8-demo` und einen Code in der Oberfläche eingeben. Die Liste
enthält keine Klarnamen und darf trotzdem nicht veröffentlicht werden.

Alternativ im Repository: `tools/wettkampf-api/Start-Lokal.ps1`. Das Skript nutzt eine
installierte Node-Laufzeit oder eine bereits vorhandene portable Laufzeit in `.build/node-runtime`.

`prepare:demo` gibt die drei mitgelieferten Entwürfe nur im generierten lokalen
Worker-Modul frei. Die Quellkonfigurationen bleiben unverändert. Der Terminwettbewerb
ist beispielhaft für den **3. November 2026, 09:00–10:00 Uhr Berliner Zeit** konfiguriert.
Dauer- und Monatswettbewerb funktionieren ohne diesen Termin.

## Eigene Inhalte

Die zwölf mitgelieferten Optikfragen einschließlich Lösungen sind **öffentliche Demodaten**.
Für benotete oder ernsthaft gewertete Wettbewerbe eigene, unveröffentlichte Aufgaben verwenden.

```text
private/                         # vollständig von Git ausgeschlossen
  fragenpools/mein-pool.json
  wettkaempfe/mein-wettbewerb.json
.local/                          # private Codes, Schlüssel, Testdaten
src/deployment.generated.mjs     # generiertes Servermodul mit Lösungen, ignoriert
```

Eine eigene Konfiguration und einen Pool anhand der Vorlagen und JSON-Schemata anlegen.
`demo: false` setzen, Poolreferenz und Versionsnummern abstimmen, die Gruppenkennung
festlegen und den gewünschten Wettbewerb mit `status: "published"` freigeben. Anschließend:

```powershell
npm run prepare:private
npm run dry-run
```

Alle benötigten alten Versionen ebenfalls unter `private/wettkaempfe/` belassen.
Veröffentlichte Definitionen werden beim ersten Raumzugriff per SHA-256 gebunden.
Regel- oder Fragenänderungen benötigen eine neue Version; `status` ist separat veränderbar.
Neue Abbildungen gehören in den öffentlichen `assets/`-Ordner und dürfen keine Lösung verraten.
Die bisherige Oberfläche stellt Formeln als Text dar. Mission Optik verwendet das
lokal mitgelieferte KaTeX ohne CDN-Abhängigkeit. Der neue Fragenpool unterstützt
zusätzlich `number` und `ray`; diese benötigen `interface: "optik-quiz"`.

Ein neuer Entwurf für einen bereits in `private/fragenpools/` angelegten Pool lässt sich erzeugen:

```powershell
npm run neu -- --id optik-8a-monat --titel "Optik 8a" --gruppe klasse-8a --pool mein-pool --modus monat
```

Der Generator schreibt ausschließlich nach `private/wettkaempfe/` und überschreibt
keine vorhandene Datei. Er plant vier Fragen je Stufe; gegebenenfalls die Auswahl
an die Aufgabenfamilien des eigenen Pools anpassen. Weitere Modi: `offen`, `termin`.

## Verwaltungsbefehle

Standardmäßig nutzen die Befehle den lokalen Server und `.local/admin-token.txt`.
Für Cloudflare zusätzlich `--url https://DEIN-WORKER.workers.dev` angeben.
`ADMIN_TOKEN` aus der Umgebung hat Vorrang vor der lokalen Datei.

| Befehl | Funktion |
| --- | --- |
| `admin -- init` | Zufälligen Administrationsschlüssel und lokale `.dev.vars` erzeugen, bestehende Dateien erhalten |
| `admin -- create --group GRUPPE --aliases DATEI` | Neue Codes für ein JSON-Array eindeutiger Pseudonyme erzeugen |
| `admin -- import --group GRUPPE --file DATEI` | Hashes aus der Importdatei übertragen; gleicher Personen-ID zugeordneten Code ersetzen |
| `admin -- rotate --group GRUPPE --id PERSON --aliases DATEI` | Ersatzcode für eine bestehende Personen-ID vorbereiten; Datei enthält genau ein Pseudonym |
| `admin -- disable --group GRUPPE --id PERSON` | Zugang unmittelbar sperren |
| `admin -- status --competition ID --version 1 --period gesamt` | Aktive Versuche, Archivstand und Raumsteuerung abrufen |
| `admin -- close --competition ID --version 1 --period gesamt` | Diese Wertung dauerhaft schließen |
| `admin -- archive` | Archivaufträge nach Status zählen |

Bei `rotate` die neu erzeugte Importdatei anschließend importieren. Die Personen-ID
bleibt erhalten; Bestwerte und Versuchslimits bleiben zugeordnet. Niemals als Ersatz
einfach eine neue Person erzeugen. Bereits ausgegebene Codelisten getrennt und geschützt aufbewahren.

`close` ist pro Raum endgültig. Laufende Fragen werden bis zu ihrer gespeicherten Frist
gewertet; wartende Versuche enden. Für einen neuen Wettbewerb eine neue Version oder ID
verwenden. Bei Monatswettbewerben bezeichnet `--period` beispielsweise `2026-10`.
Für ein dauerhaftes Ende zusätzlich den Konfigurationsstatus auf `closed` setzen und erneut bereitstellen.

## Tests

```powershell
npm test
npm run dry-run
# Separater Testserver mit frischem, ausschließlich lokalem Speicher:
npx wrangler dev --ip 127.0.0.1 --port 8791 --persist-to .local/testlauf-01
# In einem zweiten Terminal:
npm run test:integration
```

Der Integrationstest schließt am Ende die lokale Dauerwertung. Für eine Wiederholung
einen neuen `--persist-to`-Ordner verwenden. Der normale Demobetrieb auf Port 8787
verwendet einen anderen Speicher. Niemals produktive URLs als Testziel verwenden.

Die Originaldokumente und der Original-OpenAPI-Vertrag bleiben als Quellen in
`docs/referenz/` erhalten. Sie beschreiben teilweise noch den früheren Planungsstand;
maßgeblich für die implementierte Variante sind diese README und `docs/*.md`.
