// Voix naturelle : activation depuis les Réglages, lecture par l'audio de la page, réouverture, repli sur la voix de l'appareil.
// Usage : node test/run-tts.mjs "http://127.0.0.1:8765/?test"   (faux modèle : tools/make-test-tts.py)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const state = { v: 2, news: 2, onboarded: true, player: 'Jojo', xp: 300 };
const init = st => {
  window.__viol = []; window.__starts = 0; window.__sys = 0;
  document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective));
  const s0 = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.sampleRate === 24000) window.__starts++; return s0.apply(this, a); };
  if ('speechSynthesis' in window) { const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.__sys++; return sp(u); }; }
  if (!localStorage.getItem('labo.v1')) localStorage.setItem('labo.v1', JSON.stringify(st));
};
const settings = async p => { await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(500); await p.click('[data-ptab=settings]'); await p.waitForTimeout(300); };

process.on('unhandledRejection', e => { console.log(logs.join('\n')); console.log('ERREUR', String(e).slice(0, 300)); process.exit(1); });
const ctx = await b.newContext(), p = await ctx.newPage();
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') logs.push('console: ' + m.text()); });
await p.addInitScript(init, state);
await p.goto(url); await p.waitForTimeout(900);
await settings(p);
check(await p.isVisible('#ttsOn'), 'bouton « Activer la voix naturelle » visible');
await p.click('#ttsOn');
await p.waitForSelector('#ttsBox .pill.good', { timeout: 60000 }).catch(() => {});
check(await p.isVisible('#ttsBox .pill.good'), 'voix naturelle prête (faux modèle)');
await p.waitForTimeout(800);
const sel = await p.$eval('#voice', s => ({ v: s.value, n: [...s.options].filter(o => o.value.startsWith('kokoro:')).length }));
check(sel.v === 'kokoro:af_heart' && sel.n === 3, `3 voix naturelles dans la liste, Heart choisie (${JSON.stringify(sel)})`);
const s1 = await p.evaluate(() => window.__starts);
check(s1 >= 1, `phrase d'accueil jouée par la voix naturelle (${s1} morceau)`);
const sys0 = await p.evaluate(() => window.__sys);
await p.click('#tryVoice'); await p.waitForTimeout(1500);
const s2 = await p.evaluate(() => window.__starts);
check(s2 > s1 && (await p.evaluate(() => window.__sys)) === sys0, `« Tester la voix » : voix naturelle, pas la voix de l'appareil (${s2 - s1} morceau)`);
await p.selectOption('#voice', 'kokoro:am_michael', { timeout: 3000 }); await p.click('#tryVoice'); await p.waitForTimeout(1200);
check((await p.evaluate(() => window.__starts)) > s2, 'voix Michael jouée');
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('labo.v1')));
check(saved.tts === true && saved.voice === 'kokoro:am_michael', 'choix enregistré (tts, voix)');

// Réouverture : la voix se prépare toute seule (modèle déjà sur l'appareil), sans rien demander.
await p.reload(); await p.waitForTimeout(3500);
await settings(p);
check(await p.isVisible('#ttsBox .pill.good') && await p.isVisible('#ttsOff'), 'après réouverture : prête automatiquement');
const s3 = await p.evaluate(() => window.__starts);
await p.click('#tryVoice'); await p.waitForTimeout(1200);
check((await p.evaluate(() => window.__starts)) > s3, 'après réouverture : lecture naturelle');
// Interruption : une nouvelle phrase coupe la précédente
await p.evaluate(() => { document.querySelector('#tryVoice').click(); document.querySelector('#tryVoice').click(); });
await p.waitForTimeout(1200);
await p.click('#ttsOff'); await p.waitForTimeout(400);
const sys1 = await p.evaluate(() => window.__sys);
await p.click('#tryVoice'); await p.waitForTimeout(600);
check(await p.isVisible('#ttsOn') && (await p.evaluate(() => window.__sys)) > sys1, 'désactivée : retour à la voix de l\'appareil');
check((await p.evaluate(() => window.__viol)).length === 0, 'aucune violation CSP');
await ctx.close();

// Repli : modèle introuvable -> message clair, la voix de l'appareil prend le relais.
const ctx2 = await b.newContext(), q = await ctx2.newPage();
q.on('pageerror', e => logs.push('pageerror2: ' + e.message));
await q.route('**/test/model/onnx-community/Kokoro-82M-v1.0-ONNX/onnx/**', r => r.fulfill({ status: 404, body: '' }));
await q.addInitScript(init, { ...state, tts: true, voice: 'kokoro:af_heart' });
await q.goto(url); await q.waitForTimeout(4000);
await settings(q);
check(await q.isVisible('#ttsBox .pill.bad'), 'modèle absent : statut « erreur » affiché');
const sy = await q.evaluate(() => window.__sys);
await q.click('#tryVoice'); await q.waitForTimeout(800);
check((await q.evaluate(() => window.__sys)) > sy && (await q.evaluate(() => window.__starts)) === 0, 'modèle absent : la voix de l\'appareil parle à la place');
await ctx2.close();

await b.close();
console.log(logs.join('\n'));
if (logs.some(l => !l.startsWith('OK'))) process.exit(1);
