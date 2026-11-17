// Écran « Dis cette phrase » : phrase → enregistrement → note son par son + conseils.
import { html, render, $ } from "../core/dom.js";
import { save, summarize, logEntry, addLog } from "../core/store.js";
import { kindBlock, benchBlock, benchText } from "./bench.js";
import { SENTENCES } from "../content/sentences.js";
import { Recorder } from "../engine/recorder.js";
import { prepare, score, onEngine, MODEL_MB } from "../engine/engine.js";
import { FR_HINT } from "../engine/phonemes.js";
import { say as speakText, preload, stopVoice, lastStats, VOICES } from "../engine/clips.js";

const SLOW = 0.7;

const LEVEL_FR = { good: "bien", ok: "presque", bad: "à revoir", skip: "non noté" };
const STATUS_FR = { good: "bien", ok: "presque", bad: "à revoir" };

export function mountSay(root, S) {
  const ui = { engine: S.engine ? "loading" : "off", progress: null, busy: "", error: "", voiceInfo: "", playing: false };
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
      <section class="card">${benchBlock(S)}${ui.copied ? html`<p class="small" role="status">${ui.copied}</p>` : ""}</section>
    `);
  }

  function voiceBlock() {
    return html`<div class="voice">
      <div class="row start">
        <button class="btn soft" data-act="listen" type="button">${ui.playing === 1 ? "⏹ Stop" : "🔊 Écouter"}</button>
        <button class="btn soft" data-act="slow" type="button">${ui.playing === SLOW ? "⏹ Stop" : "🐢 Lentement"}</button>
        <label class="small">Voix
          <select data-act="voice-pick">${VOICES.map((v) => v.id === S.voiceId
            ? html`<option value="${v.id}" selected>${v.name}</option>`
            : html`<option value="${v.id}">${v.name}</option>`)}</select>
        </label>
      </div>
      ${ui.voiceInfo ? html`<p class="muted small">${ui.voiceInfo}</p>` : ""}
    </div>`;
  }

  // Joue le son livré avec l'appli. Lancé directement par le clic : le navigateur n'autorise le son qu'après un geste.
  async function listen(speed) {
    if (ui.playing === speed) { stopVoice(); return; } // même bouton pendant la lecture : stop
    ui.error = "";
    const playing = speakText(sentence().en, { voice: S.voiceId, speed });
    ui.playing = speed; draw();
    try { await playing; } catch (e) { ui.error = `La lecture a échoué (${e.message}).`; }
    if (ui.playing !== speed) return; // une autre lecture a pris le relais
    const st = lastStats();
    if (st && st.firstMs !== null) ui.voiceInfo = `Dernière écoute : son lancé ${st.firstMs} ms après le clic`;
    ui.playing = false; draw();
  }

  // Charge à l'avance le son de la phrase affichée (quelques Ko) : le clic part tout de suite.
  function warm() { preload(sentence().en, { voice: S.voiceId }).catch(() => {}); }

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
    return html`${kindBlock(S, false)}<button class="btn big" data-act="speak" type="button">🎤 Parler</button>
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

  let starting = false; // micro en cours d'ouverture (le navigateur peut demander l'autorisation)
  async function speak() {
    if (rec || starting) return; // un 2e clic pendant l'ouverture ouvrirait un 2e micro, jamais coupé
    starting = true;
    ui.error = "";
    stopVoice(); // on ne s'enregistre pas par-dessus la voix
    const r = new Recorder({
      onLevel: (v) => { const m = $("#level", root); if (m) m.value = v; },
      onAutoStop: () => finish()
    });
    try {
      await r.start();
    } catch {
      ui.error = "Je n'ai pas accès au micro. Autorise-le dans le navigateur (icône à gauche de l'adresse), puis réessaie.";
      return draw();
    } finally {
      starting = false;
    }
    rec = r;
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
        S.last = summarize(s, res);
        addLog(S, logEntry(S.sentence % SENTENCES.length, S.kind, S.last));
        persist();
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
    if (act === "kind-soigné" || act === "kind-fautes") { S.kind = act.slice(5); persist(); draw(); }
    if (act === "copy-log") {
      navigator.clipboard.writeText(benchText(S)).then(
        () => { ui.copied = "Copié ! Colle-le dans la conversation avec Claude (Ctrl+V)."; draw(); },
        () => { ui.copied = "La copie a échoué : sélectionne le tableau à la main."; draw(); }
      );
    }
    if (act === "listen") listen(1);
    if (act === "slow") listen(SLOW);
    if (act === "prev" || act === "next") {
      stopVoice();
      S.sentence = (S.sentence + (act === "next" ? 1 : SENTENCES.length - 1)) % SENTENCES.length;
      ui.error = ""; persist(); draw(); warm();
    }
    if (act === "prepare") startEngine();
    if (act === "speak") speak();
    if (act === "stop") finish();
  });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.act !== "voice-pick") return;
    S.voiceId = VOICES.some((v) => v.id === e.target.value) ? e.target.value : "af_heart";
    persist(); warm();
  });

  let lastDraw = 0; // la progression arrive très souvent : on redessine au plus 4 fois par seconde
  onEngine((ev) => {
    if (ev.type !== "progress" || ui.engine !== "loading") return;
    ui.progress = ev;
    if (performance.now() - lastDraw > 250) { lastDraw = performance.now(); draw(); }
  });

  draw();
  warm();
  if (S.engine) startEngine(); // déjà téléchargé : on le recharge depuis le cache
}
