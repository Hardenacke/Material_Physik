import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAttempt, openQuestion, answer, view, selectQuestions } from '../src/spiel.mjs';
import { validateBank, validateConfig } from '../src/vertrag.mjs';
const load = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const bank = load('../fragenpools/optik-quiz-klasse-8.json');
const config = load('../wettkaempfe/physik-optik-klasse-8.json');
const now = Date.parse('2026-10-27T20:00:00Z');
function game(family) {
  const a = createAttempt(config, bank, 'person-1', 'Licht 01', now, { random: () => .5 });
  if (family) a.questions = [structuredClone(bank.questions.find(q => q.family === family))];
  openQuestion(a, now);
  return a;
}
test('ZIP-Quiz hat 15 unabhängige Familien, 3 Aufgabentypen und 39 Winkelvarianten', () => {
  assert.equal(validateConfig(config, bank), true);
  assert.equal(new Set(bank.questions.map(q => q.family)).size, 15);
  assert.equal(bank.questions.length, 39);
  assert.deepEqual(new Set(bank.questions.map(q => q.kind)), new Set(['single-choice', 'number', 'ray']));
  for (let i = 0; i < 50; i++) {
    const questions = selectQuestions(config, bank);
    assert.equal(questions.length, 15);
    assert.equal(new Set(questions.map(q => q.family)).size, 15);
    assert.ok(questions.slice(0, 6).every(q => q.interaction.category === 'Grundbegriffe'));
    assert.ok(questions.slice(6, 11).every(q => q.interaction.category === 'Reflexion'));
    assert.ok(questions.slice(11).every(q => q.interaction.category === 'Brechung'));
  }
});
test('Winkelwerte werden mit Toleranz auf dem Server gewertet', () => {
  for (const delta of [-.5, 0, .5, .51]) {
    const a = game('reflexionswinkel'), q = a.questions[0];
    answer(a, q.id, q.correct + delta, now + 1000);
    assert.equal(a.lastFeedback.correct, delta <= .5);
    assert.equal(a.score, delta <= .5 ? 196 : 0);
    assert.equal(a.lives, delta <= .5 ? 3 : 2);
  }
});
test('Strahlenreflexion hat eine Winkeltoleranz von fünf Grad', () => {
  for (const delta of [-5, 5, 5.01]) {
    const a = game('strahl-reflexion'), q = a.questions[0];
    answer(a, q.id, q.correct + delta, now + 2000);
    assert.equal(a.lastFeedback.correct, delta <= 5);
  }
});
test('Brechungszeichnung muss zum Lot laufen und die Grenztoleranz einhalten', () => {
  for (const value of [0, 10, 36.9, 37, 40, 70]) {
    const a = game('strahl-brechung'), q = a.questions[0];
    assert.equal(q.interaction.incidence, 40);
    answer(a, q.id, value, now + 1000);
    assert.equal(a.lastFeedback.correct, value > 0 && value < 37);
  }
});
test('Zahlenaufgaben weisen Strings, Objekte und ungültige Winkel ohne Wertung ab', () => {
  for (const value of ['15', { points: 3000 }, NaN, Infinity, -1, 91, true]) {
    const a = game('reflexionswinkel');
    assert.throws(() => answer(a, a.questions[0].id, value, now + 1000));
    assert.equal(a.score, 0); assert.equal(a.lives, 3); assert.equal(a.index, 0);
  }
});
test('öffentliche Winkelfrage verrät weder Lösung noch Toleranz oder künftige Fragen', () => {
  for (const family of ['reflexionswinkel', 'strahl-reflexion', 'strahl-brechung']) {
    const a = game(family), publicView = view(a, now);
    assert.equal(Object.hasOwn(publicView.attempt.question, 'correct'), false);
    assert.equal(Object.hasOwn(publicView.attempt.question, 'tolerance'), false);
    assert.equal(Object.hasOwn(publicView.attempt, 'questions'), false);
    assert.equal(Object.hasOwn(publicView.attempt, 'review'), false);
  }
});
test('Neuladen erhält Frist, Zahlenantwort und Nachbesprechung; Wiederholung zählt einmal', () => {
  let a = game('reflexionswinkel'), q = a.questions[0], deadline = a.current.deadline;
  a = JSON.parse(JSON.stringify(a));
  assert.equal(view(a, now + 1000).attempt.question.deadline, deadline);
  answer(a, q.id, q.correct, now + 1000);
  answer(a, q.id, q.correct, now + 2000);
  const result = view(a, now + 2000).attempt;
  assert.equal(result.score, 196); assert.equal(result.review.length, 1);
  assert.equal(result.review[0].given, q.correct);
  assert.equal(result.maxPoints, 200);
});
test('richtige Winkeleingabe auf der gespeicherten Frist zählt als Timeout', () => {
  const a = game('reflexionswinkel'), q = a.questions[0];
  answer(a, q.id, q.correct, a.current.deadline);
  assert.equal(a.score, 0); assert.equal(a.lives, 2); assert.equal(a.lastFeedback.timedOut, true);
});
test('unvollständige Interaktionen und ungeeignete Oberfläche werden abgewiesen', () => {
  const b = structuredClone(bank); delete b.questions.find(q => q.kind === 'ray').interaction.incidence;
  assert.throws(() => validateBank(b));
  const c = structuredClone(config); delete c.interface;
  assert.throws(() => validateConfig(c, bank));
});
