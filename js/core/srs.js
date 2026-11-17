// Répétition espacée « à boîtes » pour le vocabulaire (phase 3). Module pur, sans DOM : test/srs.test.mjs.
// Chaque mot vu est dans une boîte de 1 à 5. Réussi (65 ou plus au micro) → boîte suivante ;
// raté ou « Je ne sais pas » → boîte 1. Un mot revient après le délai de sa boîte (0 = le jour même).
// Séance du jour : les mots à revoir (les plus en retard d'abord), puis des nouveaux mots du niveau choisi,
// jusqu'au quota du jour. Tous les réglages sont ici.
import { dayKey } from "./progress.js";

export const DELAYS = [0, 1, 3, 7, 16]; // jours avant de revoir un mot, boîte 1 à 5
export const PER_DAY = [5, 10, 20]; // nouveaux mots par jour, au choix
export const DEFAULT_PER_DAY = 10;
export const REVIEW_MAX = 30; // mots à revoir par séance, au plus
export const LEVEL_IDS = ["A1", "A2", "B1", "B2", "C1"];
const MAX_CARDS = 3000;

export function newSrs() {
  return { v: 1, level: "A1", perDay: DEFAULT_PER_DAY, cards: {}, fresh: { day: "", n: 0 } };
}

// Jour « AAAA-MM-JJ » + n jours (à midi : à l'abri des changements d'heure).
export function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n, 12).getTime());
}

// Nouveaux mots encore permis aujourd'hui.
export function freshLeft(R, now = Date.now()) {
  const used = R.fresh.day === dayKey(now) ? R.fresh.n : 0;
  return Math.max(0, R.perDay - used);
}

// Mots à revoir aujourd'hui, les plus en retard d'abord (puis les boîtes basses).
export function dueToday(R, now = Date.now()) {
  const today = dayKey(now);
  return Object.entries(R.cards)
    .filter(([, c]) => c.due <= today)
    .sort(([, a], [, b]) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box))
    .map(([id]) => id);
}

// Séance du jour : ids des mots à revoir, puis des nouveaux mots du niveau choisi (dans l'ordre de la liste).
// words : les mots du niveau choisi ({ id }). known(id) : le mot existe-t-il encore dans la liste ?
// Les mots retirés de la liste sont écartés AVANT la limite, sinon, jamais revus, ils restent
// « les plus en retard » et finissent par prendre toutes les places de révision.
export function session(R, words, now = Date.now(), known = () => true) {
  const review = dueToday(R, now).filter(known).slice(0, REVIEW_MAX);
  const fresh = words.filter((w) => !Object.hasOwn(R.cards, w.id)).slice(0, freshLeft(R, now)).map((w) => w.id);
  return { review, fresh, all: [...review, ...fresh] };
}

// Réponse à un mot : ok = réussi. Renvoie la carte mise à jour.
export function answer(R, id, ok, now = Date.now()) {
  const today = dayKey(now);
  let c = Object.hasOwn(R.cards, id) ? R.cards[id] : null;
  if (!c) { // premier passage : le mot compte dans les nouveaux mots du jour
    if (R.fresh.day !== today) R.fresh = { day: today, n: 0 };
    R.fresh.n++;
    c = R.cards[id] = { box: 1, due: today, seen: 0, ok: 0 };
  }
  c.seen++;
  if (ok) { c.ok++; c.box = Math.min(DELAYS.length, c.box + 1); }
  else c.box = 1;
  c.due = addDays(today, DELAYS[c.box - 1]);
  return c;
}

export function setLevel(R, level) { if (!LEVEL_IDS.includes(level)) return false; R.level = level; return true; }
export function setPerDay(R, n) { if (!PER_DAY.includes(n)) return false; R.perDay = n; return true; }

// Combien de mots par boîte (affichage), et combien sont « sus » (boîte 4 ou 5).
export function boxes(R) {
  const n = [0, 0, 0, 0, 0];
  for (const c of Object.values(R.cards)) n[c.box - 1]++;
  return n;
}

// Relecture d'une sauvegarde : tout est vérifié, une valeur abîmée est écartée sans planter.
const int = (v, min, max, def = 0) => (Number.isInteger(v) && v >= min && v <= max ? v : def);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const CARD_ID = /^(A1|A2|B1|B2|C1):[a-z0-9' ,.?!-]{1,60}$/i;
export function sanitizeSrs(raw) {
  const R = newSrs();
  if (!raw || typeof raw !== "object" || raw.v !== 1) return R;
  if (LEVEL_IDS.includes(raw.level)) R.level = raw.level;
  if (PER_DAY.includes(raw.perDay)) R.perDay = raw.perDay;
  if (raw.fresh && typeof raw.fresh === "object" && DAY.test(raw.fresh.day)) R.fresh = { day: raw.fresh.day, n: int(raw.fresh.n, 0, 1000) };
  if (raw.cards && typeof raw.cards === "object") {
    for (const id of Object.keys(raw.cards).filter((k) => CARD_ID.test(k)).slice(0, MAX_CARDS)) {
      const c = raw.cards[id];
      if (!c || typeof c !== "object" || !DAY.test(c.due)) continue;
      const seen = int(c.seen, 1, 1e6, 1);
      R.cards[id] = { box: int(c.box, 1, DELAYS.length, 1), due: c.due, seen, ok: Math.min(int(c.ok, 0, 1e6), seen) };
    }
  }
  return R;
}
