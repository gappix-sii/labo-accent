// Défi « Verbes irréguliers » (phase 10, tâche 4) : #verbes = les 9 familles et leur avancement ;
// #verbes/<famille> = la fiche de la famille, puis ses 3 étapes (règles : js/core/verbs.js), et son mini-boss
// « Le Grimoire » (#grimoire/<famille>, js/screens/boss.js) une fois la famille finie :
//   1. les 3 formes : écouter, puis dire « go, went, gone » ;
//   2. au prétérit et 3. au present perfect : choisir la bonne forme dans la phrase à trou (même affichage que les
//      exercices de grammaire, js/screens/exercises.js), puis dire la phrase. Seule la note au micro rapporte l'XP.
import { html, render } from "../core/dom.js";
import { save } from "../core/store.js";
import { PASS, XP_ITEM, XP_LESSON } from "../core/progress.js";
import { STEPS, familySize, itemOf, textOf, recordVerb, familyState, questionOf, formsText } from "../core/verbs.js";
import { FAMILIES, familyById, tuneLang } from "../content/verbs.js";
import { GRIMOIRE, grimoireSvg } from "../content/bosses.js";
import { familyWins, XP_MINI_FIRST } from "../core/boss.js";
import { say, stopVoice } from "../engine/clips.js";
import { practice, resultBlock, progressBar } from "./practice.js";
import { listenControls } from "./listen.js";
import { exerciseBlock, exerciseClick } from "./exercises.js";
import { firstToDo, nextToDo, dotsBlock } from "./lesson.js";

// Avancement affiché d'une famille : « ✓ ×2 », « 7 / 33 » ou rien.
export function familyStatus(P, fam) {
  const st = familyState(P, fam);
  if (st.done) return `✓${st.done > 1 ? ` ×${st.done}` : ""}${st.run.length ? ` · ${st.run.length} / ${familySize(fam)}` : ""}`;
  return st.run.length ? `${st.run.length} / ${familySize(fam)}` : "";
}

// Question « choisis la bonne forme » sous la forme d'un exercice de grammaire « c » : [c, phrase à trou, choix, bonne, explication].
export function verbExercise(verb, form, rng = Math.random) {
  const q = questionOf(verb, form, rng);
  return ["c", `${q.before}___${q.after}`, q.options, q.options.indexOf(q.right), `${verb.base} → ${verb.past} → ${verb.pp}${verb.note ? ` · ${verb.note}` : ""}`];
}

export function mountVerbList(root, S) {
  const P = S.progress;
  render(root, html`
    <p class="row"><button class="btn ghost" data-act="home" type="button">← Défis</button></p>
    <section class="card"><h1 class="sentence">📜 Verbes irréguliers</h1>
      <p class="muted small">Les 67 verbes les plus utiles, rangés par familles qui se ressemblent à l'oreille. Pour chaque famille : les 3 formes à dire, puis des phrases au prétérit et au present perfect.</p></section>
    <section class="card"><ol class="path">${FAMILIES.map((f) => html`<li><button class="lesson${familyState(P, f).done ? " done" : ""}" data-act="open" data-id="${f.id}" type="button">
      <span><b>${f.title}</b><br><span class="muted small" lang="${tuneLang(f)}">${f.tune}</span></span>
      <span class="muted small">${familyStatus(P, f) || `${f.verbs.length} verbes`}${familyWins(S.bosses, f.id) ? " · 👑" : ""}</span></button></li>`)}</ol></section>`);
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.act === "home") location.hash = "#entrainement";
    if (el.dataset.act === "open" && familyById(el.dataset.id)) location.hash = "#verbes/" + el.dataset.id;
  });
  return () => {};
}

export function mountVerbFamily(root, S, id) {
  const fam = familyById(id), P = S.progress;
  if (!fam) { location.hash = "#verbes"; return () => {}; }
  const n = fam.verbs.length, persist = () => save(S);
  const ui = { view: "learn", step: 0, k: 0, ex: null, say: false, last: null, feedback: "", gained: 0, finished: false };
  const verb = () => fam.verbs[ui.k], item = () => itemOf(fam, ui.step, ui.k);
  const localRun = (step) => familyState(P, fam).run.filter((i) => Math.floor(i / n) === step).map((i) => i % n);
  let alive = true;

  function goTo(step, k) {
    voice.stop(); mic.clearError();
    ui.step = step; ui.k = k; ui.last = null; ui.feedback = ""; ui.finished = false;
    ui.say = step === 0; // étape 1 : on dit tout de suite ; étapes 2 et 3 : on choisit d'abord la forme
    ui.ex = step === 0 ? null : { e: verbExercise(verb(), STEPS[step].id), placed: [], answer: null, right: false };
    if (ui.ex) ui.ex.options = ui.ex.e[2];
    draw();
    if (ui.say) voice.warm();
  }
  // Élément suivant : le prochain pas encore réussi de l'étape, sinon l'étape suivante.
  function next() {
    if (ui.finished) { voice.stop(); ui.view = "learn"; ui.finished = false; draw(); return; } // famille finie : retour à la fiche
    // dans l'étape : le prochain verbe pas encore réussi ; sinon la prochaine étape où il en reste (relecture de la phase 10, n° 3)
    const run = localRun(ui.step), k = nextToDo(run, ui.k, n);
    if (k < n && !run.includes(k)) return goTo(ui.step, k);
    for (let d = 1; d <= STEPS.length; d++) {
      const step = (ui.step + d) % STEPS.length, r = localRun(step);
      if (r.length < n) return goTo(step, firstToDo({ run: r }, n));
    }
    goTo((ui.step + 1) % STEPS.length, 0);
  }

  function learnView() {
    const st = familyState(P, fam);
    return html`
      <section class="card"><p class="muted small">Famille · <span lang="${tuneLang(fam)}">${fam.tune}</span></p><h1 class="sentence">${fam.title}</h1><p>${fam.tip}</p></section>
      <section class="card"><h2>Les ${n} verbes</h2><ul class="examples">${fam.verbs.map((v, i) => html`<li>
        <button class="btn soft small-btn" data-act="hear" data-i="${i}" type="button" aria-label="${`Écouter : ${formsText(v)}`}">🔊</button>
        <span><b lang="en">${v.base} · ${v.past} · ${v.pp}</b> <span class="muted small">${v.fr}</span><br>
        <span class="small pron"><span aria-hidden="true">🗣️</span> ${v.pron.join(" · ")}</span>${v.note ? html`<br><span class="small tip"><span aria-hidden="true">💡</span> ${v.note}</span>` : ""}</span></li>`)}</ul></section>
      <div class="choices">${st.steps.map((s, step) => html`<button class="btn choice" data-act="start" data-step="${step}" type="button">
        <b>${s.icon} ${step + 1}. ${s.title}</b><span class="small">${s.got === s.size ? "✓ fait dans ce passage" : `${s.got} / ${s.size}`} · ${s.sub}</span></button>`)}</div>
      ${grimoireCard()}`;
  }

  // Le mini-boss de la famille : ouvert une fois la famille finie au moins une fois.
  function grimoireCard() {
    const open = familyState(P, fam).done > 0, w = familyWins(S.bosses, fam.id), st = !open ? "locked" : w ? "won" : "open";
    return html`<section class="card quest boss-card"><span class="quest-title">Mini-boss</span>
      <div class="row start"><button class="${`boss-node ${st}`}" data-act="grimoire" type="button" ${open ? "" : "disabled"}
          aria-label="${open ? `Affronter ${GRIMOIRE.name}` : `${GRIMOIRE.name} : finis les 3 étapes de la famille pour l'affronter`}">${grimoireSvg(fam.id, "idle", { label: "" })}${w ? html`<span class="boss-crown" aria-hidden="true">👑</span>` : ""}${open ? "" : html`<span class="boss-lock" aria-hidden="true">🔒</span>`}</button>
        <span><b>${GRIMOIRE.name}</b><br><span class="small muted">${!open ? "Finis les 3 étapes de la famille pour l'affronter." : w ? `Vaincu ${w} fois. Tu peux le raffronter encore.` : `Bats-le : +${XP_MINI_FIRST} XP et un coffre d'argent.`}</span></span></div>
      ${open ? html`<button class="btn big red" data-act="grimoire" type="button">⚔️ Affronter ${GRIMOIRE.name}</button>` : ""}</section>`;
  }

  function playView() {
    const v = verb(), s = STEPS[ui.step], target = textOf(fam, item());
    return html`
      <section class="card"><p class="muted small ex-count">${s.icon} ${s.title} · verbe ${ui.k + 1} / ${n}</p>
        ${progressBar(familyState(P, fam).run.length, familySize(fam), "Avancement de la famille")}
        ${dotsBlock(localRun(ui.step), ui.k, n, `Verbes de l'étape « ${s.title} »`, "Verbe")}</section>
      ${ui.finished ? html`<section class="card done-card" role="status"><h2>🎉 Famille finie !</h2>
        <p>+${XP_LESSON} XP de bonus. Tu as gagné ${ui.gained} XP sur cette famille.</p>
        <div class="row start"><button class="btn red" data-act="grimoire" type="button">⚔️ Affronter ${GRIMOIRE.name}</button>
        <button class="btn ghost" data-act="list" type="button">Autres familles</button>
        <button class="btn ghost" data-act="learn" type="button">Revoir la famille</button></div></section>` : ""}
      ${ui.ex ? html`<section class="card"><p class="muted small">${ui.step === 1 ? "Mets le verbe au prétérit" : "Mets le verbe au participe passé"} · <b lang="en">${v.base}</b> (${v.fr})</p>
        ${exerciseBlock(ui.ex.e, ui.ex)}${ui.ex.answer !== null ? html`<p class="small muted">${sentenceFr(v)}</p>` : ""}</section>` : ""}
      ${ui.say ? html`<section class="card"><p class="muted small">${ui.step === 0 ? `À toi : dis les 3 formes de « ${v.fr} ».` : "À toi : dis la phrase."}</p>
          <h1 class="sentence" lang="en">${target}</h1>
          ${ui.step === 0 ? html`<p class="pron"><span aria-hidden="true">🗣️</span> Ça se dit : <b>${v.pron.join(" · ")}</b></p>${v.note ? html`<p class="small tip"><span aria-hidden="true">💡</span> ${v.note}</p>` : ""}` : ""}
          ${voice.block()}</section>
        <section class="card">${mic.block()}</section>${mic.errorBlock()}
        ${ui.last ? html`<section class="card" aria-live="polite"><p class="feedback">${ui.feedback}</p>${resultBlock(ui.last, S.game.avatar)}
          <div class="row"><button class="btn ghost" data-act="speak" type="button">↻ Réessayer</button>
          <button class="btn" data-act="next" type="button">Suivant →</button></div></section>` : ""}`
        : ui.ex && ui.ex.answer !== null ? html`<button class="btn big" data-act="to-say" type="button">🎤 Maintenant, dis-la →</button>` : ""}
      <p class="row"><button class="btn ghost" data-act="learn" type="button">Revoir la famille</button>
        <button class="btn ghost" data-act="next" type="button">Passer →</button></p>`;
  }
  const sentenceFr = (v) => (ui.step === 1 ? v.ps.fr : v.pps.fr);

  function draw() {
    if (!alive) return;
    render(root, html`<p class="row"><button class="btn ghost" data-act="list" type="button">← Verbes</button>
      <span class="muted small">${ui.gained ? `+${ui.gained} XP sur cette famille` : ""}</span></p>
      ${ui.view === "learn" ? learnView() : playView()}`);
  }

  const voice = listenControls({ S, persist, draw, text: () => textOf(fam, item()) });
  const mic = practice({
    S, persist, draw, root, speakLabel: "🎤 Dire",
    target: () => ({ text: textOf(fam, item()), focus: [] }),
    onScored: (last) => {
      const got = recordVerb(P, fam, item(), last.score);
      persist();
      ui.last = last; ui.gained += got.xp;
      if (got.lessonDone) ui.finished = true;
      ui.feedback = got.passed
        ? (got.xp ? `Réussi ! +${XP_ITEM} XP` : "Réussi ! (déjà compté pour ce passage)")
        : `Pas encore : il faut ${PASS}. Écoute le modèle, puis réessaie.`;
    }
  });

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (mic.busy() && act !== "stop") return;
    if (act === "speak") ui.finished = false;
    if (ui.say && (mic.handle(act) || voice.handle(act))) return;
    if (ui.view === "play" && ui.ex && exerciseClick(ui.ex.e, ui.ex, act, el)) { draw(); return; }
    if (act === "list") location.hash = "#verbes";
    if (act === "grimoire" && familyState(P, fam).done > 0) location.hash = "#grimoire/" + fam.id;
    if (act === "hear") { const v = fam.verbs[Number(el.dataset.i)]; if (v) say(formsText(v), { voice: S.voiceId }).catch(() => {}); }
    if (act === "learn") { voice.stop(); ui.view = "learn"; draw(); }
    if (act === "start") { const step = Number(el.dataset.step) || 0; stopVoice(); ui.view = "play"; goTo(step, firstToDo({ run: localRun(step) }, n)); }
    if (act === "to-say") { ui.say = true; draw(); voice.warm(); }
    if (act === "go") goTo(ui.step, Number(el.dataset.i) || 0);
    if (act === "next") next();
  });
  root.addEventListener("change", (e) => voice.change(e));

  draw();
  return () => { alive = false; voice.dispose(); mic.dispose(); };
}
