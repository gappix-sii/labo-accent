// Amis sans serveur : tout passe par des codes signés que les joueurs s'envoient eux-mêmes (lien, SMS, WhatsApp…).
// - Carte joueur : pseudo, compagnon et cosmétiques, statistiques. Rien de privé (ni e-mail, ni clé, ni historique).
// - Défi : une partie à rejouer avec exactement les mêmes questions (même graine), et le score à battre.
// - Résultat : la réponse au défi.
// Chaque code est signé en ECDSA P-256 par la clé de l'appareil du joueur (clé privée NON exportable, dans IndexedDB).
// À la première carte reçue d'un ami, on retient sa clé publique ; une mise à jour signée par une autre clé est
// signalée (quelqu'un d'autre se fait passer pour lui, ou il a changé d'appareil). Toute donnée reçue est validée
// champ par champ ; elle n'est jamais exécutée et l'affichage passe par l'échappement de html``.
// Limite (honnête) : sans serveur, un joueur qui maîtrise les outils du navigateur peut gonfler ses propres chiffres.
import { kvGet, kvPut } from "./core/secret.js";
import { SPECIES_BY_ID, ITEM_BY_ID, SLOTS, THEME_BY_ID } from "./avatar.js";

const KEY_ID = "social-ecdsa-v1", PREFIX = "LA1", MAX_CODE = 3000;
const enc = new TextEncoder(), dec = new TextDecoder();
export const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const ALGO = { name: "ECDSA", namedCurve: "P-256" }, SIGN = { name: "ECDSA", hash: "SHA-256" };

// ---------- Validation des données reçues ----------
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const int = (v, max) => Number.isInteger(v) && v >= 0 && v <= max ? v : 0;
export const cleanName = (v, max) => typeof v === "string" ? v.normalize("NFC").replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "").replace(/\s+/g, " ").trim().slice(0, max) : "";
const isId = v => typeof v === "string" && /^[a-z0-9]{12}$/.test(v);
const isPk = v => typeof v === "string" && /^[A-Za-z0-9_-]{87}$/.test(v);
export function cleanAvatar(a) {
  const o = a && typeof a === "object" ? a : {};
  const sp = SPECIES_BY_ID[o.sp] ? o.sp : "skunk", skins = SPECIES_BY_ID[sp].skins;
  const out = { species: sp, skin: skins.some(k => k.id === o.sk) ? o.sk : skins[0].id, name: cleanName(o.nm, 16) || "Pouf" };
  for (const [slot] of SLOTS) { const it = ITEM_BY_ID[o[slot]]; out[slot] = it && it.slot === slot ? o[slot] : ""; }
  return out;
}
export function cleanCard(o) {
  if (!o || typeof o !== "object" || o.v !== 1 || o.t !== "card" || !isId(o.id) || !isPk(o.pk)) return null;
  return {
    id: o.id, pk: o.pk, name: cleanName(o.n, 20) || "Joueur", d: typeof o.d === "string" && DAY.test(o.d) ? o.d : "",
    avatar: cleanAvatar(o.av), theme: THEME_BY_ID[o.th] ? o.th : "nuit",
    level: int(o.lv, 10000) || 1, xp: int(o.xp, 1e8), streak: int(o.st, 100000), trophies: int(o.tr, 1e7), bosses: int(o.bs, 50),
    lessons: int(o.ls, 10000), stars: int(o.sr, 30000), verbs: int(o.vb, 1000), words: int(o.wd, 100000), chrono: int(o.cb, 1e7),
    daily: o.dd && typeof o.dd === "object" && DAY.test(o.dd.d || "") ? { d: o.dd.d, s: int(o.dd.s, 1e7) } : null, badges: int(o.bd, 1000)
  };
}
const GAMES = ["chrono", "rush"];
const FAMS = /^[a-z]{1,10}$/;
export function cleanDuel(o) {
  if (!o || typeof o !== "object" || o.v !== 1 || !["duel", "res"].includes(o.t)) return null;
  if (!isId(o.did) || !isId(o.from) || !isPk(o.pk) || !GAMES.includes(o.g)) return null;
  return {
    kind: o.t, did: o.did, from: o.from, pk: o.pk, name: cleanName(o.n, 20) || "Joueur", avatar: cleanAvatar(o.av),
    game: o.g, fam: typeof o.fam === "string" && FAMS.test(o.fam) ? o.fam : "", seed: int(o.seed, 4294967295),
    score: int(o.sc, 1e7), ok: int(o.ok, 1000), n: int(o.nq, 1000), d: typeof o.d === "string" && DAY.test(o.d) ? o.d : "", vs: int(o.vs, 1e7)
  };
}

// ---------- Clés de l'appareil ----------
let keysP = null;
export function myKeys() {
  if (!keysP) keysP = (async () => {
    let k = await kvGet(KEY_ID);
    if (!k) {
      const pair = await crypto.subtle.generateKey(ALGO, false, ["sign", "verify"]); // la clé privée ne peut pas être exportée
      k = { priv: pair.privateKey, pk: b64u(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))) };
      await kvPut(KEY_ID, k);
    }
    return k;
  })();
  return keysP;
}
export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

// ---------- Codes ----------
async function seal(obj) {
  const k = await myKeys(), body = b64u(enc.encode(JSON.stringify({ ...obj, pk: k.pk })));
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, k.priv, enc.encode("labo-social:" + body)));
  return `${PREFIX}.${body}.${b64u(sig)}`;
}
// Trouve un code dans un texte collé (le lien entier ou le code seul) et le vérifie.
export async function readCode(text) {
  if (typeof text !== "string" || text.length > MAX_CODE * 2) return { ok: false, error: "Ce texte est trop long pour être un code d'ami." };
  const m = text.match(/LA1\.([A-Za-z0-9_-]{20,2600})\.([A-Za-z0-9_-]{60,110})/);
  if (!m) return { ok: false, error: "Aucun code d'ami ou de défi dans ce texte." };
  let raw;
  try { raw = JSON.parse(dec.decode(unb64u(m[1]))); } catch (e) { return { ok: false, error: "Ce code est abîmé : demande à ton ami de le renvoyer." }; }
  const card = raw && raw.t === "card" ? cleanCard(raw) : null, duel = !card ? cleanDuel(raw) : null;
  if (!card && !duel) return { ok: false, error: "Ce code ne vient pas du Labo d'accent." };
  const pk = (card || duel).pk;
  let good = false;
  try {
    const pub = await crypto.subtle.importKey("raw", unb64u(pk), ALGO, false, ["verify"]);
    good = await crypto.subtle.verify(SIGN, pub, unb64u(m[2]), enc.encode("labo-social:" + m[1]));
  } catch (e) { good = false; }
  if (!good) return { ok: false, error: "Signature invalide : ce code a été modifié." };
  return card ? { ok: true, kind: "card", card } : { ok: true, kind: duel.kind, duel };
}
// Données déjà enregistrées (format interne) : revalidées à chaque chargement de la sauvegarde.
const avIn = a => { const o = a && typeof a === "object" ? a : {}, av = { sp: o.species, sk: o.skin, nm: o.name }; for (const [slot] of SLOTS) av[slot] = o[slot]; return av; };
export function cleanStoredFriend(o) {
  if (!o || typeof o !== "object") return undefined;
  const c = cleanCard({ v: 1, t: "card", id: o.id, pk: o.pk, n: o.name, d: o.d, av: avIn(o.avatar), th: o.theme, lv: o.level, xp: o.xp, st: o.streak, tr: o.trophies, bs: o.bosses,
    ls: o.lessons, sr: o.stars, vb: o.verbs, wd: o.words, cb: o.chrono, dd: o.daily, bd: o.badges });
  if (!c) return undefined;
  return { ...c, added: DAY.test(o.added || "") ? o.added : c.d, upd: DAY.test(o.upd || "") ? o.upd : c.d };
}
const score = v => Number.isInteger(v) && v >= -1 && v <= 1e7 ? v : -1;
export function cleanStoredDuel(o) {
  if (!o || typeof o !== "object" || !isId(o.did) || !["sent", "received"].includes(o.role) || !GAMES.includes(o.game)) return undefined;
  return { did: o.did, role: o.role, game: o.game, fam: typeof o.fam === "string" && FAMS.test(o.fam) ? o.fam : "", seed: int(o.seed, 4294967295),
    with: isId(o.with) ? o.with : "", name: cleanName(o.name, 20), avatar: o.avatar ? cleanAvatar(avIn(o.avatar)) : null,
    mine: score(o.mine), theirs: score(o.theirs), mineOk: int(o.mineOk, 1000), mineN: int(o.mineN, 1000), theirsOk: int(o.theirsOk, 1000), theirsN: int(o.theirsN, 1000),
    d: typeof o.d === "string" && DAY.test(o.d) ? o.d : "" };
}
export const linkFor = code => `${location.origin}${location.pathname}#c=${code}`;

export function cardFrom(S, me, x) {
  const a = S.avatar, av = { sp: a.species, sk: a.skin, nm: a.name };
  for (const [slot] of SLOTS) if (a[slot]) av[slot] = a[slot];
  return { v: 1, t: "card", id: me, n: S.player || a.name, d: x.today, av, th: S.theme, lv: x.level, xp: S.xp, st: x.streak, tr: S.trophies, bs: x.bosses,
    ls: Object.keys(S.lessons).length, sr: Object.values(S.lessons).reduce((t, l) => t + (l.stars || 0), 0), vb: x.verbs, wd: x.words,
    cb: Math.max(0, ...S.chrono.best.map(b => b.score)), dd: S.chrono.daily.day === x.today ? { d: x.today, s: S.chrono.daily.score } : undefined, bd: S.badges.length };
}
export const makeCard = obj => seal(obj);
export function makeDuel(S, me, d) {
  const a = S.avatar, av = { sp: a.species, sk: a.skin, nm: a.name };
  for (const [slot] of SLOTS) if (a[slot]) av[slot] = a[slot];
  return seal({ v: 1, t: d.kind, did: d.did, from: me, n: S.player || a.name, av, g: d.game, fam: d.fam || undefined, seed: d.seed, sc: d.score, ok: d.ok, nq: d.n, d: d.d, vs: d.vs || undefined });
}
