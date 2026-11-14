// Économie du jeu : toutes les pièces passent par credit() et debit().
// But : récompenser la vraie progression (nouvelles leçons, étoiles, records, mots appris), limiter le « farm »
// (rejouer la même chose en boucle), et ramener toute sauvegarde trafiquée à ce que la progression justifie.
// Ce module est pur (pas de DOM) : il est testé à part dans test/core.test.mjs.

// ---------- Réglages ----------
export const COIN_DAY_CAP = 220;            // pièces d'entraînement (issues de l'XP, des séances, du chrono) par jour
export const REPEAT_MULT = [1, 0.6, 0.35, 0.2]; // même activité rejouée le même jour : 1re fois 100 %, puis 60 %, 35 %, 20 %
export const PROGRESS = {
  firstLesson: 20,   // première fois qu'une leçon est terminée
  newStar: 15,       // par nouvelle étoile obtenue sur une leçon
  newBest: 5,        // nouveau record (+5 points de précision ou plus)
  newWord: 2,        // par mot nouvellement retenu
  firstDialogue: 20, // premier dialogue terminé
  record: 20         // nouveau record personnel au défi chrono
};
export const EPOCH = "2026-09-01";          // aucune progression ne peut dater d'avant la création de l'appli
export const XP_DAY_MAX = 4000;             // XP maximale crédible en une journée (déjà très large)
export const TROPHY_DAY_MAX = 600;
const LOG_MAX = 60;

// Catégories : « practice » est plafonnée par jour ; les autres (progrès, quêtes, coffres…) ne le sont pas
// car elles sont déjà limitées par la progression elle-même.
const PRACTICE = new Set(["xp", "session", "chrono", "boss"]);

export function emptyEcon() {
  return { earned: 0, spent: 0, day: "", practice: 0, reps: {}, log: [], lastSeen: 0, sealed: false, capNoted: "" };
}
export function ensureDay(E, day) {
  if (E.day !== day) { E.day = day; E.practice = 0; E.reps = {}; }
  return E;
}
// Multiplicateur pour la prochaine partie de cette activité aujourd'hui.
export function repeatMult(E, key, day) {
  ensureDay(E, day);
  const n = (key && E.reps[key]) || 0;
  return REPEAT_MULT[Math.min(n, REPEAT_MULT.length - 1)];
}
export function noteRun(E, key, day) {
  ensureDay(E, day);
  if (key) E.reps[key] = Math.min(99, (E.reps[key] || 0) + 1);
}
function log(E, a, r, t) {
  E.log.push({ t, a, r });
  if (E.log.length > LOG_MAX) E.log.splice(0, E.log.length - LOG_MAX);
}
// Ajoute des pièces. Renvoie le montant réellement crédité (le plafond du jour peut le réduire).
export function credit(S, amount, reason, day, now = Date.now()) {
  const E = S.econ;
  ensureDay(E, day);
  let a = Math.max(0, Math.floor(Number(amount) || 0));
  if (!a) return 0;
  if (PRACTICE.has(reason)) { a = Math.min(a, Math.max(0, COIN_DAY_CAP - E.practice)); E.practice += a; }
  if (!a) return 0;
  S.coins += a; E.earned += a;
  log(E, a, reason, now);
  return a;
}
// Retire des pièces si le solde suffit. Renvoie true si c'est fait.
export function debit(S, amount, reason, now = Date.now()) {
  const a = Math.floor(Number(amount) || 0);
  if (a <= 0 || S.coins < a) return false;
  S.coins -= a; S.econ.spent += a;
  log(S.econ, -a, reason, now);
  return true;
}
export const capReached = S => S.econ.practice >= COIN_DAY_CAP;

// ---------- Horloge ----------
// L'heure de l'appareil peut être changée pour faire revenir les quêtes du jour. On ne recule jamais :
// l'heure utilisée est la plus tardive déjà vue (et l'heure du serveur quand elle est connue, voir app.js).
export function trustedNow(E, deviceNow = Date.now(), offset = 0) {
  return Math.max(deviceNow + offset, E.lastSeen || 0);
}

// ---------- Contrôle de cohérence ----------
// Pour une sauvegarde dont le sceau manque ou ne correspond pas (modifiée hors de l'appli, importée d'un autre
// appareil, ancienne version) : chaque valeur est ramenée au maximum que la progression peut expliquer.
// Les bornes sont larges : un joueur honnête n'est jamais pénalisé, un « 999 999 pièces » l'est toujours.
// deps : { levelOf, basePrice, isExclusive, isDefault, isUnlock } fournis par l'appli (évite les imports circulaires).
export function audit(S, today, deps) {
  const notes = [], E = S.econ;
  const cap = (key, max, label) => { if (S[key] > max) { notes.push(`${label} : ${S[key]} → ${Math.floor(max)}`); S[key] = Math.floor(max); } };
  // Jours d'activité : ni dans le futur, ni avant la création de l'appli
  const days = S.days.filter(d => d >= EPOCH && d <= today);
  if (days.length !== S.days.length) { notes.push(`jours d'activité impossibles retirés : ${S.days.length - days.length}`); S.days = days; }
  const nDays = Math.max(1, S.days.length);
  for (const k of Object.keys(S.xpDays)) if (k < EPOCH || k > today) delete S.xpDays[k]; else if (S.xpDays[k] > XP_DAY_MAX) S.xpDays[k] = XP_DAY_MAX;
  cap("xp", XP_DAY_MAX * nDays, "XP");
  cap("trophies", TROPHY_DAY_MAX * nDays, "trophées");
  const level = deps.levelOf(S.xp).level;
  if (S.levelSeen > level) S.levelSeen = level;
  // Compteurs bornés par le temps passé
  const st = S.stats;
  st.quests = Math.min(st.quests, 3 * nDays);
  const bosses = Object.values(S.bosses).filter(b => b.won).length;
  const maxChests = level + nDays + 2 * 9 + 7 + 3; // niveaux, bonus de quêtes, boss, rangs, séries + cadeau de migration
  st.chests = Math.min(st.chests, maxChests);
  if (S.chests.length > maxChests - st.chests + 1) S.chests = S.chests.slice(0, Math.max(0, maxChests - st.chests + 1));
  st.bosses = Math.min(st.bosses, bosses + 2 * nDays * 9);
  // Pièces : tout ce que la progression aurait pu rapporter, très largement
  const lessons = Object.keys(S.lessons).length, dlg = Object.keys(S.dialogues).length, gram = Object.keys(S.grammar).length + Object.keys(S.basics || {}).length + 2 * Object.keys(S.irr || {}).length;
  const words = Object.values(S.vocab || {}).filter(v => v && v.box >= 1).length;
  let maxEarned = Math.floor(S.xp / 4) + 40 * level + 15 * nDays + 25 * S.badges.length + 45 * st.quests
    + 160 * st.chests + 60 * bosses + 60 * st.bosses + PROGRESS.firstLesson * lessons + (3 * PROGRESS.newStar + 10 * PROGRESS.newBest) * lessons
    + (PROGRESS.firstDialogue + 10 * PROGRESS.newBest) * (dlg + gram) + PROGRESS.newWord * words + 30 * nDays
    + 100 + 100 + Math.floor(S.xp / 10);
  // Boîtes : chacune coûte au moins 100 pièces (dans « dépensé ») et rend au plus ~120 pièces de doublons en moyenne
  st.boxes = Math.min(st.boxes, Math.floor(2 * maxEarned / 100));
  maxEarned += 120 * st.boxes;
  if (E.earned > maxEarned) { notes.push(`pièces gagnées : ${E.earned} → ${maxEarned}`); E.earned = maxEarned; }
  st.boxes = Math.min(st.boxes, Math.floor(E.earned / 100));
  E.spent = Math.min(Math.max(E.spent, 100 * st.boxes), E.earned);
  cap("coins", Math.max(0, E.earned - E.spent), "pièces");
  // Objets : les exclusivités viennent des boîtes (une par boîte au plus)
  let excl = S.owned.filter(deps.isExclusive);
  if (excl.length > st.boxes) { const drop = new Set(excl.slice(st.boxes)); S.owned = S.owned.filter(id => !drop.has(id)); notes.push(`exclusivités sans boîte retirées : ${drop.size}`); excl = excl.slice(0, st.boxes); }
  // Objets de la boutique : les coffres et les boîtes en offrent, le reste doit avoir été payé
  const bought = S.owned.filter(id => !deps.isDefault(id) && !deps.isUnlock(id) && !deps.isExclusive(id) && deps.basePrice(id));
  let free = Math.max(0, st.chests + st.boxes - excl.length) + (S.secret ? 1 : 0), paid = 0;
  const keep = new Set();
  for (const id of [...bought].sort((a, b) => deps.basePrice(b) - deps.basePrice(a))) {
    if (free > 0) { free--; keep.add(id); continue; }
    if (paid + deps.basePrice(id) <= E.spent) { paid += deps.basePrice(id); keep.add(id); }
  }
  if (keep.size < bought.length) { const n = bought.length - keep.size; S.owned = S.owned.filter(id => !bought.includes(id) || keep.has(id)); notes.push(`objets ni gagnés ni achetés retirés : ${n}`); }
  return { changed: notes.length > 0, notes };
}
