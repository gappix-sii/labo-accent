// Sceau de la sauvegarde : HMAC-SHA-256 calculé avec une clé WebCrypto NON EXPORTABLE gardée dans IndexedDB.
// Modifier la progression à la main (outils du navigateur, fichier exporté) casse le sceau : l'appli le voit au
// démarrage et ramène pièces et objets à ce que la progression justifie (voir economy.audit).
// Limite (honnête) : sans serveur, quelqu'un qui maîtrise les outils de développement peut toujours exécuter du
// code dans la page. Le sceau arrête les triches faciles ; il ne remplace pas un serveur de confiance.
import { kvGet, kvPut } from "./secret.js";

const KEY_ID = "seal-hmac-v1";
const enc = new TextEncoder();
let keyP = null, fresh = false;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export const sealAvailable = () => typeof indexedDB !== "undefined" && !!(globalThis.crypto && crypto.subtle);

// Clé de l'appareil. fresh = true si elle vient d'être créée (premier lancement, ou stockage effacé).
export function sealKey() {
  if (!keyP) keyP = (async () => {
    let key = await kvGet(KEY_ID);
    if (!key) {
      key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
      await kvPut(KEY_ID, key); fresh = true;
    }
    return key;
  })().catch(() => null);
  return keyP;
}
export const keyIsFresh = () => fresh;
export async function sign(text) {
  const key = await sealKey();
  if (!key) return "";
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode("labo-seal:" + text)));
}
export async function verify(text, sig) {
  if (typeof sig !== "string" || !sig || sig.length > 100) return false;
  const key = await sealKey();
  if (!key) return false;
  try { return await crypto.subtle.verify("HMAC", key, unb64(sig), enc.encode("labo-seal:" + text)); } catch (e) { return false; }
}
