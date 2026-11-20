// Carte du parcours (phase 9, tâche 1) : 9 régions, une par thème : 2 leçons de sons, 2 de thème, puis 0 à 2 leçons
// des bases (phase 10), dans l'ordre des leçons (lessons.js) : aucune leçon ne change de place, la progression reste valable.
// Chaque région est gardée par un boss en rapport avec son thème (dessins : js/content/bosses.js, tâche 2) :
// la 1re leçon d'une région s'ouvre quand le boss de la région d'avant est vaincu.
import { LESSONS } from "./lessons.js";
import { unlocked, starsOf } from "../core/progress.js";

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
export const REGIONS = RAW.map(([id, icon, name, theme]) => ({ id, icon, name, theme, from: LESSONS.findIndex((l) => l.region === id), lessons: LESSONS.filter((l) => l.region === id) }));
const START = new Map(REGIONS.map((r, k) => [r.from, k])); // rang de la 1re leçon d'une région → rang de la région
export const regionById = (id) => REGIONS.find((r) => r.id === id) || null;
export const regionOfLesson = (index) => REGIONS.find((r) => index >= r.from && index < r.from + r.lessons.length) || null;

const IDS = LESSONS.map((l) => l.id);

// Une leçon est-elle ouverte ? (fonction pure, testée)
// - la première, toujours ; une leçon déjà commencée ou finie reste ouverte (une ancienne sauvegarde ne perd rien) ;
// - sinon, il faut avoir fini la précédente (règle de la phase 2) ;
// - et pour la 1re leçon d'une région, avoir vaincu le boss d'avant. `won` : ensemble des régions dont le boss
//   est vaincu (wonSet, js/core/boss.js) ; null : seule la règle de la phase 2 compte (tests, anciens appels).
//   Le boss d'avant vaincu suffit, même si des leçons ont été ajoutées depuis à sa région (les bases, phase 10) :
//   il prouve que la région était finie au moment du combat (relecture de la phase 10, n° 1).
export function lessonOpen(P, index, won = null) {
  if (index < 0 || index >= LESSONS.length) return false;
  if (index === 0) return true;
  const L = Object.hasOwn(P.lessons, IDS[index]) ? P.lessons[IDS[index]] : null;
  if (L && (L.done > 0 || L.best.length > 0)) return true;
  if (won && START.get(index) > 0) return won.has(REGIONS[START.get(index) - 1].id);
  return unlocked(P, IDS, index);
}

// Toutes les leçons de la région finies : son boss peut être affronté.
export const regionCleared = (P, region) => region.lessons.every((l) => Object.hasOwn(P.lessons, l.id) && P.lessons[l.id].done > 0);

// Étoiles d'une région : total et maximum (3 par leçon).
export function regionStars(P, region) {
  return { got: region.lessons.reduce((n, l) => n + starsOf(P, l.id, l.items.length), 0), max: 3 * region.lessons.length };
}
