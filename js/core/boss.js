// Combats de boss (phase 9, tâche 3) : module pur, sans DOM, testé par test/boss.test.mjs.
// Un combat = ATTACKS attaques tirées de la région : phrases de ses leçons à dire, paires d'écoute de ses sons,
// phrases de ses thèmes à dire depuis le français. Le boss a BOSS_HP points de vie, toi HEARTS cœurs.
// - phrase notée (0-100) : sous HIT_MIN, raté → tu perds un cœur ; sinon dégâts = la note (× CRIT_MULT dès CRIT) ;
// - écoute : bonne réponse → LISTEN_DMG dégâts ; mauvaise → tu perds un cœur ;
// - victoire quand ses PV tombent à 0 ; défaite quand tes cœurs tombent à 0 ou que les attaques sont épuisées.
// Difficulté (demande de l'utilisateur du 2026-11-19) : une moyenne de 60 suffit pour gagner, avec de la marge
// (10 attaques à 60 font 600 dégâts pour 500 PV). Tous les réglages sont ici, à un seul endroit.
import { REGIONS, regionById, regionCleared } from "../content/regions.js";
import { PAIRS } from "../content/pairs.js";
import { addBonusXp } from "./progress.js";
import { MAX_CHESTS, cryptoRng } from "./game.js";

export const HEARTS = 3;
export const BOSS_HP = 500;
export const HIT_MIN = 45;
export const CRIT = 85;
export const CRIT_MULT = 1.5;
export const LISTEN_DMG = 60;
// Ordre des attaques d'un combat : say (phrase d'une leçon), listen (quel mot entends-tu ?), translate (dis-le en anglais).
export const PATTERN = ["say", "say", "listen", "say", "translate", "say", "listen", "say", "translate", "say"];
export const ATTACKS = PATTERN.length;
export const XP_FIRST_WIN = 50; // première victoire : + 50 XP, un coffre d'or et la couronne de la région
export const XP_WIN_AGAIN = 20; // victoires suivantes
export const WIN_CHEST = "gold";

const shuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Attaques d'un combat (fonction pure : même rng → même combat).
export function buildAttacks(region, rng = cryptoRng()) {
  const sound = region.lessons.filter((l) => l.kind === "sound"), theme = region.lessons.filter((l) => l.kind === "theme");
  const soundItems = shuffle(sound.flatMap((l) => l.items.map((it) => it.en)), rng);
  const themeItems = shuffle(theme.flatMap((l) => l.items), rng);
  const sounds = sound.map((l) => l.p);
  const pairs = shuffle(PAIRS.filter((p) => p.sounds.split("|").some((s) => sounds.includes(s))), rng);
  const say = [], translate = [], nSay = PATTERN.filter((x) => x === "say").length, themeEn = themeItems.map((x) => x.en);
  // phrases à dire : une sur deux tirée des leçons de sons, l'autre des leçons de thème ;
  // « dis-le en anglais » : d'autres phrases de thème (celles qui ont une traduction)
  for (let k = 0; say.length < nSay && k < nSay * 4; k++) {
    const en = (k % 2 === 0 ? soundItems : themeEn).find((x) => !say.includes(x));
    if (en) say.push(en);
  }
  for (const t of themeItems) if (translate.length < 2 && t.fr && !say.includes(t.en)) translate.push(t);
  let s = 0, t = 0, l = 0;
  return PATTERN.map((kind) => {
    if (kind === "say") return { kind, en: say[s++ % say.length] };
    if (kind === "translate") { const x = translate[t++ % translate.length]; return { kind, en: x.en, fr: x.fr }; }
    const p = pairs[l++ % pairs.length], side = rng() < 0.5 ? "a" : "b";
    return { kind, pair: p.id, a: p.a.en, b: p.b.en, answer: side, en: p[side].en };
  });
}

export function newFight(regionId, rng = cryptoRng()) {
  const region = regionById(regionId);
  if (!region) return null;
  return { region: region.id, attacks: buildAttacks(region, rng), i: 0, hp: BOSS_HP, hearts: HEARTS, log: [], over: null };
}
export const currentAttack = (F) => (F && !F.over ? F.attacks[F.i] : null);

// Une attaque jouée. value : la note (phrase) ou true/false (écoute). Renvoie ce qui s'est passé.
export function attack(F, value) {
  const a = currentAttack(F);
  if (!a) return null;
  let dmg = 0, crit = false, lost = false;
  if (a.kind === "listen") { if (value === true) dmg = LISTEN_DMG; else lost = true; }
  else {
    const s = Math.max(0, Math.min(100, Number(value) || 0));
    if (s < HIT_MIN) lost = true; else { crit = s >= CRIT; dmg = Math.round(s * (crit ? CRIT_MULT : 1)); }
  }
  F.hp = Math.max(0, F.hp - dmg);
  if (lost) F.hearts = Math.max(0, F.hearts - 1);
  F.i++;
  F.over = F.hp === 0 ? "won" : F.hearts === 0 || F.i >= F.attacks.length ? "lost" : null;
  const out = { kind: a.kind, dmg, crit, lost, over: F.over };
  F.log.push(out);
  return out;
}

// ---------- Sauvegarde : section « bosses » de labo.v2 ----------
// regions : { <région> : { wins, tries } } ; un boss vaincu au moins une fois donne la couronne de sa région.
export function newBosses() { return { v: 1, regions: {} }; }
const IDS = new Set(REGIONS.map((r) => r.id));
const int = (x, max = 1e6) => (Number.isInteger(x) && x >= 0 ? Math.min(x, max) : 0);
export function sanitizeBosses(raw) {
  const B = newBosses();
  if (!raw || typeof raw !== "object" || raw.v !== 1 || !raw.regions || typeof raw.regions !== "object") return B;
  for (const [id, r] of Object.entries(raw.regions)) {
    if (!IDS.has(id) || !r || typeof r !== "object") continue;
    const wins = int(r.wins), tries = Math.max(int(r.tries), wins);
    if (tries) B.regions[id] = { wins, tries };
  }
  return B;
}
export const wins = (B, id) => (Object.hasOwn(B.regions, id) ? B.regions[id].wins : 0);
export const wonSet = (B) => new Set(Object.keys(B.regions).filter((id) => B.regions[id].wins > 0));
// Le boss d'une région peut être affronté quand toutes ses leçons sont finies.
export const canFight = (P, regionId) => { const r = regionById(regionId); return !!r && regionCleared(P, r); };

// Fin d'un combat : compte l'essai, et pour une victoire donne XP (et, la première fois, un coffre d'or).
// S : la sauvegarde ({ bosses, progress, game }). Renvoie { won, first, xp, chest }. La récompense de première
// victoire n'est donnée qu'une fois par région.
export function finishFight(S, F, now = Date.now()) {
  if (!F || !F.over || F.done) return null;
  F.done = true;
  const B = S.bosses, id = F.region;
  if (!Object.hasOwn(B.regions, id)) B.regions[id] = { wins: 0, tries: 0 };
  const R = B.regions[id];
  R.tries++;
  if (F.over !== "won") return { won: false, first: false, xp: 0, chest: null };
  const first = R.wins === 0;
  R.wins++;
  const xp = first ? XP_FIRST_WIN : XP_WIN_AGAIN;
  addBonusXp(S.progress, xp, now);
  let chest = null;
  if (first) { chest = WIN_CHEST; S.game.chests = [...S.game.chests, chest].slice(-MAX_CHESTS); }
  return { won: true, first, xp, chest };
}
