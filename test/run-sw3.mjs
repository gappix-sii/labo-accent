// Service worker : pré-cache vérifié, en-têtes de sécurité, mise à jour, refus d'un fichier modifié, anti-iframe.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
const logs = [], check = (c, m) => logs.push((c ? 'OK   ' : 'FAIL ') + m);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const serve = (dir, port) => { const s = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'ignore', 'pipe'] }); s.log = ''; s.stderr.on('data', d => { s.log += d; }); return new Promise(r => setTimeout(() => r(s), 800)); };
const copy = dir => { execSync(`rm -rf ${dir} && mkdir -p ${dir} && cd /home/claude/labo && cp -r index.html manifest.webmanifest sw.js css js fonts icons vendor data tools ${dir}/`); };

// 1. Version saine : installation vérifiée + en-têtes
{
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const ext = []; ctx.on('request', r => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') ext.push(r.url()); });
  p.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await p.goto('http://127.0.0.1:8765/'); await p.waitForTimeout(5000);
  const nav = await p.reload(); await p.waitForTimeout(800);
  const h = nav.headers();
  const r = { ...(await p.evaluate(async () => ({ controlled: !!navigator.serviceWorker.controller, isolated: self.crossOriginIsolated, caches: await caches.keys() }))), csp: h['content-security-policy'], xfo: h['x-frame-options'], pp: h['permissions-policy'], sw: nav.fromServiceWorker() };
  check(r.controlled && r.isolated, `contrôlée par le SW et isolée (${JSON.stringify(r.caches)})`);
  check(r.sw && /require-trusted-types-for 'script'/.test(r.csp) && /frame-ancestors 'none'/.test(r.csp) && r.xfo === 'DENY' && /microphone=\(self\)/.test(r.pp), 'en-têtes CSP / Trusted Types / anti-iframe / permissions');
  await p.click('#prep'); await p.waitForTimeout(7000);
  check(ext.every(u => /^https:\/\/huggingface\.co\/robg\/speako-phoneme-recognizer\/resolve\/ad0f63cd58fc1bb1e9c261a3b4135997a31c2e58\//.test(u)), 'seules requêtes externes : Hugging Face à la révision figée (' + ext.length + ')');
  logs.push('     toast : ' + await p.textContent('#toast'));
  await ctx.close();
}
// 2. Fichier modifié après la génération des empreintes : la version ne s'installe pas
{
  copy('/tmp/tamper'); appendFileSync('/tmp/tamper/css/app.css', '\n/* modifié */');
  const srv = await serve('/tmp/tamper', 8766);
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs = []; p.on('console', m => errs.push(m.text()));
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(5000);
  const r = await p.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return { controlled: !!navigator.serviceWorker.controller, active: !!(reg && reg.active), caches: await caches.keys() }; });
  check(!r.controlled && !r.active && !r.caches.some(k => k.startsWith('labo-') && k !== 'labo-dev'), 'fichier modifié : installation refusée ' + JSON.stringify(r));
  check(await p.$('.node') !== null, "l'appli reste utilisable (sans cache hors ligne)");
  await ctx.close(); srv.kill();
}
// 3. Mise à jour : nouvelle version vérifiée puis appliquée au lancement
{
  copy('/tmp/upd');
  const srv = await serve('/tmp/upd', 8767);
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8767/'); await p.waitForTimeout(5000);
  const v1 = await p.evaluate(() => caches.keys());
  appendFileSync('/tmp/upd/js/fx.js', '\n// v2\n'); execSync('node /tmp/upd/tools/build-sw.mjs');
  srv.log = '';
  await p.reload(); await p.waitForTimeout(6000);
  const v2 = await p.evaluate(async () => ({ keys: await caches.keys(), controlled: !!navigator.serviceWorker.controller }));
  check(v2.controlled && v2.keys.length === 1 && v2.keys[0] !== v1[0], `mise à jour appliquée au lancement : ${v1} → ${v2.keys}`);
  const wasm = (srv.log.match(/ort-wasm-simd-threaded\.asyncify\.wasm/g) || []).length, fxjs = (srv.log.match(/GET \/js\/fx\.js/g) || []).length;
  check(wasm === 0 && fxjs >= 1, `seul le fichier modifié est retéléchargé (wasm : ${wasm}, fx.js : ${fxjs})`);
  // Appli déjà ouverte depuis un moment : bouton « Mettre à jour »
  await p.waitForTimeout(8500);
  appendFileSync('/tmp/upd/js/fx.js', '\n// v3\n'); execSync('node /tmp/upd/tools/build-sw.mjs');
  await p.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  const bar = await p.waitForSelector('#updBar', { timeout: 15000 }).then(() => true).catch(() => false);
  check(bar, 'bouton « Mettre à jour » affiché');
  if (bar) { await Promise.all([p.waitForEvent('load', { timeout: 15000 }), p.click('#updGo')]); await p.waitForTimeout(1500);
    const v3 = await p.evaluate(() => caches.keys()); check(v3.length === 1 && v3[0] !== v2.keys[0], 'mise à jour appliquée après le clic : ' + v3); }
  await ctx.close(); srv.kill();
}
// 4. Affichée dans un cadre par un autre site : refus
{
  mkdirSync('/tmp/evil', { recursive: true });
  writeFileSync('/tmp/evil/index.html', '<!doctype html><iframe src="http://127.0.0.1:8765/" width="400" height="300"></iframe>');
  const srv = await serve('/tmp/evil', 8768);
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto('http://localhost:8768/'); await p.waitForTimeout(3000);
  const f = p.frames().find(x => x.url().includes('8765'));
  const txt = f ? await f.evaluate(() => document.body.innerText).catch(() => 'bloqué par le navigateur') : 'cadre bloqué';
  check(!f || /cadre/.test(txt) || /bloqué/.test(txt), 'dans un cadre : ' + txt.slice(0, 80));
  await ctx.close(); srv.kill();
}
console.log(logs.join('\n'));
await b.close();
