// Onglet « Parcours » (#accueil) : la quête du jour (objectif du jour) et la carte des leçons.
// Niveau, série et pièces sont dans la barre du haut (js/screens/shell.js).
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { streakNow, todayXp, setGoal, GOALS, starsOf } from "../core/progress.js";
import { wonSet, wins, canFight } from "../core/boss.js";
import { LESSONS } from "../content/lessons.js";
import { REGIONS, lessonOpen, regionCleared, regionStars } from "../content/regions.js";
import { bossOf, bossSvg } from "../content/bosses.js";
import { avatarSvg } from "../content/avatar.js";

const IDS = LESSONS.map((l) => l.id);

// État d'une leçon du parcours, pour l'affichage (verrous : lessonOpen, js/content/regions.js).
export function lessonState(P, index, won = null) {
  const l = LESSONS[index], L = Object.hasOwn(P.lessons, l.id) ? P.lessons[l.id] : null;
  if (!lessonOpen(P, index, won)) return { open: false, done: 0, run: 0 };
  return { open: true, done: L ? L.done : 0, run: L ? L.run.length : 0 };
}

const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1]; // décalage des étapes à gauche et à droite du chemin

// Quête du jour : l'objectif du jour et sa récompense (la série qui avance). Fonction pure, testée.
export function dailyQuest(P, now = Date.now()) {
  const today = todayXp(P, now), streak = streakNow(P, now), done = today >= P.goal;
  return { today, goal: P.goal, pct: Math.min(100, Math.round((today / P.goal) * 100)), done, streak, next: done ? streak : streak + 1 };
}
// Prochaine étape du parcours (fonction pure, testée) : la 1re leçon ouverte pas encore finie, ou le boss d'une région
// finie qui n'est pas encore vaincu (il garde le passage) ; null quand tout est fini.
// Une leçon déjà commencée et pas finie passe d'abord (ancienne sauvegarde : on reprend où on en était, relecture n° 5).
export function nextStep(P, won) {
  for (let i = 0; i < LESSONS.length; i++) {
    const L = Object.hasOwn(P.lessons, LESSONS[i].id) ? P.lessons[LESSONS[i].id] : null;
    if (L && L.done === 0 && L.best.length > 0 && lessonState(P, i, won).open) return { kind: "lesson", index: i };
  }
  for (const r of REGIONS) {
    for (let j = 0; j < r.lessons.length; j++) { const st = lessonState(P, r.from + j, won); if (st.open && st.done === 0) return { kind: "lesson", index: r.from + j }; }
    if (regionCleared(P, r) && !won.has(r.id)) return { kind: "boss", region: r.id };
  }
  return null;
}
// État d'une étape de la carte : "done" (finie), "current" (la prochaine à faire), "open", "locked".
// next : rang de la leçon à faire (-1 si la prochaine étape est un boss ou s'il n'y en a plus).
export function nodeState(P, i, next, won = null) {
  const st = lessonState(P, i, won);
  return !st.open ? "locked" : i === next ? "current" : st.done ? "done" : "open";
}
// État de la case du boss d'une région : "won" (vaincu), "current" (à affronter maintenant), "open", "locked".
export function bossState(P, region, won, step) {
  if (won.has(region.id)) return "won";
  if (!canFight(P, region.id, won)) return "locked";
  return step && step.kind === "boss" && step.region === region.id ? "current" : "open";
}
const starText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

export function mountHome(root, S) {
  const P = S.progress;
  const persist = () => save(S);
  let scrolled = false;

  function draw() {
    const now = Date.now(), q = dailyQuest(P, now), won = wonSet(S.bosses), step = nextStep(P, won);
    const next = step && step.kind === "lesson" ? step.index : -1, nextBoss = step && step.kind === "boss" ? bossOf(step.region) : null;
    render(root, html`
      <h1 class="sr">Parcours</h1>
      <section class="card quest daily${q.done ? " done" : ""}"><span class="quest-title">Quête du jour</span>
        <h2>${q.done ? "Quête accomplie !" : `Gagne ${q.goal} XP aujourd'hui`}</h2>
        <div class="bar${q.done ? " good" : ""}" data-css="${`--p:${q.pct}%`}"><i></i></div>
        <p class="row"><span><b>${q.today}</b> / ${q.goal} XP</span>
          <span class="${q.done ? "" : "muted"}">${q.done ? `🔥 ${q.streak} jour${q.streak > 1 ? "s" : ""} d'affilée` : `Récompense : 🔥 série à ${q.next} jour${q.next > 1 ? "s" : ""}`}</span></p>
        <p class="kind">${GOALS.map((g) => html`<button class="chip${g === P.goal ? " on" : ""}" data-act="goal" data-goal="${g}" type="button" aria-pressed="${g === P.goal ? "true" : "false"}">${g} XP</button>`)}</p>
      </section>
      ${next >= 0 ? html`<button class="btn big" data-act="open" data-id="${LESSONS[next].id}" type="button">▶ Continuer : ${LESSONS[next].title}</button>`
        : nextBoss ? html`<button class="btn big red" data-act="boss" data-id="${step.region}" type="button">⚔️ Affronter ${nextBoss.name}</button>`
          : html`<p class="card quest"><span class="quest-title">Bravo</span> Tout le parcours est fini, tous les boss sont vaincus ! Refais tes leçons préférées pour décrocher les ★★★.</p>`}
      ${REGIONS.map((r) => {
        const open = r.lessons.some((_, j) => lessonState(P, r.from + j, won).open), crown = won.has(r.id), st = regionStars(P, r), bs = bossState(P, r, won, step), b = bossOf(r.id);
        return html`<section class="${`card region${open ? "" : " locked"}${crown ? " crowned" : ""}`}">
          <h2 class="region-title"><span aria-hidden="true">${r.icon}</span> ${r.name} <span class="muted small">${crown ? "👑" : open ? "" : "🔒"}</span>
            <span class="region-stars"><span aria-hidden="true">★ ${st.got}/${st.max}</span><span class="sr">${`, ${st.got} étoiles sur ${st.max}`}</span></span></h2>
          <p class="muted small region-theme">${r.theme}</p>
          <ol class="map">${r.lessons.map((l, j) => {
            const i = r.from + j, st = lessonState(P, i, won), state = nodeState(P, i, next, won), icon = l.kind === "sound" ? "🔊" : "💬";
            const stars = starsOf(P, l.id, l.items.length);
            const status = state === "locked" ? "verrouillée" : st.done ? `finie${st.done > 1 ? ` ${st.done} fois` : ""}, ${stars} étoile${stars > 1 ? "s" : ""} sur 3` : st.run ? `${st.run} / ${l.items.length}` : state === "current" ? "à toi de jouer !" : "à faire";
            const z = ZIGZAG[i % ZIGZAG.length];
            return html`<li class="${`node-wrap z${z < 0 ? "m" + -z : z}`}">
              <button class="${`node ${state}`}" data-act="open" data-id="${l.id}" type="button" ${state === "locked" ? "disabled" : ""} aria-label="${`${l.title} : ${status}`}">
                <span aria-hidden="true">${state === "locked" ? "🔒" : st.done ? "★" : icon}</span>${st.done > 1 ? html`<b class="node-n" aria-hidden="true">×${st.done}</b>` : ""}</button>
              ${state === "current" ? html`<span class="node-me" aria-hidden="true">${avatarSvg(S.game.avatar, { label: "" })}</span>` : ""}
              <span class="node-label" aria-hidden="true">${l.title}${st.done ? html`<span class="stars">${starText(stars)}</span>` : html`<span class="small muted">${status}</span>`}</span></li>`;
          })}
            <li class="node-wrap boss-wrap">
              <button class="${`boss-node ${bs}`}" data-act="boss" data-id="${r.id}" type="button" ${bs === "locked" ? "disabled" : ""}
                aria-label="${`Boss : ${b.name}, ${bs === "won" ? `vaincu ${wins(S.bosses, r.id)} fois` : bs === "locked" ? `finis les ${r.lessons.length} leçons de la région et bats les boss d'avant pour l'affronter` : "à affronter"}`}">
                ${bossSvg(r.id, "idle", { label: "" })}${bs === "won" ? html`<span class="boss-crown" aria-hidden="true">👑</span>` : bs === "locked" ? html`<span class="boss-lock" aria-hidden="true">🔒</span>` : ""}</button>
              <span class="node-label boss-label" aria-hidden="true">${b.name}<span class="small muted">${bs === "won" ? "vaincu !" : bs === "locked" ? "boss de la région" : "⚔️ à affronter !"}</span></span></li>
          </ol></section>`;
      })}
    `);
    // Au premier affichage, la carte défile jusqu'à l'étape en cours (36 étapes : sinon il faudrait la chercher).
    // (juste après : l'appli remet d'abord la page en haut à chaque changement d'écran)
    if (!scrolled) { scrolled = true; setTimeout(() => { const cur = root.querySelector(".node.current, .boss-node.current"); if (cur && cur.isConnected && cur.scrollIntoView && (next > 2 || nextBoss)) cur.scrollIntoView({ block: "center" }); }, 0); }
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "goal") { if (setGoal(P, Number(el.dataset.goal))) { persist(); draw(); } }
    if (act === "open" && IDS.includes(el.dataset.id) && lessonState(P, IDS.indexOf(el.dataset.id), wonSet(S.bosses)).open) location.hash = "#lecon/" + el.dataset.id;
    if (act === "boss" && canFight(P, el.dataset.id, wonSet(S.bosses))) location.hash = "#boss/" + el.dataset.id;
  });

  draw();
  return () => {};
}
