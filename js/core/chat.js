// Conversation libre (phase 5) : logique pure, sans DOM ni réseau (test/chat.test.mjs).
// Consignes données à Gemini, fonction de correction qu'il appelle après chaque phrase, nettoyage de ce qu'il renvoie.
// Tout ce qui vient de l'IA est une donnée non fiable : textes seulement, longueurs bornées, toujours affichés comme texte.

export const LEVELS = ["A1", "A2", "B1", "B2"];

// Caractères invisibles ou dangereux à l'affichage (contrôle, largeur nulle, sens d'écriture inversé).
const INVISIBLE = /[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g;

// Texte venu de l'IA : chaîne, sans caractères de contrôle (sauf retour à la ligne), espaces réduits, longueur bornée.
export function cleanText(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(INVISIBLE, " ")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

// Morceau de texte au fil de l'eau (transcriptions) : comme cleanText, mais les espaces au bord sont gardés,
// car les morceaux sont mis bout à bout (« Welcome » + « to the café »).
export function cleanChunk(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(INVISIBLE, " ").slice(0, max);
}

// Correction envoyée par Gemini (arguments de show_correction), nettoyée ; null si inutilisable.
export function cleanCorrection(a) {
  if (!a || typeof a !== "object") return null;
  const c = {
    heard: cleanText(a.heard, 400),
    ok: a.ok === true,
    corrected: cleanText(a.corrected, 400),
    explanation_fr: cleanText(a.explanation_fr, 800),
    natural: cleanText(a.natural, 400)
  };
  if (!c.heard && !c.corrected) return null;
  if (!c.corrected) c.corrected = c.heard; // phrase juste : la redire telle quelle
  if (c.ok) c.explanation_fr = "";
  return c;
}

// Fonction que Gemini appelle après chaque phrase (sans bloquer sa réponse à voix haute).
export const CORRECTION_TOOL = {
  functionDeclarations: [{
    name: "show_correction",
    description: "Shows the learner, on screen, the correction of what they just said. Call it after every learner message.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        heard: { type: "STRING", description: "Exact transcription of what the learner said" },
        ok: { type: "BOOLEAN", description: "true if the learner's sentence was correct, natural English" },
        corrected: { type: "STRING", description: "The learner's sentence corrected (the same sentence if it was correct), numbers written in words" },
        explanation_fr: { type: "STRING", description: "Short friendly explanation in French of each error; empty if correct" },
        natural: { type: "STRING", description: "How a native speaker would naturally say it" }
      },
      required: ["heard", "ok", "corrected", "explanation_fr", "natural"]
    }
  }]
};

const LEVEL_HINT = {
  A1: "very simple words and very short sentences, speak slowly",
  A2: "simple everyday words and short sentences",
  B1: "everyday English, sentences of normal length",
  B2: "natural English, idioms allowed"
};

// Consignes de la conversation. scene : { persona, situation, goal, level }.
export function instructions({ persona, situation, goal, level } = {}) {
  const lv = LEVELS.includes(level) ? level : "A2";
  return [
    `You are ${cleanText(persona, 200) || "a friendly English conversation partner"}.`,
    situation ? `Situation: ${cleanText(situation, 400)}` : "",
    goal ? `The learner's goal in this conversation: ${cleanText(goal, 300)}. Gently lead them towards it.` : "",
    `The learner is French, level ${lv}: use ${LEVEL_HINT[lv]}.`,
    "Speak only English. Answer in one or two sentences, warm and natural, and keep the conversation going with a simple question.",
    "After EACH thing the learner says: FIRST answer them out loud in your role (never mention their mistakes aloud),",
    "THEN call the function show_correction with what they said, whether it was correct, the corrected sentence",
    "(numbers written in words), a short explanation in French of each error, and how a native would say it.",
    "If you could not understand the learner, say so kindly in your role and ask them to repeat."
  ].filter(Boolean).join("\n");
}

// Code d'erreur pour une fermeture de la connexion en direct (code WebSocket + raison donnée par Google).
export function closeError(code, reason = "") {
  const r = String(reason || "");
  if (/quota|RESOURCE_EXHAUSTED|rate/i.test(r)) return "quota";
  if (/api key|API_KEY|permission|unauthori[sz]ed|token/i.test(r)) return "key";
  if (/model.*(not found|not supported)|not found.*model/i.test(r)) return "model";
  if (code === 1011 || code === 1013 || code === 1014) return "server";
  if (code === 1006) return "network";
  return "closed";
}
