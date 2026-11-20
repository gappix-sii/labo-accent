// Verbes irréguliers (phase 10, tâche 3) : avancement, XP et questions « choisis la bonne forme ».
// Module pur, sans DOM (test/verbs.test.mjs). Contenu : js/content/verbs.js. Règles choisies le 2026-11-20 :
// - une famille = une piste de la progression (progress.lessons), sous la clé « v-<famille> » ;
// - 3 éléments par verbe, rangés en 3 étapes : dire les 3 formes (éléments 0 à n − 1), la phrase au prétérit
//   (n à 2n − 1), la phrase au present perfect (2n à 3n − 1), n étant le nombre de verbes de la famille ;
// - XP comme en grammaire (recordItem de progress.js) : 10 XP par élément réussi à 65, une fois par passage,
//   + 20 XP quand toute la famille est finie ;
// - étapes 2 et 3 : on choisit d'abord la bonne forme dans la phrase à trou, puis on dit la phrase entière au micro.
//   Seule la note au micro rapporte l'XP (comme les exercices de grammaire).
import { recordItem } from "./progress.js";
import { variants, formsText } from "../content/verbs.js";
export { formsText };

export const STEPS = [
  { id: "forms", icon: "🔤", title: "Les 3 formes", sub: "Écoute, puis dis l'infinitif, le prétérit et le participe." },
  { id: "past", icon: "⏪", title: "Au prétérit", sub: "Choisis la bonne forme, puis dis la phrase." },
  { id: "pp", icon: "✅", title: "Au present perfect", sub: "Choisis la bonne forme, puis dis la phrase." },
];

export const verbKey = (fam) => "v-" + fam.id;
export const familySize = (fam) => fam.verbs.length * STEPS.length;
// Élément du verbe `k` à l'étape `step` (0, 1 ou 2), et l'inverse.
export const itemOf = (fam, step, k) => step * fam.verbs.length + k;
export const stepOf = (fam, item) => ({ step: Math.floor(item / fam.verbs.length), k: item % fam.verbs.length });

// Phrase d'une étape : ps (prétérit) ou pps (present perfect).
export const sentenceOf = (verb, form) => (form === "past" ? verb.ps : verb.pps);
// Texte anglais à dire pour un élément.
export function textOf(fam, item) {
  const { step, k } = stepOf(fam, item), verb = fam.verbs[k];
  return step === 0 ? formsText(verb) : sentenceOf(verb, STEPS[step].id).en;
}

// Un essai sur l'élément `item` d'une famille, noté `score` au micro. Renvoie { passed, xp, lessonDone }.
export const recordVerb = (P, fam, item, score, now = Date.now()) => recordItem(P, verbKey(fam), item, familySize(fam), score, now);

// Avancement d'une famille : nombre de fois finie, éléments réussis dans le passage en cours, et par étape.
export function familyState(P, fam) {
  const key = verbKey(fam), L = Object.hasOwn(P.lessons, key) ? P.lessons[key] : null, n = fam.verbs.length;
  const run = L ? L.run.filter((i) => i < familySize(fam)) : [];
  return {
    done: L ? L.done : 0,
    run: [...run],
    steps: STEPS.map((s, step) => ({ ...s, got: run.filter((i) => Math.floor(i / n) === step).length, size: n })),
  };
}
export const familyDone = (P, fam) => familyState(P, fam).done > 0;

// ---------- Questions « choisis la bonne forme » ----------
const shuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const word = (f) => new RegExp(`\\b${f}\\b`, "i");

// La forme attendue dans une phrase : celle (parmi les variantes) qui y figure comme mot entier.
export function targetOf(sent, verb) {
  const forms = variants(sent.form === "past" ? verb.past : verb.pp);
  return forms.find((f) => word(f).test(sent.en)) || forms[0];
}
// Phrase avec un trou à la place de la forme (première fois qu'elle y figure comme mot entier).
// answer est écrit comme dans la phrase : before + answer + after redonne la phrase.
export function cloze(sent, verb) {
  const m = sent.en.match(word(targetOf(sent, verb)));
  if (!m) return null;
  return { before: sent.en.slice(0, m.index), answer: m[0], after: sent.en.slice(m.index + m[0].length) };
}
// La faute classique : traiter le verbe comme un verbe régulier (goed, buyed, cutted…).
// Formes « régulières » que le dictionnaire admet aussi (waked) : jamais proposées comme piège.
export const ALSO_CORRECT = new Set(["waked"]);
export function fakeRegular(base) {
  if (/e$/.test(base)) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(base)) return base + base.slice(-1) + "ed";
  return base + "ed";
}
// La forme en -ing (piège de secours quand les 3 formes sont identiques : cut, cut, cut).
export function ingOf(base) {
  if (base.length > 2 && /[^e]e$/.test(base)) return base.slice(0, -1) + "ing";
  if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(base)) return base + base.slice(-1) + "ing";
  return base + "ing";
}

// Question sur la phrase `form` (« past » ou « pp ») d'un verbe : la phrase à trou, la bonne forme et deux pièges,
// mélangés. Pièges, dans l'ordre : l'autre variante de la même forme (were pour was), l'autre forme du verbe
// (gone pour went), la forme « régulière » inventée (goed), l'infinitif, puis la forme en -ing.
export const CHOICES = 3;
export function questionOf(verb, form, rng = Math.random) {
  const sent = sentenceOf(verb, form), c = cloze(sent, verb);
  if (!c) return null;
  const same = variants(form === "past" ? verb.past : verb.pp), other = variants(form === "past" ? verb.pp : verb.past);
  const options = [c.answer.toLowerCase()];
  for (const o of [...same, ...other, fakeRegular(verb.base), verb.base, ingOf(verb.base)]) {
    if (options.length < CHOICES && !options.includes(o.toLowerCase()) && !ALSO_CORRECT.has(o.toLowerCase())) options.push(o.toLowerCase());
  }
  return { verb: verb.base, form, en: sent.en, fr: sent.fr, before: c.before, after: c.after, answer: c.answer, right: c.answer.toLowerCase(), options: shuffle(options, rng) };
}
// Questions d'une étape (« past » ou « pp ») : une par verbe, dans l'ordre de la famille.
export const familyQuestions = (fam, form, rng = Math.random) => fam.verbs.map((v) => questionOf(v, form, rng));
// Bonne réponse ? (sans tenir compte des majuscules)
export const isRight = (q, choice) => typeof choice === "string" && choice.toLowerCase() === q.right;
