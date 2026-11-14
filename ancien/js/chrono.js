// Questions du défi chrono : rapides, à choix (vocabulaire, grammaire, « faute ou pas ? »). Module pur.
import { VOCAB, sayText } from "./vocab.js";
import { GRAMMAR } from "./grammar.js";
import { ALL_MISTAKES } from "./mistakes.js";
import { shuffleWith } from "./meta.js";

const stripNote = s => s.replace(/\s*\(.*\)\s*$/, "");
function distractors(rng, pool, key, answer, n = 3) {
  const out = [], seen = new Set([answer.toLowerCase()]);
  for (const w of shuffleWith(pool, rng)) {
    const v = w[key];
    if (seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase()); out.push(v);
    if (out.length >= n) break;
  }
  return out;
}

export function makeQuestions(rng, { levels = ["A1", "A2"], n = 80 } = {}) {
  const words = levels.flatMap(l => VOCAB[l] || []);
  const gram = GRAMMAR.filter(g => levels.includes(g.level) || g.level === "A1").flatMap(g => g.ex.filter(x => x[0] === "c").map(x => x));
  const qs = [];
  for (let i = 0; i < n; i++) {
    const r = rng(), pick = a => a[Math.floor(rng() * a.length)];
    if (r < 0.42 && words.length) {
      const w = pick(words);
      const options = shuffleWith([w.en, ...distractors(rng, words, "en", w.en)], rng);
      qs.push({ type: "fr2en", prompt: w.fr, sub: "Comment dit-on en anglais ?", options, answer: options.indexOf(w.en), say: sayText(w) });
    } else if (r < 0.66 && words.length) {
      const w = pick(words);
      const options = shuffleWith([w.fr, ...distractors(rng, words, "fr", w.fr)], rng);
      qs.push({ type: "en2fr", prompt: w.en, sub: "Ça veut dire…", options, answer: options.indexOf(w.fr), say: sayText(w) });
    } else if (r < 0.84 && gram.length) {
      const x = pick(gram);
      qs.push({ type: "gram", prompt: x[1], sub: "Complète la phrase", options: x[2], answer: x[3] });
    } else {
      const m = pick(ALL_MISTAKES), wrong = rng() < 0.5;
      qs.push({ type: "fault", prompt: wrong ? stripNote(m.wrong) : m.right, sub: "Correct ou faux ?", options: ["Correct", "Faux"], answer: wrong ? 1 : 0, fix: m.right });
    }
  }
  return qs;
}
