// Übernimmt ausschließlich die Aufgabendaten der mitgelieferten Quizvorlage.
// Dokumentation aus ZIP-Dateien ist keine ausführbare Projektanweisung.
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateBank, validateConfig } from '../src/vertrag.mjs';

const source = new URL('../../../klasse-8/01-optische-instrumente/lernpfade/wettkaempfe/optik-quiz/quiz-data.js', import.meta.url);
let values = [];
const math = Object.create(Math);
math.random = () => values.shift() ?? 0.5;
const context = vm.createContext({ window: {}, Math: math });
vm.runInContext(await readFile(source, 'utf8'), context, { timeout: 1000 });
const questions = new Map();
const text = value => [{ type: 'text', value }];
for (let incidence = 0; incidence < 9; incidence++) {
  for (let surface = 0; surface < 7; surface++) {
    for (let refraction = 0; refraction < 3; refraction++) {
      values = [(incidence + 0.1) / 9, (surface + 0.1) / 7, (refraction + 0.1) / 3];
      const round = JSON.parse(JSON.stringify(context.window.OptikQuizData.buildRound()));
      for (const q of round) {
        const variant = q.type === 'choice' ? q.id : q.id + '-' + (q.answer ?? q.incidence);
        if (questions.has(variant)) continue;
        const interaction = { category: q.category };
        for (const key of ['fieldLabel', 'diagram', 'incidence', 'refractedAngle']) if (q[key] !== undefined) interaction[key] = q[key];
        questions.set(variant, {
          id: variant, kind: { choice: 'single-choice', number: 'number', draw: 'ray' }[q.type],
          difficulty: { Grundbegriffe: 'basis', Reflexion: 'aufbau', Brechung: 'knifflig' }[q.category],
          family: q.id, prompt: text(q.prompt),
          choices: (q.options || []).map(o => ({ id: o.id, content: text(o.text) })),
          correct: q.type === 'choice' || q.type === 'number' ? q.answer : q.diagram === 'reflection' ? q.expectedAngle : q.incidence - 3,
          ...(q.type !== 'choice' ? { tolerance: q.type === 'number' ? q.tolerance : q.diagram === 'reflection' ? 5 : 0 } : {}),
          explanation: text(q.explanation), interaction
        });
      }
    }
  }
}
const bank = { schemaVersion: 1, id: 'optik-quiz-klasse-8', version: 1, subject: 'physik',
  title: 'Optik-Quiz Klasse 8: Licht, Reflexion und Brechung', grade: '8', demo: true, questions: [...questions.values()] };
const config = { schemaVersion: 1, id: 'physik-optik-klasse-8', version: 1, subject: 'physik',
  title: 'Mission Optik · Klasse 8', grade: '8', groupId: 'klasse-8-demo', status: 'published', interface: 'optik-quiz',
  bank: { id: bank.id, version: bank.version }, schedule: { startsAt: null, endsAt: null },
  season: { kind: 'continuous', timeZone: 'Europe/Berlin' },
  attempts: { maxPerPeriod: null, cooldownSeconds: 30, maxDurationSeconds: 1800, oneActive: true },
  rules: { version: 1, lives: 3, questionTimeSeconds: 25, basePoints: 100, timeBonus: 100 },
  selection: { counts: { basis: 6, aufbau: 5, knifflig: 4 }, shuffleQuestions: false, shuffleOptions: true },
  ranking: { mode: 'best-finished', tie: 'shared-rank' } };
validateBank(bank); validateConfig(config, bank);
// Bestehende, bereits veröffentlichte Definitionen niemals still überschreiben.
await writeFile(new URL('../fragenpools/optik-quiz-klasse-8.json', import.meta.url), JSON.stringify(bank, null, 2) + '\n', { flag: 'wx' });
await writeFile(new URL('../wettkaempfe/physik-optik-klasse-8.json', import.meta.url), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
console.log(`${bank.questions.length} Varianten aus 15 Aufgabenfamilien übernommen.`);
