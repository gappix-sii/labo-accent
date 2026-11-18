// Écran « Boutique » (#boutique, phase 6) : offres du jour en tête, puis objets par catégorie avec prix et niveau requis.
// « Essayer » montre l'objet sur ton compagnon sans rien acheter ; « Acheter » paie une seule fois (règles : js/core/game.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { levelOf } from "../core/progress.js";
import { SLOTS, RARITY, CATALOG, describeOwned, basePrice, levelFor, avatarSvg, itemPreview } from "../content/avatar.js";
import { deals, priceOf, buy, owns, wear, noteDealDay, sameDay } from "../core/game.js";

export const CATEGORIES = [...SLOTS, ["skin", "Couleurs"]];

// Catégorie d'un objet du catalogue : son emplacement, ou « skin » pour une couleur.
export const categoryOf = (id) => { const d = describeOwned(id); return d ? (d.kind === "skin" ? "skin" : d.slot) : null; };

// Compagnon tel qu'il serait avec l'objet essayé (une couleur change aussi l'animal).
export function tryOn(av, id) {
  const d = describeOwned(id);
  if (!d) return av;
  return d.kind === "skin" ? { ...av, species: d.sp, skin: d.sk } : { ...av, [d.slot]: id };
}

const ERRORS = { coins: "Pas assez de pièces.", level: "Niveau trop bas pour cet objet.", owned: "Tu l'as déjà.", unknown: "Cet objet ne s'achète pas." };

export function mountShop(root, S) {
  const G = S.game, ui = { cat: "head", trying: "", msg: "", bad: false, bought: "", shownAt: Date.now() };
  const level = () => levelOf(S.progress.xp).level;

  function card(id, lv, now, todays) {
    const d = describeOwned(id), base = basePrice(id), price = priceOf(G, id, lv, now), need = levelFor(id);
    const mine = owns(G, id), deal = todays.includes(id), tooLow = need > lv, short = price - G.coins;
    const pic = d.kind === "skin" ? avatarSvg(tryOn({ ...G.avatar, head: "", eyes: "", neck: "", hand: "", back: "", aura: "" }, id), { label: d.name }) : itemPreview(id);
    return html`<li class="${`shop-item glow-${d.rarity}${ui.trying === id ? " on" : ""}${deal ? " deal" : ""}`}">
      <span class="comp-mini">${pic}</span>
      <b class="small">${d.name}</b>
      <span class="muted small rar-${d.rarity}">${RARITY[d.rarity]}${need > 1 ? ` · niveau ${need}` : ""}</span>
      ${mine ? html`<span class="small">✓ À toi</span>` : html`<span class="small">${deal ? html`<s class="muted">${base}</s> ` : ""}<b>${price} 🪙</b></span>`}
      <span class="row">
        <button class="btn ghost small-btn" data-act="try" data-id="${id}" type="button" aria-pressed="${ui.trying === id ? "true" : "false"}">${ui.trying === id ? "Retirer" : "Essayer"}</button>
        ${mine ? html`<button class="btn soft small-btn" data-act="wear" data-id="${id}" type="button">Équiper</button>`
          : tooLow ? html`<button class="btn small-btn" type="button" disabled>🔒 niveau ${need}</button>`
          : short > 0 ? html`<button class="btn small-btn" type="button" disabled>Il manque ${short} 🪙</button>`
          : html`<button class="btn small-btn" data-act="buy" data-id="${id}" type="button">Acheter</button>`}
      </span></li>`;
  }

  function draw() {
    const lv = level(), now = Date.now();
    if (noteDealDay(G, lv, now)) save(S); // 1er passage du jour : les offres sont fixées pour la journée
    ui.shownAt = now;
    const todays = deals(G, lv, now);
    const list = CATALOG.filter((id) => categoryOf(id) === ui.cat)
      .sort((a, b) => levelFor(a) - levelFor(b) || basePrice(a) - basePrice(b));
    const shown = ui.trying ? tryOn(G.avatar, ui.trying) : G.avatar;
    render(root, html`
      <p class="row"><button class="btn ghost" data-act="home" type="button">← Accueil</button>
        <button class="btn ghost" data-act="companion" type="button">🐾 Mon compagnon</button>
        <button class="btn ghost" data-act="chests" type="button">🎁 Coffres</button></p>
      <section class="card comp-hero">
        <div class="comp-big">${avatarSvg(shown)}</div>
        <div><h1 class="sentence">🛒 Boutique</h1>
          <p><b>${G.coins} 🪙</b> <span class="muted small">· niveau ${lv} · 1 pièce pour 4 XP gagnés</span></p>
          <p class="muted small">${ui.trying ? html`Essayage : <b>${describeOwned(ui.trying).name}</b> (rien n'est acheté).` : "Touche « Essayer » pour voir un objet sur ton compagnon avant de l'acheter."}</p>
          ${ui.msg ? html`<p class="feedback${ui.bad ? " error" : ""}" role="status">${ui.msg}
            ${ui.bought ? html` <button class="btn soft small-btn" data-act="wear" data-id="${ui.bought}" type="button">Équiper maintenant</button>` : ""}</p>` : ""}</div>
      </section>

      <section class="card"><h2>🔥 Offres du jour <span class="muted small">−30 %, changent chaque jour</span></h2>
        ${todays.length ? html`<ul class="shop-grid">${todays.map((id) => card(id, lv, now, todays))}</ul>`
          : html`<p class="muted small">Rien à te proposer aujourd'hui : tu as déjà tout ce qui s'achète à ton niveau.</p>`}
      </section>

      <section class="card"><h2>Catalogue</h2>
        <p class="kind shop-cats">${CATEGORIES.map(([c, label]) => html`<button class="chip${c === ui.cat ? " on" : ""}" data-act="cat" data-cat="${c}" type="button" aria-pressed="${c === ui.cat ? "true" : "false"}">${label}</button>`)}</p>
        <ul class="shop-grid">${list.map((id) => card(id, lv, now, todays))}</ul>
      </section>`);
  }

  const say = (msg, bad = false, bought = "") => { ui.msg = msg; ui.bad = bad; ui.bought = bought; };
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const { act, id } = el.dataset;
    if (act === "home") return void (location.hash = "#accueil");
    if (act === "companion") return void (location.hash = "#compagnon");
    if (act === "chests") return void (location.hash = "#coffres");
    if (act === "cat" && CATEGORIES.some(([c]) => c === el.dataset.cat)) ui.cat = el.dataset.cat;
    if (act === "try" && describeOwned(id)) { ui.trying = ui.trying === id ? "" : id; say(""); }
    if (act === "buy" && !sameDay(ui.shownAt, Date.now())) { say("Minuit est passé : les offres du jour ont changé. Vérifie le prix, puis réessaie.", true); return void draw(); }
    if (act === "buy") {
      const r = buy(G, id, level(), ui.shownAt);
      if (r.ok) { save(S); say(`Acheté pour ${r.price} 🪙 : ${describeOwned(id).name} est à toi !`, false, id); }
      else say(ERRORS[r.error] || "Achat impossible.", true);
    }
    if (act === "wear") {
      const r = wear(G, id, level()), d = describeOwned(id);
      if (r === "ok") { save(S); ui.trying = ""; say(`${d.name} : équipé ✓`); }
      else say(r === "level" ? "Cet animal se débloque à un niveau plus haut : la couleur t'attend." : "Impossible d'équiper cet objet.", true);
    }
    draw();
  });

  draw();
  return () => {};
}
