// Tests du contenu des leçons (phase 2, tâche 4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SOUNDS, THEMES, ORDER, LESSONS, CORE_LESSONS, lessonById } from "../js/content/lessons.js";
import { BASIC_LESSONS } from "../js/content/basics.js";
import { buildReference } from "../js/engine/phonemes.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
const sounds = (en) => new Set(buildReference(dict, en).flatMap((w) => w.prons.flatMap((v) => v.map((ph) => ph.p))));

test("parcours alterné : chaque son une fois, chaque moitié de thème une fois", () => {
  assert.equal(CORE_LESSONS.length, 36);
  assert.deepEqual(CORE_LESSONS.map((l) => l.kind), Array.from({ length: 36 }, (_, i) => (i % 2 ? "theme" : "sound")));
  assert.equal(LESSONS.length, 36 + BASIC_LESSONS.length, "les bases s'ajoutent au parcours");
  assert.deepEqual(LESSONS.filter((l) => l.kind !== "basics").map((l) => l.id), CORE_LESSONS.map((l) => l.id), "les leçons de sons et de thèmes gardent leur ordre");
  assert.deepEqual(new Set(ORDER.map(([s]) => s)), new Set(SOUNDS.map((s) => s.id)));
  const halves = ORDER.map(([, t]) => t);
  assert.equal(new Set(halves).size, THEMES.length * 2);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, "identifiants uniques");
  for (const l of LESSONS) {
    const [min, max] = l.kind === "basics" ? [5, 13] : [4, 6];
    assert.ok(l.items.length >= min && l.items.length <= max, `${l.id} : ${l.items.length} éléments`);
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
  for (let i = 1; i < CORE_LESSONS.length; i += 2) {
    const t = CORE_LESSONS[i], p = CORE_LESSONS[i - 1].p;
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

test("leçons des bases (phase 10) : rangées en fin de région, en lettres, avec prononciation et sens", () => {
  const regions = ["couple", "travel", "daily", "past", "work", "out", "health", "fun", "phone"];
  assert.equal(BASIC_LESSONS.length, 14);
  for (const b of BASIC_LESSONS) {
    assert.ok(regions.includes(b.region), b.id);
    const i = LESSONS.findIndex((l) => l.id === b.id), prev = LESSONS[i - 1];
    assert.ok(prev.region === b.region && (prev.kind === "basics" || prev.id === `${b.region}-2`), `${b.id} : après les leçons de sa région`);
    assert.ok(b.icon && b.title && b.sub, b.id);
    for (const it of b.items) {
      assert.ok(!/\d/.test(it.en), `${b.id} : « ${it.en} » contient un chiffre (le moteur ne lit pas les chiffres)`);
      assert.ok(it.fr && it.pron, `${b.id} : « ${it.en} » sans sens ni prononciation`);
      if (it.ex) assert.ok(it.ex.length === 2 && it.ex[0] && it.ex[1], `${b.id} : exemple`);
    }
  }
  assert.equal(new Set(BASIC_LESSONS.flatMap((b) => b.items.map((it) => it.en))).size, BASIC_LESSONS.reduce((n, b) => n + b.items.length, 0), "aucun mot en double");
});
