// Tests des XP et du suivi de la phase 4 : grammaire, jeux de rôle, fautes typiques (tâche 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordGrammar, recordRole, trackState, grammarKey, roleKey, myTurns, newMistakes, pickMistakes,
  recordMistake, sanitizeMistakes, MISTAKE_SESSION } from "../js/core/tracks.js";
import { PASS, newProgress, recordWord, finishSession, sanitizeProgress, unlocked, todayXp, XP_ITEM, XP_LESSON, XP_WORD, XP_SESSION } from "../js/core/progress.js";
import { GRAMMAR } from "../js/content/grammar.js";
import { DIALOGUES } from "../js/content/dialogues.js";
import { ALL_MISTAKES } from "../js/content/mistakes.js";
import { LESSONS } from "../js/content/lessons.js";
import { defaults, sanitize } from "../js/core/store.js";

const day = Date.UTC(2026, 10, 17, 12);
const seeded = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);

test("grammaire : 10 XP par exercice réussi, une fois par passage, + 20 à la fin de la règle", () => {
  const P = newProgress(), rule = GRAMMAR[0], n = rule.ex.length;
  assert.deepEqual(recordGrammar(P, rule, 0, PASS - 1, day), { passed: false, xp: 0, lessonDone: false });
  assert.equal(recordGrammar(P, rule, 0, 85, day).xp, XP_ITEM);
  assert.equal(recordGrammar(P, rule, 0, 95, day).xp, 0, "même exercice réussi deux fois : une seule fois");
  for (let i = 1; i < n - 1; i++) recordGrammar(P, rule, i, 80, day);
  assert.deepEqual(trackState(P, grammarKey(rule.id)), { done: 0, run: Array.from({ length: n - 1 }, (_, i) => i) });
  const last = recordGrammar(P, rule, n - 1, 100, day);
  assert.deepEqual(last, { passed: true, xp: XP_ITEM + XP_LESSON, lessonDone: true });
  assert.equal(P.xp, n * XP_ITEM + XP_LESSON);
  assert.deepEqual(trackState(P, grammarKey(rule.id)), { done: 1, run: [] });
  assert.equal(recordGrammar(P, rule, n, 100, day).xp, 0, "exercice hors de la règle");
  assert.equal(todayXp(P, day), P.xp, "compte pour l'objectif du jour");
});

test("jeu de rôle : XP par réplique dite, dialogue fini, rien hors des tours où l'on parle", () => {
  const P = newProgress(), d = DIALOGUES[0], k = myTurns(d).length;
  assert.ok(k >= 2);
  let xp = 0;
  for (let i = 0; i < k; i++) xp += recordRole(P, d, i, 90, day).xp;
  assert.equal(xp, k * XP_ITEM + XP_LESSON);
  assert.equal(trackState(P, roleKey(d.id)).done, 1);
  assert.equal(recordRole(P, d, k, 90, day).xp, 0);
});

test("grammaire et jeux de rôle n'ouvrent ni ne ferment aucune leçon du parcours", () => {
  const P = newProgress();
  for (const g of GRAMMAR) for (let i = 0; i < g.ex.length; i++) recordGrammar(P, g, i, 100, day);
  for (const d of DIALOGUES) for (let i = 0; i < myTurns(d).length; i++) recordRole(P, d, i, 100, day);
  const ids = LESSONS.map((l) => l.id);
  assert.equal(unlocked(P, ids, 1), false, "la 2e leçon reste fermée");
  assert.ok(!ids.some((id) => /^[gr]-/.test(id)), "aucune leçon ne commence par g- ou r-");
  const back = sanitizeProgress(JSON.parse(JSON.stringify(P)));
  assert.equal(trackState(back, grammarKey(GRAMMAR.at(-1).id)).done, 1, "relu après sauvegarde");
  assert.equal(trackState(back, roleKey(DIALOGUES.at(-1).id)).done, 1);
});

test("fautes : séance de 10 sans doublon, phrase ratée plus fréquente, XP comme le vocabulaire", () => {
  const M = newMistakes();
  const s = pickMistakes(M, ALL_MISTAKES, seeded(1));
  assert.equal(s.length, MISTAKE_SESSION);
  assert.equal(new Set(s.map((m) => m.id)).size, MISTAKE_SESSION);
  const target = ALL_MISTAKES[30].id;
  for (let i = 0; i < 3; i++) recordMistake(M, target, false);
  let withMiss = 0, without = 0;
  for (let k = 1; k <= 300; k++) {
    if (pickMistakes(M, ALL_MISTAKES, seeded(k)).some((m) => m.id === target)) withMiss++;
    if (pickMistakes(newMistakes(), ALL_MISTAKES, seeded(k)).some((m) => m.id === target)) without++;
  }
  assert.ok(withMiss > without * 1.4, `avec erreurs : ${withMiss} / 300, sans : ${without}`);
  for (let i = 0; i < 3; i++) recordMistake(M, target, true);
  assert.deepEqual(M.miss, {});
  const P = newProgress();
  assert.equal(recordWord(P, 75, day), XP_WORD);
  assert.equal(finishSession(P, 5, day), XP_SESSION);
  assert.equal(finishSession(P, 4, day), 0, "moins de 5 phrases dites : pas de bonus");
});

test("sauvegarde des fautes : nettoyée si abîmée ou trafiquée", () => {
  const id = ALL_MISTAKES[0].id;
  const M = sanitizeMistakes({ v: 1, miss: { [id]: 2, "gram:<img>": 1, "x": 3, [ALL_MISTAKES[1].id]: 9, [ALL_MISTAKES[2].id]: "1" } });
  assert.deepEqual(M, { v: 1, miss: { [id]: 2 } });
  assert.deepEqual(sanitizeMistakes({ v: 2, miss: { [id]: 1 } }), newMistakes());
  assert.deepEqual(sanitizeMistakes(null), newMistakes());
  assert.deepEqual(defaults().mistakes, newMistakes());
  assert.deepEqual(sanitize({ version: 1 }).mistakes, newMistakes());
});
