// Verbes irréguliers : fiches par familles de sons, et trois mini-jeux inspirés des méthodes les mieux notées :
// - Trio : un memory où l'on retrouve les 3 formes d'un même verbe (comme le jeu de cartes « Idem Mory ») ;
// - Verb Rush : 60 secondes de phrases à trous, avec la faute classique (« goed ») parmi les choix ;
// - Écris la forme : compléter des phrases au clavier (l'écrit ancre la mémoire).
// Chaque réponse fait avancer la répétition espacée du verbe (comme les mots de vocabulaire).
import { html, render, $, $$, setVar } from "../core/dom.js";
import { FAMILIES, VERBS, verbCardId, FORM_LABEL, variants, targetOf, cloze, fakeRegular } from "../irregular.js";
import { avatarSvg } from "../avatar.js";
import * as G from "../game.js";
import * as M from "../meta.js";
import { PROGRESS } from "../core/economy.js";
import * as FX from "../fx.js";

const shuffle = (a, rng = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const famOf = id => FAMILIES.find(f => f.id === id) || FAMILIES[0];
const forms3 = x => [x.base, x.past, x.pp];
const sayForms = x => [x.base, ...variants(x.past), ...variants(x.pp)].join(", ");
const RUSH_MS = 60000;

export function setupVerbs(app) {
  const S = () => app.S;
  let fam = "stars", mask = "", T = null, R = null, W = null;
  const status = x => G.vocabStatus(S().vocab[verbCardId(x)]);
  const grade = (x, ok) => { const s = S(), id = verbCardId(x); s.vocab[id] = G.gradeVocab(s.vocab[id], ok, app.today()); };
  const quit = async back => { if (await app.confirmDlg("Quitter ?", "Tu perdras l'XP de la partie en cours.", "Quitter")) { stopRush(); app.go(back || "verbs"); } };
  const irr = id => S().irr[id] || { rush: 0, write: 0, d: app.today() };
  // Verbes à travailler en priorité : nouveaux et fragiles d'abord, puis le reste, un peu mélangés.
  const weakFirst = list => shuffle(list).sort((a, b) => { const r = x => ({ new: 1, learning: 0, mastered: 2 })[status(x)]; return r(a) - r(b); });

  // ---------- Fiches ----------
  function renderHome() {
    const f = famOf(fam), s = S(), mastered = VERBS.filter(x => status(x) === "mastered").length, best = irr(f.id);
    const cell = (x, k, form) => mask === form ? html`<button class="vf-hide" data-rev="${x.base}:${form}" aria-label="Révéler le ${FORM_LABEL[form]} de ${x.base}">?</button>` : html`<b>${k}</b>`;
    render($("#view"), html`${app.learnTabs("verbs")}
      <h2>Verbes irréguliers</h2>
      <section class="card"><div class="row between"><h3>Ta collection</h3><span class="xpfloat">${mastered}/${VERBS.length}</span></div>
        <div class="bar"><i data-css="--p:${Math.round(mastered / VERBS.length * 100)}%"></i></div>
        <p class="small muted">La méthode qui marche : apprendre par <b>familles de sons</b> (pas par ordre alphabétique), toujours avec les 3 formes, puis les utiliser dans des phrases. Les verbes ratés reviennent plus souvent.</p></section>
      <div class="chips" role="tablist" aria-label="Famille">${FAMILIES.map(x => { const n = x.verbs.filter(y => status(y) === "mastered").length; return html`<button class="chip ${x.id === f.id ? "on" : ""}" role="tab" aria-selected="${x.id === f.id}" data-fam="${x.id}">${x.short} <span class="small">${n}/${x.verbs.length}</span></button>`; })}</div>
      <section class="card glow vfam">
        <h3>${f.title}</h3>
        <button class="vf-tune" id="vfTune" aria-label="Écouter la musique de la famille">${app.ICON.spk}<span>${f.tune}</span></button>
        <p class="small">${f.tip}</p>
        <div class="vf-games">
          <button class="vgame trio" id="vgTrio"><b>Trio</b><span>Retrouve les 3 formes</span></button>
          <button class="vgame rush" id="vgRush"><b>Verb Rush</b><span>60 s · record ${best.rush}</span></button>
          <button class="vgame write" id="vgWrite"><b>Écris la forme</b><span>${best.write ? `meilleur : ${best.write} %` : "8 phrases"}</span></button>
          <button class="vgame say" id="vgSay"><b>Au micro</b><span>Prononce les phrases</span></button>
        </div></section>
      <section class="card"><div class="row between"><h3>Les ${f.verbs.length} verbes</h3>
        <div class="seg mini" role="group" aria-label="Cacher une colonne">${[["", "Tout"], ["past", "Cacher prétérit"], ["pp", "Cacher participe"]].map(([m, t]) => html`<button class="${mask === m ? "on" : ""}" data-mask="${m}">${t}</button>`)}</div></div>
        <div class="vf-head"><span></span><span>infinitif</span><span>prétérit</span><span>participe</span></div>
        <div class="vflist">${f.verbs.map((x, i) => { const st = status(x); return html`<div class="vfrow" data-css="--i:${Math.min(i, 12)}">
          <div class="bx-say"><button class="iconbtn" data-sayv="${x.base}" aria-label="Écouter ${x.base}">${app.ICON.spk}</button><button class="iconbtn slow" data-slowv="${x.base}" aria-label="Écouter lentement">${app.ICON.slow}</button></div>
          <div class="vf-forms"><b>${x.base}</b>${cell(x, x.past, "past")}${cell(x, x.pp, "pp")}</div>
          <div class="vf-meta"><span class="muted">${x.fr}</span>${st === "new" ? "" : html`<span class="pill sm ${st === "mastered" ? "good" : "ok"}">${st === "mastered" ? "maîtrisé" : "en cours"}</span>`}<br>
            <span class="frpron">« ${x.pron.join(" · ")} »</span>${x.note ? html`<p class="small bx-note">${x.note}</p>` : ""}
            <p class="small vf-ex">${x.ps.en}<br>${x.pps.en}</p></div></div>`; })}</div></section>`);
    app.bindLearnTabs();
    const byBase = Object.fromEntries(f.verbs.map(x => [x.base, x]));
    $$("[data-fam]").forEach(b => b.onclick = () => { app.play("tap"); fam = b.dataset.fam; renderHome(); });
    $$("[data-mask]").forEach(b => b.onclick = () => { app.play("tap"); mask = b.dataset.mask; renderHome(); });
    $$("[data-rev]").forEach(b => b.onclick = () => { const [base, form] = b.dataset.rev.split(":"), x = byBase[base]; b.replaceWith(Object.assign(document.createElement("b"), { textContent: x[form], className: "vf-shown" })); app.speakEn(variants(x[form]).join(", ")); });
    $$("[data-sayv]").forEach(b => b.onclick = () => app.speakEn(sayForms(byBase[b.dataset.sayv]), 0.85));
    $$("[data-slowv]").forEach(b => b.onclick = () => app.speakEn(sayForms(byBase[b.dataset.slowv]), S().slow));
    $("#vfTune").onclick = () => app.speakEn(f.verbs.slice(0, 3).map(sayForms).join(". "), 0.85);
    $("#vgTrio").onclick = () => { app.play("tap"); startTrio(f); };
    $("#vgRush").onclick = () => { app.play("tap"); startRush(f); };
    $("#vgWrite").onclick = () => { app.play("tap"); startWrite(f); };
    $("#vgSay").onclick = () => { app.play("tap"); app.startLesson({ id: null, kind: "irr-" + f.id, title: f.title, items: shuffle(f.verbs.flatMap(x => [x.ps, x.pps])).slice(0, 8).map(s => ({ en: s.en, fr: s.fr })) }); };
  }

  // ---------- Trio (memory) ----------
  function startTrio(f) {
    const picked = [], used = new Set();
    for (const x of weakFirst(f.verbs)) { const fs = forms3(x); if (picked.length < 4 && !fs.some(t => used.has(t))) { picked.push(x); fs.forEach(t => used.add(t)); } }
    const cards = shuffle(picked.flatMap(x => ["base", "past", "pp"].map(slot => ({ v: x, slot, text: x[slot], up: false, done: false }))));
    T = { f, verbs: picked, cards, open: [], moves: 0, found: 0, t0: Date.now(), lock: false, startLevel: app.levelNow().level };
    app.go("vtrio");
  }
  function renderTrio() {
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${app.ICON.close}</button><h3 class="grow">Trio · ${T.f.short}</h3><span class="pill" id="trMoves">${T.moves} coup${T.moves > 1 ? "s" : ""}</span></div>
      <div class="coach"><div class="av live">${avatarSvg(S().avatar)}</div><div class="bubble">Retourne 3 cartes : les 3 formes du même verbe (infinitif, prétérit, participe).</div></div>
      <div class="trio-grid">${T.cards.map((c, k) => html`<button class="tcard" data-k="${k}" aria-label="Carte ${k + 1}"><span class="tc-back">?</span><span class="tc-face"><b>${c.text}</b><small>${FORM_LABEL[c.slot]}</small></span></button>`)}</div>
      <p class="small muted center">Astuce : récite à voix haute « ${T.verbs[0].base}, ${T.verbs[0].past}, ${T.verbs[0].pp} » : la musique aide à retenir.</p>`);
    $("#quit").onclick = () => quit();
    $$(".tcard").forEach(b => b.onclick = () => flip(+b.dataset.k, b));
  }
  function flip(k, el) {
    const c = T.cards[k];
    if (T.lock || c.up || c.done) return;
    c.up = true; el.classList.add("up"); app.play("tap");
    T.open.push(k);
    if (T.open.length < 3) return;
    T.moves++; $("#trMoves").textContent = `${T.moves} coup${T.moves > 1 ? "s" : ""}`;
    const [a, b, d] = T.open.map(i => T.cards[i]);
    const ok = a.v === b.v && b.v === d.v && new Set([a.slot, b.slot, d.slot]).size === 3;
    const els = T.open.map(i => $(`.tcard[data-k="${i}"]`));
    T.open = [];
    if (ok) {
      [a, b, d].forEach(c2 => { c2.done = true; }); els.forEach(e => e.classList.add("done"));
      T.found++; grade(a.v, true);
      app.play("great"); app.haptic("good"); FX.floatText(`${a.v.base} · ${a.v.past} · ${a.v.pp}`, els[1], "gold");
      app.speakEn(sayForms(a.v), 0.9);
      if (T.found === T.verbs.length) setTimeout(finishTrio, 1100);
    } else {
      T.lock = true; app.play("bad"); els.forEach(e => e.classList.add("no"));
      setTimeout(() => { [a, b, d].forEach(c2 => { c2.up = false; }); els.forEach(e => e.classList.remove("up", "no")); T.lock = false; }, 950);
    }
  }
  function finishTrio() {
    const n = T.verbs.length, sec = Math.round((Date.now() - T.t0) / 1000), perfect = T.moves <= n + 1;
    const r = app.gainXp(10 + 5 * n + (perfect ? 10 : 0), T.startLevel, { key: "irr:trio:" + T.f.id });
    app.go("done", { title: perfect ? "Mémoire d'éléphant !" : "Trios trouvés !", tiles: [["g", "Trios", `${n}/${n}`], ["c", "Coups", String(T.moves)], ["y", "XP gagnés", "+" + r.xpGained], ["o", "Temps", sec + " s"]],
      line: perfect ? "Presque sans erreur, bravo !" : "Rejoue pour faire moins de coups.", back: "verbs", ...r });
  }

  // ---------- Verb Rush ----------
  function rushQuestion() {
    const rng = R.rng;
    if (!R.queue.length) R.queue = shuffle(R.f.verbs.flatMap(x => [[x, x.ps], [x, x.pps]]), rng);
    const [x, s] = R.queue.pop(), c = cloze(s, x);
    const pool = [...new Set([x.base, ...variants(x.past), ...variants(x.pp), fakeRegular(x.base)])].filter(t => t.toLowerCase() !== c.answer.toLowerCase());
    let opts = [c.answer, ...shuffle(pool, rng).slice(0, 3)];
    for (let guard = 0; opts.length < 4 && guard < 50; guard++) { const y = R.f.verbs[Math.floor(rng() * R.f.verbs.length)], t = [y.past, y.pp][Math.floor(rng() * 2)].split("/")[0].trim(); if (!opts.includes(t)) opts.push(t); }
    return { x, s, c, opts: shuffle(opts, rng), t0: Date.now() };
  }
  // opts.seed : même suite de questions que l'ami (duel).
  function startRush(f, opts = {}) {
    R = { f, queue: [], duel: !!opts.duel, rng: opts.duel ? M.mulberry32(opts.seed >>> 0) : Math.random, score: 0, combo: 0, maxCombo: 0, ok: 0, n: 0, end: Date.now() + (app.TEST_LOCAL && app.params.has("fast") ? 8000 : RUSH_MS), timer: null, busy: false, startLevel: app.levelNow().level, prev: irr(f.id).rush };
    R.q = rushQuestion();
    app.go("vrush");
    R.timer = setInterval(tick, 200);
  }
  function stopRush() { if (R && R.timer) { clearInterval(R.timer); R.timer = null; } }
  function tick() {
    if (!R || app.view() !== "vrush") return stopRush();
    const left = Math.max(0, R.end - Date.now()), bar = $("#rsBar"), t = $("#rsTime");
    if (bar) setVar(bar, "--p", `${(left / RUSH_MS * 100).toFixed(1)}%`);
    if (t) t.textContent = Math.ceil(left / 1000) + " s";
    if (!left) finishRush();
  }
  function renderRush() {
    const q = R.q;
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${app.ICON.close}</button><div class="bar rush-bar"><i id="rsBar" data-css="--p:100%"></i></div><span class="combo" id="rsTime">60 s</span></div>
      <div class="rush-hud"><span class="pill">Score <b id="rsScore">${R.score}</b></span><span class="pill ${R.combo >= 3 ? "good" : ""}" id="rsCombo">Combo ×${M.chronoMult(R.combo)}</span></div>
      <section class="card center rush-q" id="rsQ">
        <p class="small muted">${q.s.fr}</p>
        <p class="rush-sent">${q.c.before}<span class="blank">${"_____"}</span>${q.c.after}</p>
        <p class="small muted">(${q.x.base} → ${FORM_LABEL[q.s.form]})</p>
        <div class="bq-opts">${q.opts.map(o => html`<button class="btn ghost bq-opt" data-ro="${o}">${o}</button>`)}</div>
      </section>`);
    $("#quit").onclick = () => quit();
    $$("[data-ro]").forEach(b => b.onclick = () => answerRush(b.dataset.ro, b));
    tick();
  }
  function answerRush(o, btn) {
    if (R.busy || !R.timer) return;
    R.busy = true;
    const q = R.q, ok = o.toLowerCase() === q.c.answer.toLowerCase(), p = M.chronoPoints(ok, R.combo, Date.now() - q.t0);
    R.n++; grade(q.x, ok);
    if (ok) { R.ok++; R.score += p.pts; R.combo = p.combo; R.maxCombo = Math.max(R.maxCombo, R.combo); app.play(R.combo >= 3 ? "great" : "good"); FX.floatText("+" + p.pts, btn, "gold"); }
    else { R.combo = 0; app.play("bad"); app.haptic("bad"); }
    $$("[data-ro]").forEach(b => { b.disabled = true; if (b.dataset.ro.toLowerCase() === q.c.answer.toLowerCase()) b.classList.add("good"); else if (b === btn) b.classList.add("bad"); });
    const sent = $(".rush-sent .blank"); if (sent) { sent.textContent = q.c.answer; sent.classList.add(ok ? "ok" : "ko"); }
    setTimeout(() => { R.busy = false; if (!R.timer) return; R.q = rushQuestion(); renderRush(); }, ok ? 550 : 1500);
  }
  function finishRush() {
    if (!R || !R.timer) return;
    stopRush();
    const s = S(), cur = irr(R.f.id), record = R.score > R.prev && R.prev > 0;
    s.irr[R.f.id] = { ...cur, rush: Math.max(cur.rush, R.score), d: app.today() };
    const rw = M.chronoRewards(R.score, R.ok);
    const r = app.gainXp(rw.xp, R.startLevel, { coins: rw.coins, reason: "chrono", key: "irr:rush:" + R.f.id + (R.duel ? ":duel" : ""), progress: record && !R.duel ? M.CHRONO_RECORD : 0, why: `record Verb Rush ${R.score}` });
    if (R.duel) return app.social.duelFinished({ score: R.score, ok: R.ok, n: R.n, g: r });
    app.go("done", { title: record ? "Nouveau record !" : "Temps écoulé !", tiles: [["y", "Score", String(R.score)], ["g", "Bonnes réponses", `${R.ok}/${R.n}`], ["c", "Meilleur combo", "×" + M.chronoMult(R.maxCombo)], ["o", "XP gagnés", "+" + r.xpGained]],
      line: R.ok >= R.n * 0.8 ? "Tu les as dans la peau !" : "Les erreurs reviendront plus souvent : rejoue pour battre ton score.", back: "verbs", ...r });
  }

  // ---------- Écris la forme ----------
  function startWrite(f) {
    const qs = weakFirst(f.verbs).flatMap(x => shuffle([[x, x.ps], [x, x.pps]]).slice(0, 1));
    const extra = shuffle(f.verbs.flatMap(x => [[x, x.ps], [x, x.pps]])).filter(([x, s]) => !qs.some(([y, t]) => t === s));
    W = { f, qs: [...qs, ...extra].slice(0, 8), i: 0, ok: 0, done: false, startLevel: app.levelNow().level };
    app.go("vwrite");
  }
  function renderWrite() {
    const [x, s] = W.qs[W.i], c = cloze(s, x);
    render($("#view"), html`
      <div class="ltop"><button class="iconbtn" id="quit" aria-label="Quitter">${app.ICON.close}</button><div class="bar"><i data-css="--p:${W.i / W.qs.length * 100}%"></i></div><span class="combo">${W.i + 1}/${W.qs.length}</span></div>
      <div class="coach"><div class="av live">${avatarSvg(S().avatar)}</div><div class="bubble">Écris la bonne forme de <b>${x.base}</b> (${FORM_LABEL[s.form]}).</div></div>
      <section class="card center">
        <p class="small muted">${s.fr}</p>
        <form id="vwForm" class="vw-sent"><span>${c.before}</span><input id="vwIn" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="20" aria-label="La forme du verbe ${x.base}" size="${Math.max(5, c.answer.length + 1)}"><span>${c.after}</span>
          <div class="vw-actions"><button class="btn green" id="vwOk">Valider</button></div></form>
        <div id="vwRes"></div></section>`);
    $("#quit").onclick = () => quit();
    W.done = false;
    $("#vwForm").onsubmit = e => { e.preventDefault(); const v = $("#vwIn").value.trim(); if (v) answerWrite(v); };
    setTimeout(() => { const i = $("#vwIn"); if (i) i.focus(); }, 50);
  }
  function answerWrite(v) {
    if (W.done) return;
    W.done = true;
    const [x, s] = W.qs[W.i], t = targetOf(s, x), ok = v.toLowerCase() === t.toLowerCase();
    if (ok) W.ok++;
    grade(x, ok); app.play(ok ? "great" : "bad"); app.haptic(ok ? "good" : "bad");
    $("#vwIn").disabled = true; $("#vwOk").disabled = true; $("#vwIn").classList.add(ok ? "ok" : "ko");
    const low = v.toLowerCase(), regular = !ok && [fakeRegular(x.base), x.base + "ed", x.base + "d"].includes(low);
    render($("#vwRes"), html`<div class="bq-fb ${ok ? "ok" : "ko"}"><b>${ok ? "Bravo !" : `La bonne forme : ${t}`}</b>
      ${regular ? html`<p class="small">« ${v} » n'existe pas : ${x.base} est irrégulier, il ne prend pas -ed.</p>` : ""}
      <p><b>${x.base} · ${x.past} · ${x.pp}</b> <span class="muted">(${x.fr})</span></p><p class="frpron">« ${x.pron.join(" · ")} »</p>
      <p>${s.en}</p>
      <div class="row"><button class="btn cyan sm" id="vwListen">${app.ICON.spk}Écouter la phrase</button></div>
      <button class="btn ${ok ? "green" : "orange"} block" id="vwNext">${W.i + 1 < W.qs.length ? "Suivant" : "Terminer"}</button></div>`);
    app.speakEn(s.en, 0.9);
    $("#vwListen").onclick = () => app.speakEn(s.en, 0.9);
    $("#vwNext").onclick = nextWrite; $("#vwNext").focus();
  }
  function nextWrite() {
    W.i++;
    if (W.i < W.qs.length) return renderWrite();
    const s = S(), cur = irr(W.f.id), pct = Math.round(W.ok / W.qs.length * 100), first = pct >= 80 && cur.write < 80;
    s.irr[W.f.id] = { ...cur, write: Math.max(cur.write, pct), d: app.today() };
    const r = app.gainXp(W.ok * 4 + 10, W.startLevel, { key: "irr:write:" + W.f.id, progress: first ? PROGRESS.firstDialogue : 0, why: `${W.f.title} : ${pct} %` });
    app.go("done", { title: pct >= 80 ? "Bien écrit !" : "Exercice terminé", tiles: [["g", "Bonnes réponses", `${W.ok}/${W.qs.length}`], ["c", "Réussite", pct + "%"], ["y", "XP gagnés", "+" + r.xpGained], ["o", "Pièces", "+" + r.coins]],
      line: pct >= 80 ? "Ces verbes n'ont plus de secret pour toi !" : "Joue au Trio pour bien les retenir, puis réessaie.", back: "verbs", ...r });
  }

  app.startRush = (famId, opts) => startRush(famOf(famId), opts);
  app.defView("verbs", renderHome, { tab: "vocab" });
  app.defView("vtrio", renderTrio, { tab: "vocab", full: true });
  app.defView("vrush", renderRush, { tab: "vocab", full: true });
  app.defView("vwrite", renderWrite, { tab: "vocab", full: true });
}
