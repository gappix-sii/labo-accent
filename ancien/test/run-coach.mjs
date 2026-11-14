// Mon coach : accueil personnalisé, modes, mémoire (notes, mots) visible et effaçable, mains libres.
// Usage : node test/run-coach.mjs "http://127.0.0.1:8765/?test"
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out = '/tmp/coach', logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
(await import('node:fs')).mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav'] });
const state = { v: 2, news: 2, onboarded: true, player: 'Jojo', xp: 900, avatar: { species: 'panda', skin: '', head: '', eyes: '', neck: '', hand: '', back: '', aura: '', name: 'Mochi' } };
for (const [tag, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1366, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, permissions: ['microphone'] }), p = await ctx.newPage();
  p.on('pageerror', e => logs.push(`${tag} pageerror: ${e.message}`));
  await p.addInitScript(st => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective)); if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify(st)); }, state);
  await p.goto(url); await p.waitForTimeout(800);
  await p.click('nav.bottom button[data-go=train]'); await p.waitForTimeout(300);
  check((await p.textContent('#toChat')).includes('Mochi'), `${tag} : Pratique propose « Parler à mon coach Mochi »`);
  await p.click('#toChat'); await p.waitForTimeout(400);
  check((await p.$$('[data-cm]')).length === 3 && await p.isVisible('#cVoice'), `${tag} : 3 modes de coaching + proposition de voix naturelle`);
  await p.screenshot({ path: `${out}/${tag}-setup.png`, fullPage: true });
  await p.click('[data-cm=prep]'); await p.waitForTimeout(200);
  check((await p.textContent('#toast')).includes('moment à préparer'), `${tag} : « Préparer » demande d'abord la situation`);
  await p.fill('#cPrep', 'un entretien d\'embauche jeudi'); await p.click('[data-cm=prep]'); await p.waitForTimeout(900);
  check((await p.textContent('.msg.ai .en')).includes('Jojo'), `${tag} : le coach accueille par le prénom`);
  await p.fill('#cText', 'I am agree, I look forward to it'); await p.click('#cSend'); await p.waitForTimeout(900);
  check(await p.isVisible('.msg.ai .newword') && (await p.textContent('.msg.ai .memo')).includes('London'), `${tag} : nouveau mot et note affichés dans la réponse`);
  const st1 = await p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')).coach);
  check(st1 && st1.notes.length === 1 && st1.words.length === 1 && st1.words[0].fr === 'avoir hâte de', `${tag} : mémoire du coach enregistrée`);
  await p.screenshot({ path: `${out}/${tag}-chat.png` });
  // Mains libres : le micro démarre seul, puis se relance après la réponse
  const n0 = (await p.$$('.msg.me')).length;
  await p.evaluate(() => document.querySelector('#cHands').click()); await p.waitForTimeout(500);
  check(await p.evaluate(() => document.querySelector('#cMic').classList.contains('on')), `${tag} : mains libres → le micro écoute`);
  await p.waitForTimeout(6500);
  const n1 = (await p.$$('.msg.me')).length;
  check(n1 > n0, `${tag} : mains libres → message envoyé sans toucher l'écran (${n1 - n0})`);
  await p.evaluate(() => document.querySelector('#cHands').click());
  if (await p.evaluate(() => document.querySelector('#cMic').classList.contains('on'))) await p.click('#cMic');
  await p.waitForTimeout(1200);
  await p.click('#cEnd'); await p.waitForTimeout(600);
  check((await p.textContent('#view')).includes('nouveau mot'), `${tag} : bilan : mots rangés dans « Mon coach »`);
  await p.click('#doOk'); await p.waitForTimeout(400);
  while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(200); }
  await p.click('#toChat'); await p.waitForTimeout(400);
  check((await p.textContent('.coach-home .bubble')).includes('revoir'), `${tag} : 2ᵉ visite : le coach se souvient`);
  await p.click('.coach-mem summary'); await p.waitForTimeout(200);
  check((await p.$$('.coach-mem .notes li')).length === 1 && (await p.$$('.coach-mem [data-say]')).length === 1, `${tag} : notes et mots visibles`);
  await p.fill('#cGoal', 'Parler en voyage'); await p.press('#cGoal', 'Tab');
  await p.click('[data-dn="0"]'); await p.waitForTimeout(300);
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')).coach);
  check(st2.notes.length === 0 && st2.goal === 'Parler en voyage' && st2.n === 1, `${tag} : note oubliée, objectif gardé, 1 séance comptée`);
  check((await p.evaluate(() => window.__viol)).length === 0, `${tag} : aucune violation CSP`);
  await ctx.close();
}
await b.close();
console.log(logs.join('\n'));
if (logs.some(l => !l.startsWith('OK'))) process.exit(1);
