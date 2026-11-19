// Écran « Coffres » (#coffres, phase 6) : coffres gagnés en montant de niveau, et boîtes à butin achetées avec les pièces du jeu,
// probabilités affichées (exactement celles de js/core/game.js) et compteur de garantie.
// Le résultat est tiré et enregistré dès le toucher : l'animation ne fait que le montrer (rien de perdu si on recharge pendant).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { levelOf } from "../core/progress.js";
import { RARITY, RARITY_ORDER, describeOwned, avatarSvg, itemPreview } from "../content/avatar.js";
import { chestSvg, boxSvg } from "../content/chest-art.js";
import { reducedFx } from "./effects.js";
import { CHESTS, BOXES, PITY, PITY_ODDS, GOLD_EVERY, openChest, buyBox, wear } from "../core/game.js";

const SHAKE_MS = 900;

// « 0,2 % » : probabilité affichée telle qu'elle est tirée.
export const pct = (p) => `${(Math.round(p * 1000) / 10).toLocaleString("fr-FR")} %`;
// Lignes du tableau des probabilités d'une boîte, de la plus courante à la plus rare.
export const oddsRows = (odds) => RARITY_ORDER.filter((r) => Object.hasOwn(odds, r)).map((r) => [r, odds[r]]);
// Niveau où tombera le prochain coffre d'or.
export const nextGold = (level) => Math.ceil((level + 1) / GOLD_EVERY) * GOLD_EVERY;


export function mountChests(root, S) {
  const G = S.game, ui = { stage: null, msg: "", bad: false };
  let alive = true, timer = 0;
  const level = () => levelOf(S.progress.xp).level;

  function pic(id) {
    const d = describeOwned(id);
    if (!d) return "";
    return d.kind === "skin" ? avatarSvg({ ...G.avatar, species: d.sp, skin: d.sk }, { label: d.name }) : itemPreview(id);
  }

  function stageView(st) {
    const r = st.res, open = st.phase === "open", rar = r.rarity || "common";
    const art = st.kind === "chest" ? chestSvg(r.tier, open ? "open" : "shake") : boxSvg(r.box, open ? "" : "charging lvl-3");
    const d = r.item ? describeOwned(r.item) : null;
    return html`<section class="card reveal${open ? ` r-${rar}` : ""}" aria-live="polite">
      <div class="rv-fx" aria-hidden="true"><div class="rv-rays"></div></div>
      <div class="rv-art${open && st.kind === "box" ? " gone" : ""}">${art}</div>
      ${open ? html`<div class="loot">
        ${st.kind === "chest" ? html`<p class="loot-coins">+<b>${r.coins}</b> 🪙${r.bonus ? html` <span class="muted small">(dont ${r.bonus} : plus rien de nouveau dans cette rareté)</span>` : ""}</p>` : ""}
        ${d ? html`<div class="loot-item rar-${rar}"><span class="loot-prev">${pic(r.item)}</span>
          <b>${d.name}</b><span class="small rar-${rar}">${RARITY[rar]}${r.guaranteed ? " · garantie" : ""}</span>
          ${st.kind === "box" && r.dup ? html`<span class="small">Déjà à toi : changé en <b>+${r.coins} 🪙</b></span>` : html`<span class="small">Nouveau !</span>`}</div>` : ""}
        <p class="row start">
          ${d && !(st.kind === "box" && r.dup) ? html`<button class="btn soft" data-act="wear" data-id="${r.item}" type="button">Équiper</button>` : ""}
          <button class="btn" data-act="close" type="button">Continuer</button></p>
        ${ui.msg ? html`<p class="feedback${ui.bad ? " error" : ""}" role="status">${ui.msg}</p>` : ""}
      </div>` : html`<p class="muted">Ouverture…</p>`}
    </section>`;
  }

  function draw() {
    if (!alive) return;
    const lv = level(), n = G.chests.length, busy = !!ui.stage;
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Boutique</button></p>
      <section class="card"><h1 class="sentence">🎁 Coffres</h1>
        <p><b>${G.coins} 🪙</b> <span class="muted small">· niveau ${lv}</span></p></section>
      ${ui.stage ? stageView(ui.stage) : ""}
      ${!ui.msg || ui.stage ? "" : html`<p class="feedback${ui.bad ? " error" : ""}" role="status">${ui.msg}</p>`}

      <section class="card"><h2>Tes coffres</h2>
        ${n ? html`<div class="chest-row"><span class="chest-mini">${chestSvg(G.chests[0], busy ? "" : "idle")}</span>
            <div><p><b>${n} coffre${n > 1 ? "s" : ""} à ouvrir</b> <span class="muted small">· le prochain : ${CHESTS[G.chests[0]].name.toLowerCase()}</span></p>
              <button class="btn big" data-act="chest" type="button" ${busy ? "disabled" : ""}>Ouvrir</button></div></div>`
          : html`<p class="muted">Pas de coffre pour l'instant. Tu en gagnes un à chaque niveau ; coffre d'or au niveau ${nextGold(lv)}.</p>`}
        <p class="muted small">Coffre d'argent : ${CHESTS.silver.coins[0]} à ${CHESTS.silver.coins[1]} 🪙, et un objet ${pct(CHESTS.silver.item)} du temps.
          Coffre d'or (tous les ${GOLD_EVERY} niveaux) : ${CHESTS.gold.coins[0]} à ${CHESTS.gold.coins[1]} 🪙 et toujours un objet.</p>
      </section>

      <section class="card"><h2>Boîtes à butin</h2>
        <p class="muted small">Achetées avec les pièces du jeu seulement. Garantie : un objet légendaire ou mythique en ${PITY} boîtes au plus
          — encore <b>${PITY - G.pity}</b> boîte${PITY - G.pity > 1 ? "s" : ""} au plus. Un objet déjà à toi est changé en pièces.</p>
        <p class="small${G.pity === PITY - 1 ? " feedback" : " muted"}">${G.pity === PITY - 1 ? "Ta prochaine boîte est la boîte garantie, quelle qu'elle soit : " : "Boîte garantie (la 10e sans légendaire ni mythique), quelle qu'elle soit : "}
          ${oddsRows(PITY_ODDS).map(([r, p]) => `${RARITY[r]} ${pct(p)}`).join(" · ")} (à la place des probabilités ci-dessous).</p>
        <div class="box-grid">${Object.entries(BOXES).map(([id, B]) => html`<div class="${`box-card glow-${B.glow}`}">
          <span class="chest-mini">${boxSvg(id, busy ? "" : "idle")}</span><b>${B.name}</b>
          <table class="odds"><caption class="small muted">Probabilités</caption>
            ${oddsRows(B.odds).map(([r, p]) => html`<tr><th class="small rar-${r}" scope="row">${RARITY[r]}</th><td class="small">${pct(p)}</td></tr>`)}</table>
          ${G.coins >= B.price ? html`<button class="btn" data-act="box" data-id="${id}" type="button" ${busy ? "disabled" : ""}>Acheter · ${B.price} 🪙</button>`
            : html`<button class="btn" type="button" disabled>${B.price} 🪙 · il manque ${B.price - G.coins}</button>`}</div>`)}</div>
      </section>`);
  }

  function reveal(kind, res) {
    ui.msg = ""; ui.stage = { kind, res, phase: "shake" };
    draw();
    const show = () => { if (ui.stage) { ui.stage.phase = "open"; draw(); root.querySelector('[data-act="close"]')?.focus({ preventScroll: true }); } };
    if (reducedFx(S)) show(); else timer = setTimeout(show, SHAKE_MS);
    window.scrollTo(0, 0);
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const { act, id } = el.dataset;
    if (act === "home") return void (location.hash = "#boutique");
    if (act === "chest" && !ui.stage) { const r = openChest(G); if (r) { save(S); reveal("chest", r); } return; }
    if (act === "box" && !ui.stage) {
      const r = buyBox(G, id);
      if (r.ok) { save(S); reveal("box", r); } else { ui.msg = r.error === "coins" ? "Pas assez de pièces." : "Boîte inconnue."; ui.bad = true; draw(); }
      return;
    }
    if (act === "close") { clearTimeout(timer); ui.stage = null; ui.msg = ""; draw(); }
    if (act === "wear") {
      const r = wear(G, id, level()), d = describeOwned(id);
      if (r === "ok") save(S);
      ui.msg = r === "ok" ? `${d.name} : équipé ✓` : r === "level" ? "Cet animal se débloque à un niveau plus haut : la couleur t'attend." : "Impossible d'équiper cet objet.";
      ui.bad = r !== "ok"; draw();
    }
  });

  draw();
  return () => { alive = false; clearTimeout(timer); };
}
