# Ergebnisse der Physik-Wettbewerbe

Cloudflare schreibt die Ranglisten automatisch in diesen Ordner des GitHub-Repositories
`Hardenacke/Material_Physik`. Die Dateien sind öffentlich. Sie enthalten Pseudonyme,
Plätze, Bestwerte, Maximalpunkte und Abschlusszeiten. Zugangscodes, Codehashes,
Personen-IDs, Fragen und Lösungen werden nicht veröffentlicht.

## Ablage

```text
ergebnisse/
  snapshots/WETTBEWERB/vVERSION/ZEITRAUM/latest.json
  perioden/WETTBEWERB/vVERSION/ZEITRAUM/final.json
```

`latest.json` enthält die zuletzt gesicherte Rangliste. `final.json` entsteht nach dem
Abschluss einer Wertung. Der Zeitraum ist `gesamt` oder ein Monat wie `2026-10`.
Bei einer unbefristeten Dauerwertung gibt es ohne Schließung keinen endgültigen Abschluss.
Jede neue Revision wird als GitHub-Commit gespeichert; ältere Stände bleiben in der
Dateihistorie erreichbar. Die enthaltene `instanceId` bezeichnet den Cloudflare-Spielraum.

## Einrichtung

Im Worker `physik-wettkampf-api` sind diese Werte vorgesehen:

```json
"ARCHIVE_MODE": "github",
"ARCHIVE_REPOSITORY": "Hardenacke/Material_Physik",
"ARCHIVE_ALLOW_PUBLIC": "true",
"ARCHIVE_BRANCH": "main",
"ARCHIVE_PREFIX": "ergebnisse"
```

Der GitHub-Token benötigt Zugriff auf **Material_Physik**, mit **Contents: Read and write**.
Er wird ausschließlich als Worker-Secret `GITHUB_TOKEN` hinterlegt. Nach Änderungen
an der Workerimplementierung im Ordner `tools/wettkampf-api` `npm.cmd run deploy` ausführen.
Die vollständigen Schritte stehen in [Cloudflare einrichten](../tools/wettkampf-api/docs/CLOUDFLARE.md).

Die Dateien erscheinen nach erfolgreicher Übertragung auf GitHub. Eine lokale
Arbeitskopie erhält die neuen Dateien beim nächsten Git-Abruf. Cloudflare kann nicht
direkt in einen ausgeschalteten Rechner schreiben.

Die vorbereitete Änderung des Pages-Workflows verhindert nach ihrer Übernahme auf
GitHub neue Website-Builds bei reinen Ergebnis-Commits. Dieser Ordner wird nicht in
die erzeugte Materialwebsite kopiert; die Dateien sind über GitHub erreichbar.
