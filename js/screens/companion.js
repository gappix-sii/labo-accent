// Écran « Compagnon » (#compagnon, phase 6) : ton compagnon en grand, son nom, l'animal (débloqué selon le niveau),
// la couleur (celles que tu as) et un accessoire par emplacement (ceux que tu as). Règles : js/core/game.js.
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { levelOf } from "../core/progress.js";
import { SPECIES, SPECIES_BY_ID, ITEMS, SLOTS, RARITY, avatarSvg, itemPreview, ownsSkin } from "../content/avatar.js";
import { setSpecies, setSkin, equip, rename, speciesOpen, owns, NAME_MAX } from "../core/game.js";

export function mountCompanion(root, S) {
  const G = S.game, ui = { msg: "" };
  const level = () => levelOf(S.progress.xp).level;

  function draw() {
    const av = G.avatar, lv = level(), sp = SPECIES_BY_ID[av.species] || SPECIES[0];
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Accueil</button>
        <button class="btn ghost" data-act="shop" type="button">🛒 Boutique</button></p>
      <section class="card comp-hero">
        <div class="comp-big">${avatarSvg(av)}</div>
        <div><h1 class="sentence">${av.name}</h1>
          <p class="muted small">${sp.name} · ${sp.desc}</p>
          <label class="field">Nom (${NAME_MAX} lettres au plus)
            <input id="comp-name" type="text" maxlength="${NAME_MAX}" autocomplete="off" value="${av.name}"></label>
          <button class="btn soft" data-act="rename" type="button">Renommer</button>
          ${ui.msg ? html`<p class="feedback" role="status">${ui.msg}</p>` : ""}</div>
      </section>

      <section class="card"><h2>Animal</h2>
        <div class="comp-grid">${SPECIES.map((s) => {
          const open = speciesOpen(s.id, lv), on = s.id === av.species;
          return html`<button class="comp-pick${on ? " on" : ""}" data-act="species" data-id="${s.id}" type="button" aria-pressed="${on ? "true" : "false"}" ${open ? "" : "disabled"}>
            <span class="comp-mini">${avatarSvg({ ...av, species: s.id, skin: s.skins[0].id }, { label: s.name })}</span>
            <span class="small">${s.name}</span><span class="muted small">${open ? "" : `🔒 niveau ${s.lvl}`}</span></button>`;
        })}</div>
      </section>

      <section class="card"><h2>Couleur</h2>
        <div class="comp-grid">${sp.skins.map((k) => {
          const mine = ownsSkin(G.owned, sp.id, k.id), on = k.id === av.skin;
          return html`<button class="${`comp-pick glow-${k.rarity}${on ? " on" : ""}`}" data-act="skin" data-id="${k.id}" type="button" aria-pressed="${on ? "true" : "false"}" ${mine ? "" : "disabled"}>
            <span class="comp-mini">${avatarSvg({ ...av, skin: k.id }, { label: `${sp.name} ${k.name}` })}</span>
            <span class="small">${k.name}</span><span class="muted small">${mine ? RARITY[k.rarity] : k.box ? "🔒 boîtes à butin" : "🔒 boutique ou coffres"}</span></button>`;
        })}</div>
      </section>

      ${SLOTS.map(([slot, label]) => {
        const mine = ITEMS.filter((i) => i.slot === slot && owns(G, i.id));
        return html`<section class="card"><h2>${label}</h2>
          <div class="comp-grid">
            <button class="comp-pick${av[slot] ? "" : " on"}" data-act="equip" data-slot="${slot}" data-id="" type="button" aria-pressed="${av[slot] ? "false" : "true"}">
              <span class="comp-mini comp-none">∅</span><span class="small">Rien</span></button>
            ${mine.map((i) => { const on = av[slot] === i.id;
              return html`<button class="${`comp-pick glow-${i.rarity}${on ? " on" : ""}`}" data-act="equip" data-slot="${slot}" data-id="${i.id}" type="button" aria-pressed="${on ? "true" : "false"}">
                <span class="comp-mini">${itemPreview(i.id)}</span><span class="small">${i.name}</span><span class="muted small">${RARITY[i.rarity]}</span></button>`; })}
          </div>
          ${mine.length ? "" : html`<p class="muted small">Aucun accessoire ici pour l'instant : gagne-en dans les coffres ou à la boutique.</p>`}
        </section>`;
      })}`);
  }

  const done = (ok) => { if (ok) { ui.msg = ""; save(S); draw(); } };
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const { act, id, slot } = el.dataset;
    if (act === "home") location.hash = "#accueil";
    if (act === "shop") location.hash = "#boutique";
    if (act === "species") done(id !== G.avatar.species && setSpecies(G, id, level()));
    if (act === "skin") done(setSkin(G, id));
    if (act === "equip") done(equip(G, id, slot));
    if (act === "rename") {
      const input = root.querySelector("#comp-name");
      if (rename(G, input ? input.value : "")) { save(S); ui.msg = "Nom enregistré ✓"; } else ui.msg = "Choisis un nom d'au moins une lettre.";
      draw();
    }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "comp-name") root.querySelector('[data-act="rename"]').click(); });

  draw();
  return () => {};
}
