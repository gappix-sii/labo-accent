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

export function mountHome(root, S) {
  const P = S.progress;
  const persist = () => save(S);

  function draw() {
    const now = Date.now(), lv = levelOf(P.xp), streak = streakNow(P, now), today = todayXp(P, now);
    const n = practiceCounts(S);
    const next = LESSONS.findIndex((_, i) => { const st = lessonState(P, i); return st.open && st.done === 0; });
    render(root, html`
      <section class="card stats">
        <div class="stat"><b>Niveau ${lv.level}</b><progress max="${lv.need}" value="${lv.into}"></progress>
          <span class="muted small">${lv.into} / ${lv.need} XP · ${P.xp} XP en tout</span></div>
        <div class="stat"><b>${streak ? `🔥 ${streak} jour${streak > 1 ? "s" : ""} d'affilée` : "Pas de série en cours"}</b>
          <span class="muted small">Atteins l'objectif du jour pour faire avancer la série.</span></div>
        <div class="stat"><b>Objectif du jour ${today >= P.goal ? "✓" : ""}</b><progress max="${P.goal}" value="${Math.min(today, P.goal)}"></progress>
          <span class="muted small">${today} / ${P.goal} XP aujourd'hui</span>
          <span class="kind">${GOALS.map((g) => html`<button class="chip${g === P.goal ? " on" : ""}" data-act="goal" data-goal="${g}" type="button" aria-pressed="${g === P.goal ? "true" : "false"}">${g} XP</button>`)}</span></div>
      </section>
      <button class="btn choice comp-home" data-act="companion" type="button"><span class="comp-mini">${avatarSvg(S.game.avatar)}</span>
        <span><b>${S.game.avatar.name}</b><span class="small"> · ton compagnon : change-le, habille-le</span></span></button>
      <p class="row"><button class="btn soft" data-act="shop" type="button">🛒 Boutique · <b>${S.game.coins} 🪙</b></button>
        <button class="btn${S.game.chests.length ? "" : " soft"}" data-act="chests" type="button">🎁 Coffres${S.game.chests.length ? ` · ${S.game.chests.length} à ouvrir` : ""}</button></p>
      ${next >= 0 ? html`<button class="btn big" data-act="open" data-id="${LESSONS[next].id}" type="button">▶ Continuer : ${LESSONS[next].title}</button>` : ""}
      <section class="card">
        <h2>Parcours</h2>
        <ol class="path">${LESSONS.map((l, i) => {
          const st = lessonState(P, i), icon = l.kind === "sound" ? "🔊" : "💬";
          const status = !st.open ? "🔒" : st.done ? `✓${st.done > 1 ? ` ×${st.done}` : ""}` : st.run ? `${st.run} / ${l.items.length}` : "";
          return html`<li><button class="lesson${st.open ? "" : " locked"}${st.done ? " done" : ""}" data-act="open" data-id="${l.id}" type="button" ${st.open ? "" : "disabled"}>
            <span>${icon} ${l.title}</span><span class="muted small">${status}</span></button></li>`;
        })}</ol>
      </section>
    `);
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "goal") { if (setGoal(P, Number(el.dataset.goal))) { persist(); draw(); } }
    if (act === "open" && IDS.includes(el.dataset.id) && lessonState(P, IDS.indexOf(el.dataset.id)).open) location.hash = "#lecon/" + el.dataset.id;
    if (act === "bench") location.hash = "#banc";
    if (act === "style") location.hash = "#style";
    if (act === "settings") location.hash = "#reglages";
    if (act === "vocab") location.hash = "#vocab";
    if (act === "listen") location.hash = "#ecoute";
    if (act === "grammar") location.hash = "#grammaire";
    if (act === "mistakes") location.hash = "#fautes";
    if (act === "roles") location.hash = "#role";
    if (act === "chat") location.hash = "#discussion";
    if (act === "companion") location.hash = "#compagnon";
    if (act === "shop") location.hash = "#boutique";
    if (act === "chests") location.hash = "#coffres";
  });

  draw();
  return () => {};
}
