// Boutons « Écouter » / « Lentement » et choix de la voix, partagés par la leçon et le banc de test.
// Les sons sont fabriqués à l'avance et livrés avec l'appli (js/engine/clips.js) : le clic part tout de suite.
import { html } from "../core/dom.js";
import { say, preload, stopVoice, lastStats, VOICES } from "../engine/clips.js";

export const SLOW = 0.7;

// text() : la phrase affichée en ce moment.
export function listenControls({ S, persist, draw, text }) {
  const ui = { playing: false, info: "", error: "" };

  // Lancé directement par le clic : le navigateur n'autorise le son qu'après un geste.
  async function listen(speed) {
    if (ui.playing === speed) { stopVoice(); return; } // même bouton pendant la lecture : stop
    ui.error = "";
    const playing = say(text(), { voice: S.voiceId, speed });
    ui.playing = speed; draw();
    try { await playing; } catch (e) { ui.error = `La lecture a échoué (${e.message}).`; }
    if (ui.playing !== speed) return; // une autre lecture a pris le relais
    const st = lastStats();
    if (st && st.firstMs !== null) ui.info = `Son lancé ${st.firstMs} ms après le clic`;
    ui.playing = false; draw();
  }

  // Charge à l'avance le son de la phrase affichée (quelques Ko).
  const warm = () => { preload(text(), { voice: S.voiceId }).catch(() => {}); };

  function block() {
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
      ${ui.error ? html`<p class="small error" role="alert">${ui.error}</p>` : ""}
      ${ui.info ? html`<p class="muted small">${ui.info}</p>` : ""}
    </div>`;
  }

  function handle(act) {
    if (act === "listen") { listen(1); return true; }
    if (act === "slow") { listen(SLOW); return true; }
    return false;
  }

  function change(e) {
    if (e.target.dataset.act !== "voice-pick") return false;
    S.voiceId = VOICES.some((v) => v.id === e.target.value) ? e.target.value : "af_heart";
    persist(); warm();
    return true;
  }

  return { block, handle, change, warm, stop: stopVoice };
}
