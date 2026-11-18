// Le jeu (phase 6) : pièces, coffres, boutique, boîtes à butin, compagnon. Module pur, sans DOM (test/game.test.mjs).
// TOUS les chiffres de l'économie sont ici, pour pouvoir la régler à un seul endroit.
// Règles décidées le 2026-11-18 (PROJET.md) : 1 pièce pour 4 XP ; un coffre à chaque niveau gagné (d'or tous les
// 5 niveaux) ; boîtes à butin achetées avec les pièces du jeu, jamais avec de l'argent réel, aux probabilités
// affichées, avec garantie ; un objet déjà possédé est changé en pièces.
import { levelOf, dayKey } from "./progress.js";
import { SPECIES, SPECIES_BY_ID, ITEMS, ITEM_BY_ID, CATALOG, DEFAULT_AVATAR, DEFAULT_OWNED, RARITY_ORDER,
  skinKey, ownsSkin, basePrice, levelFor, isValidOwned, describeOwned } from "../content/avatar.js";

// ---------- Réglages de l'économie ----------
export const XP_PER_COIN = 4;
export const GOLD_EVERY = 5; // un coffre d'or tous les 5 niveaux, d'argent sinon
export const MAX_CHESTS = 30; // coffres en attente gardés au plus
export const CHESTS = {
  silver: { name: "Coffre d'argent", coins: [35, 70], item: 0.7, rar: { common: 0.55, rare: 0.38, epic: 0.07 } },
  gold: { name: "Coffre d'or", coins: [70, 140], item: 1, rar: { rare: 0.55, epic: 0.37, legendary: 0.08 } }
};
export const DUP_COINS = { common: 25, rare: 60, epic: 120, legendary: 250, mythic: 500 };
// Les probabilités affichées dans l'appli sont exactement celles-ci.
export const BOXES = {
  classic: { name: "Boîte classique", price: 100, odds: { common: 0.62, rare: 0.27, epic: 0.09, legendary: 0.018, mythic: 0.002 } },
  epic: { name: "Boîte épique", price: 260, odds: { rare: 0.5, epic: 0.36, legendary: 0.12, mythic: 0.02 } },
  mythic: { name: "Boîte mythique", price: 600, odds: { epic: 0.45, legendary: 0.43, mythic: 0.12 } }
};
export const BOX_DUP = { common: 20, rare: 50, epic: 110, legendary: 250, mythic: 500 };
export const PITY = 10; // au plus 10 boîtes pour un objet légendaire ou mythique
export const PITY_ODDS = { legendary: 0.8, mythic: 0.2 };
export const DEAL_COUNT = 3, DEAL_OFF = 0.3; // offres du jour : 3 objets à −30 %
export const NAME_MAX = 20;

// ---------- Hasard ----------
// Hasard du navigateur (crypto) : ni prévisible, ni rejouable en rechargeant la page.
export function cryptoRng() {
  const a = new Uint32Array(1);
  return () => { globalThis.crypto.getRandomValues(a); return a[0] / 4294967296; };
}
// Hasard reproductible (offres du jour : les mêmes toute la journée).
export function seedFrom(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function pickWeighted(weights, rng) {
  let r = rng(), last = null;
  for (const [k, w] of Object.entries(weights)) { last = k; if ((r -= w) < 0) return k; }
  return last;
}
const pickOne = (list, rng) => list[Math.floor(rng() * list.length)];

// ---------- État du jeu (sauvegardé dans labo.v2, section « game ») ----------
// xpPaid : XP déjà changés en pièces ; levelPaid : dernier niveau dont le coffre a été donné.
export function newGame() {
  return { v: 1, coins: 0, xpPaid: 0, levelPaid: 1, owned: [...DEFAULT_OWNED], avatar: { ...DEFAULT_AVATAR }, chests: [], pity: 0 };
}

// Pièces et coffres gagnés depuis la dernière fois, d'après les XP. Appelé à chaque enregistrement (store.save).
// Renvoie ce qui vient d'être gagné : { coins, chests: ["silver"…], levels: [niveaux atteints] }.
export function syncGame(G, P) {
  const out = { coins: 0, chests: [], levels: [] };
  const xp = Number.isInteger(P.xp) ? P.xp : 0;
  if (xp > G.xpPaid) {
    out.coins = Math.floor((xp - G.xpPaid) / XP_PER_COIN);
    G.coins += out.coins; G.xpPaid += out.coins * XP_PER_COIN; // le reste (moins de 4 XP) compte pour la suite
  }
  const level = levelOf(xp).level;
  for (let l = G.levelPaid + 1; l <= level; l++) { const t = l % GOLD_EVERY === 0 ? "gold" : "silver"; out.chests.push(t); out.levels.push(l); }
  if (level > G.levelPaid) G.levelPaid = level;
  G.chests = [...G.chests, ...out.chests].slice(-MAX_CHESTS);
  return out;
}

// ---------- Inventaire et compagnon ----------
export const owns = (G, id) => G.owned.includes(id);
function add(G, id) { if (!owns(G, id)) G.owned.push(id); }

// Ce qui peut sortir d'un coffre et que tu n'as pas encore (pas les exclusivités des boîtes ni les récompenses spéciales).
export function chestPool(G) {
  const out = [];
  for (const i of ITEMS) if (i.drop && !owns(G, i.id)) out.push({ id: i.id, rarity: i.rarity });
  for (const s of SPECIES) for (const k of s.skins.slice(1)) if (!k.box && !owns(G, skinKey(s.id, k.id))) out.push({ id: skinKey(s.id, k.id), rarity: k.rarity });
  return out;
}
// Contenu possible des boîtes : tout ce qui se gagne + les exclusivités des boîtes, avec « déjà à toi ».
export function boxPool(G) {
  const out = [], put = (id, rarity) => out.push({ id, rarity, owned: owns(G, id) });
  for (const i of ITEMS) if (i.drop || i.box) put(i.id, i.rarity);
  for (const s of SPECIES) for (const k of s.skins.slice(1)) put(skinKey(s.id, k.id), k.rarity);
  return out;
}

// ---------- Coffres (gagnés en montant de niveau) ----------
// Ouvre le premier coffre en attente. Renvoie { tier, coins, item, rarity, bonus } ou null s'il n'y en a pas.
export function openChest(G, rng = cryptoRng()) {
  if (!G.chests.length) return null;
  const tier = G.chests.shift(), T = CHESTS[tier] || CHESTS.silver;
  let coins = Math.round(T.coins[0] + rng() * (T.coins[1] - T.coins[0])), item = null, rarity = null, bonus = 0;
  if (rng() < T.item) {
    rarity = pickWeighted(T.rar, rng);
    const pool = chestPool(G), ri = RARITY_ORDER.indexOf(rarity);
    // plus rien dans cette rareté : la rareté voisine, sinon des pièces
    const order = [ri, ri - 1, ri + 1, ri - 2, ri + 2, ri - 3, ri + 3].filter((i) => i >= 0 && i < RARITY_ORDER.length);
    for (const i of order) {
      const list = pool.filter((p) => p.rarity === RARITY_ORDER[i]);
      if (list.length) { const p = pickOne(list, rng); item = p.id; rarity = p.rarity; break; }
    }
    if (!item) { bonus = DUP_COINS[rarity]; coins += bonus; }
  }
  G.coins += coins;
  if (item) add(G, item);
  return { tier, coins, item, rarity, bonus };
}

// ---------- Boîtes à butin (achetées avec les pièces du jeu) ----------
// Renvoie { ok: false, error } ou { ok: true, box, rarity, item, dup, coins, guaranteed, pity }.
export function buyBox(G, boxId, rng = cryptoRng()) {
  const B = Object.hasOwn(BOXES, boxId) ? BOXES[boxId] : null;
  if (!B) return { ok: false, error: "unknown" };
  if (G.coins < B.price) return { ok: false, error: "coins" };
  G.coins -= B.price;
  const guaranteed = G.pity >= PITY - 1;
  const rarity = pickWeighted(guaranteed ? PITY_ODDS : B.odds, rng);
  const all = boxPool(G).filter((p) => p.rarity === rarity), fresh = all.filter((p) => !p.owned);
  const top = rarity === "legendary" || rarity === "mythic";
  G.pity = top ? 0 : G.pity + 1;
  const res = { ok: true, box: boxId, rarity, guaranteed, pity: G.pity, item: null, dup: false, coins: 0 };
  if (fresh.length) { res.item = pickOne(fresh, rng).id; add(G, res.item); }
  else { res.dup = true; res.coins = BOX_DUP[rarity]; G.coins += res.coins; if (all.length) res.item = pickOne(all, rng).id; }
  return res;
}

// ---------- Boutique ----------
export const dealPrice = (base) => Math.max(5, Math.round((base * (1 - DEAL_OFF)) / 5) * 5);
// Offres du jour : 3 objets pas encore à toi et achetables à ton niveau, les mêmes toute la journée.
export function deals(G, level, now = Date.now()) {
  const day = dayKey(now);
  const list = CATALOG.filter((id) => !owns(G, id) && levelFor(id) <= level).sort();
  const rng = mulberry32(seedFrom("deals:" + day));
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list.slice(0, DEAL_COUNT);
}
// Prix à payer aujourd'hui (offre du jour comprise), ou null si l'objet ne s'achète pas.
export function priceOf(G, id, level, now = Date.now()) {
  const base = basePrice(id);
  if (base === null) return null;
  return deals(G, level, now).includes(id) ? dealPrice(base) : base;
}
// Achat. Renvoie { ok: true, price } ou { ok: false, error: "unknown" | "owned" | "level" | "coins" }.
export function buy(G, id, level, now = Date.now()) {
  const price = priceOf(G, id, level, now);
  if (price === null) return { ok: false, error: "unknown" };
  if (owns(G, id)) return { ok: false, error: "owned" };
  if (levelFor(id) > level) return { ok: false, error: "level" };
  if (G.coins < price) return { ok: false, error: "coins" };
  G.coins -= price; add(G, id);
  return { ok: true, price };
}

// ---------- Compagnon ----------
export const speciesOpen = (spId, level) => { const s = SPECIES_BY_ID[spId]; return !!s && s.lvl <= level; };
// Change d'animal (débloqué à ton niveau) : il garde ses accessoires, prend sa 1re couleur.
export function setSpecies(G, spId, level) {
  if (!speciesOpen(spId, level)) return false;
  G.avatar.species = spId; G.avatar.skin = SPECIES_BY_ID[spId].skins[0].id;
  return true;
}
export function setSkin(G, skinId) {
  if (!ownsSkin(G.owned, G.avatar.species, skinId)) return false;
  G.avatar.skin = skinId; return true;
}
// Équipe un accessoire à toi (id vide : retire celui de l'emplacement `slot`).
export function equip(G, id, slot) {
  if (!id) { if (Object.hasOwn(G.avatar, slot) && slot !== "species" && slot !== "skin" && slot !== "name") { G.avatar[slot] = ""; return true; } return false; }
  const it = ITEM_BY_ID[id];
  if (!it || !owns(G, id)) return false;
  G.avatar[it.slot] = id; return true;
}
export const cleanName = (s) => (typeof s === "string" ? s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, NAME_MAX) : "");
export function rename(G, s) { const n = cleanName(s); if (!n) return false; G.avatar.name = n; return true; }

// ---------- Sauvegarde ----------
const int = (v, min, max, def) => (Number.isInteger(v) && v >= min && v <= max ? v : def);
export function sanitizeGame(raw) {
  const G = newGame();
  if (!raw || typeof raw !== "object" || raw.v !== 1) return G;
  G.coins = int(raw.coins, 0, 1e7, 0);
  G.xpPaid = int(raw.xpPaid, 0, 1e9, 0);
  G.levelPaid = int(raw.levelPaid, 1, 10000, 1);
  G.owned = [...new Set([...DEFAULT_OWNED, ...(Array.isArray(raw.owned) ? raw.owned.slice(0, 500) : []).filter((id) => typeof id === "string" && isValidOwned(id))])];
  G.chests = (Array.isArray(raw.chests) ? raw.chests : []).filter((t) => Object.hasOwn(CHESTS, t)).slice(-MAX_CHESTS);
  G.pity = int(raw.pity, 0, PITY - 1, 0);
  const a = raw.avatar && typeof raw.avatar === "object" ? raw.avatar : {};
  if (SPECIES_BY_ID[a.species]) G.avatar.species = a.species;
  G.avatar.skin = typeof a.skin === "string" && ownsSkin(G.owned, G.avatar.species, a.skin) ? a.skin : SPECIES_BY_ID[G.avatar.species].skins[0].id;
  for (const slot of ["head", "eyes", "neck", "hand", "back", "aura"]) {
    const id = a[slot], d = typeof id === "string" && describeOwned(id);
    G.avatar[slot] = id === "" ? "" : d && d.kind === "item" && d.slot === slot && owns(G, id) ? id : DEFAULT_AVATAR[slot];
  }
  G.avatar.name = cleanName(a.name) || DEFAULT_AVATAR.name;
  return G;
}
