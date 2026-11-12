// Amis sans serveur, avec deux « appareils » (deux profils de navigateur) : échange de cartes, compagnon de l'ami
// avec ses cosmétiques, classement, code modifié refusé, usurpation signalée, duel complet aller-retour.
// Usage : node test/run-friends.mjs "http://127.0.0.1:8765/?test&fast"
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { webcrypto as wc } from 'node:crypto';
const url = process.argv[2], out = '/tmp/friends';
(await import('node:fs')).mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
async function device(name, state) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => logs.push(`${name} pageerror: ${e.message}`));
  await p.addInitScript(st => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective)); Object.defineProperty(navigator, 'share', { value: undefined }); if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify(st)); }, state);
  await p.goto(url); await p.waitForTimeout(900);
  return p;
}
const S = p => p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
const clip = p => p.evaluate(() => navigator.clipboard.readText());
// En test, on garde ?test&fast dans le lien (le vrai lien n'a pas de paramètres)
const openLink = async (p, text) => { const link = text.match(/https?:\S+/)[0].replace('#', '?test&fast#'); await p.goto(link); await p.waitForTimeout(1200); };
const base = { v: 2, news: 2, onboarded: true };
const A = await device('Alice', { ...base, player: 'Alice', xp: 2400, coins: 0, days: ['2026-11-12'], owned: ['phones', 'theme.nuit', 'theme.jour', 'skin.fox.arctic', 'tophat', 'angel'], avatar: { species: 'fox', skin: 'arctic', head: 'tophat', eyes: '', neck: '', hand: '', back: 'angel', aura: '', name: 'Flocon' } });
const B = await device('Bob', { ...base, player: 'Bob', xp: 900, days: ['2026-11-12'], owned: ['phones', 'theme.nuit', 'theme.jour', 'cap'], avatar: { species: 'skunk', skin: 'night', head: 'cap', eyes: '', neck: '', hand: '', back: '', aura: '', name: 'Pouf' } });

// 1. Alice partage sa carte, Bob ouvre le lien
await A.click('nav.bottom button[data-go=arena]'); await A.waitForTimeout(400);
await A.screenshot({ path: out + '/0-arena.png' });
await A.click('#toFriends'); await A.waitForTimeout(400); await A.click('#frShare'); await A.waitForTimeout(600);
const aliceLink = await clip(A);
check(/#c=LA1\./.test(aliceLink) && aliceLink.length < 1500, `lien de carte prêt (${aliceLink.length} caractères)`);
await openLink(B, aliceLink);
let sb = await S(B);
check(sb.social.friends.length === 1 && sb.social.friends[0].name === 'Alice', 'Bob a ajouté Alice en ouvrant son lien');
check(await B.$('body[data-view=friend]') && (await B.$$('.fp-stage .sp-fox')).length === 1 && (await B.$$('.fp-stage .av-back')).length === 1, 'profil d\'Alice : son renard avec haut-de-forme et ailes');
check(!/#c=/.test(B.url()), 'le code est effacé de la barre d\'adresse');
await B.screenshot({ path: out + '/1-profil-ami.png', fullPage: true });

// 2. Bob partage sa carte, Alice la colle
await B.click('#fpBack'); await B.waitForTimeout(300); await B.click('#frShare'); await B.waitForTimeout(600);
const bobLink = await clip(B);
await A.fill('#frIn', 'Voici ma carte : ' + bobLink); await A.click('#frAdd'); await A.waitForTimeout(800);
check((await S(A)).social.friends.some(f => f.name === 'Bob'), 'Alice a ajouté Bob en collant son lien');
await A.click('#fpBack'); await A.waitForTimeout(300);
const names = await A.$$eval('.board li .grow > b', els => els.map(e => e.textContent));
check(names[0] === 'Toi' && names[1] === 'Bob', `classement XP : ${names.join(' > ')}`);
await A.screenshot({ path: out + '/2-classement.png', fullPage: true });

// 3. Code modifié : refusé
const bad = bobLink.replace(/LA1\.(.{30})(.)/, (m, a, c) => `LA1.${a}${c === 'A' ? 'B' : 'A'}`);
await A.fill('#frIn', bad); await A.click('#frAdd'); await A.waitForTimeout(500);
check(/modifié|abîmé/.test(await A.textContent('#toast').catch(() => '') + await A.evaluate(() => document.body.innerText)), 'code modifié refusé');

// 4. Usurpation : une carte au nom de Bob, signée par une autre clé
const raw = JSON.parse(Buffer.from(bobLink.match(/LA1\.([^.]+)\./)[1], 'base64url').toString());
const pair = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
raw.pk = Buffer.from(await wc.subtle.exportKey('raw', pair.publicKey)).toString('base64url'); raw.xp = 999999; raw.n = 'Bob';
const body = Buffer.from(JSON.stringify(raw)).toString('base64url'), sig = Buffer.from(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode('labo-social:' + body))).toString('base64url');
await A.fill('#frIn', `LA1.${body}.${sig}`); await A.click('#frAdd'); await A.waitForSelector('#dlg[open]');
check(/autre appareil/.test(await A.textContent('#dlgTitle')), 'fausse carte de Bob : avertissement « signée par un autre appareil »');
await A.screenshot({ path: out + '/3-usurpation.png' });
await A.click('#dlgCancel'); await A.waitForTimeout(300);
check((await S(A)).social.friends.find(f => f.name === 'Bob').xp === 900, 'refusée : les vrais chiffres de Bob sont gardés');

// 5. Duel chrono : Alice défie Bob, Bob relève, Alice reçoit le résultat
const play = async p => { for (let k = 0; k < 80 && !(await p.$('body[data-view=duelend]')); k++) { const o = await p.$('#crOpts button:not([disabled])'); if (o) await o.click({ force: true }).catch(() => {}); await p.waitForTimeout(150); } await p.waitForSelector('body[data-view=duelend]', { timeout: 15000 }); };
await A.click('[data-fr]:not([data-fr=""])'); await A.waitForTimeout(300); await A.click('[data-duel=chrono]');
await play(A);
const aScore = (await S(A)).social.duels[0].mine;
await A.click('#duShare'); await A.waitForTimeout(500);
const duelLink = await clip(A);
await A.screenshot({ path: out + '/4-defi-pret.png' });
await openLink(B, duelLink); await B.waitForSelector('#dlg[open]');
check(/Alice te défie/.test(await B.textContent('#dlgTitle')), 'Bob reçoit le défi d\'Alice');
await B.click('#dlgOk'); await play(B);
const bd = (await S(B)).social.duels[0];
check(bd.theirs === aScore && bd.mine >= 0, `Bob a joué les mêmes questions : ${bd.mine} contre ${aScore}`);
await B.screenshot({ path: out + '/5-resultat-bob.png' });
await B.click('#duShare'); await B.waitForTimeout(500);
await openLink(A, await clip(B));
const ad = (await S(A)).social.duels[0];
check(ad.theirs === bd.mine && await A.$('body[data-view=duelend]'), `Alice voit le score final : ${ad.mine} – ${ad.theirs}`);
await A.screenshot({ path: out + '/6-resultat-alice.png' });
// Rouvrir le défi : un seul essai
await openLink(B, duelLink);
check((await S(B)).social.duels.length === 1, 'un défi ne se rejoue pas pour améliorer son score');
// 6. Premier lancement de l'appli via le vrai lien (sans mode test) : l'appli se recharge une fois, l'ami est ajouté quand même
const ctxC = await b.newContext({ viewport: { width: 390, height: 844 } }); const C = await ctxC.newPage();
C.on('pageerror', e => logs.push('Chloé pageerror: ' + e.message));
await C.goto(aliceLink.match(/https?:\S+/)[0]); await C.waitForTimeout(7000);
const sc = await C.evaluate(() => JSON.parse(localStorage.getItem('labo.v1') || 'null'));
check(sc && sc.social.friends.some(f => f.name === 'Alice'), 'nouvel appareil, premier lancement via le lien : Alice ajoutée malgré le rechargement');
await C.screenshot({ path: out + '/7-nouvel-appareil.png' });
for (const [n, p] of [['Alice', A], ['Bob', B]]) check((await p.evaluate(() => window.__viol)).length === 0, `${n} : aucune violation CSP / Trusted Types`);
console.log(logs.join('\n'));
await b.close();
if (logs.some(l => /^FAIL|pageerror/.test(l))) process.exit(1);
