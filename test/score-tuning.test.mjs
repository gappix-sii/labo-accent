// Réglages de la note relevés au test du moteur de la phase 1 (phase 2, tâche 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildReference, evaluate, tokenizeIpa, lookupProns, FOCUS_WEIGHT } from "../js/engine/phonemes.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
const heard = (s) => tokenizeIpa(s).map((p, i) => ({ p, start: i / 10, end: i / 10 + 0.1, conf: 0.9 }));
const run = (en, ipa, opts) => evaluate(buildReference(dict, en), heard(ipa), opts);
const bad = (res) => res.words.flatMap((w) => w.phones.filter((ph) => ph.status === "bad").map((ph) => ph.p));

test("« live » : la variante lɪv est la référence, laɪv reste acceptée", () => {
  assert.deepEqual(lookupProns(dict, "live")[0].map((ph) => ph.p), ["l", "ɪ", "v"]);
  // dit comme « leave » : la faute est signalée sur ɪ (pas sur aɪ)
  assert.deepEqual(bad(run("I live here.", "aɪlivhiɹ")), ["ɪ"]);
  // « live » adjectif (laɪv) : pas de faute
  assert.deepEqual(bad(run("I live here.", "aɪlaɪvhiɹ")), []);
  assert.deepEqual(bad(run("I live here.", "aɪlɪvhiɹ")), []);
});

test("r anglais : ɹ et ɝ sont acceptés l'un pour l'autre", () => {
  assert.deepEqual(bad(run("I live here.", "aɪlɪvhiɝ")), [], "here entendu hiɝ");
  assert.deepEqual(bad(run("Her first word was bird.", "hɝfɹstwɝdwəzbɹd")), []);
  // un r français (entendu comme h ou g) reste une faute
  assert.deepEqual(bad(run("The red car.", "ðəhɛdkɑh")), ["ɹ", "ɹ"]);
});

test("le son travaillé pèse plus dans la note", () => {
  const en = "He is happy in his house.", noH = "iɪzæpiɪnɪzaʊs";
  const plain = run(en, noH).score, focused = run(en, noH, { focus: ["h"] }).score;
  assert.ok(plain - focused >= 8, `sans h : ${plain} → ${focused}`);
  // une prononciation correcte reste à 100
  assert.equal(run(en, "hiɪzhæpiɪnhɪzhaʊs", { focus: ["h"] }).score, 100);
  // une faute sur un autre son coûte autant qu'avant à peu près
  const other = "hiɪshæpiɪnhɪzhaʊs"; // z → s
  assert.ok(Math.abs(run(en, other).score - run(en, other, { focus: ["h"] }).score) <= 3);
  assert.equal(FOCUS_WEIGHT, 3);
});
