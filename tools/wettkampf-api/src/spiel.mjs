// Ausführbare Referenzlogik. Persistenz, HTTP und Authentifizierung liegen im Adapter.
import { validateConfig } from './vertrag.mjs';
import { periodFor, availability } from './zeitraum.mjs';

export class RuleError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function secureRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
}
function shuffle(items, random) {
  const copy = structuredClone(items);
  for (let i = copy.length - 1; i > 0; i--) {
    const x = random();
    if (!(x >= 0 && x < 1)) throw new Error('Zufallsquelle außerhalb [0,1).');
    const j = Math.floor(x * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function selectQuestions(config, bank, random = secureRandom) {
  validateConfig(config, bank);
  const selected = [];
  // Eine Familie darf in dieser Referenzbank nur einer Stufe angehören.
  for (const [level, count] of Object.entries(config.selection.counts)) {
    const families = Map.groupBy(bank.questions.filter(q => q.difficulty === level), q => q.family);
    const chosen = shuffle([...families.keys()], random).slice(0, count);
    for (const family of chosen) {
      const variants = shuffle(families.get(family), random);
      selected.push(variants[0]);
    }
  }
  const ordered = config.selection.shuffleQuestions ? shuffle(selected, random) : selected;
  return ordered.map(q => ({...q, choices: config.selection.shuffleOptions ? shuffle(q.choices, random) : q.choices}));
}

export function pointsFor(elapsedMs, rules) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Ungültige Antwortzeit.');
  const duration = rules.questionTimeSeconds * 1000;
  if (elapsedMs >= duration) return 0;
  return rules.basePoints + Math.floor(rules.timeBonus * Math.max(0, Math.min(1, 1 - elapsedMs / duration)));
}

// Atomar im RoomState aufrufen: erst admission(), dann createAttempt(), dann speichern.
export function admission(config, attempts, participantId, now) {
  if (availability(config, now) !== 'open') throw new RuleError('CLOSED', 'Wettkampf ist nicht geöffnet.');
  const period = periodFor(config, now);
  const own = attempts.filter(a => a.participantId === participantId && a.periodId === period.id);
  const active = own.find(a => a.phase !== 'finished');
  if (active) return {kind: 'resume', attemptId: active.id};
  if (config.attempts.maxPerPeriod !== null && own.length >= config.attempts.maxPerPeriod)
    throw new RuleError('LIMIT', 'Die erlaubten Versuche sind ausgeschöpft.');
  const lastEnd = own.length ? Math.max(...own.map(a => a.endedAt)) : -Infinity;
  if (now < lastEnd + config.attempts.cooldownSeconds * 1000)
    throw new RuleError('COOLDOWN', 'Bitte bis zum nächsten Versuch kurz warten.');
  return {kind: 'new', periodId: period.id};
}

export function createAttempt(config, bank, participantId, alias, now, options = {}) {
  validateConfig(config, bank);
  if (availability(config, now) !== 'open') throw new RuleError('CLOSED', 'Wettkampf ist nicht geöffnet.');
  const period = periodFor(config, now);
  const durationEnd = now + config.attempts.maxDurationSeconds * 1000;
  const hardEnd = Math.min(durationEnd, period.endsAt ?? Infinity);
  return {
    id: options.id ?? crypto.randomUUID(), participantId, alias,
    subject: config.subject, competitionId: config.id, competitionVersion: config.version,
    periodId: period.id, bankId: bank.id, bankVersion: bank.version,
    rules: structuredClone(config.rules),
    questions: selectQuestions(config, bank, options.random),
    lives: config.rules.lives, score: 0, index: 0, correctAnswers: 0,
    phase: 'waiting', current: null, lastFeedback: null, startedAt: now, endedAt: null,
    hardEnd, hardEndReason: hardEnd === period.endsAt ? 'period-ended' : 'duration-ended',
    finishReason: null
  };
}

function end(attempt, now, reason) {
  attempt.phase = 'finished'; attempt.current = null;
  attempt.endedAt = now; attempt.finishReason = reason;
}

function resolve(attempt, answerId, now, timeout) {
  const q = attempt.questions[attempt.index];
  const correct = !timeout && answerId === q.correct;
  const awarded = correct ? pointsFor(now - attempt.current.startedAt, attempt.rules) : 0;
  attempt.score += awarded;
  if (correct) attempt.correctAnswers++; else attempt.lives--;
  attempt.index++;
  attempt.lastFeedback = {questionId: q.id, correct, timedOut: timeout, awarded,
    correctAnswerId: q.correct, explanation: q.explanation};
  attempt.current = null;
  if (attempt.lives === 0) end(attempt, now, 'no-lives');
  else if (attempt.index === attempt.questions.length) end(attempt, now, 'all-questions');
  else attempt.phase = 'waiting';
}

// Von jedem Request UND vom dauerhaften Alarm aus aufrufen; mehrfach aufrufbar.
export function settle(attempt, now) {
  if (attempt.phase === 'finished') return false;
  let changed = false;
  if (attempt.current && now >= attempt.current.deadline) {
    // Die Wirkung gehört zur gespeicherten Frist, auch wenn der Alarm später eintrifft.
    resolve(attempt, null, attempt.current.deadline, true); changed = true;
  }
  if (now >= attempt.hardEnd && attempt.phase !== 'finished') {
    end(attempt, attempt.hardEnd, attempt.hardEndReason); changed = true;
  }
  return changed;
}

export function openQuestion(attempt, now) {
  if (settle(attempt, now) || attempt.phase === 'finished' || attempt.current) return;
  attempt.phase = 'playing';
  attempt.current = {startedAt: now,
    deadline: Math.min(now + attempt.rules.questionTimeSeconds * 1000, attempt.hardEnd)};
}

export function answer(attempt, questionId, answerId, now) {
  settle(attempt, now);
  if (attempt.lastFeedback?.questionId === questionId) return; // nie doppelt werten
  if (attempt.phase === 'finished') throw new RuleError('FINISHED', 'Versuch ist beendet.');
  const q = attempt.questions[attempt.index];
  if (!attempt.current || q.id !== questionId) throw new RuleError('QUESTION', 'Frage ist nicht aktiv.');
  if (answerId !== null && !q.choices.some(x => x.id === answerId))
    throw new RuleError('ANSWER', 'Unbekannte Antwortoption.');
  resolve(attempt, answerId, now, false);
}

export function publicQuestion(q) {
  return {id:q.id, kind:q.kind, difficulty:q.difficulty,
    prompt:structuredClone(q.prompt), choices:structuredClone(q.choices),
    ...(q.figure ? {figure:structuredClone(q.figure)} : {})};
}

export function summary(a) {
  return {id:a.id, participantId:a.participantId, alias:a.alias,
    subject:a.subject, competitionId:a.competitionId, competitionVersion:a.competitionVersion,
    periodId:a.periodId, score:a.score, maxPoints:a.questions.length*(a.rules.basePoints+a.rules.timeBonus),
    lives:a.lives, answered:a.index, totalQuestions:a.questions.length, correctAnswers:a.correctAnswers,
    phase:a.phase, startedAt:a.startedAt, endedAt:a.endedAt, finishReason:a.finishReason};
}

export function view(a, now) {
  const {participantId, ...own} = summary(a);
  return {serverNow:now, rules:structuredClone(a.rules), attempt:{...own, hardEnd:a.hardEnd,
    question:a.current ? {...publicQuestion(a.questions[a.index]), ...a.current, number:a.index+1} : null,
    feedback:!a.current && a.lastFeedback ? structuredClone(a.lastFeedback) : null}};
}

export function bestLeaderboard(attempts) {
  const done = attempts.filter(a => a.phase === 'finished');
  const scopes = new Set(done.map(a => `${a.subject}/${a.competitionId}/v${a.competitionVersion}/${a.periodId}`));
  if (scopes.size > 1) throw new RuleError('MIXED_SCOPE', 'Verschiedene Wertungen dürfen nicht vermischt werden.');
  const best = new Map();
  for (const a of done) {
    const previous = best.get(a.participantId);
    if (!previous || a.score > previous.score || (a.score === previous.score && a.endedAt < previous.endedAt))
      best.set(a.participantId, a);
  }
  const sorted = [...best.values()].sort((a,b) => b.score-a.score || a.alias.localeCompare(b.alias,'de') || a.participantId.localeCompare(b.participantId));
  let lastScore, rank=0;
  return sorted.map((a,i) => {
    if(a.score !== lastScore) rank=i+1;
    lastScore=a.score;
    return {rank, alias:a.alias, score:a.score, maxPoints:a.maxPoints, endedAt:a.endedAt};
  });
}
