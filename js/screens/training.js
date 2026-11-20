// Onglet « Défis » (#entrainement, phase 8, tâche 2) : tous les entraînements à part le parcours de leçons.
import { html, render } from "../core/dom.js";
import { buildQueue } from "./vocab.js";
import { QUESTIONS } from "../core/listening.js";
import { trackState, grammarKey, roleKey, MISTAKE_SESSION } from "../core/tracks.js";
import { GRAMMAR } from "../content/grammar.js";
import { DIALOGUES } from "../content/dialogues.js";
import { FAMILIES } from "../content/verbs.js";
import { familyDone } from "../core/verbs.js";

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

// Avancement des entraînements (grammaire, jeux de rôle, fautes), pour les boutons de l'onglet Défis.
export function practiceCounts(S) {
  return {
    grammar: GRAMMAR.filter((g) => trackState(S.progress, grammarKey(g.id)).done > 0).length,
    roles: DIALOGUES.filter((d) => trackState(S.progress, roleKey(d.id)).done > 0).length,
    mistakes: Object.keys(S.mistakes.miss).length,
    verbs: FAMILIES.filter((f) => familyDone(S.progress, f)).length
  };
}

const GO = { vocab: "#vocab", listen: "#ecoute", grammar: "#grammaire", verbs: "#verbes", mistakes: "#fautes", roles: "#role", chat: "#discussion" };

export function mountTraining(root, S) {
  const now = Date.now(), n = practiceCounts(S);
  render(root, html`
    <section class="card quest"><span class="quest-title">Défis</span>
      <h1 class="sentence">Choisis ton défi</h1>
      <p class="muted">Chaque entraînement rapporte des XP, et donc des pièces.</p></section>
    <div class="choices">
      <button class="btn choice" data-act="vocab" type="button"><b>📚 Vocabulaire</b><span class="small">${vocabLabel(vocabToday(S.srs, now))}</span></button>
      <button class="btn choice" data-act="listen" type="button"><b>👂 Écoute</b><span class="small">ship ou sheep ? ${QUESTIONS} questions</span></button>
      <button class="btn choice" data-act="grammar" type="button"><b>📘 Grammaire</b><span class="small">${n.grammar} / ${GRAMMAR.length} règles finies</span></button>
      <button class="btn choice" data-act="verbs" type="button"><b>📜 Verbes irréguliers</b><span class="small">${n.verbs} / ${FAMILIES.length} familles finies</span></button>
      <button class="btn choice" data-act="mistakes" type="button"><b>✏️ Fautes typiques</b><span class="small">${n.mistakes ? `${n.mistakes} à retravailler` : `${MISTAKE_SESSION} phrases à corriger`}</span></button>
      <button class="btn choice" data-act="roles" type="button"><b>🎭 Jeux de rôle</b><span class="small">${n.roles} / ${DIALOGUES.length} dialogues finis</span></button>
      <button class="btn choice" data-act="chat" type="button"><b>💬 Discussion libre</b><span class="small">parle de tout avec Gemini, il te corrige</span></button>
    </div>`);
  root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && Object.hasOwn(GO, el.dataset.act)) location.hash = GO[el.dataset.act]; });
  return () => {};
}
