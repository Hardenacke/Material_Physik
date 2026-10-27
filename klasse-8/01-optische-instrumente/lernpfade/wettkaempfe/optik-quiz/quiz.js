(function () {
  'use strict';

  var QUIZ_ID = 'physik-optik-klasse-8-v1';
  var QUESTION_COUNT = 15;
  var ROUND_SECONDS = 25;
  var STARTING_LIVES = 3;
  var BASE_POINTS = 100;
  var POINTS_PER_SECOND = 4;
  var root = document.getElementById('optik-quiz');
  var params = new URLSearchParams(window.location.search);
  var activeApp = null;
  var leaderboardTimerId = null;

  function cloudflareSettings() {
    var source = window.OptikQuizCloudflareConfig || {};
    var base = String(source.apiBaseUrl || '').trim().replace(/\/+$/, '');
    if (!base) return null;
    try {
      var baseUrl = new URL(base);
      if (baseUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(baseUrl.hostname)) return null;
      function endpoint(path) {
        var result = new URL(path || '', baseUrl.origin + '/');
        if (result.origin !== baseUrl.origin) throw new Error('Worker-Pfade müssen zur API-Adresse gehören.');
        return result;
      }
      return {
        source: source,
        baseUrl: baseUrl,
        leaderboardUrl: endpoint(source.leaderboardPath || '/api/leaderboard'),
        submitUrl: endpoint(source.submitPath || '/api/submit'),
        quizId: String(source.quizId || QUIZ_ID),
        competitionId: String(params.get('competitionId') || source.defaultCompetitionId || 'optik-klasse-8'),
        maxEntries: Math.max(1, Math.min(25, Number(source.maxEntries) || 10)),
        refreshIntervalMs: Math.max(0, Math.min(120000, Number(source.refreshIntervalMs) || 0))
      };
    } catch (error) {
      return null;
    }
  }

  function leaderboardStatus(target, message, kind) {
    if (!target) return;
    target.textContent = message;
    target.className = 'leaderboard-status' + (kind ? ' is-' + kind : '');
  }

  function renderLeaderboardEntries(list, entries, maxEntries) {
    if (!list) return;
    var valid = (Array.isArray(entries) ? entries : []).filter(function (entry) {
      return entry && Number.isFinite(Number(entry.points !== undefined ? entry.points : entry.score));
    });
    valid.sort(function (a, b) {
      var difference = Number(b.points !== undefined ? b.points : b.score) - Number(a.points !== undefined ? a.points : a.score);
      if (difference) return difference;
      return Number(a.durationSeconds || 0) - Number(b.durationSeconds || 0);
    });
    list.replaceChildren();
    valid.slice(0, maxEntries).forEach(function (entry, index) {
      var name = String(entry.displayName || entry.alias || entry.name || 'Lichtteam').trim().slice(0, 40) || 'Lichtteam';
      var points = Math.max(0, Math.round(Number(entry.points !== undefined ? entry.points : entry.score) || 0));
      var correct = Number(entry.correct);
      var total = Number(entry.total);
      var detail = Number.isFinite(correct) && Number.isFinite(total) && total > 0
        ? '<span class="leaderboard-detail"><span data-tex="' + Math.max(0, Math.round(correct)) + '"></span> von <span data-tex="' + Math.max(0, Math.round(total)) + '"></span> richtig</span>'
        : '';
      var icon = index === 0 ? '✦' : (index === 1 ? '◆' : (index === 2 ? '◇' : ''));
      var item = document.createElement('li');
      item.className = 'leaderboard-row' + (index < 3 ? ' is-top-' + (index + 1) : '');
      item.innerHTML = '<span class="leaderboard-place">' + (icon ? '<i aria-hidden="true">' + icon + '</i>' : '') + '<span data-tex="' + (entry.rank || index + 1) + '"></span></span>' +
        '<span class="leaderboard-person"><strong>' + escapeHtml(name) + '</strong>' + detail + '</span>' +
        '<span class="leaderboard-points"><span data-tex="' + points + '"></span><small>Lichtpunkte</small></span>';
      list.appendChild(item);
    });
    renderMath(list);
  }

  function loadLeaderboard(container, button) {
    var status = container && container.querySelector('[data-leaderboard-status]');
    var list = container && container.querySelector('[data-leaderboard-list]');
    var settings = cloudflareSettings();
    if (!status || !list) return Promise.resolve();
    if (!settings) {
      leaderboardStatus(status, 'Die Rangliste ist zurzeit nicht verfügbar.');
      list.replaceChildren();
      return Promise.resolve();
    }
    if (button) button.disabled = true;
    leaderboardStatus(status, 'Rangliste wird geladen …');
    var url = new URL(settings.leaderboardUrl.href);
    url.searchParams.set('quizId', settings.quizId);
    url.searchParams.set('competitionId', settings.competitionId);
    return fetch(url.href, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        if (payload && payload.success === false) throw new Error('Leaderboard API returned an error');
        var entries = Array.isArray(payload) ? payload : (payload && (payload.entries || payload.results));
        if (!Array.isArray(entries)) throw new Error('Leaderboard response has no entries array');
        renderLeaderboardEntries(list, entries, settings.maxEntries);
        leaderboardStatus(status, entries.length ? 'Aktueller Stand aus der Rangliste.' : 'Für diese Runde gibt es noch keine Einträge.', entries.length ? 'ready' : 'empty');
      })
      .catch(function () {
        leaderboardStatus(status, 'Die Rangliste konnte nicht geladen werden. Bitte später erneut versuchen.', 'error');
        list.replaceChildren();
      })
      .finally(function () { if (button) button.disabled = false; });
  }

  function stopLeaderboardRefresh() {
    if (leaderboardTimerId) {
      window.clearInterval(leaderboardTimerId);
      leaderboardTimerId = null;
    }
  }

  function startLeaderboardRefresh(container) {
    stopLeaderboardRefresh();
    loadLeaderboard(container, null);
    var settings = cloudflareSettings();
    if (settings && settings.refreshIntervalMs > 0) {
      leaderboardTimerId = window.setInterval(function () { loadLeaderboard(container, null); }, settings.refreshIntervalMs);
    }
  }

  function createAttemptId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'optik-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function formatNumber(value) {
    return Number(value).toLocaleString('de-DE', {
      maximumFractionDigits: 1,
      useGrouping: false
    }).replace(',', '{,}');
  }

  function renderMath(target) {
    if (!window.katex || !window.renderMathInElement || !target) return;
    var options = {
      throwOnError: true,
      strict: 'error',
      trust: false,
      output: 'htmlAndMathml'
    };
    var explicitNodes = Array.from(target.querySelectorAll('[data-tex]'));
    if (target.matches && target.matches('[data-tex]')) explicitNodes.unshift(target);
    explicitNodes.forEach(function (node) {
      window.katex.render(node.getAttribute('data-tex'), node, Object.assign({}, options, {
        displayMode: node.getAttribute('data-display') === 'true'
      }));
    });
    window.renderMathInElement(target, {
      ...options,
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      ignoredClasses: ['katex', 'katex-display', 'no-math']
    });
  }

  function renderTeX(target, tex) {
    if (!window.katex || !target) return;
    target.replaceChildren();
    window.katex.render(tex, target, {
      throwOnError: true,
      strict: 'error',
      trust: false,
      output: 'htmlAndMathml'
    });
  }

  function svgDefs() {
    return '<defs>' +
      '<marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="ray-incoming-arrow"></path></marker>' +
      '<marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="ray-refraction-arrow"></path></marker>' +
      '</defs>';
  }

  function rayLegend() {
    return '<div class="diagram-key" aria-hidden="true">' +
      '<span class="key-item"><i class="key-line"></i>einfallender Strahl</span>' +
      '<span class="key-item"><i class="key-line out"></i>Strahl nach dem Auftreffen</span>' +
      '<span class="key-item"><i class="key-dash"></i>Einfallslot</span>' +
      '</div>';
  }

  function diagramFrame(title, body, description) {
    return '<div class="diagram-wrap">' +
      '<svg class="ray-svg" viewBox="0 0 400 270" role="img" aria-label="' + escapeHtml(description) + '">' +
      '<title>' + escapeHtml(title) + '</title>' +
      '<rect x="0" y="0" width="400" height="270" rx="17" fill="#f7fbff"></rect>' +
      body +
      '</svg>' +
      rayLegend() +
      '</div>';
  }

  function incomingRay(cx, cy, angle, radius) {
    var radians = angle * Math.PI / 180;
    var x1 = cx - Math.sin(radians) * radius;
    var y1 = cy - Math.cos(radians) * radius;
    return '<line class="ray-incoming" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
      '" x2="' + cx + '" y2="' + cy + '" marker-end="url(#arrow-blue)"></line>';
  }

  function drawingDiagram(kind, incidence, startingAngle) {
    var cx = 200;
    var cy = 142;
    var radius = 108;
    var initialRadians = startingAngle * Math.PI / 180;
    var hx = cx + Math.sin(initialRadians) * radius;
    var hy = kind === 'reflection'
      ? cy - Math.cos(initialRadians) * radius
      : cy + Math.cos(initialRadians) * radius;
    var medium = kind === 'refraction'
      ? '<rect x="2" y="145" width="396" height="122" fill="#e7f7f8"></rect><text class="ray-label" x="27" y="36">Luft</text><text class="ray-label" x="27" y="244">Optisch dichteres Medium</text>'
      : '<text class="ray-label" x="27" y="243">Spiegel</text>';
    var boundary = kind === 'refraction'
      ? '<line class="ray-surface" x1="40" y1="' + cy + '" x2="360" y2="' + cy + '"></line><text class="ray-label" x="275" y="130">Grenzfläche</text>'
      : '<line class="ray-surface" x1="40" y1="' + cy + '" x2="360" y2="' + cy + '"></line><text class="ray-label" x="275" y="130">Spiegeloberfläche</text>';
    var handleYmin = kind === 'reflection' ? 24 : cy + 19;
    var handleYmax = kind === 'reflection' ? cy - 20 : 251;
    var outMarker = kind === 'reflection' ? 'url(#arrow-blue)' : 'url(#arrow-cyan)';
    var body = svgDefs() +
      medium +
      boundary +
      '<line class="ray-normal" x1="' + cx + '" y1="24" x2="' + cx + '" y2="258"></line>' +
      '<text class="ray-label" x="' + (cx + 9) + '" y="48">Einfallslot</text>' +
      incomingRay(cx, cy, incidence, radius) +
      '<text class="ray-label" x="34" y="72">Einfallender Strahl</text>' +
      '<line class="ray-handle-line" data-ray-line x1="' + cx + '" y1="' + cy + '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) + '" marker-end="' + outMarker + '"></line>' +
      '<circle class="ray-point" cx="' + cx + '" cy="' + cy + '" r="6"></circle>' +
      '<circle class="ray-handle" data-ray-handle cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="12" tabindex="0" role="slider" aria-label="Griff zum Zeichnen des Strahls. Mit den Pfeiltasten bewegen." aria-valuemin="0" aria-valuemax="90" aria-valuenow="' + Math.round(startingAngle) + '" data-min-y="' + handleYmin + '" data-max-y="' + handleYmax + '"></circle>';
    return diagramFrame(
      kind === 'reflection' ? 'Strahlengang am Spiegel' : 'Brechung an einer Grenzfläche',
      body,
      kind === 'reflection'
        ? 'Einfallender Strahl, Spiegeloberfläche, Einfallslot und beweglicher Griff für den reflektierten Strahl.'
        : 'Einfallender Strahl aus Luft, Grenzfläche, Einfallslot und beweglicher Griff für den gebrochenen Strahl im optisch dichteren Medium.'
    );
  }

  function readingDiagram(angle) {
    var cx = 200;
    var cy = 145;
    var radius = 123;
    var radiansIn = 50 * Math.PI / 180;
    var radiansOut = angle * Math.PI / 180;
    var ix = cx - Math.sin(radiansIn) * 102;
    var iy = cy - Math.cos(radiansIn) * 102;
    var ox = cx + Math.sin(radiansOut) * 111;
    var oy = cy + Math.cos(radiansOut) * 111;
    var ticks = '';
    for (var deg = 0; deg <= 90; deg += 10) {
      var rad = deg * Math.PI / 180;
      var x = cx + Math.sin(rad) * radius;
      var y = cy + Math.cos(rad) * radius;
      var tangentX = Math.cos(rad);
      var tangentY = -Math.sin(rad);
      var len = 16;
      ticks += '<line class="ray-grid ' + (deg % 30 === 0 ? 'major' : '') + '" x1="' + (x - tangentX * len / 2).toFixed(1) +
        '" y1="' + (y - tangentY * len / 2).toFixed(1) + '" x2="' + (x + tangentX * len / 2).toFixed(1) +
        '" y2="' + (y + tangentY * len / 2).toFixed(1) + '"></line>';
    }
    var arc = '<path d="M ' + cx + ' ' + (cy + radius) + ' A ' + radius + ' ' + radius + ' 0 0 1 ' + (cx + radius) + ' ' + cy + '" fill="none" stroke="#c8d6e4" stroke-width="1.5"></path>';
    var body = svgDefs() +
      '<rect x="2" y="' + (cy + 3) + '" width="396" height="122" fill="#e7f7f8"></rect>' +
      '<text class="ray-label" x="27" y="34">Luft</text>' +
      '<text class="ray-label" x="27" y="248">Glas</text>' +
      '<line class="ray-surface" x1="40" y1="' + cy + '" x2="360" y2="' + cy + '"></line>' +
      '<line class="ray-normal" x1="' + cx + '" y1="23" x2="' + cx + '" y2="261"></line>' +
      '<text class="ray-label" x="208" y="45">Einfallslot</text>' +
      '<text class="ray-label" x="282" y="132">Grenzfläche</text>' +
      arc + ticks +
      '<line class="ray-incoming" x1="' + ix.toFixed(1) + '" y1="' + iy.toFixed(1) + '" x2="' + cx + '" y2="' + cy + '" marker-end="url(#arrow-blue)"></line>' +
      '<line class="ray-outgoing" x1="' + cx + '" y1="' + cy + '" x2="' + ox.toFixed(1) + '" y2="' + oy.toFixed(1) + '" marker-end="url(#arrow-cyan)"></line>' +
      '<circle class="ray-point" cx="' + cx + '" cy="' + cy + '" r="6"></circle>';
    return diagramFrame(
      'Winkelskala für die Brechung',
      body,
      'Ein Lichtstrahl tritt aus Luft in Glas ein. Einfallslot, Grenzfläche und eine Skala mit Teilstrichen von zehn Grad zeigen den gebrochenen Strahl.'
    );
  }

  function makeDiagram(question) {
    if (question.diagram === 'reflection') {
      return drawingDiagram('reflection', question.incidence, 62);
    }
    if (question.diagram === 'refractionDraw') {
      return drawingDiagram('refraction', question.incidence, question.incidence + 15);
    }
    if (question.diagram === 'refractionReading') {
      return readingDiagram(question.refractedAngle);
    }
    return '';
  }

  function modeCardIcon(kind) {
    if (kind === 'practice') {
      return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20M8 7h8M8 10.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2 14.7 8l5.4 1.1-3.7 4.1.5 5.5-4.9-2.2-4.9 2.2.5-5.5-3.7-4.1L9.3 8 12 3.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7.4v4.5l3 1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  function shellHeader() {
    return '<div class="site-topline">' +
      '<div class="brand"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12h4m10 0h4M12 3v4m0 10v4M6.1 6.1l2.8 2.8m6.2 6.2 2.8 2.8m0-11.8-2.8 2.8m-6.2 6.2-2.8 2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/></svg></span><span>Physik · Wettbewerbe</span></div>' +
      '<span class="context-chip"><span class="context-spark" aria-hidden="true">✦</span> Optik · Klasse <span data-tex="8"></span></span>' +
      '</div>';
  }

  function landingSceneMarkup() {
    return '<aside class="hero-visual" aria-label="Interaktive Lichtreflexion">' +
      '<div class="visual-plate">' +
      '<div class="visual-caption"><span class="scene-ping"></span><span>STRAHLEN-PLAYGROUND</span><span class="scene-mode">LIVE</span></div>' +
      '<svg class="preview-svg" viewBox="0 0 420 250" role="img" aria-label="Ein einfallender Lichtstrahl wird an einem Spiegel reflektiert.">' +
      '<defs>' +
      '<linearGradient id="beam-gradient" x1="0" x2="1"><stop offset="0" stop-color="#62dff0" stop-opacity=".25"/><stop offset=".55" stop-color="#8ce8ff"/><stop offset="1" stop-color="#8c93ff"/></linearGradient>' +
      '<filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<marker id="demo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#82edff"/></marker>' +
      '</defs>' +
      '<circle class="scene-orbit" cx="250" cy="124" r="112"></circle>' +
      '<circle class="scene-orbit scene-orbit-inner" cx="250" cy="124" r="76"></circle>' +
      '<line class="scene-normal" x1="89" y1="124" x2="250" y2="124"></line>' +
      '<line class="scene-mirror" x1="250" y1="43" x2="250" y2="205"></line>' +
      '<line class="scene-beam" data-demo-incoming x1="125" y1="52" x2="250" y2="124" marker-end="url(#demo-arrow)"></line>' +
      '<line class="scene-beam scene-beam-out" data-demo-reflected x1="250" y1="124" x2="125" y2="196" marker-end="url(#demo-arrow)"></line>' +
      '<circle class="scene-contact" cx="250" cy="124" r="8"></circle>' +
      '<circle class="scene-photon" data-demo-photon cx="125" cy="52" r="6"></circle>' +
      '<text class="scene-label" x="24" y="39">einfallender Strahl</text>' +
      '<text class="scene-label" x="31" y="228">reflektierter Strahl</text>' +
      '<text class="scene-label scene-label-right" x="264" y="62">Spiegel</text>' +
      '<text class="scene-label scene-label-soft" x="155" y="115">Einfallslot</text>' +
      '<path class="scene-angle-arc" d="M 204 124 A 46 46 0 0 0 214 91"></path>' +
      '</svg>' +
      '<div class="demo-controls">' +
      '<div class="demo-readout"><div><span class="demo-kicker">Stelle den Strahl ein</span><strong>Winkel zum Einfallslot</strong></div><output data-demo-angle-value aria-live="polite"></output></div>' +
      '<label class="sr-only" for="demo-angle">Einfallswinkel mit dem Regler verändern</label>' +
      '<input class="demo-slider" id="demo-angle" type="range" min="15" max="55" step="1" value="35" data-demo-angle>' +
      '<div class="slider-hints"><span>flacher Strahl</span><span>steiler Strahl</span></div>' +
      '</div>' +
      '<div class="visual-footer"><span class="visual-footer-icon">✦</span>Bewege den Regler und beobachte, wie das Strahlenbild reagiert.</div>' +
      '</div>' +
      '</aside>';
  }

  function landingMarkup() {
    return shellHeader() +
      '<section class="hero hero-mission" aria-labelledby="page-title">' +
      '<div class="hero-copy-block">' +
      '<p class="eyebrow"><span class="eyebrow-dot"></span> MISSION · OPTIK-LABOR</p>' +
      '<h1 id="page-title">Knack den<br><span class="hero-title-accent">Optik-Code.</span></h1>' +
      '<p class="hero-copy">Licht geht auf Abenteuertour: Erkenne Fachbegriffe, lenke Strahlen und knacke die Winkel-Challenges.</p>' +
      '<div class="hero-meta"><span><i class="meta-spark">✦</i>Grundbegriffe</span><span><i class="meta-spark">↗</i>Reflexion</span><span><i class="meta-spark">◇</i>Brechung</span></div>' +
      '<div class="hero-bottomline"><span class="hero-bottom-icon">⌁</span><span>Dein Blick wird schärfer – Aufgabe für Aufgabe.</span></div>' +
      '</div>' +
      landingSceneMarkup() +
      '</section>' +
      '<section class="content-card" aria-labelledby="choose-mode">' +
      '<div class="mission-heading"><div><span class="section-kicker">BEREIT FÜR DEINE MISSION?</span><h2 id="choose-mode">Wähle deinen Spielmodus</h2><p>In jeder Runde warten <span data-tex="15"></span> kurze Challenges auf dich.</p></div><span class="mission-stamp"><span class="stamp-star">✦</span><span>OPTIK<br>CHALLENGE</span></span></div>' +
      '<div class="mode-grid">' +
      '<button class="mode-card mode-card-practice" type="button" data-start-mode="practice">' +
      '<span class="mode-icon">' + modeCardIcon('practice') + '</span><span class="mode-label">TRAININGSLABOR</span><strong>Erst ausprobieren</strong>' +
      '<span>Ohne Zeitdruck. Nach jeder Antwort erhältst du eine kurze Erklärung und kannst dein Wissen festigen.</span>' +
      '<span class="mode-detail">Mit Erklärungen starten <span class="mode-arrow" aria-hidden="true">→</span></span>' +
      '</button>' +
      '<button class="mode-card mode-card-competition" type="button" data-start-mode="competition">' +
      '<span class="mode-icon">' + modeCardIcon('competition') + '</span><span class="mode-label">BÜHNE FREI</span><strong>Zum Wettbewerb</strong>' +
      '<span>Hol dir Lichtpunkte, halte deine Serie und schaff die Runde, bevor die Zeit abläuft.</span>' +
      '<span class="mode-detail"><span data-tex="3"></span> Leben <span class="detail-dot">·</span> <span data-tex="25\\,\\mathrm{s}"></span> pro Aufgabe <span class="mode-arrow" aria-hidden="true">→</span></span>' +
      '</button>' +
      '</div>' +
      '<div class="mission-route" aria-label="Themen der Mission">' +
      '<span class="route-label">DEIN WEG</span>' +
      '<span class="route-stop"><i class="route-icon">◌</i><span>Licht &amp; Schatten</span></span><i class="route-link"></i>' +
      '<span class="route-stop"><i class="route-icon">↗</i><span>Spiegel</span></span><i class="route-link"></i>' +
      '<span class="route-stop"><i class="route-icon">◇</i><span>Brechung</span></span>' +
      '</div>' +
      '<div class="notice"><span class="notice-icon" aria-hidden="true">✦</span><p>In den Strahlen-Challenges kannst du den Griff mit Finger, Maus oder Pfeiltasten bewegen. Alle Winkel werden vom Einfallslot aus gemessen.</p></div>' +
      '</section>' +
      '<section class="content-card leaderboard-card" aria-labelledby="leaderboard-title">' +
      '<div class="leaderboard-heading"><div><span class="section-kicker">LIVE-RANKING</span><h2 id="leaderboard-title">Optik-Rangliste</h2><p>Die besten Ergebnisse der aktuellen Runde.</p></div>' +
      '<button class="secondary-button leaderboard-refresh" type="button" data-leaderboard-refresh><span aria-hidden="true">↻</span>Aktualisieren</button></div>' +
      '<p class="leaderboard-status" data-leaderboard-status role="status" aria-live="polite">Rangliste wird geladen …</p>' +
      '<ol class="leaderboard-list" data-leaderboard-list aria-label="Ergebnisse der Rangliste"></ol>' +
      '</section>';
  }

  function bindLandingDemo(target) {
    var slider = target.querySelector('[data-demo-angle]');
    var incoming = target.querySelector('[data-demo-incoming]');
    var reflected = target.querySelector('[data-demo-reflected]');
    var photon = target.querySelector('[data-demo-photon]');
    var readout = target.querySelector('[data-demo-angle-value]');
    if (!slider || !incoming || !reflected || !photon || !readout) return;
    var centerX = 250;
    var centerY = 124;
    var radius = 128;
    function update() {
      var angle = Number(slider.value);
      var radians = angle * Math.PI / 180;
      var dx = Math.cos(radians) * radius;
      var dy = Math.sin(radians) * radius;
      var startX = centerX - dx;
      var startY = centerY - dy;
      var endX = centerX - dx;
      var endY = centerY + dy;
      incoming.setAttribute('x1', startX.toFixed(1));
      incoming.setAttribute('y1', startY.toFixed(1));
      incoming.setAttribute('x2', String(centerX));
      incoming.setAttribute('y2', String(centerY));
      reflected.setAttribute('x1', String(centerX));
      reflected.setAttribute('y1', String(centerY));
      reflected.setAttribute('x2', endX.toFixed(1));
      reflected.setAttribute('y2', endY.toFixed(1));
      photon.setAttribute('cx', startX.toFixed(1));
      photon.setAttribute('cy', startY.toFixed(1));
      renderTeX(readout, '\\alpha = ' + formatNumber(angle) + '^\\circ');
    }
    slider.addEventListener('input', update);
    update();
  }

  function heartSvg(lost) {
    return '<svg class="life-heart' + (lost ? ' is-lost' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-8.7-5.3-9.7-10.3C1.2 5.1 7.2 2.5 12 7.1c4.8-4.6 10.8-2 9.7 3.6C20.7 15.7 12 21 12 21Z"/></svg>';
  }

  function topicTrackMarkup(state) {
    var topics = [
      { label: 'Licht & Schatten', start: 0, end: 6, icon: '◌' },
      { label: 'Reflexion', start: 6, end: 11, icon: '↗' },
      { label: 'Brechung', start: 11, end: 15, icon: '◇' }
    ];
    return '<div class="topic-track quiz-topic-track" aria-label="Missionsthemen">' +
      topics.map(function (topic, index) {
        var stateClass = state.index >= topic.end ? ' is-complete' : (state.index >= topic.start ? ' is-active' : '');
        return (index ? '<span class="topic-track-link' + (state.index >= topic.start ? ' is-complete' : '') + '" aria-hidden="true"></span>' : '') +
          '<span class="topic-track-stop' + stateClass + '"><i class="route-icon" aria-hidden="true">' + topic.icon + '</i><span>' + topic.label + '</span></span>';
      }).join('') +
      '</div>';
  }

  function quizTopMarkup(state) {
    var count = state.round.length;
    var stats = state.mode === 'competition'
      ? '<div class="stats">' +
        '<div class="stat stat-time"><span class="stat-label">Zeit</span><strong class="stat-value" data-stat="time"></strong></div>' +
        '<div class="stat stat-lives"><span class="stat-label">Leben</span><span class="life-row" data-stat="lives"></span></div>' +
        '<div class="stat stat-points"><span class="stat-label">Lichtpunkte</span><strong class="stat-value" data-stat="points"></strong></div>' +
        '</div>'
      : '<div class="stats"><div class="stat stat-correct"><span class="stat-label">Treffer</span><strong class="stat-value" data-stat="correct"></strong></div></div>';
    return '<div class="quiz-top">' +
      '<div class="quiz-ident"><span class="brand-mark quiz-brand-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v3m0 13v3m9.5-9.5h-3m-13 0h-3M5.3 5.3l2.1 2.1m9.2 9.2 2.1 2.1m0-13.4-2.1 2.1m-9.2 9.2-2.1 2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>' +
      '<div class="quiz-ident-copy"><h2>Mission Optik</h2><small>' + (state.mode === 'competition' ? 'Wettbewerbsrunde · Klasse 8' : 'Trainingsrunde · Klasse 8') + '</small></div>' +
      '<span class="streak-badge" aria-label="Lichtserie"><span aria-hidden="true">✦</span><span>Serie</span><strong data-stat="streak" aria-live="polite"></strong></span></div>' +
      stats +
      '</div>' +
      '<div class="progress-meta"><span><i class="progress-spark" aria-hidden="true">✦</i> Missionsfortschritt</span><strong><span data-tex="' + (state.index + 1) + '"></span><span class="progress-slash">/</span><span data-tex="' + count + '"></span></strong></div>' +
      '<div class="progress-track" role="progressbar" aria-label="Fortschritt" aria-valuemin="0" aria-valuemax="' + count + '" aria-valuenow="' + state.index + '"><div class="progress-fill" style="width:' + ((state.index / count) * 100) + '%"></div><span class="progress-glint"></span></div>' +
      topicTrackMarkup(state);
  }

  function questionMarkup(state, question) {
    var options = '';
    if (question.type === 'choice') {
      var list = question.options.slice();
      for (var i = list.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      options = '<div class="choices" role="group" aria-label="Antwortmöglichkeiten">' +
        list.map(function (option, index) {
          var letter = String.fromCharCode(65 + index);
          return '<button class="choice-button" type="button" data-option="' + escapeHtml(option.id) + '">' +
            '<span class="choice-letter">' + letter + '</span><span class="choice-text">' + option.text + '</span></button>';
        }).join('') +
        '</div>';
    } else if (question.type === 'number') {
      options = '<div class="answer-row">' +
        '<div class="angle-field"><label for="numeric-answer">' + question.fieldLabel + '</label>' +
        '<div class="numeric-entry"><input id="numeric-answer" name="numeric-answer" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="angle-help" aria-label="Winkel in Grad eingeben"><span class="numeric-unit">\\(^{\\circ}\\)</span></div></div>' +
        '<button class="primary-button" type="button" data-submit-number>Prüfen</button>' +
        '</div><p class="field-help" id="angle-help">Du kannst ein Dezimalkomma oder einen Dezimalpunkt verwenden.</p>';
    } else if (question.type === 'draw') {
      options = '<p class="field-help">Ziehe den runden Griff. Mit den Pfeiltasten kannst du ihn ebenfalls bewegen.</p>' +
        '<p class="live-angle" data-live-angle aria-live="polite"></p>' +
        '<div class="answer-row"><button class="primary-button" type="button" data-submit-drawing>Strahl prüfen</button></div>';
    }
    return '<article class="question-card" data-question-id="' + escapeHtml(question.id) + '" data-category="' + escapeHtml(question.category) + '" aria-labelledby="question-prompt">' +
      '<div class="question-heading"><div class="question-context"><span class="category-chip" data-category="' + escapeHtml(question.category) + '"><i class="category-gem" aria-hidden="true">✦</i>' + escapeHtml(question.category) + '</span><span class="question-type-label">CHALLENGE</span></div>' +
      '<span class="question-counter"><span class="counter-flare" aria-hidden="true">✦</span><span data-tex="' + (state.index + 1) + '"></span><span class="progress-slash">/</span><span data-tex="' + state.round.length + '"></span></span></div>' +
      '<div class="prompt-marker"><span class="prompt-marker-icon" aria-hidden="true">✧</span><span>DEINE AUFGABE</span></div>' +
      '<div class="question-prompt" id="question-prompt">' + question.prompt + '</div>' +
      (question.diagram ? makeDiagram(question) : '') +
      options +
      '<div class="feedback" data-feedback role="status" aria-live="polite"></div>' +
      '<div class="action-row"><button class="secondary-button" type="button" data-exit>Runde verlassen</button>' +
      '<button class="primary-button" type="button" data-next hidden>Weiter <span class="button-arrow" aria-hidden="true">→</span></button></div>' +
      '</article>';
  }

  function parseAngle(input) {
    var cleaned = String(input || '').trim().replace(/\s/g, '').replace(/°/g, '').replace(',', '.');
    if (!cleaned || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
    var value = Number(cleaned);
    if (!Number.isFinite(value) || value < 0 || value > 90) return null;
    return value;
  }

  function getSvgPoint(svg, event) {
    var point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  function attachDrawing(rootElement, question, onChange) {
    var svg = rootElement.querySelector('.ray-svg');
    var handle = rootElement.querySelector('[data-ray-handle]');
    var line = rootElement.querySelector('[data-ray-line]');
    if (!svg || !handle || !line) return null;
    var centerX = 200;
    var centerY = 142;

    function currentAngle() {
      var x = Number(handle.getAttribute('cx')) - centerX;
      var y = Math.abs(Number(handle.getAttribute('cy')) - centerY);
      return Math.atan2(Math.abs(x), y) * 180 / Math.PI;
    }

    function setPosition(x, y) {
      x = Math.max(centerX + 20, Math.min(355, x));
      if (question.diagram === 'reflection') {
        y = Math.max(23, Math.min(centerY - 20, y));
      } else {
        y = Math.max(centerY + 20, Math.min(255, y));
      }
      handle.setAttribute('cx', x.toFixed(1));
      handle.setAttribute('cy', y.toFixed(1));
      line.setAttribute('x2', x.toFixed(1));
      line.setAttribute('y2', y.toFixed(1));
      var angle = currentAngle();
      handle.setAttribute('aria-valuenow', String(Math.round(angle)));
      onChange(angle);
    }

    handle.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', function (event) {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      var point = getSvgPoint(svg, event);
      setPosition(point.x, point.y);
    });
    handle.addEventListener('pointerup', function (event) {
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    });
    handle.addEventListener('keydown', function (event) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      var x = Number(handle.getAttribute('cx'));
      var y = Number(handle.getAttribute('cy'));
      var step = event.shiftKey ? 11 : 5;
      if (event.key === 'ArrowUp') y -= step;
      if (event.key === 'ArrowDown') y += step;
      if (event.key === 'ArrowLeft') x -= step;
      if (event.key === 'ArrowRight') x += step;
      setPosition(x, y);
    });
    onChange(currentAngle());
    return {
      angle: currentAngle,
      setDisabled: function (disabled) {
        handle.setAttribute('aria-disabled', String(disabled));
        handle.style.pointerEvents = disabled ? 'none' : '';
      }
    };
  }

  function createApplication(container, options) {
    options = options || {};
    var app = {
      mode: options.mode === 'competition' ? 'competition' : 'practice',
      round: [],
      index: 0,
      correct: 0,
      streak: 0,
      bestStreak: 0,
      points: 0,
      lives: STARTING_LIVES,
      review: [],
      startedAt: 0,
      finishedAt: 0,
      secondsLeft: ROUND_SECONDS,
      timerId: null,
      locked: false,
      drawing: null,
      submitted: false,
      result: null,
      resultSent: false,
      attemptId: null,
      configured: options,
      container: container
    };

    function setMarkup(markup) {
      container.innerHTML = markup;
      renderMath(container);
    }

    function updateStats() {
      var streakNode = container.querySelector('[data-stat="streak"]');
      if (streakNode) renderTeX(streakNode, String(app.streak));
      if (app.mode !== 'competition') {
        var correctNode = container.querySelector('[data-stat="correct"]');
        if (correctNode) renderTeX(correctNode, String(app.correct));
        return;
      }
      var timeNode = container.querySelector('[data-stat="time"]');
      var pointsNode = container.querySelector('[data-stat="points"]');
      var livesNode = container.querySelector('[data-stat="lives"]');
      if (timeNode) {
        renderTeX(timeNode, formatNumber(app.secondsLeft) + '\\,\\mathrm{s}');
        var timeStat = container.querySelector('.stat-time');
        if (timeStat) timeStat.classList.toggle('is-low', app.secondsLeft <= 5);
      }
      if (pointsNode) renderTeX(pointsNode, String(app.points));
      if (livesNode) {
        livesNode.innerHTML = [0, 1, 2].map(function (index) {
          return heartSvg(index >= app.lives);
        }).join('');
        livesNode.setAttribute('aria-label', app.lives + ' Leben verbleibend');
      }
    }

    function stopTimer() {
      if (app.timerId) {
        window.clearInterval(app.timerId);
        app.timerId = null;
      }
    }

    function renderQuestion() {
      stopTimer();
      app.locked = false;
      app.submitted = false;
      app.drawing = null;
      var question = app.round[app.index];
      var percent = (app.index / app.round.length) * 100;
      setMarkup(quizTopMarkup(app) + questionMarkup(app, question) +
        '<div class="footer-note"><span>' + (app.mode === 'competition' ? 'Jede richtige Antwort bringt Punkte. Ein Fehler kostet ein Leben.' : 'Nimm dir Zeit und lies die Rückmeldung nach jeder Antwort.') + '</span><span>Mathematische Schreibweise: Winkel zum Einfallslot</span></div>');
      var progress = container.querySelector('.progress-fill');
      if (progress) progress.style.width = percent + '%';
      var progressBar = container.querySelector('[role="progressbar"]');
      if (progressBar) progressBar.setAttribute('aria-valuenow', String(app.index));
      updateStats();
      bindQuestionEvents(question);
      if (app.mode === 'competition') startTimer();
      var prompt = container.querySelector('#question-prompt');
      if (prompt) prompt.setAttribute('tabindex', '-1');
      if (app.index === 0 && prompt) prompt.focus({ preventScroll: true });
    }

    function startTimer() {
      app.secondsLeft = ROUND_SECONDS;
      updateStats();
      var until = Date.now() + ROUND_SECONDS * 1000;
      app.timerId = window.setInterval(function () {
        var previous = app.secondsLeft;
        app.secondsLeft = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        if (app.secondsLeft !== previous) updateStats();
        if (app.secondsLeft <= 0) {
          stopTimer();
          commitAnswer(false, null, 'timeout');
        }
      }, 200);
    }

    function bindQuestionEvents(question) {
      container.querySelectorAll('[data-option]').forEach(function (button) {
        button.addEventListener('click', function () {
          if (app.locked) return;
          var selected = button.getAttribute('data-option');
          var correct = selected === question.answer;
          container.querySelectorAll('[data-option]').forEach(function (choiceButton) {
            choiceButton.disabled = true;
            var choiceId = choiceButton.getAttribute('data-option');
            if (choiceId === question.answer) choiceButton.classList.add('is-correct');
            if (choiceId === selected && !correct) choiceButton.classList.add('is-wrong');
          });
          commitAnswer(correct, selected, 'choice');
        });
      });

      var numberButton = container.querySelector('[data-submit-number]');
      var input = container.querySelector('#numeric-answer');
      if (numberButton && input) {
        numberButton.addEventListener('click', function () {
          if (app.locked) return;
          var value = parseAngle(input.value);
          if (value === null) {
            input.setAttribute('aria-invalid', 'true');
            input.focus();
            var feedback = container.querySelector('[data-feedback]');
            feedback.className = 'feedback is-visible is-wrong';
            feedback.innerHTML = '<p class="feedback-title">Bitte gib einen Winkel zwischen \\(0^\\circ\\) und \\(90^\\circ\\) ein.</p><p>Verwende eine Zahl und bestätige anschließend.</p>';
            renderMath(feedback);
            return;
          }
          input.removeAttribute('aria-invalid');
          commitAnswer(Math.abs(value - question.answer) <= question.tolerance, value, 'number');
        });
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') numberButton.click();
        });
      }

      var drawButton = container.querySelector('[data-submit-drawing]');
      if (question.type === 'draw') {
        app.drawing = attachDrawing(container, question, function (angle) {
          var live = container.querySelector('[data-live-angle]');
          if (live) {
            live.innerHTML = 'Dein Winkel: <span data-current-angle></span>';
            renderTeX(live.querySelector('[data-current-angle]'), formatNumber(angle) + '^\\circ');
          }
        });
      }
      if (drawButton) {
        drawButton.addEventListener('click', function () {
          if (app.locked || !app.drawing) return;
          var angle = app.drawing.angle();
          var correct = question.diagram === 'reflection'
            ? Math.abs(angle - question.expectedAngle) <= 5
            : angle < question.incidence - 3;
          app.drawing.setDisabled(true);
          commitAnswer(correct, angle, 'draw');
        });
      }

      var exitButton = container.querySelector('[data-exit]');
      if (exitButton) exitButton.addEventListener('click', function () {
        stopTimer();
        app.lives = STARTING_LIVES;
        app.points = 0;
        app.correct = 0;
        app.index = 0;
        app.review = [];
        renderLanding();
      });
    }

    function lockControls() {
      app.locked = true;
      stopTimer();
      container.querySelectorAll('[data-option], [data-submit-number], [data-submit-drawing]').forEach(function (element) {
        element.disabled = true;
      });
      var input = container.querySelector('#numeric-answer');
      if (input) input.disabled = true;
      if (app.drawing) app.drawing.setDisabled(true);
    }

    function commitAnswer(correct, given, answerType) {
      if (app.locked) return;
      lockControls();
      var question = app.round[app.index];
      var beforePoints = app.points;
      if (correct) {
        app.correct += 1;
        app.streak += 1;
        app.bestStreak = Math.max(app.bestStreak, app.streak);
        if (app.mode === 'competition') {
          var timeBonus = Math.max(0, app.secondsLeft) * POINTS_PER_SECOND;
          app.points += BASE_POINTS + timeBonus;
        }
      } else if (app.mode === 'competition') {
        app.lives = Math.max(0, app.lives - 1);
      }
      if (!correct) app.streak = 0;
      var awarded = app.points - beforePoints;
      app.review.push({
        question: question,
        correct: correct,
        given: given,
        answerType: answerType,
        awarded: awarded
      });
      updateStats();
      showFeedback(question, correct, awarded);
      var nextButton = container.querySelector('[data-next]');
      if (nextButton) {
        nextButton.hidden = false;
        nextButton.textContent = app.lives === 0 && app.mode === 'competition'
          ? 'Ergebnis ansehen'
          : (app.index === app.round.length - 1 ? 'Runde beenden' : 'Weiter');
        nextButton.appendChild(document.createTextNode(' '));
        var arrow = document.createElement('span');
        arrow.className = 'button-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        nextButton.appendChild(arrow);
        nextButton.addEventListener('click', next, { once: true });
        nextButton.focus({ preventScroll: true });
      }
      if (app.mode === 'competition' && app.lives === 0) {
        var title = container.querySelector('.feedback-title');
        if (title) title.textContent = correct ? 'Letztes Leben – die Runde ist beendet.' : 'Keine Leben mehr – die Runde ist beendet.';
        if (nextButton) nextButton.focus({ preventScroll: true });
      }
    }

    function showFeedback(question, correct, awarded) {
      var feedback = container.querySelector('[data-feedback]');
      if (!feedback) return;
      feedback.className = 'feedback is-visible ' + (correct ? 'is-correct' : 'is-wrong');
      if (app.mode === 'practice') {
        var answer = correct ? 'Richtig.' : 'Noch nicht richtig. ' + (question.reviewAnswer ? 'Die passende Antwort lautet ' + question.reviewAnswer + '.' : '');
        var streakMessage = correct && app.streak >= 2
          ? '<p class="feedback-streak"><span aria-hidden="true">✦</span> ' + app.streak + ' Treffer in Folge – deine Lichtserie leuchtet!</p>'
          : '';
        feedback.innerHTML = '<p class="feedback-title">' + answer + '</p>' + streakMessage + '<p>' + question.explanation + '</p>';
      } else if (correct) {
        var competitionStreak = app.streak >= 2
          ? '<p class="feedback-streak"><span aria-hidden="true">✦</span> ' + app.streak + ' Treffer in Folge – deine Lichtserie leuchtet!</p>'
          : '';
        feedback.innerHTML = '<p class="feedback-title">Richtig · +<span data-awarded-points></span> Punkte</p>' + competitionStreak + '<p>Deine Antwort bringt dich weiter.</p>';
        renderTeX(feedback.querySelector('[data-awarded-points]'), String(awarded));
      } else {
        feedback.innerHTML = '<p class="feedback-title">Das war diesmal nicht richtig.</p><p>In der Wettbewerbsrunde verlierst du ein Leben. Die vollständige Erklärung erscheint in der Ergebnisübersicht.</p>';
      }
      renderMath(feedback);
    }

    function next() {
      if (!app.locked) return;
      if (app.mode === 'competition' && app.lives === 0) {
        finish('lives');
        return;
      }
      if (app.index >= app.round.length - 1) {
        finish('completed');
        return;
      }
      app.index += 1;
      renderQuestion();
    }

    function answerText(item) {
      var question = item.question;
      if (item.given === 'timeout') return 'Keine Eingabe vor Ablauf der Zeit.';
      if (question.type === 'choice') {
        var chosen = question.options.find(function (option) { return option.id === item.given; });
        return chosen ? chosen.text : 'Keine Antwort ausgewählt.';
      }
      if (question.type === 'number') {
        return '\\(' + formatNumber(item.given) + '^\\circ\\)';
      }
      if (question.diagram === 'reflection') {
        return 'Zeichnung mit einem Winkel von \\(' + formatNumber(item.given) + '^\\circ\\).';
      }
      return 'Gezeichneter Strahl mit einem Winkel von \\(' + formatNumber(item.given) + '^\\circ\\).';
    }

    function correctAnswerText(question) {
      if (question.type === 'choice') {
        var answer = question.options.find(function (option) { return option.id === question.answer; });
        return answer ? answer.text : '';
      }
      if (question.type === 'number') return question.reviewAnswer;
      if (question.diagram === 'reflection') {
        return 'Der reflektierte Strahl wird so gezeichnet, dass der Winkel zum Einfallslot \\(' + formatNumber(question.expectedAngle) + '^\\circ\\) beträgt.';
      }
      return 'Im optisch dichteren Medium wird der Strahl zum Einfallslot hin gebrochen.';
    }

    function buildResult(endedBy) {
      var endedAt = Date.now();
      app.finishedAt = endedAt;
      return {
        quizId: QUIZ_ID,
        mode: app.mode,
        competitionId: app.mode === 'competition'
          ? (app.configured.competitionId || params.get('competitionId') || null)
          : null,
        attemptId: app.configured.attemptId || params.get('attemptId') || app.attemptId,
        points: app.mode === 'competition' ? app.points : null,
        correct: app.correct,
        bestStreak: app.bestStreak,
        total: app.review.length,
        maxPoints: app.mode === 'competition' ? app.review.length * (BASE_POINTS + ROUND_SECONDS * POINTS_PER_SECOND) : null,
        durationSeconds: Math.max(0, Math.round((endedAt - app.startedAt) / 1000)),
        livesRemaining: app.mode === 'competition' ? app.lives : null,
        endedBy: endedBy,
        submittedAt: new Date(endedAt).toISOString()
      };
    }

    function sendResult(result) {
      if (app.resultSent) return;
      app.resultSent = true;
      if (typeof app.configured.onResult === 'function') {
        try { app.configured.onResult(result); } catch (error) { console.error('OptikQuiz onResult failed', error); }
      }
      var candidate = app.configured.parentOrigin || params.get('parentOrigin');
      if (!candidate && document.referrer) {
        try { candidate = new URL(document.referrer).origin; } catch (error) { candidate = null; }
      }
      var targetOrigin = null;
      try {
        if (candidate) {
          var parsedOrigin = new URL(candidate);
          if (parsedOrigin.protocol === 'https:' || parsedOrigin.origin === window.location.origin) {
            targetOrigin = parsedOrigin.origin;
          }
        }
      } catch (error) {
        targetOrigin = null;
      }
      if (window.parent !== window && targetOrigin && targetOrigin !== 'null') {
        window.parent.postMessage({
          type: 'physikQuizResult',
          payload: result
        }, targetOrigin);
      }
      var sent = container.querySelector('[data-result-sent]');
      if (sent) sent.textContent = typeof app.configured.onResult === 'function' || (window.parent !== window && targetOrigin)
        ? 'Ergebnis wurde an die Wettbewerbsseite übergeben.'
        : 'Diese Runde wurde lokal abgeschlossen. Eine Wettbewerbsseite ist noch nicht verbunden.';
    }

    function bindLeaderboardSubmission(result) {
      var button = container.querySelector('[data-submit-leaderboard]');
      var nameInput = container.querySelector('[data-leaderboard-name]');
      var status = container.querySelector('[data-leaderboard-submit-status]');
      if (!button || !nameInput || !status) return;
      button.addEventListener('click', function () {
        var settings = cloudflareSettings();
        var displayName = String(nameInput.value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
        if (!displayName) {
          leaderboardStatus(status, 'Gib ein selbst gewähltes Kürzel ein, um dein Ergebnis einzutragen.', 'error');
          nameInput.focus();
          return;
        }
        if (!settings) {
          leaderboardStatus(status, 'Die Rangliste ist zurzeit nicht verfügbar.', 'error');
          return;
        }
        button.disabled = true;
        leaderboardStatus(status, 'Ergebnis wird übertragen …');
        var entry = {
          quizId: settings.quizId,
          competitionId: result.competitionId || settings.competitionId,
          attemptId: result.attemptId,
          displayName: displayName,
          points: result.points,
          correct: result.correct,
          total: result.total,
          bestStreak: result.bestStreak,
          durationSeconds: result.durationSeconds,
          livesRemaining: result.livesRemaining,
          endedBy: result.endedBy,
          submittedAt: result.submittedAt
        };
        fetch(settings.submitUrl.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(entry)
        })
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then(function (payload) {
            if (!payload || payload.success === false) throw new Error('Submission was rejected');
            if (payload.entry && payload.entry.rank !== undefined) payload.rank = payload.entry.rank;
            if (Number.isFinite(Number(payload.rank)) && Number(payload.rank) > 0) {
              status.innerHTML = 'Ergebnis eingetragen · Platz <span data-upload-rank></span>.';
              renderTeX(status.querySelector('[data-upload-rank]'), String(Math.round(Number(payload.rank))));
              status.className = 'leaderboard-status is-ready';
            } else {
              leaderboardStatus(status, 'Ergebnis wurde in die Rangliste eingetragen.', 'ready');
            }
            nameInput.disabled = true;
            button.hidden = true;
          })
          .catch(function () {
            leaderboardStatus(status, 'Das Ergebnis konnte nicht übertragen werden. Bitte später erneut versuchen.', 'error');
            button.disabled = false;
          });
      });
    }

    function finish(endedBy) {
      stopTimer();
      app.result = buildResult(endedBy);
      var summary = app.result;
      var title = app.mode === 'competition'
        ? (endedBy === 'lives' ? 'Die Runde ist beendet' : 'Runde geschafft')
        : 'Gut gemacht!';
      var subtitle = app.mode === 'competition'
        ? 'Hier siehst du deinen Punktestand und die Erklärungen zu allen Aufgaben.'
        : 'Schau dir an, welche Begriffe und Zusammenhänge du schon sicher erkannt hast.';
      var tiles = app.mode === 'competition'
        ? '<div class="result-tile"><span>Punkte</span><strong data-result-points></strong></div>' +
          '<div class="result-tile"><span>Richtige Antworten</span><strong data-result-correct></strong></div>' +
          '<div class="result-tile"><span>Verbleibende Leben</span><strong data-result-lives></strong></div>' +
          '<div class="result-tile"><span>Bearbeitete Aufgaben</span><strong data-result-total></strong></div>' +
          '<div class="result-tile"><span>Maximal möglich</span><strong data-result-max></strong></div>' +
        '<div class="result-tile"><span>Rundenzeit</span><strong data-result-duration></strong></div>' +
        '<div class="result-tile"><span>Beste Lichtserie</span><strong data-result-streak></strong></div>'
        : '<div class="result-tile"><span>Richtige Antworten</span><strong data-result-correct></strong></div>' +
          '<div class="result-tile"><span>Bearbeitete Aufgaben</span><strong data-result-total></strong></div>' +
        '<div class="result-tile"><span>Rundenzeit</span><strong data-result-duration></strong></div>' +
        '<div class="result-tile"><span>Beste Lichtserie</span><strong data-result-streak></strong></div>';
      var review = app.review.map(function (item, index) {
        var question = item.question;
        var status = item.correct ? '✓ richtig' : '• noch üben';
        return '<details class="review-item ' + (item.correct ? 'is-correct' : 'is-wrong') + '">' +
          '<summary>\\(' + (index + 1) + '\\) · ' + question.category + ' <span class="review-status">' + status + '</span></summary>' +
          '<div class="review-body"><p><strong>' + question.prompt + '</strong></p>' +
          '<p><strong>Deine Eingabe:</strong> ' + answerText(item) + '</p>' +
          '<p><strong>Passende Antwort:</strong> ' + correctAnswerText(question) + '</p>' +
          '<p>' + question.explanation + '</p></div></details>';
      }).join('');
      var leaderboardForm = app.mode === 'competition'
        ? '<section class="leaderboard-submit" aria-labelledby="submit-score-title"><div><span class="section-kicker">DEIN ERGEBNIS</span><h2 id="submit-score-title">Punkte mit anderen vergleichen</h2><p>Trage ein Kürzel ein. Bitte verwende keinen echten Namen.</p></div>' +
          '<label for="leaderboard-name">Dein Kürzel</label><div class="leaderboard-submit-row"><input id="leaderboard-name" type="text" maxlength="24" autocomplete="nickname" autocapitalize="off" data-leaderboard-name placeholder="z. B. Lichtblitz"><button class="primary-button" type="button" data-submit-leaderboard>In Rangliste eintragen</button></div>' +
          '<p class="leaderboard-status" data-leaderboard-submit-status role="status" aria-live="polite">Die Eintragung ist freiwillig.</p></section>'
        : '';
      setMarkup(shellHeader() +
        '<section class="hero" aria-labelledby="result-title"><p class="eyebrow"><span class="eyebrow-dot"></span>' +
        (app.mode === 'competition' ? 'Optik · Wettbewerbsrunde' : 'Optik · Übungsrunde') +
        '</p><h1 id="result-title">' + title + '</h1><p class="hero-copy">' + subtitle + '</p></section>' +
        '<section class="content-card"><div class="finish-hero"><div class="finish-orb"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.2 4.1L19.5 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div><h2>Dein Ergebnis</h2><p>' + (app.mode === 'competition' ? 'Ergebnisdaten kannst du an ein Wettbewerbsportal übertragen.' : 'Die Erklärungen helfen dir beim Wiederholen.') + '</p></div></div>' +
        '<div class="result-grid">' + tiles + '</div>' +
        leaderboardForm +
        '<div class="section-heading" style="margin:24px 0 10px"><div><h2>Antworten und Erklärungen</h2><p>Öffne eine Aufgabe, um deine Eingabe mit der passenden Lösung zu vergleichen.</p></div></div>' +
        '<div class="review-list">' + review + '</div>' +
        '<div class="finish-actions"><button class="primary-button" type="button" data-restart>Neue Runde</button><button class="secondary-button" type="button" data-home>Zur Startseite</button></div>' +
        '<p class="result-sent" data-result-sent aria-live="polite"></p></section>');
      if (app.mode === 'competition') {
        var pointsNode = container.querySelector('[data-result-points]');
        if (pointsNode) renderTeX(pointsNode, String(summary.points));
        var livesNode = container.querySelector('[data-result-lives]');
        if (livesNode) renderTeX(livesNode, String(summary.livesRemaining));
        var maxNode = container.querySelector('[data-result-max]');
        if (maxNode) renderTeX(maxNode, String(summary.maxPoints));
      }
      var correctNode = container.querySelector('[data-result-correct]');
      if (correctNode) renderTeX(correctNode, String(summary.correct) + '\\,/\\,' + String(summary.total));
      var totalNode = container.querySelector('[data-result-total]');
      if (totalNode) renderTeX(totalNode, String(summary.total));
      var durationNode = container.querySelector('[data-result-duration]');
      if (durationNode) renderTeX(durationNode, String(summary.durationSeconds) + '\\,\\mathrm{s}');
      var streakNode = container.querySelector('[data-result-streak]');
      if (streakNode) renderTeX(streakNode, String(summary.bestStreak));
      renderMath(container);
      sendResult(summary);
      bindLeaderboardSubmission(summary);
      var restartButton = container.querySelector('[data-restart]');
      if (restartButton) restartButton.addEventListener('click', function () { start(app.mode); });
      var homeButton = container.querySelector('[data-home]');
      if (homeButton) homeButton.addEventListener('click', function () {
        if (activeApp && activeApp === api) activeApp.destroy();
        if (container === root) {
          renderLanding();
        } else {
          renderLandingInto(container);
        }
      });
    }

    function start(mode) {
      stopTimer();
      var selectedMode = mode === undefined ? app.mode : mode;
      app.mode = selectedMode === 'competition' ? 'competition' : 'practice';
      var settings = cloudflareSettings();
      app.attemptId = app.configured.attemptId || params.get('attemptId') || createAttemptId();
      if (!app.configured.competitionId && settings) app.configured.competitionId = settings.competitionId;
      app.round = window.OptikQuizData.buildRound();
      if (app.round.length !== QUESTION_COUNT) {
        throw new Error('Der Fragenpool muss genau ' + QUESTION_COUNT + ' Aufgaben enthalten.');
      }
      app.index = 0;
      app.correct = 0;
      app.streak = 0;
      app.bestStreak = 0;
      app.points = 0;
      app.lives = STARTING_LIVES;
      app.review = [];
      app.startedAt = Date.now();
      app.finishedAt = 0;
      app.resultSent = false;
      app.result = null;
      renderQuestion();
      return app;
    }

    function destroy() {
      stopTimer();
      stopLeaderboardRefresh();
      container.replaceChildren();
      if (activeApp === api) activeApp = null;
    }

    var api = {
      start: start,
      destroy: destroy,
      getResult: function () { return app.result; },
      getState: function () {
        return {
          mode: app.mode,
          questionIndex: app.index,
          questionCount: app.round.length,
          correct: app.correct,
          streak: app.streak,
          bestStreak: app.bestStreak,
          points: app.points,
          lives: app.lives
        };
      }
    };

    if (!options.deferStart) start(app.mode);
    return api;
  }

  function renderLandingInto(target) {
    target.innerHTML = landingMarkup();
    renderMath(target);
    bindLandingDemo(target);
    var refreshButton = target.querySelector('[data-leaderboard-refresh]');
    if (refreshButton) refreshButton.addEventListener('click', function () { loadLeaderboard(target, refreshButton); });
    target.querySelectorAll('[data-start-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.getAttribute('data-start-mode') === 'competition') {
          window.location.href = 'competition.html';
          return;
        }
        if (activeApp) activeApp.destroy();
        stopLeaderboardRefresh();
        activeApp = createApplication(target, {
          mode: button.getAttribute('data-start-mode'),
          competitionId: params.get('competitionId') || (window.OptikQuizCloudflareConfig && window.OptikQuizCloudflareConfig.defaultCompetitionId) || null,
          attemptId: params.get('attemptId'),
          parentOrigin: params.get('parentOrigin')
        });
      });
    });
    startLeaderboardRefresh(target);
  }

  function renderLanding() {
    stopLeaderboardRefresh();
    if (activeApp && typeof activeApp.destroy === 'function') activeApp.destroy();
    activeApp = null;
    renderLandingInto(root);
  }

  function mount(container, options) {
    if (!container) throw new TypeError('OptikQuiz.mount benötigt ein Container-Element.');
    if (activeApp) activeApp.destroy();
    activeApp = createApplication(container, options || {});
    return activeApp;
  }

  window.OptikQuiz = Object.freeze({
    id: QUIZ_ID,
    version: '1.2.0',
    mount: mount
  });

  // Dieselben zugänglichen Bedienelemente für die serverseitig gewertete Runde.
  window.OptikQuizView = Object.freeze({questionMarkup:questionMarkup, quizTopMarkup:quizTopMarkup,
    renderMath:renderMath, renderTeX:renderTeX, attachDrawing:attachDrawing, parseAngle:parseAngle,
    shellHeader:shellHeader, escapeHtml:escapeHtml, renderLeaderboardEntries:renderLeaderboardEntries});

  function initialise() {
    if (document.body.dataset.hosted === 'true') return;
    if (params.get('mode') === 'competition') {
      window.location.replace('competition.html');
    } else {
      renderLanding();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
}());
