(function () {
  'use strict';

  function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffled(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }

  function choice(id, category, prompt, options, answer, explanation) {
    return {
      id: id,
      type: 'choice',
      category: category,
      prompt: prompt,
      options: options,
      answer: answer,
      explanation: explanation
    };
  }

  function buildRound() {
    var incidence = randomInteger(3, 11) * 5;
    var surfaceAngle = randomInteger(2, 8) * 10;
    var refractionAngle = 30;
    var refractIncidence = randomInteger(4, 6) * 10;

    var basics = [
      choice(
        'lichtquelle',
        'Grundbegriffe',
        'Was unterscheidet eine selbstleuchtende Lichtquelle von einem beleuchteten Gegenstand?',
        [
          { id: 'a', text: 'Eine Lichtquelle sendet selbst Licht aus; ein beleuchteter Gegenstand wirft Licht zurück.' },
          { id: 'b', text: 'Ein beleuchteter Gegenstand sendet immer mehr Licht aus als eine Lichtquelle.' },
          { id: 'c', text: 'Beide Begriffe bedeuten dasselbe.' },
          { id: 'd', text: 'Nur Gegenstände aus Glas können Licht zurückwerfen.' }
        ],
        'a',
        'Eine Lampe ist selbst eine Lichtquelle. Ein beleuchtetes Buch leuchtet nicht selbst: Es wird sichtbar, weil Licht auf das Buch trifft und von dort in deine Augen gelangt.'
      ),
      choice(
        'lichtstrahl',
        'Grundbegriffe',
        'Was beschreibt ein Lichtstrahl im Strahlenmodell?',
        [
          { id: 'a', text: 'Eine gedachte Linie für Ausbreitungsrichtung und Weg des Lichts; in einem gleichförmigen Stoff verläuft sie geradlinig.' },
          { id: 'b', text: 'Ein sehr dünner Faden, aus dem Licht besteht.' },
          { id: 'c', text: 'Die sichtbare Spur, die Licht immer in der Luft hinterlässt.' },
          { id: 'd', text: 'Eine Linie, die angibt, in welche Richtung das Auge Licht aussendet.' }
        ],
        'a',
        'Ein Lichtstrahl ist ein Modell. Er zeigt, in welche Richtung sich Licht ausbreitet. In einem gleichförmigen, durchsichtigen Stoff zeichnet man ihn geradlinig.'
      ),
      choice(
        'lichtbuendel',
        'Grundbegriffe',
        'Was ist ein Lichtbündel?',
        [
          { id: 'a', text: 'Eine Zusammenfassung vieler Lichtstrahlen. Die Strahlen können parallel, auseinanderlaufend oder zusammenlaufend verlaufen.' },
          { id: 'b', text: 'Ein einzelner Lichtstrahl, der immer gekrümmt ist.' },
          { id: 'c', text: 'Eine Stelle, an der ein Spiegel Licht schluckt.' },
          { id: 'd', text: 'Ein Schatten, der heller als die Umgebung ist.' }
        ],
        'a',
        'Ein Lichtbündel besteht aus mehreren Lichtstrahlen. Im Strahlenmodell unterscheidet man zum Beispiel parallele, auseinanderlaufende und zusammenlaufende Bündel.'
      ),
      choice(
        'durchsichtig-durchscheinend',
        'Grundbegriffe',
        'Milchglas lässt Licht hindurch, aber Gegenstände dahinter sind nur unscharf zu erkennen. Wie wird es beschrieben?',
        [
          { id: 'a', text: 'Durchscheinend: Licht gelangt hindurch, aber ein klares Bild entsteht nicht.' },
          { id: 'b', text: 'Undurchsichtig: Kein Licht gelangt hindurch.' },
          { id: 'c', text: 'Selbstleuchtend: Das Material erzeugt eigenes Licht.' },
          { id: 'd', text: 'Spiegelnd: Das Material lässt Licht nur geradlinig hindurch.' }
        ],
        'a',
        'Durchscheinende Stoffe lassen Licht durch, streuen es aber. Deshalb kann man Gegenstände dahinter nicht klar erkennen. Klare Fensterscheiben sind durchsichtig; Karton ist undurchsichtig.'
      ),
      choice(
        'halbschatten',
        'Grundbegriffe',
        'Hinter einem undurchsichtigen Gegenstand ist bei einer ausgedehnten Lichtquelle ein Bereich dunkler als die Umgebung, aber nicht völlig lichtfrei. Wie heißt dieser Bereich?',
        [
          { id: 'a', text: 'Halbschatten' },
          { id: 'b', text: 'Spiegelbild' },
          { id: 'c', text: 'Einfallslot' },
          { id: 'd', text: 'Brechungswinkel' }
        ],
        'a',
        'Im Halbschatten erreicht noch Licht von einem Teil der ausgedehnten Lichtquelle den Schirm. Im Kernschatten ist die Lichtquelle vollständig verdeckt.'
      ),
      choice(
        'ebener-spiegel',
        'Grundbegriffe',
        'Welche Aussage passt zum Bild in einem ebenen Spiegel?',
        [
          { id: 'a', text: 'Das Bild ist gleich groß und erscheint gleich weit hinter dem Spiegel, wie der Gegenstand davor steht.' },
          { id: 'b', text: 'Das Bild entsteht auf der Spiegeloberfläche und ist immer kleiner.' },
          { id: 'c', text: 'Das Bild ist nur sichtbar, wenn es selbst Licht aussendet.' },
          { id: 'd', text: 'Das Bild erscheint immer näher am Spiegel als der Gegenstand.' }
        ],
        'a',
        'Beim ebenen Spiegel sind Gegenstand und Bild gleich groß und gleich weit von der Spiegelebene entfernt. Das Spiegelbild ist virtuell: Licht tritt nicht von seinem scheinbaren Ort hinter dem Spiegel aus.'
      )
    ];

    var reflection = [
      choice(
        'einfallslot',
        'Reflexion',
        'Ein Lichtstrahl trifft auf einen ebenen Spiegel. Wie verläuft das Einfallslot am Auftreffpunkt?',
        [
          { id: 'a', text: 'Senkrecht zur Spiegeloberfläche durch den Auftreffpunkt.' },
          { id: 'b', text: 'Parallel zur Spiegeloberfläche durch den Auftreffpunkt.' },
          { id: 'c', text: 'Immer entlang des einfallenden Strahls.' },
          { id: 'd', text: 'Es wird vom Spiegel weg gekrümmt.' }
        ],
        'a',
        'Das Einfallslot steht senkrecht auf der Oberfläche und geht durch den Punkt, an dem der Lichtstrahl auftrifft. Einfalls- und Reflexionswinkel werden von diesem Lot aus gemessen.'
      ),
      choice(
        'diffuse-reflexion',
        'Reflexion',
        'Warum wird Licht an einer rauen Wand in viele Richtungen zurückgeworfen?',
        [
          { id: 'a', text: 'Die Oberfläche ist uneben. An den kleinen Teilflächen wird Licht in unterschiedliche Richtungen reflektiert.' },
          { id: 'b', text: 'Die Wand schluckt das Licht und erzeugt es danach neu.' },
          { id: 'c', text: 'An rauen Flächen gilt das Reflexionsgesetz nicht.' },
          { id: 'd', text: 'Nur glatte Flächen reflektieren Licht.' }
        ],
        'a',
        'Bei rauen Oberflächen zeigen die kleinen Flächennormalen in unterschiedliche Richtungen. Das Licht wird deshalb insgesamt gestreut. Auch an jeder kleinen Teilfläche gilt das Reflexionsgesetz.'
      ),
      {
        id: 'reflexionswinkel',
        type: 'number',
        category: 'Reflexion',
        prompt: 'Ein Lichtstrahl trifft mit dem Einfallswinkel \\(\\alpha = ' + incidence + '^\\circ\\) auf einen ebenen Spiegel. Trage den Reflexionswinkel \\(\\alpha\\prime\\) ein.',
        fieldLabel: '\\(\\alpha\\prime = ?\\)',
        answer: incidence,
        tolerance: 0.5,
        reviewAnswer: '\\(\\alpha\\prime = ' + incidence + '^\\circ\\)',
        explanation: 'Beim ebenen Spiegel ist der Reflexionswinkel genauso groß wie der Einfallswinkel. Beide Winkel werden zwischen dem jeweiligen Strahl und dem Einfallslot gemessen.'
      },
      {
        id: 'winkel-zum-lot',
        type: 'number',
        category: 'Reflexion',
        prompt: 'Der einfallende Strahl bildet mit der Spiegeloberfläche den Winkel \\(' + surfaceAngle + '^\\circ\\). Wie groß ist der Einfallswinkel zum Einfallslot?',
        fieldLabel: '\\(\\alpha = ?\\)',
        answer: 90 - surfaceAngle,
        tolerance: 0.5,
        reviewAnswer: '\\(\\alpha = 90^\\circ - ' + surfaceAngle + '^\\circ = ' + (90 - surfaceAngle) + '^\\circ\\)',
        explanation: 'Das Einfallslot steht senkrecht auf der Spiegeloberfläche. Die beiden Winkel ergänzen sich deshalb zu \\(90^\\circ\\). Der Einfallswinkel wird vom Lot aus gemessen.'
      },
      {
        id: 'strahl-reflexion',
        type: 'draw',
        category: 'Reflexion',
        prompt: 'Zeichne den reflektierten Strahl. Der Einfallswinkel beträgt \\(' + incidence + '^\\circ\\). Ziehe den runden Griff so, dass der Strahl am Spiegel nach oben weiterläuft.',
        diagram: 'reflection',
        incidence: incidence,
        expectedAngle: incidence,
        explanation: 'Der reflektierte Strahl liegt auf der anderen Seite des Einfallslots. Sein Winkel zum Lot ist genauso groß wie der Einfallswinkel.'
      }
    ];

    var refraction = [
      choice(
        'luft-glas',
        'Brechung',
        'Ein Lichtstrahl trifft schräg aus der Luft auf eine Glasplatte. Welche Richtung hat der Strahl im Glas?',
        [
          { id: 'a', text: 'Er wird zum Einfallslot hin gebrochen; sein Winkel zum Lot wird kleiner.' },
          { id: 'b', text: 'Er wird vom Einfallslot weg gebrochen; sein Winkel zum Lot wird größer.' },
          { id: 'c', text: 'Er wird immer genau an der Grenze vollständig zurückgeworfen.' },
          { id: 'd', text: 'Er läuft im Glas grundsätzlich nicht weiter.' }
        ],
        'a',
        'Beim Übergang von Luft in Glas gelangt der Strahl in ein optisch dichteres Medium. Er wird zum Lot hin gebrochen. An der Grenzfläche kann außerdem ein Teil des Lichts reflektiert werden.'
      ),
      {
        id: 'brechungswinkel-ablesen',
        type: 'number',
        category: 'Brechung',
        prompt: 'Der Lichtstrahl tritt aus Luft in Glas ein. Lies an der Skala den Brechungswinkel \\(\\beta\\) zwischen gebrochenem Strahl und Einfallslot ab. Jeder Skalenabschnitt entspricht \\(10^\\circ\\).',
        diagram: 'refractionReading',
        refractedAngle: refractionAngle,
        fieldLabel: '\\(\\beta = ?\\)',
        answer: refractionAngle,
        tolerance: 1.5,
        reviewAnswer: '\\(\\beta = ' + refractionAngle + '^\\circ\\)',
        explanation: 'Der Brechungswinkel wird zwischen dem gebrochenen Strahl und dem Einfallslot gemessen. Zähle die großen Skalenabschnitte vom Lot bis zum Strahl.'
      },
      {
        id: 'strahl-brechung',
        type: 'draw',
        category: 'Brechung',
        prompt: 'Der Strahl tritt aus Luft in ein optisch dichteres Medium ein. Zeichne den gebrochenen Strahl im unteren Bereich. Achte darauf, wie sich seine Richtung zum Einfallslot verändert.',
        diagram: 'refractionDraw',
        incidence: refractIncidence,
        explanation: 'Beim Übergang in ein optisch dichteres Medium wird der Lichtstrahl zum Lot hin gebrochen. Der Winkel zwischen gebrochenem Strahl und Lot ist also kleiner als der Einfallswinkel.'
      },
      choice(
        'bleistift-wasser',
        'Brechung',
        'Ein Strohhalm im Wasserglas sieht an der Wasseroberfläche geknickt aus. Was erklärt diesen Eindruck?',
        [
          { id: 'a', text: 'Licht wird beim Übergang zwischen Wasser und Luft gebrochen. Dadurch erscheint der untergetauchte Teil an einer anderen Stelle.' },
          { id: 'b', text: 'Der Strohhalm wird an der Wasseroberfläche tatsächlich verbogen.' },
          { id: 'c', text: 'Wasser erzeugt ein zweites Strohhalm-Bild durch Reflexion am Glasboden.' },
          { id: 'd', text: 'Licht läuft im Wasser grundsätzlich auf gekrümmten Bahnen.' }
        ],
        'a',
        'Licht vom untergetauchten Teil ändert an der Wasseroberfläche seine Richtung. Das Auge verlängert den Lichtweg geradlinig zurück. Deshalb erscheint der Teil im Wasser verschoben.'
      )
    ];

    return shuffled(basics).concat(shuffled(reflection), shuffled(refraction));
  }

  window.OptikQuizData = Object.freeze({ buildRound: buildRound });
}());
