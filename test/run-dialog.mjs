import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out='/tmp/c', tag=process.argv[3]||'mob', vp = tag==='desk'?{width:1440,height:900}:{width:390,height:844};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav'] });
const ctx = await b.newContext({ viewport:vp, permissions:['microphone'] }); const p = await ctx.newPage(); const logs=[];
p.on('pageerror', e=>logs.push('pageerror: '+e.message)); p.on('console', m=>{ if(m.type()==='error') logs.push('console: '+m.text()); });
// Le faux modèle donne des scores ~0 : on force un score élevé en remplaçant l'évaluation pour tester le déroulé.
await p.addInitScript(()=>{ window.__forceScore = true; });
await p.goto(url); await p.waitForTimeout(500);
await p.click('#prep'); await p.waitForFunction(()=>document.getElementById('engine').dataset.state==='ready',null,{timeout:30000});
await p.click('nav.bottom button[data-go=train]'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-train.png`});
// Écoute
await p.click('[data-listen=cafe]'); await p.waitForTimeout(300);
const chips = await p.$$('.wchip'); for (const c of chips.slice(0,5)) await c.click();
await p.click('#lCheck'); await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${tag}-listen.png`, fullPage:true});
await p.click('#lRole'); await p.waitForTimeout(1500);
await p.screenshot({path:`${out}/${tag}-dialog-start.png`});
for (let i=0;i<8;i++){
  const v = await p.evaluate(()=>document.body.dataset.view); if (v!=='dialog') break;
  await p.waitForSelector('#rec',{timeout:20000}).catch(()=>{});
  if (i===1) { const h = await p.$('#dHint'); if (h) await h.click(); }
  await p.click('#rec');
  await p.waitForFunction(()=>!document.querySelector('#rec') || document.querySelector('#status').textContent.includes('compris'),null,{timeout:25000}).catch(()=>{});
  const st = await p.evaluate(()=>{const s=document.querySelector('#status'); return s? s.textContent : 'accepted';});
  logs.push('turn '+i+': '+st.slice(0,60));
  if (i===1) await p.screenshot({path:`${out}/${tag}-dialog-turn.png`});
  if (st.includes('compris')) break;
  await p.waitForTimeout(800);
}
console.log(logs.join('\n')); await b.close();
