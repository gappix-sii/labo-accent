import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out='/tmp/l', tag=process.argv[3]||'mob', vp = tag==='desk'?{width:1440,height:900}:{width:390,height:844};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav'] });
const ctx = await b.newContext({ viewport:vp, permissions:['microphone'] }); const p = await ctx.newPage(); const logs=[];
p.on('pageerror', e=>logs.push('pageerror: '+e.message)); p.on('console', m=>{ if(m.type()==='error') logs.push('console: '+m.text()); });
await p.goto(url); await p.waitForTimeout(500);
await p.click('#prep'); await p.waitForFunction(()=>document.getElementById('engine').dataset.state==='ready',null,{timeout:30000});
await p.click('nav.bottom button[data-go=vocab]'); await p.waitForTimeout(300);
await p.click('[data-seg=grammar]'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-ghome.png`});
await p.click('[data-g=present]'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-grule.png`, fullPage:true});
await p.click('#gStart'); await p.waitForTimeout(200);
for (let i=0;i<5;i++){
  if (await p.$('#pool')) { while (await p.$('#pool [data-p]')) { await p.click('#pool [data-p]'); } await p.click('#oCheck'); }
  else { await p.click('.gopt'); }
  await p.waitForSelector('#sheet'); await p.waitForTimeout(150);
  if (i===0) await p.screenshot({path:`${out}/${tag}-gsheet.png`});
  if (i===1) { await p.click('#sheet #rec'); await p.waitForTimeout(4500); logs.push('sayRes: '+await p.textContent('#sayRes')); }
  if (i===4 || i===3) await p.screenshot({path:`${out}/${tag}-gex${i}.png`});
  await p.click('#next'); await p.waitForTimeout(250);
}
await p.screenshot({path:`${out}/${tag}-gdone.png`});
await p.click('#doOk'); await p.waitForTimeout(400); while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(200); }
logs.push('after grammar view: '+await p.evaluate(()=>document.body.dataset.view));
await p.click('[data-seg=mistakes]'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-mhome.png`});
await p.click('#mGo'); await p.waitForTimeout(300);
for (let i=0;i<10;i++){ await p.click('.gopt'); await p.waitForSelector('#sheet'); if(i===0) await p.screenshot({path:`${out}/${tag}-mcard.png`}); await p.click('#next'); await p.waitForTimeout(150); }
await p.click('#doOk'); await p.waitForTimeout(300); while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(200); }
const st = await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('labo.v1')); return {grammar:s.grammar, mistakes:Object.keys(s.mistakes).length, xp:s.xp, view:document.body.dataset.view};});
console.log(JSON.stringify(st)); console.log(logs.join('\n')); await b.close();
