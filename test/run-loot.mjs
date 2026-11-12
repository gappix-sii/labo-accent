// Boîtes à butin : achat, chaque rareté (animation), doublon, équipement, garantie, aucune violation de sécurité.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out = '/tmp/loot';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
await p.addInitScript(() => { if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify({ v: 2, news: 2, onboarded: true, xp: 11000, levelSeen: 15, coins: 8000 })); window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective)); });
p.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push('console ' + m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
await p.goto(url); await p.waitForTimeout(700);
await p.click('#hCoins'); await p.waitForTimeout(500);
check(await p.$('body[data-view=shop] [data-box=classic]') !== null, 'pièces du HUD → Shop, boîtes en tête');
await p.screenshot({ path: out + '/0-shop.png', fullPage: true });
for (const [k, rar, box] of [[1, 'common', 'classic'], [2, 'rare', 'classic'], [3, 'epic', 'epic'], [4, 'legendary', 'epic'], [5, 'mythic', 'mythic']]) {
  await p.evaluate(r => { window.__boxrar = r; }, rar);
  const before = await S();
  await p.click(`[data-box=${box}]`, { force: true }); await p.waitForSelector('#boxDlg[open] #boxOpen');
  if (k === 5) await p.screenshot({ path: out + '/5a-offer.png' });
  await p.click('#boxOpen');
  if (rar === 'mythic') { await p.waitForTimeout(2600); await p.screenshot({ path: out + '/5b-charge.png' }); }
  await p.waitForSelector('#boxDlg .reveal', { timeout: 8000 });
  await p.waitForTimeout(rar === 'mythic' ? 700 : 900);
  await p.screenshot({ path: `${out}/${k}-${rar}.png` });
  const s = await S(), name = await p.textContent('.rv-name');
  check(s.coins <= before.coins - (await p.evaluate(b => ({ classic: 100, epic: 260, mythic: 600 })[b], box)) + 500 && s.stats.boxes === before.stats.boxes + 1 && s.owned.length === before.owned.length + 1, `${rar} : « ${name} » (pièces ${before.coins} → ${s.coins})`);
  if (rar === 'mythic') { await p.click('#boxEquip'); await p.waitForTimeout(300); }
  await p.click('#boxOk'); await p.waitForTimeout(400);
}
let s = await S();
check(s.boxPity === 0, 'garantie remise à zéro après un mythique');
check(await p.evaluate(() => !!document.querySelector('#hAv .pouf')), 'avatar mis à jour');
await p.screenshot({ path: out + '/6-collection.png', fullPage: true });
// « Encore » enchaîne une deuxième boîte sans revenir à la boutique
await p.evaluate(() => { window.__boxrar = 'rare'; });
await p.click('[data-box=classic]', { force: true }); await p.waitForSelector('#boxDlg[open] #boxOpen'); await p.click('#boxOpen');
await p.waitForSelector('#boxDlg .reveal', { timeout: 8000 }); const n1 = (await S()).stats.boxes;
await p.click('#boxAgain'); await p.waitForSelector('#boxDlg .reveal', { timeout: 8000 }); await p.waitForTimeout(300);
check((await S()).stats.boxes === n1 + 1, 'bouton Encore');
await p.click('#boxOk'); await p.waitForTimeout(300);
// Pas assez de pièces : bouton désactivé, aucune dépense
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('labo.v1')); s.coins = 50; localStorage.setItem('labo.v1', JSON.stringify(s)); localStorage.removeItem('labo.v1.sig'); });
await p.reload(); await p.waitForTimeout(500); await p.click('#hCoins'); await p.waitForTimeout(400);
await p.click('[data-box=mythic]', { force: true }); await p.waitForSelector('#boxDlg[open]');
check(await p.isDisabled('#boxOpen') && (await S()).coins === 50, 'pas assez de pièces : rien n\'est dépensé');
await p.click('#boxClose');
// Skin mythique animé sur le profil
await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(600);
await p.screenshot({ path: out + '/7-profile.png' });
check((await p.evaluate(() => window.__viol)).length === 0, 'aucune violation CSP / Trusted Types');
console.log(logs.join('\n'));
await b.close();
