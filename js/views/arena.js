// Arène : rang et trophées, défi chrono (60 s), défi du jour (mêmes questions pour tous), liste des boss.
import { html, render, $, $$, setVar } from "../core/dom.js";
import * as M from "../meta.js";
import { UNITS } from "../game.js";
import { BOSSES, bossSvg } from "../avatar.js";
import { emblemSvg, boxSvg, COIN, TROPHY, CROWN, CHEST_ICO } from "../art.js";
import { makeQuestions } from "../chrono.js";
import { line } from "../mascot.js";
import * as FX from "../fx.js";

const TYPE_LABEL = { fr2en: "Vocabulaire", en2fr: "Vocabulaire", gram: "Grammaire", fault: "Faute ou pas ?" };
const fmtDay = d => d.slice(8, 10) + "/" + d.slice(5, 7);

export function setupArena(app) {
  const S = () => app.S;
  let CR = null, raf = 0;

  function renderArena() {
    const s = S(), rank = M.rankOf(s.trophies), today = app.today();
    const dailyScore = s.chrono.daily.day === today ? s.chrono.daily.score : null;
    const unitDone = u => u.lessons.every(l => s.lessons[l.id]);
    render($("#view"), html`
      <h2>Arène</h2>
      <section class="card rankcard glow">
        <div class="emblem-wrap">${emblemSvg(rank, "big")}</div>
        <div class="grow"><span class="small muted">Ton rang</span><h3 class="rank-name">${rank.name} ${rank.div}</h3>
          <div class="bar trophy"><i data-css="--p:${Math.round(rank.pct * 100)}%"></i></div>
          <span class="small muted">${TROPHY} ${s.trophies} trophées${rank.next ? ` · encore ${rank.next.min - s.trophies} pour ${rank.next.name}` : " · rang maximum !"}</span></div>
      </section>
      <div class="arena-grid">
        <section class="card mode chrono-card" data-css="--i:1">
          <div class="mode-head"><span class="mode-ico">⏱</span><div><h3>Défi chrono</h3><p class="small">60 secondes pour enchaîner les bonnes réponses : vocabulaire, grammaire, fautes à repérer. Les combos multiplient les points !</p></div></div>
          <button class="btn yellow block shine" id="arChrono">Jouer</button>
          <h4>Tes records</h4>
          ${s.chrono.best.length ? html`<ol class="records">${s.chrono.best.map((r, i) => html`<li class="${i === 0 ? "top" : ""}"><b>${r.score.toLocaleString("fr-FR")}</b><span class="small muted">${fmtDay(r.d)}${r.daily ? " · défi du jour" : ""}</span></li>`)}</ol>` : html`<p class="small muted">Pas encore de record. À toi de jouer !</p>`}
        </section>
        <section class="card mode daily-card" data-css="--i:2">
          <div class="mode-head"><span class="mode-ico">📅</span><div><h3>Défi du jour · ${fmtDay(today)}</h3><p class="small">Les mêmes questions pour tout le monde aujourd'hui. Compare ton score avec tes amis ! Premier essai du jour : +10 trophées.</p></div></div>
          ${dailyScore !== null ? html`<p class="daily-score">Ton meilleur score du jour : <b>${dailyScore.toLocaleString("fr-FR")}</b></p>` : ""}
          <button class="btn cyan block" id="arDaily">${dailyScore !== null ? "Rejouer le défi du jour" : "Relever le défi"}</button>
        </section>
        <section class="card mode loot-card" data-css="--i:3">
          <div class="mode-head"><span class="mode-box">${boxSvg("mythic", "idle")}</span><div><h3>Boîtes à butin</h3><p class="small">Dépense tes pièces pour tenter ta chance : skins et accessoires exclusifs, du commun au mythique. Probabilités affichées, légendaire garanti au moins toutes les 10 boîtes.</p></div></div>
          <button class="btn yellow block" id="arLoot">Voir les boîtes</button>
        </section>
        <section class="card bosses-card" data-css="--i:4"><h3>Les boss</h3><p class="small muted">Un boss garde la fin de chaque unité du parcours. Bats-le pour gagner une couronne, un coffre d'or et des trophées.</p>
          <div class="boss-list">${UNITS.map(u => { const b = s.bosses[u.id], won = b && b.won, open = unitDone(u); return html`<div class="boss-row ${won ? "won" : open ? "open" : "locked"}">
            <div class="boss-mini">${bossSvg(u.id, won ? "ko" : "")}</div><div class="grow"><b>${BOSSES[u.id].name}</b><br><span class="small muted">${u.title} · ${u.sub}${b ? ` · meilleur ${b.best} %` : ""}</span></div>
            ${won ? html`<span class="crown">${CROWN}</span>` : ""}${open ? html`<button class="btn sm ${won ? "ghost" : "red"}" data-fight="${u.id}">${won ? "Rejouer" : "Combattre"}</button>` : html`<span class="pill">Termine l'unité</span>`}</div>`; })}</div></section>
        <section class="card ranks-card" data-css="--i:5"><h3>Les rangs</h3><p class="small muted">Chaque nouveau rang rapporte un coffre d'or (légendaire pour Légende). Les trophées se gagnent au défi chrono et contre les boss.</p>
          <div class="rank-list">${M.RANKS.map((r, i) => html`<div class="rank-row ${i <= rank.i ? "got" : ""}">${emblemSvg({ ...r, div: "" }, "sm")}<b>${r.name}</b><span class="small muted">${r.min} ${TROPHY}</span></div>`)}</div></section>
      </div>`);
    $("#arChrono").onclick = () => { app.play("tap"); startChrono("free"); };
    $("#arDaily").onclick = () => { app.play("tap"); startChrono("daily"); };
    $("#arLoot").onclick = () => { app.play("tap"); app.go("shop", { tab: "home" }); };
    $$("[data-fight]").forEach(b => b.onclick = () => { app.play("tap"); app.startBoss(b.dataset.fight); });
  }

  function startChrono(mode) {
    const s = S(), daily = mode === "daily";
    const rng = daily ? M.mulberry32(M.seedFrom("daily:" + app.today())) : Math.random;
    const levels = daily ? ["A1", "A2"] : [...new Set(["A1", "A2", s.vocabLevel])];
    const ms = app.TEST_LOCAL && app.params.has("fast") ? 6000 : M.CHRONO_MS;
    CR = { mode, qs: makeQuestions(rng, { levels, n: 120 }), i: -1, score: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0, answers: [], ms, end: 0, startLevel: app.levelNow().level, locked: false, done: false };
    app.go("chrono");
  }
  function renderChrono() {
    render($("#view"), html`<div class="chrono">
      <div class="ltop"><button class="iconbtn" id="crQuit" aria-label="Abandonner">${app.ICON.close}</button><div class="bar time" id="crTime"><i></i></div><span class="crsec" id="crSec">${Math.round(CR.ms / 1000)}</span></div>
      <div class="cr-score"><span class="small muted">${CR.mode === "daily" ? "Défi du jour" : "Défi chrono"}</span><b id="crScore">0</b><span class="cr-mult" id="crMult"></span></div>
      <section class="card qcard cr-q" id="crCard"><span class="pill ok" id="crType"></span><p class="cr-prompt" id="crPrompt"></p><p class="small muted" id="crSub"></p><div class="cr-opts" id="crOpts"></div></section>
      <div class="cr-count" id="crCount" aria-live="assertive"></div>
      <p class="kbd-hint"><b>1</b> <b>2</b> <b>3</b> <b>4</b> pour répondre · <b>Échap</b> pour abandonner</p></div>`);
    $("#crQuit").onclick = async () => { const was = CR; was.paused = true; if (await app.confirmDlg("Abandonner le défi ?", "Ce score ne comptera pas.", "Abandonner")) { stopTimer(); CR = null; app.go("arena"); } else if (CR) { CR.paused = false; } };
    countdown();
  }
  async function countdown() {
    const el = $("#crCount"), skip = FX.reduced() || app.TEST_LOCAL;
    if (!skip) {
      for (const t of ["3", "2", "1", "GO !"]) {
        if (!CR || app.view() !== "chrono") return;
        el.textContent = t; FX.pop(el); app.play(t === "GO !" ? "great" : "tick");
        await new Promise(r => setTimeout(r, 550));
      }
    }
    el.textContent = "";
    if (!CR || app.view() !== "chrono") return;
    CR.end = performance.now() + CR.ms;
    tick(); nextQ();
  }
  function stopTimer() { cancelAnimationFrame(raf); raf = 0; }
  function tick() {
    if (!CR || app.view() !== "chrono") return stopTimer();
    const now = performance.now();
    if (CR.paused) { CR.end += 16.7; }
    const left = Math.max(0, CR.end - now), pct = left / CR.ms * 100;
    setVar($("#crTime > i"), "--p", pct.toFixed(1) + "%");
    const sec = Math.ceil(left / 1000), el = $("#crSec");
    if (el && el.textContent !== String(sec)) { el.textContent = sec; if (sec <= 5 && sec > 0) { app.play("tick"); FX.pop(el); } }
    $("#crTime").classList.toggle("low", left < 10000);
    if (left <= 0) return finish();
    raf = requestAnimationFrame(tick);
  }
  function nextQ() {
    if (!CR || CR.done) return;
    CR.i++;
    const q = CR.qs[CR.i % CR.qs.length];
    CR.qStart = performance.now(); CR.locked = false;
    $("#crType").textContent = TYPE_LABEL[q.type];
    $("#crPrompt").textContent = q.prompt;
    $("#crSub").textContent = q.sub;
    render($("#crOpts"), html`${q.options.map((o, k) => html`<button class="gopt cr-opt" data-k="${k}"><span class="kn">${k + 1}</span><span class="ot"></span></button>`)}`);
    $$(".cr-opt").forEach((b, k) => { b.querySelector(".ot").textContent = q.options[k]; b.onclick = () => answer(k, b); });
    $("#crOpts").classList.toggle("two", q.options.length === 2);
    FX.pop($("#crCard"));
  }
  function answer(k, btn) {
    if (!CR || CR.locked || CR.done || !CR.end) return;
    CR.locked = true;
    const q = CR.qs[CR.i % CR.qs.length], ok = k === q.answer, ms = performance.now() - CR.qStart;
    const r = M.chronoPoints(ok, CR.combo, ms);
    CR.answers.push(ok);
    $$(".cr-opt").forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add("good"); });
    if (ok) {
      CR.score += r.pts; CR.combo = r.combo; CR.correct++; CR.maxCombo = Math.max(CR.maxCombo, CR.combo);
      FX.floatText(`+${r.pts}${r.speed ? " ⚡" : ""}`, btn, r.mult >= 2 ? "gold" : "green");
      app.play("good"); app.haptic("tap");
    } else {
      btn.classList.add("bad"); CR.combo = 0; CR.wrong++;
      FX.shake($("#crCard")); app.play("bad"); app.haptic("bad");
      if (q.fix) FX.floatText(q.fix, $("#crOpts"), "small");
    }
    const sc = $("#crScore"), from = +sc.textContent.replace(/\D/g, "") || 0;
    FX.countUp(sc, from, CR.score, 250);
    const mult = M.chronoMult(CR.combo), m = $("#crMult");
    m.textContent = CR.combo >= 2 ? `🔥 ${CR.combo} · ×${mult}` : "";
    m.className = "cr-mult " + (mult >= 3 ? "m3" : mult >= 2 ? "m2" : mult > 1 ? "m1" : "");
    setTimeout(nextQ, ok ? 260 : 750);
  }
  function finish() {
    stopTimer();
    if (!CR || CR.done) return;
    CR.done = true;
    const s = S(), today = app.today(), daily = CR.mode === "daily";
    const firstDaily = daily && s.chrono.daily.day !== today;
    const R = M.chronoRewards(CR.score, CR.correct, firstDaily);
    const entry = { score: CR.score, d: today, daily };
    const prevBest = s.chrono.best[0] ? s.chrono.best[0].score : 0;
    const rec = M.pushRecord(s.chrono.best, entry);
    s.chrono.best = rec.list; s.chrono.runs++;
    if (daily) s.chrono.daily = { day: today, score: s.chrono.daily.day === today ? Math.max(s.chrono.daily.score, CR.score) : CR.score };
    const isRecord = CR.score > prevBest && prevBest > 0;
    const g = app.gainXp(R.xp, CR.startLevel, { coins: R.coins, trophies: R.trophies, key: "chrono:" + CR.mode, reason: "chrono", progress: isRecord ? M.CHRONO_RECORD : 0, why: `record personnel ${CR.score}` });
    app.quest("chrono"); app.quest("chronoScore", CR.score);
    app.go("cfinish", { ...g, score: CR.score, correct: CR.correct, total: CR.answers.length, maxCombo: CR.maxCombo, daily, record: CR.score > prevBest && CR.score > 0, rank: rec.rank, answers: CR.answers, firstDaily });
  }
  function shareText(o) {
    const s = S(), rows = [];
    for (let i = 0; i < Math.min(20, o.answers.length); i += 10) rows.push(o.answers.slice(i, i + 10).map(a => a ? "🟩" : "🟥").join(""));
    return `${s.player ? s.player + " · " : ""}Labo d'accent · ${o.daily ? "Défi du " + fmtDay(app.today()) : "Défi chrono"} : ${o.score.toLocaleString("fr-FR")} pts (${o.correct}/${o.total}) 🔥×${o.maxCombo}\n${rows.join("\n")}\n${location.origin}${location.pathname}`;
  }
  function renderEnd(o) {
    const acc = o.total ? Math.round(o.correct / o.total * 100) : 0;
    render($("#view"), html`<section class="card finish chrono-end">
      ${o.record ? html`<div class="banner gold">Nouveau record !</div>` : ""}
      <h2>${o.daily ? "Défi du jour terminé !" : "Temps écoulé !"}</h2>
      <div class="cr-final"><b id="crFinal">0</b><span>points</span></div>
      <div class="tiles four">
        <div class="tile g"><span class="l">Bonnes réponses</span><span class="v">${o.correct}/${o.total}</span></div>
        <div class="tile c"><span class="l">Précision</span><span class="v">${acc}%</span></div>
        <div class="tile o"><span class="l">Combo max</span><span class="v">×${o.maxCombo}</span></div>
        <div class="tile y"><span class="l">Classement</span><span class="v">${o.rank >= 0 ? "#" + (o.rank + 1) : "–"}</span></div>
      </div>
      <div class="tiles four">
        <div class="tile y"><span class="l">XP</span><span class="v">+${o.xpGained}</span></div>
        <div class="tile o" id="coinTile"><span class="l">Pièces</span><span class="v">+${o.coins}</span></div>
        <div class="tile c"><span class="l">Trophées</span><span class="v">+${o.trophies}</span></div>
        <div class="tile g"><span class="l">Rang</span><span class="v">${M.rankOf(S().trophies).name}</span></div>
      </div>
      ${o.answers.length ? html`<div class="share-grid" aria-label="Tes réponses">${o.answers.slice(0, 20).map(a => html`<i class="${a ? "ok" : "ko"}"></i>`)}</div>` : ""}
      <div class="row center"><button class="btn ghost sm" id="crShare">Partager mon score</button></div>
      <div class="row center"><button class="btn ghost" id="crAgain">Rejouer</button><button class="btn green shine" id="crOk">Continuer</button></div></section>`);
    FX.countUp($("#crFinal"), 0, o.score, 1100);
    if (o.record) { FX.confetti(document.getElementById("fx"), 2400); app.play("done"); } else app.play("good");
    app.collectCoins($("#coinTile"), o.coins);
    $("#crShare").onclick = async () => {
      const text = shareText(o);
      try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
      try { await navigator.clipboard.writeText(text); app.toast("Score copié : colle-le où tu veux !"); } catch (e) { app.toast("Partage impossible sur ce navigateur."); }
    };
    $("#crAgain").onclick = async () => { await app.rewards(o); startChrono(o.daily ? "daily" : "free"); };
    $("#crOk").onclick = async () => { await app.rewards(o); app.go("arena"); };
  }

  document.addEventListener("keydown", e => {
    if (app.view() !== "chrono" || !CR || document.querySelector("dialog[open]")) return;
    if (e.key === "Escape") { $("#crQuit").click(); return; }
    const k = "1234".indexOf(e.key);
    if (k >= 0) { const b = $$(".cr-opt")[k]; if (b) { e.preventDefault(); b.click(); } }
  });

  app.defView("arena", renderArena);
  app.defView("chrono", renderChrono, { tab: "arena", full: true });
  app.defView("cfinish", renderEnd, { tab: "arena", full: true });
}
