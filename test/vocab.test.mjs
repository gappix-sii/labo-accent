// Tests des contenus de la phase 3 : vocabulaire et paires de mots pour l'écoute.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS, VOCAB, ALL_WORDS, sayText, wordById } from "../js/content/vocab.js";
import { PAIRS, pairById } from "../js/content/pairs.js";
import { lookupProns } from "../js/engine/phonemes.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));

test("vocabulaire : 5 niveaux, mots uniques, traduits, tous dans le dictionnaire", () => {
  assert.deepEqual(LEVELS.map((l) => l.id), ["A1", "A2", "B1", "B2", "C1"]);
  assert.ok(ALL_WORDS.length >= 500, `${ALL_WORDS.length} mots`);
  assert.equal(new Set(ALL_WORDS.map((w) => w.id)).size, ALL_WORDS.length, "identifiants uniques");
  const missing = [];
  for (const w of ALL_WORDS) {
    assert.ok(w.fr, `traduction manquante : ${w.en}`);
    assert.ok(VOCAB[w.level].includes(w));
    assert.equal(wordById(w.id), w);
    assert.ok(!/^to /.test(sayText(w)));
    for (const x of sayText(w).toLowerCase().match(/[a-z']+/g)) if (!Object.hasOwn(dict, x)) missing.push(x);
  }
  assert.deepEqual(missing, []);
  assert.equal(wordById("Z9:rien"), null);
});

// Écart entre deux prononciations : « A|B » si un seul son change, « X|- » s'il manque un son.
function oneSoundApart(a, b) {
  if (a.length === b.length) {
    const d = a.map((x, i) => (x !== b[i] ? i : -1)).filter((i) => i >= 0);
    return d.length === 1 ? `${a[d[0]]}|${b[d[0]]}` : null;
  }
  const [L, S, rev] = a.length > b.length ? [a, b, false] : [b, a, true];
  if (L.length - S.length !== 1) return null;
  for (let i = 0; i < L.length; i++) if ([...L.slice(0, i), ...L.slice(i + 1)].join(" ") === S.join(" ")) return rev ? `-|${L[i]}` : `${L[i]}|-`;
  return null;
}

test("paires d'écoute : un seul son change, celui qui est annoncé", () => {
  assert.ok(PAIRS.length >= 30, `${PAIRS.length} paires`);
  assert.equal(new Set(PAIRS.map((p) => p.id)).size, PAIRS.length);
  for (const p of PAIRS) {
    const pa = lookupProns(dict, p.a.en)[0].map((x) => x.p), pb = lookupProns(dict, p.b.en)[0].map((x) => x.p);
    assert.equal(oneSoundApart(pa, pb), p.sounds, `${p.a.en} / ${p.b.en}`);
    assert.ok(p.a.fr && p.b.fr);
    assert.equal(pairById(p.id), p);
  }
});
