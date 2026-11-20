// Corrections de la relecture de la phase 10 (2026-11-20).
import { test } from "node:test";
import assert from "node:assert/strict";
import { REGIONS, lessonOpen } from "../js/content/regions.js";
import { LESSONS } from "../js/content/lessons.js";
import { BASIC_LESSONS } from "../js/content/basics.js";
import { FAMILIES, tuneLang } from "../js/content/verbs.js";
import { newProgress, recordItem } from "../js/core/progress.js";
import { buildAttacks, newBosses, wonSet } from "../js/core/boss.js";
import { mulberry32 } from "../js/core/game.js";
import { nextStep } from "../js/screens/home.js";

const now = new Date(2026, 10, 20, 12).getTime();
const finish = (P, l) => { for (let k = 0; k < l.items.length; k++) recordItem(P, l.id, k, l.items.length, 90, now); };
const won = (...ids) => { const B = newBosses(); for (const id of ids) B.regions[id] = { wins: 1, tries: 1 }; return wonSet(B); };
const core = (r) => r.lessons.filter((l) => l.kind !== "basics");

test("n° 1 : sauvegarde d'avant les bases, région finie et boss vaincu : la région suivante reste ouverte", () => {
  const P = newProgress(), [first, second] = REGIONS;
  for (const l of core(first)) finish(P, l); // les 4 leçons d'avant la phase 10, pas les bases ajoutées depuis
  assert.equal(lessonOpen(P, second.from, won("couple")), true);
  assert.equal(lessonOpen(P, second.from, won()), false, "boss pas vaincu : toujours fermée");
  const basic = LESSONS.findIndex((l) => l.id === first.lessons[4].id);
  assert.equal(lessonOpen(P, basic, won("couple")), true, "les bases de la région d'avant restent jouables");
});

test("n° 2 : « Continuer » reprend dans la région en cours, pas aux bases de la région 1", () => {
  const P = newProgress(), ids = REGIONS.slice(0, 4).map((r) => r.id);
  for (const r of REGIONS.slice(0, 4)) for (const l of core(r)) finish(P, l);
  const fifth = REGIONS[4];
  finish(P, fifth.lessons[0]);
  assert.deepEqual(nextStep(P, won(...ids)), { kind: "lesson", index: fifth.from + 1 });
  // région en cours finie : son boss, puis seulement les bases laissées en arrière
  for (const l of fifth.lessons) finish(P, l);
  assert.deepEqual(nextStep(P, won(...ids)), { kind: "boss", region: fifth.id });
  const all = REGIONS.map((r) => r.id);
  for (const r of REGIONS) for (const l of r.lessons) if (r.id !== "couple" || l.kind !== "basics") finish(P, l);
  assert.deepEqual(nextStep(P, won(...all)), { kind: "lesson", index: LESSONS.findIndex((l) => l.id === REGIONS[0].lessons[4].id) }, "tout le reste fait : les bases oubliées");
});

test("n° 6 : « Dis-le en anglais » jamais tiré des leçons des bases", () => {
  const basics = new Set(BASIC_LESSONS.flatMap((b) => b.items.map((it) => it.en)));
  for (const r of REGIONS) for (let seed = 1; seed <= 30; seed++) {
    for (const a of buildAttacks(r, mulberry32(seed)).filter((x) => x.kind === "translate")) assert.ok(!basics.has(a.en), `${r.id} : « ${a.en} »`);
  }
});

test("n° 9 : langue de la « musique » de chaque famille écrite dans le contenu", () => {
  assert.equal(tuneLang(FAMILIES[0]), "fr");
  assert.ok(FAMILIES.slice(1).every((f) => tuneLang(f) === "en"));
});
