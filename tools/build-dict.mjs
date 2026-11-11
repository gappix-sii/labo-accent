// Construit data/cmudict.json (format compact) et vérifie que tous les mots du contenu sont connus.
// Usage : node tools/build-dict.mjs <chemin vers cmu-pronouncing-dictionary/index.js>
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CATEGORIES, SOUND_LESSONS, MINIMAL_PAIRS } from "../js/content.js";
import { normWord, splitDisplayWords } from "../js/phonemes.js";
import { VOCAB, sayText } from "../js/vocab.js";
import { DIALOGUES } from "../js/dialogues.js";
import { GRAMMAR } from "../js/grammar.js";
import { ALL_MISTAKES } from "../js/mistakes.js";

const src = process.argv[2];
const { dictionary } = await import(src);

// On ne garde que les entrées en lettres simples (et apostrophes), avec leurs variantes.
const out = {};
for (const [k, v] of Object.entries(dictionary)) {
  if (!/^[a-z']+(\(\d\))?$/.test(k)) continue;
  out[k] = v;
}
const json = JSON.stringify(out);
writeFileSync(new URL("../data/cmudict.json", import.meta.url), json);
console.log("entrées:", Object.keys(out).length, "taille:", (json.length / 1e6).toFixed(2), "Mo",
  "sha256:", createHash("sha256").update(json).digest("hex"));

const texts = [
  ...CATEGORIES.flatMap(c => c.items.map(i => i[0])),
  ...SOUND_LESSONS.flatMap(l => l.items),
  ...MINIMAL_PAIRS.flat(),
  ...Object.values(VOCAB).flat().map(sayText),
  ...DIALOGUES.flatMap(d => d.turns.flatMap(t => t.me ? t.me.map(o => o[0]) : [t.ai])),
  ...GRAMMAR.flatMap(g => [...g.examples.map(e => e[0]), ...g.ex.map(x => x[0] === "c" ? x[1].replace("___", x[2][x[3]]) : x[0] === "o" ? x[1] : x[2])]),
  ...ALL_MISTAKES.map(m => m.right)
];
const missing = new Set();
for (const t of texts) for (const w of splitDisplayWords(t)) { const n = normWord(w); if (n && !out[n]) missing.add(n); }
if (missing.size) { console.error("MOTS INCONNUS:", [...missing].join(", ")); process.exit(1); }
console.log("contenu vérifié:", texts.length, "phrases/mots, tous dans le dictionnaire");
