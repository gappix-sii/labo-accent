// Écran « Réglages » (#reglages, phase 5) : clé Gemini pour la conversation libre, avec ce qui part chez Google.
// La clé reste sur cet appareil (js/core/keys.js) ; « Tester la clé » demande à Google la fiche du modèle (js/engine/gemini.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { LIVE_VOICES, liveVoiceOk, SAMPLE_TEXT } from "../core/chat.js";
import { sayOnce } from "../engine/live.js";
import { Player } from "../engine/live-audio.js";
import { loadKey, saveKey, clearKey, maskKey } from "../core/keys.js";
import { checkKey, errorText, MODELS } from "../engine/gemini.js";
import { FX_MODES, fxModeOk, applyFx } from "./effects.js";

export function mountSettings(root, S) {
  const ui = { msg: "", bad: false, busy: false, hearing: null, voiceMsg: "" };
  const player = new Player();
  let alive = true;

  let keepDraft = true; // false juste après « Enregistrer » ou « Effacer » : le champ repart vide
  function draw() {
    if (!alive) return;
    const key = loadKey(), draft = keepDraft ? root.querySelector("#key-input")?.value || "" : "";
    keepDraft = true;
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Profil</button></p>
      <section class="card quest"><span class="quest-title">Profil</span><h1 class="sentence">⚙️ Réglages</h1>
        <p class="muted small">La conversation libre utilise Gemini, l'IA de Google, avec ta propre clé (gratuite).</p></section>

      <section class="card">
        <h2>📲 Transfert vers un autre appareil</h2>
        <p class="muted small">Retrouve ta progression sur ton téléphone (ou ton PC) grâce à un QR code ou un lien.</p>
        <button class="btn soft" data-act="transfer" type="button">Ouvrir le transfert</button>
      </section>

      <section class="card">
        <h2>✨ Effets de jeu</h2>
        <p class="muted small">« NIVEAU n ! » avec confettis, « +XP » qui s'envole, coffres qui tremblent. « Effets réduits » les remplace par de simples messages, sans mouvement.</p>
        <p class="kind shop-cats">${FX_MODES.map(([id, label]) => html`<button class="chip${S.fx === id ? " on" : ""}" data-act="fx" data-v="${id}" type="button" aria-pressed="${S.fx === id ? "true" : "false"}">${label}</button>`)}</p>
      </section>

      <section class="card">
        <h2>🔑 Clé Gemini</h2>
        <p>${key ? html`Clé enregistrée sur cet appareil : <b>${maskKey(key)}</b>` : "Aucune clé enregistrée."}</p>
        <label class="field">${key ? "Remplacer par une autre clé" : "Colle ta clé ici"}
          <input id="key-input" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" inputmode="text" maxlength="200" ${ui.busy ? "disabled" : ""}></label>
        <div class="row start">
          <button class="btn" data-act="save" type="button" ${ui.busy ? "disabled" : ""}>Enregistrer</button>
          ${key ? html`<button class="btn soft" data-act="test" type="button" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Test en cours…" : "Tester la clé"}</button>
            <button class="btn ghost" data-act="clear" type="button" ${ui.busy ? "disabled" : ""}>Effacer la clé</button>` : ""}
        </div>
        ${ui.msg ? html`<p class="feedback${ui.bad ? " error" : ""}" role="status">${ui.msg}</p>` : ""}
      </section>

      <section class="card">
        <h2>Obtenir ta clé (5 minutes, gratuit)</h2>
        <ol class="steps">
          <li>Ouvre <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a> et connecte-toi avec ton compte Google.</li>
          <li>Clique sur <b>Create API key</b> (créer une clé).</li>
          <li>À côté de la clé, clique sur <b>Add restrictions</b>, puis <b>Restrict to Gemini API only</b> : la clé ne servira qu'à Gemini.</li>
          <li>Copie la clé, colle-la ci-dessus, puis <b>Enregistrer</b> et <b>Tester la clé</b>.</li>
        </ol>
        <p class="muted small">Pour aller plus loin (facultatif) : dans la console Google Cloud, page « Identifiants », tu peux aussi limiter la clé
          aux sites <code>https://gappix-sii.github.io/*</code> et <code>http://localhost:8000/*</code>. Si « Tester la clé » échoue ensuite, retire cette limite.</p>
        <p class="muted small">Ton quota gratuit (nombre de demandes par minute et par jour) :
          <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noopener noreferrer">aistudio.google.com/rate-limit</a>.
          Modèle utilisé : <code>${MODELS.live}</code> (conversation en direct, avec sa voix).</p>
      </section>

      <section class="card">
        <h2>🗣 Voix de la conversation</h2>
        <p class="muted small">Voix de Gemini pour la conversation libre. Touche ▶ pour l'écouter, puis choisis-la.${key ? "" : " (Il faut d'abord une clé pour écouter.)"}</p>
        ${ui.voiceMsg ? html`<p class="feedback error" role="status">${ui.voiceMsg}</p>` : ""}
        <ul class="voices">${LIVE_VOICES.map((v) => html`<li>
          <button class="chip${v.id === S.liveVoice ? " on" : ""}" data-act="voice" data-v="${v.id}" type="button" aria-pressed="${v.id === S.liveVoice ? "true" : "false"}">${v.id === S.liveVoice ? "✓ " : ""}${v.id} <span class="muted small">· ${v.style}</span></button>
          <button class="btn soft small-btn" data-act="hear" data-v="${v.id}" type="button" aria-label="${`Écouter ${v.id}`}" ${key && !ui.hearing ? "" : "disabled"}>${ui.hearing === v.id ? "…" : "▶"}</button></li>`)}</ul>
      </section>

      <section class="card">
        <h2>⚠️ Ce qui part chez Google</h2>
        <ul class="steps">
          <li>Seulement pendant la conversation libre : ce que tu dis (l'enregistrement de ta voix) ou ce que tu tapes, et le fil de la conversation.</li>
          <li>Avec une clé gratuite, Google indique que ces échanges servent à <b>améliorer ses produits</b> (ils peuvent être lus par des personnes). Ne donne pas d'informations personnelles (nom complet, adresse, santé, travail…).</li>
          <li>Tout le reste (leçons, notes, progression) ne quitte jamais ton appareil.</li>
          <li>La clé reste dans ce navigateur, à part de ta progression. Quelqu'un qui utilise ce navigateur peut s'en servir : efface-la sur un appareil partagé.</li>
          <li>En ligne, l'appli est sur <code>gappix-sii.github.io</code> : toute autre page publiée à cette même adresse (un autre de tes dépôts GitHub Pages) pourrait lire la clé. N'y publie que des pages de confiance, et garde la clé limitée à Gemini.</li>
        </ul>
      </section>`);
    if (draft) { const inp = root.querySelector("#key-input"); if (inp) inp.value = draft; }
  }

  async function test() {
    ui.busy = true; ui.msg = ""; draw();
    const r = await checkKey(loadKey());
    if (!alive) return;
    ui.busy = false;
    ui.bad = !r.ok;
    ui.msg = r.ok ? `✓ Clé acceptée par Google (${r.name}).` : errorText(r.error);
    draw();
  }

  function saveInput() {
    const input = root.querySelector("#key-input");
    keepDraft = false;
    const res = saveKey(input ? input.value : "");
    ui.bad = res !== "ok";
    ui.msg = res === "ok" ? "Clé enregistrée sur cet appareil. Tu peux la tester."
      : res === "bad" ? "Ce texte n'a pas la forme d'une clé (lettres et chiffres, sans espace, au moins 30 caractères)."
      : "Impossible d'enregistrer la clé : le stockage du navigateur est bloqué ou plein (navigation privée ?).";
    draw();
  }

  let sample = null;
  async function hear(v) {
    ui.hearing = v; ui.voiceMsg = ""; draw();
    player.unlock(); // le son doit être autorisé par le clic
    sample = sayOnce({ key: loadKey(), voice: v, text: SAMPLE_TEXT, play: (b64) => player.play(b64) });
    const r = await sample; sample = null;
    if (!alive) return;
    ui.hearing = null; ui.voiceMsg = r.ok ? "" : errorText(r.error);
    draw();
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || ui.busy) return;
    const act = el.dataset.act;
    if (act === "voice" && liveVoiceOk(el.dataset.v)) { S.liveVoice = el.dataset.v; save(S); draw(); }
    if (act === "hear" && liveVoiceOk(el.dataset.v) && !ui.hearing && loadKey()) hear(el.dataset.v);
    if (act === "fx" && fxModeOk(el.dataset.v)) { S.fx = el.dataset.v; applyFx(S); save(S); draw(); }
    if (act === "home") location.hash = "#profil";
    if (act === "transfer") location.hash = "#transfert";
    if (act === "save") saveInput();
    if (act === "test") test();
    if (act === "clear") { keepDraft = false; clearKey(); ui.bad = false; ui.msg = "Clé effacée de cet appareil."; draw(); }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "key-input" && !ui.busy) saveInput(); });

  draw();
  return () => { alive = false; if (sample) sample.cancel(); player.close(); };
}
