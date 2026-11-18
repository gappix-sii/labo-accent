// Barre du haut et onglets du bas (phase 8, tâche 2) : autour de tous les écrans.
// En haut : ton compagnon dans l'anneau de son niveau, ta série, tes pièces, tes coffres (qui s'agitent s'il y en a à ouvrir).
// En bas : 5 onglets — Parcours, Entraînement, Compagnon, Boutique, Profil — cachés pendant un exercice.
// Redessinée à chaque changement d'écran et après chaque enregistrement (pièces, XP gagnés…).
import { html, render } from "../core/dom.js";
import { onSaved } from "../core/store.js";
import { levelOf, streakNow } from "../core/progress.js";
import { avatarSvg } from "../content/avatar.js";

export const TABS = [
  ["path", "#accueil", "🗺️", "Parcours"],
  ["training", "#entrainement", "⚔️", "Défis"], // « Entraînement » ne tient pas sous l'icône sur un téléphone
  ["companion", "#compagnon", "🐾", "Compagnon"],
  ["shop", "#boutique", "🛒", "Boutique"],
  ["profile", "#profil", "👤", "Profil"]
];
// Onglet allumé pour chaque écran (les écrans d'un onglet en dépendent).
const TAB_OF = {
  home: "path", lesson: "path",
  training: "training", vocab: "training", listening: "training", grammarList: "training", grammar: "training", mistakes: "training", roleList: "training", role: "training", roleFree: "training", chat: "training",
  companion: "companion", shop: "shop", chests: "shop",
  profile: "profile", settings: "profile", transfer: "profile", bench: "profile", style: "profile"
};
export const tabFor = (screen) => TAB_OF[screen] || "path";
// Pendant un exercice, les onglets se cachent : on reste concentré (on sort par le bouton « ← » de l'écran).
const EXERCISES = new Set(["lesson", "vocab", "listening", "grammar", "mistakes", "role", "roleFree", "chat", "bench"]);
export const inExercise = (screen) => EXERCISES.has(screen);

// Chiffres de la barre du haut (fonction pure, testée).
export function hudData(S, now = Date.now()) {
  const lv = levelOf(S.progress.xp);
  return { level: lv.level, pct: Math.round((lv.into / lv.need) * 100), streak: streakNow(S.progress, now), coins: S.game.coins, chests: S.game.chests.length, avatar: S.game.avatar };
}

export function mountShell(S, hud, tabs) {
  let screen = "home";
  function draw() {
    const d = hudData(S), tab = tabFor(screen), hide = inExercise(screen);
    render(hud, html`<div class="hud-in">
      <a class="me" href="#compagnon" data-css="${`--p:${d.pct}%`}" aria-label="${`${d.avatar.name}, niveau ${d.level} (${d.pct} % vers le niveau suivant) : voir mon compagnon`}">
        <span class="me-av">${avatarSvg(d.avatar, { label: "" })}</span><b class="me-lv" aria-hidden="true">${d.level}</b></a>
      <span class="brand" aria-hidden="true"><b>Labo</b> d'accent</span>
      <span class="hud-stats">
        <span class="hud-stat flame${d.streak ? "" : " off"}" title="Série de jours">🔥 <b>${d.streak}</b><span class="sr"> jour${d.streak > 1 ? "s" : ""} de série</span></span>
        <a class="hud-stat coins" href="#boutique" title="Pièces">🪙 <b>${d.coins}</b><span class="sr"> pièces : boutique</span></a>
        ${d.chests ? html`<a class="hud-stat chest" href="#coffres" title="Coffres à ouvrir">🎁 <b>${d.chests}</b><span class="sr"> coffre${d.chests > 1 ? "s" : ""} à ouvrir</span></a>` : ""}
      </span></div>`);
    // Boutons (pas de liens) : le modèle html`` refuse une adresse interpolée dans href, par sécurité.
    render(tabs, html`${TABS.map(([id, , icon, label]) => html`<button class="tab${id === tab ? " on" : ""}" data-act="tab" data-v="${id}" type="button" aria-current="${id === tab ? "page" : "false"}"><span class="tab-ico" aria-hidden="true">${icon}</span><span>${label}</span></button>`)}`);
    tabs.hidden = hide;
    document.body.classList.toggle("in-exercise", hide);
  }
  tabs.addEventListener("click", (e) => {
    const el = e.target.closest('[data-act="tab"]'), t = el && TABS.find(([id]) => id === el.dataset.v);
    if (t) location.hash = t[1];
  });
  onSaved(() => draw());
  return { show(s) { screen = s; draw(); }, draw };
}
