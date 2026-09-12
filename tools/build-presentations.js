const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'presentations.json'), 'utf8'));

const C = {
  navy: '17324D', blue: '2F6FAD', blue2: '4C88C2', lightBlue: 'EAF3FB',
  teal: '2C7A7B', mint: 'E8F4F2', amber: 'D78C24', paleAmber: 'FFF4DE',
  green: '4E7A5A', paleGreen: 'EDF5EF', red: 'B55350', paleRed: 'FBEDEC',
  ink: '203040', muted: '607080', line: 'CDD8E2', white: 'FFFFFF', bg: 'F7FAFC',
  slate: '8FA1B3', paleSlate: 'F0F4F7', purple: '735D9B', palePurple: 'F2EEF8'
};
const FONT = 'Aptos';
const SW = 13.333, SH = 7.5;

function addText(slide, text, x, y, w, h, opts = {}) {
  slide.addText(String(text ?? ''), {
    x, y, w, h, fontFace: FONT, fontSize: 16, color: C.ink,
    margin: 0, valign: 'mid', fit: 'shrink', breakLine: false, ...opts
  });
}

function addTopBar(slide, label, title, level, pageNo) {
  slide.background = { color: C.bg };
  slide.addShape('rect', { x: 0, y: 0, w: SW, h: 0.15, line: { color: C.blue, transparency: 100 }, fill: { color: C.blue } });
  addText(slide, label.toUpperCase(), 0.62, 0.33, 3.7, 0.26, { fontSize: 10, bold: true, color: C.blue, charSpacing: 1.2 });
  addText(slide, title, 0.62, 0.68, 11.7, 0.60, { fontSize: 27, bold: true, color: C.navy, valign: 'top' });
  addText(slide, level, 10.4, 0.34, 2.25, 0.24, { fontSize: 10.2, bold: true, color: C.muted, align: 'right' });
  slide.addShape('line', { x: 0.62, y: 1.40, w: 12.08, h: 0, line: { color: C.line, width: 1 } });
  addText(slide, 'Fortlaufende Wiederholung · Physik NRW', 0.62, 7.13, 5.7, 0.20, { fontSize: 9, color: C.muted });
  addText(slide, String(pageNo), 12.18, 7.13, 0.5, 0.20, { fontSize: 9, color: C.muted, align: 'right' });
}

function card(slide, x, y, w, h, title, body, opts = {}) {
  const accent = opts.accent || C.blue;
  slide.addShape('roundRect', {
    x, y, w, h, rectRadius: 0.06,
    line: { color: opts.line || C.line, width: 1 },
    fill: { color: opts.fill || C.white },
    shadow: opts.shadow === false ? undefined : { type: 'outer', color: 'A8B8C7', opacity: 0.11, blur: 1, angle: 45, distance: 1 }
  });
  slide.addShape('rect', { x, y, w: 0.075, h, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  if (title) addText(slide, title, x + 0.22, y + 0.13, w - 0.38, 0.34, { fontSize: opts.titleSize || 14, bold: true, color: opts.titleColor || C.navy, valign: 'top' });
  const bodyY = title ? y + 0.54 : y + 0.18;
  const bodyH = title ? h - 0.68 : h - 0.36;
  if (Array.isArray(body)) {
    const runs = [];
    body.forEach((t, i) => runs.push({ text: String(t), options: { bullet: { indent: 13 }, hanging: 3, breakLine: i < body.length - 1 } }));
    slide.addText(runs, { x: x + 0.22, y: bodyY, w: w - 0.40, h: bodyH, fontFace: FONT, fontSize: opts.bodySize || 13, color: opts.bodyColor || C.ink, margin: 0.02, valign: 'top', fit: 'shrink', paraSpaceAfterPt: opts.paraSpaceAfterPt || 5 });
  } else {
    addText(slide, body, x + 0.22, bodyY, w - 0.40, bodyH, { fontSize: opts.bodySize || 13, color: opts.bodyColor || C.ink, valign: opts.valign || 'top', breakLine: true });
  }
}

function numberedQuestion(slide, n, q, x, y, w, h, accent = C.blue) {
  slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.05, line: { color: C.line, width: 1 }, fill: { color: C.white } });
  slide.addShape('ellipse', { x: x + 0.19, y: y + (h - 0.54) / 2, w: 0.54, h: 0.54, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  addText(slide, n, x + 0.19, y + (h - 0.54) / 2 + 0.01, 0.54, 0.50, { fontSize: 14, bold: true, color: C.white, align: 'center' });
  addText(slide, q, x + 0.94, y + 0.10, w - 1.13, h - 0.20, { fontSize: 16, bold: true, color: C.ink, valign: 'mid', breakLine: true });
}

function addTitleSlide(pptx, data) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape('ellipse', { x: 9.2, y: -1.25, w: 5.8, h: 5.8, line: { color: C.blue2, transparency: 100 }, fill: { color: C.blue2, transparency: 12 } });
  slide.addShape('ellipse', { x: 10.75, y: 4.65, w: 2.75, h: 2.75, line: { color: C.teal, transparency: 100 }, fill: { color: C.teal, transparency: 20 } });
  slide.addShape('line', { x: 0.80, y: 1.38, w: 1.15, h: 0, line: { color: '6DB2E3', width: 4 } });
  addText(slide, data.level.toUpperCase(), 0.80, 0.72, 4.3, 0.30, { fontSize: 12, bold: true, color: 'B8D4E8', charSpacing: 1.4 });
  addText(slide, data.title, 0.80, 1.65, 9.45, 1.55, { fontSize: 34, bold: true, color: C.white, valign: 'top', breakLine: true });
  addText(slide, 'KLP-basierte Wiederholung', 0.82, 3.55, 6.9, 0.43, { fontSize: 20, color: 'E5F0F7' });
  addText(slide, 'Vom sicheren Abruf über einfache Anwendungen bis zum Transfer.', 0.82, 4.13, 7.8, 0.54, { fontSize: 15, color: 'BED2E2' });
  slide.addShape('roundRect', { x: 0.82, y: 5.35, w: 5.05, h: 0.72, rectRadius: 0.06, line: { color: '315B7D', width: 1 }, fill: { color: '1E425F' } });
  addText(slide, '1  Abrufen    2  Verstehen    3  Rechnen    4  Transfer', 1.04, 5.55, 4.60, 0.25, { fontSize: 11.7, bold: true, color: 'E2EEF6', align: 'center' });
  addText(slide, `KLP-Recherche: ${data.researchDate || '2026-09-12'}`, 0.82, 6.80, 3.8, 0.24, { fontSize: 9.7, color: 'A9C2D4' });
}

function addKlpSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'KLP-Kompass', data.klp?.name || data.title, data.level, pageNo);
  const foci = data.klp?.foci || data.overview || [];
  card(slide, 0.72, 1.75, 7.10, 4.70, 'Verbindliche fachliche Schwerpunkte', foci, { accent: C.blue, bodySize: 15.0, titleSize: 15.5 });
  card(slide, 8.05, 1.75, 4.55, 2.22, 'Was du am Ende können sollst', (data.overview || []).slice(0, 4), { accent: C.teal, fill: C.mint, bodySize: 12.5, titleSize: 14.5 });
  card(slide, 8.05, 4.20, 4.55, 2.25, 'Lernweg dieser Präsentation', ['sehr leichte Abruffragen', 'Begriffe und Formeln', 'einfache Aufgaben', 'Transfer und Grafik'], { accent: C.amber, fill: C.paleAmber, bodySize: 12.5, titleSize: 14.5 });
  addText(slide, `${data.klp?.source || ''} · ${data.klp?.pages || ''}`, 0.78, 6.63, 7.0, 0.24, { fontSize: 9.5, color: C.muted });
}

function addWarmupSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'Stufe 1 · Abrufen', 'Leichter Einstieg → sicherer Abruf', data.level, pageNo);
  addText(slide, 'Fragen 1–2 sind bewusst sehr leicht. Danach wird der Abruf schrittweise fachlicher.', 0.72, 1.61, 11.5, 0.32, { fontSize: 14, color: C.muted });
  const qs = (data.warmup || data.check || []).slice(0, 5);
  const ys = [2.03, 2.92, 3.81, 4.70, 5.59];
  const acc = [C.blue, C.blue2, C.teal, C.green, C.amber];
  qs.forEach((q, i) => numberedQuestion(slide, i + 1, q, 0.82, ys[i], 11.60, 0.72, acc[i]));
}

function normalized(s) { return String(s || '').toLowerCase().replace(/[ρφδ_\-]/g, ' ').replace(/[^a-zäöüß0-9]+/g, ' ').trim(); }
function relationForConcept(data, concept) {
  const key = normalized(concept.name).split(' ')[0];
  return (data.relations || []).find(r => normalized(r[0]).includes(key));
}

function addConceptsSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'Stufe 2 · Verstehen', 'Fachbegriffe und Formeln', data.level, pageNo);
  const concepts = (data.concepts || []).slice(0, 4);
  const pos = [[0.72,1.75],[6.76,1.75],[0.72,4.18],[6.76,4.18]];
  const accents = [C.blue, C.teal, C.amber, C.green];
  concepts.forEach((c, i) => {
    const [x,y] = pos[i];
    const rel = relationForConcept(data, c);
    const body = [];
    body.push(c.definition || '');
    if (c.unit) body.push(`Einheit: ${c.unit}`);
    if (rel && rel[2]) body.push(`Beziehung: ${rel[2]}`);
    card(slide, x, y, 5.84, 2.12, c.name, body, { accent: accents[i], fill: i % 2 ? C.white : C.paleSlate, bodySize: 13.0, titleSize: 15.3 });
  });
}

function taskCard(slide, label, q, hint, x, y, w, h, accent, fill) {
  card(slide, x, y, w, h, label, q, { accent, fill, bodySize: 15.0, titleSize: 13.0 });
  if (hint) {
    slide.addShape('roundRect', { x: x + 0.22, y: y + h - 0.47, w: Math.min(w - 0.44, 3.9), h: 0.27, rectRadius: 0.04, line: { color: accent, transparency: 80 }, fill: { color: C.white, transparency: 8 } });
    addText(slide, `Tipp: ${hint}`, x + 0.34, y + h - 0.43, Math.min(w - 0.68, 3.65), 0.18, { fontSize: 10.3, bold: true, color: accent });
  }
}

function addBasisSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'Stufe 3 · Anwenden', 'Einfache Aufgaben und Rechenbeispiele', data.level, pageNo);
  const upper = !String(data.level || '').startsWith('Klasse 5');
  addText(slide, upper ? 'Rechne zunächst mit bewusst einfachen Zahlen und klaren Einzelschritten.' : 'Arbeite mit klaren Einzelideen, kleinen Anwendungen und einfachen Zahlen.', 0.72, 1.60, 11.5, 0.34, { fontSize: 14, color: C.muted });
  const tasks = (data.basis || []).slice(0, 3);
  const ys = [2.04, 3.53, 5.02];
  const accents = [C.blue, C.teal, C.amber];
  const fills = [C.lightBlue, C.mint, C.paleAmber];
  tasks.forEach((t, i) => taskCard(slide, `Aufgabe ${i + 1}`, t.q, t.hint, 0.82, ys[i], 11.60, 1.23, accents[i], fills[i]));
}

function addTransferSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'Stufe 4 · Transfer', 'Jetzt verknüpfen', data.level, pageNo);
  addText(slide, 'Hier musst du mehr als einen Gedanken verbinden oder das Modell begründet anwenden.', 0.72, 1.60, 11.7, 0.34, { fontSize: 14, color: C.muted });
  const tasks = (data.transfer || []).slice(0, 2);
  const defaultLabels = ['Anwendung / Transfer', 'Konzeptfrage · Warum?'];
  tasks.forEach((t, i) => taskCard(slide, t.label || defaultLabels[i] || `Transfer ${i + 1}`, t.q, t.hint, 0.82, 2.12 + i * 2.08, 11.60, 1.75, i === 0 ? C.purple : C.green, i === 0 ? C.palePurple : C.paleGreen));
  slide.addShape('roundRect', { x: 3.2, y: 6.38, w: 6.93, h: 0.44, rectRadius: 0.05, line: { color: C.line, width: 1 }, fill: { color: C.white } });
  addText(slide, 'Strategie: Gegeben → Gesucht → Modell/Formel → Ergebnis → Plausibilität', 3.38, 6.48, 6.55, 0.20, { fontSize: 10.9, bold: true, color: C.navy, align: 'center' });
}

function drawAxes(slide, box, xLabel, yLabel, xMin, xMax, yMin, yMax) {
  const {x,y,w,h} = box;
  const px = x + 0.65, py = y + 0.25, pw = w - 0.95, ph = h - 0.78;
  slide.addShape('line', { x: px, y: py + ph, w: pw, h: 0, line: { color: C.ink, width: 1.4, endArrowType: 'triangle' } });
  slide.addShape('line', { x: px, y: py + ph, w: 0, h: -ph, line: { color: C.ink, width: 1.4, endArrowType: 'triangle' } });
  for (let i=0;i<=4;i++) {
    const tx=px+pw*i/4, ty=py+ph-ph*i/4;
    slide.addShape('line',{x:tx,y:py,w:0,h:ph,line:{color:C.line,width:0.6,dash:'dash'}});
    slide.addShape('line',{x:px,y:ty,w:pw,h:0,line:{color:C.line,width:0.6,dash:'dash'}});
    const xv=xMin+(xMax-xMin)*i/4, yv=yMin+(yMax-yMin)*i/4;
    addText(slide, fmtTick(xv), tx-0.25, py+ph+0.08, 0.5, 0.22,{fontSize:8.5,color:C.muted,align:'center'});
    addText(slide, fmtTick(yv), x+0.02, ty-0.10, 0.52, 0.20,{fontSize:8.5,color:C.muted,align:'right'});
  }
  addText(slide, xLabel || '', px+pw-1.35, py+ph+0.36, 1.6, 0.24,{fontSize:9.5,bold:true,color:C.ink,align:'right'});
  addText(slide, yLabel || '', x+0.02, y+0.00, 2.4, 0.24,{fontSize:9.5,bold:true,color:C.ink});
  return {px,py,pw,ph};
}
function fmtTick(v){
  if (Math.abs(v)>=100) return String(Math.round(v));
  if (Math.abs(v)>=10) return (Math.round(v*10)/10).toString().replace('.',',');
  return (Math.round(v*100)/100).toString().replace('.',',');
}

function drawLineVisual(slide, visual, box) {
  const series = visual.series || [];
  const pts = series.flatMap(s => s.points || []);
  if (!pts.length) return;
  let xMin=Math.min(...pts.map(p=>p[0])), xMax=Math.max(...pts.map(p=>p[0]));
  let yMin=Math.min(...pts.map(p=>p[1])), yMax=Math.max(...pts.map(p=>p[1]));
  if (xMin>0) xMin=0; if (yMin>0) yMin=0;
  if (xMax===xMin) xMax=xMin+1; if (yMax===yMin) yMax=yMin+1;
  const padY=(yMax-yMin)*0.08; yMin-=padY; yMax+=padY;
  const ax = drawAxes(slide, box, visual.xLabel, visual.yLabel, xMin,xMax,yMin,yMax);
  const cols=[C.blue,C.teal,C.amber,C.purple];
  series.forEach((s,si)=>{
    const col=cols[si%cols.length], p=s.points||[];
    const map=(pt)=>[ax.px+(pt[0]-xMin)/(xMax-xMin)*ax.pw, ax.py+ax.ph-(pt[1]-yMin)/(yMax-yMin)*ax.ph];
    for(let i=1;i<p.length;i++){
      const [x1,y1]=map(p[i-1]),[x2,y2]=map(p[i]);
      slide.addShape('line',{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color:col,width:2.4}});
    }
    p.forEach(pt=>{const [cx,cy]=map(pt);slide.addShape('ellipse',{x:cx-0.05,y:cy-0.05,w:0.10,h:0.10,line:{color:col,width:1},fill:{color:C.white}});});
    addText(slide, s.name || `Reihe ${si+1}`, box.x+0.90+si*1.45, box.y+box.h-0.22, 1.35, 0.20,{fontSize:9.2,bold:true,color:col});
  });
}

function drawWaves(slide, box) {
  const {x,y,w,h}=box; const mid1=y+1.25, mid2=y+2.75;
  addText(slide,'A',x+0.15,mid1-0.12,0.25,0.24,{fontSize:11,bold:true,color:C.blue});
  addText(slide,'B',x+0.15,mid2-0.12,0.25,0.24,{fontSize:11,bold:true,color:C.teal});
  [mid1,mid2].forEach(m=>slide.addShape('line',{x:x+0.55,y:m,w:w-0.75,h:0,line:{color:C.line,width:1}}));
  function wave(mid,cycles,amp,col){let prev=null; for(let i=0;i<=90;i++){const xx=x+0.55+(w-0.75)*i/90; const yy=mid-amp*Math.sin(i/90*cycles*2*Math.PI); if(prev) slide.addShape('line',{x:prev[0],y:prev[1],w:xx-prev[0],h:yy-prev[1],line:{color:col,width:2}}); prev=[xx,yy];}}
  wave(mid1,2.5,0.40,C.blue); wave(mid2,5,0.40,C.teal);
  addText(slide,'gleiche Skala → Wellenlänge/Frequenz vergleichen',x+1.65,y+3.45,w-2.0,0.28,{fontSize:10,color:C.muted,align:'center'});
}

function drawCircuit(slide, box) {
  const {x,y,w,h}=box; const lx=x+1.0, rx=x+w-0.65, top=y+0.85, bot=y+h-0.65;
  slide.addShape('line',{x:lx,y:top,w:rx-lx,h:0,line:{color:C.ink,width:2}});
  slide.addShape('line',{x:lx,y:bot,w:rx-lx,h:0,line:{color:C.ink,width:2}});
  slide.addShape('line',{x:lx,y:top,w:0,h:bot-top,line:{color:C.ink,width:2}});
  slide.addShape('line',{x:rx,y:top,w:0,h:bot-top,line:{color:C.ink,width:2}});
  // battery left
  slide.addShape('line',{x:lx-0.12,y:y+1.65,w:0.24,h:0,line:{color:C.ink,width:3}});
  slide.addShape('line',{x:lx-0.20,y:y+2.00,w:0.40,h:0,line:{color:C.ink,width:1.3}});
  addText(slide,'Batterie',x+0.10,y+1.35,0.72,0.30,{fontSize:9.5,color:C.muted,align:'center'});
  const xs=[x+3.15,x+5.45];
  xs.forEach((bx,i)=>{
    slide.addShape('line',{x:bx,y:top,w:0,h:bot-top,line:{color:C.ink,width:1.8}});
    slide.addShape('ellipse',{x:bx-0.30,y:y+1.65,w:0.60,h:0.60,line:{color:i?C.teal:C.blue,width:2},fill:{color:C.white}});
    slide.addShape('line',{x:bx-0.18,y:y+1.77,w:0.36,h:0.36,line:{color:i?C.teal:C.blue,width:1.4}});
    slide.addShape('line',{x:bx+0.18,y:y+1.77,w:-0.36,h:0.36,line:{color:i?C.teal:C.blue,width:1.4}});
    addText(slide,`L${i+1}`,bx-0.30,y+2.38,0.60,0.25,{fontSize:11,bold:true,color:C.ink,align:'center'});
  });
  // switch in first branch
  slide.addShape('line',{x:xs[0]-0.02,y:y+1.20,w:0.52,h:-0.22,line:{color:C.red,width:2}});
  slide.addShape('ellipse',{x:xs[0]-0.06,y:y+1.15,w:0.12,h:0.12,line:{color:C.red,width:1},fill:{color:C.white}});
  addText(slide,'Schalter',xs[0]+0.20,y+0.88,0.8,0.25,{fontSize:9.5,color:C.red});
}

function drawRays(slide, box) {
  const {x,y,w,h}=box; const sx=x+0.75, sy=y+1.85; const ox=x+3.15, screen=x+w-0.75;
  slide.addShape('ellipse',{x:sx-0.12,y:sy-0.12,w:0.24,h:0.24,line:{color:C.amber,width:1},fill:{color:C.amber}});
  addText(slide,'Lichtquelle',x+0.20,sy+0.30,1.1,0.25,{fontSize:9.5,color:C.muted,align:'center'});
  slide.addShape('rect',{x:ox,y:y+1.25,w:0.23,h:1.20,line:{color:C.ink,width:1},fill:{color:C.ink}});
  addText(slide,'Gegenstand',ox-0.55,y+2.60,1.3,0.25,{fontSize:9.5,color:C.muted,align:'center'});
  slide.addShape('line',{x:screen,y:y+0.45,w:0,h:h-0.80,line:{color:C.slate,width:4}});
  addText(slide,'Schirm',screen-0.38,y+h-0.23,0.8,0.25,{fontSize:9.5,color:C.muted,align:'center'});
  [[y+1.25,y+0.55],[y+2.45,y+3.25]].forEach(([oy,ey])=>{
    slide.addShape('line',{x:sx,y:sy,w:ox-sx,h:oy-sy,line:{color:C.amber,width:1.8}});
    slide.addShape('line',{x:ox,y:oy,w:screen-ox,h:ey-oy,line:{color:C.amber,width:1.8,endArrowType:'triangle'}});
  });
  slide.addShape('rect',{x:screen-0.12,y:y+0.55,w:0.24,h:2.70,line:{color:C.red,transparency:100},fill:{color:C.red,transparency:60}});
  addText(slide,'Schatten',screen-0.72,y+1.65,0.65,0.30,{fontSize:10,bold:true,color:C.red,rotate:270});
}

function drawLens(slide, box) {
  const {x,y,w,h}=box; const axis=y+2.00, lens=x+w/2;
  slide.addShape('line',{x:x+0.25,y:axis,w:w-0.5,h:0,line:{color:C.slate,width:1,dash:'dash'}});
  // lens approximation
  slide.addShape('arc',{x:lens-0.28,y:y+0.48,w:0.56,h:3.0,adjustPoint:0.18,rotate:0,line:{color:C.blue,width:2.5},fill:{color:C.lightBlue,transparency:45}});
  slide.addShape('arc',{x:lens-0.28,y:y+0.48,w:0.56,h:3.0,adjustPoint:0.18,rotate:180,line:{color:C.blue,width:2.5},fill:{color:C.lightBlue,transparency:45}});
  const objX=x+1.05, objTop=y+0.68, imgX=x+w-1.15, imgBot=y+3.08;
  slide.addShape('line',{x:objX,y:axis,w:0,h:objTop-axis,line:{color:C.ink,width:3,endArrowType:'triangle'}});
  slide.addShape('line',{x:imgX,y:axis,w:0,h:imgBot-axis,line:{color:C.red,width:3,endArrowType:'triangle'}});
  const f1=lens-1.25,f2=lens+1.25;
  [f1,f2].forEach((fx,i)=>{slide.addShape('ellipse',{x:fx-0.05,y:axis-0.05,w:0.10,h:0.10,line:{color:C.ink,width:1},fill:{color:C.ink}});addText(slide,i?'F′':'F',fx-0.16,axis+0.12,0.32,0.22,{fontSize:9.5,bold:true,align:'center'});});
  // central ray
  slide.addShape('line',{x:objX,y:objTop,w:imgX-objX,h:imgBot-objTop,line:{color:C.teal,width:1.8,endArrowType:'triangle'}});
  // parallel then through focus
  slide.addShape('line',{x:objX,y:objTop,w:lens-objX,h:0,line:{color:C.amber,width:1.8}});
  slide.addShape('line',{x:lens,y:objTop,w:imgX-lens,h:imgBot-objTop,line:{color:C.amber,width:1.8,endArrowType:'triangle'}});
  addText(slide,'Gegenstand',objX-0.55,y+3.35,1.15,0.25,{fontSize:9.5,color:C.muted,align:'center'});
  addText(slide,'Bild',imgX-0.35,y+3.35,0.70,0.25,{fontSize:9.5,color:C.red,align:'center'});
}

function drawOrbit(slide, box) {
  const {x,y,w,h}=box; const sx=x+2.4, sy=y+2.0;
  slide.addShape('ellipse',{x:sx-0.42,y:sy-0.42,w:0.84,h:0.84,line:{color:C.amber,width:1},fill:{color:'F6C34A'}});
  addText(slide,'Sonne',sx-0.45,sy+0.55,0.90,0.25,{fontSize:10,bold:true,color:C.amber,align:'center'});
  slide.addShape('ellipse',{x:sx-2.0,y:sy-1.30,w:4.0,h:2.60,line:{color:C.slate,width:1,dash:'dash'},fill:{color:C.white,transparency:100}});
  const ex=sx+1.75,ey=sy;
  slide.addShape('ellipse',{x:ex-0.20,y:ey-0.20,w:0.40,h:0.40,line:{color:C.blue,width:1},fill:{color:C.blue}});
  addText(slide,'Erde',ex-0.40,ey+0.30,0.80,0.25,{fontSize:10,bold:true,color:C.blue,align:'center'});
  slide.addShape('ellipse',{x:ex-0.78,y:ey-0.52,w:1.56,h:1.04,line:{color:C.line,width:1,dash:'dash'},fill:{color:C.white,transparency:100}});
  const mx=ex+0.67,my=ey;
  slide.addShape('ellipse',{x:mx-0.10,y:my-0.10,w:0.20,h:0.20,line:{color:C.muted,width:1},fill:{color:C.muted}});
  addText(slide,'Mond',mx-0.33,my+0.20,0.66,0.22,{fontSize:9.3,color:C.muted,align:'center'});
  slide.addShape('line',{x:sx+0.45,y:sy,w:ex-0.65-sx,h:0,line:{color:C.amber,width:1.4,endArrowType:'triangle'}});
}

function drawEnergyBars(slide, box) {
  const {x,y,w,h}=box; const stages=[['oben',0.90,0.10,0.00],['Mitte',0.48,0.42,0.10],['unten',0.10,0.72,0.18]];
  stages.forEach((s,i)=>{
    const bx=x+0.55+i*2.2; addText(slide,s[0],bx,y+0.25,1.35,0.28,{fontSize:10.5,bold:true,color:C.navy,align:'center'});
    const vals=s.slice(1), cols=[C.blue,C.teal,C.amber], labels=['E_lage','E_kin','E_th'];
    vals.forEach((v,j)=>{const bh=2.35*v; const xx=bx+j*0.42; slide.addShape('rect',{x:xx,y:y+3.0-bh,w:0.31,h:bh,line:{color:cols[j],width:0.5},fill:{color:cols[j]}});});
    labels.forEach((l,j)=>addText(slide,l,bx-0.05+j*0.42,y+3.10,0.42,0.22,{fontSize:8.5,color:cols[j],align:'center'}));
  });
  addText(slide,'Balkenhöhe = Energieanteil',x+1.35,y+3.55,w-2.7,0.25,{fontSize:10,color:C.muted,align:'center'});
}

function drawEnergyChain(slide, box) {
  const {x,y,w,h}=box; const labels=['Generator','Trafo ↑','Hochspannungsnetz','Trafo ↓','Haushalt']; const cols=[C.teal,C.blue,C.slate,C.blue,C.amber];
  const cw=1.15, gap=(w-0.5-labels.length*cw)/(labels.length-1); let xx=x+0.25;
  labels.forEach((l,i)=>{slide.addShape('roundRect',{x:xx,y:y+1.35,w:cw,h:1.15,rectRadius:0.05,line:{color:cols[i],width:1.5},fill:{color:C.white}});addText(slide,l,xx+0.10,y+1.62,cw-0.20,0.60,{fontSize:10.5,bold:true,color:cols[i],align:'center',breakLine:true}); if(i<labels.length-1) slide.addShape('line',{x:xx+cw,y:y+1.92,w:gap,h:0,line:{color:C.ink,width:1.7,endArrowType:'triangle'}}); xx+=cw+gap;});
  addText(slide,'mechanisch → elektrisch',x+0.10,y+2.75,1.65,0.28,{fontSize:9.5,color:C.teal,align:'center'});
  addText(slide,'Spannung hoch: kleinere Stromstärke → geringere Leitungsverluste',x+2.20,y+3.10,w-2.45,0.35,{fontSize:10.3,color:C.muted,align:'center'});
}

function drawCircle(slide, box) {
  const {x,y,w,h}=box; const cx=x+3.0,cy=y+2.0,r=1.35;
  slide.addShape('ellipse',{x:cx-r,y:cy-r,w:2*r,h:2*r,line:{color:C.blue,width:2},fill:{color:C.white,transparency:100}});
  slide.addShape('ellipse',{x:cx-0.06,y:cy-0.06,w:0.12,h:0.12,line:{color:C.ink,width:1},fill:{color:C.ink}});
  const px=cx+r,py=cy;
  slide.addShape('ellipse',{x:px-0.12,y:py-0.12,w:0.24,h:0.24,line:{color:C.amber,width:1},fill:{color:C.amber}});
  slide.addShape('line',{x:px,y:py,w:0,h:-1.20,line:{color:C.teal,width:2.2,endArrowType:'triangle'}}); addText(slide,'v',px+0.12,py-1.18,0.35,0.25,{fontSize:12,bold:true,color:C.teal});
  slide.addShape('line',{x:px,y:py,w:-1.15,h:0,line:{color:C.red,width:2.2,endArrowType:'triangle'}}); addText(slide,'F_z',px-0.85,py+0.10,0.45,0.25,{fontSize:12,bold:true,color:C.red});
  addText(slide,'Tangentialgeschwindigkeit ⟂ Zentripetalkraft',x+0.75,y+3.55,w-1.5,0.30,{fontSize:10.5,color:C.muted,align:'center'});
}

function drawPhotoeffect(slide, box) {
  const v={xLabel:'Frequenz f',yLabel:'E_kin,max',series:[{name:'Messung',points:[[2,0],[3,1.2],[4,2.4],[5,3.6],[6,4.8]]}]};
  drawLineVisual(slide,v,box);
  addText(slide,'f_g',box.x+2.55,box.y+box.h-0.70,0.50,0.23,{fontSize:10,bold:true,color:C.red,align:'center'});
  slide.addShape('line',{x:box.x+2.80,y:box.y+0.45,w:0,h:box.h-1.10,line:{color:C.red,width:1,dash:'dash'}});
}

function drawInduction(slide, box) {
  const v={xLabel:'Zeit t',yLabel:'U_ind',series:[{name:'U_ind(t)',points:[[0,0],[1,0],[1.2,2.8],[2.0,2.8],[2.2,0],[4.2,0],[4.4,-2.8],[5.2,-2.8],[5.4,0],[6.3,0]]}]};
  drawLineVisual(slide,v,box);
  addText(slide,'Einfahren',box.x+1.55,box.y+0.45,1.2,0.25,{fontSize:9.5,bold:true,color:C.blue,align:'center'});
  addText(slide,'vollständig im Feld',box.x+3.15,box.y+1.80,1.55,0.25,{fontSize:9.2,color:C.muted,align:'center'});
  addText(slide,'Ausfahren',box.x+5.15,box.y+3.18,1.15,0.25,{fontSize:9.5,bold:true,color:C.blue,align:'center'});
}

function drawEnergyLevels(slide, box) {
  const {x,y,w,h}=box; const levels=[0.55,1.35,2.30,3.15]; const widths=[5.0,4.6,4.1,3.5];
  levels.forEach((off,i)=>{slide.addShape('line',{x:x+0.8,y:y+off,w:widths[i],h:0,line:{color:C.navy,width:2}});addText(slide,`E${4-i}`,x+0.25,y+off-0.10,0.45,0.22,{fontSize:10,bold:true,color:C.navy});});
  slide.addShape('line',{x:x+2.0,y:y+3.15,w:0,h:-1.80,line:{color:C.blue,width:2.3,endArrowType:'triangle'}});
  slide.addShape('line',{x:x+4.25,y:y+2.30,w:0,h:-1.75,line:{color:C.teal,width:2.3,endArrowType:'triangle'}});
  addText(slide,'ΔE₁',x+2.12,y+2.05,0.55,0.25,{fontSize:10.5,bold:true,color:C.blue});
  addText(slide,'ΔE₂',x+4.37,y+1.35,0.55,0.25,{fontSize:10.5,bold:true,color:C.teal});
  addText(slide,'größeres ΔE → energiereicheres Photon → kleinere λ',x+0.95,y+3.52,w-1.4,0.30,{fontSize:10.3,color:C.muted,align:'center'});
}

function drawField(slide, box) {
  const {x,y,w,h}=box; const top=y+0.55,bot=y+3.25;
  slide.addShape('rect',{x:x+0.55,y:top,w:w-1.1,h:0.12,line:{color:C.red,width:1},fill:{color:C.red}});
  slide.addShape('rect',{x:x+0.55,y:bot,w:w-1.1,h:0.12,line:{color:C.blue,width:1},fill:{color:C.blue}});
  addText(slide,'+',x+0.20,top-0.07,0.25,0.25,{fontSize:16,bold:true,color:C.red}); addText(slide,'−',x+0.20,bot-0.07,0.25,0.25,{fontSize:16,bold:true,color:C.blue});
  for(let i=0;i<4;i++){const xx=x+1.2+i*1.25; slide.addShape('line',{x:xx,y:top+0.27,w:0,h:bot-top-0.42,line:{color:C.red,width:1.3,endArrowType:'triangle'}});}
  // magnetic crosses
  for(let r=0;r<3;r++)for(let c=0;c<5;c++){const xx=x+0.9+c*1.1,yy=y+1.02+r*0.65;slide.addShape('line',{x:xx-0.06,y:yy-0.06,w:0.12,h:0.12,line:{color:C.teal,width:1}});slide.addShape('line',{x:xx+0.06,y:yy-0.06,w:-0.12,h:0.12,line:{color:C.teal,width:1}});}
  const py=y+1.95; slide.addShape('ellipse',{x:x+1.05,y:py-0.10,w:0.20,h:0.20,line:{color:C.amber,width:1},fill:{color:C.amber}}); slide.addShape('line',{x:x+1.25,y:py,w:3.3,h:0,line:{color:C.amber,width:2.3,endArrowType:'triangle'}}); addText(slide,'v',x+4.50,py-0.22,0.30,0.25,{fontSize:11,bold:true,color:C.amber});
  addText(slide,'E-Feld nach unten · B-Feld in die Folie',x+1.20,y+3.55,w-1.6,0.28,{fontSize:10,color:C.muted,align:'center'});
}

function drawResonance(slide, box) {
  const pts=[]; for(let i=0;i<=40;i++){const f=0.2+i*0.045; const a=0.35+3.0/(1+Math.pow((f-1.05)/0.18,2)); pts.push([f,a]);}
  drawLineVisual(slide,{xLabel:'Erregerfrequenz f',yLabel:'Amplitude A',series:[{name:'Resonanz',points:pts}]},box);
  slide.addShape('line',{x:box.x+3.85,y:box.y+0.35,w:0,h:box.h-1.0,line:{color:C.red,width:1,dash:'dash'}});
  addText(slide,'f₀',box.x+3.65,box.y+box.h-0.65,0.4,0.22,{fontSize:10.5,bold:true,color:C.red,align:'center'});
}

function drawVisual(slide, visual, box) {
  switch(visual?.type) {
    case 'line': case 'line_multi': case 'decay': drawLineVisual(slide, visual, box); break;
    case 'circuit': drawCircuit(slide, box); break;
    case 'waves': drawWaves(slide, box); break;
    case 'rays': drawRays(slide, box); break;
    case 'lens': drawLens(slide, box); break;
    case 'orbit': drawOrbit(slide, box); break;
    case 'energy_bars': drawEnergyBars(slide, box); break;
    case 'energy_chain': drawEnergyChain(slide, box); break;
    case 'circle': drawCircle(slide, box); break;
    case 'photoeffect': drawPhotoeffect(slide, box); break;
    case 'induction': drawInduction(slide, box); break;
    case 'energy_levels': drawEnergyLevels(slide, box); break;
    case 'field': drawField(slide, box); break;
    case 'resonance': drawResonance(slide, box); break;
    default: card(slide,box.x,box.y,box.w,box.h,'Visualisierung','Hier kann eine passende Skizze, Messreihe oder Grafik ergänzt werden.',{accent:C.slate,fill:C.paleSlate});
  }
}

function addVisualSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'Stufe 5 · Darstellen', data.visual?.title || 'Grafik, Experiment oder Daten', data.level, pageNo);
  slide.addShape('roundRect',{x:0.72,y:1.72,w:8.25,h:4.95,rectRadius:0.05,line:{color:C.line,width:1},fill:{color:C.white}});
  drawVisual(slide,data.visual || {},{x:0.93,y:1.92,w:7.83,h:4.45});
  card(slide,9.20,1.72,3.40,2.20,'Auswerten',(data.visual?.questions || []).slice(0,2),{accent:C.blue,fill:C.lightBlue,bodySize:13.2,titleSize:14.5});
  card(slide,9.20,4.15,3.40,2.52,'Darstellungssprache',['Achsen + Einheiten prüfen','Trend beschreiben','mit Fachbegriff/Formel begründen'],{accent:C.teal,fill:C.mint,bodySize:12.6,titleSize:14.3});
}

function addLessonSlide(pptx, data, lesson, pageNo, index) {
  const slide = pptx.addSlide();
  addTopBar(slide, lesson.date ? `Stundenrückblick · ${lesson.date}` : 'Stundenrückblick', lesson.title || `Ergänzung ${index+1}`, data.level, pageNo);
  card(slide,0.72,1.75,5.86,2.08,'Heute neu',(lesson.learned||[]).slice(0,3),{accent:C.blue,bodySize:13.8});
  card(slide,6.82,1.75,5.78,2.08,'Experiment / Beispiel',lesson.experiment || 'Versuch, Beobachtung oder Anwendungsbeispiel ergänzen.',{accent:C.teal,bodySize:13.4});
  card(slide,0.72,4.10,5.86,1.82,'Merksatz / Formel',lesson.key || 'Zentrale Aussage ergänzen.',{accent:C.amber,fill:C.paleAmber,bodySize:13.8});
  card(slide,6.82,4.10,5.78,1.82,'2-Minuten-Check',(lesson.check||[]).slice(0,3),{accent:C.green,fill:C.paleGreen,bodySize:13.2});
}

function addSolutionsSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addTopBar(slide, 'Sicherung', 'Lösungen und Exit-Ticket', data.level, pageNo);
  addText(slide, 'Erst nach eigener Bearbeitung einblenden.', 0.72, 1.58, 11.5, 0.28, { fontSize: 13.5, color: C.muted });
  const ans=(data.answers||[]).slice(0,6);
  const pos=[[0.72,1.98],[6.76,1.98],[0.72,3.35],[6.76,3.35],[0.72,4.72],[6.76,4.72]];
  const labels=['Warm-up','Basis 1','Basis 2','Basis 3','Anwendung','Konzeptfrage'];
  ans.forEach((a,i)=>{const [x,y]=pos[i];card(slide,x,y,5.84,1.16,labels[i],a,{accent:i===0?C.blue:i<4?C.teal:C.purple,fill:C.white,bodySize:11.6,titleSize:11.8,shadow:false});});
  slide.addShape('roundRect',{x:0.82,y:6.18,w:11.60,h:0.67,rectRadius:0.06,line:{color:C.amber,width:1.2},fill:{color:C.paleAmber}});
  addText(slide,'EXIT',1.02,6.36,0.65,0.20,{fontSize:10.5,bold:true,color:C.amber,align:'center'});
  addText(slide,data.exit_ticket || 'Formuliere die wichtigste Erkenntnis in einem Satz.',1.82,6.27,10.30,0.47,{fontSize:13.0,bold:true,color:C.navy,valign:'mid',breakLine:true});
}

async function buildDeck(entry) {
  const jsonPath=path.join(ROOT,entry.folder,'praesentation','praesentation.json');
  const outPath=path.join(ROOT,entry.presentation);
  const data=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
  const pptx=new pptxgen();
  pptx.layout='LAYOUT_WIDE';
  pptx.author='Jonathan Hardenacke';
  pptx.company='Rivius Gymnasium Attendorn';
  pptx.subject=`KLP-basierte Wiederholung: ${data.title}`;
  pptx.title=`${data.title} – Wiederholung`;
  pptx.lang='de-DE';
  pptx.theme={headFontFace:FONT,bodyFontFace:FONT,lang:'de-DE'};

  addTitleSlide(pptx,data);
  let pageNo=2;
  addKlpSlide(pptx,data,pageNo++);
  addWarmupSlide(pptx,data,pageNo++);
  addConceptsSlide(pptx,data,pageNo++);
  addBasisSlide(pptx,data,pageNo++);
  addTransferSlide(pptx,data,pageNo++);
  addVisualSlide(pptx,data,pageNo++);
  (data.lessons||[]).forEach((lesson,i)=>addLessonSlide(pptx,data,lesson,pageNo++,i));
  addSolutionsSlide(pptx,data,pageNo++);

  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  await pptx.writeFile({fileName:outPath});
  return {outPath,slides:pptx._slides.length};
}

(async()=>{
  let ok=0;
  for(const entry of manifest){
    const {outPath,slides}=await buildDeck(entry); ok++;
    console.log(`[${String(ok).padStart(2,'0')}/${manifest.length}] ${path.relative(ROOT,outPath)} (${slides} Folien)`);
  }
  console.log(`Fertig: ${ok} Präsentationen erzeugt.`);
})().catch(err=>{console.error(err);process.exit(1);});
