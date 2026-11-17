// Écran « Écoute » (#ecoute) : un mot d'une paire est joué (ship ou sheep ?), on choisit lequel.
// Erreur → les deux mots sont réécoutés l'un après l'autre ; les paires ratées reviennent plus souvent.
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { pickQuestions, recordPair } from "../core/listening.js";
import { recordListen, finishSession, XP_LISTEN } from "../core/progress.js";
import { PAIRS } from "../content/pairs.js";
import { say, preload, stopVoice } from "../engine/clips.js";

export function mountListening(root, S) {
  const L = S.listening, P = S.progress;
  const persist = () => save(S);
  const ui = { qs: [], i: 0, started: false, picked: null, good: 0, xp: 0, bonus: 0, done: false, error: "" };
  const q = () => ui.qs[ui.i];
  const played = () => q().pair[q().side];
  let alive = true;

  function newSession() {
    Object.assign(ui, { qs: pickQuestions(L, PAIRS), i: 0, picked: null, good: 0, xp: 0, bonus: 0, done: false, error: "" });
    for (const { pair } of ui.qs) { for (const w of [pair.a, pair.b]) preload(w.en, { voice: S.voiceId }).catch(() => {}); } // échec : le son sera chargé au clic
  }

  async function play(text) {
    ui.error = "";
    try { await say(text, { voice: S.voiceId }); }
    catch (e) { ui.error = `La lecture a échoué (${e.message}).`; if (alive) draw(); }
  }

  // Après une erreur : le mot joué, puis l'autre, pour entendre la différence.
  // Le 2e mot n'est joué que si rien n'a bougé entre-temps (même question, pas d'autre comparaison).
  let cmp = 0;
  async function compare() {
    const id = ++cmp, i = ui.i, { pair, side } = q(), other = side === "a" ? "b" : "a";
    const still = () => alive && id === cmp && ui.i === i && ui.picked;
    await play(pair[side].en);
    await new Promise((r) => setTimeout(r, 350));
    if (still()) await play(pair[other].en);
  }

  function choice(side) {
    const w = q().pair[side], cls = !ui.picked ? "" : side === q().side ? " right" : side === ui.picked ? " wrong" : "";
    return html`<button class="btn choice${cls}" data-act="pick" data-side="${side}" type="button" lang="en" ${ui.picked ? "disabled" : ""}>
      <b>${w.en}</b><span class="small">${w.fr}</span></button>`;
  }

  function draw() {
    const head = html`<p class="row"><button class="btn ghost" data-act="home" type="button">← Parcours</button>
      <span class="muted small">${ui.xp ? `+${ui.xp} XP dans cette séance` : ""}</span></p>`;
    if (ui.done) {
      render(root, html`${head}<section class="card" role="status">
        <h2>🎉 Séance finie !</h2><p>${ui.good} bonne${ui.good > 1 ? "s" : ""} réponse${ui.good > 1 ? "s" : ""} sur ${ui.qs.length} · +${ui.xp} XP${ui.bonus ? ` (dont ${ui.bonus} de bonus)` : ""}.</p>
        <p class="muted small">Les paires ratées reviendront plus souvent.</p>
        <button class="btn" data-act="again" type="button">Nouvelle séance</button></section>`);
      return;
    }
    const ok = ui.picked === q().side, w = played();
    render(root, html`${head}
      <section class="card">
        <p class="muted small">Question ${ui.i + 1} / ${ui.qs.length} · sons : ${q().pair.sounds.replace("|", " ou ").replace("-", "rien")}</p>
        <h1 class="sentence">Quel mot entends-tu ?</h1>
        ${ui.started
          ? html`<button class="btn soft" data-act="replay" type="button">🔊 Réécouter</button>`
          : html`<button class="btn big" data-act="start" type="button">▶ Écouter le mot</button>`}
        ${ui.started ? html`<div class="choices">${choice("a")}${choice("b")}</div>` : ""}
        ${ui.error ? html`<p class="small error" role="alert">${ui.error}</p>` : ""}
      </section>
      ${ui.picked ? html`<section class="card" aria-live="polite">
        <p class="feedback">${ok ? `Bravo ! +${XP_LISTEN} XP` : html`C'était <b lang="en">${w.en}</b> (${w.fr}). Écoute la différence :`}</p>
        ${ok ? "" : html`<p><button class="btn soft" data-act="compare" type="button">🔊 Réécouter les deux</button></p>`}
        <div class="row"><span></span><button class="btn" data-act="next" type="button">${ui.i + 1 < ui.qs.length ? "Suivant →" : "Voir le bilan"}</button></div>
      </section>` : ""}`);
  }

  function pick(side) {
    if (ui.picked || !ui.started) return;
    const ok = side === q().side;
    ui.picked = side;
    recordPair(L, q().pair.id, ok);
    if (ok) { ui.good++; ui.xp += recordListen(P, true); }
    persist(); draw();
    if (!ok) compare();
  }

  function next() {
    stopVoice(); cmp++;
    ui.picked = null; ui.i++;
    if (ui.i >= ui.qs.length) {
      ui.done = true; ui.bonus = finishSession(P, ui.qs.length); ui.xp += ui.bonus; persist(); draw(); return;
    }
    draw(); play(played().en); // le clic sur « Suivant » autorise le son
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "home") location.hash = "#accueil";
    if (act === "start") { ui.started = true; draw(); play(played().en); }
    if (act === "replay") play(played().en);
    if (act === "compare") compare();
    if (act === "pick") pick(el.dataset.side);
    if (act === "next") next();
    if (act === "again") { newSession(); ui.started = false; draw(); }
  });

  newSession();
  draw();
  return () => { alive = false; stopVoice(); };
}
