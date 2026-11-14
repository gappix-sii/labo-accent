// Phrases déjà fabriquées par la voix, gardées sur l'appareil (IndexedDB) :
// une phrase n'est fabriquée qu'une fois, puis rejouée instantanément, même après avoir fermé l'appli.
// Rien ne sort de l'appareil. En cas de souci (navigation privée, stockage plein), on fait sans.
const DB = "labo-voix", STORE = "clips", MAX = 300; // ≈ 250 Ko par phrase courte

let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }).catch(() => null);
  }
  return dbp;
}

function tx(mode, fn) {
  return db().then((d) => d && new Promise((res) => {
    try {
      const t = d.transaction(STORE, mode), s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
      t.onerror = t.onabort = () => res(undefined);
    } catch { res(undefined); }
  }));
}

const valid = (v) => v && Array.isArray(v.parts) && v.parts.every((p) => p instanceof Float32Array);

export async function getClip(key) {
  const v = await tx("readonly", (s) => s.get(key));
  return valid(v) ? v.parts : null;
}

export async function putClip(key, parts) {
  await tx("readwrite", (s) => { s.put({ parts, at: Date.now() }, key); });
  const n = await tx("readonly", (s) => s.count());
  if (n > MAX) { // trop de phrases gardées : on retire les plus anciennes
    await tx("readwrite", (s) => {
      const all = [];
      s.openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (c) { all.push([c.key, c.value.at || 0]); c.continue(); return; }
        all.sort((a, b) => a[1] - b[1]).slice(0, all.length - MAX).forEach(([k]) => s.delete(k));
      };
    });
  }
}
