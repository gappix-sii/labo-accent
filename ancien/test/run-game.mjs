import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out = '/tmp/g';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav','--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, permissions:['microphone'] });
const p = await ctx.newPage();
const logs=[]; p.on('console', m=>{ if(['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text()); }); p.on('pageerror', e=>logs.push('pageerror: '+e.message));
await p.goto(url); await p.waitForTimeout(700);
await p.screenshot({path: out+'/1-path.png'});
await p.click('#prep');
await p.waitForFunction(()=>document.getElementById('engine').dataset.state==='ready',null,{timeout:30000}).catch(()=>logs.push('ENGINE NOT READY'));
await p.click('.node.open'); await p.waitForTimeout(500);
await p.screenshot({path: out+'/2-lesson.png'});
for (let i=0;i<5;i++){
  await p.click('#rec');
  const ok = await p.waitForSelector('#sheet', {timeout:25000}).then(()=>true).catch(()=>false);
  if(!ok){ logs.push('NO SHEET at item '+i+' status='+await p.textContent('#status')); break; }
  await p.waitForTimeout(300);
  if(i===0) await p.screenshot({path: out+'/3-sheet.png'});
  await p.click('#next'); await p.waitForTimeout(400);
}
await p.waitForTimeout(600);
await p.screenshot({path: out+'/4-finish.png'});
await p.click('#cont'); await p.waitForTimeout(500);
for (let k=0;k<4;k++){ const c = await p.$('#cel[open]'); if(!c) break; if(k===0) await p.screenshot({path: out+'/5-cel.png'}); await p.click('#celOk'); await p.waitForTimeout(300); }
await p.waitForTimeout(500);
await p.screenshot({path: out+'/6-path-after.png'});
await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(300);
await p.screenshot({path: out+'/7-profile.png', fullPage:true});
await p.click('nav.bottom button[data-go=train]'); await p.waitForTimeout(300);
await p.screenshot({path: out+'/8-train.png'});
console.log('state:', await p.evaluate(()=>localStorage.getItem('labo.v1').slice(0,300)));
console.log(logs.join('\n'));
await b.close();
