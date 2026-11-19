// Écran de leçon (#lecon/<id>) : un élément à la fois — écouter, parler, voir la note, réessayer ou passer.
// Un élément est réussi à 65 ou plus ; la leçon est finie quand tous le sont (règles : js/core/progress.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { recordItem, PASS, XP_ITEM, XP_LESSON } from "../core/progress.js";
import { lessonOpen } from "../content/regions.js";
import { LESSONS, lessonById } from "../content/lessons.js";
import { practice, resultBlock, progressBar } from "./practice.js";
import { listenControls } from "./listen.js";

// Premier élément pas encore réussi dans ce passage de la leçon (ou le premier).
export function firstToDo(L, size) {
  const run = L ? L.run : [];
  for (let i = 0; i < size; i++) if (!run.includes(i)) return i;
  return 0;
}

// Élément suivant pas encore réussi dans ce passage (en repartant du début si besoin), sinon simplement le suivant.
export function nextToDo(run, i, size) {
  for (let k = 1; k <= size; k++) { const j = (i + k) % size; if (!run.includes(j)) return j === i ? i + 1 : j; }
  return i + 1;
}

// Pastilles d'avancement, une par élément, cliquables (data-act="go"). word : « Élément », « Exercice »…
export function dotsBlock(run, cur, size, label, word) {
  return html`<ol class="dots" aria-label="${label}">${Array.from({ length: size }, (_, i) => html`<li>
    <button class="dot${run.includes(i) ? " ok" : ""}${i === cur ? " cur" : ""}" data-act="go" data-i="${i}" type="button" aria-label="${`${word} ${i + 1}${run.includes(i) ? ", réussi" : ""}`}">${run.includes(i) ? "✓" : i + 1}</button></li>`)}</ol>`;
}

export function mountLesson(root, S, id) {
  const lesson = lessonById(id), P = S.progress;
  // Leçon inconnue ou encore verrouillée (adresse tapée à la main) : retour au parcours.
  if (!lesson || !lessonOpen(P, LESSONS.indexOf(lesson))) { location.hash = "#accueil"; return () => {}; }
  const size = lesson.items.length;
  const state = () => (Object.hasOwn(P.lessons, id) ? P.lessons[id] : null);
  const ui = { item: firstToDo(state(), size), last: null, gained: 0, feedback: "", finished: false };
  const item = () => lesson.items[ui.item];
  const persist = () => save(S);

  const dots = () => dotsBlock(state() ? state().run : [], ui.item, size, "Éléments de la leçon", "Élément");

  function draw() {
    const it = item(), idx = LESSONS.indexOf(lesson), next = LESSONS[idx + 1];
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Parcours</button>
        <span class="muted small">${ui.gained ? `+${ui.gained} XP dans cette leçon` : ""}</span></p>
      <section class="card">
        <p class="muted small">${lesson.kind === "sound" ? "🔊 Leçon de son" : "💬 Phrases"} · ${lesson.title}</p>
        ${lesson.kind === "sound" ? html`<p class="small">${lesson.sub}</p>` : html`<p class="muted small">${lesson.sub} · son travaillé : <b>${lesson.p}</b></p>`}
        ${dots()}
      </section>
      ${ui.finished ? html`<section class="card done-card" role="status">
          <h2>🎉 Leçon finie !</h2><p>+${XP_LESSON} XP de bonus. Tu as gagné ${ui.gained} XP dans cette leçon.</p>
          <div class="row start">
            ${next ? html`<button class="btn" data-act="next-lesson" type="button">Leçon suivante : ${next.title}</button>` : ""}
            <button class="btn ghost" data-act="home" type="button">Retour au parcours</button>
          </div></section>` : ""}
      <section class="card">
        <p class="muted small ex-count">Élément ${ui.item + 1} / ${size}</p>${progressBar(ui.item, size, "Avancement de la leçon")}
        <h1 class="sentence" lang="en">${it.en}</h1>
        ${it.fr ? html`<p class="muted">${it.fr}</p>` : ""}
        ${voice.block()}
      </section>
      <section class="card">${mic.block()}</section>
      ${mic.errorBlock()}
      ${ui.last ? html`<section class="card" aria-live="polite">
          ${ui.feedback ? html`<p class="feedback">${ui.feedback}</p>` : ""}
          ${resultBlock(ui.last, S.game.avatar)}
          <div class="row">
            <button class="btn ghost" data-act="speak" type="button">↻ Réessayer</button>
            <button class="btn" data-act="next" type="button">Suivant →</button>
          </div></section>` : html`<p class="row"><span></span><button class="btn ghost" data-act="next" type="button">Passer →</button></p>`}
    `);
  }

  const voice = listenControls({ S, persist, draw, text: () => item().en });
  const mic = practice({
    S, persist, draw, root,
    target: () => ({ text: item().en, focus: lesson.p ? [lesson.p] : [] }),
    onScored: (last) => {
      const got = recordItem(P, id, ui.item, size, last.score);
      persist();
      ui.last = last;
      ui.gained += got.xp;
      if (got.lessonDone) ui.finished = true;
      ui.feedback = got.passed
        ? (got.xp ? `Réussi ! +${XP_ITEM} XP` : "Réussi ! (déjà compté pour ce passage)")
        : `Pas encore : il faut ${PASS} pour réussir. Écoute le modèle au ralenti, puis réessaie.`;
    }
  });

  function goTo(i) {
    voice.stop();
    ui.item = (i + size) % size; ui.last = null; ui.feedback = ""; ui.finished = false;
    mic.clearError(); draw(); voice.warm();
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (act === "speak") ui.finished = false;
    if (mic.handle(act) || voice.handle(act)) return;
    if (act === "home") location.hash = "#accueil";
    if (act === "next-lesson") { const n = LESSONS[LESSONS.indexOf(lesson) + 1]; if (n) location.hash = "#lecon/" + n.id; }
    if (act === "go") goTo(Number(el.dataset.i) || 0);
    if (act === "next") goTo(nextToDo(state() ? state().run : [], ui.item, size));
  });
  root.addEventListener("change", (e) => voice.change(e));

  draw();
  voice.warm();
  return () => { voice.dispose(); mic.dispose(); };
}
