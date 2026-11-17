// Progression du joueur (phase 2) : XP, niveau, série de jours, objectif du jour, état des leçons.
// Module pur, sans DOM : tout se teste avec Node (test/progress.test.mjs). Règles décidées le 2026-11-17 :
// - un élément est réussi à PASS (70) ou plus ; réessais libres ;
// - 10 XP par élément réussi, une fois par passage de la leçon, + 20 XP quand la leçon est finie ;
// - objectif du jour : 50 XP (20, 50 ou 100 au choix) ; la série compte les jours où il est atteint,
//   d'affilée, et repart à zéro après un jour manqué (date locale de l'appareil).
// Tous les réglages sont ici, à un seul endroit.
export const PASS = 70;
export const XP_ITEM = 10;
export const XP_LESSON = 20;
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
  if (passed && !L.run.includes(item)) {
    L.run.push(item);
    xp += XP_ITEM;
    if (L.run.length >= size) { // tous les éléments réussis dans ce passage
      xp += XP_LESSON; L.done++; L.run = []; lessonDone = true;
    }
  }
  addXp(P, xp, now);
  return { passed, xp, lessonDone };
}

// Une leçon est ouverte si c'est la première, ou si la précédente a été finie au moins une fois.
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
