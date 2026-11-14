// Dates & nombres : fiches, quiz d'écoute (jours) et dictée de nombres jusqu'au bout, avec les bonnes réponses.
// Usage : node test/run-basics.mjs "http://127.0.0.1:8765/?test"
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { BASICS_BY_ID, basicsItems, numberWords, yearWords, ordinalWords } from '../js/basics.js';
const url = process.argv[2], out = '/tmp/basics';
(await import('node:fs')).mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
// Réponses attendues à partir de ce que l'appli fait dire à la voix de synthèse
const NUM = new Map(); for (let n = 0; n < 10000; n++) { NUM.set(numberWords(n), String(n)); if (n >= 1950 && n < 2030) NUM.set(yearWords(n), String(n)); }
const DAYFR = new Map(basicsItems(BASICS_BY_ID.days).map(w => [w.en, w.fr]));
const QB = BASICS_BY_ID.questions, QFR = new Map([...basicsItems(QB).filter(w => w.ex).map(w => [w.ex[1], w.ex[0]]), ...QB.sentences.map(([en, fr]) => [fr, en])]);
const celebrations = async p => { for (let k = 0; k < 6; k++) { await p.waitForTimeout(400); if (await p.$('#cel[open] #celOk')) await p.click('#cel[open] #celOk'); else if (await p.$('body[data-view=basics]')) return; } };
for (const [tag, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1440, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  p.on('pageerror', e => logs.push(tag + ' pageerror: ' + e.message));
  await p.addInitScript(() => {
    window.__said = [];
    if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify({ v: 2, news: 2, onboarded: true }));
    const orig = window.speechSynthesis && speechSynthesis.speak.bind(speechSynthesis);
    if (window.speechSynthesis) speechSynthesis.speak = u => { window.__said.push(u.text); try { orig(u); } catch (e) {} };
  });
  await p.goto(url); await p.waitForTimeout(800);
  await p.click('nav.bottom button[data-go=vocab]'); await p.waitForTimeout(300);
  await p.click('[data-seg=basics]'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${tag}-questions.png` });
  check((await p.$$('.bx-ex')).length >= 14, `${tag} : exemples affichés pour les mots-questions`);
  for (const t of ['days', 'months', 'numbers', 'dates']) { await p.click(`[data-bx=${t}]`); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${tag}-${t}.png`, fullPage: tag === 'mob' }); }
  const ipa = await p.$$eval('[data-ipa]', els => els.filter(e => e.textContent.startsWith('/')).length), rows = await p.$$eval('[data-ipa]', e => e.length);
  check(ipa === rows && rows >= 15, `${tag} : phonétique affichée pour ${ipa}/${rows} mots (onglet Dates)`);
  if (tag === 'desk') break;
  // Remets la question dans l'ordre : une erreur puis tout juste
  await p.click('[data-bx=questions]'); await p.waitForTimeout(300); await p.click('#bxQuiz');
  let okOrd = 0;
  for (let k = 0; k < 8; k++) {
    await p.waitForSelector('[data-ord]'); await p.waitForTimeout(300);
    const en = QFR.get(await p.textContent('.bq-fr')), words = en.split(' ');
    const seq = k === 0 ? [...words].reverse() : words;
    for (const w of seq) { const chips = await p.$$('[data-ord]:not([disabled])'); for (const c of chips) if ((await c.textContent()) === w) { await c.click(); break; } }
    await p.waitForSelector('.bq-fb');
    if (k === 0) { check(/l'ordre/.test(await p.textContent('.bq-fb')), 'ordre : la mauvaise question est corrigée'); await p.screenshot({ path: `${out}/${tag}-order.png` }); }
    else if (/Bravo/.test(await p.textContent('.bq-fb'))) okOrd++;
    await p.click('#bqNext');
  }
  check(okOrd === 7, `ordre : ${okOrd}/7 questions bien construites`);
  await p.waitForSelector('body[data-view=done]'); await p.click('#doOk'); await celebrations(p);
  // Quiz d'écoute des jours, en répondant juste
  await p.click('[data-bx=days]'); await p.waitForTimeout(300); await p.click('#bxQuiz');
  for (let k = 0; k < 8; k++) {
    await p.waitForSelector('[data-opt]'); await p.waitForTimeout(400);
    const said = await p.evaluate(() => window.__said.at(-1));
    await p.click(`[data-opt="${DAYFR.get(said)}"]`);
    if (k === 0) await p.screenshot({ path: `${out}/${tag}-quiz.png` });
    await p.click('#bqNext');
  }
  await p.waitForSelector('body[data-view=done]'); const S1 = await p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
  check(S1.basics.days && S1.basics.days.best === 100, 'quiz des jours : 8/8, score enregistré');
  check(S1.econ.log.some(l => l.r === 'progress'), 'bonus de progrès pour le premier quiz réussi');
  await p.click('#doOk'); await celebrations(p);
  // Dictée de nombres : réponse fausse puis réponses justes
  await p.click('[data-bx=numbers]'); await p.waitForTimeout(300); await p.click('#bxQuiz');
  let good = 0;
  for (let k = 0; k < 8; k++) {
    await p.waitForSelector('#bqIn'); await p.waitForTimeout(400);
    const said = await p.evaluate(() => window.__said.at(-1)), ans = NUM.get(said);
    await p.fill('#bqIn', k === 0 ? '99999' : ans); await p.press('#bqIn', 'Enter');
    await p.waitForSelector('.bq-fb');
    if (k === 0) { check(/c'était/.test(await p.textContent('.bq-fb')) && (await p.textContent('.bq-fb .frpron')).length > 3, `dictée : erreur corrigée avec la prononciation (« ${said} »)`); await p.screenshot({ path: `${out}/${tag}-dictee.png` }); }
    else if (/Bravo/.test(await p.textContent('.bq-fb'))) good++;
    await p.click('#bqNext');
  }
  check(good === 7, `dictée : ${good}/7 bonnes réponses reconnues`);
  await p.waitForSelector('body[data-view=done]'); await p.click('#doOk'); await celebrations(p);
  // Cartes au micro : la carte montre la prononciation à la française
  await p.click('#bxCards'); await p.waitForSelector('#reveal'); await p.click('#reveal'); await p.waitForTimeout(400);
  check(!!(await p.$('#ans .frpron')), 'carte : prononciation à la française affichée');
  await p.screenshot({ path: `${out}/${tag}-card.png` });
  // Pratique : deux onglets, sons en tuiles, thèmes en cartes
  await p.goto(url); await p.waitForTimeout(800); await p.click('nav.bottom button[data-go=train]'); await p.waitForTimeout(500);
  check(!!(await p.$('#toChat')) && (await p.$$('.dcard')).length > 5, 'Pratique · Conversation : IA et jeux de rôle');
  await p.click('[data-trlv=A1]'); await p.waitForTimeout(200); const a1 = (await p.$$('.dcard')).length;
  await p.click('[data-trtab=pron]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${tag}-pratique.png` }); await p.screenshot({ path: `${out}/${tag}-pratique-full.png`, fullPage: true });
  check(a1 >= 1 && (await p.$$('.snd-tile')).length >= 5 && (await p.$$('.tcat')).length >= 4, `Pratique · Prononciation : tuiles et thèmes (filtre A1 : ${a1})`);
  await p.click('.tcat'); await p.waitForTimeout(500); check(await p.$('body[data-view=lesson]') !== null, 'un thème lance la leçon');
  await ctx.close();
}
console.log(logs.join('\n'));
await b.close();
if (logs.some(l => /^FAIL|pageerror/.test(l))) process.exit(1);
