// Planche d'essayage : chaque accessoire sur chaque animal (une image par emplacement). Usage : node tools/sheet.mjs [base-url] [slots…]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://127.0.0.1:8765', slots = process.argv.slice(3).length ? process.argv.slice(3) : ['head', 'eyes', 'neck', 'hand', 'aura', 'back', 'skins'];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1800, height: 900 } });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERREUR', e.message));
for (const s of slots) {
  for (let from = 0; from < (s === 'skins' ? 1 : 40); from += 7) {
    await p.goto(`${base}/tools/sheet.html?${s === 'skins' ? 'mode=skins' : 'slot=' + s}&from=${from}&n=7`); await p.waitForSelector('body[data-ready]');
    if (!(await p.$$('th')).slice(10).length && from) break;
    const f = `/tmp/sheet-${s}-${from / 7}.png`; await p.locator('table').screenshot({ path: f }); console.log(f);
  }
}
await b.close();
