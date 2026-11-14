import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out='/tmp/s', vp = process.argv[3]==='desk'?{width:1440,height:900}:{width:390,height:844};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav'] });
const ctx = await b.newContext({ viewport:vp, permissions:['microphone'] });
const p = await ctx.newPage(); const logs=[];
p.on('pageerror', e=>logs.push('pageerror: '+e.message)); p.on('console', m=>{ if(m.type()==='error') logs.push('console: '+m.text()); });
const tag = process.argv[3]||'mob';
await p.goto(url); await p.waitForTimeout(500);
await p.click('#prep'); await p.waitForFunction(()=>document.getElementById('engine').dataset.state==='ready',null,{timeout:30000});
// Vocabulaire
await p.click('nav.bottom button[data-go=vocab]'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-vocab.png`});
await p.click('.chip[data-lv=B2]'); await p.waitForTimeout(200);
// Séance
await p.click('nav.bottom button[data-go=session]'); await p.waitForTimeout(300);
await p.click('.chip[data-min="15"]'); await p.waitForTimeout(200);
await p.screenshot({path:`${out}/${tag}-session.png`});
await p.click('#sGo'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-block.png`});
let steps=0, shots={};
while (steps++ < 80) {
  const v = await p.evaluate(()=>document.body.dataset.view);
  if (v==='block') { await p.click('#bGo'); await p.waitForTimeout(300); continue; }
  if (v==='vcard') {
    if (!shots.vcard) { shots.vcard=1; await p.click('#rec'); await p.waitForSelector('#sheet',{timeout:25000}); await p.waitForTimeout(300); await p.screenshot({path:`${out}/${tag}-vsheet.png`}); await p.click('#next'); await p.waitForTimeout(300); continue; }
    if (await p.$('#reveal')) { await p.click('#reveal'); await p.waitForTimeout(150); }
    if (!shots.rev) { shots.rev=1; await p.screenshot({path:`${out}/${tag}-vreveal.png`}); }
    await p.click(Math.random()<0.7?'#knew':'#didnt'); await p.waitForTimeout(150); continue;
  }
  if (v==='lesson') { await p.click('#rec'); const ok=await p.waitForSelector('#sheet',{timeout:25000}).then(()=>1).catch(()=>0); if(!ok){logs.push('no sheet');break;} await p.click('#next'); await p.waitForTimeout(250); continue; }
  if (v==='vfinish'||v==='finish') { if(!shots[v]){shots[v]=1; await p.screenshot({path:`${out}/${tag}-${v}.png`});} await p.click(v==='vfinish'?'#vfOk':'#cont'); await p.waitForTimeout(400);
    while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(250); } continue; }
  if (v==='gpoint') { if (await p.$('#gStart')) { await p.click('#gStart'); await p.waitForTimeout(150); continue; }
    if (await p.$('#pool')) { while (await p.$('#pool [data-p]')) await p.click('#pool [data-p]'); await p.click('#oCheck'); } else await p.click('.gopt');
    await p.waitForSelector('#sheet'); await p.click('#next'); await p.waitForTimeout(150); continue; }
  if (v==='mcard') { await p.click('.gopt'); await p.waitForSelector('#sheet'); await p.click('#next'); await p.waitForTimeout(150); continue; }
  if (v==='done') { await p.click('#doOk'); await p.waitForTimeout(400); while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(250); } continue; }
  if (v==='send') { await p.screenshot({path:`${out}/${tag}-send.png`}); await p.click('#seOk'); await p.waitForTimeout(400); while (await p.$('#cel[open]')) { await p.click('#celOk'); await p.waitForTimeout(250); } break; }
  logs.push('unexpected view '+v); break;
}
const st = await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('labo.v1')); return {xp:s.xp, sessions:s.sessions, vocab:Object.keys(s.vocab).length, lessons:Object.keys(s.lessons), badges:s.badges, view:document.body.dataset.view};});
console.log(JSON.stringify(st)); console.log(logs.join('\n')||'no errors'); await b.close();
