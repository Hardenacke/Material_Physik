// Lokales Anlegen eines Entwurfs; veröffentlicht und verändert keine Konten.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {validateConfig, SUBJECT} from '../src/vertrag.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
try {
  const argv=process.argv.slice(2), args={};
  for(let i=0;i<argv.length;i+=2){
    if(!['--id','--titel','--gruppe','--pool','--modus','--start','--ende'].includes(argv[i])||argv[i+1]===undefined||Object.hasOwn(args,argv[i]))throw new Error('Ungültige oder doppelte Argumente.');
    args[argv[i]]=argv[i+1];
  }
  for(const k of ['--id','--titel','--gruppe','--pool','--modus'])if(!args[k])throw new Error(`${k} fehlt.`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args['--id'])||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args['--pool']))throw new Error('Unsichere ID.');
  if(!['offen','monat','termin'].includes(args['--modus']))throw new Error('--modus: offen, monat oder termin.');
  const bank=JSON.parse(await readFile(resolve(root,'private','fragenpools',args['--pool']+'.json'),'utf8'));
  const scheduled=args['--modus']==='termin';
  if(scheduled&&(!args['--start']||!args['--ende']))throw new Error('Termin benötigt --start und --ende als UTC-ISO-Zeitpunkte.');
  const c={schemaVersion:1,id:args['--id'],version:1,subject:SUBJECT,title:args['--titel'],grade:bank.grade,groupId:args['--gruppe'],status:'draft',bank:{id:bank.id,version:bank.version},
    schedule:{startsAt:args['--start']??null,endsAt:args['--ende']??null},
    season:{kind:args['--modus']==='monat'?'calendar-month':'continuous',timeZone:'Europe/Berlin'},
    attempts:{maxPerPeriod:scheduled?1:null,cooldownSeconds:30,maxDurationSeconds:1800,oneActive:true},
    rules:{version:1,lives:3,questionTimeSeconds:60,basePoints:100,timeBonus:900},
    selection:{counts:{basis:4,aufbau:4,knifflig:4},shuffleQuestions:true,shuffleOptions:true},
    ranking:{mode:'best-finished',tie:'shared-rank'}};
  validateConfig(c,bank);
  await mkdir(resolve(root,'private','wettkaempfe'),{recursive:true});
  const out=resolve(root,'private','wettkaempfe',c.id+'.json');
  await writeFile(out,JSON.stringify(c,null,2)+'\n',{flag:'wx'});
  console.log(`Entwurf angelegt: ${out}\nVor Veröffentlichung Regeln, Poolumfang und Freigabe prüfen. status bleibt draft.`);
}catch(e){console.error(e.message);process.exitCode=1;}
