const o=document.getElementById('o'); const log=s=>{o.textContent+="\n"+s;};
const w=new Worker(new URL('../js/worker.js',import.meta.url),{type:'module'});
w.onerror=e=>log('WERR '+e.message);
w.onmessage=e=>{const m=e.data; if(m.type==='progress')return; log(JSON.stringify(m).slice(0,300));
 if(m.type==='ready'){const a=new Float32Array(16000*2); for(let i=0;i<a.length;i++)a[i]=Math.sin(i*0.05)*0.3*Math.random(); w.postMessage({type:'analyze',id:1,audio:a,local:true});}
 if(m.type==='result'||m.type==='error') document.title='DONE';};
w.postMessage({type:'init',local:true});
