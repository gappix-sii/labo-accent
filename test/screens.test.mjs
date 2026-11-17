// Tests des écrans de la phase 2 (tâche 7) : navigation, état des leçons, reprise d'une leçon.
import { test } from "node:test";
import assert from "node:assert/strict";
import { route } from "../js/main.js";
import { lessonState } from "../js/screens/home.js";
import { firstToDo } from "../js/screens/lesson.js";
import { newProgress, recordItem } from "../js/core/progress.js";
import { LESSONS } from "../js/content/lessons.js";

test("navigation par l'adresse", () => {
  assert.deepEqual(route(""), { screen: "home" });
  assert.deepEqual(route("#accueil"), { screen: "home" });
  assert.deepEqual(route("#lecon/s-h"), { screen: "lesson", id: "s-h" });
  assert.deepEqual(route("#banc"), { screen: "bench" });
  assert.deepEqual(route("#lecon/../x"), { screen: "home" });
  assert.deepEqual(route("#lecon/<img>"), { screen: "home" });
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
