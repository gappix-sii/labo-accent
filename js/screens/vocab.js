// Écran « Vocabulaire » (#vocab) : le mot s'affiche en français, on le dit en anglais au micro.
// Réussi à 65 ou plus → il reviendra plus tard ; raté ou « Je ne sais pas » → il revient vite
// (répétition espacée : js/core/srs.js). Un mot raté revient aussi une fois en fin de séance.
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { session, answer, setLevel, setPerDay, boxes, PER_DAY } from "../core/srs.js";
import { recordWord, finishSession, PASS, XP_WORD } from "../core/progress.js";
import { LEVELS, VOCAB, wordById, sayText } from "../content/vocab.js";
import { practice, resultBlock } from "./practice.js";
import { listenControls } from "./listen.js";

// File de la séance : mots à revoir puis nouveaux mots (ids). Exportée pour les tests.
export function buildQueue(R, now = Date.now()) {
  const s = session(R, VOCAB[R.level], now, (id) => !!wordById(id));
  return s.all.map((id) => ({ id, fresh: s.fresh.includes(id), again: false }));
}

export function mountVocab(root, S) {
  const R = S.srs, P = S.progress;
  const persist = () => save(S);
  const ui = { queue: buildQueue(R), i: 0, reveal: false, last: null, ok: null, answered: 0, spoken: 0, good: 0, xp: 0, done: false, bonus: 0 };
  const cur = () => ui.queue[ui.i];
  const word = () => wordById(cur().id);

  function settings() {
    return html`<details class="small"><summary>Réglages : niveau ${R.level}, ${R.perDay} nouveaux mots par jour</summary>
      <p class="kind">${LEVELS.map((l) => html`<button class="chip${l.id === R.level ? " on" : ""}" data-act="level" data-v="${l.id}" type="button" aria-pressed="${l.id === R.level ? "true" : "false"}" title="${l.sub}">${l.id}</button>`)}</p>
      <p class="kind">${PER_DAY.map((n) => html`<button class="chip${n === R.perDay ? " on" : ""}" data-act="per-day" data-v="${n}" type="button" aria-pressed="${n === R.perDay ? "true" : "false"}">${n} par jour</button>`)}</p>
      <p class="muted">Mots par boîte (1 = à revoir vite, 5 = bien sus) : ${boxes(R).join(" · ")}</p>
    </details>`;
  }

  function draw() {
    const head = html`<p class="row"><button class="btn ghost" data-act="home" type="button">← Parcours</button>
      <span class="muted small">${ui.xp ? `+${ui.xp} XP dans cette séance` : ""}</span></p>`;
    if (ui.done || !ui.queue.length) {
      render(root, html`${head}<section class="card" role="status">
        ${ui.answered
          ? html`<h2>🎉 Séance finie !</h2><p>${ui.good} mot${ui.good > 1 ? "s" : ""} réussi${ui.good > 1 ? "s" : ""} sur ${ui.answered} réponses · +${ui.xp} XP${ui.bonus ? ` (dont ${ui.bonus} de bonus)` : ""}.</p>`
          : html`<h2>Rien à revoir pour aujourd'hui</h2><p>Reviens demain pour revoir tes mots, ou change de niveau pour en découvrir d'autres.</p>`}
        ${settings()}
      </section>`);
      return;
    }
    const w = word(), q = cur();
    render(root, html`${head}
      <section class="card">
        <p class="muted small">Mot ${ui.i + 1} / ${ui.queue.length} · ${q.fresh ? "nouveau" : q.again ? "encore une fois" : "à revoir"} · ${w.level}</p>
        <h1 class="sentence">${w.fr}</h1>
        ${ui.reveal ? html`<p class="answer" lang="en"><b>${sayText(w)}</b></p>${voice.block()}` : html`<p class="muted small">Dis-le en anglais.</p>`}
      </section>
      ${ui.reveal ? "" : html`<section class="card">${mic.block()}
        <p><button class="btn ghost" data-act="dunno" type="button">Je ne sais pas</button></p></section>`}
      ${mic.errorBlock()}
      ${ui.reveal ? html`<section class="card" aria-live="polite">
        <p class="feedback">${ui.ok ? `Réussi ! +${XP_WORD} XP` : ui.last ? `Pas encore (il faut ${PASS}) : écoute-le, il reviendra.` : "Écoute-le bien : il reviendra."}</p>
        ${ui.last ? resultBlock(ui.last) : ""}
        <div class="row"><span></span><button class="btn" data-act="next" type="button">Suivant →</button></div>
      </section>` : ""}
      ${ui.i === 0 && !ui.reveal ? settings() : ""}`);
  }

  // Réponse au mot affiché : ok = réussi au micro.
  function respond(ok, last) {
    const q = cur();
    answer(R, q.id, ok);
    ui.answered++;
    if (ok) ui.good++;
    else if (!q.again) ui.queue.push({ id: q.id, fresh: false, again: true }); // revient une fois en fin de séance
    persist();
    ui.ok = ok; ui.last = last; ui.reveal = true;
  }

  const voice = listenControls({ S, persist, draw, text: () => sayText(word()) });
  const mic = practice({
    S, persist, draw, root, speakLabel: "🎤 Dire en anglais",
    target: () => ({ text: sayText(word()), focus: [] }),
    onScored: (last) => {
      const got = recordWord(P, last.score);
      ui.xp += got; ui.spoken++;
      respond(got > 0, last);
    }
  });

  function next() {
    voice.stop();
    ui.i++; ui.reveal = false; ui.last = null; ui.ok = null;
    mic.clearError();
    if (ui.i >= ui.queue.length) { ui.done = true; ui.bonus = finishSession(P, ui.spoken); ui.xp += ui.bonus; persist(); } // bonus : seuls les mots dits au micro comptent
    draw();
  }

  function restart() { ui.queue = buildQueue(R); Object.assign(ui, { i: 0, reveal: false, last: null, ok: null, answered: 0, spoken: 0, good: 0, xp: 0, done: false, bonus: 0 }); draw(); }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (mic.handle(act) || voice.handle(act)) return;
    if (act === "home") location.hash = "#accueil";
    if (act === "dunno" && !ui.reveal) { respond(false, null); draw(); voice.handle("listen"); }
    if (act === "next") next();
    if (act === "level" && setLevel(R, el.dataset.v)) { persist(); restart(); }
    if (act === "per-day" && setPerDay(R, Number(el.dataset.v))) { persist(); restart(); }
  });
  root.addEventListener("change", (e) => voice.change(e));

  draw();
  return () => { voice.dispose(); mic.dispose(); };
}
