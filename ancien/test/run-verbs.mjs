// Verbes irréguliers : fiches (colonne cachée), Trio, Verb Rush et Écris la forme joués jusqu'au bout.
// Usage : node test/run-verbs.mjs "http://127.0.0.1:8765/?test&fast"
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { VERB_BY_BASE, FORM_LABEL, targetOf, FAMILIES } from '../js/irregular.js';
const url = process.argv[2], out = '/tmp/verbs';
(await import('node:fs')).mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
const LABEL2FORM = Object.fromEntries(Object.entries(FORM_LABEL).map(([k, v]) => [v, k]));
for (const [tag, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1440, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  p.on('pageerror', e => logs.push(tag + ' pageerror: ' + e.message));
  await p.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective)); if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify({ v: 2, news: 2, onboarded: true })); });
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
  const back = async () => { await p.click('#doOk'); for (let k = 0; k < 8; k++) { await p.waitForTimeout(350); if (await p.$('#cel[open] #celOk')) await p.click('#cel[open] #celOk'); else if (await p.$('body[data-view=verbs]')) return; } };
  await p.goto(url); await p.waitForTimeout(800);
  await p.click('nav.bottom button[data-go=vocab]'); await p.waitForTimeout(300);
  await p.click('[data-seg=verbs]'); await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, 560)); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${tag}-home.png` }); await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: `${out}/${tag}-home-full.png`, fullPage: true });
  check((await p.$$('.vfrow')).length === FAMILIES[0].verbs.length, `${tag} : fiche des ${FAMILIES[0].verbs.length} stars`);
  if (tag === 'desk') { check((await p.evaluate(() => window.__viol)).length === 0, 'desk : aucune violation CSP'); await ctx.close(); break; }
  // Cacher le prétérit puis le révéler
  await p.click('[data-mask=past]'); await p.waitForTimeout(300);
  const hidden = (await p.$$('[data-rev]')).length; await p.click('[data-rev]'); await p.waitForTimeout(200);
  check(hidden === FAMILIES[0].verbs.length && (await p.$$('[data-rev]')).length === hidden - 1, 'colonne prétérit cachée, une forme révélée');
  // Trio sur la famille i-a-u
  await p.click('[data-mask=""]'); await p.click('[data-fam=iau]'); await p.waitForTimeout(300);
  await p.click('#vgTrio'); await p.waitForSelector('.tcard');
  const cards = await p.$$eval('.tcard', els => els.map(e => ({ k: e.dataset.k, text: e.querySelector('b').textContent, slot: e.querySelector('small').textContent })));
  const verbs = FAMILIES.find(f => f.id === 'iau').verbs;
  await p.click(`.tcard[data-k="${cards[0].k}"]`); await p.click(`.tcard[data-k="${cards[1].k}"]`);
  const wrong = cards.find((c, i) => i > 1); await p.click(`.tcard[data-k="${wrong.k}"]`); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${tag}-trio.png` });
  await p.waitForTimeout(1100);
  for (const x of verbs) {
    const mine = ['base', 'past', 'pp'].map(slot => cards.find(c => c.text === x[slot] && LABEL2FORM[c.slot] === slot));
    if (mine.some(c => !c)) continue;
    for (const c of mine) await p.click(`.tcard[data-k="${c.k}"]`);
    await p.waitForTimeout(250);
  }
  await p.waitForSelector('body[data-view=done]', { timeout: 6000 }).catch(() => {});
  check(!!(await p.$('body[data-view=done]')), 'Trio : tous les trios trouvés');
  await back();
  // Verb Rush (8 s en mode test)
  await p.click('#vgRush'); await p.waitForSelector('[data-ro]');
  let answered = 0;
  while (await p.$('body[data-view=vrush]') && answered < 30) {
    const hint = await p.$eval('.rush-q .small.muted:last-of-type', e => e.textContent).catch(() => '');
    const m = hint.match(/\((.+) → (.+)\)/); if (!m) { await p.waitForTimeout(150); continue; }
    const x = VERB_BY_BASE[m[1]], form = LABEL2FORM[m[2]], fr = await p.$eval('.rush-q .small.muted', e => e.textContent);
    const s = [x.ps, x.pps].find(t => t.form === form && t.fr === fr) || [x.ps, x.pps].find(t => t.form === form);
    const ans = targetOf(s, x); const btn = await p.$(`[data-ro="${ans}"]:not([disabled])`);
    if (!btn) { await p.waitForTimeout(150); continue; }
    await btn.click({ force: true }).catch(() => {}); answered++; if (answered === 2) await p.screenshot({ path: `${out}/${tag}-rush.png` }); await p.waitForTimeout(650);
  }
  await p.waitForSelector('body[data-view=done]', { timeout: 12000 });
  let s = await S(); check(s.irr.iau && s.irr.iau.rush > 0 && answered >= 3, `Verb Rush : ${answered} réponses justes, score ${s.irr.iau && s.irr.iau.rush}`);
  await back();
  // Écris la forme : une faute « régulière », puis tout juste
  await p.click('#vgWrite'); await p.waitForSelector('#vwIn');
  for (let k = 0; k < 8; k++) {
    await p.waitForSelector('#vwIn:not([disabled])');
    const base = (await p.textContent('.coach .bubble b')).trim(), fr = await p.$eval('.card .small.muted', e => e.textContent), x = VERB_BY_BASE[base];
    const sent = [x.ps, x.pps].find(t => t.fr === fr);
    await p.fill('#vwIn', k === 0 ? base + 'ed' : targetOf(sent, x)); await p.press('#vwIn', 'Enter');
    await p.waitForSelector('#vwNext');
    if (k === 0) { check(/bonne forme/.test(await p.textContent('#vwRes')), 'Écris : la faute est corrigée avec les 3 formes et la prononciation'); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${tag}-write.png` }); }
    await p.click('#vwNext');
  }
  await p.waitForSelector('body[data-view=done]');
  s = await S(); check(s.irr.iau.write === 88, `Écris : 7/8 → ${s.irr.iau.write} %`);
  check(Object.keys(s.vocab).filter(k => k.startsWith('IV:')).length >= 5, 'répétition espacée mise à jour pour les verbes joués');
  check(s.econ.earned - s.econ.spent === s.coins, 'pièces cohérentes avec le journal');
  await back();
  check((await p.evaluate(() => window.__viol)).length === 0, 'aucune violation CSP / Trusted Types');
  await ctx.close();
}
console.log(logs.join('\n'));
await b.close();
if (logs.some(l => /^FAIL|pageerror/.test(l))) process.exit(1);
