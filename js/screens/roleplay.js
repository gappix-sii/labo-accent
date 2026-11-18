// Écran « Jeux de rôle » (phase 4) : #role = liste des dialogues ; #role/<id> = un dialogue.
// Le personnage parle (son + texte, français à la demande). À ton tour, les réponses possibles
// s'affichent en français : tu en touches une, tu la dis en anglais au micro ; réussie à 65, on passe
// au tour suivant et l'objectif du tour est coché. Une réponse choisie, on peut passer le tour (sans XP ni
// objectif), même sans essai noté : sinon, sans micro, le dialogue serait bloqué.
// XP : 10 par réplique réussie, + 20 quand toutes le sont (js/core/tracks.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { PASS, XP_ITEM, XP_LESSON } from "../core/progress.js";
import { scoreTurn, trackState, roleKey } from "../core/tracks.js";
import { DIALOGUES, dialogueById } from "../content/dialogues.js";
import { say, stopVoice } from "../engine/clips.js";
import { practice, resultBlock } from "./practice.js";
import { listenControls } from "./listen.js";

export function mountRoleList(root, S) {
  const P = S.progress;
  render(root, html`
    <p class="row"><button class="btn ghost" data-act="home" type="button">← Accueil</button></p>
    <section class="card"><h1 class="sentence">🎭 Jeux de rôle</h1>
      <p class="muted small">Une petite scène de la vie courante : le personnage te parle, tu choisis ta réponse et tu la dis en anglais.</p></section>
    <section class="card"><ol class="path">${DIALOGUES.map((d) => {
      const st = trackState(P, roleKey(d.id));
      return html`<li><button class="lesson${st.done ? " done" : ""}" data-act="open" data-id="${d.id}" type="button">
        <span>${d.title} <span class="muted small">· ${d.level}</span></span><span class="muted small">${st.done ? `✓${st.done > 1 ? ` ×${st.done}` : ""}` : ""}</span></button></li>`;
    })}</ol></section>`);
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.act === "home") location.hash = "#accueil";
    if (el.dataset.act === "open" && dialogueById(el.dataset.id)) location.hash = "#role/" + el.dataset.id;
  });
  return () => {};
}

export function mountRole(root, S, id) {
  const d = dialogueById(id), P = S.progress;
  if (!d) { location.hash = "#role"; return () => {}; }
  const persist = () => save(S);
  const ui = {};
  const turn = () => d.turns[ui.pos];
  const chosen = () => turn().me[ui.choice];
  let alive = true;

  function reset() {
    Object.assign(ui, { started: false, pos: 0, log: [], tasks: new Set(), choice: null, last: null, ok: false,
      feedback: "", gained: 0, bonus: false, fr: ui.fr || false });
  }

  // Avance jusqu'à ton prochain tour : les répliques du personnage s'ajoutent et la dernière est jouée.
  function advance() {
    let line = null;
    while (ui.pos < d.turns.length && turn().ai) { line = turn(); ui.log.push({ who: "ai", en: line.ai, fr: line.fr }); ui.pos++; }
    draw();
    if (line) say(line.ai, { voice: S.voiceId }).catch(() => {});
  }

  function bubbles() {
    return html`<div class="chat">${ui.log.map((m, i) => html`<div class="bubble ${m.who}">
      ${m.who === "ai" ? html`<button class="btn soft small-btn" data-act="replay-ai" data-i="${i}" type="button" aria-label="Réécouter">🔊</button>` : ""}
      <span><span lang="en">${m.en}</span>${ui.fr && m.fr ? html`<br><span class="muted small">${m.fr}</span>` : ""}</span></div>`)}</div>`;
  }

  function tasksBlock() {
    return html`<ul class="tasks">${d.tasks.map((t, i) => html`<li class="${ui.tasks.has(i) ? "ok" : ""}">${ui.tasks.has(i) ? "✓" : "○"} ${t}</li>`)}</ul>`;
  }

  function myTurnBlock() {
    const t = turn();
    if (ui.choice === null) {
      return html`<section class="card"><p class="muted small">À toi : ${t.hint}</p>
        <div class="options col">${t.me.map((o, i) => html`<button class="btn choice" data-act="choose" data-i="${i}" type="button">${o[1]}</button>`)}</div>
        <p class="muted small">Choisis ce que tu veux dire, puis dis-le en anglais.</p></section>`;
    }
    const passed = ui.last && ui.ok;
    return html`<section class="card"><p class="muted small">À toi : dis-le en anglais.</p>
        <h1 class="sentence" lang="en">${chosen()[0]}</h1><p class="muted">${chosen()[1]}</p>${voice.block()}
        ${passed ? "" : html`<p><button class="btn ghost" data-act="unchoose" type="button">↺ Choisir une autre réponse</button></p>`}</section>
      ${passed ? "" : html`<section class="card">${mic.block()}
        <p><button class="btn ghost" data-act="skip" type="button">Passer ce tour →</button></p></section>`}${mic.errorBlock()}
      ${ui.last ? html`<section class="card" aria-live="polite"><p class="feedback">${ui.feedback}</p>${resultBlock(ui.last)}
        ${passed ? html`<div class="row"><span></span><button class="btn" data-act="continue" type="button">Continuer →</button></div>` : ""}</section>` : ""}`;
  }

  function draw() {
    if (!alive) return;
    const end = ui.started && ui.pos >= d.turns.length;
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="list" type="button">← Jeux de rôle</button>
        <span class="muted small">${ui.gained ? `+${ui.gained} XP dans ce dialogue` : ""}</span></p>
      <section class="card"><p class="muted small">${d.level} · ${d.role}</p><h1 class="sentence">${d.title}</h1>
        <p>🎯 ${d.goal}</p>${tasksBlock()}
        <p><button class="chip${ui.fr ? " on" : ""}" data-act="fr" type="button" aria-pressed="${ui.fr ? "true" : "false"}">Traduction en français</button></p></section>
      ${!ui.started ? html`<button class="btn big" data-act="start" type="button">▶ Commencer</button>
        <p><button class="btn soft" data-act="free" type="button">💬 Conversation libre</button>
          <span class="muted small">la même scène, sans réponses toutes faites : tu dis ce que tu veux, Gemini joue le personnage et te corrige</span></p>` : ui.log.length ? html`<section class="card">${bubbles()}</section>` : ""}
      ${end ? html`<section class="card done-card" role="status"><h2>🎉 Dialogue fini !</h2>
          <p>${ui.tasks.size} objectif${ui.tasks.size > 1 ? "s" : ""} sur ${d.tasks.length} · +${ui.gained} XP${ui.bonus ? ` (dont ${XP_LESSON} de bonus)` : ""}.</p>
          <div class="row start"><button class="btn" data-act="restart" type="button">Rejouer</button>
          <button class="btn ghost" data-act="list" type="button">Autres dialogues</button></div></section>`
        : ui.started ? myTurnBlock() : ""}`);
  }

  const voice = listenControls({ S, persist, draw, text: () => (turn() && turn().me && ui.choice !== null ? chosen()[0] : "") });
  const mic = practice({
    S, persist, draw, root, speakLabel: "🎤 Dire ma réponse",
    target: () => ({ text: chosen()[0], focus: [] }),
    onScored: (last) => {
      const got = scoreTurn(P, d, ui.pos, last.score);
      persist();
      ui.last = last; ui.ok = got.passed; ui.gained += got.xp;
      if (got.lessonDone) ui.bonus = true;
      if (got.task !== null) ui.tasks.add(got.task);
      ui.feedback = got.passed
        ? (got.xp ? `Réussi ! +${XP_ITEM} XP` : "Réussi ! (déjà compté pour ce passage)")
        : `Pas encore : il faut ${PASS}. Écoute le modèle, puis réessaie (ou passe ce tour).`;
    }
  });

  // Fin de ton tour : ta réplique rejoint la conversation et le personnage répond.
  function endMyTurn() {
    voice.stop(); mic.clearError();
    ui.log.push({ who: "me", en: chosen()[0], fr: chosen()[1] });
    Object.assign(ui, { choice: null, last: null, ok: false, feedback: "" });
    ui.pos++;
    advance();
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (ui.choice !== null && (mic.handle(act) || voice.handle(act))) return;
    if (act === "list") location.hash = "#role";
    if (act === "free") location.hash = `#role/${d.id}/libre`;
    if (act === "fr") { ui.fr = !ui.fr; draw(); }
    if (act === "start") { ui.started = true; advance(); }
    if (act === "restart") { stopVoice(); reset(); ui.started = true; advance(); }
    if (act === "replay-ai") { const m = ui.log[Number(el.dataset.i)]; if (m) say(m.en, { voice: S.voiceId }).catch(() => {}); }
    if (act === "choose" && turn() && turn().me && turn().me[Number(el.dataset.i)]) { stopVoice(); ui.choice = Number(el.dataset.i); draw(); voice.warm(); }
    if (act === "unchoose") { voice.stop(); Object.assign(ui, { choice: null, last: null, ok: false, feedback: "" }); mic.clearError(); draw(); }
    if (act === "continue" && ui.ok) endMyTurn();
    if (act === "skip" && ui.choice !== null && !ui.ok) endMyTurn();
  });
  root.addEventListener("change", (e) => voice.change(e));

  reset();
  draw();
  return () => { alive = false; voice.dispose(); mic.dispose(); };
}
