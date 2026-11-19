// Bloc « micro + note », partagé par l'écran de leçon et le banc de test : moteur à préparer,
// enregistrement, analyse, puis résultat son par son. L'écran qui l'utilise garde la main sur
// l'affichage (draw) et reçoit chaque note par onScored.
import { html, $ } from "../core/dom.js";
import { summarize } from "../core/store.js";
import { Recorder } from "../engine/recorder.js";
import { prepare, score, onEngine, MODEL_MB } from "../engine/engine.js";
import { FR_HINT } from "../engine/phonemes.js";
import { stopVoice } from "../engine/clips.js";
import { avatarSvg } from "../content/avatar.js";

const LEVEL_FR = { good: "bien", ok: "presque", bad: "à revoir", skip: "non noté" };
const STATUS_FR = { good: "bien", ok: "presque", bad: "à revoir" };

// opts : { S, persist, draw, root, target: () => ({ text, focus }), onScored(result, res), speakLabel }
export function practice({ S, persist, draw, root, target, onScored, speakLabel = "🎤 Parler" }) {
  const ui = { engine: S.engine ? "loading" : "off", progress: null, busy: "", error: "", info: "" };
  let rec = null, starting = false, alive = true;

  async function startEngine() {
    ui.engine = "loading"; ui.error = ""; draw();
    try {
      const r = await prepare();
      ui.engine = "ready";
      ui.info = `Moteur prêt en ${Math.round(r.ms / 100) / 10} s`;
      S.engine = true; persist();
    } catch (e) {
      ui.engine = "off";
      ui.error = `Le moteur n'a pas pu se charger (${e.message}). Vérifie ta connexion puis réessaie.`;
    }
    if (alive) draw();
  }

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
    if (!alive) { r.stop(); return; } // écran quitté pendant l'ouverture du micro
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
        const { text, focus } = target();
        const res = await score(text, out.pcm.samples, { focus });
        ui.info = `Analyse en ${Math.round(res.ms / 100) / 10} s`;
        if (alive) onScored(summarize(text, res), res);
      }
    } catch (e) {
      ui.error = `L'analyse a échoué (${e.message}).`;
    }
    ui.busy = "";
    if (alive) draw();
  }

  let lastDraw = 0; // la progression arrive très souvent : on redessine au plus 4 fois par seconde
  const off = onEngine((ev) => {
    if (ev.type !== "progress" || ui.engine !== "loading") return;
    ui.progress = ev;
    if (performance.now() - lastDraw > 250) { lastDraw = performance.now(); draw(); }
  });

  function block(extra = "") {
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
        <div class="mic-zone"><button class="btn red big mic rec" data-act="stop" type="button"><span class="mic-ico" aria-hidden="true">⏹</span> Arrêter</button></div>
        <meter id="level" min="0" max="1" value="0" aria-label="Volume de ta voix"></meter>`;
    }
    if (ui.busy === "analyze") return html`<p class="analyzing"><span class="spin" aria-hidden="true">✦</span> Analyse en cours…</p>`;
    return html`${extra}<div class="mic-zone"><button class="btn big mic" data-act="speak" type="button">${speakLabel}</button></div>
      ${ui.info ? html`<p class="muted small">${ui.info}</p>` : ""}`;
  }

  const errorBlock = () => (ui.error ? html`<p class="card error" role="alert">${ui.error}</p>` : "");

  // Renvoie true si le clic a été traité ici.
  function handle(act) {
    if (act === "prepare") { startEngine(); return true; }
    if (act === "speak") { speak(); return true; }
    if (act === "stop") { finish(); return true; }
    return false;
  }

  // Déjà téléchargé : on le recharge depuis le cache. Lancé juste après la construction de l'écran,
  // pas pendant : startEngine redessine, et l'écran n'a pas encore fini de se monter.
  if (S.engine) queueMicrotask(startEngine);

  return {
    block, errorBlock, handle,
    busy: () => !!ui.busy || starting,
    clearError: () => { ui.error = ""; },
    dispose: () => { alive = false; off(); if (rec) { rec.stop(); rec = null; } }
  };
}

// Barre d'avancement d'un exercice (phase 8, tâche 4) : `done` éléments finis sur `total`, en barre dorée qui se remplit
// (vide au 1er élément, pleine une fois le dernier fini). Le banc de test, lui, montre la phrase en cours.
export function progressBar(done, total, label = "Avancement") {
  const t = Math.max(1, total), d = Math.max(0, Math.min(done, t)), pct = Math.round((d / t) * 100);
  return html`<div class="bar ex-bar" data-css="${`--p:${pct}%`}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${d}"><i></i></div>`;
}

// Réaction du compagnon à une note : content à 85, triste sous 55.
export function mood(score) {
  if (score >= 85) return { cls: "happy", text: "Bravo, c'était super !" };
  if (score >= 55) return { cls: "", text: "Pas mal ! Encore un essai ?" };
  return { cls: "sad", text: "Pas grave, on réessaie ensemble ?" };
}

// Résultat son par son (dernière analyse), avec la réaction de ton compagnon s'il est donné.
export function resultBlock(r, avatar = null) {
  const m = mood(r.score);
  return html`
    <div class="score-row"><p class="score score-${r.score >= 85 ? "good" : r.score >= 55 ? "ok" : "bad"}">${r.score} <span>/ 100</span></p>
      ${avatar ? html`<span class="mood"><span class="mood-av">${avatarSvg(avatar, { cls: m.cls, label: `${avatar.name} : ${m.text}` })}</span><span class="small">${m.text}</span></span>` : ""}</div>
    <div class="words" lang="en">${r.words.map((w) => html`
      <div class="word lv-${w.level}">
        <b>${w.display}</b>
        <span class="small">${w.score === null ? LEVEL_FR.skip : `${w.score} · ${LEVEL_FR[w.level]}`}</span>
        <span class="phones">${w.phones.map((ph) => html`<i class="ph st-${ph.status}" title="${`${ph.p} : ${FR_HINT[ph.p] || ""} — ${STATUS_FR[ph.status]}${ph.heard && ph.heard !== ph.p ? `, entendu « ${ph.heard} »` : ""}`}">${ph.p}</i>`)}</span>
      </div>`)}</div>
    ${r.tips.length ? html`<h2>Conseils</h2><ul class="tips">${r.tips.map((t) => html`<li><b lang="en">${t.word}</b> · ${t.text}</li>`)}</ul>` : html`<p>Aucun son à revoir. Bravo !</p>`}
    <p class="muted small">Entendu : <span lang="en">${r.heard || "rien"}</span></p>`;
}
