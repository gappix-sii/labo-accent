// « Mon compagnon » (casier : on équipe ce qu'on a) et « Shop » (on achète, on ouvre des boîtes, on essaie).
// Les deux vues partagent l'aperçu : toucher une carte montre l'objet sur ton compagnon avant de payer.
import { html, render, $, $$ } from "../core/dom.js";
import { cleanText } from "../core/store.js";
import { SPECIES, SPECIES_BY_ID, ITEMS, ITEM_BY_ID, THEMES, THEME_BY_ID, SLOTS, RARITY, RARITY_ORDER, CATALOG, avatarSvg, ownsSkin, skinKey, themeKey, basePrice, levelFor, describeOwned } from "../avatar.js";
import { COIN, SNOW, BOLT, CHEST_ICO } from "../art.js";
import * as M from "../meta.js";
import * as FX from "../fx.js";

const LOCKER_TABS = [["species", "Animal"], ["skin", "Couleur"], ...SLOTS, ["theme", "Thème"]];
const SHOP_TABS = [["home", "À la une"], ["skins", "Tenues"], ...SLOTS, ["theme", "Thèmes"], ["bonus", "Bonus"]];
const SLOT_IDS = new Set(SLOTS.map(([id]) => id));
const BAG = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h3l-1 15H5L4 7zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>`;

export function setupLocker(app) {
  const st = { locker: { tab: "species" }, shop: { tab: "home", sp: "" } };
  let mode = "locker", preview = null;
  const S = () => app.S;
  const lv = () => app.levelNow().level;
  const owns = id => {
    if (id.startsWith("skin.")) { const [, sp, sk] = id.split("."); return ownsSkin(S().owned, sp, sk); }
    return S().owned.includes(id);
  };

  // ---------- Offres du jour ----------
  function deals() {
    const s = S(), day = app.today();
    if (s.deals.day !== day) {
      s.deals = { day, ids: M.pickDeals(day, CATALOG.filter(id => !owns(id) && levelFor(id) <= lv())) };
      app.save();
    }
    return s.deals.ids;
  }
  // Le prix vient toujours d'ici (jamais de la page) : prix catalogue, ou prix réduit si l'objet est en offre aujourd'hui.
  function priceOf(id) {
    const base = basePrice(id);
    if (!base) return null;
    return deals().includes(id) ? M.dealPrice(base) : base;
  }
  function why(id) {
    const d = describeOwned(id);
    if (id.startsWith("theme.")) { const t = THEME_BY_ID[id.slice(6)]; if (t.box) return "Boîte à butin"; if (t.unlock) return t.unlock.text; }
    else if (id.startsWith("skin.")) { const [, sp, sk] = id.split("."); const k = SPECIES_BY_ID[sp].skins.find(x => x.id === sk); if (k.box) return "Boîte à butin"; }
    else { const it = ITEM_BY_ID[id]; if (it.box) return "Boîte à butin"; if (it.unlock) return it.unlock.text; }
    if (!basePrice(id)) return d && d.kind === "item" ? "Dans les coffres" : "";
    if (lv() < levelFor(id)) return `Niveau ${levelFor(id)}`;
    return "";
  }

  // ---------- Morceaux de cartes ----------
  const rtag = r => html`<span class="rtag rar-${r}">${RARITY[r]}</span>`;
  const still = av => avatarSvg(av, { cls: "still" });
  function priceBtn(id, label = "Acheter") {
    const price = priceOf(id), can = S().coins >= price, base = basePrice(id);
    return html`<button class="btn sm ${can ? "yellow" : "ghost"}" data-act="buy" data-id="${id}" ${can ? "" : "disabled"}>${label} ${price < base ? html`<s>${base}</s> ` : ""}${price}${COIN}</button>`;
  }
  function art(id) {
    const a = S().avatar, d = describeOwned(id);
    if (d.kind === "item") return still({ ...a, [d.slot]: id });
    if (d.kind === "skin") return still({ ...a, species: d.sp, skin: d.sk });
    const t = THEME_BY_ID[d.theme];
    return html`<span class="swatch big">${t.sw.map(c => html`<i data-css="--c:${c}"></i>`)}</span>`;
  }
  function prevKey(id) {
    const d = describeOwned(id);
    return d.kind === "item" ? `${d.slot}:${id}` : d.kind === "skin" ? `skin:${d.sp}:${d.sk}` : `theme:${d.theme}`;
  }
  function onBtn(id) {
    const a = S().avatar, d = describeOwned(id);
    if (d.kind === "item") return a[d.slot] === id ? "eqd" : html`<button class="btn sm cyan" data-act="eq" data-id="${d.slot}:${id}">Équiper</button>`;
    if (d.kind === "skin") return a.species === d.sp && a.skin === d.sk ? "eqd" : lv() < SPECIES_BY_ID[d.sp].lvl ? html`<span class="pill">Niveau ${SPECIES_BY_ID[d.sp].lvl}</span>` : html`<button class="btn sm cyan" data-act="skin" data-id="${d.sp}:${d.sk}">Équiper</button>`;
    return S().theme === d.theme ? "eqd" : html`<button class="btn sm cyan" data-act="theme" data-id="${d.theme}">Appliquer</button>`;
  }
  // Carte d'un objet : aperçu sur ton compagnon, nom, rareté, et l'action possible.
  function card(id, { deal = false } = {}) {
    const d = describeOwned(id), own = owns(id), w = own ? "" : why(id);
    let action = own ? onBtn(id) : w ? html`<span class="pill ${w === "Boîte à butin" ? "boxpill" : ""}">${w}</span>` : priceBtn(id);
    const on = action === "eqd";
    if (on) action = html`<span class="pill good">${d.kind === "theme" ? "Actif" : "Équipé"}</span>`;
    return html`<div class="shopcard rar-${d.rarity} ${deal ? "deal" : ""} ${on ? "on" : ""} ${own && !on ? "owned" : ""}" data-prev="${prevKey(id)}">
      ${deal ? html`<span class="deal-tag">−${Math.round(M.DEAL_OFF * 100)} %</span>` : ""}
      <div class="sc-art ${d.kind === "theme" ? "theme-art" : ""}">${art(id)}</div><b>${d.kind === "skin" ? SPECIES_BY_ID[d.sp].skins.find(k => k.id === d.sk).name : d.name.replace(/^Thème /, "")}</b>${rtag(d.rarity)}
      ${action}</div>`;
  }
  // Tri du Shop : d'abord ce qui s'achète, puis ce qui demande un niveau, puis boîtes et défis, enfin ce que tu as déjà.
  function shopOrder(ids) {
    const rank = id => owns(id) ? 3 : !why(id) ? 0 : why(id).startsWith("Niveau") ? 1 : 2;
    const rr = id => RARITY_ORDER.indexOf(describeOwned(id).rarity);
    return [...ids].sort((x, y) => rank(x) - rank(y) || rr(x) - rr(y) || (basePrice(x) || 0) - (basePrice(y) || 0));
  }

  // ---------- Contenu des onglets ----------
  function lockerCards(tab) {
    const s = S(), a = s.avatar;
    if (tab === "species") return SPECIES.map(sp => {
      const on = a.species === sp.id, open = lv() >= sp.lvl, skin = on ? a.skin : sp.skins[0].id;
      return html`<div class="shopcard ${on ? "on" : ""} ${open ? "" : "locked"}" data-prev="species:${sp.id}">
        <div class="sc-art">${still({ ...a, species: sp.id, skin })}</div><b>${sp.name}</b><span class="small muted">${sp.desc}</span>
        ${on ? html`<span class="pill good">Équipé</span>` : open ? html`<button class="btn sm cyan" data-act="sp" data-id="${sp.id}">Choisir</button>` : html`<span class="pill">Niveau ${sp.lvl}</span>`}</div>`;
    });
    if (tab === "skin") {
      const sp = SPECIES_BY_ID[(preview && preview.species) || a.species];
      return sp.skins.map(k => card(skinKey(sp.id, k.id)));
    }
    if (tab === "theme") return THEMES.map(t => card(themeKey(t.id)));
    const none = html`<div class="shopcard ${a[tab] ? "" : "on"}" data-prev="${tab}:"><div class="sc-art">${still({ ...a, [tab]: "" })}</div><b>Rien</b><span class="small muted">Sans accessoire</span>
      ${a[tab] ? html`<button class="btn sm ghost" data-act="eq" data-id="${tab}:">Retirer</button>` : html`<span class="pill good">Équipé</span>`}</div>`;
    const list = ITEMS.filter(i => i.slot === tab).map(i => i.id);
    return [none, ...[...list.filter(owns), ...list.filter(id => !owns(id))].map(id => card(id))];
  }
  function bonusCards() {
    const s = S(), left = s.boostUntil - app.now();
    const b = (id, price) => html`<button class="btn sm ${s.coins >= price ? "yellow" : "ghost"}" data-act="buy" data-id="${id}" ${s.coins >= price ? "" : "disabled"}>Acheter ${price}${COIN}</button>`;
    return [
      html`<div class="shopcard"><div class="sc-art bonus-art">${SNOW}</div><b>Gel de série</b><span class="small muted">Protège ta série si tu rates un jour. Utilisé automatiquement. ${s.freezes}/${M.MAX_FREEZES} en réserve.</span>
        ${s.freezes >= M.MAX_FREEZES ? html`<span class="pill good">Réserve pleine</span>` : b("freeze", M.PRICES.freeze)}</div>`,
      html`<div class="shopcard"><div class="sc-art bonus-art">${BOLT}</div><b>Potion d'XP ×2</b><span class="small muted">Double toute l'XP gagnée pendant 15 minutes.</span>
        ${left > 0 ? html`<span class="pill ok">Active · ${Math.ceil(left / 60000)} min</span>` : b("boost", M.PRICES.boost)}</div>`,
      html`<div class="shopcard"><div class="sc-art bonus-art">${CHEST_ICO}</div><b>Coffres</b><span class="small muted">Gagnés en montant de niveau, avec les quêtes, les boss et les rangs.</span>
        ${s.chests.length ? html`<button class="btn sm yellow" data-act="chest">Ouvrir (${s.chests.length})</button>` : html`<span class="pill">Aucun pour l'instant</span>`}</div>`
    ];
  }
  function shopBody(tab) {
    const grid = list => html`<div class="shopgrid">${list.map((c, k) => html`<div class="sc-wrap" data-css="--i:${Math.min(k, 14)}">${c}</div>`)}</div>`;
    if (tab === "home") {
      const ms = M.msToMidnight(new Date(app.now())), h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60, ids = deals();
      const lb = app.lootbox.cards();
      return html`
        <h3 class="sec-title">Boîtes à butin</h3>${grid(lb.slice(0, -1))}
        <div class="row between sec-title"><h3>Offres du jour</h3><span class="pill">Nouvelles offres dans ${h} h ${String(m).padStart(2, "0")}</span></div>
        ${ids.length ? grid(ids.map(id => card(id, { deal: true }))) : html`<p class="muted">Tu as déjà tout ce qui est en vente à ton niveau. Bravo, collectionneur !</p>`}
        <p class="small muted">Touche une carte pour essayer l'objet sur ${S().avatar.name} avant de l'acheter.</p>
        <h3 class="sec-title">Collection des boîtes</h3>${grid(lb.slice(-1))}`;
    }
    if (tab === "bonus") return grid(bonusCards());
    if (tab === "skins") {
      const sp = SPECIES_BY_ID[st.shop.sp] || SPECIES_BY_ID[S().avatar.species];
      return html`<div class="chips spchips">${SPECIES.map(x => html`<button class="chip ${x.id === sp.id ? "on" : ""}" data-sp="${x.id}">${x.name}${lv() < x.lvl ? html` · niv. ${x.lvl}` : ""}</button>`)}</div>
        ${grid(shopOrder(sp.skins.slice(1).map(k => skinKey(sp.id, k.id))).map(id => card(id)))}`;
    }
    if (tab === "theme") return grid(shopOrder(THEMES.filter(t => t.price || t.box || t.unlock).map(t => themeKey(t.id))).map(id => card(id)));
    return grid(shopOrder(ITEMS.filter(i => i.slot === tab).map(i => i.id)).map(id => card(id)));
  }

  // ---------- Scène et rendu ----------
  function renderStage() {
    const av = preview || S().avatar, sp = SPECIES_BY_ID[av.species];
    render($("#stageAv"), avatarSvg(av, { cls: "happy" }));
    $("#stageSp").textContent = `${sp.name} · ${sp.desc}`;
    $("#stageNote").hidden = !preview;
  }
  function draw(opts) {
    const cur = st[mode];
    if (opts && opts.tab) cur.tab = opts.tab;
    const tabs = mode === "shop" ? SHOP_TABS : LOCKER_TABS;
    if (!tabs.some(([id]) => id === cur.tab)) cur.tab = tabs[0][0];
    preview = null;
    const s = S(), rank = M.rankOf(s.trophies), shop = mode === "shop";
    const body = shop ? shopBody(cur.tab) : html`<div class="shopgrid">${lockerCards(cur.tab).map((c, k) => html`<div class="sc-wrap" data-css="--i:${Math.min(k, 14)}">${c}</div>`)}</div>`;
    render($("#view"), html`
      <div class="ltop">${shop ? "" : html`<button class="iconbtn" id="lkBack" aria-label="Retour au profil">${app.ICON.close}</button>`}<h3 class="grow">${shop ? "Shop" : "Mon compagnon"}</h3>
        ${shop ? html`<button class="btn sm ghost" id="toWardrobe">Ma tenue</button>` : html`<button class="btn sm yellow" id="toShop">${BAG} Shop</button>`}<span class="wallet" id="wallet">${COIN}<b>${s.coins}</b></span></div>
      <div class="locker ${shop ? "is-shop" : ""}">
        <section class="card stage glow ${shop ? "mini" : ""} ${shop && cur.tab !== "home" ? "sticky" : ""}">
          <div class="stage-av av live" id="stageAv"></div>
          <div class="stage-info">
            ${shop ? html`<b>${s.avatar.name}</b>` : html`<label class="f" for="avName">Nom de ton compagnon<input type="text" id="avName" maxlength="16" autocomplete="off" value="${s.avatar.name}"></label>`}
            <p class="small muted" id="stageSp"></p>
            <p class="small" id="stageNote" hidden><span class="pill ok">Essai</span> pas encore équipé · <button class="linkbtn" id="lkReset">revenir à ma tenue</button></p>
            ${shop ? "" : html`<p class="small muted">Niveau ${lv()} · rang ${rank.name} ${rank.div} · ${s.owned.length} objets</p>`}
          </div>
        </section>
        <div class="chips ltabs" role="tablist">${tabs.map(([id, t]) => html`<button class="chip ${id === cur.tab ? "on" : ""}" role="tab" aria-selected="${id === cur.tab}" data-ltab="${id}">${t}</button>`)}</div>
        ${body}
      </div>`);
    renderStage();
    if (!shop) {
      $("#lkBack").onclick = () => app.go("profile");
      $("#avName").onchange = e => { s.avatar.name = cleanText(e.target.value, 16) || "Pouf"; app.save(); app.renderHud(); app.toast(`Ton compagnon s'appelle ${s.avatar.name} !`); };
      $("#toShop").onclick = () => { app.play("tap"); app.go("shop"); };
    } else $("#toWardrobe").onclick = () => { app.play("tap"); app.go("locker"); };
    $("#lkReset").onclick = () => { preview = null; renderStage(); };
    $$("[data-ltab]").forEach(b => b.onclick = () => { app.play("tap"); cur.tab = b.dataset.ltab; draw(); });
    $$("[data-sp]").forEach(b => b.onclick = () => { app.play("tap"); st.shop.sp = b.dataset.sp; draw(); });
    $$("[data-prev]").forEach(c => c.onclick = e => {
      if (e.target.closest("button")) return;
      const [kind, x, y] = c.dataset.prev.split(":");
      const a = { ...S().avatar };
      if (kind === "species") { a.species = x; a.skin = SPECIES_BY_ID[x].skins[0].id; }
      else if (kind === "skin") { a.species = x; a.skin = y; }
      else if (kind === "theme") { document.documentElement.dataset.theme = x; setTimeout(() => app.applyPrefs(), 1600); return; }
      else if (SLOT_IDS.has(kind)) a[kind] = x || "";
      else return;
      preview = a; app.play("tap"); renderStage(); FX.pop($("#stageAv"));
    });
    $$("[data-act]").forEach(b => b.onclick = () => act(b));
    if (shop && cur.tab === "home") app.lootbox.bind(() => { if (app.view() === "shop") draw(); });
  }

  async function act(b) {
    const s = S(), a = s.avatar, id = b.dataset.id || "";
    const done = msg => { app.save(); app.renderHud(); app.play("buy"); app.haptic("good"); if (msg) app.toast(msg); draw(); FX.pop($("#stageAv")); };
    switch (b.dataset.act) {
      case "sp": { const sp = SPECIES_BY_ID[id]; if (!sp || lv() < sp.lvl) return; a.species = id; const owned = sp.skins.find(k => ownsSkin(s.owned, id, k.id)); a.skin = owned ? owned.id : sp.skins[0].id; return done(`${a.name} est maintenant un ${sp.name.toLowerCase()} !`); }
      case "skin": { const [sp, sk] = id.split(":"); if (!SPECIES_BY_ID[sp] || lv() < SPECIES_BY_ID[sp].lvl || !ownsSkin(s.owned, sp, sk)) return; a.species = sp; a.skin = sk; return done(); }
      case "eq": { const [slot, it] = id.split(":"); if (!SLOT_IDS.has(slot) || (it && (!owns(it) || ITEM_BY_ID[it].slot !== slot))) return; a[slot] = it || ""; return done(); }
      case "theme": { if (!owns(themeKey(id))) return; s.theme = id; app.applyPrefs(); return done(); }
      case "chest": return app.openChestFlow();
      case "buy": {
        if (id === "freeze" || id === "boost") {
          const price = M.PRICES[id];
          if (s.coins < price) return app.toast("Pas assez de pièces. Fais des leçons, des quêtes ou ouvre tes coffres !");
          if (id === "freeze") { if (s.freezes >= M.MAX_FREEZES || !app.spend(price, "bonus")) return; s.freezes++; FX.floatText(`−${price}`, b, "gold"); return done("Gel de série ajouté : ta série est protégée."); }
          if (s.boostUntil > app.now() || !app.spend(price, "bonus")) return; s.boostUntil = app.now() + M.BOOST_MS; FX.floatText("×2 XP !", b, "gold"); return done("Potion bue : XP doublée pendant 15 minutes !");
        }
        const d = describeOwned(id), price = priceOf(id);
        if (!d || !price || owns(id) || lv() < levelFor(id)) return;
        if (s.coins < price) return app.toast("Pas assez de pièces. Fais des leçons, des quêtes ou ouvre tes coffres !");
        if (!await app.confirmDlg("Acheter ?", `${d.name} pour ${price} pièces (il t'en restera ${s.coins - price}).`, "Acheter", { danger: false })) return;
        if (owns(id) || !app.spend(price, "shop")) return;
        s.owned.push(id);
        if (d.kind === "skin") { if (lv() >= SPECIES_BY_ID[d.sp].lvl) { a.species = d.sp; a.skin = d.sk; } }
        else if (d.kind === "theme") { s.theme = d.theme; app.applyPrefs(); }
        else a[d.slot] = id;
        FX.confetti(document.getElementById("fx"), 1200, { y: 0.3, count: 60 });
        return done(`${d.name} : à toi ! ${d.kind === "theme" ? "Thème appliqué." : "Déjà équipé."}`);
      }
    }
  }

  app.defView("locker", o => { mode = "locker"; draw(o); }, { tab: "profile" });
  app.defView("shop", o => { mode = "shop"; draw(o); }, { tab: "shop" });
  return { RANKS: M.RANKS, priceOf };
}
