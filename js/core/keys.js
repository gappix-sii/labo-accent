// Clé Gemini de l'utilisateur (phase 5) : gardée dans le navigateur de cet appareil, sous une entrée à part
// (« labo.gemini »). Jamais dans la sauvegarde « labo.v2 » (donc jamais dans le futur transfert par QR code),
// ni dans le dépôt, ni dans une adresse. Module pur, sans DOM (test/keys.test.mjs).
export const KEY_STORE = "labo.gemini";

// Clés Google : lettres, chiffres, « - », « _ » et « . » (« AIza… », 39 caractères aujourd'hui).
// Forme volontairement large, pour ne pas refuser une clé d'un nouveau format ; jamais d'espace.
const KEY_RE = /^[A-Za-z0-9_.-]{30,200}$/;

// Clé nettoyée (espaces autour retirés), ou null si elle n'a pas la forme d'une clé.
export function cleanKey(raw) {
  const k = typeof raw === "string" ? raw.trim() : "";
  return KEY_RE.test(k) ? k : null;
}

const store = (s) => s || globalThis.localStorage;

// Clé enregistrée, ou null (aucune, abîmée, ou stockage bloqué).
export function loadKey(storage) {
  try { return cleanKey(store(storage).getItem(KEY_STORE)); } catch { return null; }
}

// Enregistre la clé collée. Renvoie "ok", "bad" (pas la forme d'une clé) ou "storage" (stockage bloqué ou plein).
export function saveKey(raw, storage) {
  const k = cleanKey(raw);
  if (!k) return "bad";
  try { store(storage).setItem(KEY_STORE, k); return "ok"; } catch { return "storage"; }
}

export function clearKey(storage) {
  try { store(storage).removeItem(KEY_STORE); return true; } catch { return false; }
}

// Pour l'affichage : début et fin seulement (« AIza…f3Kq »).
export const maskKey = (k) => (typeof k === "string" && k.length > 8 ? `${k.slice(0, 4)}…${k.slice(-4)}` : "");
