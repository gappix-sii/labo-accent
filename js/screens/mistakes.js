// Écran « Fautes typiques » (#fautes) : une phrase fausse s'affiche (faute courante des Français),
// on dit la bonne version au micro. Réussi à 65 ou plus ; « Je ne sais pas » montre la correction.
// Séances de 10 phrases ; une phrase ratée revient une fois en fin de séance, et plus souvent aux
// séances suivantes (js/core/tracks.js). XP comme le vocabulaire (js/core/progress.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { pickMistakes, recordMistake } from "../core/tracks.js";
import { recordWord, finishSession, PASS, XP_WORD } from "../core/progress.js";
import { ALL_MISTAKES, MISTAKE_CATS } from "../content/mistakes.js";
import { practice, resultBlock } from "./practice.js";
import { listenControls } from "./listen.js";

const CAT_TITLE = Object.fromEntries(MISTAKE_CATS.map((c) => [c.id, c.title]));

export function mountMistakes(root, S) {
  const M = S.mistakes, P = S.progress;
  const persist = () => save(S);
  const ui = {};
  const cur = () => ui.queue[ui.i];

  function newSession() {
    Object.assign(ui, { queue: pickMistakes(M, ALL_MISTAKES).map((m) => ({ m, again: false })), i: 0, reveal: false,
      last: null, ok: null, answered: 0, spoken: 0, good: 0, xp: 0, done: false, bonus: 0 });
  }

  function draw() {
    const head = html`<p class="row"><button class="btn ghost" data-act="home" type="button">← Accueil</button>
      <span class="muted small">${ui.xp ? `+${ui.xp} XP dans cette séance` : ""}</span></p>`;
    if (ui.done) {
      render(root, html`${head}<section class="card" role="status"><h2>🎉 Séance finie !</h2>
        <p>${ui.good} phrase${ui.good > 1 ? "s" : ""} corrigée${ui.good > 1 ? "s" : ""} sur ${ui.answered} réponses · +${ui.xp} XP${ui.bonus ? ` (dont ${ui.bonus} de bonus)` : ""}.</p>
        <p class="muted small">Les phrases ratées reviendront plus souvent.</p>
        <button class="btn" data-act="again" type="button">Nouvelle séance</button></section>`);
      return;
    }
    const { m, again } = cur();
    render(root, html`${head}
      <section class="card">
        <p class="muted small">Phrase ${ui.i + 1} / ${ui.queue.length} · ${CAT_TITLE[m.cat] || ""}${again ? " · encore une fois" : ""}</p>
        <p class="wrong-line" lang="en"><span aria-hidden="true">✗ </span><s>${m.wrong}</s></p>
        <p class="muted small">Cette phrase est fausse. Dis la bonne version en anglais.</p>
        ${ui.reveal ? html`<h1 class="sentence answer" lang="en">✓ ${m.right}</h1><p class="small">${m.why}</p>${voice.block()}` : ""}
      </section>
      ${ui.reveal ? "" : html`<section class="card">${mic.block()}
        <p><button class="btn ghost" data-act="dunno" type="button">Je ne sais pas</button></p></section>`}
      ${mic.errorBlock()}
      ${ui.reveal ? html`<section class="card" aria-live="polite">
        <p class="feedback">${ui.ok ? `Réussi ! +${XP_WORD} XP` : ui.last ? `Pas encore (il faut ${PASS}) : écoute la bonne version, elle reviendra.` : "Écoute-la bien : elle reviendra."}</p>
        ${ui.last ? resultBlock(ui.last) : ""}
        <div class="row"><span></span><button class="btn" data-act="next" type="button">Suivant →</button></div>
      </section>` : ""}`);
  }

  // Réponse à la phrase affichée : ok = bonne version réussie au micro.
  function respond(ok, last) {
    const q = cur();
    // La 2e chance de fin de séance ne retire pas l'erreur : la phrase ratée doit revenir plus souvent.
    if (!(q.again && ok)) recordMistake(M, q.m.id, ok);
    ui.answered++;
    if (ok) ui.good++;
    else if (!q.again) ui.queue.push({ m: q.m, again: true }); // revient une fois en fin de séance
    persist();
    ui.ok = ok; ui.last = last; ui.reveal = true;
  }

  const voice = listenControls({ S, persist, draw, text: () => cur().m.right });
  const mic = practice({
    S, persist, draw, root, speakLabel: "🎤 Dire la bonne version",
    target: () => ({ text: cur().m.right, focus: [] }),
    onScored: (last) => {
      ui.xp += recordWord(P, last.score); ui.spoken++;
      respond(last.score >= PASS, last);
    }
  });

  function next() {
    voice.stop();
    ui.i++; ui.reveal = false; ui.last = null; ui.ok = null;
    mic.clearError();
    if (ui.i >= ui.queue.length) { ui.done = true; ui.bonus = finishSession(P, ui.spoken); ui.xp += ui.bonus; persist(); } // bonus : seules les phrases dites au micro comptent
    draw();
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (mic.handle(act) || voice.handle(act)) return;
    if (act === "home") location.hash = "#accueil";
    if (act === "dunno" && !ui.reveal) { respond(false, null); draw(); voice.handle("listen"); }
    if (act === "next") next();
    if (act === "again") { newSession(); draw(); }
  });
  root.addEventListener("change", (e) => voice.change(e));

  newSession();
  draw();
  return () => { voice.stop(); mic.dispose(); };
}
