export const SUBJECT = 'physik';
const levels=['basis','aufbau','knifflig'];
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isSlug=x=>typeof x==='string'&&slug.test(x);
function requireThat(ok, message) { if(!ok) throw new Error(message); }
function exact(obj, keys, where) {
  requireThat(obj && typeof obj==='object' && !Array.isArray(obj), `${where}: Objekt erwartet.`);
  requireThat(Object.keys(obj).every(k=>keys.includes(k)) && keys.every(k=>Object.hasOwn(obj,k)), `${where}: Felder passen nicht zum Vertrag.`);
}
function integer(n,min,max) { return Number.isInteger(n)&&n>=min&&n<=max; }
function dateOrNull(x) {return x===null || (typeof x==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().replace('.000Z','Z')===x.replace('.000Z','Z'));}
function rich(value) {
  requireThat(Array.isArray(value)&&value.length>0, 'Inhalt: Segmente fehlen.');
  for(const p of value) {exact(p,['type','value'],'Segment'); requireThat(['text','math'].includes(p.type)&&typeof p.value==='string'&&p.value.length>0,'Ungültiges Inhaltssegment.');}
}

export function validateBank(bank) {
  exact(bank,['schemaVersion','id','version','subject','title','grade','demo','questions'],'Fragenpool');
  requireThat(bank.schemaVersion===1 && bank.subject===SUBJECT && isSlug(bank.id) && integer(bank.version,1,100000),'Ungültige Poolkennung.');
  requireThat(typeof bank.title==='string'&&bank.title.length>0&&typeof bank.grade==='string'&&bank.grade.length>0&&typeof bank.demo==='boolean','Poolmetadaten fehlen.');
  requireThat(Array.isArray(bank.questions)&&bank.questions.length>0,'Fragenpool ist leer.');
  const ids=new Set(), families=new Map();
  for(const q of bank.questions) {
    const required=['id','kind','difficulty','family','prompt','choices','correct','explanation'];
    const optional = ['figure','interaction','tolerance'].filter(k=>Object.hasOwn(q,k));
    exact(q,[...required,...optional],'Frage');
    requireThat(isSlug(q.id)&&!ids.has(q.id),'Fragen-ID fehlt oder ist doppelt.');ids.add(q.id);
    requireThat(['single-choice','number','ray'].includes(q.kind) && levels.includes(q.difficulty)&&isSlug(q.family),'Fragentyp oder Stufe ungültig.');
    requireThat(!families.has(q.family)||families.get(q.family)===q.difficulty,'Eine Fragenfamilie muss zu genau einer Stufe gehören.');families.set(q.family,q.difficulty);
    rich(q.prompt);rich(q.explanation);
    requireThat(Array.isArray(q.choices)&&(q.kind==='single-choice' ? q.choices.length>=2&&q.choices.length<=6 : q.choices.length===0),'Antwortoptionen passen nicht zum Fragentyp.');
    const choices=new Set();
    for(const choice of q.choices) {
      exact(choice,['id','content'],'Option');
      requireThat(isSlug(choice.id)&&!choices.has(choice.id),'Options-ID fehlt oder ist doppelt.');choices.add(choice.id);rich(choice.content);
    }
    if(q.kind==='single-choice') requireThat(choices.has(q.correct)&&!Object.hasOwn(q,'tolerance'),'Die richtige Option fehlt.');
    else requireThat(Number.isFinite(q.correct)&&q.correct>=0&&q.correct<=90&&Number.isFinite(q.tolerance)&&q.tolerance>=0&&q.tolerance<=5,'Ungültiger Lösungswinkel oder Toleranz.');
    if(q.interaction) {
      const allowed=['category','fieldLabel','diagram','incidence','refractedAngle'];
      requireThat(typeof q.interaction==='object'&&!Array.isArray(q.interaction)&&Object.keys(q.interaction).every(k=>allowed.includes(k)),'Ungültige Interaktionsdaten.');
      requireThat(['Grundbegriffe','Reflexion','Brechung'].includes(q.interaction.category),'Kategorie fehlt.');
      for(const key of ['incidence','refractedAngle']) if(Object.hasOwn(q.interaction,key)) requireThat(Number.isFinite(q.interaction[key])&&q.interaction[key]>0&&q.interaction[key]<90,'Ungültiger Diagrammwinkel.');
      if(Object.hasOwn(q.interaction,'diagram')) requireThat(['reflection','refractionReading','refractionDraw'].includes(q.interaction.diagram),'Unbekanntes Diagramm.');
      if(Object.hasOwn(q.interaction,'fieldLabel')) requireThat(typeof q.interaction.fieldLabel==='string'&&q.interaction.fieldLabel.length>0,'Eingabebeschriftung fehlt.');
    }
    if(q.kind==='number') requireThat(typeof q.interaction?.fieldLabel==='string','Beschriftung für Winkeleingabe fehlt.');
    if(q.kind==='ray') requireThat(['reflection','refractionDraw'].includes(q.interaction?.diagram)&&Number.isFinite(q.interaction.incidence),'Strahlendiagramm fehlt.');
    if(q.figure) {
      exact(q.figure,['src','alt'],'Abbildung');
      requireThat(typeof q.figure.src==='string' && /^assets\/[a-zA-Z0-9/_-]+\.svg$/.test(q.figure.src) && !q.figure.src.includes('..'),'Unsicherer Bildpfad.');
      requireThat(typeof q.figure.alt==='string'&&q.figure.alt.length>0,'Alternativtext fehlt.');
    }
  }
  return true;
}

export function validateConfig(c, bank) {
  validateBank(bank);
  exact(c,['schemaVersion','id','version','subject','title','grade','groupId','status','bank','schedule','season','attempts','rules','selection','ranking',...(Object.hasOwn(c,'interface')?['interface']:[])],'Wettkampf');
  if(Object.hasOwn(c,'interface')) requireThat(c.interface==='optik-quiz','Unbekannte Spieloberfläche.');
  if(c.interface==='optik-quiz') requireThat(bank.questions.every(q=>q.interaction),'Die Optik-Oberfläche benötigt Darstellungsdaten für jede Frage.');
  requireThat(c.interface==='optik-quiz'||bank.questions.every(q=>q.kind==='single-choice'),'Interaktive Fragen benötigen die Optik-Oberfläche.');
  requireThat(c.schemaVersion===1&&c.subject===SUBJECT&&isSlug(c.id)&&c.id.length<=64&&integer(c.version,1,100000),'Ungültige Wettkampfkennung.');
  requireThat(typeof c.title==='string'&&c.title.length>0&&c.grade===bank.grade&&isSlug(c.groupId),'Titel, Gruppe oder Jahrgang passt nicht.');
  requireThat(['draft','published','closed','archived'].includes(c.status),'Ungültiger Status.');
  exact(c.bank,['id','version'],'Poolreferenz');
  requireThat(c.bank.id===bank.id&&c.bank.version===bank.version,'Poolreferenz passt nicht.');
  exact(c.schedule,['startsAt','endsAt'],'Zeitfenster');
  requireThat(dateOrNull(c.schedule.startsAt)&&dateOrNull(c.schedule.endsAt),'Zeitangaben müssen gültige UTC-ISO-Zeitpunkte sein.');
  requireThat(c.schedule.startsAt===null||c.schedule.endsAt===null||Date.parse(c.schedule.startsAt)<Date.parse(c.schedule.endsAt),'Zeitfenster ist leer.');
  exact(c.season,['kind','timeZone'],'Wertung');
  requireThat(['continuous','calendar-month'].includes(c.season.kind)&&c.season.timeZone==='Europe/Berlin','Ungültige Saisondefinition.');
  exact(c.attempts,['maxPerPeriod','cooldownSeconds','maxDurationSeconds','oneActive'],'Versuchsregeln');
  requireThat(c.attempts.maxPerPeriod===null||integer(c.attempts.maxPerPeriod,1,100),'Ungültige Versuchszahl.');
  requireThat(integer(c.attempts.cooldownSeconds,0,86400)&&integer(c.attempts.maxDurationSeconds,60,86400)&&c.attempts.oneActive===true,'Ungültige Versuchsregeln.');
  exact(c.rules,['version','lives','questionTimeSeconds','basePoints','timeBonus'],'Spielregeln');
  requireThat(integer(c.rules.version,1,100000)&&c.rules.lives===3&&integer(c.rules.questionTimeSeconds,10,600)&&integer(c.rules.basePoints,1,10000)&&integer(c.rules.timeBonus,0,10000),'Ungültige Spielregeln.');
  exact(c.selection,['counts','shuffleQuestions','shuffleOptions'],'Auswahl');
  exact(c.selection.counts,levels,'Stufenanteile');
  requireThat(typeof c.selection.shuffleQuestions==='boolean'&&typeof c.selection.shuffleOptions==='boolean','Mischregeln fehlen.');
  for(const level of levels) {
    const n=c.selection.counts[level];
    const available=new Set(bank.questions.filter(q=>q.difficulty===level).map(q=>q.family)).size;
    requireThat(integer(n,0,50)&&n<=available,`Zu wenige unabhängige Aufgabenfamilien für ${level}.`);
  }
  const total=Object.values(c.selection.counts).reduce((a,b)=>a+b,0);
  requireThat(total>=1&&total<=50,'1–50 Fragen pro Versuch erforderlich.');
  exact(c.ranking,['mode','tie'],'Rangliste');
  requireThat(c.ranking.mode==='best-finished'&&c.ranking.tie==='shared-rank','Nicht unterstützte Ranglistenregel.');
  return true;
}
