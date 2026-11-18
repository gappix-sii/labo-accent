// Écran d'accueil (#accueil) : niveau, série de jours, objectif du jour et parcours de leçons.
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { levelOf, streakNow, todayXp, setGoal, unlocked, GOALS } from "../core/progress.js";
import { LESSONS } from "../content/lessons.js";
import { buildQueue } from "./vocab.js";
import { QUESTIONS } from "../core/listening.js";
import { trackState, grammarKey, roleKey, MISTAKE_SESSION } from "../core/tracks.js";
import { GRAMMAR } from "../content/grammar.js";
import { DIALOGUES } from "../content/dialogues.js";
import { avatarSvg } from "../content/avatar.js";

const IDS = LESSONS.map((l) => l.id);

// État d'une leçon du parcours, pour l'affichage.
export function lessonState(P, index) {
  const l = LESSONS[index], L = Object.hasOwn(P.lessons, l.id) ? P.lessons[l.id] : null;
  if (!unlocked(P, IDS, index)) return { open: false, done: 0, run: 0 };
  return { open: true, done: L ? L.done : 0, run: L ? L.run.length : 0 };
}

// Vocabulaire du jour : mots à revoir et nouveaux mots encore disponibles aujourd'hui.
export function vocabToday(R, now = Date.now()) {
  const q = buildQueue(R, now), fresh = q.filter((x) => x.fresh).length;
  return { review: q.length - fresh, fresh };
}

export function vocabLabel({ review, fresh }) {
  if (!review && !fresh) return "rien à revoir aujourd'hui ✓";
  const parts = [];
  if (review) parts.push(`${review} mot${review > 1 ? "s" : ""} à revoir`);
  if (fresh) parts.push(`${fresh} nouveau${fresh > 1 ? "x" : ""}`);
  return parts.join(" · ");
}

// Avancement des entraînements de la phase 4, pour les boutons de l'accueil.
export function practiceCounts(S) {
  return {
    grammar: GRAMMAR.filter((g) => trackState(S.progress, grammarKey(g.id)).done > 0).length,
    roles: DIALOGUES.filter((d) => trackState(S.progress, roleKey(d.id)).done > 0).length,
    mistakes: Object.keys(S.mistakes.miss).length
  };
}

// Régions de la carte (phase 8, tâche 3) : les leçons du parcours, 6 par région, comme les étapes d'un voyage.
export const REGIONS = [["🏡", "Le Village"], ["🌲", "La Forêt"], ["⛰️", "Les Collines"], ["🌊", "La Rivière"], ["🏔️", "La Montagne"], ["🏰", "Le Château"]];
export const PER_REGION = 6;
const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1]; // décalage des étapes à gauche et à droite du chemin

// Quête du jour : l'objectif du jour et sa récompense (la série qui avance). Fonction pure, testée.
export function dailyQuest(P, now = Date.now()) {
  const today = todayXp(P, now), streak = streakNow(P, now), done = today >= P.goal;
  return { today, goal: P.goal, pct: Math.min(100, Math.round((today / P.goal) * 100)), done, streak, next: done ? streak : streak + 1 };
}
// État d'une étape de la carte : "done" (finie), "current" (la prochaine à faire), "open", "locked".
export function nodeState(P, i, next) {
  const st = lessonState(P, i);
  return !st.open ? "locked" : i === next ? "current" : st.done ? "done" : "open";
}

export function mountHome(root, S) {
  const P = S.progress;
  const persist = () => save(S);
  let scrolled = false;

  function draw() {
    const now = Date.now(), q = dailyQuest(P, now);
    const next = LESSONS.findIndex((_, i) => { const st = lessonState(P, i); return st.open && st.done === 0; });
    const regions = REGIONS.map((r, k) => ({ icon: r[0], name: r[1], from: k * PER_REGION, lessons: LESSONS.slice(k * PER_REGION, (k + 1) * PER_REGION) })).filter((r) => r.lessons.length);
    render(root, html`
      <section class="card quest daily${q.done ? " done" : ""}"><span class="quest-title">Quête du jour</span>
        <h2>${q.done ? "Quête accomplie !" : `Gagne ${q.goal} XP aujourd'hui`}</h2>
        <div class="bar${q.done ? " good" : ""}" data-css="${`--p:${q.pct}%`}"><i></i></div>
        <p class="row"><span><b>${q.today}</b> / ${q.goal} XP</span>
          <span class="${q.done ? "" : "muted"}">${q.done ? `🔥 ${q.streak} jour${q.streak > 1 ? "s" : ""} d'affilée` : `Récompense : 🔥 série à ${q.next} jour${q.next > 1 ? "s" : ""}`}</span></p>
        <p class="kind">${GOALS.map((g) => html`<button class="chip${g === P.goal ? " on" : ""}" data-act="goal" data-goal="${g}" type="button" aria-pressed="${g === P.goal ? "true" : "false"}">${g} XP</button>`)}</p>
      </section>
      ${next >= 0 ? html`<button class="btn big" data-act="open" data-id="${LESSONS[next].id}" type="button">▶ Continuer : ${LESSONS[next].title}</button>` : html`<p class="card quest"><span class="quest-title">Bravo</span> Tout le parcours est fini ! Refais tes leçons préférées pour gagner encore des XP.</p>`}
      ${regions.map((r) => {
        const open = lessonState(P, r.from).open, finished = r.lessons.every((_, j) => lessonState(P, r.from + j).done > 0);
        return html`<section class="card region${open ? "" : " locked"}">
          <h2 class="region-title"><span aria-hidden="true">${r.icon}</span> ${r.name} <span class="muted small">${finished ? "✓ terminée" : open ? "" : "🔒"}</span></h2>
          <ol class="map">${r.lessons.map((l, j) => {
            const i = r.from + j, st = lessonState(P, i), state = nodeState(P, i, next), icon = l.kind === "sound" ? "🔊" : "💬";
            const status = state === "locked" ? "verrouillée" : st.done ? `finie${st.done > 1 ? ` ${st.done} fois` : ""}` : st.run ? `${st.run} / ${l.items.length}` : state === "current" ? "à toi de jouer !" : "à faire";
            const z = ZIGZAG[i % ZIGZAG.length];
            return html`<li class="${`node-wrap z${z < 0 ? "m" + -z : z}`}">
              <button class="${`node ${state}`}" data-act="open" data-id="${l.id}" type="button" ${state === "locked" ? "disabled" : ""} aria-label="${`${l.title} : ${status}`}">
                <span aria-hidden="true">${state === "locked" ? "🔒" : st.done ? "★" : icon}</span>${st.done > 1 ? html`<b class="node-n" aria-hidden="true">×${st.done}</b>` : ""}</button>
              ${state === "current" ? html`<span class="node-me" aria-hidden="true">${avatarSvg(S.game.avatar, { label: "" })}</span>` : ""}
              <span class="node-label" aria-hidden="true">${l.title}<span class="small muted">${status}</span></span></li>`;
          })}</ol></section>`;
      })}
    `);
    // Au premier affichage, la carte défile jusqu'à l'étape en cours (36 étapes : sinon il faudrait la chercher).
    // (juste après : l'appli remet d'abord la page en haut à chaque changement d'écran)
    if (!scrolled) { scrolled = true; setTimeout(() => { const cur = root.querySelector(".node.current"); if (cur && cur.isConnected && cur.scrollIntoView && next > 2) cur.scrollIntoView({ block: "center" }); }, 0); }
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "goal") { if (setGoal(P, Number(el.dataset.goal))) { persist(); draw(); } }
    if (act === "open" && IDS.includes(el.dataset.id) && lessonState(P, IDS.indexOf(el.dataset.id)).open) location.hash = "#lecon/" + el.dataset.id;
  });

  draw();
  return () => {};
}
