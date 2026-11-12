// Anti-triche, en conditions réelles (sans ?test) : sauvegarde modifiée à la main, fichier importé trafiqué,
// raccourcis de test inertes. Usage : node test/run-cheat.mjs http://127.0.0.1:8765/
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://127.0.0.1:8765/', out = '/tmp/cheat';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const p = await ctx.newPage();
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
const days = ['2026-11-10', '2026-11-11', '2026-11-12'];
const honest = { v: 2, news: 2, onboarded: true, xp: 1500, days, coins: 260, owned: ['phones', 'theme.nuit', 'theme.jour', 'cap'], stats: { chests: 1, perfect: 0, bosses: 0, quests: 4, boxes: 0 }, lessons: { 'u1-l1': { stars: 3, best: 90, d: '2026-11-12' } } };
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
const edit = fn => p.evaluate(f => { const s = JSON.parse(localStorage.getItem('labo.v1')); new Function('s', f)(s); localStorage.setItem('labo.v1', JSON.stringify(s)); }, fn);
const dlg = () => p.evaluate(() => document.getElementById('dlg').open ? document.getElementById('dlgTitle').textContent : '');
const closeDlg = async () => { if (await dlg()) { await p.click('#dlgOk'); await p.waitForTimeout(200); } };
await mkdirp();

// 1. Ancienne sauvegarde honnête : reprise telle quelle et scellée
await p.goto(url); await p.waitForTimeout(1500); await p.evaluate(h => { localStorage.clear(); localStorage.setItem('labo.v1', JSON.stringify(h)); }, honest);
await p.reload(); await p.waitForTimeout(1200);
let s = await S();
check(s.coins === 260 && s.owned.includes('cap') && !(await dlg()), `sauvegarde honnête intacte (pièces ${s.coins})`);
check(!!(await p.evaluate(() => localStorage.getItem('labo.v1.sig'))), 'sauvegarde scellée');
check(s.econ.earned === 260 + 70 && s.econ.spent === 70, `achats passés comptés comme dépenses (${s.econ.earned}/${s.econ.spent})`);

// 2. Pièces modifiées à la main (solde seul) : ramenées au solde réel
await edit('s.coins = 999999'); await p.reload(); await p.waitForTimeout(1000);
s = await S(); check(s.coins === 260 && /modifiée/.test(await dlg()), `pièces seules gonflées → ${s.coins}, avertissement affiché`);
await p.screenshot({ path: out + '/1-tamper.png' }); await closeDlg();

// 3. Pièces + journal gonflés : bornés par la progression
await edit('s.coins = 999999; s.econ.earned = 999999; s.econ.spent = 0'); await p.reload(); await p.waitForTimeout(1000);
s = await S(); check(s.coins < 4000 && /modifiée/.test(await dlg()), `pièces et journal gonflés → ${s.coins}`); await closeDlg();

// 4. Objets exclusifs ajoutés sans boîte : retirés
await edit('s.owned.push("saber", "galaxy", "phoenix", "skin.skunk.galaxy"); s.avatar.hand = "saber"');
await p.reload(); await p.waitForTimeout(1000);
s = await S(); check(!s.owned.includes('saber') && !s.owned.includes('phoenix') && s.avatar.hand === '', 'exclusivités ajoutées à la main retirées');
await closeDlg();

// 5. Sceau supprimé pour faire « ancienne version » : même contrôle
await edit('s.coins = 50000; s.econ.earned = 50000; s.econ.sealed = false; s.stats.boxes = 0'); await p.evaluate(() => localStorage.removeItem('labo.v1.sig'));
await p.reload(); await p.waitForTimeout(1000);
s = await S(); check(s.coins < 4000, `sceau supprimé → contrôle quand même (${s.coins})`); await closeDlg();

// 6. Fichier de sauvegarde trafiqué à l'import
const state = { ...honest, coins: 88888, econ: { earned: 88888, spent: 0, day: '', practice: 0, reps: {}, log: [], lastSeen: 0, sealed: true, capNoted: '' }, owned: [...honest.owned, 'saber', 'angel'] };
await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(500); await p.click('[data-ptab=settings]'); await p.waitForTimeout(200);
await p.setInputFiles('#importFile', { name: 'triche.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'labo-accent', format: 2, state, seal: 'AAAA' })) });
await p.waitForSelector('#dlg[open]'); await p.click('#dlgOk'); await p.waitForTimeout(800);
s = await S(); check(s.coins < 4000 && !s.owned.includes('saber') && /modifié/.test(await p.textContent('#dlgText')), `import trafiqué → ${s.coins} pièces, exclusivité retirée`);
await p.screenshot({ path: out + '/2-import.png' }); await closeDlg();

// 7. Export puis import sur le même appareil : sceau vérifié, rien ne change
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export')]);
const file = await (await dl.createReadStream()).toArray().then(c => Buffer.concat(c));
const before = await S();
await p.setInputFiles('#importFile', { name: 'moi.json', mimeType: 'application/json', buffer: file });
await p.waitForSelector('#dlg[open]'); await p.click('#dlgOk'); await p.waitForTimeout(800);
s = await S(); check(s.coins === before.coins && s.xp === before.xp && JSON.parse(file).seal, 'export → import sur le même appareil : identique (sceau vérifié)');

// 8. Raccourcis de test inertes hors du mode test : rareté forcée ignorée
await edit('s.coins = 300; s.econ.earned = s.econ.spent + 300'); // on se donne de quoi ouvrir 3 boîtes… ce qui casse le sceau
await p.reload(); await p.waitForTimeout(1000); await closeDlg();
const c = (await S()).coins;
if (c >= 300) {
  await p.evaluate(() => { window.__boxrar = 'mythic'; });
  await p.click('#hCoins'); await p.waitForTimeout(400);
  let myth = 0;
  for (let k = 0; k < 3; k++) {
    await p.click('[data-box=classic]', { force: true }); await p.waitForSelector('#boxDlg[open] #boxOpen'); await p.click('#boxOpen');
    await p.waitForSelector('#boxDlg .reveal', { timeout: 9000 }); if (await p.$('#boxDlg .reveal.r-mythic')) myth++;
    await p.click('#boxOk'); await p.waitForTimeout(300);
  }
  check(myth < 3, `rareté forcée ignorée hors test (${myth}/3 mythiques)`);
} else check(true, `rareté forcée : pas assez de pièces après contrôle (${c}), test sauté`);
console.log(logs.join('\n'));
await b.close();
if (logs.some(l => l.startsWith('FAIL') || l.startsWith('pageerror'))) process.exit(1);
async function mkdirp() { const fs = await import('node:fs'); fs.mkdirSync(out, { recursive: true }); }
