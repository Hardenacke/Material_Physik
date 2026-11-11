# Vom Ballwurf zur Flugbahn

EF Physik · 36 Minuten im Kern · optionale Vertiefung bis etwa 40 Minuten

Entpacken Sie das ZIP vollständig. Öffnen Sie index.html aus dem entpackten Ordner im Browser. Die Animationen und KaTeX-Dateien liegen im Paket. Für das GeoGebra-Applet auf der letzten Lernseite braucht der Browser Internetzugang. Das gleiche GeoGebra-Modell liegt als Schraeger_Wurf.ggb bei. Die vier Lernseiten sind über die obere Navigation und die Tasten am Seitenende erreichbar.

Die Oberfläche passt sich an die Bildschirmbreite an. Auf breiten Bildschirmen stehen Diagramme und Steuerung bei den ersten drei Simulationen nebeneinander. Auf schmalen Bildschirmen stehen sie untereinander. Ein kompakter Seitenkopf zeigt den Fortschritt beim Wechsel zwischen den Lernseiten an.

## Was die vier Buchseiten vermitteln

| Vorlage | Fachlicher Inhalt | Einbindung in den Lernpfad |
|---|---|---|
| S. 28, Kap. 1.9 | Die Fähre veranschaulicht die Überlagerung von Bewegungen in einem Bezugssystem. Das Laufbandmodell führt Orts- und Geschwindigkeitskomponenten in zwei senkrechten Richtungen und ihre Zusammensetzung ein. | Das Laufband wird auf Seite 1 aus Sicht einer nebenstehenden Person simuliert. Bandgeschwindigkeit, Quergeschwindigkeit und gemeinsamer Zeitraum sind einstellbar. |
| S. 29, Kap. 1.9 | Zwei Ortskoordinaten zur gleichen Zeit ergeben einen Bahnpunkt. Die Ortsänderung wird auf die Achsen projiziert. Auch Geschwindigkeit und Beschleunigung haben Komponenten. Die momentane Geschwindigkeit verläuft tangential zur Bahn. | Seite 1 zeigt die Projektionen. Seite 2 greift die Richtung der Geschwindigkeit auf und verbindet die Kraftkomponenten mit den Beschleunigungskomponenten. |
| S. 30, Kap. 1.10 | Beim waagerechten Wurf überlagern sich eine gleichförmige horizontale Bewegung und freier Fall. Der Skater macht den Unterschied zwischen mitbewegter und ortsfester Sicht anschaulich. Die Geschwindigkeitsdiagramme zeigen konstantes v_x und linear abnehmendes v_y. | Seite 3 vergleicht einen freien Fall und einen waagerechten Wurf zur selben Zeit. Die Wurfweite lässt sich bei gleicher Fallzeit ändern. |
| S. 31, Kap. 1.10 | Durch Eliminieren der Zeit entsteht die Bahngleichung des waagerechten Wurfs. Die Seite behandelt auch Geschwindigkeit, Wurfzeit und Wurfweite. | Seite 4 überträgt die Zeitelimination auf den schrägen Gruppenwurf. In der Formel wird der waagerechte Wurf als Sonderfall erkennbar. |

Die Zuordnung beruht auf den bereitgestellten Buchfotos. Die Kraftanalyse ist ein eigener Zwischenschritt. Das Kapitel zum waagerechten Wurf liefert ein Vergleichsmodell für den schrägen Gruppenwurf.

## Verlauf für die Lehrkraft

| Lernseite | Zeit | Arbeitsprodukt und erwarteter Befund |
|---|---:|---|
| 1 · Beobachten und zerlegen | 11 min | Dreiergruppen mit einem weichen Ball, seitlicher Beobachtung und Rollenwechsel. Die Gruppen skizzieren den Bogen und formulieren eine begründete Vermutung zur Kurvenform. Am Laufband vergleichen sie einzelne und überlagerte Bewegungen bei gleichem Zeitraum. |
| 2 · Kräfte untersuchen | 8 min | Die Gruppen zeichnen Kraft- und Geschwindigkeitspfeile für Aufstieg, Scheitel und Abstieg vor dem Einblenden. Im Modell wirkt im freien Flug nur die Gewichtskraft. Die Kontaktkraft der Hand gehört zur Abwurfphase. |
| 3 · Teilbewegungen vergleichen | 8 min | Vorhersage zur Landung und Vergleich zweier horizontaler Startgeschwindigkeiten bei gleichem Zeitpunkt. Die Höhe bleibt dabei unverändert. |
| 4 · Zur Flugbahn zurückkehren | 9 min | Aus Orts- und Geschwindigkeitskomponenten sowie der Bahngleichung begründen die Lernenden die Parabelform im Modell. Eine kurze Vertiefung zur Reichweite ist optional. |

Modellhinweis. Der Ball ist im freien Flug punktförmig, Luftwiderstand wird vernachlässigt und die Erdbeschleunigung ist näherungsweise konstant. Gleiche Abwurf- und Landehöhe wird nur im schrägen Flugmodell vorausgesetzt. Die reale Gruppenbeobachtung liefert eine Vermutung zur Kurvenform. Die Bewegungsgleichungen begründen die Parabel im Modell.

## Qualitätsprüfung

Der Lernpfad ist in der Physiksammlung unter EF → Grundlagen der Mechanik → Lernpfade eingebunden. Alle vier Seiten wurden in Edge mit Chromium geprüft: Navigation, Regler, Animationen, Antwortfeedback, gespeicherte Notizen sowie statische und dynamische Formeln als HTML und MathML. Bei 390 und 768 Pixel Breite entsteht kein horizontaler Überlauf; die Druckansicht zeigt alle vier Lernseiten. Beim waagerechten Wurf bleiben Höhe und Fallzeit bei veränderter horizontaler Startgeschwindigkeit gleich.

Das GeoGebra-Modell lädt online mit dem Classic-Player. Die Streckendefinition wurde korrigiert; der Download und das eingebettete Modell stimmen überein. Die Regler werden nach vollständigem Laden über den Initialisierungs-Callback synchronisiert. Anfangswerte und eine berechnete Ballposition nach Regleränderungen wurden im laufenden Modell geprüft. Ohne Internet zeigt die GeoGebra-Ansicht einen Hinweis; die lokalen Simulationen bleiben bedienbar.
