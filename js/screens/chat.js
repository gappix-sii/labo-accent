// Conversation libre (phase 5) : #discussion = discussion avec un coach sur un sujet choisi ; le même écran sert
// aux jeux de rôle en conversation libre (tâche 5, mountFreeChat avec une scène). Gemini Live répond à voix haute
// (js/engine/live.js) ; après chaque phrase, un encadré montre la correction, que l'on redit au micro, notée son par son
// par le moteur de l'appareil : 10 XP à 65, une fois par correction. Rien n'est gardé de la conversation.
import { html, render, $ } from "../core/dom.js";
import { save } from "../core/store.js";
import { loadKey } from "../core/keys.js";
import { recordFree, PASS, XP_ITEM } from "../core/progress.js";
import { instructions, coachScene, rewardOnce, cleanText, TOPICS, LEVELS } from "../core/chat.js";
import { LiveChat } from "../engine/live.js";
import { MicStream, Player } from "../engine/live-audio.js";
import { errorText } from "../engine/gemini.js";
import { practice, resultBlock } from "./practice.js";

export function mountChat(root, S) {
  const ui = { topic: "", level: "A2" };
  function draw() {
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Accueil</button></p>
      <section class="card"><h1 class="sentence">💬 Discussion libre</h1>
        <p class="muted small">Parle de ce que tu veux avec Alex, ton coach. Après chaque phrase, tu vois la correction et tu la redis.</p></section>
      <section class="card"><h2>Sujet</h2>
        <p class="kind">${TOPICS.map((t) => html`<button class="chip${ui.topic === t.en ? " on" : ""}" data-act="topic" data-v="${t.en}" type="button" aria-pressed="${ui.topic === t.en ? "true" : "false"}">${t.fr}</button>`)}</p>
        <label class="field">Ou tape ton sujet (en français ou en anglais)<input id="topic-input" type="text" maxlength="120" autocomplete="off" value="${TOPICS.some((t) => t.en === ui.topic) ? "" : ui.topic}"></label>
        <h2>Niveau</h2>
        <p class="kind">${LEVELS.map((l) => html`<button class="chip${ui.level === l ? " on" : ""}" data-act="level" data-v="${l}" type="button" aria-pressed="${ui.level === l ? "true" : "false"}">${l}</button>`)}</p>
        <button class="btn big" data-act="start" type="button">▶ Commencer</button></section>`);
  }
  root.addEventListener("input", (e) => { if (e.target.id === "topic-input") ui.topic = e.target.value; });
  let child = null;
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || child) return;
    const act = el.dataset.act;
    if (act === "home") location.hash = "#accueil";
    if (act === "topic") { ui.topic = el.dataset.v; draw(); }
    if (act === "level" && LEVELS.includes(el.dataset.v)) { ui.level = el.dataset.v; draw(); }
    if (act === "start") {
      const box = document.createElement("div"); root.replaceChildren(box); // nouvel élément : les écouteurs ci-dessus ne l'atteignent plus
      child = mountFreeChat(box, S, coachScene(ui.topic, ui.level), "#accueil");
    }
  });
  draw();
  return () => { if (child) child(); };
}

// scene : { title, level, persona, situation, goal, opening } ; back : adresse du bouton retour.
export function mountFreeChat(root, S, scene, back = "#accueil") {
  const P = S.progress, persist = () => save(S);
  const ui = { log: [], status: "", error: "", talking: false, waiting: false, ready: false, redo: -1, gained: 0, draft: "", ended: false };
  const player = new Player();
  let chat = null, mic = null, aiItem = null, meItem = null, alive = true, raf = 0;
  const key = loadKey();

  // Les morceaux de réponse arrivent très souvent : un seul redessin par image.
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

  function on(type, data) {
    if (!alive) return;
    if (type === "status") ui.status = data;
    else if (type === "ready") { ui.ready = true; ui.status = data.resumed ? "Reconnecté." : ""; ui.waiting = !data.resumed; }
    else if (type === "audio") player.play(data);
    else if (type === "heard") { if (!meItem) { meItem = { who: "me", text: "" }; ui.log.push(meItem); } meItem.text += data; }
    else if (type === "reply") { if (!aiItem) { aiItem = { who: "ai", text: "" }; ui.log.push(aiItem); } aiItem.text += data; ui.status = ""; }
    else if (type === "correction") ui.log.push({ who: "corr", c: data, last: null, feedback: "" });
    else if (type === "interrupted") player.stop();
    else if (type === "turnDone") { aiItem = meItem = null; ui.waiting = false; ui.status = ""; }
    else if (type === "slow") ui.status = "Google prend son temps…";
    else if (type === "error") { ui.waiting = false; ui.error = errorText(data); ui.canRetry = data === "no_reply"; }
    soon();
  }

  function start() {
    if (!key) return;
    player.unlock();
    chat = new LiveChat({ key, on, voice: S.liveVoice, instructions: instructions(scene), opening: scene.opening });
    ui.status = "Connexion…"; draw();
    chat.start();
  }

  // ---- ton tour au micro : le son part pendant que tu parles, la fin de phrase est détectée sur l'appareil ----
  async function talk() {
    if (mic) { finishTalk(); return; }
    if (!chat || !ui.ready || ui.redo >= 0) return;
    player.stop(); ui.error = ""; ui.canRetry = false;
    if (!chat.beginTurn()) return;
    aiItem = meItem = null;
    mic = new MicStream({ onChunk: (c) => chat.audio(c), onLevel: (v) => { const m = $("#live-level", root); if (m) m.value = v; }, onEnd: () => finishTalk() });
    ui.talking = true; draw();
    try { await mic.start(); } catch { mic = null; ui.talking = false; ui.error = errorText("mic"); chat.endTurn(); draw(); }
  }
  function finishTalk() {
    const m = mic; mic = null;
    if (!m) return;
    m.stop(); ui.talking = false;
    chat.endTurn(); ui.waiting = true; ui.status = m.heard ? "" : "Je n'ai presque rien entendu… on verra ce que Gemini a compris.";
    draw();
  }
  function sendText() {
    const t = cleanText(ui.draft, 500);
    if (!t || !chat || !ui.ready || ui.waiting) return;
    player.stop(); ui.error = ""; ui.canRetry = false;
    if (chat.text(t)) { aiItem = null; meItem = null; ui.log.push({ who: "me", text: t }); ui.draft = ""; ui.waiting = true; }
    draw();
  }

  // ---- redire la phrase corrigée : moteur de prononciation de l'appareil (rien n'est envoyé) ----
  const mic2 = practice({
    S, persist, draw: () => draw(), root, speakLabel: "🎤 Redire la version corrigée",
    target: () => ({ text: ui.log[ui.redo].c.corrected, focus: [] }),
    onScored: (last) => {
      const it = ui.log[ui.redo];
      it.last = last;
      const passed = last.score >= PASS;
      const xp = passed && rewardOnce(it.c) ? recordFree(P, last.score) : 0;
      if (xp) { ui.gained += xp; persist(); }
      it.feedback = passed ? (xp ? `Réussi ! +${XP_ITEM} XP` : "Réussi ! (déjà compté)") : `Pas encore : il faut ${PASS}. Réessaie.`;
    }
  });

  function corrBlock(it, i) {
    const c = it.c, open = ui.redo === i;
    return html`<div class="correction-card${c.ok ? " ok" : ""}">
      <p class="small muted">Tu as dit : <span lang="en">${c.heard}</span></p>
      ${c.ok ? html`<p>✓ <b lang="en">${c.corrected}</b></p>` : html`<p>✗ Corrigé : <b lang="en">${c.corrected}</b></p>`}
      ${c.explanation_fr ? html`<p class="small">💡 ${c.explanation_fr}</p>` : ""}
      ${c.natural && c.natural !== c.corrected ? html`<p class="small">🗣 Un natif dirait : <span lang="en">${c.natural}</span></p>` : ""}
      ${open ? html`${mic2.block()}${mic2.errorBlock()}${it.feedback ? html`<p class="feedback">${it.feedback}</p>` : ""}${it.last ? resultBlock(it.last) : ""}
          <p><button class="btn ghost small-btn" data-act="redo-close" type="button">Fermer</button></p>`
        : html`<button class="btn soft small-btn" data-act="redo" data-i="${i}" type="button" ${ui.talking ? "disabled" : ""}>${c.rewarded ? "✓ Redite" : "🎤 Redis-la"}</button>`}
    </div>`;
  }

  function draw() {
    if (!alive) return;
    const focused = document.activeElement && document.activeElement.id === "chat-input";
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="back" type="button">← Terminer</button>
        <span class="muted small">${ui.gained ? `+${ui.gained} XP dans cette conversation` : ""}</span></p>
      <section class="card"><p class="muted small">${scene.level} · conversation libre avec Gemini</p><h1 class="sentence">${scene.title}</h1>
        ${scene.goal ? html`<p class="small">🎯 ${scene.goal}</p>` : ""}</section>
      ${!key ? html`<section class="card"><p>Il faut d'abord ta clé Gemini (gratuite).</p><button class="btn" data-act="settings" type="button">⚙️ Aller aux Réglages</button></section>`
        : !chat ? html`<section class="card"><p class="muted small">Ta voix (ou ce que tu tapes) est envoyée à Google pendant la conversation. Ne donne pas d'informations personnelles.</p>
            <button class="btn big" data-act="start" type="button">▶ Démarrer la conversation</button></section>`
        : html`
      <section class="card"><div class="chat">${ui.log.length ? ui.log.map((it, i) => it.who === "corr" ? corrBlock(it, i)
          : html`<div class="bubble ${it.who}"><span lang="en">${it.text}</span></div>`) : html`<p class="muted small">Connexion à Gemini…</p>`}</div></section>
      <section class="card" aria-live="polite">
        ${ui.error ? html`<p class="error" role="alert">${ui.error}</p>` : ""}
        ${ui.status || ui.waiting ? html`<p class="muted small">${ui.status || "Gemini réfléchit…"}</p>` : ""}
        ${ui.talking ? html`<p>Je t'écoute… parle, puis tais-toi une seconde.</p><meter id="live-level" min="0" max="1" value="0"></meter>
            <button class="btn red" data-act="talk" type="button">⏹ J'ai fini</button>`
          : html`<div class="row start"><button class="btn big" data-act="talk" type="button" ${ui.ready && ui.redo < 0 ? "" : "disabled"}>🎤 Parler</button>
            ${ui.canRetry ? html`<button class="btn soft" data-act="retry" type="button">Réessaie</button>` : ""}</div>
            <div class="row start send"><input id="chat-input" type="text" maxlength="500" autocomplete="off" placeholder="Ou tape ta phrase en anglais" value="${ui.draft}" lang="en" ${ui.ready ? "" : "disabled"}>
              <button class="btn soft" data-act="send" type="button" ${ui.ready && !ui.waiting ? "" : "disabled"}>Envoyer</button></div>`}
      </section>`}`);
    if (focused) { const inp = $("#chat-input", root); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
  }

  root.addEventListener("input", (e) => { if (e.target.id === "chat-input") ui.draft = e.target.value; });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "chat-input") sendText(); });
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic2.busy() && act !== "stop") return;
    if (ui.redo >= 0 && mic2.handle(act)) return;
    if (act === "back") location.hash = back;
    if (act === "settings") location.hash = "#reglages";
    if (act === "start") start();
    if (act === "talk") talk();
    if (act === "send") sendText();
    if (act === "retry") { ui.error = ""; ui.canRetry = false; ui.waiting = true; chat.retry(); draw(); }
    if (act === "redo" && ui.log[Number(el.dataset.i)] && !mic) { player.stop(); ui.redo = Number(el.dataset.i); mic2.clearError(); draw(); }
    if (act === "redo-close") { ui.redo = -1; draw(); }
  });

  draw();
  return () => {
    alive = false; cancelAnimationFrame(raf);
    if (mic) mic.stop();
    if (chat) chat.close();
    player.close(); mic2.dispose();
  };
}
