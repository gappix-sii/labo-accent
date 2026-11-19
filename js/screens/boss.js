// Combat de boss (#boss/<région>, phase 9, tâche 4) : le boss d'une région, une fois ses 4 leçons finies.
// Présentation → 10 attaques (phrase à dire, « Quel mot entends-tu ? », « Dis-le en anglais ») → victoire ou défaite.
// Une seule tentative par attaque (« Je n'ai rien entendu » ne compte pas). Règles : js/core/boss.js.
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { newFight, currentAttack, attack, finishFight, canFight, wins, wonSet, HEARTS, BOSS_HP, HIT_MIN, CRIT, ATTACKS, XP_FIRST_WIN } from "../core/boss.js";
import { REGIONS, regionById } from "../content/regions.js";
import { bossOf, bossSvg } from "../content/bosses.js";
import { PAIRS } from "../content/pairs.js";
import { say, preload, stopVoice } from "../engine/clips.js";
import { practice, resultBlock, progressBar } from "./practice.js";
import { listenControls } from "./listen.js";

const KIND = { say: "Dis cette phrase !", listen: "Quel mot entends-tu ?", translate: "Dis-le en anglais !" };

export function mountBoss(root, S, regionId) {
  const region = regionById(regionId), boss = bossOf(regionId);
  if (!region || !boss) { location.hash = "#accueil"; return () => {}; }
  const persist = () => save(S);
  // phase : "intro" (présentation), "fight" (attaque en cours), "end" (victoire ou défaite)
  const ui = { phase: "intro", F: null, a: null, out: null, last: null, picked: null, line: boss.line, reward: null, error: "" };
  let alive = true, panelKey = "";
  const open = () => canFight(S.progress, region.id, wonSet(S.bosses)); // région finie et boss d'avant vaincu

  const hearts = (n) => html`<span class="hearts" role="img" aria-label="${`${n} cœur${n > 1 ? "s" : ""} sur ${HEARTS}`}">${Array.from({ length: HEARTS }, (_, i) => (i < n ? "❤️" : "🖤")).join("")}</span>`;
  // Le panneau du boss est dessiné à part, et seulement quand il change (relecture de la phase 9, n° 1 et 3) :
  // sinon chaque redessin (préparation du moteur, micro) relancerait ses animations depuis le début.
  function drawPanel() {
    const state = ui.phase === "end" ? (ui.F.over === "won" ? "ko" : "idle") : ui.out && ui.out.dmg ? "hit" : "idle";
    const hp = ui.F ? ui.F.hp : BOSS_HP, n = ui.F ? ui.F.hearts : HEARTS, w = wins(S.bosses, region.id);
    const key = JSON.stringify([state, hp, n, ui.line, ui.out && ui.out.dmg, ui.out && ui.out.crit, ui.phase, w, ui.F && ui.F.i]);
    if (key === panelKey) return;
    panelKey = key;
    render(top, bossPanel(state, hp, n, w));
  }
  function bossPanel(state, hp, n, w) {
    const pct = Math.round((hp / BOSS_HP) * 100);
    return html`<section class="${`card quest boss-panel${ui.phase === "fight" ? " fighting" : ""}`}"><span class="quest-title">${`${region.icon} ${region.name}`}</span>
      ${w ? html`<p class="muted small boss-wins">👑 vaincu ${w} fois</p>` : ""}
      <div class="boss-stage"><span class="boss-big">${bossSvg(region.id, state, { label: "" })}</span>
        ${ui.out && ui.out.dmg ? html`<b class="${`dmg-pop${ui.out.crit ? " crit" : ""}`}" aria-hidden="true">${ui.out.crit ? "CRITIQUE ! " : ""}−${ui.out.dmg}</b>` : ""}</div>
      <h1 class="boss-name">${boss.name}</h1>
      <div class="bar boss-hp" data-css="${`--p:${pct}%`}" role="progressbar" aria-label="Points de vie du boss" aria-valuemin="0" aria-valuemax="${BOSS_HP}" aria-valuenow="${hp}"><i></i></div>
      <p class="row"><span class="small"><b>${hp}</b> / ${BOSS_HP} PV</span>${hearts(n)}</p>
      <p class="boss-line">« ${ui.line} »</p></section>`;
  }

  function attackCard() {
    const a = ui.a, n = ui.F.i - (ui.out ? 1 : 0);
    const head = html`<p class="muted small ex-count">Attaque ${n + 1} / ${ATTACKS}</p>${progressBar(n, ATTACKS, "Avancement du combat")}<h2>${KIND[a.kind]}</h2>`;
    if (a.kind === "listen") {
      const choice = (side) => {
        const w = side === "a" ? a.a : a.b, done = !!ui.out;
        const cls = !done ? "" : side === a.answer ? " right" : side === ui.picked ? " wrong" : "";
        return html`<button class="${`btn choice${cls}`}" data-act="pick" data-side="${side}" type="button" lang="en" ${done ? "disabled" : ""}><b>${w}</b></button>`;
      };
      return html`<section class="card">${head}
        <p class="row start"><button class="btn soft" data-act="hear" type="button">🔊 Écouter</button></p>
        <div class="choices">${choice("a")}${choice("b")}</div></section>`;
    }
    const shown = a.kind === "say" || ui.out;
    return html`<section class="card boss-attack">${head}
      ${a.kind === "translate" ? html`<p class="sentence-fr">${a.fr}</p>` : ""}
      ${shown ? html`<p class="sentence" lang="en">${a.en}</p>${voice.block()}` : html`<p class="muted small">Dis la phrase en anglais au micro. La bonne réponse s'affiche après ton attaque.</p>`}</section>
      ${ui.out ? "" : html`<section class="card">${mic.block()}</section>${mic.errorBlock()}`}`;
  }

  function outcome() {
    const o = ui.out;
    const msg = o.lost ? (ui.a.kind === "listen" ? "Raté : le boss contre-attaque ! −1 ❤️" : `Trop faible (moins de ${HIT_MIN}) : le boss contre-attaque ! −1 ❤️`)
      : o.crit ? `Coup critique ! −${o.dmg} PV` : `Touché ! −${o.dmg} PV`;
    return html`<section class="card" aria-live="polite"><p class="${`feedback${o.lost ? " error" : ""}`}" role="status">${msg}</p>
      ${ui.last ? resultBlock(ui.last, S.game.avatar) : ""}
      <p class="row"><span></span><button class="btn" data-act="next" type="button">${o.over ? "Voir le résultat →" : "Attaque suivante →"}</button></p></section>`;
  }

  function endCard() {
    const won = ui.F.over === "won", r = ui.reward, last = REGIONS[REGIONS.length - 1].id === region.id;
    return won
      ? html`<section class="card quest victory" role="status"><span class="quest-title">Victoire !</span>
          <h2>👑 ${boss.name} est vaincu !</h2>
          <p>${r && r.first ? html`La couronne de la région « <b>${region.name}</b> », <b>+${r.xp} XP</b> et un <b>coffre d'or</b> 🎁. ${last ? "Tu as vaincu le dernier boss du parcours !" : "La région suivante est ouverte !"}` : html`<b>+${r ? r.xp : 0} XP</b>. Tu as déjà sa couronne.`}</p>
          <div class="row start">${r && r.chest ? html`<button class="btn big" data-act="chests" type="button">🎁 Ouvrir le coffre</button>` : ""}
            <button class="btn ghost" data-act="home" type="button">Retour au parcours</button></div></section>`
      : html`<section class="card defeat" role="status"><h2>💥 Défaite…</h2>
          <p>${ui.F.hearts === 0 ? "Tu n'as plus de cœurs." : "Le boss a tenu bon jusqu'à la dernière attaque."} Révise les leçons de la région si tu veux, puis retente : il n'y a pas de limite.</p>
          <div class="row start"><button class="btn big" data-act="start" type="button">⚔️ Retenter</button>
            <button class="btn ghost" data-act="home" type="button">Retour au parcours</button></div></section>`;
  }

  function draw() {
    if (!alive) return;
    const w = wins(S.bosses, region.id);
    drawPanel();
    render(main, html`
      ${ui.phase === "intro" ? html`<section class="card">
          ${open() ? html`<h2>Combat de boss</h2>
              <p>${ATTACKS} attaques : des phrases de la région à dire, des mots à reconnaître à l'oreille, et des phrases à dire en anglais depuis le français.</p>
              <p class="muted small">Ta note fait les dégâts (coup critique dès ${CRIT}). Sous ${HIT_MIN}, ou une mauvaise écoute, le boss te prend un cœur. Une moyenne de 60 suffit pour gagner, si tu évites les notes sous ${HIT_MIN}.${w ? "" : ` Première victoire : la couronne, +${XP_FIRST_WIN} XP et un coffre d'or.`}</p>
              ${mic.ready() ? html`<div class="mic-zone"><button class="btn big" data-act="start" type="button">⚔️ Combattre !</button></div>` : mic.block()}`
            : html`<h2>🔒 Pas encore</h2><p>Pour affronter ${boss.name}, finis d'abord les ${region.lessons.length} leçons de <b>${region.name}</b> et bats les boss des régions d'avant.</p>`}
        </section>${mic.errorBlock()}` : ""}
      ${ui.phase === "fight" ? html`${attackCard()}${ui.out ? outcome() : ""}` : ""}
      ${ui.phase === "end" ? endCard() : ""}
      ${ui.error ? html`<p class="card error" role="alert">${ui.error}</p>` : ""}`);
  }

  async function play(text) {
    ui.error = "";
    try { await say(text, { voice: S.voiceId }); } catch (e) { ui.error = `La lecture a échoué (${e.message}).`; draw(); }
  }
  function warm() {
    const a = ui.a;
    if (!a) return;
    if (a.kind === "listen") { const p = PAIRS.find((x) => x.id === a.pair); if (p) for (const w of [p.a, p.b]) preload(w.en, { voice: S.voiceId }).catch(() => {}); }
    else voice.warm();
  }
  function start() {
    ui.F = newFight(region.id); ui.phase = "fight"; ui.out = null; ui.last = null; ui.picked = null; ui.reward = null; ui.line = boss.line;
    ui.a = currentAttack(ui.F); draw(); warm();
    if (ui.a.kind === "listen") play(ui.a.en);
  }
  // redraw : false quand la note vient du micro (practice redessine une seule fois juste après, relecture n° 1)
  function hitWith(value, redraw = true) {
    ui.out = attack(ui.F, value);
    ui.line = ui.out.lost ? boss.taunt : ui.out.crit || ui.out.dmg >= 80 ? boss.hurt : "Grr… Tu ne m'auras pas si facilement !";
    if (ui.F.over) { ui.reward = finishFight(S, ui.F); persist(); }
    if (redraw) draw();
  }
  function next() {
    voice.stop(); stopVoice();
    if (ui.F.over) { ui.phase = "end"; ui.line = ui.F.over === "won" ? boss.ko : boss.win; ui.out = null; draw(); return; }
    ui.a = currentAttack(ui.F); ui.out = null; ui.last = null; ui.picked = null; mic.clearError(); draw(); warm();
    if (ui.a.kind === "listen") play(ui.a.en);
  }

  const voice = listenControls({ S, persist, draw, text: () => (ui.a ? ui.a.en : "") });
  const mic = practice({
    S, persist, draw, root, speakLabel: "⚔️ Attaquer",
    target: () => ({ text: ui.a.en, focus: [] }),
    onScored: (last) => { if (ui.phase !== "fight" || ui.out) return; ui.last = last; hitWith(last.score, false); }
  });

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (mic.handle(act) || voice.handle(act)) return;
    if (act === "home") location.hash = "#accueil";
    if (act === "chests") location.hash = "#coffres";
    if (act === "start" && open()) start();
    if (act === "hear" && ui.a) play(ui.a.en);
    if (act === "pick" && ui.a && ui.a.kind === "listen" && !ui.out && (el.dataset.side === "a" || el.dataset.side === "b")) { ui.picked = el.dataset.side; hitWith(ui.picked === ui.a.answer); }
    if (act === "next" && ui.out) next();
  });
  root.addEventListener("change", (e) => voice.change(e));

  render(root, html`<p class="row"><button class="btn ghost" data-act="home" type="button">← Parcours</button></p><div class="boss-top"></div><div class="boss-main"></div>`);
  const top = root.querySelector(".boss-top"), main = root.querySelector(".boss-main");
  draw();
  return () => { alive = false; voice.dispose(); mic.dispose(); stopVoice(); };
}
