// Tests des écrans de la phase 2 (tâche 7) : navigation, état des leçons, reprise d'une leçon.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route } from "../js/main.js";
import { lessonState, vocabToday, practiceCounts } from "../js/screens/home.js";
import { firstToDo, nextToDo } from "../js/screens/lesson.js";
import { newProgress, recordItem } from "../js/core/progress.js";
import { LESSONS } from "../js/content/lessons.js";
import { buildQueue } from "../js/screens/vocab.js";
import { newSrs, answer, setLevel } from "../js/core/srs.js";

test("navigation par l'adresse", () => {
  assert.deepEqual(route(""), { screen: "home" });
  assert.deepEqual(route("#accueil"), { screen: "home" });
  assert.deepEqual(route("#lecon/s-h"), { screen: "lesson", id: "s-h" });
  assert.deepEqual(route("#banc"), { screen: "bench" });
  assert.deepEqual(route("#vocab"), { screen: "vocab" });
  assert.deepEqual(route("#lecon/../x"), { screen: "home" });
  assert.deepEqual(route("#lecon/<img>"), { screen: "home" });
});

test("séance de vocabulaire : nouveaux mots du niveau choisi, puis révisions", () => {
  const R = newSrs(), now = new Date(2026, 10, 17, 12).getTime();
  let q = buildQueue(R, now);
  assert.equal(q.length, 10);
  assert.ok(q.every((x) => x.fresh && x.id.startsWith("A1:")));
  answer(R, q[0].id, false, now);
  setLevel(R, "B1");
  q = buildQueue(R, now);
  assert.equal(q[0].id, "A1:hello", "le mot raté revient d'abord, même après un changement de niveau");
  assert.equal(q[0].fresh, false);
  assert.ok(q.slice(1).every((x) => x.id.startsWith("B1:")));
  assert.equal(q.length, 1 + 9, "quota du jour : 9 nouveaux mots restants");
});

test("état des leçons : première ouverte, suivantes verrouillées, avancement du passage", () => {
  const P = newProgress(), first = LESSONS[0], n = first.items.length;
  assert.deepEqual(lessonState(P, 0), { open: true, done: 0, run: 0 });
  assert.deepEqual(lessonState(P, 1), { open: false, done: 0, run: 0 });
  recordItem(P, first.id, 0, n, 90);
  recordItem(P, first.id, 2, n, 90);
  assert.deepEqual(lessonState(P, 0), { open: true, done: 0, run: 2 });
  assert.equal(firstToDo(P.lessons[first.id], n), 1, "reprise au premier élément pas encore réussi");
  for (let i = 0; i < n; i++) recordItem(P, first.id, i, n, 90);
  assert.deepEqual(lessonState(P, 0), { open: true, done: 1, run: 0 });
  assert.equal(lessonState(P, 1).open, true);
  assert.equal(firstToDo(null, n), 0);
});

test("accueil : compteur du vocabulaire du jour (nouveaux, puis à revoir)", () => {
  const R = newSrs(), day = Date.UTC(2026, 10, 17, 12);
  assert.deepEqual(vocabToday(R, day), { review: 0, fresh: 10 });
  const q = buildQueue(R, day);
  answer(R, q[0].id, false, day); answer(R, q[1].id, true, day);
  assert.deepEqual(vocabToday(R, day), { review: 1, fresh: 8 }, "le mot raté est à revoir le jour même");
  assert.deepEqual(vocabToday(R, day + 86400000), { review: 2, fresh: 10 }, "le lendemain : les deux mots, et 10 nouveaux");
});

test("accueil : avancement de la grammaire, des fautes et des jeux de rôle", async () => {
  const { defaults } = await import("../js/core/store.js");
  const { recordGrammar, recordRole, recordMistake, myTurns } = await import("../js/core/tracks.js");
  const { GRAMMAR } = await import("../js/content/grammar.js");
  const { DIALOGUES } = await import("../js/content/dialogues.js");
  const { ALL_MISTAKES } = await import("../js/content/mistakes.js");
  const S = defaults();
  assert.deepEqual(practiceCounts(S), { grammar: 0, roles: 0, mistakes: 0 });
  GRAMMAR[0].ex.forEach((_, i) => recordGrammar(S.progress, GRAMMAR[0], i, 90));
  recordGrammar(S.progress, GRAMMAR[1], 0, 90); // règle commencée, pas finie
  myTurns(DIALOGUES[2]).forEach((_, i) => recordRole(S.progress, DIALOGUES[2], i, 90));
  recordMistake(S.mistakes, ALL_MISTAKES[0].id, false); recordMistake(S.mistakes, ALL_MISTAKES[5].id, false);
  assert.deepEqual(practiceCounts(S), { grammar: 1, roles: 1, mistakes: 2 });
});

test("exercice suivant : le prochain pas encore réussi, en faisant le tour, sinon le suivant", () => {
  assert.equal(nextToDo([], 0, 5), 1);
  assert.equal(nextToDo([1, 2], 0, 5), 3);
  assert.equal(nextToDo([0, 1, 2, 4], 3, 5), 4, "seul reste l'élément affiché : on passe au suivant");
  assert.equal(nextToDo([1, 2, 3, 4], 4, 5), 0, "repart du début");
});
