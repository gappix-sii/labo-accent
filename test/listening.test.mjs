// Tests de l'exercice d'écoute par paires de mots (phase 3, tâche 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newListening, pickQuestions, recordPair, sanitizeListening, QUESTIONS } from "../js/core/listening.js";
import { PAIRS } from "../js/content/pairs.js";
import { defaults, sanitize } from "../js/core/store.js";
import { route } from "../js/main.js";

// Hasard reproductible pour les tests.
const seeded = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);

test("séance de 10 questions, sans paire répétée, mot joué tantôt a, tantôt b", () => {
  const qs = pickQuestions(newListening(), PAIRS, seeded(1));
  assert.equal(qs.length, QUESTIONS);
  assert.equal(new Set(qs.map((x) => x.pair.id)).size, QUESTIONS);
  const sides = new Set(pickQuestions(newListening(), PAIRS, seeded(2), 30).map((x) => x.side));
  assert.deepEqual([...sides].sort(), ["a", "b"]);
  assert.equal(pickQuestions(newListening(), PAIRS.slice(0, 3), seeded(3)).length, 3, "moins de paires que de questions");
});

test("une paire ratée revient plus souvent qu'une paire réussie", () => {
  const L = newListening(), target = PAIRS[20].id;
  for (let k = 0; k < 3; k++) recordPair(L, target, false);
  assert.equal(L.miss[target], 3);
  let withMiss = 0, without = 0;
  for (let s = 1; s <= 300; s++) {
    if (pickQuestions(L, PAIRS, seeded(s)).some((x) => x.pair.id === target)) withMiss++;
    if (pickQuestions(newListening(), PAIRS, seeded(s)).some((x) => x.pair.id === target)) without++;
  }
  assert.ok(withMiss > without * 1.4, `avec erreurs : ${withMiss} / 300 séances, sans : ${without}`);
  recordPair(L, target, true); recordPair(L, target, true); recordPair(L, target, true);
  assert.equal(Object.hasOwn(L.miss, target), false, "réussie trois fois : poids effacé");
  for (let k = 0; k < 9; k++) recordPair(L, target, false);
  assert.equal(L.miss[target], 5, "plafonné");
});

test("sauvegarde : nettoyée si abîmée ; adresse #ecoute", () => {
  const L = sanitizeListening({ v: 1, miss: { "ship-sheep": 2, "<x>": 3, "live-leave": 99, "sit-seat": "2", "__proto__": 1 } });
  assert.deepEqual(L, { v: 1, miss: { "ship-sheep": 2 } });
  assert.deepEqual(sanitizeListening({ v: 9 }), newListening());
  assert.deepEqual(sanitize({ version: 1 }).listening, newListening());
  assert.deepEqual(defaults().listening, newListening());
  assert.deepEqual(route("#ecoute"), { screen: "listening" });
});
