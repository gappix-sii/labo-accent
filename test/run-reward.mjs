// Récompenser la progression : une leçon nouvelle rapporte un bonus de progrès ; la même leçon rejouée le même jour
// rapporte de moins en moins. Usage : node test/run-reward.mjs "http://127.0.0.1:8765/?test&accept"
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
const p = await ctx.newPage();
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.addInitScript(() => { if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify({ v: 2, news: 2, onboarded: true, modelReady: true })); });
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
await p.goto(url); await p.waitForTimeout(1200);
await p.click('#prep').catch(() => {});
await p.waitForFunction(() => document.getElementById('engine').dataset.state === 'ready', null, { timeout: 30000 }).catch(() => logs.push('moteur pas prêt'));
async function playLesson(again) {
  if (again) await p.click('#redo', { force: true }); // « Refaire » sur l'écran de fin : la même leçon
  else { await p.click('.node[data-idx="0"]', { force: true }); }
  await p.waitForTimeout(600);
  for (let k = 0; k < 30; k++) {
    if (await p.$('body[data-view=finish]')) break;
    await p.click('#rec', { force: true }); await p.waitForSelector('#next', { timeout: 20000 }); await p.waitForTimeout(150);
    await p.click('#next', { force: true }); await p.waitForTimeout(350);
  }
  await p.waitForSelector('body[data-view=finish]', { timeout: 10000 });
  const xp = await p.textContent('#fXp'); await p.waitForTimeout(400);
  return +xp.replace(/\D/g, '');
}
const s0 = await S();
const xp1 = await playLesson(); const s1 = await S();
const prog = s1.econ.log.filter(l => l.r === 'progress').reduce((t, l) => t + l.a, 0);
check(prog >= 20 + 15, `1re fois : bonus de progrès +${prog} (nouvelle leçon + étoiles), ${xp1} XP`);
const xp2 = await playLesson(true); const s2 = await S();
const prog2 = s2.econ.log.filter(l => l.r === 'progress').reduce((t, l) => t + l.a, 0) - prog;
check(xp2 < xp1 && prog2 === 0, `2e fois le même jour : ${xp2} XP (< ${xp1}), aucun bonus de progrès`);
const xp3 = await playLesson(true);
check(xp3 < xp2, `3e fois : ${xp3} XP (< ${xp2})`);
check(s2.coins - s1.coins < s1.coins - s0.coins, `pièces : 1re partie +${s1.coins - s0.coins}, 2e +${s2.coins - s1.coins}`);
check(s2.econ.earned - s2.econ.spent === s2.coins, 'solde = gagné − dépensé');
console.log(logs.join('\n'));
await b.close();
if (logs.some(l => /^FAIL|pageerror/.test(l))) process.exit(1);
