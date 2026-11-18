// Onglet « Entraînement » (#entrainement, phase 8, tâche 2) : tous les entraînements à part le parcours de leçons.
import { html, render } from "../core/dom.js";
import { vocabToday, vocabLabel, practiceCounts } from "./home.js";
import { QUESTIONS } from "../core/listening.js";
import { MISTAKE_SESSION } from "../core/tracks.js";
import { GRAMMAR } from "../content/grammar.js";
import { DIALOGUES } from "../content/dialogues.js";

const GO = { vocab: "#vocab", listen: "#ecoute", grammar: "#grammaire", mistakes: "#fautes", roles: "#role", chat: "#discussion" };

export function mountTraining(root, S) {
  const now = Date.now(), n = practiceCounts(S);
  render(root, html`
    <section class="card quest"><span class="quest-title">Entraînement</span>
      <h1 class="sentence">Choisis ton défi</h1>
      <p class="muted">Chaque entraînement rapporte des XP, et donc des pièces.</p></section>
    <div class="choices">
      <button class="btn choice" data-act="vocab" type="button"><b>📚 Vocabulaire</b><span class="small">${vocabLabel(vocabToday(S.srs, now))}</span></button>
      <button class="btn choice" data-act="listen" type="button"><b>👂 Écoute</b><span class="small">ship ou sheep ? ${QUESTIONS} questions</span></button>
      <button class="btn choice" data-act="grammar" type="button"><b>📘 Grammaire</b><span class="small">${n.grammar} / ${GRAMMAR.length} règles finies</span></button>
      <button class="btn choice" data-act="mistakes" type="button"><b>✏️ Fautes typiques</b><span class="small">${n.mistakes ? `${n.mistakes} à retravailler` : `${MISTAKE_SESSION} phrases à corriger`}</span></button>
      <button class="btn choice" data-act="roles" type="button"><b>🎭 Jeux de rôle</b><span class="small">${n.roles} / ${DIALOGUES.length} dialogues finis</span></button>
      <button class="btn choice" data-act="chat" type="button"><b>💬 Discussion libre</b><span class="small">parle de tout avec Gemini, il te corrige</span></button>
    </div>`);
  root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && Object.hasOwn(GO, el.dataset.act)) location.hash = GO[el.dataset.act]; });
  return () => {};
}
