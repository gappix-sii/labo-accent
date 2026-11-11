// Mécanique de jeu : parcours, XP, niveaux, étoiles, badges. Module pur, testable sous Node.
import { CATEGORIES, SOUND_LESSONS, MINIMAL_PAIRS } from "./content.js";

const cat = id => CATEGORIES.find(c => c.id === id);
const sl = p => SOUND_LESSONS.find(l => l.p === p);
const catLesson = (id, a, b, title) => ({ id: `${id}-${a}`, kind: "cat", title, items: cat(id).items.slice(a, b).map(([en, fr]) => ({ en, fr })) });
const soundLesson = p => ({ id: `s-${p}`, kind: "sound", sound: p, title: sl(p).title, tip: sl(p).tip, items: sl(p).items.map(en => ({ en, fr: "" })) });
const pairLesson = (a, b) => ({ id: `pairs-${a}`, kind: "pairs", title: "Paires minimales",
  items: MINIMAL_PAIRS.slice(a, b).flatMap(([x, y]) => [{ en: x, fr: `${x} / ${y}` }, { en: y, fr: `${x} / ${y}` }]) });
const review = n => ({ id: `review-${n}`, kind: "review", title: "Révision", items: [] });

export const UNITS = [
  { id: "u1", title: "Unité 1", sub: "Se présenter", tone: "yellow", lessons: [
    catLesson("daily", 0, 5, "Bonjour !"), soundLesson("h"), catLesson("daily", 5, 10, "Ma journée"), soundLesson("θ"), pairLesson(0, 3), review(1)] },
  { id: "u2", title: "Unité 2", sub: "En couple", tone: "pink", lessons: [
    catLesson("couple", 0, 5, "Mots doux"), soundLesson("ɪ"), soundLesson("i"), catLesson("couple", 5, 10, "Ce soir"), soundLesson("ð"), pairLesson(3, 6), review(2)] },
  { id: "u3", title: "Unité 3", sub: "Voyager", tone: "cyan", lessons: [
    catLesson("travel", 0, 5, "À l'aéroport"), soundLesson("æ"), soundLesson("ɹ"), catLesson("travel", 5, 10, "Au restaurant"), soundLesson("w"), pairLesson(6, 10), review(3)] },
  { id: "u4", title: "Unité 4", sub: "Raconter", tone: "green", lessons: [
    catLesson("past", 0, 4, "Hier"), soundLesson("ŋ"), soundLesson("oʊ"), catLesson("past", 4, 8, "Le week-end"), soundLesson("ə"), soundLesson("eɪ"), pairLesson(10, 15), review(4)] },
  { id: "u5", title: "Unité 5", sub: "Au travail", tone: "orange", lessons: [
    catLesson("work", 0, 5, "Le serveur"), soundLesson("z"), catLesson("work", 5, 10, "En réunion"), soundLesson("v"), review(5)] },
  { id: "u6", title: "Unité 6", sub: "Sortir", tone: "violet", lessons: [
    catLesson("out", 0, 5, "Au restaurant"), soundLesson("ʃ"), catLesson("out", 5, 10, "Shopping"), soundLesson("ʤ"), review(6)] },
  { id: "u7", title: "Unité 7", sub: "Santé et imprévus", tone: "cyan", lessons: [
    catLesson("health", 0, 5, "Chez le médecin"), soundLesson("aɪ"), catLesson("health", 5, 10, "Les galères"), soundLesson("ɝ"), review(7)] },
  { id: "u8", title: "Unité 8", sub: "Loisirs et opinions", tone: "pink", lessons: [
    catLesson("fun", 0, 5, "Mes goûts"), catLesson("fun", 5, 10, "Mon avis"), review(8)] },
  { id: "u9", title: "Unité 9", sub: "Au téléphone", tone: "yellow", lessons: [
    catLesson("phone", 0, 5, "Allô ?"), catLesson("phone", 5, 10, "Réserver"), review(9)] }
];
export const ALL_LESSONS = UNITS.flatMap(u => u.lessons.map(l => ({ ...l, unit: u.id })));

// Une leçon est ouverte si la précédente est terminée (la toute première l'est toujours).
export function lessonState(progress, idx) {
  const l = ALL_LESSONS[idx];
  if (progress[l.id]) return "done";
  if (idx === 0 || progress[ALL_LESSONS[idx - 1].id]) return "open";
  return "locked";
}
export function currentLessonIndex(progress) {
  const i = ALL_LESSONS.findIndex((l, k) => lessonState(progress, k) === "open");
  return i < 0 ? ALL_LESSONS.length - 1 : i;
}

// Révision : phrases récemment ratées, complétées par des phrases déjà vues de l'unité.
export function reviewItems(lesson, history, max = 6) {
  const unit = UNITS.find(u => u.id === lesson.unit);
  const seen = new Set(), out = [];
  for (const h of [...history].reverse()) {
    if (h.s < 75 && h.t && !seen.has(h.t)) { seen.add(h.t); out.push({ en: h.t, fr: "" }); }
    if (out.length >= max) break;
  }
  const pool = unit.lessons.filter(l => l.kind !== "review").flatMap(l => l.items);
  for (const it of pool.sort(() => Math.random() - 0.5)) { if (out.length >= max) break; if (!seen.has(it.en)) { seen.add(it.en); out.push(it); } }
  return out;
}

// ---- XP & niveaux ----
export function xpForScore(score, combo) {
  const base = score >= 85 ? 15 : score >= 65 ? 10 : score >= 40 ? 5 : 2;
  return base + (score >= 85 ? Math.min(10, Math.max(0, combo - 1) * 2) : 0);
}
export function stars(avg) { return avg >= 85 ? 3 : avg >= 65 ? 2 : 1; }
// Niveau n atteint à 50·n·(n−1) XP : 0, 100, 300, 600, 1000…
export function levelOf(xp) {
  let n = 1; while (50 * (n + 1) * n <= xp) n++;
  const lo = 50 * n * (n - 1), hi = 50 * (n + 1) * n;
  return { level: n, into: xp - lo, need: hi - lo };
}
export const LEVEL_TITLES = ["Débutant", "Apprenti", "Voyageur", "Bavard", "Globe-trotteur", "Presque bilingue", "Bilingue", "Légende"];
export const levelTitle = n => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((n - 1) / 2))];

// ---- Badges ----
export const BADGES = [
  { id: "first", sym: "1", title: "Premier pas", desc: "Terminer une première leçon", test: s => Object.keys(s.lessons).length >= 1 },
  { id: "perfect", sym: "100", title: "Sans faute", desc: "Obtenir 100 sur une phrase", test: s => s.history.some(h => h.s >= 100) },
  { id: "streak3", sym: "3j", title: "Régulier", desc: "3 jours de suite", test: (s, x) => x.streak >= 3 },
  { id: "streak7", sym: "7j", title: "Semaine en feu", desc: "7 jours de suite", test: (s, x) => x.streak >= 7 },
  { id: "streak30", sym: "30j", title: "Inarrêtable", desc: "30 jours de suite", test: (s, x) => x.streak >= 30 },
  { id: "combo5", sym: "×5", title: "Combo", desc: "5 très bonnes phrases d'affilée", test: s => (s.bestCombo || 0) >= 5 },
  { id: "th", sym: "θ", title: "Maître du th", desc: "80 % de réussite sur le th (20 essais)", test: s => { const v = s.sounds["θ"]; return v && v.n >= 20 && v.ok / v.n >= 0.8; } },
  { id: "h", sym: "h", title: "Souffleur", desc: "80 % de réussite sur le h (20 essais)", test: s => { const v = s.sounds["h"]; return v && v.n >= 20 && v.ok / v.n >= 0.8; } },
  { id: "unit1", sym: "U1", title: "Unité 1", desc: "Finir l'unité Se présenter", test: s => UNITS[0].lessons.every(l => s.lessons[l.id]) },
  { id: "unit2", sym: "U2", title: "Unité 2", desc: "Finir l'unité En couple", test: s => UNITS[1].lessons.every(l => s.lessons[l.id]) },
  { id: "unit3", sym: "U3", title: "Unité 3", desc: "Finir l'unité Voyager", test: s => UNITS[2].lessons.every(l => s.lessons[l.id]) },
  { id: "unit4", sym: "U4", title: "Unité 4", desc: "Finir l'unité Raconter", test: s => UNITS[3].lessons.every(l => s.lessons[l.id]) },
  { id: "allunits", sym: "★", title: "Parcours fini", desc: "Terminer toutes les unités", test: s => ALL_LESSONS.every(l => s.lessons[l.id]) },
  { id: "vocab50", sym: "50", title: "Dico de poche", desc: "Maîtriser 50 mots de vocabulaire", test: s => masteredCount(s.vocab) >= 50 },
  { id: "vocab200", sym: "200", title: "Dico ambulant", desc: "Maîtriser 200 mots de vocabulaire", test: s => masteredCount(s.vocab) >= 200 },
  { id: "session", sym: "▶", title: "Première séance", desc: "Finir une séance chronométrée", test: s => (s.sessions || []).length >= 1 },
  { id: "marathon", sym: "60′", title: "Marathon", desc: "Finir une séance d'une heure", test: s => (s.sessions || []).some(x => x.planned >= 60) },
  { id: "xp1000", sym: "1k", title: "1 000 XP", desc: "Gagner 1 000 XP", test: s => s.xp >= 1000 }
];
export function newBadges(state, extra) {
  return BADGES.filter(b => !state.badges.includes(b.id) && b.test(state, extra)).map(b => b.id);
}

// ---- Vocabulaire : répétition espacée (boîtes de Leitner) ----
export const BOX_DAYS = [0, 1, 3, 7, 14, 30];
export const MASTERED_BOX = 3;
export function addDays(dayStr, n) { const d = new Date(dayStr + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export function vocabStatus(rec) { if (!rec) return "new"; return rec.box >= MASTERED_BOX ? "mastered" : "learning"; }
export function masteredCount(v) { return Object.values(v || {}).filter(r => r.box >= MASTERED_BOX).length; }
export function gradeVocab(rec, correct, day) {
  const box = correct ? Math.min(BOX_DAYS.length - 1, (rec ? rec.box : 0) + 1) : 0;
  return { box, due: addDays(day, correct ? BOX_DAYS[box] : 0), seen: (rec ? rec.seen : 0) + 1, ok: (rec ? rec.ok : 0) + (correct ? 1 : 0) };
}
// Choisit d'abord les mots à revoir (échéance passée), puis des mots nouveaux.
export function pickVocab(words, vstate, n, newMax, day) {
  const due = words.filter(w => vstate[w.id] && vstate[w.id].due <= day).sort((a, b) => vstate[a.id].due.localeCompare(vstate[b.id].due));
  const fresh = words.filter(w => !vstate[w.id]).slice(0, Math.max(0, Math.min(newMax, n - due.length)));
  return [...due.slice(0, n), ...fresh].slice(0, n);
}

// ---- Séances chronométrées ----
export const DURATIONS = [15, 30, 45, 60];
// Durées moyennes observées : ~1,2 min par phrase (écoute, essai, retour), ~0,45 min par mot.
export const estMinutes = b => Math.round(b.type === "vocab" ? b.count * 0.45 : b.type === "dialogue" ? b.count * 1.5 + 2 : b.count * 1.2);
export function planSession(min) {
  const P = {
    15: [["vocab", 10], ["path", 5], ["review", 4]],
    30: [["vocab", 15], ["path", 5], ["dialogue", 4], ["sound", 6]],
    45: [["vocab", 20], ["path", 5], ["dialogue", 4], ["sound", 6], ["path", 5], ["review", 6]],
    60: [["vocab", 25], ["path", 5], ["dialogue", 4], ["sound", 6], ["path", 5], ["pairs", 8], ["dialogue", 4], ["review", 4]]
  }[min];
  return P.map(([type, count]) => ({ type, count }));
}
