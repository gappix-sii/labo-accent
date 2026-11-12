// Parcourt toutes les vues (téléphone et ordinateur) en relevant erreurs, violations CSP et Trusted Types.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out = '/tmp/smoke';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav'] });
const logs = [];
for (const [tag, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1440, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: tag === 'mob' ? 2 : 1, permissions: ['microphone'] });
  const p = await ctx.newPage();
  await p.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || ''))); });
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${tag} ${m.type()}: ${m.text()}`); });
  p.on('pageerror', e => logs.push(`${tag} pageerror: ${e.message}`));
  await p.goto(url); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${tag}-path.png` });
  await p.click('#prep');
  await p.waitForFunction(() => document.getElementById('engine').dataset.state === 'ready', null, { timeout: 30000 }).catch(() => logs.push(tag + ' ENGINE NOT READY'));
  for (const v of ['session', 'vocab', 'train', 'arena', 'profile']) {
    await p.click(`nav.bottom button[data-go=${v}]`); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${tag}-${v}.png`, fullPage: v === 'arena' || v === 'profile' });
  }
  await p.click('#toLocker'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${tag}-locker.png` });
  for (const t of ['skin', 'head', 'eyes', 'back', 'aura', 'theme']) { await p.click(`[data-ltab=${t}]`); await p.waitForTimeout(250); }
  await p.screenshot({ path: `${out}/${tag}-locker-theme.png` });
  await p.click('nav.bottom button[data-go=shop]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${tag}-shop.png`, fullPage: true });
  for (const t of ['skins', 'head', 'hand', 'back', 'theme', 'bonus']) { await p.click(`[data-ltab=${t}]`); await p.waitForTimeout(250); }
  await p.click('[data-ltab=back]'); await p.waitForTimeout(250); await p.click('.shopcard[data-prev^="back:"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${tag}-shop-back.png` });
  const info = await p.evaluate(() => ({ view: document.body.dataset.view, tt: !!window.trustedTypes, viol: window.__viol, nodes: document.querySelectorAll('.node').length }));
  logs.push(`${tag}: ${JSON.stringify(info)}`);
  // Une écriture HTML brute doit être refusée par Trusted Types.
  const blocked = await p.evaluate(() => { try { document.body.insertAdjacentHTML('beforeend', '<b id="x">x</b>'); return 'NON BLOQUÉ'; } catch (e) { return 'bloqué : ' + e.name; } });
  logs.push(`${tag} innerHTML brut → ${blocked}`);
  await ctx.close();
}
console.log(logs.join('\n'));
await b.close();
