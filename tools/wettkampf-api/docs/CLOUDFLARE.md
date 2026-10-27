# Cloudflare einrichten

Stand: 27. Oktober 2026. Alle folgenden Befehle im Ordner `tools/wettkampf-api/`
ausführen. Die tatsächliche Kontoanmeldung, Kontoauswahl und Veröffentlichung erfolgen
mit deinem Cloudflare-Konto; es wurden noch keine Cloud-Ressourcen angelegt.

## 1. Voraussetzungen

- Node.js 24 mit npm und ein Cloudflare-Konto mit Workers/Durable Objects.
- Für die Grundversion weder eigene Domain noch D1, KV, R2 oder GitHub-Zugang nötig.
- Vor dem Schuleinsatz Tarif, Kontolimits und die schulische Freigabe für den Dienst klären.
  Die Umsetzung enthält keine Kostenzusage. Aktuelle [Durable-Objects-Tarife](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Die Anwendung nutzt SQLite-basierte Durable Objects. Die drei Namespaces werden durch
die `v1`-Migration aus `wrangler.jsonc` bei der ersten Bereitstellung angelegt;
manuelle Datenbank-IDs sind nicht einzutragen. Cloudflare dokumentiert diese Konfiguration
unter [Durable-Object-Speicher](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/).

## 2. Installation und Inhalte vorbereiten

```powershell
npm ci
npm run admin -- init
# Für einen ersten Test mit öffentlich bekannten Optikfragen:
npm run prepare:demo
# Für eigene unveröffentlichte Fragen stattdessen:
# npm run prepare:private
npm run check
npm test
npm run dry-run
```

`package-lock.json` bindet die getesteten Abhängigkeiten, darunter Wrangler 4.153.0.
Die Migrationstags und Klassennamen nach der ersten Bereitstellung beibehalten.
Spätere Speicheränderungen erhalten eine zusätzliche Migration; keine Namespaces
löschen oder für andere Zwecke wiederverwenden.

## 3. Worker bereitstellen

```powershell
npx wrangler login
npx wrangler whoami
npm run deploy
Get-Content .local/admin-token.txt | npx wrangler secret put ADMIN_TOKEN
```

Bei mehreren Cloudflare-Konten zuerst die gewünschte `account_id` in `wrangler.jsonc`
setzen. Sie ist eine Kontokennung und kein Geheimnis. Den tatsächlich von Wrangler
ausgegebenen HTTPS-Link verwenden, beispielsweise `https://physik-wettkampf-api.DEIN-SUBDOMAIN.workers.dev`.
Die Kontosubdomain lässt sich nicht aus den Materialien ableiten.

Der lokale Schlüssel wird mit dem letzten Befehl als verschlüsseltes Worker-Secret
übertragen. `.dev.vars` wird von Wrangler ausschließlich lokal verwendet und beim
Deployment nicht als Secret übernommen. Den Schlüssel niemals in `vars`, Browserdateien
oder Git speichern. Weitere Details: [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

`https://DEIN-WORKER.workers.dev/api/v1/health` liefert einen kleinen Status ohne
personenbezogene Daten. Die Schüleroberfläche liegt direkt unter dem Worker-Link.
HTML/CSS/JavaScript werden als [Worker Static Assets](https://developers.cloudflare.com/workers/static-assets/)
ausgeliefert, `/api/*` läuft zuerst durch den API-Worker.

## 4. Lerngruppe einrichten

Die Gruppenkennung muss zu einer bereitgestellten Konfiguration passen.
Beispiel für die Demo:

```powershell
npm run admin -- create --group klasse-8-demo
npm run admin -- import --group klasse-8-demo --file .local/import-klasse-8-demo-ZEITSTEMPEL.json --url https://DEIN-WORKER.workers.dev
```

Den tatsächlichen Dateinamen aus `create` einsetzen. Die Datei mit Präfix `codes-`
enthält die auszugebenden Codes, die Datei mit Präfix `import-` nur deren Hashes.
Für eigene Pseudonyme eine lokale JSON-Datei mit beispielsweise
`["Licht 01", "Licht 02", "Licht 03"]` anlegen und `--aliases .local/aliases.json` verwenden.
Nach dem Import zwei unterschiedliche Zugänge auf zwei Geräten testen.

## 5. Links aus der Materialsammlung

Am einfachsten den Worker-Link an die Klasse verteilen. Ein direkter Wettbewerbslink lautet:

```text
https://DEIN-WORKER.workers.dev/?competition=physik-optik-monat
```

Persönliche Codes gehören niemals in URLs. Soll dieselbe Oberfläche von GitHub Pages
aus genutzt werden, in der öffentlichen `config.js` die vollständige Worker-Herkunft als
`API_BASE` eintragen und im Repository `npm run build:site` ausführen. In `ALLOWED_ORIGINS`
den exakten Pages-Ursprung verwenden: `https://hardenacke.github.io`, ohne Repositorypfad
und ohne abschließenden Schrägstrich. Zusätzliche Ursprünge durch Kommas trennen.
Die eigene Worker-Herkunft ist automatisch erlaubt. Die bestehende Pages-Bereitstellung
veröffentlicht ausschließlich `_site/`; Servercode und private Fragen sind dort nicht enthalten.

Eine eigene Domain ist optional: nach erfolgreichem Funktionstest über Workers →
Settings → Domains & Routes verbinden. Dann die neue Herkunft für externe Browserzugriffe
ergänzen und bestehende Links bewusst umstellen. Bestehende Materialpfade bleiben erhalten.

## 6. Optionales privates GitHub-Archiv

Die Grundversion bewahrt Ergebnisse in Cloudflare auf und funktioniert mit
`ARCHIVE_MODE: "disabled"`. Ein zusätzliches Archiv aktivieren:

1. Ein **privates** Repository mit existierendem Branch `main` anlegen.
2. Einen Fine-grained Token ausschließlich für dieses Repository mit `Contents: Read and write` erstellen.
3. In `wrangler.jsonc` `ARCHIVE_MODE` auf `github`, `ARCHIVE_REPOSITORY` auf `BESITZER/REPOSITORY`
   und gegebenenfalls `ARCHIVE_BRANCH`/`ARCHIVE_PREFIX` setzen.
4. `npx wrangler secret put GITHUB_TOKEN` ausführen, dann `npm run deploy`.
5. Einen Testversuch abschließen; danach mit `admin -- archive --url …` und `admin -- status … --url …` kontrollieren.

Das Aktivieren beauftragt die Anwendung, Ergebnisdateien als GitHub-Commits in dieses
Repository zu schreiben. Es ist für den Wettbewerbsbetrieb optional. Der Writer prüft,
dass das Repository privat ist. Ein Ausfall blockiert den Spielbetrieb nicht.

## 7. Änderungen und Fehlerbehebung

Eigene Definitionen bearbeiten → `npm run prepare:private` → `npm test` →
`npm run dry-run` → `npm run deploy`. Bei einer veröffentlichten Definition eine neue
Versionsnummer verwenden, sobald Regeln oder Fragen geändert werden.

| Beobachtung | Vorgehen |
| --- | --- |
| `deployment.generated.mjs` fehlt | `prepare:demo` oder `prepare:private` ausführen |
| Leerer Katalog | Gruppe, Codeimport und Konfigurationsstatus prüfen |
| `401` | Code gesperrt/falsch oder Admin-Secret fehlt; Schülercode ist kein Admin-Schlüssel |
| `409` beim Start | Cooldown, Versuchslimit, Schließung, Zeitraum oder geänderte Definition prüfen |
| Browser blockiert Anfrage | `API_BASE` und exakten CORS-Ursprung prüfen; ein Pfad ist kein Ursprung |
| Archiv bleibt ausstehend | Token, privaten Repositoryzugriff, Branch, Instanzkonflikt und `admin -- archive` prüfen |
| Cloudflare verweigert Deployment | Konto, Workers-Berechtigungen und Durable-Object-Verfügbarkeit prüfen |

Für eine gezielte Diagnose `npx wrangler tail` verwenden; keine Codes, Request-Bodys oder
Authorization-Header protokollieren. Aktuelle [Wrangler-Befehle](https://developers.cloudflare.com/workers/wrangler/commands/).
