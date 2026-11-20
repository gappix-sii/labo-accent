// Combats de boss (phase 9, tâche 3) : module pur, sans DOM, testé par test/boss.test.mjs.
// Un combat = ATTACKS attaques tirées de la région : phrases de ses leçons à dire, paires d'écoute de ses sons,
// phrases de ses thèmes à dire depuis le français. Le boss a BOSS_HP points de vie, toi HEARTS cœurs.
// - phrase notée (0-100) : sous HIT_MIN, raté → tu perds un cœur ; sinon dégâts = la note (× CRIT_MULT dès CRIT) ;
// - écoute : bonne réponse → LISTEN_DMG dégâts ; mauvaise → tu perds un cœur ;
// - victoire quand ses PV tombent à 0 ; défaite quand tes cœurs tombent à 0 ou que les attaques sont épuisées.
// Difficulté (demande de l'utilisateur du 2026-11-19) : une moyenne de 60 suffit pour gagner, même avec les deux écoutes
// ratées (8 phrases à 60 = 480 dégâts pour 460 PV) ou des notes irrégulières (40 et 80) ; une moyenne de 40 perd
// (relecture de la phase 9, n° 2). Tous les réglages sont ici, à un seul endroit.
import { REGIONS, regionById, regionCleared } from "../content/regions.js";
import { PAIRS } from "../content/pairs.js";
import { addBonusXp } from "./progress.js";
import { MAX_CHESTS, cryptoRng, shuffle } from "./game.js";
import { FAMILIES, familyById, formsText } from "../content/verbs.js";
import { familyDone, questionOf, sentenceOf } from "./verbs.js";

export const HEARTS = 3;
export const BOSS_HP = 460;
export const HIT_MIN = 35;
export const CRIT = 85;
export const CRIT_MULT = 1.5;
export const LISTEN_DMG = 60;
// Ordre des attaques d'un combat : say (phrase d'une leçon), listen (quel mot entends-tu ?), translate (dis-le en anglais).
export const PATTERN = ["say", "say", "listen", "say", "translate", "say", "listen", "say", "translate", "say"];
export const ATTACKS = PATTERN.length;
export const XP_FIRST_WIN = 50; // première victoire : + 50 XP, un coffre d'or et la couronne de la région
export const XP_WIN_AGAIN = 20; // victoires suivantes
export const WIN_CHEST = "gold";


// Attaques d'un combat (fonction pure : même rng → même combat).
export function buildAttacks(region, rng = cryptoRng()) {
  const sound = region.lessons.filter((l) => l.kind === "sound"), theme = region.lessons.filter((l) => l.kind !== "sound"); // thèmes et bases (phase 10)
  const soundItems = shuffle(sound.flatMap((l) => l.items.map((it) => it.en)), rng);
  const themeItems = shuffle(theme.flatMap((l) => l.items), rng);
  const sounds = sound.map((l) => l.p);
  const pairs = shuffle(PAIRS.filter((p) => p.sounds.split("|").some((s) => sounds.includes(s))), rng);
  const say = [], translate = [], nSay = PATTERN.filter((x) => x === "say").length, themeEn = themeItems.map((x) => x.en);
  // phrases à dire : une sur deux tirée des leçons de sons, l'autre des leçons de thème et des bases ;
  // « dis-le en anglais » : d'autres phrases des leçons de thème (celles qui ont une traduction) ; jamais les bases,
  // dont la question peut donner la réponse (« 2e (2nd) ») ou refuser une réponse juste (« fall » pour automne) :
  // relecture de la phase 10, n° 6
  for (let k = 0; say.length < nSay && k < nSay * 4; k++) {
    const en = (k % 2 === 0 ? soundItems : themeEn).find((x) => !say.includes(x));
    if (en) say.push(en);
  }
  const themeOnly = new Set(theme.filter((l) => l.kind === "theme").flatMap((l) => l.items));
  for (const t of themeItems) if (translate.length < 2 && t.fr && themeOnly.has(t) && !say.includes(t.en)) translate.push(t);
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
  if (a.kind === "listen" || a.kind === "choose") { if (value === true) dmg = LISTEN_DMG; else lost = true; }
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
// families : { <famille de verbes> : { wins, tries } } (mini-boss « Le Grimoire », phase 10, tâche 5).
export function newBosses() { return { v: 1, regions: {}, families: {} }; }
const IDS = new Set(REGIONS.map((r) => r.id)), FAM_IDS = new Set(FAMILIES.map((f) => f.id));
const int = (x, max = 1e6) => (Number.isInteger(x) && x >= 0 ? Math.min(x, max) : 0);
export function sanitizeBosses(raw) {
  const B = newBosses();
  if (!raw || typeof raw !== "object" || raw.v !== 1 || !raw.regions || typeof raw.regions !== "object") return B;
  const copy = (from, ids, to) => {
    if (!from || typeof from !== "object") return; // sauvegarde d'avant les mini-boss : pas de « families »
    for (const [id, r] of Object.entries(from)) {
      if (!ids.has(id) || !r || typeof r !== "object") continue;
      const wins = int(r.wins), tries = Math.max(int(r.tries), wins);
      if (tries) to[id] = { wins, tries };
    }
  };
  copy(raw.regions, IDS, B.regions);
  copy(raw.families, FAM_IDS, B.families);
  return B;
}
export const wins = (B, id) => (Object.hasOwn(B.regions, id) ? B.regions[id].wins : 0);
export const familyWins = (B, id) => (B.families && Object.hasOwn(B.families, id) ? B.families[id].wins : 0);
export const wonSet = (B) => new Set(Object.keys(B.regions).filter((id) => B.regions[id].wins > 0));
// Le boss d'une région peut être affronté quand toutes ses leçons sont finies et, si `won` est donné (ensemble des
// régions dont le boss est vaincu), quand le boss de la région d'avant est vaincu : les boss se battent dans l'ordre
// (relecture de la phase 9, n° 6 ; une ancienne sauvegarde avancée ne permet donc pas de sauter un boss).
export function canFight(P, regionId, won = null) {
  const k = REGIONS.findIndex((r) => r.id === regionId);
  if (k < 0 || !regionCleared(P, REGIONS[k])) return false;
  return !won || k === 0 || won.has(REGIONS[k - 1].id);
}

// Fin d'un combat : compte l'essai, et pour une victoire donne XP (et, la première fois, un coffre d'or).
// S : la sauvegarde ({ bosses, progress, game }). Renvoie { won, first, xp, chest }. La récompense de première
// victoire n'est donnée qu'une fois par région.
export function finishFight(S, F, now = Date.now()) {
  if (!F || !F.over || F.done) return null;
  F.done = true;
  const mini = !!F.family, id = mini ? F.family : F.region;
  if (mini && !S.bosses.families) S.bosses.families = {};
  const B = mini ? S.bosses.families : S.bosses.regions;
  if (!Object.hasOwn(B, id)) B[id] = { wins: 0, tries: 0 };
  const R = B[id];
  R.tries++;
  if (F.over !== "won") return { won: false, first: false, xp: 0, chest: null };
  const first = R.wins === 0;
  R.wins++;
  const xp = mini ? (first ? XP_MINI_FIRST : XP_MINI_AGAIN) : first ? XP_FIRST_WIN : XP_WIN_AGAIN;
  addBonusXp(S.progress, xp, now);
  let chest = null;
  if (first) { chest = mini ? MINI_CHEST : WIN_CHEST; S.game.chests = [...S.game.chests, chest].slice(-MAX_CHESTS); }
  return { won: true, first, xp, chest };
}

// ---------- Mini-boss des familles de verbes : « Le Grimoire » (phase 10, tâche 5) ----------
// Mêmes règles que les boss (PV, cœurs, dégâts = la note, critique, une moyenne de 60 suffit), avec des attaques tirées
// de la famille : dire les 3 formes (forms), choisir la bonne forme dans une phrase à trou (choose : bonne réponse →
// LISTEN_DMG dégâts, mauvaise → un cœur perdu), dire une phrase au prétérit ou au present perfect (say), la dire depuis
// le français (translate). Ouvert une fois la famille finie ; pas d'ordre entre les familles.
// Récompense (choix du 2026-11-20) : première victoire + 30 XP et un coffre d'argent ; victoires suivantes + 10 XP.
export const VERB_PATTERN = ["forms", "choose", "say", "forms", "translate", "choose", "say", "forms", "choose", "say"];
export const XP_MINI_FIRST = 30;
export const XP_MINI_AGAIN = 10;
export const MINI_CHEST = "silver";

export function buildVerbAttacks(fam, rng = cryptoRng()) {
  // chaque sorte d'attaque passe les verbes dans l'ordre, avec un décalage : dans une famille de 3, chaque verbe
  // revient à chaque sorte d'attaque (les 3 formes de come, puis de become, puis de run…)
  const verbs = shuffle(fam.verbs, rng), seen = {}, SHIFT = { forms: 0, choose: 1, say: 2, translate: 3 };
  return VERB_PATTERN.map((kind) => {
    const k = (seen[kind] = (seen[kind] ?? -1) + 1), verb = verbs[(k + SHIFT[kind]) % verbs.length], form = rng() < 0.5 ? "past" : "pp";
    if (kind === "forms") return { kind, en: formsText(verb), verb: verb.base };
    if (kind === "choose") {
      const q = questionOf(verb, form, rng);
      return { kind, en: q.en, fr: q.fr, before: q.before, after: q.after, options: q.options, answer: q.right, verb: verb.base, form };
    }
    const s = sentenceOf(verb, form);
    return kind === "translate" ? { kind, en: s.en, fr: s.fr, verb: verb.base } : { kind, en: s.en, verb: verb.base };
  });
}
export function newVerbFight(famId, rng = cryptoRng()) {
  const fam = familyById(famId);
  if (!fam) return null;
  return { family: fam.id, attacks: buildVerbAttacks(fam, rng), i: 0, hp: BOSS_HP, hearts: HEARTS, log: [], over: null };
}
export const canFightFamily = (P, famId) => { const fam = familyById(famId); return !!fam && familyDone(P, fam); };
