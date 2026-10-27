import { API_BASE } from './config.js';
const $ = id => document.getElementById(id);
const state = { code: '', group: '', competition: null, attempt: null, busy: false, offset: 0, pollDelay: 5000, timer: null, poll: null, expiryLoading: false, generation: 0, pending: null };
const message = text => { $('message').textContent = text; };
const formatDate = value => value === null ? 'offen' : new Date(value).toLocaleString('de-DE');
function segments(parts) {
  const fragment = document.createDocumentFragment();
  for (const p of parts || []) { const span = document.createElement('span'); span.textContent = p.value; if (p.type === 'math') span.className = 'math'; fragment.append(span); }
  return fragment;
}
async function api(path, body, pending) {
  const response = await fetch(`${API_BASE}/api/v1/${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${state.code}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Idempotency-Key': pending.key }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Die Challenge ist hier noch nicht verbunden. Bitte verwende den Link deiner Lehrkraft.');
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 401) logout();
    const error = new Error(value.error || 'Die Anfrage konnte nicht ausgeführt werden.'); error.status = response.status; throw error;
  }
  if (value.serverNow) state.offset = value.serverNow - Date.now();
  return value;
}
function base() { const c = state.competition; return `competitions/${c.id}/versions/${c.version}/periods/${c.period.id}`; }
function controls() {
  document.querySelectorAll('button, #login input').forEach(b => { b.disabled = state.busy; });
}
async function run(action) {
  if (state.busy) return;
  state.busy = true; controls(); message('');
  try { await action(); } catch (e) { message(e.message); }
  finally { state.busy = false; controls(); }
}
async function mutate(path, body) {
  const fingerprint = JSON.stringify([path, body]);
  if (!state.pending || state.pending.fingerprint !== fingerprint) state.pending = { fingerprint, key: crypto.randomUUID() };
  try {
    const value = await api(path, body, state.pending); state.pending = null; return value;
  } catch (error) { if (error.status) state.pending = null; throw error; }
}
async function catalog() {
  const value = await api(`catalog?groupId=${encodeURIComponent(state.group)}`);
  $('greeting').textContent = `Hallo ${value.alias}. Wähle deine Challenge.`;
  $('competitions').replaceChildren();
  const requested = new URL(location.href).searchParams.get('competition');
  for (const c of value.competitions) {
    const button = document.createElement('button'); button.className = 'competition'; button.dataset.key = `${c.id}/${c.version}`; button.setAttribute('aria-pressed', String(state.competition?.id === c.id && state.competition?.version === c.version));
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = c.season.kind === 'calendar-month' ? 'Monatschallenge' : c.schedule.endsAt ? 'Klassenwettbewerb' : 'Dauerchallenge';
    const title = document.createElement('strong'); title.textContent = c.title;
    const detail = document.createElement('span'); detail.textContent = `${c.totalQuestions} Fragen · Klasse ${c.grade}${c.demo ? ' · Demo' : ''}`;
    button.append(badge, title, detail); button.addEventListener('click', () => run(() => select(c))); $('competitions').append(button);
  }
  if (!value.competitions.length) message('Für deine Gruppe ist noch keine Challenge freigegeben.');
  return value.competitions.find(c => c.id === (state.competition?.id || requested)) || null;
}
async function select(c) {
  state.generation++; state.competition = c; state.attempt = null; state.pending = null;
  $('arena').hidden = false; $('scope').textContent = `KLASSE ${c.grade} · ${c.period.id === 'gesamt' ? 'GESAMTWERTUNG' : c.period.id}`;
  $('game-title').textContent = c.title;
  $('rules').textContent = `${c.totalQuestions} Fragen · ${c.rules.questionTimeSeconds} Sekunden pro Frage · ${c.rules.lives} Leben. ${c.availability === 'pending' ? `Beginn: ${formatDate(c.schedule.startsAt)}.` : c.availability === 'closed' ? 'Dieser Wettbewerb ist geschlossen.' : 'Dein bester beendeter Versuch zählt.'}`;
  $('period-label').textContent = c.period.id === 'gesamt' ? 'Gesamtwertung' : `Monat ${c.period.id}`;
  document.querySelectorAll('.competition').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.key === `${c.id}/${c.version}`)));
  render(await api(`${base()}/attempts/current`)); await leaderboard();
  clearTimeout(state.poll); state.poll = setTimeout(poll, 5000);
}
function render(value) {
  state.attempt = value.attempt; const a = value.attempt;
  $('score').textContent = a?.score || 0; $('lives').textContent = a?.lives ?? state.competition.rules.lives;
  $('progress').textContent = `${a?.answered || 0}/${a?.totalQuestions || state.competition.totalQuestions}`;
  $('question').replaceChildren(); $('feedback').replaceChildren();
  $('start').hidden = !!a && a.phase !== 'finished'; $('next').hidden = !a || a.phase !== 'waiting'; $('skip').hidden = !a?.question;
  if (!a) { $('question').textContent = 'Starte einen Versuch, wenn du bereit bist.'; return; }
  if (a.phase === 'finished') { $('question').textContent = `Geschafft! Du hast ${a.score} von ${a.maxPoints} möglichen Punkten erreicht.`; $('start').textContent = 'Neuen Versuch starten'; }
  else if (!a.question) $('question').textContent = 'Bereit für die nächste Frage? Die Zeit beginnt erst beim Öffnen.';
  if (a.question) {
    const q = a.question; const heading = document.createElement('h3'); heading.append(segments(q.prompt)); $('question').append(heading);
    if (q.figure) { const img = document.createElement('img'); img.src = q.figure.src; img.alt = q.figure.alt; $('question').append(img); }
    const answers = document.createElement('div'); answers.className = 'answers';
    for (const choice of q.choices) { const button = document.createElement('button'); button.className = 'answer'; button.append(segments(choice.content)); button.onclick = () => respond(choice.id); answers.append(button); }
    $('question').append(answers);
  }
  if (a.feedback) {
    const label = document.createElement('strong'); label.textContent = a.feedback.correct ? `Richtig! +${a.feedback.awarded} Punkte. ` : a.feedback.timedOut ? 'Die Zeit ist abgelaufen. Ein Leben weniger. ' : 'Ein Leben weniger. ';
    $('feedback').append(label, segments(a.feedback.explanation));
  }
  tick(); controls();
}
async function leaderboard() {
  const generation = state.generation; const value = await api(`${base()}/leaderboard`);
  if (generation !== state.generation) return;
  $('ranking').replaceChildren();
  for (const row of value.leaderboard) {
    const tr = document.createElement('tr');
    for (const text of [row.rank, row.alias, row.score]) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
    $('ranking').append(tr);
  }
  $('ranking-note').textContent = value.leaderboard.length ? 'Gleiche Punktzahl? Ihr teilt euch den Platz.' : 'Noch kein abgeschlossener Versuch. Du kannst den Anfang machen.';
}
function respond(answerId) {
  run(async () => { const q = state.attempt.question; render(await mutate(`${base()}/attempts/${state.attempt.id}/answer`, { questionId: q.id, answerId })); await leaderboard(); });
}
function tick() {
  const a = state.attempt; if (!a) { $('timer').textContent = '–'; return; }
  const deadline = a.question?.deadline ?? (a.phase !== 'finished' ? a.hardEnd : null);
  if (!deadline) { $('timer').textContent = '–'; return; }
  const seconds = Math.max(0, Math.ceil((deadline - Date.now() - state.offset) / 1000));
  $('timer').textContent = a.question ? `${seconds} s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (!seconds && !state.busy && !state.expiryLoading && !document.hidden) {
    state.expiryLoading = true;
    run(async () => { try { render(await api(`${base()}/attempts/${a.id}`)); } finally { setTimeout(() => { state.expiryLoading = false; }, 1500); } });
  }
}
function logout() {
  state.generation++; state.code = ''; state.group = ''; state.competition = null; state.attempt = null; state.pending = null;
  clearTimeout(state.poll); $('portal').hidden = true; $('login-panel').hidden = false; $('logout').hidden = true; $('login').elements.code.value = '';
}
async function poll() {
  if (document.hidden || !state.competition) return;
  try {
    if (!state.busy) {
      const generation = state.generation;
      const current = await api(`competitions/${state.competition.id}/versions/${state.competition.version}`);
      if (generation !== state.generation) return;
      if (current.competition.period.id !== state.competition.period.id) { await run(() => select(current.competition)); message('Ein neuer Wertungszeitraum hat begonnen.'); }
      else if (state.attempt && state.attempt.phase !== 'finished') { const value = await api(`${base()}/attempts/${state.attempt.id}`); if (!state.busy && generation === state.generation) render(value); }
      await leaderboard(); state.pollDelay = 5000;
    }
  } catch (error) { message(error.message); state.pollDelay = Math.min(60000, state.pollDelay * 2); }
  if (state.code && !document.hidden) state.poll = setTimeout(poll, state.pollDelay);
}
$('login').onsubmit = event => { event.preventDefault();
  const data = new FormData(event.target); const group = data.get('group').trim(); const code = data.get('code').trim();
  run(async () => {
  state.group = group; state.code = code;
  const selected = await catalog(); $('login-panel').hidden = true; $('portal').hidden = false; $('logout').hidden = false;
  if (selected) await select(selected); clearTimeout(state.poll); state.poll = setTimeout(poll, 5000);
}); };
$('logout').onclick = logout;
$('refresh').onclick = () => run(async () => { const c = await catalog(); if (c) await select(c); });
$('start').onclick = () => run(async () => { render(await mutate(`${base()}/attempts`, {})); });
$('next').onclick = () => run(async () => { render(await mutate(`${base()}/attempts/${state.attempt.id}/next`, {})); });
$('skip').onclick = () => respond(null);
document.addEventListener('visibilitychange', () => { clearTimeout(state.poll); if (!document.hidden && state.code) poll(); });
state.timer = setInterval(tick, 250);
