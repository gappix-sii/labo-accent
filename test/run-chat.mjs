import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out='/tmp/f', tag=process.argv[3]||'mob', vp = tag==='desk'?{width:1440,height:900}:{width:390,height:844};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav','--enable-unsafe-webgpu'] });
const ctx = await b.newContext({ viewport:vp, permissions:['microphone'] }); const p = await ctx.newPage(); const logs=[];
p.on('pageerror', e=>logs.push('pageerror: '+e.message)); p.on('console', m=>{ if(m.type()==='error') logs.push('console: '+m.text()); });
await p.goto(url); await p.waitForTimeout(500);
await p.click('nav.bottom button[data-go=train]'); await p.waitForTimeout(300);
await p.click('#toChat'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-setup.png`, fullPage:true});
await p.click('[data-sc=toilets]'); await p.waitForTimeout(800);
await p.fill('#cText', 'Excuse me, where is the toilets?'); await p.click('#cSend'); await p.waitForTimeout(800);
await p.click('#cMic'); await p.waitForTimeout(4500); await p.waitForTimeout(800);
await p.screenshot({path:`${out}/${tag}-chat.png`});
await p.click('#cEnd'); await p.waitForTimeout(500);
logs.push('view after end: '+await p.evaluate(()=>document.body.dataset.view));
// Écran Gemini (sans clé)
await p.click('#doOk'); await p.waitForTimeout(400); while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(200); }
await p.click('#toChat'); await p.waitForTimeout(300); await p.click('[data-eng=gemini]'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-gemini.png`, fullPage:true});
await p.fill('#gKey', 'bad key!'); await p.click('#gSave'); await p.waitForTimeout(200); logs.push('toast: '+await p.textContent('#toast'));
await p.click('[data-sc=cafe]'); await p.waitForTimeout(300); logs.push('toast2: '+await p.textContent('#toast'));
console.log(logs.join('\n')); await b.close();
