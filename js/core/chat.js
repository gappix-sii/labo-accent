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

// Voix du direct (Gemini Live), relevées le 2026-11-18 dans la doc de Google (aistudio.google.com/docs/speech-generation),
// avec leur style traduit. « Kore » par défaut : celle que l'utilisateur a écoutée et aimée à l'essai.
export const DEFAULT_LIVE_VOICE = "Kore";
export const LIVE_VOICES = [
  ["Kore", "ferme"], ["Zephyr", "lumineuse"], ["Puck", "enjouée"], ["Charon", "posée, informative"], ["Fenrir", "vive"],
  ["Leda", "jeune"], ["Orus", "ferme"], ["Aoede", "légère"], ["Callirrhoe", "décontractée"], ["Autonoe", "lumineuse"],
  ["Enceladus", "soufflée"], ["Iapetus", "claire"], ["Umbriel", "décontractée"], ["Algieba", "douce"], ["Despina", "douce"],
  ["Erinome", "claire"], ["Algenib", "rocailleuse"], ["Rasalgethi", "informative"], ["Laomedeia", "enjouée"], ["Achernar", "tendre"],
  ["Alnilam", "ferme"], ["Schedar", "égale"], ["Gacrux", "mûre"], ["Pulcherrima", "directe"], ["Achird", "amicale"],
  ["Zubenelgenubi", "familière"], ["Vindemiatrix", "délicate"], ["Sadachbia", "animée"], ["Sadaltager", "savante"], ["Sulafat", "chaleureuse"]
].map(([id, style]) => ({ id, style }));
export const liveVoiceOk = (v) => LIVE_VOICES.some((x) => x.id === v);

// Phrase dite par une voix quand on l'écoute dans les réglages.
export const SAMPLE_TEXT = "Hi! I'm your English partner. Shall we have a little chat?";

// Sujets proposés pour la discussion libre (le sujet peut aussi être tapé).
export const TOPICS = [
  ["Ta journée", "your day"], ["Ton travail", "your job"], ["Les voyages", "travelling"], ["Films et séries", "films and TV series"],
  ["La cuisine", "food and cooking"], ["Le sport", "sport"], ["Tes projets du week-end", "weekend plans"], ["La technologie", "technology"]
].map(([fr, en]) => ({ fr, en }));

// Scène du coach de la discussion libre, sur le sujet choisi.
export function coachScene(topic, level) {
  const t = cleanText(topic, 120) || "anything the learner likes";
  return {
    title: `Discussion libre : ${t}`, level: LEVELS.includes(level) ? level : "A2",
    persona: "Alex, a friendly English conversation coach", situation: `A relaxed conversation about: ${t}.`,
    goal: `talk about ${t} for a few minutes`, opening: "(Start the conversation: greet the learner and ask a first simple question about the topic.)"
  };
}

// Une correction rapporte des XP une seule fois : marque-la, et dis si c'est la première fois.
export function rewardOnce(c) { if (!c || c.rewarded) return false; c.rewarded = true; return true; }
