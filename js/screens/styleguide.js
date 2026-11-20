// Page d'exemple du thème « aventure » (#style, phase 8, tâche 1) : chaque élément du style, pour le vérifier d'un coup
// (largeur de téléphone, thème clair ou sombre, effets réduits). Aucune donnée n'est lue ni enregistrée.
import { html, render } from "../core/dom.js";
import { RARITY, RARITY_ORDER } from "../content/avatar.js";
import { BOSSES, STATES, bossSvg, GRIMOIRE_COLORS, grimoireSvg } from "../content/bosses.js";
import { familyById } from "../content/verbs.js";

const COLORS = ["--bg", "--card", "--text", "--muted", "--gold", "--gold-fill", "--accent", "--violet", "--good", "--ok", "--bad", "--frame"];
const ICONS = { common: "🧢", rare: "🕶️", epic: "🪄", legendary: "👑", mythic: "🐉" };

export function mountStyle(root) {
  const ui = { picked: null, pct: 42, text: "", boss: "idle" };
  function draw() {
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Profil</button></p>
      <section class="card quest"><span class="quest-title">Page d'exemple</span>
        <h1 class="sentence">Le style <span class="disp">aventure</span></h1>
        <p class="muted">Tous les éléments du nouveau thème, au même endroit. Rien n'est enregistré ici.</p></section>

      <section class="card"><h2>Couleurs</h2>
        <div class="swatches">${COLORS.map((c) => html`<div class="swatch"><i class="sw sw-${c.slice(2)}"></i><code>${c}</code></div>`)}</div></section>

      <section class="card quest"><span class="quest-title">Quête du jour</span>
        <h2>Le « th » qui souffle</h2>
        <p>Récompense : <b>20 XP</b> et <b>5 🪙</b></p>
        <div class="bar" data-css="${`--p:${ui.pct}%`}"><i></i></div>
        <p class="muted small">${ui.pct} % de la quête</p>
        <p class="row start"><button class="btn small-btn soft" data-act="less" type="button">− 10 %</button><button class="btn small-btn soft" data-act="more" type="button">+ 10 %</button></p></section>

      <section class="card"><h2>Boutons</h2>
        <button class="btn big" type="button">▶ Partir à l'aventure</button>
        <p class="row start">
          <button class="btn" type="button">Principal</button>
          <button class="btn soft" type="button">Secondaire</button>
          <button class="btn red" type="button">Arrêter</button>
          <button class="btn ghost" type="button">Discret</button>
          <button class="btn" type="button" disabled>Bloqué</button></p>
        <div class="choices"><button class="btn choice right" type="button"><b>ship</b><span class="small">bateau</span></button>
          <button class="btn choice wrong" type="button"><b>sheep</b><span class="small">mouton</span></button></div></section>

      <section class="card"><h2>Puces</h2>
        <p class="kind">${["20 XP", "50 XP", "100 XP"].map((g, i) => html`<button class="chip${ui.picked === i ? " on" : ""}" data-act="pick" data-i="${i}" type="button" aria-pressed="${ui.picked === i ? "true" : "false"}">${g}</button>`)}</p></section>

      <section class="card"><h2>Barres</h2>
        <p class="small">Niveau 4 · 120 / 300 XP</p><progress max="300" value="120"></progress>
        <p class="small">Série</p><div class="bar violet" data-css="--p:70%"><i></i></div>
        <p class="small">Réussite</p><div class="bar good" data-css="--p:90%"><i></i></div></section>

      <section class="card"><h2>Inventaire</h2>
        <div class="slots-demo">${RARITY_ORDER.map((r) => html`<figure><span class="slot rar-${r}" aria-hidden="true">${ICONS[r]}</span><figcaption class="rar-${r}">${RARITY[r]}</figcaption></figure>`)}</div></section>

      <section class="card"><h2>Boss du parcours</h2>
        <p class="kind">${STATES.map((s) => html`<button class="chip${ui.boss === s ? " on" : ""}" data-act="boss" data-v="${s}" type="button" aria-pressed="${ui.boss === s ? "true" : "false"}">${{ idle: "Au repos", hit: "Touché", ko: "K.O." }[s]}</button>`)}</p>
        <div class="boss-gallery">${Object.entries(BOSSES).map(([id, b]) => html`<figure><span class="boss-pic">${bossSvg(id, ui.boss)}</span><figcaption>${b.name}</figcaption></figure>`)}</div>
        <h3>Le Grimoire, mini-boss des verbes irréguliers</h3>
        <div class="boss-gallery">${Object.keys(GRIMOIRE_COLORS).map((id) => html`<figure><span class="boss-pic">${grimoireSvg(id, ui.boss)}</span><figcaption>${familyById(id).title}</figcaption></figure>`)}</div></section>

      <section class="card"><h2>Note et messages</h2>
        <p class="score score-good">92 <span>/ 100</span></p>
        <p class="feedback">Bravo ! +10 XP</p>
        <p class="feedback error" role="status">Je n'ai rien entendu : rapproche-toi du micro.</p>
        <label class="field">Champ de saisie<input id="style-input" type="text" autocomplete="off" placeholder="Écris ici" value="${ui.text}"></label></section>`);
  }
  root.addEventListener("input", (e) => { if (e.target.id === "style-input") ui.text = e.target.value; });
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "home") location.hash = "#profil";
    if (act === "pick") { ui.picked = Number(el.dataset.i); draw(); }
    if (act === "boss" && STATES.includes(el.dataset.v)) { ui.boss = el.dataset.v; draw(); }
    if (act === "more") { ui.pct = Math.min(100, ui.pct + 10); draw(); }
    if (act === "less") { ui.pct = Math.max(0, ui.pct - 10); draw(); }
  });
  draw();
  return () => {};
}
