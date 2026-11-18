// Grammaire, jeux de rôle et fautes typiques (phase 4) : XP et suivi. Module pur, sans DOM (test/tracks.test.mjs).
// Règles décidées le 2026-11-17 (PROJET.md) :
// - grammaire et jeux de rôle : même mécanique que les leçons (progress.js, recordItem) : 10 XP par phrase
//   réussie à 65, une fois par passage, + 20 XP quand la règle ou le dialogue est fini. Rangés avec les
//   leçons dans progress.lessons, sous les clés « g-<règle> » et « r-<dialogue> » ;
// - fautes : comme le vocabulaire (5 XP par phrase réussie, bonus de séance pour 5 phrases dites au micro) ;
//   les phrases ratées pèsent plus lourd au tirage, comme les paires de l'écoute.
import { recordItem } from "./progress.js";
import { weightedPick, bumpMiss, cleanMiss } from "./listening.js";

export const MISTAKE_SESSION = 10; // phrases par séance de fautes

export const grammarKey = (id) => "g-" + id;
export const roleKey = (id) => "r-" + id;

// Tours où l'on parle dans un dialogue (ceux qui rapportent des XP).
export const myTurns = (d) => d.turns.filter((t) => t.me);

// Exercice `i` d'une règle de grammaire, noté `score` au micro. Renvoie { passed, xp, lessonDone }.
export const recordGrammar = (P, rule, i, score, now = Date.now()) => recordItem(P, grammarKey(rule.id), i, rule.ex.length, score, now);

// Réplique `k` (0 = la première où l'on parle) d'un dialogue, notée `score`. Renvoie { passed, xp, lessonDone }.
export const recordRole = (P, d, k, score, now = Date.now()) => recordItem(P, roleKey(d.id), k, myTurns(d).length, score, now);

// Rang d'un tour parmi ceux où l'on parle (0 = le premier), ou -1 si c'est le personnage.
export function myIndex(d, pos) {
  if (!d.turns[pos] || !d.turns[pos].me) return -1;
  return d.turns.slice(0, pos).filter((t) => t.me).length;
}

// Tour `pos` d'un dialogue noté `score` : XP comme recordRole, plus l'objectif du tour s'il est réussi
// (task = numéro de l'objectif à cocher, ou null). Passer un tour ne passe pas par ici : ni XP ni objectif.
export function scoreTurn(P, d, pos, score, now = Date.now()) {
  const k = myIndex(d, pos);
  if (k < 0) return { passed: false, xp: 0, lessonDone: false, task: null };
  const got = recordRole(P, d, k, score, now);
  return { ...got, task: got.passed ? d.turns[pos].task : null };
}

// Suivi d'une règle ou d'un dialogue : nombre de fois fini, éléments réussis dans le passage en cours.
export function trackState(P, key) {
  const L = Object.hasOwn(P.lessons, key) ? P.lessons[key] : null;
  return { done: L ? L.done : 0, run: L ? [...L.run] : [] };
}

// ---------- Fautes typiques ----------
export function newMistakes() { return { v: 1, miss: {} }; }

// Séance : `n` phrases sans doublon, les plus ratées plus souvent.
export const pickMistakes = (M, items, rnd = Math.random, n = MISTAKE_SESSION) => weightedPick(M.miss, items, (m) => m.id, rnd, n);

// Réponse : ratée (ou « Je ne sais pas »), la phrase prend du poids ; réussie, elle en perd.
export const recordMistake = (M, id, ok) => bumpMiss(M.miss, id, ok === true);

// File d'une séance : [{ m: faute, again: false }].
export const newMistakeSession = (M, items, rnd = Math.random) => pickMistakes(M, items, rnd).map((m) => ({ m, again: false }));

// Réponse à la phrase `i` de la file. Ratée une 1re fois : elle revient une fois en fin de séance.
// La 2e chance réussie ne retire pas l'erreur : la phrase ratée doit revenir plus souvent aux séances suivantes.
export function answerMistake(M, queue, i, ok) {
  const q = queue[i];
  if (!(q.again && ok)) recordMistake(M, q.m.id, ok);
  if (!ok && !q.again) queue.push({ m: q.m, again: true });
}

const MISTAKE_ID = /^[a-z]{2,10}:[^\u0000-\u001f<>]{1,120}$/;
// known(id) : la faute existe-t-elle encore dans le contenu ? Les noms disparus (phrase corrigée) sont oubliés.
export function sanitizeMistakes(raw, known = () => true) {
  const M = newMistakes();
  if (!raw || typeof raw !== "object" || raw.v !== 1) return M;
  M.miss = cleanMiss(raw.miss, MISTAKE_ID, 200, known);
  return M;
}
