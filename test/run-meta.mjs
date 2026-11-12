// Méta-jeu : boutique, coffres, bonus, défi chrono, défi du jour, boss, import piégé, code secret, thème clair.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import { UNITS } from '../js/game.js';
const url = process.argv[2], out = '/tmp/meta';
const u1 = Object.fromEntries(UNITS[0].lessons.map(l => [l.id, { stars: 2, best: 80, d: '2026-11-10' }]));
const seed = { v: 2, news: 2, onboarded: true, xp: 1200, coins: 1000, chests: ['wood', 'gold', 'legend'], lessons: u1, levelSeen: 5, days: ['2026-11-10', '2026-11-11'] };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav','--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['microphone', 'clipboard-read', 'clipboard-write'], acceptDownloads: true });
const p = await ctx.newPage();
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
await p.addInitScript(s => { if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', s); window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective)); }, JSON.stringify(seed));
p.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push('console ' + m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
const cels = async () => { for (let k = 0; k < 8; k++) { if (!await p.$('#cel[open]')) break; await p.click('#celOk'); await p.waitForTimeout(250); } };
await p.goto(url); await p.waitForTimeout(800);
await p.screenshot({ path: out + '/0-hud.png' });

// Boutique
await p.click('#hMe'); await p.waitForTimeout(300); await p.click('#toLocker'); await p.waitForTimeout(300);
await p.click('[data-ltab=head]'); await p.waitForTimeout(200);
await p.click('[data-act=buy][data-id=cap]'); await p.waitForSelector('#dlg[open]'); await p.click('#dlgOk'); await p.waitForTimeout(400);
let s = await S(); check(s.owned.includes('cap') && s.avatar.head === 'cap' && s.coins === 930, `achat casquette (pièces ${s.coins})`);
await p.click('[data-ltab=species]'); await p.waitForTimeout(200);
await p.click('[data-act=sp][data-id=fox]'); await p.waitForTimeout(300);
s = await S(); check(s.avatar.species === 'fox', 'renard choisi');
await p.screenshot({ path: out + '/1-locker-fox.png' });
await p.click('[data-ltab=bonus]'); await p.waitForTimeout(200);
await p.click('[data-act=buy][data-id=freeze]'); await p.waitForTimeout(300);
await p.click('[data-act=buy][data-id=boost]'); await p.waitForTimeout(300);
s = await S(); check(s.freezes === 1 && s.boostUntil > Date.now(), 'gel de série + potion');
check(await p.isVisible('#hBoost'), 'potion visible dans le HUD');
await p.fill('#avName', 'Roux'); await p.press('#avName', 'Tab'); await p.waitForTimeout(200);
s = await S(); check(s.avatar.name === 'Roux', 'compagnon renommé');

// Coffres
for (let k = 0; k < 3; k++) {
  await p.click('#hChest', { force: true }); await p.waitForSelector('#chestDlg[open]'); await p.waitForTimeout(300);
  if (k === 2) await p.screenshot({ path: out + '/2-chest-closed.png' });
  await p.click('#chestTap'); await p.waitForSelector('#chestOk', { timeout: 5000 }); await p.waitForTimeout(600);
  if (k === 2) await p.screenshot({ path: out + '/3-chest-open.png' });
  await p.click('#chestOk'); await p.waitForTimeout(300);
}
s = await S(); check(s.chests.length === 0 && s.stats.chests === 3 && s.owned.length >= 4, `3 coffres ouverts (objets : ${s.owned.length}, pièces : ${s.coins})`);
check(await p.isHidden('#hChest'), 'icône coffre cachée quand vide');

// Défi chrono
await p.click('nav.bottom button[data-go=arena]'); await p.waitForTimeout(400);
await p.screenshot({ path: out + '/4-arena.png' });
await p.click('#arChrono'); await p.waitForTimeout(400);
let n = 0;
while (await p.$('body[data-view=chrono]') && n < 60) { const o = await p.$('.cr-opt:not(:disabled)'); if (o) { await o.click({ force: true }).catch(() => {}); n++; if (n === 3) await p.screenshot({ path: out + '/5-chrono.png' }); } await p.waitForTimeout(300); }
await p.waitForSelector('body[data-view=cfinish]', { timeout: 15000 }); await p.waitForTimeout(1200);
await p.screenshot({ path: out + '/6-chrono-end.png' });
s = await S(); check(s.chrono.runs === 1 && s.chrono.best.length === 1 && s.trophies >= 0, `défi chrono (${n} réponses, score ${s.chrono.best[0] && s.chrono.best[0].score}, trophées ${s.trophies})`);
await p.click('#crShare'); await p.waitForTimeout(300);
await p.click('#crOk'); await p.waitForTimeout(300); await cels();
await p.click('#arDaily'); await p.waitForTimeout(300);
n = 0; while (await p.$('body[data-view=chrono]') && n < 60) { const o = await p.$('.cr-opt:not(:disabled)'); if (o) { await o.click({ force: true }).catch(() => {}); n++; } await p.waitForTimeout(300); }
await p.waitForSelector('body[data-view=cfinish]', { timeout: 15000 });
s = await S(); check(s.chrono.daily.day && s.chrono.runs === 2, 'défi du jour joué');
await p.click('#crOk'); await p.waitForTimeout(300); await cels();

// Boss de l'unité 1
await p.click('nav.bottom button[data-go=path]'); await p.waitForTimeout(500);
await p.click('#prep').catch(() => {});
await p.waitForFunction(() => document.getElementById('engine').dataset.state === 'ready', null, { timeout: 30000 }).catch(() => logs.push('ENGINE NOT READY'));
await p.click('.bossnode[data-boss=u1]', { force: true }); await p.waitForTimeout(500);
await p.screenshot({ path: out + '/7-boss.png' });
for (let i = 0; i < 8 && await p.$('body[data-view=lesson]'); i++) {
  await p.click('#rec');
  if (!await p.waitForSelector('#sheet', { timeout: 25000 }).then(() => true).catch(() => false)) { logs.push('pas de résultat boss ' + i); break; }
  await p.waitForTimeout(400); if (i === 0) await p.screenshot({ path: out + '/8-boss-hit.png' });
  await p.click('#next'); await p.waitForTimeout(400);
}
await p.waitForSelector('body[data-view=bfinish]', { timeout: 5000 }).catch(() => {});
await p.waitForTimeout(800); await p.screenshot({ path: out + '/9-boss-end.png' });
s = await S(); check(s.bosses.u1 && s.bosses.u1.won, 'boss vaincu');
await p.click('#bfOk'); await p.waitForTimeout(300); await cels();
check(await p.$('.bossnode.won[data-boss=u1]') !== null, 'couronne sur le parcours');

// Export puis import d'un fichier piégé
await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(300);
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export')]);
check(/labo-accent-.*\.json/.test(dl.suggestedFilename()), 'export : ' + dl.suggestedFilename());
writeFileSync('/tmp/evil.json', '{"app":"labo-accent","format":2,"state":{"__proto__":{"pwn":1},"xp":50,"coins":"9999999","player":"<img src=x onerror=alert(1)>","history":[{"d":"2026-11-01","s":80,"t":"<script>alert(1)</script>"}],"avatar":{"species":"dragon","name":"\\u202eevil"}}}');
await p.setInputFiles('#importFile', '/tmp/evil.json'); await p.waitForSelector('#dlg[open]'); await p.click('#dlgOk'); await p.waitForTimeout(500);
s = await S();
check(s.xp === 50 && s.coins === 0 && s.avatar.species === 'skunk' && s.avatar.name === 'evil', 'import piégé assaini');
check(await p.evaluate(() => !document.querySelector('img[src="x"]') && ({}).pwn === undefined), 'aucune injection HTML ni pollution');
check((await p.textContent('.player-name')).includes('<img'), 'pseudo affiché comme du texte');

// Code secret, thème clair
await p.keyboard.press('Escape');
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await p.keyboard.press(k);
await p.waitForSelector('#cel[open]', { timeout: 3000 }).catch(() => {});
await p.screenshot({ path: out + '/10-secret.png' });
await cels();
s = await S(); check(s.secret && s.owned.includes('controller'), 'code secret');
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('labo.v1')); s.theme = 'jour'; localStorage.setItem('labo.v1', JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(700);
await p.screenshot({ path: out + '/11-jour.png' });
const v = await p.evaluate(() => window.__viol);
check(v.length === 0, 'aucune violation CSP / Trusted Types ' + JSON.stringify(v));
console.log(logs.join('\n'));
await b.close();
