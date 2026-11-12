// Stockage chiffré des secrets (clé API Gemini) : AES-GCM 256 bits avec une clé WebCrypto NON EXPORTABLE,
// conservée dans IndexedDB. Le secret n'est jamais écrit en clair sur le disque, ni dans localStorage,
// ni dans la sauvegarde de progression.
// Limite (honnête) : un script qui s'exécuterait dans la page pourrait demander le déchiffrement ;
// c'est la CSP, Trusted Types et l'échappement systématique qui empêchent ce cas.
const DB = "labo-secrets", STORE = "kv", WRAP = "wrap-key-v1", LEGACY = "labo.gkey";
const enc = new TextEncoder(), dec = new TextDecoder();

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await idb();
  try {
    return await new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
      const out = fn(st);
      t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  } finally { db.close(); }
}
const get = k => tx("readonly", st => st.get(k));
const put = (k, v) => tx("readwrite", st => st.put(v, k));
const del = k => tx("readwrite", st => st.delete(k));

async function wrapKey() {
  let key = await get(WRAP);
  if (!key) {
    key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await put(WRAP, key);
  }
  return key;
}

export const secretsAvailable = () => typeof indexedDB !== "undefined" && !!(globalThis.crypto && crypto.subtle);

export async function saveSecret(name, value) {
  const key = await wrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(name) }, key, enc.encode(value));
  await put("s:" + name, { iv, ct: new Uint8Array(ct), v: 1 });
}
export async function loadSecret(name) {
  const rec = await get("s:" + name);
  if (!rec || !rec.iv || !rec.ct) return "";
  const key = await get(WRAP);
  if (!key) return "";
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: rec.iv, additionalData: enc.encode(name) }, key, rec.ct);
    return dec.decode(pt);
  } catch (e) { return ""; }
}
export async function deleteSecret(name) { await del("s:" + name); }
export async function hasSecret(name) { return !!(await get("s:" + name)); }

// Ancienne version : la clé était en clair dans localStorage. On la chiffre puis on efface la copie en clair.
export async function migrateLegacy(name) {
  let old = "";
  try { old = localStorage.getItem(LEGACY) || ""; } catch (e) { return false; }
  if (!old) return false;
  try { await saveSecret(name, old); localStorage.removeItem(LEGACY); return true; } catch (e) { return false; }
}
