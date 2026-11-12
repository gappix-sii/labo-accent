// Progression locale (localStorage) avec validation stricte : seules les clés connues, aux bons types et
// dans les bornes prévues, sont gardées. Protège contre un fichier importé piégé ou un stockage corrompu
// (types inattendus, clés « __proto__ », tailles démesurées).
import { BADGES, DURATIONS, levelOf } from "../game.js";
import { SPECIES_BY_ID, ITEM_BY_ID, THEME_BY_ID, DEFAULT_OWNED, DEFAULT_AVATAR, SLOTS, EXCLUSIVES, isValidOwned, ownsSkin, themeKey, basePrice } from "../avatar.js";
import { emptyEcon } from "./economy.js";
import { QUEST_BY_ID, CHESTS, RANKS, MAX_FREEZES } from "../meta.js";

export const STORE_KEY = "labo.v1";
export const STATE_VERSION = 2;
export const MAX_IMPORT = 2 * 1024 * 1024;
const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function defaults() {
  return {
    v: STATE_VERSION, news: STATE_VERSION,
    history: [], sounds: {}, days: [], voice: "", slow: 0.7, modelReady: false, xp: 0, lessons: {}, badges: [],
    bestCombo: 0, xpDays: {}, goalXp: 50, sfx: true, poufVoice: true, onboarded: false, vocab: {}, vocabLevel: "A1",
    sessions: [], sessMin: 15, dialogues: {}, grammar: {}, basics: {}, mistakes: {}, gLevel: "A1",
    chat: { engine: "", model: "gemini-3.8-flash", level: "A2" }, chatModelReady: false,
    coins: 0, owned: [...DEFAULT_OWNED], avatar: { ...DEFAULT_AVATAR }, theme: "nuit",
    quests: { day: "", list: [], bonus: false }, chests: [], trophies: 0, rankSeen: 0,
    bosses: {}, chrono: { best: [], daily: { day: "", score: 0 }, runs: 0 },
    freezes: 0, frozenDays: [], boostUntil: 0, haptics: true, motion: "auto", title: "", player: "",
    stats: { chests: 0, perfect: 0, bosses: 0, quests: 0, boxes: 0 }, boxPity: 0, levelSeen: 1, secret: false,
    deals: { day: "", ids: [] }, econ: emptyEcon()
  };
}

// ---------- Validateurs ----------
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const int = (min, max) => v => Number.isInteger(v) && v >= min && v <= max ? v : undefined;
const num = (min, max) => v => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const bool = v => typeof v === "boolean" ? v : undefined;
const oneOf = list => v => list.includes(v) ? v : undefined;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const day = v => typeof v === "string" && DAY.test(v) ? v : undefined;
const str = (max, re) => v => typeof v === "string" && v.length <= max && (!re || re.test(v)) ? v : undefined;
// Texte libre affiché : on retire les caractères de contrôle et d'inversion de sens (bidi), on borne la longueur.
export function cleanText(v, max) {
  if (typeof v !== "string") return undefined;
  const s = v.normalize("NFC").replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/gu, "").replace(/\s+/g, " ").trim();
  return [...s].slice(0, max).join("");
}
const text = max => v => cleanText(v, max);
const shape = (spec, strict = false) => v => {
  if (!isObj(v)) return undefined;
  const o = {};
  for (const k of Object.keys(spec)) { const x = spec[k](v[k]); if (x === undefined) { if (strict) return undefined; } else o[k] = x; }
  return o;
};
const list = (item, max, uniq = false) => v => {
  if (!Array.isArray(v)) return undefined;
  const out = [], seen = new Set();
  for (const x of v.slice(-max * 2)) {
    const y = item(x);
    if (y === undefined || (uniq && seen.has(y))) continue;
    seen.add(y); out.push(y);
  }
  return out.slice(-max);
};
const map = (val, max, keyMax = 160) => v => {
  if (!isObj(v)) return undefined;
  const o = {};
  let n = 0;
  for (const k of Object.keys(v)) {
    if (n >= max) break;
    if (BAD_KEYS.has(k) || k.length > keyMax || /[\p{Cc}\p{Cf}]/u.test(k)) continue;
    const x = val(v[k]);
    if (x !== undefined) { o[k] = x; n++; }
  }
  return o;
};

const SRS = shape({ box: int(0, 5), due: day, seen: int(0, 1e6), ok: int(0, 1e6) }, true);
const BEST = shape({ best: int(0, 100), d: day }, true);
const CHAT = shape({ engine: oneOf(["", "local", "gemini", "test"]), model: str(60, /^[a-z0-9][a-z0-9.-]*$/), level: oneOf(["A1", "A2", "B1", "B2"]) });
const QUEST = v => {
  const q = shape({ id: oneOf(Object.keys(QUEST_BY_ID)), goal: int(1, 1e6), prog: int(0, 1e6), done: bool, coins: int(0, 1000) }, true)(v);
  if (q) q.prog = Math.min(q.prog, q.goal);
  return q;
};

const SPEC = {
  history: list(shape({ d: day, s: int(0, 100), t: text(120) }, true), 500),
  sounds: map(v => { const o = shape({ n: int(0, 1e7), ok: int(0, 1e7) }, true)(v); return o && o.ok <= o.n ? o : undefined; }, 120, 8),
  days: list(day, 4000, true),
  voice: str(400), slow: num(0.5, 0.9), modelReady: bool, xp: int(0, 1e8),
  lessons: map(shape({ stars: int(1, 3), best: int(0, 100), d: day }, true), 400, 60),
  badges: list(oneOf(BADGES.map(b => b.id)), 200, true),
  bestCombo: int(0, 10000),
  xpDays: map(int(0, 1e6), 400, 10),
  goalXp: oneOf([20, 50, 100, 150]), sfx: bool, poufVoice: bool, onboarded: bool,
  vocab: map(SRS, 5000, 80), vocabLevel: oneOf(LEVELS),
  sessions: list(shape({ d: day, planned: oneOf(DURATIONS), real: int(1, 600), xp: int(0, 1e6) }, true), 100),
  sessMin: oneOf(DURATIONS),
  dialogues: map(BEST, 200, 60), grammar: map(BEST, 400, 60), basics: map(BEST, 20, 30), mistakes: map(SRS, 2000, 200), gLevel: oneOf(["A1", "A2", "B1", "B2"]),
  chat: CHAT, chatModelReady: bool,
  coins: int(0, 1e8), owned: list(v => typeof v === "string" && isValidOwned(v) ? v : undefined, 400, true),
  avatar: shape({ species: oneOf(Object.keys(SPECIES_BY_ID)), skin: str(30, /^[a-z]+$/), head: str(20), eyes: str(20), neck: str(20), hand: str(20), back: str(20), aura: str(20), name: text(16) }),
  theme: oneOf(Object.keys(THEME_BY_ID)),
  quests: shape({ day: v => v === "" ? "" : day(v), list: list(QUEST, 3), bonus: bool }),
  chests: list(oneOf(Object.keys(CHESTS)), 30),
  trophies: int(0, 1e7), rankSeen: int(0, RANKS.length - 1),
  bosses: map(shape({ won: bool, best: int(0, 100), tries: int(0, 1e6) }, true), 20, 4),
  chrono: shape({ best: list(shape({ score: int(0, 1e7), d: day, daily: bool }, true), 5), daily: shape({ day: v => v === "" ? "" : day(v), score: int(0, 1e7) }, true), runs: int(0, 1e7) }),
  econ: shape({ earned: int(0, 1e9), spent: int(0, 1e9), day: v => v === "" ? "" : day(v), practice: int(0, 1e6),
    reps: map(int(0, 99), 80, 60), log: list(shape({ t: num(0, 9e15), a: int(-1e7, 1e7), r: str(20, /^[a-z]+$/) }, true), 60),
    lastSeen: num(0, 9e15), sealed: bool, capNoted: v => v === "" ? "" : day(v) }),
  deals: shape({ day: v => v === "" ? "" : day(v), ids: list(v => typeof v === "string" && basePrice(v) ? v : undefined, 4, true) }),
  freezes: int(0, MAX_FREEZES), frozenDays: list(day, 120, true), boostUntil: num(0, 9e15),
  haptics: bool, motion: oneOf(["auto", "reduced", "full"]), title: str(30, /^[a-z0-9:]*$/), player: text(20),
  stats: shape({ chests: int(0, 1e7), perfect: int(0, 1e7), bosses: int(0, 1e7), quests: int(0, 1e7), boxes: int(0, 1e7) }),
  boxPity: int(0, 100),
  levelSeen: int(1, 10000), secret: bool, news: int(0, 1000), v: int(1, 1000)
};

// Construit un état neuf et cohérent à partir de n'importe quelle valeur.
export function sanitize(raw, now = Date.now()) {
  const S = defaults();
  const src = isObj(raw) ? raw : {};
  for (const k of Object.keys(SPEC)) {
    const x = SPEC[k](src[k]);
    if (x === undefined) continue;
    S[k] = isObj(S[k]) && isObj(x) ? { ...S[k], ...x } : x;
  }
  // Cohérence entre champs
  for (const id of DEFAULT_OWNED) if (!S.owned.includes(id)) S.owned.push(id);
  const a = S.avatar, lv = levelOf(S.xp).level;
  const sp = SPECIES_BY_ID[a.species];
  if (!sp || sp.lvl > lv) { a.species = DEFAULT_AVATAR.species; a.skin = DEFAULT_AVATAR.skin; }
  if (!ownsSkin(S.owned, a.species, a.skin)) a.skin = SPECIES_BY_ID[a.species].skins[0].id;
  for (const [slot] of SLOTS) {
    const it = ITEM_BY_ID[a[slot]];
    if (a[slot] && (!it || it.slot !== slot || !S.owned.includes(a[slot]))) a[slot] = "";
  }
  if (!a.name) a.name = DEFAULT_AVATAR.name;
  // Économie : une sauvegarde d'avant le journal des pièces est reprise telle quelle (achats passés comptés comme
  // dépenses) ; ensuite le solde ne peut jamais dépasser « gagné − dépensé ».
  if (!isObj(src.econ)) {
    const spent = S.owned.filter(id => !DEFAULT_OWNED.includes(id) && !EXCLUSIVES.includes(id)).reduce((t, id) => t + (basePrice(id) || 0), 0);
    const paid = spent + 100 * S.stats.boxes; // chaque boîte déjà ouverte a coûté au moins 100 pièces
    S.econ = { ...S.econ, earned: S.coins + paid, spent: paid };
  }
  if (S.econ.spent > S.econ.earned) S.econ.spent = S.econ.earned;
  S.coins = Math.min(S.coins, S.econ.earned - S.econ.spent);
  if (!S.owned.includes(themeKey(S.theme))) S.theme = "nuit";
  if (S.boostUntil > now + 24 * 3600e3) S.boostUntil = 0;
  if (S.title && !(S.title === "rank" || S.title === "level" || S.badges.includes(S.title))) S.title = "";
  S.levelSeen = Math.min(S.levelSeen, lv);
  S.days.sort();
  return S;
}

// Ancienne version (v1, avant la boutique) : on offre des pièces selon l'XP déjà gagnée et un coffre d'or.
function migrate(raw, S) {
  if (isObj(raw) && raw.v === undefined && Number.isInteger(raw.xp) && raw.xp > 0) {
    S.levelSeen = levelOf(S.xp).level;
    const gift = Math.max(0, 100 + Math.floor(S.xp / 10) - S.coins);
    S.coins += gift; S.econ.earned += gift;
    S.chests = ["gold", ...S.chests];
    S.news = 1;
  }
  S.v = STATE_VERSION;
  return S;
}

export function load(storage = globalThis.localStorage) {
  let raw = null;
  try { raw = JSON.parse(storage.getItem(STORE_KEY) || "null"); } catch (e) { raw = null; }
  return migrate(raw, sanitize(raw));
}
export function persist(S, storage = globalThis.localStorage) {
  try { storage.setItem(STORE_KEY, JSON.stringify(S)); return true; } catch (e) { return false; }
}

// ---------- Sauvegarde dans un fichier ----------
export function exportText(S) {
  return JSON.stringify({ app: "labo-accent", format: STATE_VERSION, exported: new Date().toISOString(), state: S }, null, 1);
}
export function parseImport(textIn) {
  if (typeof textIn !== "string" || textIn.length > MAX_IMPORT) return { ok: false, error: "Fichier trop gros (2 Mo maximum)." };
  let obj;
  try { obj = JSON.parse(textIn); } catch (e) { return { ok: false, error: "Ce fichier n'est pas une sauvegarde valide (JSON illisible)." }; }
  let raw = null, current = false;
  if (isObj(obj) && obj.app === "labo-accent" && isObj(obj.state)) { raw = obj.state; current = Number.isInteger(obj.format) && obj.format >= 2; }
  else if (isObj(obj) && ("xp" in obj || "history" in obj)) raw = obj; // ancienne copie brute (v1)
  if (!raw) return { ok: false, error: "Ce fichier ne vient pas du Labo d'accent." };
  // Le cadeau de mise à jour n'est accordé qu'aux vraies anciennes sauvegardes, pas aux fichiers récents.
  const state = current ? sanitize(raw) : migrate(raw, sanitize(raw));
  return { ok: true, state, summary: { level: levelOf(state.xp).level, xp: state.xp, lessons: Object.keys(state.lessons).length, words: Object.values(state.vocab).filter(r => r.box >= 3).length, coins: state.coins } };
}
