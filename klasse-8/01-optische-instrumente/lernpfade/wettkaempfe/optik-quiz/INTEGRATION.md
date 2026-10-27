# Integration in die vorhandene Wettbewerbsplattform

## Hosting

Der bestehende Worker physik-wettkampf-api liefert den kompletten Ordner wettkaempfe als statische Assets aus. /api/* wird vom API-Worker verarbeitet. Die bisherigen Pfade und Durable-Object-Namespaces bleiben erhalten. Es gibt keine zusätzliche Datenbank und keinen neuen Hostingdienst.

Der Wettbewerb ist als physik-optik-klasse-8, Version 1, Gruppe klasse-8-demo veröffentlicht. Seine optionale Konfiguration interface: optik-quiz aktiviert im Portal die Quizoberfläche. Das Portal öffnet competition.html in einem Frame derselben Herkunft und übergibt ausschließlich API-Funktionen. Der persönliche Code bleibt in der aufrufenden Seite. Bei Abmeldung wird der Frame entfernt. competition.html ist auch direkt aufrufbar und bietet dann eine eigene Anmeldung.

Die CSP erlaubt Einbettungen derselben Herkunft. Inline-Stile sind für die vorhandenen KaTeX-Formeln und Diagramme zugelassen, Skripte bleiben auf dieselbe Herkunft beschränkt. Die Übungsseite leitet ihren Wettbewerbsbutton und mode=competition auf den gehosteten Wettbewerb weiter. Ihre lokale Ergebnisübergabe ist kein Ranglisteneintrag.

## API

Alle Quizanfragen verwenden den vorhandenen /api/v1-Vertrag mit persönlichem Bearer-Code. Mutationen benötigen einen UUID-Header Idempotency-Key. Ein verlorenes Antwortpaket wird mit derselben Antwort und demselben Schlüssel erneut gesendet. Der Server berechnet Punkte, Leben, Zeitfristen und Bestwerte. Vom Browser übermittelte Gesamtpunktestände werden nicht angenommen.

- GET /api/v1/catalog?groupId=klasse-8-demo liefert freigegebene Wettbewerbe und das Pseudonym.
- GET /api/v1/competitions/physik-optik-klasse-8/versions/1/periods/gesamt/attempts/current stellt den letzten beziehungsweise laufenden Versuch wieder her.
- POST auf den Pfad attempts startet einen Versuch; Body: {}.
- POST attempts/VERSUCH/next öffnet die nächste Frage; Body: {}.
- POST attempts/VERSUCH/answer erhält questionId und answerId. Bei Auswahlfragen ist answerId eine Optionskennung, bei Zahlen- und Zeichenaufgaben ein endlicher Winkel von 0 bis 90. null bedeutet überspringen.
- GET attempts/VERSUCH gleicht den laufenden Versuch und fällige Fristen ab.
- GET leaderboard liefert ausschließlich serverseitige Bestwerte derselben Wertung.

Die Aufgabenarten heißen single-choice, number und ray. Öffentliche Fragen enthalten ausschließlich Darstellungsdaten. Lösungen und Toleranzen der aktiven oder zukünftigen Fragen werden nicht mitgeliefert. Nach beantworteten Fragen darf das Feedback die Lösung enthalten; die gespeicherte Nachbesprechung enthält nur bereits bearbeitete Fragen.

Für Zahlenaufgaben gelten 0,5° Toleranz beziehungsweise 1,5° beim Ablesen des Brechungswinkels. Bei Reflexionszeichnungen gelten 5°. Bei der qualitativen Brechungszeichnung muss der Winkel positiv und mehr als 3° kleiner als der Einfallswinkel sein. Eine physikalisch genaue Berechnung mit Brechungsindizes ist hier nicht Teil der Aufgabe.

Die alten Platzhalterendpunkte /api/submit und /api/leaderboard aus der ZIP-Vorlage werden nicht verwendet. Auch ein postMessage mit physikQuizResult schreibt keine Punkte in die Rangliste.

## Quelldaten und Versionen

Der Importer erzeugt 39 Varianten aus 15 Aufgabenfamilien. Die JSON-Schemata und src/vertrag.mjs prüfen Typen, Toleranzen und die passende Oberfläche. Der maschinenlesbare HTTP-Vertrag liegt in tools/wettkampf-api/api/openapi.json und lässt sich mit npm run build:api erzeugen. Die bisherigen zwölf Demofragen und die drei bestehenden Wettbewerbsdefinitionen bleiben erhalten.

Die vorhandene Ergebnisarchivierung ist unverändert zuständig. Der Quizclient schreibt nicht direkt nach GitHub. Zugangscodes, Administrationsschlüssel und Cloudflare-Zugangsdaten werden niemals als statische Assets ausgeliefert.
