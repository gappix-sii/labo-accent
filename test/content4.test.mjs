// Tests des contenus de la phase 4 : grammaire, fautes typiques, jeux de rôle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GRAMMAR, GLEVELS, grammarById, grammarTexts, answerOf } from "../js/content/grammar.js";
import { MISTAKE_CATS, ALL_MISTAKES, mistakeById } from "../js/content/mistakes.js";
import { DIALOGUES, dialogueById, dialogueTexts } from "../js/content/dialogues.js";
import { buildReference } from "../js/engine/phonemes.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
// Mots qu'il ne sait pas prononcer, demandés au moteur lui-même (les chiffres, par exemple).
const unknown = (t) => buildReference(dict, t).filter((w) => /[a-z0-9]/i.test(w.display) && !w.prons).map((w) => w.display);
const words = (t) => t.replace(/[.,!?]/g, "").split(/\s+/).filter(Boolean);

test("grammaire : 25 règles A1-B2, exercices bien formés", () => {
  assert.equal(GRAMMAR.length, 25);
  assert.deepEqual(GLEVELS, ["A1", "A2", "B1", "B2"]);
  assert.equal(new Set(GRAMMAR.map((g) => g.id)).size, GRAMMAR.length, "identifiants uniques");
  for (const g of GRAMMAR) {
    assert.equal(grammarById(g.id), g);
    assert.ok(GLEVELS.includes(g.level) && g.title && g.rule && g.trap, g.id);
    assert.ok(g.examples.length >= 3 && g.examples.every(([en, fr]) => en && fr), g.id);
    assert.ok(g.ex.length >= 4, g.id);
    for (const e of g.ex) {
      if (e[0] === "c") {
        assert.equal(e[1].split("___").length, 2, `un seul trou : ${e[1]}`);
        assert.ok(Number.isInteger(e[3]) && e[3] >= 0 && e[3] < e[2].length && e[4], e[1]);
        assert.equal(new Set(e[2]).size, e[2].length, `choix en double : ${e[1]}`);
      } else if (e[0] === "o") {
        assert.ok(words(e[1]).length >= 3 && e[2], `phrase à remettre dans l'ordre : ${e[1]}`);
      } else {
        assert.equal(e[0], "f", g.id);
        assert.ok(e[1] && e[2] && e[4] && e[3].length >= 1, e[2]);
        assert.ok(![e[1], ...e[3]].includes(e[2]), `la bonne phrase est aussi proposée comme fausse : ${e[2]}`);
      }
      assert.ok(!answerOf(e).includes("___"));
    }
  }
  assert.equal(grammarById("rien"), null);
});

test("fautes : 46 phrases, bonne version différente de la fausse, explication", () => {
  assert.equal(ALL_MISTAKES.length, 46);
  assert.equal(new Set(ALL_MISTAKES.map((m) => m.id)).size, ALL_MISTAKES.length, "identifiants uniques");
  for (const m of ALL_MISTAKES) {
    assert.ok(m.wrong && m.right && m.why && m.wrong !== m.right, m.id);
    assert.ok(MISTAKE_CATS.some((c) => c.id === m.cat));
    assert.equal(mistakeById(m.id), m);
  }
});

test("jeux de rôle : 10 dialogues, tours alternés, objectifs tous atteints", () => {
  assert.equal(DIALOGUES.length, 10);
  assert.equal(new Set(DIALOGUES.map((d) => d.id)).size, DIALOGUES.length);
  for (const d of DIALOGUES) {
    assert.equal(dialogueById(d.id), d);
    assert.ok(d.title && d.level && d.goal && d.role && d.tasks.length, d.id);
    d.turns.forEach((t, i) => {
      if (i > 0) assert.notEqual(!!t.ai, !!d.turns[i - 1].ai, `${d.id} : tour ${i} pas alterné`);
      if (t.ai) assert.ok(t.fr, `${d.id} : traduction manquante`);
      else {
        assert.ok(t.me.length >= 1 && t.me.every(([en, fr]) => en && fr) && t.hint, `${d.id} : tour ${i}`);
        assert.ok(Number.isInteger(t.task) && t.task < d.tasks.length, `${d.id} : objectif du tour ${i}`);
      }
    });
    const reached = new Set(d.turns.filter((t) => t.me).map((t) => t.task));
    assert.equal(reached.size, d.tasks.length, `${d.id} : un objectif n'est jamais atteint`);
  }
  assert.equal(dialogueById("rien"), null);
});

test("chaque phrase dite est lisible par le moteur (pas de chiffres ni de mot inconnu)", () => {
  const texts = [...GRAMMAR.flatMap(grammarTexts), ...ALL_MISTAKES.map((m) => m.right), ...DIALOGUES.flatMap(dialogueTexts)];
  const missing = texts.flatMap((t) => unknown(t).map((w) => `${w} (${t})`));
  assert.deepEqual(missing, []);
});
