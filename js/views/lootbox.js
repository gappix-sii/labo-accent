// Boîtes à butin : achetées avec les pièces du jeu (jamais d'argent réel), probabilités affichées,
// garantie (pitié) d'un objet légendaire ou mieux toutes les 10 boîtes, doublons convertis en pièces.
// Ouverture en 3 temps : la boîte se charge et change de couleur palier par palier jusqu'à la rareté obtenue,
// puis une révélation propre à chaque rareté (onde, rayons, éclair, confettis, son, vibration).
import { html, render, $, $$ } from "../core/dom.js";
import * as M from "../meta.js";
import { boxPool, describeOwned, avatarSvg, RARITY, RARITY_ORDER, THEME_BY_ID, EXCLUSIVES, SPECIES_BY_ID } from "../avatar.js";
import { boxSvg, COIN } from "../art.js";
import * as FX from "../fx.js";

const pct = v => (v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";
const CONFETTI = { common: 0, rare: 50, epic: 110, legendary: 200, mythic: 280 };
const HAPTICS = { common: "good", rare: "good", epic: "great", legendary: "level", mythic: "level" };
const TEASE = ["…", "Rare ?", "Épique !?", "LÉGENDAIRE !?", "MYTHIQUE !!!"];

export function createLootbox(app) {
  const S = () => app.S;
  const oddsList = B => html`<ul class="odds">${RARITY_ORDER.filter(r => B.odds[r]).map(r => html`<li class="rar-${r}"><i></i>${RARITY[r]}<b>${pct(B.odds[r])}</b></li>`)}</ul>`;
  function pityText() {
    const n = M.PITY - S().boxPity;
    return n <= 1 ? "Garantie : la prochaine boîte contient un objet légendaire ou mythique !" : `Garantie : un objet légendaire ou mythique dans ${n} boîtes au plus.`;
  }
  function preview(id, d, cls = "happy") {
    const a = S().avatar;
    if (!d) return html`<span class="rv-coin">${COIN}</span>`;
    if (d.kind === "item") return avatarSvg({ ...a, [d.slot]: id }, { cls });
    if (d.kind === "skin") return avatarSvg({ ...a, species: d.sp, skin: d.sk }, { cls });
    return html`<span class="swatch big">${THEME_BY_ID[d.theme].sw.map(c => html`<i data-css="--c:${c}"></i>`)}</span>`;
  }

  function cards() {
    const s = S(), got = EXCLUSIVES.filter(id => s.owned.includes(id)).length;
    const boxes = Object.entries(M.BOXES).map(([id, B]) => html`<div class="shopcard boxcard rar-${id === "classic" ? "rare" : id}">
      <div class="sc-art">${boxSvg(id, "idle")}</div><b>${B.name}</b>${oddsList(B)}
      <button class="btn sm ${s.coins >= B.price ? "yellow" : "ghost"}" data-box="${id}">Ouvrir · ${B.price}${COIN}</button></div>`);
    const coll = html`<div class="shopcard wide collection">
      <div class="row between"><b>Collection exclusive des boîtes</b><span class="pill good">${got} / ${EXCLUSIVES.length}</span></div>
      <div class="collect-grid">${EXCLUSIVES.map(id => { const d = describeOwned(id), own = s.owned.includes(id); return html`<div class="coll rar-${d.rarity} ${own ? "got" : ""}">
        ${own ? html`<span class="coll-art">${preview(id, d, "still")}</span>` : html`<span class="q">?</span>`}<span class="small">${own ? d.name : RARITY[d.rarity]}</span></div>`; })}</div>
      <p class="small muted">${pityText()} Les doublons sont convertis en pièces. Les boîtes contiennent aussi les objets de la boutique.</p>
      <p class="small muted">Uniquement des pièces gagnées en jouant : aucun achat avec de l'argent réel n'existe dans l'appli. Les pourcentages affichés sont les vraies probabilités.</p></div>`;
    return [...boxes, coll];
  }
  function bind(after) { $$("[data-box]").forEach(b => b.onclick = () => { app.play("tap"); open(b.dataset.box, after); }); }

  function open(id, after) {
    const B = M.BOXES[id], d = $("#boxDlg"), body = $("#boxBody");
    let busy = false;
    const close = () => { if (d.open) d.close(); };
    d.onclose = () => { body.onclick = null; after && after(); };

    function offer() {
      const s = S(), can = s.coins >= B.price;
      render(body, html`<h2 class="bx-title"></h2>
        <div class="bx-stage"><div class="box-aura a-common"></div><button class="box-btn" id="boxTap" aria-label="Ouvrir la boîte" ${can ? "" : "disabled"}>${boxSvg(id, "idle")}</button></div>
        ${oddsList(B)}<p class="small muted">${pityText()}</p>
        ${can ? "" : html`<p class="small bad-t">Il te manque ${B.price - s.coins} pièces : fais des leçons, des quêtes ou le défi chrono !</p>`}
        <div class="row center"><button class="btn ghost sm" id="boxClose">Fermer</button><button class="btn yellow shine" id="boxOpen" ${can ? "" : "disabled"}>Ouvrir · ${B.price}${COIN}</button></div>`);
      $(".bx-title", body).textContent = B.name;
      $("#boxOpen").onclick = buyAndOpen; $("#boxTap").onclick = buyAndOpen; $("#boxClose").onclick = close;
    }

    async function buyAndOpen() {
      if (busy) return;
      const s = S();
      if (s.coins < B.price || !app.spend(B.price)) { app.toast("Pas assez de pièces."); return; }
      busy = true;
      const forced = app.TEST_LOCAL ? (window.__boxrar || app.params.get("boxrar")) : null;
      const r = M.rollBox(id, boxPool(s.owned), s.boxPity, M.cryptoRng(), RARITY_ORDER.includes(forced) ? forced : null);
      // Le résultat est enregistré avant l'animation : fermer la fenêtre ne fait rien perdre.
      s.boxPity = r.pity; s.stats.boxes++;
      if (r.item && !r.dup) s.owned.push(r.item);
      if (r.coins) s.coins += r.coins;
      app.save(); app.renderHud();
      await charge(r.rarity);
      if (d.open) reveal(r);
      busy = false;
    }

    function charge(rar) {
      const steps = RARITY_ORDER.indexOf(rar);
      render(body, html`<h2 class="bx-title tease">…</h2><div class="bx-stage charging"><div class="box-aura a-common" id="bxAura"></div><div class="box-btn">${boxSvg(id, "charging lvl-0")}</div></div>
        <p class="small muted">Touche l'écran pour passer l'animation</p>`);
      if (FX.reduced()) return Promise.resolve();
      const box = $(".bx-stage .lbox", body), aura = $("#bxAura"), title = $(".bx-title", body);
      return new Promise(res => {
        let k = 0, done = false, t = 0;
        const finish = () => { if (done) return; done = true; clearTimeout(t); body.onclick = null; res(); };
        // Branché après le clic qui a ouvert la boîte (sinon ce même clic sauterait l'animation).
        setTimeout(() => { if (!done) body.onclick = finish; }, 300);
        const step = () => {
          if (done) return;
          if (k >= steps) { t = setTimeout(finish, 700); return; }
          k++;
          box.setAttribute("class", `lbox lbox-${id} charging lvl-${k}`);
          aura.className = "box-aura a-" + RARITY_ORDER[k];
          title.textContent = TEASE[k];
          title.className = "bx-title tease t-" + RARITY_ORDER[k];
          FX.pop(title);
          if (S().sfx) FX.sfx.charge(k);
          app.haptic(k >= 3 ? "crit" : "hit");
          if (k >= 3) FX.flash(box);
          t = setTimeout(step, 720);
        };
        if (S().sfx) FX.sfx.charge(0);
        t = setTimeout(step, 850);
      });
    }

    function reveal(r) {
      const rar = r.rarity, info = r.item ? describeOwned(r.item) : null, s = S();
      const lvlOk = !info || info.kind !== "skin" || app.levelNow().level >= SPECIES_BY_ID[info.sp].lvl;
      const can = s.coins >= B.price;
      render(body, html`<div class="reveal r-${rar}">
          <div class="rv-fx"><div class="rv-rays"></div><div class="rv-ring"></div><div class="rv-ring two"></div><div class="rv-ring three"></div></div>
          <div class="rv-card rar-${rar}"><span class="rv-rar">${RARITY[rar]}</span>
            <div class="rv-prev av live">${preview(r.item, info)}</div><b class="rv-name"></b>
            <span class="rv-sub">${r.dup ? html`<span class="pill ok">Doublon</span> +${r.coins}${COIN}` : html`<span class="pill good">Nouveau !</span>`}${r.guaranteed ? html` <span class="pill ok">Garantie</span>` : ""}</span>
            ${info && !lvlOk ? html`<span class="small muted">${SPECIES_BY_ID[info.sp].name} se débloque au niveau ${SPECIES_BY_ID[info.sp].lvl} : la couleur t'attendra.</span>` : ""}</div></div>
        <div class="row center">${info && lvlOk ? html`<button class="btn cyan sm" id="boxEquip">${info.kind === "theme" ? "Appliquer" : "Équiper"}</button>` : ""}
          <button class="btn ghost sm" id="boxAgain" ${can ? "" : "disabled"}>Encore · ${B.price}${COIN}</button><button class="btn yellow" id="boxOk">Super !</button></div>`);
      $(".rv-name", body).textContent = info ? info.name : "Des pièces !";
      if (S().sfx) FX.sfx.reveal(rar);
      app.haptic(HAPTICS[rar]);
      if (rar === "legendary" || rar === "mythic") { FX.screenFlash("r-" + rar); setTimeout(() => FX.shake(body), 120); }
      if (CONFETTI[rar]) setTimeout(() => FX.confetti(document.getElementById("fx"), rar === "mythic" ? 3200 : 2200, { y: 0.42, count: CONFETTI[rar] }), 150);
      if (rar === "mythic") setTimeout(() => FX.confetti(document.getElementById("fx"), 2600, { y: 0.3, count: 220 }), 900);
      const eq = $("#boxEquip");
      if (eq) eq.onclick = () => {
        if (info.kind === "item") s.avatar[info.slot] = r.item;
        else if (info.kind === "skin") { s.avatar.species = info.sp; s.avatar.skin = info.sk; }
        else { s.theme = info.theme; app.applyPrefs(); }
        app.save(); app.renderHud(); app.play("buy"); FX.pop($(".rv-card", body)); eq.disabled = true; eq.textContent = "Équipé !";
      };
      $("#boxAgain").onclick = () => buyAndOpen();
      $("#boxOk").onclick = close;
    }

    offer();
    if (!d.open) d.showModal();
  }

  return { cards, bind, open };
}
