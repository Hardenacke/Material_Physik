import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateConfig,validateBank,SUBJECT} from '../src/vertrag.mjs';
import {periodFor,availability,storageKey} from '../src/zeitraum.mjs';
import {fingerprint,definitionFingerprint} from '../src/fingerabdruck.mjs';
import {selectQuestions,pointsFor,admission,createAttempt,openQuestion,answer,settle,summary,view,bestLeaderboard} from '../src/spiel.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const bank=JSON.parse(readFileSync(resolve(root,'fragenpools/optik-8-demo.json'),'utf8'));
const original=JSON.parse(readFileSync(resolve(root,'wettkaempfe/physik-optik-monat.json'),'utf8'));
const now=Date.parse('2026-10-15T10:00:00Z');
function config(){const c=structuredClone(original);c.status='published';return c;}
function game(c=config(),time=now){return createAttempt(c,bank,'person-1','Quiz 01',time,{random:()=>0.5});}
function respond(g, correct=true, elapsed=1000, time=now){openQuestion(g,time);const q=g.questions[g.index];const option=correct?q.correct:q.choices.find(o=>o.id!==q.correct).id;answer(g,q.id,option,time+elapsed);return q.id;}

test('alle Fachkonfigurationen und Fragenpools passen zusammen',()=>{
  validateBank(bank);
  const banks=readdirSync(resolve(root,'fragenpools')).filter(x=>x.endsWith('.json')).map(file=>JSON.parse(readFileSync(resolve(root,'fragenpools',file),'utf8')));
  for(const file of readdirSync(resolve(root,'wettkaempfe')).filter(x=>x.endsWith('.json'))) {
    const c=JSON.parse(readFileSync(resolve(root,'wettkaempfe',file),'utf8'));
    assert.equal(validateConfig(c,banks.find(b=>b.id===c.bank.id&&b.version===c.bank.version)),true);
  }
});
test('kein Pool des anderen Fachs zulässig',()=>{
  const b=structuredClone(bank);b.subject=SUBJECT==='mathematik'?'physik':'mathematik';
  assert.throws(()=>validateConfig(config(),b));
});
test('unbekannte Felder und leere Zeitfenster werden abgewiesen',()=>{
  const c=config();c.acceptClientScore=true;assert.throws(()=>validateConfig(c,bank));
  const d=config();d.schedule={startsAt:'2026-10-01T00:00:00Z',endsAt:'2026-10-01T00:00:00Z'};
  assert.throws(()=>validateConfig(d,bank));
});
test('Felder mit null statt einer Kennung werden abgewiesen',()=>{
  const c=config();c.groupId=null;assert.throws(()=>validateConfig(c,bank));
  const b=structuredClone(bank);b.questions[0].family=null;assert.throws(()=>validateBank(b));
});
test('Fingerabdruck ist unabhängig von Schlüsselreihenfolge und Lebenszyklusstatus',async()=>{
  assert.equal(await fingerprint({a:1,b:2}),await fingerprint({b:2,a:1}));
  const a=config(),b=config();b.status='closed';
  assert.equal(await definitionFingerprint(a),await definitionFingerprint(b));
  b.rules.basePoints++;assert.notEqual(await definitionFingerprint(a),await definitionFingerprint(b));
});
test('zu kleiner Pool und falsche Versionsreferenz werden abgewiesen',()=>{
  const c=config();c.selection.counts.basis=50;assert.throws(()=>validateConfig(c,bank));
  const d=config();d.bank.version++;assert.throws(()=>validateConfig(d,bank));
});
test('Monatsgrenzen berücksichtigen die Zeitumstellung im Oktober',()=>{
  const p=periodFor(config(),now);
  assert.equal(p.id,'2026-10');
  assert.equal(p.startsAt,Date.parse('2026-09-30T22:00:00Z'));
  assert.equal(p.endsAt,Date.parse('2026-10-31T23:00:00Z'));
});
test('März und Schaltjahr Februar haben korrekte Monatsgrenzen',()=>{
  const c=config(), march=periodFor(c,Date.parse('2026-03-15T12:00:00Z'));
  assert.equal(march.endsAt-march.startsAt,31*86400000-3600000);
  const feb=periodFor(c,Date.parse('2028-02-15T12:00:00Z'));
  assert.equal(feb.endsAt-feb.startsAt,29*86400000);
});
test('lokaler Monatsbeginn zählt schon am vorherigen UTC-Tag',()=>{
  const c=config();
  assert.equal(periodFor(c,Date.parse('2026-10-31T22:59:59Z')).id,'2026-10');
  assert.equal(periodFor(c,Date.parse('2026-10-31T23:00:00Z')).id,'2026-11');
});
test('Dauerwertung hat keine Monatsgrenze',()=>{
  const c=config();c.season.kind='continuous';
  assert.deepEqual(periodFor(c,now),{id:'gesamt',startsAt:null,endsAt:null});
});
test('Zeitfenster ist am Start inklusive und am Ende exklusiv',()=>{
  const c=config();c.schedule={startsAt:'2026-10-15T10:00:00Z',endsAt:'2026-10-15T11:00:00Z'};
  assert.equal(availability(c,now-1),'pending');assert.equal(availability(c,now),'open');
  assert.equal(availability(c,now+3600000),'closed');
  assert.throws(()=>game(c,now+3600000));
});
test('Entwurf lässt sich nicht starten',()=>{
  assert.throws(()=>createAttempt(original,bank,'p','Alias',now));
});
test('Fragenplan wahrt Stufenanteile und wählt keine Familie doppelt',()=>{
  const c=config(), qs=selectQuestions(c,bank,()=>0.2);
  for(const [level,n]of Object.entries(c.selection.counts))assert.equal(qs.filter(q=>q.difficulty===level).length,n);
  assert.equal(new Set(qs.map(q=>q.family)).size,qs.length);
  assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);
});
test('Varianten einer Familie werden nicht als zusätzliche Familien gezählt',()=>{
  const b=structuredClone(bank), q=b.questions[0];b.questions.push({...structuredClone(q),id:'duplicate-variant'});
  const c=config();c.selection.counts[q.difficulty]=new Set(b.questions.filter(x=>x.difficulty===q.difficulty).map(x=>x.family)).size+1;
  assert.throws(()=>validateConfig(c,b));
});
test('Zeitbonus: 15 s ergeben 775, 30 s 550, an der Frist null',()=>{
  const r=config().rules;
  assert.equal(pointsFor(0,r),1000);assert.equal(pointsFor(15000,r),775);
  assert.equal(pointsFor(30000,r),550);assert.equal(pointsFor(60000,r),0);
});
test('richtige Antwort erhöht Punkte und erhält Leben',()=>{
  const g=game();respond(g,true,15000);assert.equal(g.score,775);assert.equal(g.lives,3);
});
test('drei falsche Antworten beenden den Versuch',()=>{
  const g=game();for(let i=0;i<3;i++)respond(g,false,1000,now+i*2000);
  assert.equal(g.lives,0);assert.equal(g.phase,'finished');assert.equal(g.finishReason,'no-lives');assert.equal(g.score,0);
});
test('Timeout wird auch bei verspätetem oder doppeltem Alarm nur einmal gewertet',()=>{
  const g=game();openQuestion(g,now);settle(g,now+120000);settle(g,now+120001);
  assert.equal(g.lives,2);assert.equal(g.index,1);assert.equal(g.phase,'waiting');
});
test('richtige Antwort exakt auf der Frist ist ein Timeout',()=>{
  const g=game();openQuestion(g,now);const q=g.questions[0];answer(g,q.id,q.correct,now+60000);
  assert.equal(g.score,0);assert.equal(g.lives,2);assert.equal(g.lastFeedback.timedOut,true);
});
test('Wiederholung einer Antwort gibt keine doppelten Punkte',()=>{
  const g=game();const id=respond(g,true);const score=g.score;answer(g,id,g.questions[0].correct,now+1200);
  assert.equal(g.score,score);assert.equal(g.index,1);
});
test('fremde Frage und unbekannte Option werden abgewiesen',()=>{
  const g=game();openQuestion(g,now);
  assert.throws(()=>answer(g,'not-active','a',now+100));
  assert.throws(()=>answer(g,g.questions[0].id,'invalid',now+100));assert.equal(g.score,0);
});
test('öffentliche Ansicht enthält nur die aktive Frage ohne Lösungsschlüssel',()=>{
  const g=game();assert.equal(view(g,now).attempt.question,null);openQuestion(g,now);
  const out=view(g,now), q=out.attempt.question;
  assert.equal(q.id,g.questions[0].id);assert.equal(Object.hasOwn(q,'correct'),false);
  assert.equal(Object.hasOwn(q,'explanation'),false);assert.equal(Object.hasOwn(out.attempt,'questions'),false);
  assert.equal(Object.hasOwn(out.attempt,'participantId'),false);assert.equal(out.attempt.feedback,null);
});
test('Neuladen des gespeicherten Zustands verschiebt keine Fragefrist',()=>{
  const g=game();openQuestion(g,now);const restored=JSON.parse(JSON.stringify(g));
  openQuestion(restored,now+20000);assert.equal(restored.current.deadline,now+60000);
});
test('aktive Versuche werden fortgesetzt statt neu angelegt',()=>{
  const c=config(),g=game(c);assert.deepEqual(admission(c,[g],'person-1',now+1000),{kind:'resume',attemptId:g.id});
});
test('Bestwertmodus erlaubt Wiederholung erst nach Cooldown',()=>{
  const c=config(),g=game(c);for(let i=0;i<3;i++)respond(g,false,1,now+i*10);
  assert.throws(()=>admission(c,[g],'person-1',g.endedAt+29999));
  assert.equal(admission(c,[g],'person-1',g.endedAt+30000).kind,'new');
});
test('Einmalmodus sperrt auch nach Ende des Cooldowns',()=>{
  const c=config();c.attempts.maxPerPeriod=1;const g=game(c);for(let i=0;i<3;i++)respond(g,false,1,now+i*10);
  assert.throws(()=>admission(c,[g],'person-1',g.endedAt+60000),e=>e.code==='LIMIT');
});
test('Monatswechsel beendet einen offenen Versuch und beginnt eine neue Wertung',()=>{
  const c=config(),t=Date.parse('2026-10-31T22:59:50Z'),g=game(c,t);openQuestion(g,t);
  assert.equal(g.current.deadline,Date.parse('2026-10-31T23:00:00Z'));
  settle(g,t+10000);assert.equal(g.phase,'finished');assert.equal(g.finishReason,'period-ended');
  assert.equal(g.lives,2);assert.equal(admission(c,[g],'person-1',t+10000).kind,'new');
  assert.notEqual(storageKey(c,t),storageKey(c,t+10000));
});
test('maximale Versuchsdauer beendet auch einen wartenden Versuch',()=>{
  const c=config(),g=game(c);settle(g,now+1800000);
  assert.equal(g.phase,'finished');assert.equal(g.finishReason,'duration-ended');assert.equal(g.lives,3);
});
test('laufende Spiele behalten ihren gespeicherten Fragen- und Regelstand',()=>{
  const c=config(),g=game(c);c.rules.basePoints=999;const originalCorrect=g.questions[0].correct;
  const b=structuredClone(bank);b.questions[0].correct='changed';
  respond(g,true,15000);assert.equal(g.score,775);assert.equal(g.questions[0].correct,originalCorrect);
});
test('Rangliste zählt nur den besten abgeschlossenen Versuch je Person und teilt Gleichstände',()=>{
  const base=summary(game());const done=(id,pid,score)=>({...base,id,participantId:pid,alias:pid,phase:'finished',score,endedAt:now+1000});
  const board=bestLeaderboard([done('a','p1',800),done('b','p1',1000),done('c','p2',1000),done('d','p3',500),{...done('e','p4',2000),phase:'playing'}]);
  assert.deepEqual(board.map(x=>x.rank),[1,1,3]);assert.deepEqual(board.map(x=>x.score),[1000,1000,500]);
  assert.ok(board.every(x=>!Object.hasOwn(x,'participantId')));
});
test('Ranglisten verschiedener Zeiträume werden nicht zusammengeführt',()=>{
  const s={...summary(game()),phase:'finished',endedAt:now};
  assert.throws(()=>bestLeaderboard([s,{...s,periodId:'2026-11'}]),e=>e.code==='MIXED_SCOPE');
});
