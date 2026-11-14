// Tests du socle : rendu HTML sûr, sauvegarde, phrases, bibliothèques copiées, nettoyage de l'audio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { html, toHTMLString } from "../js/core/dom.js";
import { STORE_KEY, defaults, sanitize, load, save, summarize } from "../js/core/store.js";
import { SENTENCES } from "../js/content/sentences.js";
import { buildReference, evaluate, tipsFor, tokenizeIpa } from "../js/engine/phonemes.js";
import { trimAndNormalize } from "../js/engine/recorder.js";

const dict = JSON.parse(readFileSync(new URL("../data/cmudict.json", import.meta.url), "utf8"));
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };

test("html`` échappe les valeurs et refuse les cas dangereux", () => {
  const s = toHTMLString(html`<p title="${'"><img src=x onerror=alert(1)>'}">${"<script>x</script>"} ${["a", html`<b>b</b>`]}</p>`);
  assert.ok(!s.includes("<img") && !s.includes("<script>"), s);
  assert.ok(s.includes("&lt;script&gt;") && s.includes("<b>b</b>") && s.includes("&quot;&gt;&lt;img"));
  const bad = [
    () => html`<a href="${"javascript:alert(1)"}">x</a>`,
    () => html`<div onclick="${"x"}"></div>`,
    () => html`<div style="${"color:red"}"></div>`,
    () => html`<div class=${"x"}></div>`,
    () => html`<${"script"}>`,
    () => html`<input ${"onfocus=alert(1)"}>`,
    () => html`<p title="${{}}"></p>`
  ];
  for (const [i, f] of bad.entries()) assert.throws(f, undefined, "cas dangereux " + i);
  assert.equal(toHTMLString(html`<p>${null}${undefined}${false}${0}</p>`), "<p>0</p>");
});

// Un vrai résultat, calculé comme dans l'appli.
const s0 = SENTENCES[0].en;
const ref = buildReference(dict, s0);
const res = evaluate(ref, tokenizeIpa("aɪsɪŋkzɪsɪzzətɝdwən").map((p, i) => ({ p, start: i / 10, end: i / 10 + 0.1, conf: 0.9 })));
const scored = { result: res, tips: tipsFor(res) };

test("un résultat enregistré se relit à l'identique", () => {
  const st = memory();
  const S = defaults();
  S.sentence = 3; S.engine = true; S.last = summarize(s0, scored, 1763000000000);
  assert.ok(save(S, st));
  assert.ok(st.m.has(STORE_KEY));
  const back = load(st);
  assert.deepEqual(back, S);
  assert.equal(back.last.score, res.score);
  assert.equal(back.last.words.length, ref.length);
  assert.ok(back.last.tips.some((t) => t.sound === "θ"), "le th de think est signalé");
});

test("une sauvegarde absente, abîmée ou trafiquée ne casse rien", () => {
  assert.deepEqual(load(memory()), defaults());
  const st = memory(); st.setItem(STORE_KEY, "{pas du json");
  assert.deepEqual(load(st), defaults());
  assert.deepEqual(sanitize("n'importe quoi"), defaults());
  assert.deepEqual(sanitize({ version: 999, sentence: 2 }), defaults(), "version inconnue ignorée");
  const t = sanitize({
    version: 1, sentence: -4, engine: "oui",
    last: { sentence: "x".repeat(5000), score: 1e9, words: [{ display: 5, level: "<script>", phones: [{ p: "θθθθθθ", status: "?" }] }], tips: "nope" }
  });
  assert.equal(t.sentence, 0);
  assert.equal(t.engine, false);
  assert.equal(t.last.sentence.length, 200);
  assert.equal(t.last.score, 0);
  assert.equal(t.last.words[0].level, "skip");
  assert.equal(t.last.words[0].phones[0].status, "bad");
  assert.equal(t.last.words[0].phones[0].p.length, 4);
  assert.deepEqual(t.last.tips, []);
});

test("un stockage plein ou bloqué ne plante pas", () => {
  const broken = { getItem: () => { throw new Error("bloqué"); }, setItem: () => { throw new Error("plein"); } };
  assert.deepEqual(load(broken), defaults());
  assert.equal(save(defaults(), broken), false);
});

test("chaque mot des phrases est dans le dictionnaire (donc noté)", () => {
  assert.equal(SENTENCES.length, 10);
  for (const s of SENTENCES) assert.ok(buildReference(dict, s.en).every((w) => w.prons), "mot non notable dans : " + s.en);
});

test("les bibliothèques copiées n'ont pas été modifiées", () => {
  const expected = { // empreintes publiées dans SECURITY.md
    "vendor/transformers.min.js": "8b5a3171f8876bab2b1820a7d65eb87628e3d30bb5ea85b9dd398e76eb34decb",
    "vendor/ort-wasm-simd-threaded.asyncify.mjs": "0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611",
    "vendor/ort-wasm-simd-threaded.asyncify.wasm": "49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082",
    "data/cmudict.json": "ca8e790ec08466b37153a35576e2ac3ede1dfe3b1a16ccdb7605deef4add654b"
  };
  for (const [f, h] of Object.entries(expected)) {
    assert.equal(createHash("sha256").update(readFileSync(new URL("../" + f, import.meta.url))).digest("hex"), h, f);
  }
});

test("l'audio est rogné autour de la parole et remis à niveau", () => {
  const x = new Float32Array(16000 * 3); // 3 s : silence, 1 s de son faible, silence
  for (let i = 16000; i < 32000; i++) x[i] = 0.1 * Math.sin(i / 5);
  const { samples, offsetSec } = trimAndNormalize(x);
  assert.ok(samples.length < x.length && samples.length >= 16000, "silences retirés, parole gardée");
  assert.ok(offsetSec > 0.7 && offsetSec < 1, "début vers 0,8 s (avec 0,2 s de marge)");
  assert.ok(Math.max(...samples.map(Math.abs)) > 0.85, "volume normalisé");
  assert.equal(trimAndNormalize(new Float32Array(1000)).samples.length > 0, true, "silence total sans plantage");
});
