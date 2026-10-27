import { API_BASE } from '../config.js';

if (!window.OptikQuizView) await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
const view = window.OptikQuizView;
const root = document.getElementById('optik-quiz');
const params = new URLSearchParams(location.search);
const competitionId = params.get('competition') || 'physik-optik-klasse-8';
const group = params.get('group') || 'klasse-8-demo';
const html = view.escapeHtml;
const rich = parts => (parts || []).map(p => p.type === 'math' ? `\\(${html(p.value)}\\)` : html(p.value)).join('');
const baseFor = c => `competitions/${c.id}/versions/${c.version}/periods/${c.period.id}`;
let active = null;

function questionFor(q) {
  return { id: q.id, type: { 'single-choice': 'choice', number: 'number', ray: 'draw' }[q.kind],
    prompt: rich(q.prompt), options: q.choices.map(o => ({ id: o.id, text: rich(o.content) })), ...q.interaction };
}

function mount({ request, mutate, competition, alias = '', onExit }) {
  active?.destroy();
  let attempt = null, offset = 0, busy = false, disposed = false, drawing = null, rankingBusy = false;
  let pendingAnswer = null;
  const lifetime = new AbortController();
  const base = baseFor(competition);
  const message = value => { const target = root.querySelector('[data-message]'); if (target) target.textContent = value; };
  const sync = value => { if (value.serverNow) offset = value.serverNow - Date.now(); return value; };
  const controls = () => {
    root.querySelectorAll('button, input').forEach(b => { b.disabled = busy; });
    drawing?.setDisabled(busy);
  };
  async function run(action) {
    if (busy || disposed) return;
    busy = true; controls(); message('');
    try { await action(); }
    catch (error) {
      if (!disposed) {
        message(error.message || 'Verbindung unterbrochen. Bitte erneut versuchen.');
        if (error.status === 401) {
          dispose();
          if (onExit) onExit(); else login('Dein Zugang ist abgelaufen oder wurde gesperrt. Bitte erneut anmelden.');
        }
      }
    } finally { busy = false; if (!disposed) controls(); }
  }
  async function leaderboard() {
    if (rankingBusy || disposed) return;
    rankingBusy = true;
    try {
      const result = sync(await request(`${base}/leaderboard`));
      if (disposed) return;
      view.renderLeaderboardEntries(root.querySelector('[data-ranking]'), result.leaderboard.map(r => ({ ...r, displayName: r.alias })), 100);
      const note = root.querySelector('[data-ranking-note]');
      if (note) note.textContent = result.leaderboard.length ? 'Dein bester beendeter Versuch zählt. Gleiche Punkte teilen sich einen Platz.' : 'Noch kein beendeter Versuch. Du kannst den Anfang machen.';
    } catch (error) {
      const note = root.querySelector('[data-ranking-note]');
      if (note) note.textContent = 'Rangliste konnte nicht geladen werden. Bitte erneut aktualisieren.';
    } finally { rankingBusy = false; }
  }
  function header() {
    return `<div class="competition-header"><p class="eyebrow">KLASSE 8 · OPTIK-WETTBEWERB${alias ? ' · ' + html(alias) : ''}</p><button class="secondary-button" data-exit>Zur Wettbewerbsübersicht</button></div><p class="competition-message" data-message role="status" aria-live="polite"></p>`;
  }
  function rankingMarkup() {
    return '<section class="content-card competition-ranking"><div class="section-heading"><h2>Rangliste</h2><button class="secondary-button" data-refresh>Aktualisieren</button></div><p data-ranking-note role="status">Rangliste wird geladen …</p><ol data-ranking aria-label="Bestwerte im Optik-Wettbewerb"></ol></section>';
  }
  function reviewMarkup() {
    return (attempt.review || []).map((f, i) => {
      const q = questionFor(f.question);
      const correct = q.type === 'choice' ? q.options.find(o => o.id === f.correctAnswerId)?.text :
        q.diagram === 'refractionDraw' ? 'Zum Lot hin: ein Winkel größer als 0° und kleiner als ' + f.correctAnswerId + '°.' : f.correctAnswerId + '°';
      const given = f.timedOut ? 'Zeit abgelaufen' : f.given === null ? 'Übersprungen' : q.type === 'choice' ? q.options.find(o => o.id === f.given)?.text : f.given + '°';
      return `<details class="review-item ${f.correct ? 'is-correct' : 'is-wrong'}"><summary>${i + 1} · ${html(q.category)} · ${f.correct ? 'richtig' : 'noch üben'}</summary><div class="review-body"><p>${q.prompt}</p><p><strong>Deine Eingabe:</strong> ${given || 'Keine Eingabe'}</p><p><strong>Passende Antwort:</strong> ${correct}</p><p>${rich(f.explanation)}</p></div></details>`;
    }).join('');
  }
  function render(result) {
    if (disposed) return;
    sync(result); attempt = result.attempt; drawing = null;
    const q = attempt?.question;
    const finished = attempt?.phase === 'finished';
    let content;
    if (q) {
      const history = attempt.review || [];
      let streak = 0;
      for (let i = history.length - 1; i >= 0 && history[i].correct; i--) streak++;
      const state = { mode: 'competition', round: Array(attempt.totalQuestions), index: q.number - 1 };
      content = view.quizTopMarkup(state) + view.questionMarkup(state, questionFor(q));
      root.innerHTML = header() + content + rankingMarkup();
      view.renderTeX(root.querySelector('[data-stat="points"]'), String(attempt.score));
      view.renderTeX(root.querySelector('[data-stat="streak"]'), String(streak));
      const hearts = root.querySelector('[data-stat="lives"]');
      hearts.textContent = '♥'.repeat(attempt.lives) + '♡'.repeat(3 - attempt.lives);
      hearts.setAttribute('aria-label', attempt.lives + ' Leben verbleibend');
      root.querySelectorAll('[data-option]').forEach(b => b.addEventListener('click', () => submit(b.dataset.option)));
      const numeric = root.querySelector('#numeric-answer');
      if (numeric) {
        const send = () => {
          const angle = view.parseAngle(numeric.value);
          if (angle === null) { message('Bitte gib einen Winkel zwischen 0° und 90° ein.'); numeric.setAttribute('aria-invalid', 'true'); numeric.focus(); return; }
          numeric.removeAttribute('aria-invalid'); submit(angle);
        };
        root.querySelector('[data-submit-number]').addEventListener('click', send);
        numeric.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
      }
      if (q.kind === 'ray') {
        drawing = view.attachDrawing(root, questionFor(q), angle => {
          root.querySelector('[data-live-angle]').textContent = 'Dein Winkel: ' + Math.round(angle * 10) / 10 + '°';
        });
        root.querySelector('[data-submit-drawing]').addEventListener('click', () => submit(drawing.angle()));
      }
      // Navigation bleibt bewusst möglich; die Frist läuft serverseitig weiter.
      root.querySelector('[data-next]').hidden = true;
      tick();
    } else {
      const title = !attempt ? 'Bereit für Mission Optik?' : finished ? 'Dein Ergebnis' : 'Weiter geht’s';
      const text = !attempt ? `${competition.totalQuestions} Aufgaben · 3 Leben · 25 Sekunden pro Frage. Dein bester beendeter Versuch zählt.` :
        finished ? `${attempt.score} von ${attempt.maxPoints} Punkten · ${attempt.correctAnswers} richtige Antworten · ${attempt.answered} von ${attempt.totalQuestions} Aufgaben bearbeitet.` :
        'Die Uhr startet mit der nächsten Frage. Deine bisherigen Punkte bleiben gespeichert.';
      const feedback = attempt?.feedback;
      const feedbackMarkup = feedback ? `<div class="feedback is-visible ${feedback.correct ? 'is-correct' : 'is-wrong'}"><p class="feedback-title">${feedback.timedOut ? 'Die Zeit ist abgelaufen.' : feedback.correct ? 'Richtig · +' + feedback.awarded + ' Lichtpunkte' : 'Das war diesmal nicht richtig.'}</p><p>${rich(feedback.explanation)}</p></div>` : '';
      const endReason = finished ? { 'no-lives': 'Du hast alle drei Leben verbraucht.', 'duration-ended': 'Die Gesamtzeit ist abgelaufen.', 'closed': 'Der Wettbewerb wurde geschlossen.', 'all-questions': 'Du hast die Runde abgeschlossen.' }[attempt.finishReason] || 'Die Runde ist beendet.' : '';
      content = `<section class="hero"><p class="eyebrow">MISSION OPTIK</p><h1>${title}</h1><p class="hero-copy">${text}</p></section><section class="content-card">${feedbackMarkup}${finished ? `<p>${endReason} Dein Ergebnis wurde automatisch in der Rangliste berücksichtigt.</p><h2>Antworten und Erklärungen</h2>${reviewMarkup()}` : ''}<div class="competition-actions"><button class="primary-button" data-continue>${!attempt ? 'Wettbewerb starten' : finished ? 'Neue Runde starten' : 'Nächste Frage'}</button></div><p class="competition-status">${finished ? 'Zwischen zwei Versuchen liegen 30 Sekunden Pause.' : 'Eine geöffnete Frage läuft beim Verlassen der Seite weiter. Nach der Anmeldung kannst du deinen Versuch fortsetzen.'}</p></section>`;
      root.innerHTML = header() + content + rankingMarkup();
      root.querySelector('[data-continue]').addEventListener('click', () => run(async () => {
        if (!attempt || finished) render(await mutate(`${base}/attempts`, {}));
        if (attempt?.phase === 'waiting') render(await mutate(`${base}/attempts/${attempt.id}/next`, {}));
      }));
    }
    root.querySelectorAll('[data-exit]').forEach(button => button.addEventListener('click', () => {
      dispose();
      if (onExit) onExit(); else location.href = '../?group=' + encodeURIComponent(group);
    }));
    root.querySelector('[data-refresh]').addEventListener('click', leaderboard);
    view.renderMath(root); controls(); leaderboard();
  }
  function submit(value) {
    run(async () => {
      // Auch nach einem Netzfehler exakt dieselbe Antwort erneut übertragen.
      pendingAnswer ??= { questionId: attempt.question.id, answerId: value };
      const result = await mutate(`${base}/attempts/${attempt.id}/answer`, pendingAnswer);
      pendingAnswer = null;
      render(result);
    });
  }
  async function reload() {
    if (!attempt || disposed) return;
    const result = sync(await request(`${base}/attempts/${attempt.id}`));
    if (disposed) return;
    const changed = result.attempt.phase !== attempt.phase || result.attempt.answered !== attempt.answered || result.attempt.question?.id !== attempt.question?.id;
    if (changed) { pendingAnswer = null; render(result); }
  }
  function tick() {
    if (disposed || !attempt?.question) return;
    const seconds = Math.max(0, Math.ceil((attempt.question.deadline - Date.now() - offset) / 1000));
    const target = root.querySelector('[data-stat="time"]');
    if (target && target.dataset.seconds !== String(seconds)) { view.renderTeX(target, String(seconds) + '\\,\\mathrm{s}'); target.dataset.seconds = String(seconds); }
    root.querySelector('.stat-time')?.classList.toggle('is-low', seconds <= 5);
    if (!seconds && !busy && !document.hidden) run(reload);
  }
  function dispose() { disposed = true; clearInterval(timer); clearInterval(poll); lifetime.abort(); }
  const timer = setInterval(tick, 200);
  const poll = setInterval(() => { if (!document.hidden && !busy) run(async () => { await reload(); await leaderboard(); }); }, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(reload); }, { signal: lifetime.signal });
  window.addEventListener('pagehide', dispose, { signal: lifetime.signal });
  active = { destroy: dispose };
  root.innerHTML = header() + '<section class="content-card"><p>Dein Versuch wird geladen …</p><button class="primary-button" data-retry>Erneut versuchen</button></section>';
  const load = async () => { const result = await request(`${base}/attempts/current`); render(result); };
  root.querySelector('[data-retry]').addEventListener('click', () => run(load));
  run(load);
  return active;
}

function login(error = '') {
  root.innerHTML = view.shellHeader() + `<section class="hero"><p class="eyebrow">KLASSE 8 · WETTBEWERB</p><h1>Mission Optik</h1><p class="hero-copy">15 Aufgaben zu Licht, Reflexion und Brechung. Sammle Lichtpunkte und stelle dich der Challenge.</p></section><section class="content-card"><h2>Dein Zugang</h2><p>Gruppenkennung und persönlichen Code erhältst du von deiner Lehrkraft.</p><p class="competition-message" data-message role="status">${html(error)}</p><form class="competition-login"><label>Gruppe<input name="group" required maxlength="64" autocomplete="off" value="${html(group)}" pattern="[a-z0-9]+(-[a-z0-9]+)*"></label><label>Persönlicher Code<input name="code" type="password" required minlength="43" maxlength="43" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button class="primary-button" type="submit">Wettbewerb öffnen</button></form><p class="competition-status">Dein Zugang bleibt nur für diese geöffnete Seite gespeichert.</p><a href="index.html">Optik ohne Wertung üben</a></section>`;
  root.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(e.target), code = String(data.get('code')).trim();
    let pending = null;
    async function request(path, body, key) {
      const response = await fetch(`${API_BASE}/api/v1/${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${code}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Idempotency-Key': key }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
      if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Der Wettbewerbsserver ist gerade nicht erreichbar.');
      const result = await response.json();
      if (!response.ok) { const error = new Error(result.error || 'Anfrage fehlgeschlagen.'); error.status = response.status; throw error; }
      return result;
    }
    async function mutate(path, body) {
      const fingerprint = JSON.stringify([path, body]);
      if (pending && pending.fingerprint !== fingerprint) throw new Error('Bitte zuerst die ausstehende Antwort erneut senden.');
      pending ??= { fingerprint, key: crypto.randomUUID() };
      try { const result = await request(path, body, pending.key); pending = null; return result; }
      catch (error) { if (error.status) pending = null; throw error; }
    }
    const button = root.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const catalog = await request('catalog?groupId=' + encodeURIComponent(String(data.get('group')).trim()));
      const competition = catalog.competitions.find(c => c.id === competitionId && c.interface === 'optik-quiz');
      if (!competition) throw new Error('Für diese Gruppe ist das Optik-Quiz noch nicht freigegeben.');
      e.target.reset();
      mount({ request, mutate, competition, alias: catalog.alias });
    } catch (error) { root.querySelector('[data-message]').textContent = error.message; button.disabled = false; }
  });
}

window.OptikQuizCompetition = Object.freeze({ mount });
if (params.get('embedded') === '1' && window.parent !== window) {
  document.body.dataset.embedded = 'true';
} else login();
