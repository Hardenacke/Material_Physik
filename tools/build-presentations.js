const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const SHAPE = new pptxgen().ShapeType;

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'presentations.json'), 'utf8'));

const C = {
  navy: '16324F',
  blue: '2F6FAD',
  lightBlue: 'EAF3FB',
  sky: 'D9EBF8',
  teal: '2C7A7B',
  mint: 'E6F4F1',
  amber: 'D9902F',
  paleAmber: 'FFF3DE',
  red: 'B94A48',
  paleRed: 'FBECEC',
  ink: '203040',
  muted: '5B6B7B',
  line: 'C8D5E2',
  white: 'FFFFFF',
  bg: 'F7FAFC',
  green: '4A7C59',
  paleGreen: 'EBF4ED',
};

const FONT = 'Aptos';
const SW = 13.333;
const SH = 7.5;

function addText(slide, text, x, y, w, h, opts = {}) {
  const base = {
    x, y, w, h,
    fontFace: FONT,
    fontSize: 18,
    color: C.ink,
    margin: 0,
    breakLine: false,
    valign: 'mid',
    fit: 'shrink',
  };
  slide.addText(String(text ?? ''), { ...base, ...opts });
}

function addHeader(slide, section, title, level, pageNo) {
  slide.background = { color: C.bg };
  slide.addShape(SHAPE.rect, { x: 0, y: 0, w: SW, h: 0.18, line: { color: C.blue, transparency: 100 }, fill: { color: C.blue } });
  addText(slide, section.toUpperCase(), 0.62, 0.35, 2.65, 0.34, { fontSize: 10.5, bold: true, color: C.blue, charSpacing: 1.3 });
  addText(slide, title, 0.62, 0.72, 11.95, 0.7, { fontSize: 28, bold: true, color: C.navy, valign: 'top' });
  addText(slide, level, 10.70, 0.37, 1.9, 0.27, { fontSize: 10.5, bold: true, color: C.muted, align: 'right' });
  slide.addShape(SHAPE.line, { x: 0.62, y: 1.48, w: 12.08, h: 0, line: { color: C.line, width: 1 } });
  addText(slide, 'Fortlaufende Wiederholung · Physik NRW', 0.62, 7.14, 5.8, 0.22, { fontSize: 9.5, color: C.muted });
  addText(slide, String(pageNo), 12.15, 7.14, 0.55, 0.22, { fontSize: 9.5, color: C.muted, align: 'right' });
}

function addCard(slide, x, y, w, h, title, body, style = {}) {
  const fill = style.fill || C.white;
  const accent = style.accent || C.blue;
  slide.addShape(SHAPE.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    line: { color: style.line || C.line, width: 1 },
    fill: { color: fill },
    shadow: { type: 'outer', color: 'B7C5D2', opacity: 0.12, blur: 1, angle: 45, distance: 1 },
  });
  slide.addShape(SHAPE.rect, { x, y, w: 0.08, h, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  addText(slide, title, x + 0.22, y + 0.16, w - 0.42, 0.35, { fontSize: style.titleSize || 15, bold: true, color: style.titleColor || C.navy, valign: 'top' });
  if (Array.isArray(body)) {
    const runs = body.map((t, i) => ({
      text: String(t),
      options: { bullet: { indent: 13 }, breakLine: i < body.length - 1, hanging: 3 },
    }));
    slide.addText(runs, {
      x: x + 0.24, y: y + 0.58, w: w - 0.46, h: h - 0.74,
      fontFace: FONT, fontSize: style.bodySize || 14.5, color: C.ink,
      margin: 0.02, breakLine: false, valign: 'top', paraSpaceAfterPt: 7, fit: 'shrink',
    });
  } else {
    addText(slide, body, x + 0.24, y + 0.58, w - 0.46, h - 0.74, { fontSize: style.bodySize || 14.5, color: C.ink, valign: 'top', breakLine: true, fit: 'shrink' });
  }
}

function addTitleSlide(pptx, data) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(SHAPE.rect, { x: 0, y: 0, w: SW, h: SH, line: { color: C.navy, transparency: 100 }, fill: { color: C.navy } });
  slide.addShape(SHAPE.arc, { x: 8.2, y: -1.0, w: 6.5, h: 6.5, adjustPoint: 0.23, rotate: 25, line: { color: C.blue, transparency: 100 }, fill: { color: C.blue, transparency: 16 } });
  slide.addShape(SHAPE.ellipse, { x: 10.55, y: 4.85, w: 2.7, h: 2.7, line: { color: C.teal, transparency: 100 }, fill: { color: C.teal, transparency: 25 } });
  slide.addShape(SHAPE.line, { x: 0.78, y: 1.36, w: 1.15, h: 0, line: { color: '6FB4E5', width: 4 } });
  addText(slide, data.level.toUpperCase(), 0.78, 0.72, 4.4, 0.34, { fontSize: 12, bold: true, color: 'A9CDE9', charSpacing: 1.6 });
  addText(slide, data.title, 0.78, 1.58, 9.5, 1.7, { fontSize: 34, bold: true, color: C.white, valign: 'top', breakLine: true, fit: 'shrink' });
  addText(slide, 'Fortlaufende Wiederholungspräsentation', 0.82, 3.66, 7.8, 0.45, { fontSize: 19, color: 'DCEAF5' });
  addText(slide, 'Ein lebendes Dokument: Nach jeder Stunde wächst der Rückblick um eine neue Folie.', 0.82, 4.2, 7.6, 0.82, { fontSize: 15, color: 'BFD3E3', valign: 'top' });
  slide.addShape(SHAPE.roundRect, { x: 0.82, y: 5.55, w: 4.5, h: 0.62, rectRadius: 0.08, line: { color: '315B7D', width: 1 }, fill: { color: '1B405E', transparency: 0 } });
  addText(slide, 'Kernideen · Begriffe · Beziehungen · Schnellcheck', 1.05, 5.70, 4.05, 0.26, { fontSize: 11.5, bold: true, color: 'DDEAF3', align: 'center' });
  addText(slide, 'Physik NRW', 0.82, 6.82, 2.5, 0.3, { fontSize: 10, color: 'A9C1D2' });
}

function addOverviewSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addHeader(slide, 'Orientierung', 'Das bleibt hängen', data.level, pageNo);
  const items = data.overview || [];
  const coords = [
    [0.72, 1.80, 5.92, 1.27], [6.86, 1.80, 5.75, 1.27],
    [0.72, 3.28, 5.92, 1.27], [6.86, 3.28, 5.75, 1.27],
    [0.72, 4.76, 11.89, 1.27],
  ];
  items.slice(0, 5).forEach((t, i) => {
    const [x, y, w, h] = coords[i];
    slide.addShape(SHAPE.roundRect, { x, y, w, h, rectRadius: 0.07, line: { color: C.line, width: 1 }, fill: { color: C.white } });
    slide.addShape(SHAPE.ellipse, { x: x + 0.22, y: y + 0.30, w: 0.63, h: 0.63, line: { color: C.blue, transparency: 100 }, fill: { color: C.lightBlue } });
    addText(slide, String(i + 1), x + 0.22, y + 0.31, 0.63, 0.58, { fontSize: 15, bold: true, color: C.blue, align: 'center' });
    addText(slide, t, x + 1.02, y + 0.18, w - 1.27, h - 0.36, { fontSize: i === 4 ? 17 : 16, bold: true, color: C.ink, valign: 'mid', breakLine: true });
  });
}

function addTermsSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addHeader(slide, 'Werkzeugkasten', 'Begriffe und Modelle', data.level, pageNo);
  const terms = data.terms || [];
  const x0 = 0.72, y0 = 1.78, colW = 5.90, gapX = 0.24, rowH = 1.55, gapY = 0.17;
  terms.slice(0, 6).forEach((pair, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (colW + gapX), y = y0 + row * (rowH + gapY);
    addCard(slide, x, y, colW, rowH, pair[0], pair[1], { accent: col === 0 ? C.blue : C.teal, bodySize: 13.5, titleSize: 14.5 });
  });
}

function addRelationsSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addHeader(slide, 'Zusammenhänge', 'Formeln, Beziehungen und zentrale Aussagen', data.level, pageNo);
  const rel = data.relations || [];
  const count = Math.min(rel.length, 5);
  const twoCols = count > 3;
  if (twoCols) {
    const x0 = 0.72, colW = 5.90, gapX = 0.24;
    const positions = [
      [x0, 1.77, colW, 1.52], [x0 + colW + gapX, 1.77, colW, 1.52],
      [x0, 3.48, colW, 1.52], [x0 + colW + gapX, 3.48, colW, 1.52],
      [x0, 5.19, 12.04, 1.42]
    ];
    rel.slice(0, 5).forEach((r, i) => {
      const [x, y, w, h] = positions[i];
      slide.addShape(SHAPE.roundRect, { x, y, w, h, rectRadius: 0.07, line: { color: C.line, width: 1 }, fill: { color: C.white } });
      addText(slide, r[0], x + 0.22, y + 0.14, w - 0.44, 0.28, { fontSize: 13.8, bold: true, color: C.navy, valign: 'top' });
      addText(slide, r[1], x + 0.22, y + 0.52, w - 0.44, h - 0.88, { fontSize: 12.7, color: C.ink, valign: 'top', breakLine: true });
      if (r[2]) {
        slide.addShape(SHAPE.roundRect, { x: x + 0.22, y: y + h - 0.34, w: Math.min(w - 0.44, Math.max(2.2, String(r[2]).length * 0.09)), h: 0.26, rectRadius: 0.04, line: { color: C.sky, transparency: 100 }, fill: { color: C.lightBlue } });
        addText(slide, r[2], x + 0.32, y + h - 0.32, Math.min(w - 0.64, Math.max(2.0, String(r[2]).length * 0.085)), 0.21, { fontSize: 10.4, bold: true, color: C.blue, valign: 'mid' });
      }
    });
  } else {
    rel.slice(0, 3).forEach((r, i) => {
      const y = 1.83 + i * 1.67;
      addCard(slide, 0.78, y, 11.82, 1.44, r[0], `${r[1]}\n${r[2] ? '→ ' + r[2] : ''}`, { accent: i === 0 ? C.blue : i === 1 ? C.teal : C.amber, bodySize: 13.5 });
    });
  }
}

function addLessonSlide(pptx, data, lesson, pageNo, index) {
  const slide = pptx.addSlide();
  const lessonTitle = lesson.title || `Stundenrückblick ${String(index + 1).padStart(2, '0')}`;
  addHeader(slide, lesson.date ? `Rückblick · ${lesson.date}` : 'Stundenrückblick', lessonTitle, data.level, pageNo);
  const learned = Array.isArray(lesson.learned) ? lesson.learned.slice(0, 3) : [];
  addCard(slide, 0.72, 1.80, 5.92, 2.10, 'Heute neu', learned.length ? learned : ['Zentrale Erkenntnisse dieser Stunde eintragen.'], { accent: C.blue, fill: C.white, bodySize: 14 });
  addCard(slide, 6.86, 1.80, 5.75, 2.10, 'Experiment / Beispiel', lesson.experiment || 'Versuch, Beobachtung oder Anwendungsbeispiel der Stunde.', { accent: C.teal, fill: C.white, bodySize: 13.5 });
  addCard(slide, 0.72, 4.14, 5.92, 1.78, 'Merksatz / Formel', lesson.key || 'Der wichtigste Zusammenhang der Stunde.', { accent: C.amber, fill: C.paleAmber, bodySize: 14.2 });
  addCard(slide, 6.86, 4.14, 5.75, 1.78, '2-Minuten-Check', Array.isArray(lesson.check) && lesson.check.length ? lesson.check.slice(0, 3) : ['Eine kurze Frage formulieren.', 'Eine zweite kurze Frage formulieren.'], { accent: C.green, fill: C.paleGreen, bodySize: 13.2 });
}

function addCheckSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addHeader(slide, 'Abrufübung', 'Schnellcheck', data.level, pageNo);
  addText(slide, 'Ohne Unterlagen beantworten – erst danach gemeinsam prüfen.', 0.72, 1.73, 11.9, 0.42, { fontSize: 15, color: C.muted });
  const qs = (data.check || []).slice(0, 3);
  const accents = [C.blue, C.teal, C.amber];
  qs.forEach((q, i) => {
    const y = 2.35 + i * 1.35;
    slide.addShape(SHAPE.roundRect, { x: 0.82, y, w: 11.55, h: 1.08, rectRadius: 0.07, line: { color: C.line, width: 1 }, fill: { color: C.white } });
    slide.addShape(SHAPE.ellipse, { x: 1.06, y: y + 0.24, w: 0.60, h: 0.60, line: { color: accents[i], transparency: 100 }, fill: { color: accents[i] } });
    addText(slide, String(i + 1), 1.06, y + 0.26, 0.60, 0.55, { fontSize: 15, bold: true, color: C.white, align: 'center' });
    addText(slide, q, 1.92, y + 0.15, 9.95, 0.78, { fontSize: 17, bold: true, color: C.ink, valign: 'mid', breakLine: true });
  });
  slide.addShape(SHAPE.roundRect, { x: 4.48, y: 6.50, w: 4.35, h: 0.42, rectRadius: 0.05, line: { color: C.sky, transparency: 100 }, fill: { color: C.lightBlue } });
  addText(slide, 'Tipp: Erklären ist stärker als nur nennen.', 4.65, 6.58, 4.0, 0.22, { fontSize: 10.5, bold: true, color: C.blue, align: 'center' });
}

function addTemplateSlide(pptx, data, pageNo) {
  const slide = pptx.addSlide();
  addHeader(slide, 'Fortschreiben', 'Stundenrückblick – Vorlage', data.level, pageNo);
  addCard(slide, 0.72, 1.80, 5.92, 1.78, 'Heute neu', ['max. 3 zentrale Erkenntnisse', 'in eigenen Worten', 'Bezug zum Vorwissen herstellen'], { accent: C.blue, fill: C.lightBlue, bodySize: 13.4 });
  addCard(slide, 6.86, 1.80, 5.75, 1.78, 'Experiment / Beobachtung', 'Ein prägnanter Versuch, Messwert, Graph oder Alltagsbezug als Anker für die Stunde.', { accent: C.teal, fill: C.mint, bodySize: 13.4 });
  addCard(slide, 0.72, 3.85, 5.92, 1.78, 'Merksatz / Formel', 'Genau eine zentrale Aussage oder Beziehung festhalten – möglichst mit Bedeutung der Größen.', { accent: C.amber, fill: C.paleAmber, bodySize: 13.4 });
  addCard(slide, 6.86, 3.85, 5.75, 1.78, '2-Minuten-Check', ['2–3 kurze Abruffragen', 'möglichst ohne Unterlagen lösbar', 'eine Anwendung oder Erklärung einbauen'], { accent: C.green, fill: C.paleGreen, bodySize: 13.4 });
  slide.addShape(SHAPE.roundRect, { x: 1.85, y: 6.06, w: 9.62, h: 0.64, rectRadius: 0.07, line: { color: C.line, width: 1 }, fill: { color: C.white } });
  addText(slide, 'Codex-Workflow: neue Stunde in praesentation.json → lessons ergänzen → npm run build:pptx', 2.08, 6.22, 9.16, 0.27, { fontSize: 11.2, bold: true, color: C.navy, align: 'center' });
}

async function buildDeck(entry) {
  const jsonPath = path.join(ROOT, entry.folder, 'praesentation', 'praesentation.json');
  const outPath = path.join(ROOT, entry.presentation);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Jonathan Hardenacke';
  pptx.subject = `Fortlaufende Wiederholung: ${data.title}`;
  pptx.title = `${data.title} – Wiederholung`;
  pptx.company = 'Rivius Gymnasium Attendorn';
  pptx.lang = 'de-DE';
  pptx.theme = {
    headFontFace: FONT,
    bodyFontFace: FONT,
    lang: 'de-DE'
  };

  addTitleSlide(pptx, data);
  let pageNo = 2;
  addOverviewSlide(pptx, data, pageNo++);
  addTermsSlide(pptx, data, pageNo++);
  addRelationsSlide(pptx, data, pageNo++);
  (data.lessons || []).forEach((lesson, i) => addLessonSlide(pptx, data, lesson, pageNo++, i));
  addCheckSlide(pptx, data, pageNo++);
  addTemplateSlide(pptx, data, pageNo++);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await pptx.writeFile({ fileName: outPath });
  return { outPath, slides: pptx._slides.length };
}

(async () => {
  let ok = 0;
  for (const entry of manifest) {
    const { outPath, slides } = await buildDeck(entry);
    ok++;
    console.log(`[${String(ok).padStart(2, '0')}/${manifest.length}] ${path.relative(ROOT, outPath)} (${slides} Folien)`);
  }
  console.log(`Fertig: ${ok} Präsentationen erzeugt.`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
