// Tests de la phase 9, tâche 1 : 9 régions, étoiles des leçons, verrous des régions gardées par un boss.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REGIONS, lessonOpen, regionCleared, regionStars, regionOfLesson, regionById } from "../js/content/regions.js";
import { LESSONS, THEMES } from "../js/content/lessons.js";
import { newProgress, recordItem, sanitizeProgress, starsOf, STAR_2, STAR_3 } from "../js/core/progress.js";

const now = new Date(2026, 10, 19, 12).getTime();
const finish = (P, l, score = 95) => { for (let k = 0; k < l.items.length; k++) recordItem(P, l.id, k, l.items.length, score, now); };

test("9 régions, une par thème : 2 leçons de sons, 2 de thème, puis les bases, dans l'ordre du parcours", () => {
  assert.equal(REGIONS.length, 9);
  assert.equal(REGIONS.reduce((n, r) => n + r.lessons.length, 0), LESSONS.length, "chaque leçon a une région, une seule");
  assert.deepEqual(REGIONS.flatMap((r) => r.lessons.map((l) => l.id)), LESSONS.map((l) => l.id), "aucune leçon ne change de place");
  assert.deepEqual(REGIONS.map((r) => r.id), THEMES.map((t) => t.id).filter((id) => REGIONS.some((r) => r.id === id)));
  for (const r of REGIONS) {
    assert.deepEqual(r.lessons.slice(0, 4).map((l) => l.kind), ["sound", "theme", "sound", "theme"], r.id);
    assert.ok(r.lessons.slice(4).every((l) => l.kind === "basics") && r.lessons.length <= 6, `${r.id} : puis 0 à 2 leçons des bases`);
    assert.equal(LESSONS[r.from], r.lessons[0], `${r.id} : début de région`);
    assert.ok(r.lessons.filter((l) => l.kind === "theme").every((l) => l.id.startsWith(`${r.id}-`)), `${r.id} : ses leçons de thème sont les siennes`);
    assert.ok(r.name && r.icon && r.theme, r.id);
    assert.equal(regionById(r.id), r);
    assert.equal(regionOfLesson(r.from), r);
  }
  assert.equal(new Set(REGIONS.map((r) => r.name)).size, 9, "noms tous différents");
});

test("étoiles : 0 tant que la leçon n'est pas finie, puis 1 à 3 selon la moyenne des meilleures notes", () => {
  const l = LESSONS[0], P = newProgress();
  assert.equal(starsOf(P, l.id, l.items.length), 0);
  finish(P, l, 66);
  assert.equal(starsOf(P, l.id, l.items.length), 1);
  finish(P, l, STAR_2);
  assert.equal(starsOf(P, l.id, l.items.length), 2, "rejouer fait monter les étoiles");
  finish(P, l, 70);
  assert.equal(starsOf(P, l.id, l.items.length), 2, "une moins bonne partie ne fait pas perdre d'étoile");
  finish(P, l, STAR_3);
  assert.equal(starsOf(P, l.id, l.items.length), 3);
  const R = REGIONS[0];
  assert.deepEqual(regionStars(P, R), { got: 3, max: 3 * R.lessons.length });
  // une leçon commencée mais pas finie : aucune étoile
  const Q = newProgress(); recordItem(Q, l.id, 0, l.items.length, 100, now);
  assert.equal(starsOf(Q, l.id, l.items.length), 0);
});

test("verrous : la 1re leçon d'une région attend le boss d'avant ; une leçon commencée reste ouverte", () => {
  const P = newProgress(), first = REGIONS[0], second = REGIONS[1];
  assert.equal(lessonOpen(P, 0, new Set()), true);
  assert.equal(lessonOpen(P, 1, new Set()), false);
  for (const l of first.lessons) finish(P, l);
  assert.equal(regionCleared(P, first), true);
  assert.equal(regionCleared(P, second), false);
  assert.equal(lessonOpen(P, second.from, new Set()), false, "région finie, boss pas encore vaincu");
  assert.equal(lessonOpen(P, second.from, new Set(["couple"])), true, "boss vaincu : la région suivante s'ouvre");
  assert.equal(lessonOpen(P, second.from + 1, new Set(["couple"])), false, "puis leçon par leçon");
  assert.equal(lessonOpen(P, second.from, null), true, "boss pas encore branchés : seule la règle de la phase 2 compte");
  // ancienne sauvegarde : une leçon déjà commencée au-delà d'un boss reste ouverte
  const old = sanitizeProgress(JSON.parse(JSON.stringify(P)));
  recordItem(old, LESSONS[second.from].id, 0, LESSONS[second.from].items.length, 80, now);
  assert.equal(lessonOpen(old, second.from, new Set()), true);
  assert.equal(lessonOpen(P, -1), false); assert.equal(lessonOpen(P, LESSONS.length), false);
});
