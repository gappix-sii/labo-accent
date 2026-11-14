// Écran « Dis cette phrase » : phrase → enregistrement → note son par son + conseils.
import { html, render, $ } from "../core/dom.js";
import { save, summarize } from "../core/store.js";
import { SENTENCES } from "../content/sentences.js";
import { Recorder } from "../engine/recorder.js";
import { prepare, score, onEngine, MODEL_MB } from "../engine/engine.js";
import { FR_HINT } from "../engine/phonemes.js";
import { say as speakText, stopVoice, prepareVoice, onVoice, VOICES, VOICE_MB } from "../engine/voice.js";

const LEVEL_FR = { good: "bien", ok: "presque", bad: "à revoir", skip: "non noté" };
const STATUS_FR = { good: "bien", ok: "presque", bad: "à revoir" };

export function mountSay(root, S) {
  const ui = { engine: S.engine ? "loading" : "off", progress: null, busy: "", error: "", voice: "off", voiceProgress: null, voiceInfo: "", playing: false };
  let rec = null;

  const sentence = () => SENTENCES[S.sentence % SENTENCES.length];
  const persist = () => save(S);

  function draw() {
    const s = sentence(), last = S.last && S.last.sentence === s.en ? S.last : null;
    render(root, html`
      <section class="card">
        <p class="muted small">Phrase ${S.sentence % SENTENCES.length + 1} / ${SENTENCES.length} · ${s.focus}</p>
        <h1 class="sentence" lang="en">${s.en}</h1>
        <p class="muted">${s.fr}</p>
        ${voiceBlock()}
        <div class="row">
          <button class="btn ghost" data-act="prev" type="button">← Précédente</button>
          <button class="btn ghost" data-act="next" type="button">Suivante →</button>
        </div>
      </section>
      <section class="card">${engineBlock()}</section>
      ${ui.error ? html`<p class="card error" role="alert">${ui.error}</p>` : ""}
      <section class="card" aria-live="polite">${last ? resultBlock(last) : html`<p class="muted">Pas encore de résultat pour cette phrase.</p>`}</section>
    `);
  }

  function voiceBlock() {
    if (ui.voice === "loading") {
      const p = ui.voiceProgress;
      const pct = p && p.total ? Math.round((p.loaded / p.total) * 100) : null;
      return html`<div class="voice"><p>Préparation de la voix…${pct !== null ? ` ${pct} %` : ""}</p><progress max="100" value="${pct ?? 0}"></progress></div>`;
    }
    return html`<div class="voice">
      <div class="row start">
        <button class="btn soft" data-act="listen" type="button">${ui.playing ? "⏹ Stop" : "🔊 Écouter"}</button>
        <button class="btn soft" data-act="slow" type="button">🐢 Lentement</button>
        <label class="small">Voix
          <select data-act="voice-pick">${VOICES.map((v) => v.id === S.voiceId
            ? html`<option value="${v.id}" selected>${v.name}</option>`
            : html`<option value="${v.id}">${v.name}</option>`)}</select>
        </label>
      </div>
      ${!S.voice ? html`<p class="muted small">Première écoute : environ ${VOICE_MB} Mo à télécharger, une seule fois. La voix fonctionne ensuite sur ton appareil.</p>` : ""}
      ${ui.voiceInfo ? html`<p class="muted small">${ui.voiceInfo}</p>` : ""}
    </div>`;
  }

  // Doit être lancé directement par le clic : le navigateur n'autorise le son qu'après un geste.
  async function listen(speed) {
    if (ui.playing) { stopVoice(); return; }
    ui.error = "";
    const firstTime = ui.voice !== "ready";
    const playing = speakText(sentence().en, { voice: S.voiceId, speed });
    playing.catch(() => {}); // l'erreur est traitée plus bas
    if (firstTime) {
      ui.voice = "loading"; draw();
      try {
        const r = await prepareVoice();
        ui.voiceInfo = `Voix prête en ${Math.round(r.ms / 100) / 10} s`;
        ui.voice = "ready"; S.voice = true; persist();
      } catch (e) {
        ui.voice = "off";
        ui.error = `La voix n'a pas pu se charger (${e.message}). Vérifie ta connexion puis réessaie.`;
        return draw();
      }
    }
    ui.playing = true; draw();
    try { await playing; } catch (e) { ui.error = `La lecture a échoué (${e.message}).`; }
    ui.playing = false; draw();
  }

  function engineBlock() {
    if (ui.engine === "off") {
      return html`<p>Le moteur de prononciation fonctionne sur ton appareil : ta voix n'est jamais envoyée sur Internet.</p>
        <p class="muted small">Premier lancement : environ ${MODEL_MB} Mo à télécharger (une seule fois, puis gardé par le navigateur).</p>
        <button class="btn" data-act="prepare" type="button">Préparer le moteur</button>`;
    }
    if (ui.engine === "loading") {
      const p = ui.progress;
      const pct = p && p.total ? Math.round((p.loaded / p.total) * 100) : null;
      return html`<p>Préparation du moteur…${pct !== null ? ` ${pct} %` : ""}</p>
        <progress max="100" value="${pct ?? 0}"></progress>
        ${p && p.total ? html`<p class="muted small">${Math.round(p.loaded / 1048576)} / ${Math.round(p.total / 1048576)} Mo</p>` : ""}`;
    }
    if (ui.busy === "rec") {
      return html`<p>Je t'écoute… parle, puis tais-toi : l'enregistrement s'arrête tout seul.</p>
        <meter id="level" min="0" max="1" value="0"></meter>
        <button class="btn red" data-act="stop" type="button">Arrêter</button>`;
    }
    if (ui.busy === "analyze") return html`<p>Analyse en cours…</p>`;
    return html`<button class="btn big" data-act="speak" type="button">🎤 Parler</button>
      ${ui.info ? html`<p class="muted small">${ui.info}</p>` : ""}`;
  }

  function resultBlock(r) {
    return html`
      <p class="score score-${r.score >= 85 ? "good" : r.score >= 55 ? "ok" : "bad"}">${r.score} <span>/ 100</span></p>
      <div class="words" lang="en">${r.words.map((w) => html`
        <div class="word lv-${w.level}">
          <b>${w.display}</b>
          <span class="small">${w.score === null ? LEVEL_FR.skip : `${w.score} · ${LEVEL_FR[w.level]}`}</span>
          <span class="phones">${w.phones.map((ph) => html`<i class="ph st-${ph.status}" title="${`${ph.p} : ${FR_HINT[ph.p] || ""} — ${STATUS_FR[ph.status]}${ph.heard && ph.heard !== ph.p ? `, entendu « ${ph.heard} »` : ""}`}">${ph.p}</i>`)}</span>
        </div>`)}</div>
      ${r.tips.length ? html`<h2>Conseils</h2><ul class="tips">${r.tips.map((t) => html`<li><b lang="en">${t.word}</b> · ${t.text}</li>`)}</ul>` : html`<p>Aucun son à revoir. Bravo !</p>`}
      <p class="muted small">Entendu : <span lang="en">${r.heard || "rien"}</span></p>`;
  }

  async function startEngine() {
    ui.engine = "loading"; ui.error = ""; draw();
    try {
      const r = await prepare();
      ui.engine = "ready";
      ui.info = `Moteur prêt en ${Math.round(r.ms / 100) / 10} s · ${r.threads > 1 ? `${r.threads} cœurs` : "1 cœur"}`;
      S.engine = true; persist();
    } catch (e) {
      ui.engine = "off";
      ui.error = `Le moteur n'a pas pu se charger (${e.message}). Vérifie ta connexion puis réessaie.`;
    }
    draw();
  }

  async function speak() {
    ui.error = "";
    stopVoice(); // on ne s'enregistre pas par-dessus la voix
    rec = new Recorder({
      onLevel: (v) => { const m = $("#level", root); if (m) m.value = v; },
      onAutoStop: () => finish()
    });
    try {
      await rec.start();
    } catch {
      rec = null;
      ui.error = "Je n'ai pas accès au micro. Autorise-le dans le navigateur (icône à gauche de l'adresse), puis réessaie.";
      return draw();
    }
    ui.busy = "rec"; draw();
  }

  async function finish() {
    if (!rec) return;
    const r = rec; rec = null;
    ui.busy = "analyze"; draw();
    try {
      const out = await r.stop();
      if (!out || !out.heardSpeech || !out.pcm || out.pcm.samples.length < 1600) {
        ui.error = "Je n'ai rien entendu. Rapproche-toi du micro et parle un peu plus fort.";
      } else {
        const s = sentence().en;
        const res = await score(s, out.pcm.samples);
        S.last = summarize(s, res); persist();
        ui.info = `Analyse en ${Math.round(res.ms / 100) / 10} s`;
      }
    } catch (e) {
      ui.error = `L'analyse a échoué (${e.message}).`;
    }
    ui.busy = ""; draw();
  }

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act || (ui.busy && act !== "stop")) return;
    if (act === "listen") listen(1);
    if (act === "slow") listen(0.7);
    if (act === "prev" || act === "next") {
      stopVoice();
      S.sentence = (S.sentence + (act === "next" ? 1 : SENTENCES.length - 1)) % SENTENCES.length;
      ui.error = ""; persist(); draw();
    }
    if (act === "prepare") startEngine();
    if (act === "speak") speak();
    if (act === "stop") finish();
  });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.act !== "voice-pick") return;
    S.voiceId = VOICES.some((v) => v.id === e.target.value) ? e.target.value : "af_heart";
    persist();
  });

  let lastVoiceDraw = 0;
  onVoice((ev) => {
    if (ev.type !== "progress" || ui.voice !== "loading") return;
    ui.voiceProgress = ev;
    if (performance.now() - lastVoiceDraw > 250) { lastVoiceDraw = performance.now(); draw(); }
  });

  let lastDraw = 0; // la progression arrive très souvent : on redessine au plus 4 fois par seconde
  onEngine((ev) => {
    if (ev.type !== "progress" || ui.engine !== "loading") return;
    ui.progress = ev;
    if (performance.now() - lastDraw > 250) { lastDraw = performance.now(); draw(); }
  });

  draw();
  if (S.engine) startEngine(); // déjà téléchargé : on le recharge depuis le cache du navigateur
}
