import { dictionary as dict } from "/home/claude/vendor-src/node_modules/cmu-pronouncing-dictionary/index.js";
import * as P from "../js/phonemes.js";
import assert from "node:assert/strict";

const ref = P.buildReference(dict, "I think I'm hungry.");
assert.equal(ref.length, 4);
assert.ok(ref.every(w => w.prons));
console.log("ref ipa:", ref.map(w => P.ipaString(w.prons[0])).join(" "));

const mk = s => P.tokenizeIpa(s).map((p, i) => ({ p, start: i * 0.08, end: i * 0.08 + 0.08, conf: 0.9 }));

// 1. Prononciation parfaite
let r = P.evaluate(ref, mk("aɪθɪŋkaɪmhəŋgɹi"));
console.log("parfait:", r.score, r.words.map(w => w.level).join(","));
assert.ok(r.score >= 95);

// 2. Erreurs typiques de francophone : th -> s, h muet, i court -> i long
r = P.evaluate(ref, mk("aɪsiŋkaɪməŋgɹi"));
console.log("francophone:", r.score, r.words.map(w => `${w.display}:${w.level}:${w.score}`).join(" "));
const tips = P.tipsFor(r);
tips.forEach(t => console.log("  conseil:", t.word, t.sound, "->", t.heard, "|", t.text));
assert.ok(r.score < 85);
assert.equal(r.words[1].level === "good", false);
assert.ok(tips.some(t => t.sound === "θ" && t.heard === "s"));
assert.ok(tips.some(t => t.sound === "h"));

// 3. Consonne finale avalée
const ref2 = P.buildReference(dict, "Can I have a receipt?");
r = P.evaluate(ref2, mk("kænaɪhævəɹəsi"));
console.log("finale:", r.score, P.tipsFor(r).map(t => t.text).join(" / "));
assert.ok(P.tipsFor(r).some(t => t.sound === "t"));

// 4. Variante du dictionnaire ("the" ðə / ði)
const ref3 = P.buildReference(dict, "the end");
r = P.evaluate(ref3, mk("ðiɛnd"));
console.log("variante the:", r.score);
assert.ok(r.score >= 90);

// 5. Décodage CTC sur des logits synthétiques
const V = 44, seq = [41, 33, 33, 41, 18, 18, 25, 21, 41, 16, 41];
const logits = new Float32Array(seq.length * V).fill(-5);
seq.forEach((id, t) => { logits[t * V + id] = 5; });
const dec = P.decodeCTC(logits, seq.length, V);
console.log("ctc:", dec.map(d => d.p).join(""), dec.map(d => d.conf.toFixed(2)).join(","));
assert.deepEqual(dec.map(d => d.p), ["θ", "ɪ", "ŋ", "k"]);

// 6. Mots inconnus du dictionnaire ignorés
const ref4 = P.buildReference(dict, "Hello Xqzv friend");
assert.equal(ref4[1].prons, null);
r = P.evaluate(ref4, mk("həloʊfɹɛnd"));
assert.equal(r.words[1].level, "skip");
console.log("inconnu ignoré:", r.score);

// 7. Silence total
r = P.evaluate(ref, []);
assert.equal(r.score, 0);
console.log("TOUS LES TESTS OK");
