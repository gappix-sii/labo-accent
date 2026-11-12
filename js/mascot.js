// Répliques du compagnon (quel que soit l'animal choisi) et voix française aiguë avec bouche animée.
import { speak } from "./audio.js";
import { SPECIES_BY_ID } from "./avatar.js";

export const LINES = {
  hello: ["Salut, moi c'est {n} ! Je vais écouter ton accent.", "Prêt à faire chauffer tes cordes vocales ?", "On s'entraîne un peu ? Juste cinq minutes !", "{n} au rapport ! On attaque ?"],
  listen: ["Écoute bien, puis répète.", "À toi ! Appuie sur le micro.", "Prends ton temps, articule."],
  great: ["Parfait ! On dirait un vrai Anglais.", "Énorme ! Ça sonne super bien.", "Wouah, impeccable !", "Excellent ! Continue comme ça.", "Ça, c'est de l'anglais !"],
  good: ["Bien joué ! Quelques sons à peaufiner.", "Pas mal du tout !", "C'est bien, on y est presque."],
  meh: ["Presque ! Écoute le mot en rouge et réessaie.", "On y est presque, encore un essai ?", "Pas mal, mais tu peux mieux faire !"],
  bad: ["Pas grave ! Écoute lentement et retente.", "Ça arrive, même aux {p}. On réessaie ?", "Courage ! Commence par écouter au ralenti."],
  combo: ["Série en feu ! Tu enchaînes !", "Combo ! Ne t'arrête pas !", "Inarrêtable !"],
  done: ["Leçon terminée ! Je suis fier de toi.", "Bravo ! Une leçon de plus dans la poche."],
  locked: ["Termine d'abord la leçon précédente !"],
  bossWin: ["Victoire ! Le boss a perdu son accent !", "K.-O. ! Tu as été parfait."],
  bossLose: ["Il s'en sort cette fois… Revanche ?", "Pas grave, on revient plus fort !"],
  chrono: ["Prêt ? 60 secondes, réponds vite !", "Le chrono démarre, concentre-toi !"]
};
export function line(key, av) {
  const sp = SPECIES_BY_ID[av && av.species] || SPECIES_BY_ID.skunk;
  const a = LINES[key] || [""];
  return a[Math.floor(Math.random() * a.length)].replaceAll("{n}", (av && av.name) || "Pouf").replaceAll("{p}", sp.plural);
}
export const pitchOf = av => (SPECIES_BY_ID[av && av.species] || SPECIES_BY_ID.skunk).pitch;

// Affiche une bulle et (option) la lit, bouche animée.
export function companionSay(root, text, { voice = true, mood = "", av = null } = {}) {
  if (!root) return;
  const svg = root.querySelector(".pouf"), bubble = root.querySelector(".bubble");
  if (bubble) bubble.textContent = text;
  if (svg) { svg.classList.remove("happy", "sad"); if (mood) svg.classList.add(mood); }
  if (!voice) return;
  if (svg) svg.classList.add("talk");
  speak(text, { lang: "fr", rate: 1.05, pitch: pitchOf(av) }).then(() => { if (svg) svg.classList.remove("talk"); });
}
