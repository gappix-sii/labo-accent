// « Mon compagnon » : choix de l'animal, couleurs, accessoires, thèmes de l'appli et bonus (boutique).
import { html, render, $, $$ } from "../core/dom.js";
import { cleanText } from "../core/store.js";
import { SPECIES, SPECIES_BY_ID, ITEMS, THEMES, SLOTS, RARITY, SKIN_PRICE, avatarSvg, ownsSkin, skinKey, themeKey } from "../avatar.js";
import { COIN, SNOW, BOLT, CHEST_ICO } from "../art.js";
import { PRICES, MAX_FREEZES, BOOST_MS, rankOf, RANKS } from "../meta.js";
import * as FX from "../fx.js";

const TABS = [["species", "Animal"], ["skin", "Couleur"], ...SLOTS, ["theme", "Thème"], ["bonus", "Bonus"]];

export function setupLocker(app) {
  let tab = "species", preview = null;
  const S = () => app.S;

  function unlockText(u) { return u ? u.text : ""; }
  function lockReason(it) {
    if (it.unlock) return unlockText(it.unlock);
    if (it.price === null) return "Dans les coffres";
    if (app.levelNow().level < it.lvl) return `Niveau ${it.lvl}`;
    return "";
  }
  function priceBtn(id, price, label = "Acheter") {
    const can = S().coins >= price;
    return html`<button class="btn sm ${can ? "yellow" : "ghost"}" data-act="buy" data-id="${id}" data-price="${price}" ${can ? "" : "disabled"}>${label} ${price}${COIN}</button>`;
  }
  const rtag = r => html`<span class="rtag rar-${r}">${RARITY[r]}</span>`;

  function cards() {
    const s = S(), a = s.avatar, lv = app.levelNow().level;
    const still = av => avatarSvg(av, { cls: "still" });
    if (tab === "species") return SPECIES.map(sp => {
      const on = a.species === sp.id, open = lv >= sp.lvl;
      const skin = on ? a.skin : sp.skins[0].id;
      return html`<div class="shopcard ${on ? "on" : ""} ${open ? "" : "locked"}" data-prev="species:${sp.id}">
        <div class="sc-art">${still({ ...a, species: sp.id, skin })}</div><b>${sp.name}</b><span class="small muted">${sp.desc}</span>
        ${on ? html`<span class="pill good">Équipé</span>` : open ? html`<button class="btn sm cyan" data-act="sp" data-id="${sp.id}">Choisir</button>` : html`<span class="pill">Niveau ${sp.lvl}</span>`}</div>`;
    });
    if (tab === "skin") {
      const sp = SPECIES_BY_ID[(preview && preview.species) || a.species];
      const open = lv >= sp.lvl;
      return sp.skins.map((k, i) => {
        const owned = ownsSkin(s.owned, sp.id, k.id), on = a.species === sp.id && a.skin === k.id, price = SKIN_PRICE[k.rarity];
        return html`<div class="shopcard rar-${k.rarity} ${on ? "on" : ""}" data-prev="skin:${sp.id}:${k.id}">
          <div class="sc-art">${still({ ...a, species: sp.id, skin: k.id })}</div><b>${sp.name} ${k.name}</b>${rtag(k.rarity)}
          ${on ? html`<span class="pill good">Équipé</span>` : !open ? html`<span class="pill">Niveau ${sp.lvl}</span>` : owned ? html`<button class="btn sm cyan" data-act="skin" data-id="${sp.id}:${k.id}">Équiper</button>` : i === 0 ? "" : priceBtn(skinKey(sp.id, k.id), price)}</div>`;
      });
    }
    if (tab === "theme") return THEMES.map(t => {
      const key = themeKey(t.id), owned = s.owned.includes(key), on = s.theme === t.id, why = !owned ? lockReason(t) : "";
      return html`<div class="shopcard rar-${t.rarity} ${on ? "on" : ""}" data-prev="theme:${t.id}">
        <div class="sc-art theme-art" data-theme-prev="${t.id}"><span class="swatch big">${t.sw.map(c => html`<i data-css="--c:${c}"></i>`)}</span></div><b>${t.name}</b>${rtag(t.rarity)}
        ${on ? html`<span class="pill good">Actif</span>` : owned ? html`<button class="btn sm cyan" data-act="theme" data-id="${t.id}">Appliquer</button>` : why ? html`<span class="pill">${why}</span>` : priceBtn(key, t.price)}</div>`;
    });
    if (tab === "bonus") {
      const left = s.boostUntil - Date.now();
      return [
        html`<div class="shopcard"><div class="sc-art bonus-art">${SNOW}</div><b>Gel de série</b><span class="small muted">Protège ta série si tu rates un jour. Utilisé automatiquement. ${s.freezes}/${MAX_FREEZES} en réserve.</span>
          ${s.freezes >= MAX_FREEZES ? html`<span class="pill good">Réserve pleine</span>` : priceBtn("freeze", PRICES.freeze)}</div>`,
        html`<div class="shopcard"><div class="sc-art bonus-art">${BOLT}</div><b>Potion d'XP ×2</b><span class="small muted">Double toute l'XP gagnée pendant 15 minutes.</span>
          ${left > 0 ? html`<span class="pill ok">Active · ${Math.ceil(left / 60000)} min</span>` : priceBtn("boost", PRICES.boost)}</div>`,
        html`<div class="shopcard"><div class="sc-art bonus-art">${CHEST_ICO}</div><b>Coffres</b><span class="small muted">Gagnés en montant de niveau, avec les quêtes, les boss et les rangs.</span>
          ${s.chests.length ? html`<button class="btn sm yellow" data-act="chest">Ouvrir (${s.chests.length})</button>` : html`<span class="pill">Aucun pour l'instant</span>`}</div>`
      ];
    }
    // Accessoires d'un emplacement
    const none = html`<div class="shopcard ${a[tab] ? "" : "on"}" data-prev="${tab}:"><div class="sc-art">${still({ ...a, [tab]: "" })}</div><b>Rien</b><span class="small muted">Sans accessoire</span>
      ${a[tab] ? html`<button class="btn sm ghost" data-act="eq" data-id="${tab}:">Retirer</button>` : html`<span class="pill good">Équipé</span>`}</div>`;
    return [none, ...ITEMS.filter(i => i.slot === tab).map(it => {
      const owned = s.owned.includes(it.id), on = a[tab] === it.id, why = owned ? "" : lockReason(it);
      return html`<div class="shopcard rar-${it.rarity} ${on ? "on" : ""}" data-prev="${tab}:${it.id}">
        <div class="sc-art">${still({ ...a, [tab]: it.id })}</div><b>${it.name}</b>${rtag(it.rarity)}
        ${on ? html`<span class="pill good">Équipé</span>` : owned ? html`<button class="btn sm cyan" data-act="eq" data-id="${tab}:${it.id}">Équiper</button>` : why ? html`<span class="pill">${why}</span>` : priceBtn(it.id, it.price)}</div>`;
    })];
  }

  function previewAv() { return preview || S().avatar; }
  function renderStage() {
    const av = previewAv(), sp = SPECIES_BY_ID[av.species];
    render($("#stageAv"), avatarSvg(av, { cls: "happy" }));
    $("#stageSp").textContent = `${sp.name} · ${sp.desc}`;
    $("#stageNote").hidden = !preview;
  }
  function renderLocker(opts) {
    if (opts && opts.tab) tab = opts.tab;
    preview = null;
    const s = S(), rank = rankOf(s.trophies);
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="lkBack" aria-label="Retour au profil">${app.ICON.close}</button><h3 class="grow">Mon compagnon</h3><span class="wallet" id="wallet">${COIN}<b>${s.coins}</b></span></div>
      <div class="locker">
        <section class="card stage glow">
          <div class="stage-av av live" id="stageAv"></div>
          <div class="stage-info">
            <label class="f" for="avName">Nom de ton compagnon<input type="text" id="avName" maxlength="16" autocomplete="off" value="${s.avatar.name}"></label>
            <p class="small muted" id="stageSp"></p>
            <p class="small" id="stageNote" hidden><span class="pill ok">Aperçu</span> pas encore équipé · <button class="linkbtn" id="lkReset">revenir à ma tenue</button></p>
            <p class="small muted">Niveau ${app.levelNow().level} · rang ${rank.name} ${rank.div} · ${s.owned.length} objets</p>
          </div>
        </section>
        <div class="chips ltabs" role="tablist">${TABS.map(([id, t]) => html`<button class="chip ${id === tab ? "on" : ""}" role="tab" aria-selected="${id === tab}" data-ltab="${id}">${t}</button>`)}</div>
        <div class="shopgrid">${cards().map((c, k) => html`<div class="sc-wrap" data-css="--i:${Math.min(k, 14)}">${c}</div>`)}</div>
      </div>`);
    renderStage();
    $("#lkBack").onclick = () => app.go("profile");
    $("#lkReset").onclick = () => { preview = null; renderStage(); };
    $("#avName").onchange = e => { s.avatar.name = cleanText(e.target.value, 16) || "Pouf"; app.save(); app.renderHud(); app.toast(`Ton compagnon s'appelle ${s.avatar.name} !`); };
    $$("[data-ltab]").forEach(b => b.onclick = () => { app.play("tap"); tab = b.dataset.ltab; renderLocker(); });
    $$("[data-prev]").forEach(c => c.onclick = e => {
      if (e.target.closest("button")) return;
      const [kind, x, y] = c.dataset.prev.split(":");
      const a = { ...S().avatar };
      if (kind === "species") { a.species = x; a.skin = SPECIES_BY_ID[x].skins[0].id; }
      else if (kind === "skin") { a.species = x; a.skin = y; }
      else if (kind === "theme") { document.documentElement.dataset.theme = x; setTimeout(() => app.applyPrefs(), 1600); return; }
      else a[kind] = x || "";
      preview = a; app.play("tap"); renderStage(); FX.pop($("#stageAv"));
    });
    $$("[data-act]").forEach(b => b.onclick = () => act(b));
  }

  async function act(b) {
    const s = S(), a = s.avatar, id = b.dataset.id || "";
    const done = msg => { app.save(); app.renderHud(); app.play("buy"); app.haptic("good"); if (msg) app.toast(msg); renderLocker(); FX.pop($("#stageAv")); };
    switch (b.dataset.act) {
      case "sp": { const sp = SPECIES_BY_ID[id]; a.species = id; const owned = sp.skins.find(k => ownsSkin(s.owned, id, k.id)); a.skin = owned ? owned.id : sp.skins[0].id; return done(`${a.name} est maintenant un ${sp.name.toLowerCase()} !`); }
      case "skin": { const [sp, sk] = id.split(":"); a.species = sp; a.skin = sk; return done(); }
      case "eq": { const [slot, it] = id.split(":"); a[slot] = it || ""; return done(); }
      case "theme": { s.theme = id; app.applyPrefs(); return done(); }
      case "chest": return app.openChestFlow();
      case "buy": {
        const price = +b.dataset.price;
        if (s.coins < price) { app.toast("Pas assez de pièces. Fais des leçons, des quêtes ou ouvre tes coffres !"); return; }
        if (id === "freeze") { if (s.freezes >= MAX_FREEZES || !app.spend(price)) return; s.freezes++; FX.floatText(`−${price}`, b, "gold"); return done("Gel de série ajouté : ta série est protégée."); }
        if (id === "boost") { if (s.boostUntil > Date.now() || !app.spend(price)) return; s.boostUntil = Date.now() + BOOST_MS; FX.floatText("×2 XP !", b, "gold"); return done("Potion bue : XP doublée pendant 15 minutes !"); }
        const label = id.startsWith("skin.") ? (() => { const [, sp, sk] = id.split("."); return `${SPECIES_BY_ID[sp].name} ${SPECIES_BY_ID[sp].skins.find(k => k.id === sk).name}`; })()
          : id.startsWith("theme.") ? `Thème ${THEMES.find(t => themeKey(t.id) === id).name}` : ITEMS.find(i => i.id === id).name;
        if (!await app.confirmDlg("Acheter ?", `${label} pour ${price} pièces (il t'en restera ${s.coins - price}).`, "Acheter", { danger: false })) return;
        if (s.owned.includes(id) || !app.spend(price)) return;
        s.owned.push(id);
        if (id.startsWith("skin.")) { const [, sp, sk] = id.split("."); if (app.levelNow().level >= SPECIES_BY_ID[sp].lvl) { a.species = sp; a.skin = sk; } }
        else if (id.startsWith("theme.")) { s.theme = id.slice(6); app.applyPrefs(); }
        else { const it = ITEMS.find(i => i.id === id); a[it.slot] = id; }
        FX.confetti(document.getElementById("fx"), 1200, { y: 0.3, count: 60 });
        return done(`${label} : à toi !`);
      }
    }
  }

  app.defView("locker", renderLocker, { tab: "profile" });
  return { RANKS };
}
