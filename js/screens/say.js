// Écran « Dis cette phrase » : phrase → enregistrement → note son par son + conseils.
import { html, render, $ } from "../core/dom.js";
import { save, summarize } from "../core/store.js";
import { SENTENCES } from "../content/sentences.js";
import { Recorder } from "../engine/recorder.js";
import { prepare, score, onEngine, MODEL_MB } from "../engine/engine.js";
import { FR_HINT } from "../engine/phonemes.js";
import { say as speakText, preload, isReady, stopVoice, prepareVoice, onVoice, unlockAudio, lastStats, VOICES, VOICE_MB } from "../engine/voice.js";

const SLOW = 0.7;

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
        <button class="btn soft" data-act="listen" type="button">${ui.playing === 1 ? "⏹ Stop" : "🔊 Écouter"}</button>
        <button class="btn soft" data-act="slow" type="button">${ui.playing === SLOW ? "⏹ Stop" : "🐢 Lentement"}</button>
        <label class="small">Voix
          <select data-act="voice-pick">${VOICES.map((v) => v.id === S.voiceId
            ? html`<option value="${v.id}" selected>${v.name}</option>`
            : html`<option value="${v.id}">${v.name}</option>`)}</select>
        </label>
      </div>
      ${!S.voice ? html`<p class="muted small">Première écoute : environ ${VOICE_MB} Mo à télécharger, une seule fois. La voix fonctionne ensuite sur ton appareil.</p>` : ""}
      ${ui.voice === "ready" ? prepLine() : ""}
      ${ui.voiceInfo ? html`<p class="muted small">${ui.voiceInfo}</p>` : ""}
    </div>`;
  }

  function prepLine() {
    const c = readyCount(), total = SENTENCES.length * 2;
    return c >= total
      ? html`<p class="muted small">✓ Les ${total} lectures sont prêtes : le son part tout de suite.</p>`
      : html`<p class="muted small">Préparation des lectures : ${c} / ${total} prêtes (≈ 2 s chacune, une seule fois). ${isReady(sentence().en, { voice: S.voiceId, speed: 1 }) ? "Celle-ci est prête." : "Celle-ci n'est pas encore prête."}</p>`;
  }

  // Doit être lancé directement par le clic : le navigateur n'autorise le son qu'après un geste.
  async function listen(speed) {
    if (ui.playing === speed) { stopVoice(); return; } // même bouton pendant la lecture : stop
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
    ui.playing = speed; draw();
    try { await playing; } catch (e) { ui.error = `La lecture a échoué (${e.message}).`; }
    if (ui.playing !== speed) return; // une autre lecture a pris le relais
    const st = lastStats();
    if (st && st.firstMs !== null) {
      ui.voiceInfo = `Dernière écoute : son lancé ${st.firstMs} ms après le clic · phrase préparée : ${st.prepared}`
        + ` · délai de la sortie audio : ${st.outMs} ms${st.freshAudio ? " · sortie audio ouverte à ce clic" : ""}`;
    }
    ui.playing = false; draw();
    warm();
  }

  // Prépare en arrière-plan, l'une après l'autre : la phrase affichée (normale puis lente), puis toutes
  // les autres (normales, puis lentes). Chaque phrase n'est fabriquée qu'une fois puis gardée sur l'appareil :
  // après ce premier passage (≈ 2 s par phrase), tout clic est immédiat, même d'une session à l'autre.
  // Se résout quand la phrase affichée est prête à vitesse normale.
  function warm() {
    if (ui.voice !== "ready") return Promise.resolve();
    const i = S.sentence % SENTENCES.length, voice = S.voiceId, n = SENTENCES.length;
    const others = Array.from({ length: n - 1 }, (_, k) => (i + 1 + k) % n);
    const queue = [[i, 1], [i, SLOW], ...others.map((k) => [k, 1]), ...others.map((k) => [k, SLOW])];
    const still = () => S.sentence % n === i && S.voiceId === voice && !ui.busy;
    const step = (p) => p.then(progress);
    const first = step(preload(SENTENCES[i].en, { voice, speed: 1 }));
    queue.slice(1).reduce((p, [k, speed]) => p.then(() => still() && step(preload(SENTENCES[k].en, { voice, speed }))), first);
    return first;
  }

  // Combien de phrases (normales et lentes) sont prêtes à être jouées tout de suite.
  function readyCount() {
    return SENTENCES.reduce((a, s) => a + isReady(s.en, { voice: S.voiceId, speed: 1 }) + isReady(s.en, { voice: S.voiceId, speed: SLOW }), 0);
  }
  let shownCount = -1;
  function progress() {
    const c = readyCount();
    if (c !== shownCount) { shownCount = c; draw(); }
  }

  // Voix déjà téléchargée sur cet appareil : on la recharge depuis le cache, puis on prépare la phrase.
  async function startVoice() {
    if (ui.voice !== "off") return;
    ui.voice = "loading"; draw();
    const t0 = performance.now();
    try {
      await prepareVoice();
      ui.voice = "ready";
      ui.voiceInfo = "Préparation de la phrase…";
      draw();
      await warm(); // « Voix prête » seulement quand la phrase affichée l'est vraiment
      if (ui.voiceInfo === "Préparation de la phrase…") ui.voiceInfo = `Voix prête en ${Math.round((performance.now() - t0) / 100) / 10} s`;
    } catch {
      ui.voice = "off"; // pas grave : elle sera retentée au premier clic sur « Écouter »
    }
    draw();
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
    if (S.voice) startVoice(); // l'un après l'autre : le démarrage reste fluide
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
    warm();
  }

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act || (ui.busy && act !== "stop")) return;
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

  // Premier geste sur la page : on ouvre la sortie audio tout de suite (le navigateur l'exige après un geste).
  document.addEventListener("pointerdown", () => { if (S.voice) unlockAudio(); }, { once: true });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.act !== "voice-pick") return;
    S.voiceId = VOICES.some((v) => v.id === e.target.value) ? e.target.value : "af_heart";
    persist(); warm();
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
  if (S.engine) startEngine(); // déjà téléchargé : on le recharge depuis le cache (puis la voix)
  else if (S.voice) startVoice();
}
