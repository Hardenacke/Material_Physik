function monthEdge(year, month, timeZone) {
  // month ist 1-basiert. Iterative Bestimmung der lokalen Mitternacht; keine festen UTC-Offsets.
  const normalized = new Date(Date.UTC(year, month-1, 1));
  const target = normalized.getTime(); let guess = target;
  const format = new Intl.DateTimeFormat('en-GB', {timeZone, year:'numeric', month:'2-digit',
    day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'});
  for(let i=0;i<5;i++) {
    const p = Object.fromEntries(format.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));
    const seen = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    const next = guess + target-seen;
    if(next === guess) return guess;
    guess=next;
  }
  throw new Error('Monatsgrenze konnte nicht bestimmt werden.');
}

export function availability(config, now) {
  if(config.status !== 'published') return 'closed';
  if(config.schedule.startsAt !== null && now < Date.parse(config.schedule.startsAt)) return 'pending';
  if(config.schedule.endsAt !== null && now >= Date.parse(config.schedule.endsAt)) return 'closed';
  return 'open';
}

export function periodFor(config, now) {
  const start = config.schedule.startsAt === null ? null : Date.parse(config.schedule.startsAt);
  const end = config.schedule.endsAt === null ? null : Date.parse(config.schedule.endsAt);
  if(config.season.kind === 'continuous') return {id:'gesamt', startsAt:start, endsAt:end};
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone:config.season.timeZone,year:'numeric',month:'2-digit'
  }).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
  const monthStart=monthEdge(+p.year,+p.month,config.season.timeZone);
  const monthEnd=monthEdge(+p.year,+p.month+1,config.season.timeZone);
  return {id:`${p.year}-${p.month}`, startsAt:Math.max(monthStart,start??-Infinity), endsAt:Math.min(monthEnd,end??Infinity)};
}

export function storageKey(config, now) {
  return `${config.subject}/${config.id}/v${config.version}/${periodFor(config,now).id}`;
}
