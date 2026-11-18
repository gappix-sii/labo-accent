// Banc de test du moteur (#banc) : les 10 phrases du protocole de la phase 1, chacune dite soignée puis
// avec les fautes de sa consigne ; tableau des résultats à copier. Le parcours de leçons est dans lesson.js.
import { html, render } from "../core/dom.js";
import { save, logEntry, addLog } from "../core/store.js";
import { kindBlock, benchBlock, benchText } from "./bench.js";
import { SENTENCES } from "../content/sentences.js";
import { practice, resultBlock, progressBar } from "./practice.js";
import { listenControls } from "./listen.js";

export function mountSay(root, S) {
  const ui = { copied: "" };
  const sentence = () => SENTENCES[S.sentence % SENTENCES.length];
  const persist = () => save(S);
  const draw = () => {
    const s = sentence(), last = S.last && S.last.sentence === s.en ? S.last : null;
    render(root, html`
      <p><button class="btn ghost" data-act="home" type="button">← Profil</button></p>
      <section class="card">
        ${progressBar(S.sentence % SENTENCES.length + 1, SENTENCES.length, "Phrase du banc")}<p class="muted small ex-count">Banc de test du moteur · phrase ${S.sentence % SENTENCES.length + 1} / ${SENTENCES.length} · ${s.focus}</p>
        <h1 class="sentence" lang="en">${s.en}</h1>
        <p class="muted">${s.fr}</p>
        ${voice.block()}
        <div class="row">
          <button class="btn ghost" data-act="prev" type="button">← Précédente</button>
          <button class="btn ghost" data-act="next" type="button">Suivante →</button>
        </div>
      </section>
      <section class="card">${mic.block(kindBlock(S, false))}</section>
      ${mic.errorBlock()}
      <section class="card" aria-live="polite">${last ? resultBlock(last, S.game.avatar) : html`<p class="muted">Pas encore de résultat pour cette phrase.</p>`}</section>
      <section class="card">${benchBlock(S)}${ui.copied ? html`<p class="small" role="status">${ui.copied}</p>` : ""}</section>
    `);
  };

  const voice = listenControls({ S, persist, draw, text: () => sentence().en });
  const mic = practice({
    S, persist, draw, root,
    target: () => ({ text: sentence().en, focus: sentence().expect }),
    onScored: (last) => {
      S.last = last;
      addLog(S, logEntry(S.sentence % SENTENCES.length, S.kind, S.last));
      persist();
    }
  });

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act || (mic.busy() && act !== "stop")) return;
    if (mic.handle(act) || voice.handle(act)) return;
    if (act === "home") { location.hash = "#profil"; return; }
    if (act === "kind-soigné" || act === "kind-fautes") { S.kind = act.slice(5); persist(); draw(); }
    if (act === "copy-log") {
      navigator.clipboard.writeText(benchText(S)).then(
        () => { ui.copied = "Copié ! Colle-le dans la conversation avec Claude (Ctrl+V)."; draw(); },
        () => { ui.copied = "La copie a échoué : sélectionne le tableau à la main."; draw(); }
      );
    }
    if (act === "prev" || act === "next") {
      voice.stop();
      S.sentence = (S.sentence + (act === "next" ? 1 : SENTENCES.length - 1)) % SENTENCES.length;
      mic.clearError(); persist(); draw(); voice.warm();
    }
  });
  root.addEventListener("change", (e) => voice.change(e));

  draw();
  voice.warm();
  return () => { voice.dispose(); mic.dispose(); };
}
