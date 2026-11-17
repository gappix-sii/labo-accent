// Tests du contenu des leçons (phase 2, tâche 4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SOUNDS, THEMES, ORDER, LESSONS, lessonById } from "../js/content/lessons.js";
import { buildReference } from "../js/engine/phonemes.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
const sounds = (en) => new Set(buildReference(dict, en).flatMap((w) => w.prons.flatMap((v) => v.map((ph) => ph.p))));

test("parcours alterné : chaque son une fois, chaque moitié de thème une fois", () => {
  assert.equal(LESSONS.length, 36);
  assert.deepEqual(LESSONS.map((l) => l.kind), Array.from({ length: 36 }, (_, i) => (i % 2 ? "theme" : "sound")));
  assert.deepEqual(new Set(ORDER.map(([s]) => s)), new Set(SOUNDS.map((s) => s.id)));
  const halves = ORDER.map(([, t]) => t);
  assert.equal(new Set(halves).size, THEMES.length * 2);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, "identifiants uniques");
  for (const l of LESSONS) {
    assert.ok(l.items.length >= 4 && l.items.length <= 6, `${l.id} : ${l.items.length} éléments`);
    assert.equal(lessonById(l.id), l);
  }
  assert.equal(lessonById("nope"), null);
});

test("chaque leçon de son contient son son, dans la plupart de ses éléments", () => {
  for (const l of LESSONS.filter((x) => x.kind === "sound")) {
    const n = l.items.filter((it) => sounds(it.en).has(l.p)).length;
    assert.ok(n >= l.items.length - 1, `${l.id} (${l.p}) : ${n} / ${l.items.length}`);
  }
});

test("chaque leçon de thème réemploie le son de la leçon précédente", () => {
  for (let i = 1; i < LESSONS.length; i += 2) {
    const t = LESSONS[i], p = LESSONS[i - 1].p;
    assert.equal(t.p, p);
    const n = t.items.filter((it) => sounds(it.en).has(p)).length;
    assert.ok(n >= (p === "ʤ" ? 1 : 2), `${t.id} (${p}) : ${n} phrase(s)`);
    for (const it of t.items) assert.ok(it.fr, `traduction manquante : ${it.en}`);
  }
});

test("chaque mot est dans le dictionnaire (prononciation fiable, pas devinée)", () => {
  const missing = [];
  for (const l of LESSONS) for (const it of l.items) {
    for (const w of it.en.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g)) if (!Object.hasOwn(dict, w.toLowerCase())) missing.push(w);
  }
  assert.deepEqual([...new Set(missing)], []);
});
