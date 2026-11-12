// Profil : en-tête, 3 onglets, statistiques, calendrier d'activité, amis depuis le profil, réglages.
// Usage : node test/run-profile.mjs "http://127.0.0.1:8765/?test"
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out = '/tmp/profile';
(await import('node:fs')).mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
const days = ['2026-11-03', '2026-11-05', '2026-11-08', '2026-11-10', '2026-11-11', '2026-11-12'];
const state = { v: 2, news: 2, onboarded: true, player: 'Jojo', xp: 3200, days, xpDays: { '2026-11-03': 20, '2026-11-05': 60, '2026-11-08': 140, '2026-11-11': 55, '2026-11-12': 80 }, badges: ['first'],
  lessons: { 'u1-l1': { stars: 3, best: 92, d: '2026-11-12' }, 'u1-l2': { stars: 2, best: 80, d: '2026-11-12' } }, owned: ['phones', 'theme.nuit', 'theme.jour', 'skin.panda.rose', 'bob'], avatar: { species: 'panda', skin: 'rose', head: 'bob', eyes: '', neck: '', hand: '', back: '', aura: '', name: 'Mochi' } };
for (const [tag, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1440, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage();
  p.on('pageerror', e => logs.push(`${tag} pageerror: ${e.message}`));
  await p.addInitScript(st => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective)); if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify(st)); }, state);
  await p.goto(url); await p.waitForTimeout(800);
  await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${tag}-1.png` }); await p.screenshot({ path: `${out}/${tag}-full.png`, fullPage: true });
  check((await p.textContent('.player-name')) === 'Jojo' && (await p.$$('.pstat')).length === 8, `${tag} : en-tête et 8 statistiques`);
  check((await p.$$('.heat i')).length >= 78 && (await p.$$('.heat i.h3')).length >= 1, `${tag} : calendrier d'activité`);
  await p.click('[data-ptab=friends]'); await p.waitForTimeout(300);
  check(await p.isVisible('#pfIn') && !(await p.isVisible('.pstats')), `${tag} : onglet Amis (ajout d'un ami) et onglet Profil masqué`);
  await p.screenshot({ path: `${out}/${tag}-amis.png` });
  await p.click('[data-ptab=settings]'); await p.waitForTimeout(300);
  check(await p.isVisible('#player') && await p.isVisible('#export'), `${tag} : onglet Réglages (pseudo, sauvegarde)`);
  await p.fill('#player', 'Jordy'); await p.press('#player', 'Tab'); await p.waitForTimeout(400);
  check((await p.textContent('.player-name')) === 'Jordy' && await p.isVisible('#export'), `${tag} : pseudo modifié, on reste sur Réglages`);
  await p.click('#pBoard', { trial: true }).catch(() => {});
  check((await p.evaluate(() => window.__viol)).length === 0, `${tag} : aucune violation CSP`);
  await ctx.close();
}
console.log(logs.join('\n'));
await b.close();
if (logs.some(l => /^FAIL|pageerror/.test(l))) process.exit(1);
