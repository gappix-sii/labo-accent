// Progression du joueur (phase 2) : XP, niveau, série de jours, objectif du jour, état des leçons.
// Module pur, sans DOM : tout se teste avec Node (test/progress.test.mjs). Règles décidées le 2026-11-17 :
// - un élément est réussi à PASS (65) ou plus ; réessais libres ;
// - 10 XP par élément réussi, une fois par passage de la leçon, + 20 XP quand la leçon est finie ;
// - vocabulaire : 5 XP par mot réussi ; écoute : 2 XP par bonne réponse ; + 10 XP en fin de séance ;
// - grammaire, jeux de rôle et fautes (phase 4) : voir js/core/tracks.js ;
// - objectif du jour : 50 XP (20, 50 ou 100 au choix) ; la série compte les jours où il est atteint,
//   d'affilée, et repart à zéro après un jour manqué (date locale de l'appareil).
// Tous les réglages sont ici, à un seul endroit.
export const PASS = 65; // abaissé de 70 à 65 le 2026-11-17, à la demande de l'utilisateur
export const XP_ITEM = 10;
export const XP_LESSON = 20;
// Phase 3 : vocabulaire (mot dit au micro, réussi à PASS) et écoute (bonne réponse sur une paire de mots).
export const XP_WORD = 5;
export const XP_LISTEN = 2;
export const XP_SESSION = 10; // bonus de fin de séance (vocabulaire ou écoute)
export const SESSION_MIN = 5; // le bonus demande au moins 5 réponses dans la séance
export const GOALS = [20, 50, 100];
export const DEFAULT_GOAL = 50;
const DAYS_KEPT = 60; // historique des XP par jour
const MAX_ITEMS = 20, MAX_LESSONS = 300;

// Niveau n → n + 1 : 100 XP, puis 50 de plus à chaque niveau (100, 150, 200…).
export const levelCost = (n) => 100 + 50 * (n - 1);
export function levelOf(xp) {
  let level = 1, rest = xp;
  while (rest >= levelCost(level)) { rest -= levelCost(level); level++; }
  return { level, into: rest, need: levelCost(level) };
}

// Jour local « AAAA-MM-JJ » : la série suit l'heure de l'appareil, pas celle de Londres.
export function dayKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function previousDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime()); // midi : à l'abri des changements d'heure
}

export function newProgress() {
  return { v: 1, xp: 0, goal: DEFAULT_GOAL, days: {}, streak: { count: 0, last: "" }, lessons: {} };
}

function lesson(P, id) {
  if (!Object.hasOwn(P.lessons, id)) P.lessons[id] = { best: [], run: [], done: 0 };
  return P.lessons[id];
}

function addXp(P, n, now) {
  if (n <= 0) return;
  const today = dayKey(now);
  P.xp += n;
  P.days[today] = (P.days[today] || 0) + n;
  const keys = Object.keys(P.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - DAYS_KEPT))) delete P.days[k];
  checkGoal(P, now);
}

// XP d'un bonus (victoire contre un boss, phase 9) : compte pour le jour, l'objectif et la série comme les autres.
export function addBonusXp(P, n, now = Date.now()) { addXp(P, Math.max(0, Math.round(Number(n) || 0)), now); }

// Objectif atteint aujourd'hui : la série avance (une seule fois par jour).
function checkGoal(P, now) {
  const today = dayKey(now);
  if ((P.days[today] || 0) < P.goal || P.streak.last === today) return;
  P.streak.count = P.streak.last === previousDay(today) ? P.streak.count + 1 : 1;
  P.streak.last = today;
}

// Série affichée : elle tient tant que le dernier jour réussi est aujourd'hui ou hier.
export function streakNow(P, now) {
  const today = dayKey(now);
  return P.streak.last === today || P.streak.last === previousDay(today) ? P.streak.count : 0;
}
export const todayXp = (P, now) => P.days[dayKey(now)] || 0;

// Un essai sur l'élément `item` (0, 1, 2…) d'une leçon de `size` éléments.
// Renvoie ce qu'il a rapporté : { passed, xp, lessonDone }.
export function recordItem(P, id, item, size, score, now = Date.now()) {
  if (!Number.isInteger(item) || item < 0 || item >= Math.min(size, MAX_ITEMS)) return { passed: false, xp: 0, lessonDone: false };
  const L = lesson(P, id), s = Math.max(0, Math.min(100, Math.round(score) || 0));
  L.best[item] = Math.max(L.best[item] || 0, s);
  const passed = s >= PASS;
  let xp = 0, lessonDone = false;
  // Numéros hors de la leçon (contenu raccourci depuis, sauvegarde abîmée) : oubliés, ils ne comptent pas.
  L.run = L.run.filter((i) => i < size);
  if (passed && !L.run.includes(item)) {
    L.run.push(item);
    xp += XP_ITEM;
    if (Array.from({ length: size }, (_, i) => i).every((i) => L.run.includes(i))) { // tous réussis dans ce passage
      xp += XP_LESSON; L.done++; L.run = []; lessonDone = true;
    }
  }
  addXp(P, xp, now);
  return { passed, xp, lessonDone };
}

// Un mot du vocabulaire : réussi s'il est noté PASS ou plus. Renvoie les XP gagnés.
export function recordWord(P, score, now = Date.now()) {
  const xp = (Math.round(score) || 0) >= PASS ? XP_WORD : 0;
  addXp(P, xp, now);
  return xp;
}

// Conversation libre (phase 5) : phrase corrigée redite au micro, 10 XP si elle est notée PASS ou plus.
// L'écran ne l'appelle qu'une fois par correction réussie. Renvoie les XP gagnés.
export function recordFree(P, score, now = Date.now()) {
  const xp = (Math.round(score) || 0) >= PASS ? XP_ITEM : 0;
  addXp(P, xp, now);
  return xp;
}

// Une réponse de l'exercice d'écoute. Renvoie les XP gagnés.
export function recordListen(P, ok, now = Date.now()) {
  const xp = ok === true ? XP_LISTEN : 0;
  addXp(P, xp, now);
  return xp;
}

// Fin d'une séance de vocabulaire ou d'écoute : bonus si elle compte au moins SESSION_MIN réponses.
export function finishSession(P, answers, now = Date.now()) {
  const xp = Number.isInteger(answers) && answers >= SESSION_MIN ? XP_SESSION : 0;
  addXp(P, xp, now);
  return xp;
}

// Étoiles d'une leçon (phase 9, tâche 1), d'après la moyenne des meilleures notes de ses éléments (déjà enregistrées) :
// 0 tant qu'elle n'est pas finie, 1 ★ finie, 2 ★ dès STAR_2 de moyenne, 3 ★ dès STAR_3. On rejoue pour les décrocher.
export const STAR_2 = 75;
export const STAR_3 = 85;
export function starsOf(P, id, size) {
  const L = Object.hasOwn(P.lessons, id) ? P.lessons[id] : null;
  if (!L || L.done === 0 || size <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < size; i++) sum += L.best[i] || 0;
  const avg = sum / size;
  return avg >= STAR_3 ? 3 : avg >= STAR_2 ? 2 : 1;
}

// Une leçon est ouverte si c'est la première, ou si la précédente a été finie au moins une fois
// (règle de base ; la carte y ajoute les boss : lessonOpen dans js/content/regions.js).
export function unlocked(P, ids, index) {
  if (index <= 0) return true;
  const prev = ids[index - 1];
  return Object.hasOwn(P.lessons, prev) && P.lessons[prev].done > 0;
}

export function setGoal(P, goal, now = Date.now()) {
  if (!GOALS.includes(goal)) return false;
  P.goal = goal;
  checkGoal(P, now); // un objectif abaissé peut être déjà atteint aujourd'hui
  return true;
}

// Relecture d'une sauvegarde : tout est vérifié, une valeur abîmée revient à zéro sans planter.
const int = (v, min, max, def = 0) => (Number.isInteger(v) && v >= min && v <= max ? v : def);
const DAY = /^\d{4}-\d{2}-\d{2}$/, ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function sanitizeProgress(raw) {
  const P = newProgress();
  if (!raw || typeof raw !== "object" || raw.v !== 1) return P;
  P.xp = int(raw.xp, 0, 1e9);
  P.goal = GOALS.includes(raw.goal) ? raw.goal : DEFAULT_GOAL;
  if (raw.days && typeof raw.days === "object") {
    const keys = Object.keys(raw.days).filter((k) => DAY.test(k)).sort().slice(-DAYS_KEPT);
    for (const k of keys) { const n = int(raw.days[k], 1, 1e7, 0); if (n) P.days[k] = n; }
  }
  if (raw.streak && typeof raw.streak === "object" && (raw.streak.last === "" || DAY.test(raw.streak.last))) {
    P.streak = { count: int(raw.streak.count, 0, 1e5), last: raw.streak.last };
  }
  if (raw.lessons && typeof raw.lessons === "object") {
    for (const id of Object.keys(raw.lessons).filter((k) => k.length <= 24 && ID.test(k)).slice(0, MAX_LESSONS)) {
      const L = raw.lessons[id];
      if (!L || typeof L !== "object") continue;
      const best = Array.isArray(L.best) ? L.best.slice(0, MAX_ITEMS).map((x) => int(x, 0, 100)) : [];
      const run = Array.isArray(L.run) ? [...new Set(L.run.filter((x) => Number.isInteger(x) && x >= 0 && x < MAX_ITEMS))] : [];
      P.lessons[id] = { best, run, done: int(L.done, 0, 1e6) };
    }
  }
  return P;
}
