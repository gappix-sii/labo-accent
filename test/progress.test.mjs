// Tests de la progression (phase 2, tâche 6) : XP, niveaux, série de jours, objectif, sauvegarde.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newProgress, recordItem, levelOf, levelCost, streakNow, todayXp, setGoal, unlocked, dayKey, sanitizeProgress,
  PASS, XP_ITEM, XP_LESSON, DEFAULT_GOAL
} from "../js/core/progress.js";
import { defaults, sanitize, load, save } from "../js/core/store.js";
import { LESSONS } from "../js/content/lessons.js";

const at = (d, h = 12, m = 0) => new Date(2026, 10, d, h, m).getTime(); // novembre 2026, heure locale
const finish = (P, id, size, now) => { for (let i = 0; i < size; i++) recordItem(P, id, i, size, 90, now); };

test("XP : 10 par élément réussi, une fois par passage, + 20 en fin de leçon", () => {
  const P = newProgress();
  assert.deepEqual(recordItem(P, "s-h", 0, 3, PASS - 1, at(17)), { passed: false, xp: 0, lessonDone: false });
  assert.deepEqual(recordItem(P, "s-h", 0, 3, PASS, at(17)), { passed: true, xp: XP_ITEM, lessonDone: false });
  assert.equal(recordItem(P, "s-h", 0, 3, 100, at(17)).xp, 0, "le même élément ne rapporte qu'une fois");
  recordItem(P, "s-h", 2, 3, 80, at(17));
  assert.deepEqual(recordItem(P, "s-h", 1, 3, 75, at(17)), { passed: true, xp: XP_ITEM + XP_LESSON, lessonDone: true });
  assert.equal(P.xp, 3 * XP_ITEM + XP_LESSON);
  assert.equal(P.lessons["s-h"].done, 1);
  assert.deepEqual(P.lessons["s-h"].best, [100, 75, 80]);
  // nouveau passage : la leçon rapporte à nouveau
  assert.equal(recordItem(P, "s-h", 0, 3, 90, at(17)).xp, XP_ITEM);
  // élément hors de la leçon : ignoré
  assert.equal(recordItem(P, "s-h", 7, 3, 90, at(17)).xp, 0);
});

test("niveaux : 100 XP, puis 50 de plus à chaque niveau", () => {
  assert.deepEqual(levelOf(0), { level: 1, into: 0, need: 100 });
  assert.deepEqual(levelOf(99), { level: 1, into: 99, need: 100 });
  assert.deepEqual(levelOf(100), { level: 2, into: 0, need: 150 });
  assert.deepEqual(levelOf(100 + 150 + 10), { level: 3, into: 10, need: 200 });
  assert.equal(levelCost(10), 550);
});

test("série : un jour où l'objectif est atteint ; un jour manqué la remet à zéro", () => {
  const P = newProgress();
  assert.equal(P.goal, DEFAULT_GOAL);
  finish(P, "a", 2, at(17)); // 40 XP : objectif de 50 pas atteint
  assert.equal(todayXp(P, at(17)), 40);
  assert.equal(streakNow(P, at(17)), 0);
  recordItem(P, "b", 0, 5, 90, at(17)); // 50
  assert.equal(streakNow(P, at(17)), 1);
  finish(P, "c", 5, at(17)); // encore des XP le même jour : la série ne bouge pas
  assert.equal(streakNow(P, at(17)), 1);
  finish(P, "a", 5, at(18));
  assert.equal(streakNow(P, at(18)), 2, "le lendemain");
  assert.equal(streakNow(P, at(19, 23, 59)), 2, "le jour suivant, pas encore joué : la série tient");
  assert.equal(streakNow(P, at(20)), 0, "un jour manqué : la série tombe");
  finish(P, "a", 5, at(20));
  assert.equal(streakNow(P, at(20)), 1, "elle repart de 1");
});

test("minuit : les XP de 23 h 59 et de 0 h 01 comptent sur deux jours", () => {
  const P = newProgress();
  finish(P, "a", 5, at(17, 23, 59)); // 70 XP le 17
  finish(P, "b", 5, at(18, 0, 1)); // 70 XP le 18
  assert.equal(P.days["2026-11-17"], 70);
  assert.equal(P.days["2026-11-18"], 70);
  assert.equal(streakNow(P, at(18, 0, 2)), 2);
  assert.equal(dayKey(at(1)), "2026-11-01");
  assert.equal(dayKey(new Date(2026, 0, 1, 0, 0).getTime()), "2026-01-01");
  // fin de mois et d'année
  const Q = newProgress();
  finish(Q, "a", 5, new Date(2026, 11, 31, 20).getTime());
  finish(Q, "a", 5, new Date(2027, 0, 1, 9).getTime());
  assert.equal(streakNow(Q, new Date(2027, 0, 1, 10).getTime()), 2);
});

test("objectif réglable : 20, 50 ou 100 ; abaissé, il peut valider le jour", () => {
  const P = newProgress();
  recordItem(P, "a", 0, 5, 90, at(17));
  recordItem(P, "a", 1, 5, 90, at(17)); // 20 XP
  assert.equal(streakNow(P, at(17)), 0);
  assert.equal(setGoal(P, 30, at(17)), false);
  assert.equal(setGoal(P, 20, at(17)), true);
  assert.equal(streakNow(P, at(17)), 1);
  assert.equal(P.goal, 20);
});

test("leçons ouvertes : la suivante s'ouvre quand la précédente est finie", () => {
  const P = newProgress(), ids = LESSONS.map((l) => l.id);
  assert.equal(unlocked(P, ids, 0), true);
  assert.equal(unlocked(P, ids, 1), false);
  finish(P, ids[0], LESSONS[0].items.length, at(17));
  assert.equal(unlocked(P, ids, 1), true);
  assert.equal(unlocked(P, ids, 2), false);
});

test("sauvegarde : la progression survit à un rechargement", () => {
  const mem = new Map(), storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const S = defaults();
  finish(S.progress, "s-h", 6, at(17));
  recordItem(S.progress, "couple-1", 0, 5, 88, at(17));
  assert.ok(save(S, storage));
  const back = load(storage);
  assert.deepEqual(back.progress, S.progress);
  assert.equal(streakNow(back.progress, at(17)), 1);
});

test("sauvegarde abîmée ou trafiquée : nettoyée sans planter", () => {
  assert.deepEqual(sanitizeProgress(null), newProgress());
  assert.deepEqual(sanitizeProgress({ v: 2, xp: 50 }), newProgress(), "version inconnue");
  const P = sanitizeProgress({
    v: 1, xp: -5, goal: 70,
    days: { "2026-11-17": 30, "hier": 10, "2026-11-18": "beaucoup", "2026-11-19": 1e12 },
    streak: { count: "3", last: "<script>" },
    lessons: { "s-h": { best: [90, 400, "x", 70.5], run: [0, 0, 1, -1, 99, "2"], done: 2 }, "__proto__": { done: 1 }, "Bad Id": {}, "x": 5 }
  });
  assert.equal(P.xp, 0);
  assert.equal(P.goal, DEFAULT_GOAL);
  assert.deepEqual(P.days, { "2026-11-17": 30 });
  assert.deepEqual(P.streak, { count: 0, last: "" });
  assert.deepEqual(Object.keys(P.lessons), ["s-h"]);
  assert.deepEqual(P.lessons["s-h"], { best: [90, 0, 0, 0], run: [0, 1], done: 2 });
  // l'historique des jours est limité
  const days = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [dayKey(at(1) - i * 864e5), 10]));
  assert.equal(Object.keys(sanitizeProgress({ v: 1, days }).days).length, 60);
  // sauvegarde de la phase 1 sans progression : progression neuve
  assert.deepEqual(sanitize({ version: 1, sentence: 3 }).progress, newProgress());
});
