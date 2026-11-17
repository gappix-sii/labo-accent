// Tests des exercices de grammaire (phase 4, tâche 3) et des adresses de l'écran.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shuffle, wordsOf, optionsOf, isRight, exerciseClick } from "../js/screens/exercises.js";
import { GRAMMAR, answerOf } from "../js/content/grammar.js";
import { route } from "../js/main.js";

const seeded = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const all = GRAMMAR.flatMap((g) => g.ex);

test("mélange : mêmes éléments, ordre changé", () => {
  const a = [1, 2, 3, 4, 5, 6];
  const b = shuffle(a, seeded(4));
  assert.deepEqual([...b].sort(), a);
  assert.notDeepEqual(b, a);
  assert.deepEqual(a, [1, 2, 3, 4, 5, 6], "la liste d'origine n'est pas touchée");
});

test("mots à remettre dans l'ordre : sans ponctuation finale ni majuscule révélatrice", () => {
  assert.deepEqual(wordsOf("They are in the kitchen."), ["they", "are", "in", "the", "kitchen"]);
  assert.deepEqual(wordsOf("I'm cold!"), ["I'm", "cold"]);
  assert.deepEqual(wordsOf("I live in Lyon."), ["I", "live", "in", "Lyon"]);
});

test("chaque exercice : propositions complètes, la bonne réponse est juste, une autre est fausse", () => {
  for (const [k, e] of all.entries()) {
    const opts = optionsOf(e, seeded(k + 1));
    if (e[0] === "o") {
      const words = wordsOf(e[1]);
      assert.deepEqual([...opts].sort(), [...words].sort(), e[1]);
      if (new Set(words).size > 1) assert.notDeepEqual(opts, words, `déjà dans l'ordre : ${e[1]}`);
      assert.ok(isRight(e, words), e[1]);
      assert.ok(!isRight(e, [...words].reverse()) || words.length < 2, e[1]);
    } else {
      const good = e[0] === "c" ? e[2][e[3]] : e[2];
      assert.ok(opts.includes(good), answerOf(e));
      assert.ok(isRight(e, good), answerOf(e));
      assert.ok(opts.some((o) => !isRight(e, o)), `aucune mauvaise proposition : ${answerOf(e)}`);
    }
  }
});

test("clics : choisir une fois, placer et retirer des mots, vérifier", () => {
  const c = all.find((e) => e[0] === "c");
  const st = { options: c[2], placed: [], answer: null, right: false };
  const btn = (data) => ({ dataset: data });
  assert.ok(exerciseClick(c, st, "opt", btn({ i: String(c[3]) })));
  assert.equal(st.right, true);
  assert.equal(exerciseClick(c, st, "opt", btn({ i: "0" })), false, "réponse donnée : plus de changement");
  const o = all.find((e) => e[0] === "o");
  const words = wordsOf(o[1]), so = { options: words, placed: [], answer: null, right: false };
  exerciseClick(o, so, "place", btn({ i: "1" }));
  exerciseClick(o, so, "place", btn({ i: "1" }));
  assert.deepEqual(so.placed, [1], "un mot ne se place qu'une fois");
  exerciseClick(o, so, "unplace", btn({ k: "0" }));
  assert.deepEqual(so.placed, []);
  assert.equal(exerciseClick(o, so, "check", btn({})), false, "vérifier demande tous les mots");
  words.forEach((_, i) => exerciseClick(o, so, "place", btn({ i: String(i) })));
  exerciseClick(o, so, "check", btn({}));
  assert.equal(so.right, true);
});

test("adresses de la grammaire", () => {
  assert.deepEqual(route("#grammaire"), { screen: "grammarList" });
  assert.deepEqual(route("#grammaire/be"), { screen: "grammar", id: "be" });
  assert.deepEqual(route("#grammaire/../x"), { screen: "home" });
  assert.deepEqual(route("#grammaire/<b>"), { screen: "home" });
});
