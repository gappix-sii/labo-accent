// Tests du calcul du score de prononciation (sans le vrai modèle : on simule ce qu'il « entend »).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as P from "../js/engine/phonemes.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
// Fabrique ce que le modèle aurait entendu à partir d'une chaîne de sons.
const heard = (s, conf = 0.9) => P.tokenizeIpa(s).map((p, i) => ({ p, start: i * 0.08, end: i * 0.08 + 0.08, conf }));
const ref = P.buildReference(dict, "I think I'm hungry.");

test("la phrase de référence est trouvée dans le dictionnaire", () => {
  assert.equal(ref.length, 4);
  assert.ok(ref.every((w) => w.prons));
  assert.equal(ref[1].display, "think");
  assert.equal(P.ipaString(ref[1].prons[0]), "θɪŋk");
});

test("une prononciation parfaite obtient au moins 95", () => {
  const r = P.evaluate(ref, heard("aɪθɪŋkaɪmhəŋgɹi"));
  assert.ok(r.score >= 95, `score ${r.score}`);
  assert.ok(r.words.every((w) => w.level === "good"));
});

test("les fautes typiques d'un Français sont repérées sur le bon son", () => {
  // th -> s, i court -> i long, h muet
  const r = P.evaluate(ref, heard("aɪsiŋkaɪməŋgɹi"));
  assert.ok(r.score < 85, `score ${r.score}`);
  assert.notEqual(r.words[1].level, "good");
  const tips = P.tipsFor(r);
  assert.ok(tips.some((t) => t.sound === "θ" && t.heard === "s"), "th prononcé s");
  assert.ok(tips.some((t) => t.sound === "h"), "h muet");
  assert.ok(tips.length <= 4);
});

test("une consonne finale avalée est signalée", () => {
  const r = P.evaluate(P.buildReference(dict, "Can I have a receipt?"), heard("kænaɪhævəɹəsi"));
  const tip = P.tipsFor(r).find((t) => t.sound === "t");
  assert.ok(tip, "le t final de receipt");
  assert.match(tip.text, /avalé/);
});

test("les variantes du dictionnaire sont acceptées (the = ðə ou ði)", () => {
  const r = P.evaluate(P.buildReference(dict, "the end"), heard("ðiɛnd"));
  assert.ok(r.score >= 90, `score ${r.score}`);
});

test("un son entendu sans assurance compte moins qu'un son net", () => {
  const sure = P.evaluate(ref, heard("aɪθɪŋkaɪmhəŋgɹi", 0.9));
  const unsure = P.evaluate(ref, heard("aɪθɪŋkaɪmhəŋgɹi", 0.3));
  assert.ok(unsure.score < sure.score);
});

test("les mots absents du dictionnaire ne sont pas notés", () => {
  const ref4 = P.buildReference(dict, "Hello Xqzv friend");
  assert.equal(ref4[1].prons, null);
  const r = P.evaluate(ref4, heard("həloʊfɹɛnd"));
  assert.equal(r.words[1].level, "skip");
  assert.ok(r.score >= 90, `score ${r.score}`);
});

test("les mots composés absents du dictionnaire sont reconstitués", () => {
  const [w] = P.buildReference(dict, "twenty-one");
  assert.ok(w.prons, "twenty-one");
});

test("le silence donne 0", () => {
  assert.equal(P.evaluate(ref, []).score, 0);
});

test("le décodage de la sortie du modèle (CTC) retrouve les sons", () => {
  const V = 44, seq = [41, 33, 33, 41, 18, 18, 25, 21, 41, 16, 41]; // blanc, θ θ, blanc, ɪ ɪ, ŋ, k, blanc, espace, blanc
  const logits = new Float32Array(seq.length * V).fill(-5);
  seq.forEach((id, t) => { logits[t * V + id] = 5; });
  const dec = P.decodeCTC(logits, seq.length, V);
  assert.deepEqual(dec.map((d) => d.p), ["θ", "ɪ", "ŋ", "k"]);
  assert.ok(dec.every((d) => d.conf > 0.9 && d.end > d.start));
});

test("les statistiques par son s'additionnent", () => {
  const r = P.evaluate(ref, heard("aɪsiŋkaɪməŋgɹi"));
  const s = P.updateSoundStats(P.updateSoundStats({}, r), r);
  assert.equal(s["θ"].n, 2);
  assert.equal(s["θ"].ok, 0);
});
