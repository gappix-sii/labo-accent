import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2], out='/tmp/d';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/home/claude/labo/test/fake.wav'] });
const logs=[];
for (const [name,vp] of [['desk',{width:1440,height:900}],['mob',{width:390,height:844}]]) {
  const ctx = await b.newContext({ viewport:vp, permissions:['microphone'] });
  const p = await ctx.newPage(); p.on('pageerror', e=>logs.push(name+' pageerror: '+e.message)); p.on('console', m=>{ if(m.type()==='error') logs.push(name+': '+m.text()); });
  await p.goto(url); await p.waitForTimeout(600);
  await p.click('#prep');
  await p.waitForFunction(()=>document.getElementById('engine').dataset.state==='ready',null,{timeout:30000});
  await p.screenshot({path:`${out}/${name}-path.png`});
  await p.click('.node.open'); await p.waitForTimeout(400);
  await p.keyboard.press('Space');
  await p.waitForSelector('#sheet',{timeout:25000}).catch(()=>logs.push(name+' no sheet'));
  await p.waitForTimeout(300);
  await p.screenshot({path:`${out}/${name}-lesson.png`});
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.click('#quit'); await p.waitForTimeout(300); const d = await p.$('#dlg[open]'); if (d) await p.click('#dlgOk');
  await p.waitForTimeout(300);
  await p.click('nav.bottom button[data-go=train]'); await p.waitForTimeout(300);
  await p.screenshot({path:`${out}/${name}-train.png`});
  await p.click('nav.bottom button[data-go=profile]'); await p.waitForTimeout(300);
  await p.screenshot({path:`${out}/${name}-profile.png`});
  await ctx.close();
}
console.log(logs.join('\n')||'no errors'); await b.close();
