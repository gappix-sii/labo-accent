// Amis : carte joueur à partager, ajout d'un ami en collant son lien, classement entre amis, profil d'un ami
// (son compagnon avec ses cosmétiques) et duels (mêmes questions, on compare les scores). Aucun serveur.
import { html, render, $, $$ } from "../core/dom.js";
import { avatarSvg, SPECIES_BY_ID, THEME_BY_ID } from "../avatar.js";
import { emblemSvg, TROPHY } from "../art.js";
import * as M from "../meta.js";
import * as G from "../game.js";
import { FAMILIES } from "../irregular.js";
import * as Soc from "../social.js";
import * as FX from "../fx.js";

const MAX_FRIENDS = 50;
const ago = (d, today) => { if (!d) return "date inconnue"; const n = Math.round((Date.parse(today) - Date.parse(d)) / 864e5); return n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : `il y a ${n} jours`; };
const GAME_NAME = { chrono: "Défi chrono", rush: "Verb Rush" };
const BOARDS = [["xp", "XP"], ["streak", "Série"], ["trophies", "Trophées"], ["daily", "Défi du jour"], ["verbs", "Verbes"]];

export function setupFriends(app) {
  const S = () => app.S;
  let board = "xp", D = null, view = null;
  const me = () => { const s = S(); if (!s.social.id) { s.social.id = Soc.newId(); app.save(); } return s.social.id; };
  const friend = id => S().social.friends.find(f => f.id === id);
  const mastered = pre => Object.entries(S().vocab).filter(([k, v]) => k.startsWith(pre) && G.vocabStatus(v) === "mastered").length;
  function stats() { const s = S(); return { today: app.today(), level: app.levelNow().level, streak: app.streak(), bosses: app.bossesWon(), verbs: mastered("IV:"), words: Object.entries(s.vocab).filter(([k, v]) => !k.startsWith("IV:") && G.vocabStatus(v) === "mastered").length }; }
  // Ma carte au même format que celles des amis (pour le classement)
  function cardStats() {
    const s = S(), x = stats();
    return { id: s.social.id, name: s.player || s.avatar.name, d: x.today, avatar: s.avatar, theme: s.theme, level: x.level, xp: s.xp, streak: x.streak, trophies: s.trophies, bosses: x.bosses,
      lessons: Object.keys(s.lessons).length, verbs: x.verbs, words: x.words, chrono: Math.max(0, ...s.chrono.best.map(b => b.score)), daily: s.chrono.daily.day === x.today ? { d: x.today, s: s.chrono.daily.score } : null, me: true };
  }
  const boardValue = (c, k, today) => k === "daily" ? (c.daily && c.daily.d === today ? c.daily.s : null) : c[k];

  async function share(code, title, text) {
    const url = Soc.linkFor(code);
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); app.toast("Lien copié : colle-le dans un message à ton ami."); }
    catch (e) { app.confirmDlg("Ton lien", url, "OK", { danger: false, noCancel: true }); }
  }
  async function shareMyCard() { me(); const code = await Soc.makeCard(Soc.cardFrom(S(), me(), stats())); share(code, "Ma carte du Labo d'accent", `Ajoute-moi en ami sur le Labo d'accent (${S().player || S().avatar.name}, niveau ${app.levelNow().level}) :`); }

  // ---------- Recevoir un code (lien ouvert ou texte collé) ----------
  async function receive(text, { quiet = false } = {}) {
    const r = await Soc.readCode(text);
    if (!r.ok) { app.toast(r.error); return false; }
    if (r.kind === "card") return addCard(r.card, quiet);
    if (r.kind === "duel") return gotDuel(r.duel);
    return gotResult(r.duel);
  }
  async function addCard(c, quiet) {
    const s = S(), id = me();
    if (c.id === id) { app.toast("C'est ta propre carte !"); return false; }
    const old = friend(c.id), today = app.today();
    if (old && old.pk !== c.pk && !await app.confirmDlg("Carte signée par un autre appareil", `Cette carte dit venir de ${old.name}, mais elle n'est pas signée par le même appareil que d'habitude. Si ${old.name} a changé de téléphone, tu peux accepter. Sinon, quelqu'un essaie peut-être de se faire passer pour lui.`, "Accepter", { danger: true })) return false;
    if (!old && s.social.friends.length >= MAX_FRIENDS) { app.toast(`Tu as déjà ${MAX_FRIENDS} amis : retires-en un pour en ajouter.`); return false; }
    const entry = { ...c, added: old ? old.added : today, upd: today };
    s.social.friends = [...s.social.friends.filter(f => f.id !== c.id), entry];
    app.save(); app.play("great");
    if (!quiet) app.toast(old ? `Carte de ${c.name} mise à jour !` : `${c.name} est maintenant ton ami !`);
    app.go("friend", { id: c.id });
    return true;
  }
  async function gotDuel(d) {
    const s = S(), id = me();
    if (d.from === id) { app.toast("C'est ton propre défi : envoie-le à un ami !"); return false; }
    const done = s.social.duels.find(x => x.did === d.did);
    if (done && done.mine >= 0) { D = done; app.go("duelend"); app.toast("Tu as déjà relevé ce défi."); return false; }
    const what = d.game === "rush" ? `Verb Rush (${(FAMILIES.find(f => f.id === d.fam) || FAMILIES[0]).title})` : "Défi chrono";
    if (!await app.confirmDlg(`${d.name} te défie !`, `${what} : ${d.score.toLocaleString("fr-FR")} points à battre. Tu auras exactement les mêmes questions. Un seul essai : prêt ?`, "Relever le défi", { danger: false })) return false;
    startDuel({ role: "received", did: d.did, game: d.game, fam: d.fam, seed: d.seed, with: d.from, name: d.name, avatar: d.avatar, theirs: d.score, theirsOk: d.ok, theirsN: d.n });
    return true;
  }
  async function gotResult(d) {
    const s = S(), x = s.social.duels.find(y => y.did === d.did && y.role === "sent");
    if (!x) { app.confirmDlg(`Résultat de ${d.name}`, `${GAME_NAME[d.game]} : ${d.name} a fait ${d.score.toLocaleString("fr-FR")} points contre ${d.vs.toLocaleString("fr-FR")}.`, "OK", { danger: false, noCancel: true }); return true; }
    Object.assign(x, { theirs: d.score, theirsOk: d.ok, theirsN: d.n, with: d.from, name: d.name, avatar: d.avatar }); app.save();
    D = x; app.go("duelend");
    return true;
  }

  // ---------- Duels ----------
  function startDuel(d) {
    D = { mine: -1, theirs: -1, d: app.today(), ...d };
    if (D.game === "rush") app.startRush(D.fam || "stars", { duel: true, seed: D.seed });
    else app.startChrono("duel", { seed: D.seed });
  }
  function newDuel(game, fam, f) {
    startDuel({ role: "sent", did: Soc.newId(), game, fam, seed: crypto.getRandomValues(new Uint32Array(1))[0], with: f ? f.id : "", name: f ? f.name : "", avatar: f ? f.avatar : null });
  }
  function duelFinished({ score, ok, n }) {
    if (!D) return app.go("arena");
    const s = S();
    D.mine = score; D.mineOk = ok; D.mineN = n;
    s.social.duels = [D, ...s.social.duels.filter(x => x.did !== D.did)].slice(0, 30);
    app.save();
    app.go("duelend");
  }
  async function shareDuel() {
    const code = await Soc.makeDuel(S(), me(), { kind: D.role === "sent" ? "duel" : "res", did: D.did, game: D.game, fam: D.fam, seed: D.seed, score: D.mine, ok: D.mineOk || 0, n: D.mineN || 0, d: D.d, vs: D.theirs >= 0 ? D.theirs : 0 });
    if (D.role === "sent") share(code, "Défi Labo d'accent", `Je te défie au ${GAME_NAME[D.game]} : ${D.mine.toLocaleString("fr-FR")} points à battre, avec les mêmes questions !`);
    else share(code, "Mon résultat", `J'ai relevé ton défi au ${GAME_NAME[D.game]} : ${D.mine.toLocaleString("fr-FR")} points contre ${D.theirs.toLocaleString("fr-FR")} !`);
  }
  function renderDuelEnd() {
    const s = S(), mine = D.mine, theirs = D.theirs, known = theirs >= 0, win = known && mine > theirs, tie = known && mine === theirs;
    const side = (av, name, sc, cls) => html`<div class="duel-side ${cls}"><div class="av live">${avatarSvg(av, { cls: cls === "won" ? "happy" : "" })}</div><b>${name}</b><span class="duel-score">${sc >= 0 ? sc.toLocaleString("fr-FR") : "?"}</span></div>`;
    render($("#view"), html`<section class="card finish ${known ? (win ? "win" : tie ? "" : "lose") : ""}">
      <h2>${!known ? "Défi prêt !" : win ? "Victoire !" : tie ? "Égalité !" : "Défaite… de peu ?"}</h2>
      <p class="muted">${GAME_NAME[D.game]}${D.game === "rush" ? " · " + (FAMILIES.find(f => f.id === D.fam) || FAMILIES[0]).title : ""}</p>
      <div class="duel-vs">${side(s.avatar, "Toi", mine, known && (win || tie) ? "won" : "")}<span class="vs">VS</span>${side(D.avatar || { species: "skunk", skin: "night" }, D.name || "Ton ami", theirs, known && !win ? "won" : "")}</div>
      <p class="small">${D.role === "sent" && !known ? `Envoie ce défi à ${D.name || "un ami"} : il aura exactement les mêmes questions. Quand il t'enverra son résultat, ouvre son lien pour voir qui a gagné.`
        : D.role === "received" ? `Envoie ton résultat à ${D.name} pour qu'il voie le score final.` : "Bien joué ! Lance un autre défi quand tu veux."}</p>
      <div class="row center">${(D.role === "sent" && !known) || D.role === "received" ? html`<button class="btn yellow shine" id="duShare">${D.role === "sent" ? "Envoyer le défi" : "Envoyer mon résultat"}</button>` : ""}<button class="btn ghost" id="duOk">Retour aux amis</button></div></section>`);
    if (known && win) FX.confetti(document.getElementById("fx"), 1600, { y: 0.35, count: 90 });
    const b = $("#duShare"); if (b) b.onclick = () => { app.play("tap"); shareDuel(); };
    $("#duOk").onclick = () => app.go("friends");
  }

  // ---------- Écrans ----------
  function rowsFor(k) {
    const s = S(), today = app.today(), all = [cardStats(), ...s.social.friends];
    return all.map(c => ({ c, v: boardValue(c, k, today) })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  }
  function arenaCard() {
    const s = S(), n = s.social.friends.length, top = rowsFor("xp").slice(0, 3);
    return html`<section class="card friends-card glow"><div class="row between"><h3>Mes amis</h3><span class="pill">${n} ami${n > 1 ? "s" : ""}</span></div>
      ${n ? html`<div class="fr-mini">${top.map((r, i) => html`<div class="fr-mini-row ${r.c.me ? "me" : ""}"><span class="fr-pos">${i + 1}</span><span class="fr-av">${avatarSvg(r.c.avatar, { cls: "still" })}</span><b>${r.c.me ? "Toi" : r.c.name}</b><span class="small muted">${r.v.toLocaleString("fr-FR")} XP</span></div>`)}</div>`
        : html`<p class="small muted">Ajoute tes amis pour voir leur compagnon, comparer vos progrès et vous lancer des défis.</p>`}
      <button class="btn cyan block" id="toFriends">${n ? "Classement et défis" : "Ajouter des amis"}</button></section>`;
  }
  function bindArenaCard() { const b = $("#toFriends"); if (b) b.onclick = () => { app.play("tap"); app.go("friends"); }; }

  function renderFriends() {
    const s = S(), today = app.today(), rows = rowsFor(board), dl = s.social.duels.slice(0, 8);
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="frBack" aria-label="Retour à l'arène">${app.ICON.close}</button><h3 class="grow">Amis</h3></div>
      <section class="card glow fr-me"><div class="fr-me-av av live">${avatarSvg(s.avatar, { cls: "happy" })}</div>
        <div class="grow"><span class="small muted">Ta carte joueur</span><h3>${s.player || s.avatar.name}</h3><p class="small muted">Niveau ${app.levelNow().level} · ${s.xp.toLocaleString("fr-FR")} XP · série ${app.streak()} j</p>
          <button class="btn yellow block shine" id="frShare">Partager ma carte</button>
          ${s.player ? "" : html`<p class="small muted">Astuce : choisis un pseudo dans ton profil, sinon c'est le nom de ton compagnon qui s'affiche.</p>`}</div></section>
      <section class="card"><h3>Ajouter un ami</h3><p class="small muted">Ton ami t'envoie le lien de sa carte : ouvre-le, ou colle-le ici.</p>
        <form id="frForm" class="row"><input id="frIn" autocomplete="off" spellcheck="false" maxlength="6000" placeholder="Colle le lien ou le code" aria-label="Lien ou code d'ami"><button class="btn green" id="frAdd">Ajouter</button></form></section>
      <section class="card"><div class="row between"><h3>Classement</h3><span class="small muted">${rows.length} joueur${rows.length > 1 ? "s" : ""}</span></div>
        <div class="chips">${BOARDS.map(([k, t]) => html`<button class="chip ${k === board ? "on" : ""}" data-board="${k}">${t}</button>`)}</div>
        <ol class="board">${rows.map((r, i) => html`<li class="${r.c.me ? "me" : ""}" data-fr="${r.c.me ? "" : r.c.id}">
          <span class="fr-pos ${i < 3 && r.v !== null ? "top" + (i + 1) : ""}">${r.v === null ? "–" : i + 1}</span><span class="fr-av">${avatarSvg(r.c.avatar, { cls: "still" })}</span>
          <span class="grow"><b>${r.c.me ? "Toi" : r.c.name}</b><br><span class="small muted">niv. ${r.c.level}${r.c.me ? "" : " · carte " + ago(r.c.d, today)}</span></span>
          <b class="fr-val">${r.v === null ? "pas joué" : r.v.toLocaleString("fr-FR")}</b></li>`)}</ol>
        ${s.social.friends.length ? html`<p class="small muted">Les chiffres de tes amis datent du jour où ils t'ont envoyé leur carte : demande-leur de la renvoyer pour la mettre à jour.</p>` : html`<p class="small muted">Pour l'instant, il n'y a que toi. Partage ta carte !</p>`}</section>
      <section class="card"><h3>Défis</h3><p class="small muted">Joue une partie, envoie-la à un ami : il a exactement les mêmes questions, et vous comparez vos scores.</p>
        <div class="vf-games"><button class="vgame rush" data-duel="chrono"><b>Duel chrono</b><span>60 s · vocabulaire et grammaire</span></button><button class="vgame trio" data-duel="rush"><b>Duel Verb Rush</b><span>60 s · verbes irréguliers</span></button></div>
        ${dl.length ? html`<ul class="duels">${dl.map(x => html`<li data-did="${x.did}"><span class="grow"><b>${GAME_NAME[x.game]}</b> ${x.name ? html`contre ${x.name}` : ""}<br><span class="small muted">${x.theirs >= 0 ? (x.mine > x.theirs ? "Gagné" : x.mine === x.theirs ? "Égalité" : "Perdu") : x.role === "sent" ? "En attente de son résultat" : "À envoyer"}</span></span><b>${x.mine.toLocaleString("fr-FR")} – ${x.theirs >= 0 ? x.theirs.toLocaleString("fr-FR") : "?"}</b></li>`)}</ul>` : ""}</section>`);
    $("#frBack").onclick = () => app.go("arena");
    $("#frShare").onclick = () => { app.play("tap"); shareMyCard(); };
    $("#frForm").onsubmit = async e => { e.preventDefault(); const v = $("#frIn").value.trim(); if (v) { $("#frAdd").disabled = true; await receive(v); const b = $("#frAdd"); if (b) b.disabled = false; } };
    $$("[data-board]").forEach(b => b.onclick = () => { app.play("tap"); board = b.dataset.board; renderFriends(); });
    $$("[data-fr]").forEach(li => { if (li.dataset.fr) li.onclick = () => { app.play("tap"); app.go("friend", { id: li.dataset.fr }); }; });
    $$("[data-duel]").forEach(b => b.onclick = () => { app.play("tap"); pickDuel(b.dataset.duel, null); });
    $$("[data-did]").forEach(li => li.onclick = () => { const x = s.social.duels.find(y => y.did === li.dataset.did); if (x) { D = x; app.go("duelend"); } });
  }
  async function pickDuel(game, f) {
    if (game === "rush") {
      const fam = await pickFamily(); if (!fam) return;
      return newDuel("rush", fam, f);
    }
    newDuel("chrono", "", f);
  }
  // Petit choix de la famille de verbes, dans la boîte de dialogue habituelle
  function pickFamily() {
    return new Promise(res => {
      const d = $("#dlg"); $("#dlgTitle").textContent = "Quelle famille de verbes ?";
      render($("#dlgText"), html`<span class="chips dlg-chips">${FAMILIES.map(f => html`<button class="chip" data-pf="${f.id}">${f.short}</button>`)}</span>`);
      $("#dlgOk").textContent = "Les stars"; $("#dlgOk").className = "btn sm green"; $("#dlgCancel").hidden = false;
      const done = v => { d.close(); res(v); };
      $$("[data-pf]").forEach(b => b.onclick = () => done(b.dataset.pf));
      $("#dlgOk").onclick = () => done("stars"); $("#dlgCancel").onclick = () => done(null); d.oncancel = () => res(null);
      d.showModal();
    });
  }
  function renderFriend(o) {
    const f = friend((o && o.id) || view);
    if (!f) return app.go("friends");
    view = f.id;
    const rank = M.rankOf(f.trophies), sp = SPECIES_BY_ID[f.avatar.species], th = THEME_BY_ID[f.theme], today = app.today();
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="fpBack" aria-label="Retour">${app.ICON.close}</button><h3 class="grow">${f.name}</h3></div>
      <section class="card stage glow fp-stage"><div class="stage-av av live">${avatarSvg(f.avatar, { cls: "happy", label: `${f.avatar.name}, le compagnon de ${f.name}` })}</div>
        <div class="stage-info"><span class="small muted">Le compagnon de ${f.name}</span><h3>${f.avatar.name}</h3><p class="small muted">${sp.name} · thème ${th ? th.name : ""}</p>
          <div class="row"><div class="badge-lv">${f.level}</div><div class="grow"><b>${G.levelTitle(f.level)}</b><br><span class="small muted">${f.xp.toLocaleString("fr-FR")} XP</span></div></div>
          <p class="small muted">Carte reçue ${ago(f.upd, today)} · mise à jour par ${f.name} ${ago(f.d, today)}</p></div></section>
      <section class="card"><div class="fp-rank">${emblemSvg(rank, "sm")}<span><b>${rank.name} ${rank.div}</b><br><span class="small muted">${TROPHY} ${f.trophies} trophées</span></span></div>
        <div class="tiles four"><div class="tile o"><span class="l">Série</span><span class="v">${f.streak} j</span></div><div class="tile y"><span class="l">Leçons</span><span class="v">${f.lessons}</span></div>
          <div class="tile c"><span class="l">Verbes maîtrisés</span><span class="v">${f.verbs}</span></div><div class="tile g"><span class="l">Mots maîtrisés</span><span class="v">${f.words}</span></div></div>
        <div class="tiles four"><div class="tile c"><span class="l">Boss battus</span><span class="v">${f.bosses}</span></div><div class="tile y"><span class="l">Record chrono</span><span class="v">${f.chrono.toLocaleString("fr-FR")}</span></div>
          <div class="tile o"><span class="l">Succès</span><span class="v">${f.badges}</span></div><div class="tile g"><span class="l">Défi du jour</span><span class="v">${f.daily && f.daily.d === today ? f.daily.s.toLocaleString("fr-FR") : "–"}</span></div></div></section>
      <section class="card"><h3>Défier ${f.name}</h3><div class="vf-games"><button class="vgame rush" data-duel="chrono"><b>Duel chrono</b><span>Mêmes questions, 60 s</span></button><button class="vgame trio" data-duel="rush"><b>Duel Verb Rush</b><span>Verbes irréguliers</span></button></div></section>
      <div class="row center"><button class="btn ghost sm" id="fpDel">Retirer ${f.name} de mes amis</button></div>`);
    $("#fpBack").onclick = () => app.go("friends");
    $$("[data-duel]").forEach(b => b.onclick = () => { app.play("tap"); pickDuel(b.dataset.duel, f); });
    $("#fpDel").onclick = async () => {
      if (!await app.confirmDlg(`Retirer ${f.name} ?`, `${f.name} disparaîtra de ta liste et du classement. Tu pourras le rajouter avec son lien.`, "Retirer")) return;
      const s = S(); s.social.friends = s.social.friends.filter(x => x.id !== f.id); app.save(); app.toast(`${f.name} a été retiré de tes amis.`); app.go("friends");
    };
  }

  app.defView("friends", renderFriends, { tab: "arena" });
  app.defView("friend", renderFriend, { tab: "arena" });
  app.defView("duelend", renderDuelEnd, { tab: "arena", full: true });
  app.social = { arenaCard, bindArenaCard, duelFinished, receive, shareMyCard };
  return app.social;
}
