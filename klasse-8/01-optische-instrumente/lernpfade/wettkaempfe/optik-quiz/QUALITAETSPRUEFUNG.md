# Qualitätsprüfung – Optik-Wettbewerb Klasse 8

Prüfdatum: 27. Oktober 2026. Diese Prüfung betrifft die Integration im Repository; frühere Prüfaussagen der ZIP-Vorlage werden nicht übernommen.

## Automatisierte Prüfungen

57 Node-Tests bestehen, darunter neun neue Tests für den Optikpool. Geprüft sind 15 unabhängige Aufgabenfamilien, 39 Winkelvarianten, Themenreihenfolge, alle drei Aufgabentypen, Zahlen- und Zeichentoleranzen, Eingabevalidierung, Fristablauf, Wiederaufnahme, einmalige Wertung, Lösungsschutz der aktiven Frage und vollständige Nachbesprechung. Die bisherigen Tests zu Zugangscodes, persistenten Räumen, Versuchslimits, Monatsgrenzen, Ranglisten und Archivierung bestehen weiterhin.

Ausführung im Repository: node --test --test-isolation=none tools/wettkampf-api/test/*.test.mjs. Ohne die Windows-Sandboxeinschränkung ist weiterhin npm test im Backendordner verwendbar.

## Browserprüfung

Mit dem lokal laufenden Cloudflare-Worker und dem vorhandenen Chromium-basierten Edge wurden überprüft:

- Anmeldung mit persönlichem Code und Wiederaufnahme derselben offenen Frage nach Neuladen.
- Vollständige Runde mit 15 richtigen Antworten, Auswahlfragen und numerischen Winkeln.
- Zeichnen beider Strahlen über die tatsächliche Pfeiltastenbedienung.
- Mobile Ansicht mit 390 Pixel Breite und Desktopansicht mit 1280 Pixel Breite, ohne horizontalen Überlauf.
- Ungültige Winkeleingaben, automatische Rangliste, 15 Nachbesprechungseinträge und Pause vor dem nächsten Versuch.
- Einbettung im bestehenden Portal, Rückkehr zur Übersicht, erneutes Öffnen und Abmeldung.
- Übungsmodus ohne Zeitdruck sowie Weiterleitung vom Wettbewerbsbutton zur Anmeldung.
- Keine JavaScript-Laufzeitfehler im geprüften Ablauf; keine Speicherung des Zugangscodes in localStorage oder sessionStorage.

Testdaten wurden ausschließlich im separaten lokalen Speicher angelegt. Produktive Ranglisten wurden dafür nicht mit Testversuchen verändert. Prüfbericht und Bildschirmansichten liegen lokal im ignorierten Ordner .build/optik-browser/.

## Grenzen

Die Aufgaben sind öffentlich im Übungsmodus verfügbar und eignen sich für einen Lernwettbewerb. Die Aufgabenauswahl, Fristen und Wertung liegen auf dem Server; Geheimhaltung der öffentlich zugänglichen Fragen wird nicht behauptet. Es wurden keine echten Lernenden, keine belastungsstarke Klassensitzung und keine native iOS- oder Android-Umgebung getestet. Die Maus-/Touchbedienung stammt aus der Vorlage; zusätzlich zur Größenprüfung wurde die Tastaturbedienung tatsächlich durchgespielt.
