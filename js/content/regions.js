// Carte du parcours (phase 9, tâche 1) : 9 régions, une par thème, de 4 leçons chacune (2 de sons, 2 de thème),
// dans l'ordre des leçons (ORDER de lessons.js) : aucune leçon ne change de place, la progression reste valable.
// Chaque région est gardée par un boss en rapport avec son thème (dessins : js/content/bosses.js, tâche 2) :
// la 1re leçon d'une région s'ouvre quand le boss de la région d'avant est vaincu.
import { LESSONS } from "./lessons.js";
import { unlocked, starsOf } from "../core/progress.js";

export const PER_REGION = 4;
const RAW = [
  ["couple", "💞", "Le Jardin des Cœurs", "En couple"],
  ["travel", "⚓", "Le Port des Voyageurs", "Voyage"],
  ["daily", "🏡", "Le Village de Bonjour", "Quotidien"],
  ["past", "📜", "La Taverne des Conteurs", "Le passé en -ed"],
  ["work", "⚒️", "La Forge du Travail", "Au travail"],
  ["out", "🌃", "Les Rues de la Nuit", "Sortir"],
  ["health", "🏛️", "Le Temple des Soigneurs", "Santé et imprévus"],
  ["fun", "🏟️", "L'Arène des Avis", "Loisirs et opinions"],
  ["phone", "🗼", "La Tour des Messages", "Au téléphone"]
];
// from : rang de la 1re leçon de la région dans LESSONS ; lessons : ses leçons, dans l'ordre.
export const REGIONS = RAW.map(([id, icon, name, theme], k) => ({ id, icon, name, theme, from: k * PER_REGION, lessons: LESSONS.slice(k * PER_REGION, (k + 1) * PER_REGION) }));
export const regionById = (id) => REGIONS.find((r) => r.id === id) || null;
export const regionOfLesson = (index) => REGIONS[Math.floor(index / PER_REGION)] || null;

const IDS = LESSONS.map((l) => l.id);

// Une leçon est-elle ouverte ? (fonction pure, testée)
// - la première, toujours ; une leçon déjà commencée ou finie reste ouverte (une ancienne sauvegarde ne perd rien) ;
// - sinon, il faut avoir fini la précédente (règle de la phase 2) ;
// - et pour la 1re leçon d'une région, avoir vaincu le boss d'avant. `won` : ensemble des régions dont le boss
//   est vaincu ; null tant que les boss ne sont pas branchés (tâche 5) : seule la règle de la phase 2 compte alors.
export function lessonOpen(P, index, won = null) {
  if (index < 0 || index >= LESSONS.length) return false;
  if (index === 0) return true;
  const L = Object.hasOwn(P.lessons, IDS[index]) ? P.lessons[IDS[index]] : null;
  if (L && (L.done > 0 || L.best.length > 0)) return true;
  if (!unlocked(P, IDS, index)) return false;
  if (won && index % PER_REGION === 0) return won.has(REGIONS[index / PER_REGION - 1].id);
  return true;
}

// Toutes les leçons de la région finies : son boss peut être affronté.
export const regionCleared = (P, region) => region.lessons.every((l) => Object.hasOwn(P.lessons, l.id) && P.lessons[l.id].done > 0);

// Étoiles d'une région : total et maximum (3 par leçon).
export function regionStars(P, region) {
  return { got: region.lessons.reduce((n, l) => n + starsOf(P, l.id, l.items.length), 0), max: 3 * region.lessons.length };
}
