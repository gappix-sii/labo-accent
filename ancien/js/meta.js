// Méta-jeu : pièces, quêtes du jour, coffres, rangs, gel de série, boss et défi chrono.
import { credit } from "./core/economy.js";
// Module pur (aucun accès au DOM ni au stockage) : testable sous Node.

const pad = n => String(n).padStart(2, "0");
export const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(day, n) { const [y, m, d] = day.split("-").map(Number); return dayKey(new Date(y, m - 1, d + n)); }

// ---------- Hasard ----------
export function seedFrom(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function cryptoRng() {
  const buf = new Uint32Array(1);
  return () => { crypto.getRandomValues(buf); return buf[0] / 4294967296; };
}
export function shuffleWith(a, rng) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- Pièces ----------
export const coinsForXp = xp => Math.max(0, Math.round(xp / 4));
export const PRICES = { freeze: 50, boost: 60 };
export const MAX_FREEZES = 2, BOOST_MS = 15 * 60000;
export function levelReward(level) { return { coins: 40, chest: level % 5 === 0 ? "gold" : "silver" }; }

// ---------- Quêtes du jour ----------
export const QUEST_DEFS = [
  { id: "xp", ev: "xp", mode: "sum", goals: [40, 70, 120], text: n => `Gagne ${n} XP` },
  { id: "lesson", ev: "lesson", mode: "sum", goals: [1, 2, 3], text: n => n > 1 ? `Termine ${n} leçons du parcours` : "Termine une leçon du parcours" },
  { id: "speak", ev: "attempt", mode: "sum", goals: [6, 12, 20], text: n => `Prononce ${n} phrases ou mots` },
  { id: "great", ev: "great", mode: "sum", goals: [2, 4, 7], text: n => `Fais ${n} fois 90 ou plus en prononciation` },
  { id: "words", ev: "word", mode: "sum", goals: [8, 15, 25], text: n => `Révise ${n} mots de vocabulaire` },
  { id: "combo", ev: "combo", mode: "max", goals: [3, 4, 6], text: n => `Enchaîne un combo de ${n}` },
  { id: "gram", ev: "gram", mode: "sum", goals: [4, 8, 12], text: n => `Réussis ${n} exercices de grammaire ou de fautes` },
  { id: "talk", ev: "dialog", mode: "sum", goals: [1, 2, 3], text: n => n > 1 ? `Termine ${n} conversations` : "Termine une conversation" },
  { id: "chrono", ev: "chrono", mode: "sum", goals: [1, 2, 3], text: n => n > 1 ? `Joue ${n} défis chrono` : "Joue un défi chrono" },
  { id: "chronoScore", ev: "chronoScore", mode: "max", goals: [800, 1500, 2500], text: n => `Marque ${n.toLocaleString("fr-FR")} points au défi chrono` }
];
export const QUEST_BY_ID = Object.fromEntries(QUEST_DEFS.map(q => [q.id, q]));
export const QUEST_COINS = [20, 30, 45];
export function dailyQuests(day) {
  const rng = mulberry32(seedFrom("quests:" + day));
  const pool = shuffleWith(QUEST_DEFS, rng);
  return [0, 1, 2].map(k => ({ id: pool[k].id, goal: pool[k].goals[k], prog: 0, done: false, coins: QUEST_COINS[k] }));
}
export function ensureQuests(S, day) {
  if (!S.quests || S.quests.day !== day || S.quests.list.length !== 3) S.quests = { day, list: dailyQuests(day), bonus: false };
  return S.quests;
}
export const questText = q => QUEST_BY_ID[q.id] ? QUEST_BY_ID[q.id].text(q.goal) : "";
// Fait avancer les quêtes ; crédite les pièces des quêtes finies et un coffre si les 3 sont faites.
export function questEvent(S, day, ev, amount = 1) {
  ensureQuests(S, day);
  const done = [];
  for (const q of S.quests.list) {
    const def = QUEST_BY_ID[q.id];
    if (!def || def.ev !== ev || q.done) continue;
    q.prog = Math.min(q.goal, def.mode === "max" ? Math.max(q.prog, amount) : q.prog + amount);
    if (q.prog >= q.goal) { q.done = true; credit(S, q.coins, "quest", day); S.stats.quests++; done.push(q); }
  }
  let bonus = false;
  if (done.length && !S.quests.bonus && S.quests.list.every(q => q.done)) { S.quests.bonus = true; S.chests.push("silver"); bonus = true; }
  return { done, bonus };
}

// ---------- Coffres ----------
export const CHESTS = {
  wood: { name: "Coffre en bois", coins: [15, 35], item: 0.35, rar: { common: 0.85, rare: 0.15 } },
  silver: { name: "Coffre d'argent", coins: [35, 70], item: 0.7, rar: { common: 0.55, rare: 0.38, epic: 0.07 } },
  gold: { name: "Coffre d'or", coins: [70, 140], item: 1, rar: { rare: 0.55, epic: 0.37, legendary: 0.08 } },
  legend: { name: "Coffre légendaire", coins: [180, 300], item: 1, rar: { epic: 0.6, legendary: 0.4 } }
};
export const DUP_COINS = { common: 25, rare: 60, epic: 120, legendary: 250, mythic: 500 };
const RAR_ORDER = ["common", "rare", "epic", "legendary", "mythic"];
function pickWeighted(weights, rng) {
  let r = rng(), last = null;
  for (const [k, w] of Object.entries(weights)) { last = k; if ((r -= w) < 0) return k; }
  return last;
}
// pool : objets encore à gagner [{id, rarity}]. Si plus rien dans la rareté tirée : rareté voisine, sinon pièces.
export function rollChest(tier, pool, rng) {
  const T = CHESTS[tier] || CHESTS.wood;
  const coins = Math.round(T.coins[0] + rng() * (T.coins[1] - T.coins[0]));
  if (rng() >= T.item) return { coins, item: null, rarity: null, bonus: 0 };
  const rarity = pickWeighted(T.rar, rng);
  const ri = RAR_ORDER.indexOf(rarity);
  const tryOrder = [ri, ri - 1, ri + 1, ri - 2, ri + 2, ri - 3, ri + 3].filter(i => i >= 0 && i < RAR_ORDER.length);
  for (const i of tryOrder) {
    const list = pool.filter(p => p.rarity === RAR_ORDER[i]);
    if (list.length) { const p = list[Math.floor(rng() * list.length)]; return { coins, item: p.id, rarity: p.rarity, bonus: 0 }; }
  }
  return { coins: coins + DUP_COINS[rarity], item: null, rarity, bonus: DUP_COINS[rarity] };
}

// ---------- Rangs (trophées) ----------
export const RANKS = [
  { id: "bronze", name: "Bronze", min: 0, color: "#d08a4a" },
  { id: "silver", name: "Argent", min: 150, color: "#c7cfdf" },
  { id: "gold", name: "Or", min: 400, color: "#ffd23f" },
  { id: "plat", name: "Platine", min: 800, color: "#5ee6d0" },
  { id: "diamond", name: "Diamant", min: 1400, color: "#7cc4ff" },
  { id: "master", name: "Maître", min: 2200, color: "#c08bff" },
  { id: "legend", name: "Légende", min: 3200, color: "#ff6fae" }
];
export function rankOf(t) {
  let i = 0;
  while (i + 1 < RANKS.length && t >= RANKS[i + 1].min) i++;
  const r = RANKS[i], next = RANKS[i + 1];
  if (!next) return { i, ...r, div: "", into: t - r.min, need: 0, pct: 1, next: null };
  const span = next.min - r.min, into = t - r.min;
  return { i, ...r, div: ["III", "II", "I"][Math.min(2, Math.floor(into / span * 3))], into, need: span, pct: into / span, next };
}
export const rankChest = i => i >= RANKS.length - 1 ? "legend" : "gold";

// ---------- Série et gel de série ----------
export function streakOf(days, frozen, today) {
  const act = new Set(days), fz = new Set(frozen);
  let d = today, n = 0;
  if (!act.has(d) && !fz.has(d)) d = addDays(d, -1);
  while (act.has(d) || fz.has(d)) { if (act.has(d)) n++; d = addDays(d, -1); }
  return n;
}
// Au lancement : utilise les gels disponibles pour combler les jours manqués (seulement s'il y avait une série).
export function applyFreezes(S, today) {
  if (!S.freezes) return 0;
  const all = [...S.days, ...S.frozenDays].sort();
  const last = all[all.length - 1];
  if (!last || last >= addDays(today, -1)) return 0;
  const missing = [];
  for (let d = addDays(last, 1); d < today && missing.length <= S.freezes; d = addDays(d, 1)) missing.push(d);
  if (!missing.length || missing.length > S.freezes) return 0;
  if (streakOf(S.days, S.frozenDays, last) === 0) return 0;
  S.frozenDays = [...S.frozenDays, ...missing].slice(-120);
  S.freezes -= missing.length;
  return missing.length;
}

// ---------- Boss ----------
export const BOSS_HP = 100, BOSS_HEARTS = 3, BOSS_ITEMS = 7;
export function bossHit(score) {
  if (score >= 95) return { dmg: 34, kind: "crit" };
  if (score >= 85) return { dmg: 25, kind: "hit" };
  if (score >= 65) return { dmg: 15, kind: "hit" };
  if (score >= 45) return { dmg: 8, kind: "graze" };
  return { dmg: 0, kind: "miss" };
}
export function bossRewards(win, firstWin) {
  return win ? { xp: 60, coins: 60, trophies: 40, chest: firstWin ? "gold" : "silver" } : { xp: 10, coins: 5, trophies: 5, chest: null };
}

// ---------- Défi chrono ----------
export const CHRONO_MS = 60000;
export const chronoMult = combo => combo >= 10 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1;
export function chronoPoints(ok, comboBefore, ms) {
  if (!ok) return { pts: 0, mult: 1, combo: 0, speed: 0 };
  const combo = comboBefore + 1, mult = chronoMult(combo), speed = ms < 1500 ? 50 : ms < 3000 ? 25 : 0;
  return { pts: Math.round((100 + speed) * mult), mult, combo, speed };
}
export function chronoRewards(score, correct, dailyFirst = false) {
  return {
    xp: Math.min(60, 5 + Math.round(score / 80)),
    coins: Math.round(score / 100),
    trophies: correct > 0 ? Math.max(1, Math.round(score / 100)) + (dailyFirst ? 10 : 0) : 0
  };
}
export const CHRONO_RECORD = 20; // pièces de progrès pour un nouveau record personnel
export function pushRecord(list, entry, max = 5) {
  const out = [...list, entry].sort((a, b) => b.score - a.score).slice(0, max);
  return { list: out, rank: out.indexOf(entry) };
}

// ---------- Offres du jour du Shop ----------
// 3 objets (pas encore possédés, achetables à ton niveau) choisis une fois par jour, à −30 %.
export const DEAL_COUNT = 3, DEAL_OFF = 0.3;
export const dealPrice = base => Math.max(5, Math.round(base * (1 - DEAL_OFF) / 5) * 5);
export function pickDeals(day, candidates) {
  return shuffleWith([...candidates].sort(), mulberry32(seedFrom("deals:" + day))).slice(0, DEAL_COUNT);
}
export function msToMidnight(now = new Date()) { const m = new Date(now); m.setHours(24, 0, 0, 0); return m - now; }

// ---------- Boîtes à butin (achetées avec les pièces du jeu, jamais avec de l'argent réel) ----------
// Les probabilités affichées dans l'appli sont exactement celles-ci.
export const BOXES = {
  classic: { name: "Boîte classique", price: 100, odds: { common: 0.62, rare: 0.27, epic: 0.09, legendary: 0.018, mythic: 0.002 } },
  epic: { name: "Boîte épique", price: 260, odds: { rare: 0.5, epic: 0.36, legendary: 0.12, mythic: 0.02 } },
  mythic: { name: "Boîte mythique", price: 600, odds: { epic: 0.45, legendary: 0.43, mythic: 0.12 } }
};
export const BOX_DUP = { common: 20, rare: 50, epic: 110, legendary: 250, mythic: 500 };
export const PITY = 10; // au plus 10 boîtes pour un objet légendaire ou mythique
export const PITY_ODDS = { legendary: 0.8, mythic: 0.2 };
// pool : [{id, rarity, owned}]. Priorité aux objets pas encore possédés ; sinon doublon converti en pièces.
export function rollBox(boxId, pool, pity, rng, forced = null) {
  const B = BOXES[boxId];
  const guaranteed = !forced && pity >= PITY - 1;
  const rarity = forced || pickWeighted(guaranteed ? PITY_ODDS : B.odds, rng);
  const all = pool.filter(p => p.rarity === rarity), fresh = all.filter(p => !p.owned);
  const top = rarity === "legendary" || rarity === "mythic";
  const res = { rarity, guaranteed, pity: top ? 0 : pity + 1, item: null, dup: false, coins: 0 };
  if (fresh.length) res.item = fresh[Math.floor(rng() * fresh.length)].id;
  else { res.dup = true; res.coins = BOX_DUP[rarity]; if (all.length) res.item = all[Math.floor(rng() * all.length)].id; }
  return res;
}
