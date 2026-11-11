import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
const p = await b.newPage();
const logs=[]; p.on('console', m=>logs.push(m.type()+': '+m.text())); p.on('pageerror', e=>logs.push('pageerror: '+e.message));
await p.goto(process.argv[2]);
await p.waitForFunction(()=>document.title==='DONE',null,{timeout:60000}).catch(()=>logs.push('TIMEOUT'));
console.log(await p.textContent('#o')); console.log(logs.join('\n'));
await b.close();
