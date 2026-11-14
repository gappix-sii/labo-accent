import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
const p = await (await b.newContext()).newPage();
const logs=[]; p.on('console', m=>logs.push(m.type()+': '+m.text())); p.on('pageerror', e=>logs.push('pageerror: '+e.message));
await p.goto(process.argv[2]);
await p.waitForTimeout(4000);
const r = await p.evaluate(async()=>({ isolated: self.crossOriginIsolated, controlled: !!navigator.serviceWorker.controller, caches: await caches.keys(), sab: typeof SharedArrayBuffer }));
console.log(JSON.stringify(r));
// Le worker doit démarrer (en mode isolé) puis échouer seulement sur le téléchargement HF, bloqué dans ce bac à sable.
await p.click('#prep'); await p.waitForTimeout(6000);
console.log('engine:', await p.textContent('#engine'));
console.log(logs.filter(l=>!/DevTools/.test(l)).join('\n'));
await b.close();
