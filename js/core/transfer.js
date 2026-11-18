// Transfert de la progression d'un appareil à l'autre (phase 7) : la sauvegarde devient un court code texte,
// mis dans un lien « …#transfert/<code> » (la partie après # n'est jamais envoyée au serveur) que le QR code contient.
// Module pur (sans DOM), testé dans test/transfer.test.mjs.
// Ce qui part : progression, vocabulaire, écoute, fautes, jeu, voix et effets choisis.
// Ce qui ne part jamais : la clé Gemini (gardée à part, js/core/keys.js), le journal et le dernier résultat du banc de test,
// « moteur / voix déjà téléchargés » (chaque appareil télécharge les siens).
import { sanitize, VERSION } from "./store.js";
import { seedFrom } from "./game.js";
import { ALL_WORDS } from "../content/vocab.js";
import { ITEMS, SPECIES, skinKey } from "../content/avatar.js";

export const FORMAT = "1"; // numéro du format du code, en tête : « 1.<données> »
export const CODE_MAX = 12000; // caractères au plus dans un code reçu
export const JSON_MAX = 2_000_000; // octets au plus une fois décompressé (refuse un code qui gonfle énormément)
export const SENT = ["sentence", "voiceId", "liveVoice", "fx", "kind", "progress", "srs", "listening", "mistakes", "game"];
const DEVICE = ["engine", "voice", "last", "log"]; // propres à l'appareil : gardés tels quels à l'import

// ---------- Forme compacte (mesuré le 2026-11-18 : les 501 mots révisés font 30 Ko en clair, 790 octets ainsi) ----------
// Vocabulaire : pour chaque mot vu, dans l'ordre de ALL_WORDS, [écart avec le mot précédent, boîte, jour de révision − t].
// Les compteurs internes « vu / réussi » (jamais affichés) ne partent pas : à l'arrivée, vu = boîte, réussi = boîte − 1.
// Inventaire du jeu : un bit par objet de OWNABLE. Une empreinte des deux listes refuse un code d'une version
// où elles ne seraient plus les mêmes (sinon les numéros désigneraient d'autres mots ou objets).
const WORD_IDS = ALL_WORDS.map((w) => w.id);
export const OWNABLE = [...ITEMS.map((i) => i.id), ...SPECIES.flatMap((s) => s.skins.slice(1).map((k) => skinKey(s.id, k.id)))];
export const LISTS = String(seedFrom(WORD_IDS.join(",") + "|" + OWNABLE.join(",")));
const dayNum = (key) => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400e3); };
const dayStr = (n) => new Date(n * 86400e3).toISOString().slice(0, 10);

function packCards(cards) {
  const idx = new Map(WORD_IDS.map((id, i) => [id, i]));
  const list = Object.entries(cards).filter(([id]) => idx.has(id)).map(([id, c]) => [idx.get(id), c.box, dayNum(c.due)]).sort((a, b) => a[0] - b[0]);
  const t = list.length ? Math.min(...list.map((x) => x[2])) : 0, c = [];
  let prev = -1;
  for (const [i, box, due] of list) { c.push(i - prev - 1, box, due - t); prev = i; }
  return { t, c };
}
function unpackCards(t, c) {
  const cards = {};
  if (!Number.isInteger(t) || !Array.isArray(c) || c.length % 3 || c.length > WORD_IDS.length * 3) return cards;
  let i = -1;
  for (let k = 0; k < c.length; k += 3) {
    const [gap, box, off] = c.slice(k, k + 3);
    if (![gap, box, off].every((n) => Number.isInteger(n) && n >= 0 && n < 1e5)) return {};
    i += gap + 1;
    if (i >= WORD_IDS.length) return {};
    cards[WORD_IDS[i]] = { box, due: dayStr(t + off), seen: box, ok: box - 1 };
  }
  return cards;
}
const packOwned = (owned) => { const b = new Uint8Array(Math.ceil(OWNABLE.length / 8)); OWNABLE.forEach((id, i) => { if (owned.includes(id)) b[i >> 3] |= 1 << (i & 7); }); return toB64url(b); };
function unpackOwned(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]{0,40}$/.test(s)) return [];
  let b; try { b = fromB64url(s); } catch { return []; }
  return OWNABLE.filter((_, i) => b[i >> 3] & (1 << (i & 7)));
}

// Ce qui est envoyé, et seulement ça, sous forme compacte.
export function pick(S) {
  const out = { version: VERSION, lists: LISTS };
  for (const k of SENT) out[k] = S[k];
  const { cards, ...srs } = S.srs;
  out.srs = { ...srs, ...packCards(cards || {}) };
  const { owned, ...game } = S.game;
  out.game = { ...game, o: packOwned(owned || []) };
  return out;
}
// Forme compacte → forme de la sauvegarde (avant nettoyage).
function expand(data) {
  const out = { ...data };
  if (data.srs && typeof data.srs === "object") { const { t, c, ...srs } = data.srs; out.srs = { ...srs, cards: unpackCards(t, c) }; }
  if (data.game && typeof data.game === "object") { const { o, ...game } = data.game; out.game = { ...game, owned: unpackOwned(o) }; }
  return out;
}

// ---------- base64 adapté aux adresses (A-Z a-z 0-9 - _ , sans « = ») ----------
export function toB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64url(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflate(text) {
  const stream = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
// Décompresse en s'arrêtant dès que la taille dépasse `max` : null si trop gros ou abîmé.
async function inflate(bytes, max) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const parts = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel().catch(() => {}); return null; }
      parts.push(value);
    }
  } catch { return null; }
  const all = new Uint8Array(size); let at = 0;
  for (const p of parts) { all.set(p, at); at += p.length; }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(all); } catch { return null; }
}

// Sauvegarde → code « 1.xxxx ».
export async function pack(S) {
  return `${FORMAT}.${toB64url(await deflate(JSON.stringify(pick(S))))}`;
}

// Code → { ok: true, data } (données reçues, pas encore nettoyées) ou { ok: false, error }.
// error : "format" (pas un code du Labo), "version" (code d'une autre version), "size" (trop gros), "damaged" (abîmé).
export async function unpack(code) {
  if (typeof code !== "string") return { ok: false, error: "format" };
  const c = code.trim();
  if (c.length > CODE_MAX) return { ok: false, error: "size" };
  const m = /^(\d{1,3})\.([A-Za-z0-9_-]{8,})$/.exec(c);
  if (!m) return { ok: false, error: "format" };
  if (m[1] !== FORMAT) return { ok: false, error: "version" };
  let bytes;
  try { bytes = fromB64url(m[2]); } catch { return { ok: false, error: "damaged" }; }
  const text = await inflate(bytes, JSON_MAX);
  if (text === null) return { ok: false, error: bytes.length > 0 ? "damaged" : "format" };
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "damaged" }; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "damaged" };
  if (data.version !== VERSION || data.lists !== LISTS) return { ok: false, error: "version" };
  return { ok: true, data: expand(data) };
}

// Nouvelle sauvegarde de l'appareil qui reçoit : les données reçues (nettoyées comme une sauvegarde lue),
// en gardant ce qui est propre à cet appareil. Tout champ non prévu est ignoré.
export function receive(local, data) {
  const raw = { version: VERSION };
  for (const k of SENT) if (Object.hasOwn(data, k)) raw[k] = data[k];
  for (const k of DEVICE) raw[k] = local[k];
  return sanitize(JSON.parse(JSON.stringify(raw)));
}

// Lien à mettre dans le QR code : l'adresse de l'appli (sans # ni ?) + « #transfert/<code> ».
export const linkFor = (code, appUrl) => `${String(appUrl).split(/[#?]/)[0]}#transfert/${code}`;
// Code contenu dans une adresse (#transfert/<code>), ou dans un lien ou un code collé ; null sinon.
export function codeFrom(text) {
  if (typeof text !== "string") return null;
  const t = text.trim(), i = t.indexOf("#transfert/");
  const c = i >= 0 ? t.slice(i + "#transfert/".length) : t.replace(/^#?transfert\//, "");
  return /^\d{1,3}\.[A-Za-z0-9_-]{8,}$/.test(c) && c.length <= CODE_MAX ? c : null;
}

// Messages en français pour l'écran.
export function transferError(code) {
  return { format: "Ce n'est pas un code de transfert du Labo d'accent.", version: "Ce code vient d'une autre version de l'appli : mets les deux appareils à jour, puis recommence.",
    size: "Ce code est trop long : il n'a pas pu venir du Labo d'accent.", damaged: "Ce code est abîmé (lien coupé ou mal copié ?). Recommence depuis l'autre appareil." }[code] || "Transfert impossible.";
}
