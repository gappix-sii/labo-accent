// Écran « Grammaire » (phase 4) : #grammaire = liste des règles par niveau ; #grammaire/<id> = une règle.
// Une règle : explication, exemples à écouter, piège des Français, puis ses exercices. Chaque exercice se
// répond à l'écran (js/screens/exercises.js), puis on dit la phrase correcte au micro : c'est cette note qui
// rapporte l'XP (10 par phrase réussie à 65, + 20 quand la règle est finie ; règles : js/core/tracks.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { PASS, XP_ITEM, XP_LESSON } from "../core/progress.js";
import { recordGrammar, trackState, grammarKey } from "../core/tracks.js";
import { GRAMMAR, GLEVELS, grammarById, answerOf } from "../content/grammar.js";
import { say, stopVoice } from "../engine/clips.js";
import { practice, resultBlock, progressBar } from "./practice.js";
import { listenControls } from "./listen.js";
import { optionsOf, exerciseBlock, exerciseClick } from "./exercises.js";
import { firstToDo, nextToDo, dotsBlock } from "./lesson.js";

// Liste des règles, regroupées par niveau, avec leur avancement.
export function mountGrammarList(root, S) {
  const P = S.progress;
  render(root, html`
    <p class="row"><button class="btn ghost" data-act="home" type="button">← Défis</button></p>
    <section class="card"><h1 class="sentence">📘 Grammaire</h1>
      <p class="muted small">Une règle à la fois : l'explication, des exemples à écouter, le piège des Français, puis des exercices à dire à voix haute.</p></section>
    ${GLEVELS.map((lv) => html`<section class="card"><h2>Niveau ${lv}</h2><ol class="path">${GRAMMAR.filter((g) => g.level === lv).map((g) => {
      const st = trackState(P, grammarKey(g.id));
      const status = st.done ? `✓${st.done > 1 ? ` ×${st.done}` : ""}` : st.run.length ? `${st.run.length} / ${g.ex.length}` : "";
      return html`<li><button class="lesson${st.done ? " done" : ""}" data-act="open" data-id="${g.id}" type="button">
        <span>${g.title}</span><span class="muted small">${status}</span></button></li>`;
    })}</ol></section>`)}`);
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.act === "home") location.hash = "#entrainement";
    if (el.dataset.act === "open" && grammarById(el.dataset.id)) location.hash = "#grammaire/" + el.dataset.id;
  });
  return () => {};
}

export function mountGrammar(root, S, id) {
  const rule = grammarById(id), P = S.progress;
  if (!rule) { location.hash = "#grammaire"; return () => {}; }
  const key = grammarKey(rule.id), size = rule.ex.length;
  const persist = () => save(S);
  const ui = { view: "learn", i: 0, ex: null, say: false, last: null, feedback: "", gained: 0, finished: false };
  const ex = () => rule.ex[ui.i];
  let alive = true;

  function newExercise(i) {
    ui.i = (i + size) % size; ui.say = false; ui.last = null; ui.feedback = ""; ui.finished = false;
    ui.ex = { options: optionsOf(ex()), placed: [], answer: null, right: false };
  }

  const dots = () => dotsBlock(trackState(P, key).run, ui.i, size, "Exercices de la règle", "Exercice");

  function learnView() {
    return html`
      <section class="card"><p class="muted small">Niveau ${rule.level}</p><h1 class="sentence">${rule.title}</h1><p>${rule.rule}</p></section>
      <section class="card"><h2>Exemples</h2><ul class="examples">${rule.examples.map(([en, fr], i) => html`<li>
        <button class="btn soft small-btn" data-act="example" data-i="${i}" type="button" aria-label="${`Écouter : ${en}`}">🔊</button>
        <span><b lang="en">${en}</b><br><span class="muted small">${fr}</span></span></li>`)}</ul></section>
      <section class="card"><h2>⚠️ Le piège des Français</h2><p>${rule.trap}</p></section>
      <button class="btn big" data-act="start" type="button">Exercices (${size}) →</button>`;
  }

  function exView() {
    const target = answerOf(ex());
    return html`
      <section class="card"><p class="muted small ex-count">${rule.title} · exercice ${ui.i + 1} / ${size}</p>${progressBar(ui.i + 1, size, "Avancement de la règle")}${dots()}</section>
      ${ui.finished ? html`<section class="card done-card" role="status"><h2>🎉 Règle finie !</h2>
        <p>+${XP_LESSON} XP de bonus. Tu as gagné ${ui.gained} XP sur cette règle.</p>
        <div class="row start"><button class="btn" data-act="list" type="button">Autres règles</button>
        <button class="btn ghost" data-act="learn" type="button">Revoir la règle</button></div></section>` : ""}
      <section class="card">${exerciseBlock(ex(), ui.ex)}</section>
      ${ui.say ? html`<section class="card"><p class="muted small">À toi : dis la phrase correcte.</p>
          <h1 class="sentence" lang="en">${target}</h1>${voice.block()}</section>
        <section class="card">${mic.block()}</section>${mic.errorBlock()}
        ${ui.last ? html`<section class="card" aria-live="polite"><p class="feedback">${ui.feedback}</p>${resultBlock(ui.last, S.game.avatar)}
          <div class="row"><button class="btn ghost" data-act="speak" type="button">↻ Réessayer</button>
          <button class="btn" data-act="next" type="button">Suivant →</button></div></section>` : ""}`
        : ui.ex.answer !== null ? html`<button class="btn big" data-act="to-say" type="button">🎤 Maintenant, dis-la →</button>` : ""}
      <p class="row"><button class="btn ghost" data-act="learn" type="button">Revoir la règle</button>
        <button class="btn ghost" data-act="next" type="button">Passer →</button></p>`;
  }

  function draw() {
    if (!alive) return;
    render(root, html`<p class="row"><button class="btn ghost" data-act="list" type="button">← Grammaire</button>
      <span class="muted small">${ui.gained ? `+${ui.gained} XP sur cette règle` : ""}</span></p>
      ${ui.view === "learn" ? learnView() : exView()}`);
  }

  const voice = listenControls({ S, persist, draw, text: () => answerOf(ex()) });
  const mic = practice({
    S, persist, draw, root, speakLabel: "🎤 Dire la phrase",
    target: () => ({ text: answerOf(ex()), focus: [] }),
    onScored: (last) => {
      const got = recordGrammar(P, rule, ui.i, last.score);
      persist();
      ui.last = last; ui.gained += got.xp;
      if (got.lessonDone) ui.finished = true;
      ui.feedback = got.passed
        ? (got.xp ? `Réussi ! +${XP_ITEM} XP` : "Réussi ! (déjà compté pour ce passage)")
        : `Pas encore : il faut ${PASS}. Écoute le modèle, puis réessaie.`;
    }
  });

  function goTo(i) { voice.stop(); mic.clearError(); newExercise(i); draw(); }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (act === "speak") ui.finished = false;
    if (ui.say && (mic.handle(act) || voice.handle(act))) return;
    if (ui.view === "ex" && exerciseClick(ex(), ui.ex, act, el)) { draw(); return; }
    if (act === "list") location.hash = "#grammaire";
    if (act === "example") { const x = rule.examples[Number(el.dataset.i)]; if (x) say(x[0], { voice: S.voiceId }).catch(() => {}); }
    if (act === "learn") { voice.stop(); ui.view = "learn"; draw(); }
    if (act === "start") { stopVoice(); ui.view = "ex"; goTo(firstToDo(trackState(P, key), size)); }
    if (act === "to-say") { ui.say = true; draw(); voice.warm(); }
    if (act === "go") goTo(Number(el.dataset.i) || 0);
    if (act === "next") goTo(nextToDo(trackState(P, key).run, ui.i, size));
  });
  root.addEventListener("change", (e) => voice.change(e));

  newExercise(0);
  draw();
  return () => { alive = false; voice.dispose(); mic.dispose(); };
}
