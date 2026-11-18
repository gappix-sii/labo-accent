// Onglet « Profil » (#profil, phase 8, tâche 2) : ton bilan, et l'accès aux réglages, au transfert, au banc de test et au style.
import { html, render } from "../core/dom.js";
import { levelOf, streakNow } from "../core/progress.js";
import { avatarSvg } from "../content/avatar.js";

const GO = { settings: "#reglages", transfer: "#transfert", bench: "#banc", style: "#style", companion: "#compagnon", chests: "#coffres" };

export function mountProfile(root, S) {
  const P = S.progress, lv = levelOf(P.xp), streak = streakNow(P, Date.now());
  const lessons = Object.values(P.lessons).filter((l) => l.done > 0).length, words = Object.keys(S.srs.cards).length;
  render(root, html`
    <section class="card quest profile-hero"><span class="quest-title">Profil</span>
      <button class="profile-av" data-act="companion" type="button" aria-label="Voir mon compagnon">${avatarSvg(S.game.avatar)}</button>
      <div><h1 class="sentence">${S.game.avatar.name}</h1>
        <p>Niveau <b>${lv.level}</b> · ${P.xp} XP en tout</p>
        <div class="bar" data-css="${`--p:${Math.round((lv.into / lv.need) * 100)}%`}"><i></i></div>
        <p class="muted small">${lv.into} / ${lv.need} XP vers le niveau ${lv.level + 1}</p></div></section>
    <section class="card"><h2>Ton aventure</h2>
      <div class="profile-stats">
        <p><b>🔥 ${streak}</b><span class="small muted">jour${streak > 1 ? "s" : ""} de série</span></p>
        <p><b>📜 ${lessons}</b><span class="small muted">leçon${lessons > 1 ? "s" : ""} finie${lessons > 1 ? "s" : ""}</span></p>
        <p><b>📚 ${words}</b><span class="small muted">mot${words > 1 ? "s" : ""} vu${words > 1 ? "s" : ""}</span></p>
        <p><b>🪙 ${S.game.coins}</b><span class="small muted">pièces</span></p></div></section>
    <section class="card"><h2>Options</h2>
      <div class="choices">
        <button class="btn choice" data-act="settings" type="button"><b>⚙️ Réglages</b><span class="small">clé Gemini, voix, effets</span></button>
        <button class="btn choice" data-act="transfer" type="button"><b>📲 Transfert</b><span class="small">vers un autre appareil</span></button>
        <button class="btn choice" data-act="chests" type="button"><b>🎁 Coffres</b><span class="small">${S.game.chests.length ? `${S.game.chests.length} à ouvrir` : "et boîtes à butin"}</span></button>
        <button class="btn choice" data-act="bench" type="button"><b>🧪 Banc de test</b><span class="small">essais du moteur</span></button>
        <button class="btn choice" data-act="style" type="button"><b>🎨 Style</b><span class="small">page d'exemple</span></button>
      </div></section>`);
  root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && Object.hasOwn(GO, el.dataset.act)) location.hash = GO[el.dataset.act]; });
  return () => {};
}
