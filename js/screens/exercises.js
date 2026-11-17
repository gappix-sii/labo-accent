// Les trois exercices de grammaire, répondus à l'écran (phase 4). Format des contenus : js/content/grammar.js.
//   ["c", phrase à trou, choix, index bonne réponse, explication]   choisir la bonne forme
//   ["o", phrase correcte, traduction]                             remettre les mots dans l'ordre
//   ["f", phrase fausse, phrase correcte, [autres fausses], explication]   trouver la bonne version
// Une fois la réponse donnée (juste ou non), l'écran Grammaire fait dire la phrase correcte au micro.
import { html } from "../core/dom.js";
import { answerOf } from "../content/grammar.js";

// Mélange (Fisher-Yates) ; rnd() renvoie un nombre dans [0, 1).
export function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Mots d'une phrase à remettre dans l'ordre : sans la ponctuation finale, et sans la majuscule
// du premier mot (sauf « I »), pour ne pas donner la réponse.
export function wordsOf(sentence) {
  const w = sentence.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean);
  if (w.length && !/^I(?:'|$)/.test(w[0])) w[0] = w[0][0].toLowerCase() + w[0].slice(1);
  return w;
}

// Propositions d'un exercice, dans un ordre mélangé (jamais l'ordre de la phrase pour « o »).
export function optionsOf(e, rnd = Math.random) {
  if (e[0] === "c") return shuffle(e[2], rnd);
  if (e[0] === "f") return shuffle([e[2], e[1], ...e[3]], rnd);
  const words = wordsOf(e[1]);
  for (let k = 0; k < 10; k++) {
    const order = shuffle(words.map((_, i) => i), rnd);
    if (order.some((x, i) => x !== i) || words.length < 2) return order.map((i) => words[i]);
  }
  return [...words].reverse();
}

// La réponse donnée est-elle juste ? (« o » : la suite des mots, sans tenir compte des majuscules)
export function isRight(e, answer) {
  if (e[0] === "c") return answer === e[2][e[3]];
  if (e[0] === "f") return answer === e[2];
  const norm = (list) => list.map((w) => w.toLowerCase()).join(" ");
  return Array.isArray(answer) && norm(answer) === norm(wordsOf(e[1]));
}

export const KIND_LABEL = { c: "Choisis la bonne forme", o: "Remets les mots dans l'ordre", f: "Trouve la phrase correcte" };

// Exercice affiché. st : { options, placed: [index d'option], answer, right } (géré par l'écran).
export function exerciseBlock(e, st) {
  const done = st.answer !== null;
  const cls = (opt) => (!done ? "" : (e[0] === "c" ? opt === e[2][e[3]] : opt === e[2]) ? " right" : opt === st.answer ? " wrong" : "");
  let body;
  if (e[0] === "c") {
    const [before, after] = e[1].split("___");
    body = html`<h1 class="sentence" lang="en">${before}<span class="gap">${done ? e[2][e[3]] : "___"}</span>${after}</h1>
      <div class="options">${st.options.map((o, i) => html`<button class="btn choice${cls(o)}" data-act="opt" data-i="${i}" type="button" lang="en" ${done ? "disabled" : ""}>${o}</button>`)}</div>`;
  } else if (e[0] === "f") {
    body = html`<p class="muted small">Une seule de ces phrases est correcte.</p>
      <div class="options col">${st.options.map((o, i) => html`<button class="btn choice${cls(o)}" data-act="opt" data-i="${i}" type="button" lang="en" ${done ? "disabled" : ""}>${o}</button>`)}</div>`;
  } else {
    const line = st.placed.map((i) => st.options[i]);
    body = html`<p class="muted">${e[2]}</p>
      <p class="tiles built${done ? (st.right ? " right" : " wrong") : ""}" lang="en" aria-label="Ta phrase">${line.length
        ? st.placed.map((i, k) => html`<button class="tile" data-act="unplace" data-k="${k}" type="button" ${done ? "disabled" : ""}>${st.options[i]}</button>`)
        : html`<span class="muted small">Touche les mots dans l'ordre.</span>`}</p>
      <p class="tiles" lang="en">${st.options.map((o, i) => html`<button class="tile" data-act="place" data-i="${i}" type="button" ${done || st.placed.includes(i) ? "disabled" : ""}>${o}</button>`)}</p>
      ${done ? "" : html`<button class="btn" data-act="check" type="button" ${st.placed.length === st.options.length ? "" : "disabled"}>Vérifier</button>`}`;
  }
  const why = e[0] === "c" ? e[4] : e[0] === "f" ? e[4] : "";
  return html`<p class="muted small">${KIND_LABEL[e[0]]}</p>${body}
    ${done ? html`<p class="feedback">${st.right ? "✓ Bonne réponse." : html`✗ La bonne réponse : <b lang="en">${answerOf(e)}</b>`}</p>
      ${why ? html`<p class="small">${why}</p>` : ""}` : ""}`;
}

// Clic dans l'exercice : met à jour st. Renvoie true si le clic le concernait.
export function exerciseClick(e, st, act, el) {
  if (st.answer !== null) return false;
  if (act === "opt") {
    const o = st.options[Number(el.dataset.i)];
    if (o === undefined) return true;
    st.answer = o; st.right = isRight(e, o);
    return true;
  }
  if (act === "place") { const i = Number(el.dataset.i); if (st.options[i] !== undefined && !st.placed.includes(i)) st.placed.push(i); return true; }
  if (act === "unplace") { st.placed.splice(Number(el.dataset.k), 1); return true; }
  if (act === "check" && st.placed.length === st.options.length) {
    st.answer = st.placed.map((i) => st.options[i]); st.right = isRight(e, st.answer);
    return true;
  }
  return false;
}
