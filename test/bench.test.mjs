// Tests du banc de test du moteur (tâche 7) : consignes, journal, bilan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SENTENCES } from "../js/content/sentences.js";
import { buildReference, evaluate, tipsFor, tokenizeIpa } from "../js/engine/phonemes.js";
import { defaults, sanitize, summarize, logEntry, addLog } from "../js/core/store.js";
import { latest, caught, summary, benchText } from "../js/screens/bench.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
const heard = (s) => tokenizeIpa(s).map((p, i) => ({ p, start: i / 10, end: i / 10 + 0.1, conf: 0.9 }));
const run = (i, ipa) => { const res = evaluate(buildReference(dict, SENTENCES[i].en), heard(ipa)); return summarize(SENTENCES[i].en, { result: res, tips: tipsFor(res) }); };

test("chaque son attendu existe bien dans la phrase", () => {
  for (const s of SENTENCES) {
    // toutes les variantes du dictionnaire (« live » : laɪv ou lɪv)
    const sounds = new Set(buildReference(dict, s.en).flatMap((w) => w.prons.flatMap((v) => v.map((ph) => ph.p))));
    assert.ok(s.fault && s.expect.length, s.en);
    for (const p of s.expect) assert.ok(sounds.has(p), `« ${p} » absent de : ${s.en}`);
  }
});

test("le journal garde le dernier essai de chaque type et fait le bilan", () => {
  const S = defaults();
  addLog(S, logEntry(0, "soigné", run(0, "aɪθɪŋkðɪsɪzðəθɝdwən"), 1));
  addLog(S, logEntry(0, "fautes", run(0, "aɪsɪŋkzɪsɪzzəsɝdwən"), 2));
  const rows = latest(S);
  assert.ok(rows[0].soigné.score >= 90, "soigné : " + rows[0].soigné.score);
  assert.ok(rows[0].soigné.score - rows[0].fautes.score >= 15, "écart net : " + rows[0].fautes.score);
  assert.deepEqual(caught(0, rows[0].fautes).map((c) => c.ok), [true, true], "θ et ð repérés");
  assert.deepEqual(summary(S), { done: 1, gap: 1, hits: 2, wanted: 2 });
  const txt = benchText(S);
  assert.match(txt, /θ oui, ð oui/);
  assert.match(txt, /Bilan : 1\/10/);
});

test("le journal relu est nettoyé et limité", () => {
  const S = defaults();
  for (let k = 0; k < 150; k++) addLog(S, { s: 1, kind: "fautes", score: 50, at: k, bad: [] });
  assert.equal(S.log.length, 100);
  const t = sanitize({ version: 1, log: [{ s: 2, kind: "pirate", score: 5 }, { s: 3, kind: "soigné", score: 400, bad: [{ p: "θθθθθθ", heard: 5 }] }, "x"] });
  assert.equal(t.log.length, 1);
  assert.equal(t.log[0].score, 0);
  assert.equal(t.log[0].bad[0].p.length, 4);
  assert.equal(t.log[0].bad[0].heard, null);
  assert.equal(sanitize({ version: 1, kind: "autre" }).kind, "soigné");
});
