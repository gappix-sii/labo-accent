// Sauvegarde dans le navigateur (localStorage), relue et vérifiée à chaque chargement.
// Tout ce qui est relu est nettoyé : une sauvegarde abîmée ou trafiquée ne peut ni planter l'appli
// ni injecter du contenu (les textes sont de toute façon échappés à l'affichage).
// Nouvelle clé : l'ancienne sauvegarde (« labo.v1 ») n'est pas reprise (décision de PROJET.md).

import { newProgress, sanitizeProgress } from "./progress.js";
import { newSrs, sanitizeSrs } from "./srs.js";
import { newListening, sanitizeListening } from "./listening.js";
import { newMistakes, sanitizeMistakes } from "./tracks.js";
import { DEFAULT_LIVE_VOICE, liveVoiceOk } from "./chat.js";
import { newGame, sanitizeGame, syncGame } from "./game.js";
import { newBosses, sanitizeBosses } from "./boss.js";
import { mistakeById } from "../content/mistakes.js";

export const STORE_KEY = "labo.v2";
export const VERSION = 1;
const LEVELS = new Set(["good", "ok", "bad", "skip"]);
const STATUSES = new Set(["good", "ok", "bad"]);
const VOICE_IDS = new Set(["af_heart", "am_michael"]);
const KINDS = new Set(["soigné", "fautes"]);
const FX = new Set(["auto", "full", "reduced"]); // effets de jeu (js/screens/effects.js)
const LOG_MAX = 100;

export function defaults() {
  // progress : XP, niveau, série, leçons (js/core/progress.js) ; srs : révision du vocabulaire (js/core/srs.js) ;
  // listening : paires d'écoute ratées (js/core/listening.js) ; mistakes : fautes typiques ratées (js/core/tracks.js). Chacun a son propre numéro de version « v ».
  // rev : numéro de révision, augmenté à chaque enregistrement (deux onglets ne s'écrasent pas, voir save).
  return { version: VERSION, rev: 0, sentence: 0, engine: false, voice: false, voiceId: "af_heart", liveVoice: DEFAULT_LIVE_VOICE, fx: "auto", last: null, kind: "soigné", log: [],
    progress: newProgress(), srs: newSrs(), listening: newListening(), mistakes: newMistakes(), game: newGame(), bosses: newBosses() };
}

const text = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v, min, max, def) => (Number.isInteger(v) && v >= min && v <= max ? v : def);
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

// Version compacte d'un résultat, celle qu'on enregistre.
export function summarize(sentence, { result, tips }, now = Date.now()) {
  return cleanResult({
    sentence, at: now, score: result.score, heard: result.heardIpa,
    words: result.words.map((w) => ({
      display: w.display, score: w.score, level: w.level,
      phones: w.phones.map((ph) => ({ p: ph.p, status: ph.status, heard: ph.heard }))
    })),
    tips: tips.map((t) => ({ word: t.word, sound: t.sound, text: t.text }))
  });
}

function cleanResult(r) {
  if (!r || typeof r !== "object") return null;
  const sentence = text(r.sentence, 200);
  if (!sentence) return null;
  return {
    sentence,
    at: int(r.at, 0, 8.64e15, 0),
    score: int(r.score, 0, 100, 0),
    heard: text(r.heard, 600),
    words: list(r.words, 40).filter((w) => w && typeof w === "object").map((w) => ({
      display: text(w.display, 60),
      score: w.score === null ? null : int(w.score, 0, 100, null),
      level: LEVELS.has(w.level) ? w.level : "skip",
      phones: list(w.phones, 30).filter((ph) => ph && typeof ph === "object").map((ph) => ({
        p: text(ph.p, 4),
        status: STATUSES.has(ph.status) ? ph.status : "bad",
        heard: typeof ph.heard === "string" ? text(ph.heard, 4) : null
      }))
    })),
    tips: list(r.tips, 6).filter((t) => t && typeof t === "object").map((t) => ({
      word: text(t.word, 60), sound: text(t.sound, 4), text: text(t.text, 400)
    }))
  };
}

export function sanitize(raw) {
  const S = defaults();
  if (!raw || typeof raw !== "object" || raw.version !== VERSION) return S;
  S.rev = int(raw.rev, 0, 1e12, 0);
  S.sentence = int(raw.sentence, 0, 10000, 0);
  S.engine = raw.engine === true; // le moteur a déjà été téléchargé sur cet appareil
  S.voice = raw.voice === true; // la voix aussi
  S.voiceId = VOICE_IDS.has(raw.voiceId) ? raw.voiceId : "af_heart";
  S.liveVoice = liveVoiceOk(raw.liveVoice) ? raw.liveVoice : DEFAULT_LIVE_VOICE; // voix du direct (phase 5)
  S.fx = FX.has(raw.fx) ? raw.fx : "auto";
  S.last = cleanResult(raw.last);
  S.kind = KINDS.has(raw.kind) ? raw.kind : "soigné";
  S.log = list(raw.log, LOG_MAX).filter((e) => e && typeof e === "object" && KINDS.has(e.kind)).map((e) => ({
    s: int(e.s, 0, 999, 0), kind: e.kind, score: int(e.score, 0, 100, 0), at: int(e.at, 0, 8.64e15, 0),
    bad: list(e.bad, 30).filter((b) => b && typeof b === "object").map((b) => ({ p: text(b.p, 4), heard: typeof b.heard === "string" ? text(b.heard, 4) : null }))
  }));
  S.progress = sanitizeProgress(raw.progress);
  S.srs = sanitizeSrs(raw.srs);
  S.listening = sanitizeListening(raw.listening);
  S.mistakes = sanitizeMistakes(raw.mistakes, (id) => !!mistakeById(id));
  S.game = sanitizeGame(raw.game); // le jeu (phase 6) : pièces, coffres, compagnon
  S.bosses = sanitizeBosses(raw.bosses); // boss du parcours (phase 9) : victoires et essais par région
  return S;
}

// Journal du banc de test (tâche 7) : un essai = phrase, type d'essai, note, sons signalés.
export function logEntry(sentenceIndex, kind, last, now = Date.now()) {
  const bad = [];
  for (const w of last.words) for (const ph of w.phones) if (ph.status === "bad") bad.push({ p: ph.p, heard: ph.heard });
  return { s: sentenceIndex, kind: KINDS.has(kind) ? kind : "soigné", score: last.score, at: now, bad: bad.slice(0, 30) };
}
export function addLog(S, entry) {
  S.log = [...S.log, entry].slice(-LOG_MAX);
}

// Lecture au démarrage. Une sauvegarde présente mais refusée n'est jamais perdue en silence (relecture complète, n° 3) :
// - illisible ou abîmée : copiée d'abord sous DAMAGED_KEY (sans écraser une copie déjà faite), et l'utilisateur est prévenu ;
// - d'une version PLUS RÉCENTE de l'appli (onglet resté sur une ancienne version) : rien n'est écrit tant que la page
//   n'est pas rechargée.
export const DAMAGED_KEY = "labo.v2.abimee";
const blocked = new WeakMap(); // sauvegarde en mémoire → raison du refus d'écrire ("newer" | "other-tab")
const noticeListeners = new Set();
// Prévient l'écran d'un problème de sauvegarde : "damaged" (copie de secours faite), "newer", "other-tab".
export const onStoreNotice = (fn) => { noticeListeners.add(fn); return () => noticeListeners.delete(fn); };
const notice = (kind) => noticeListeners.forEach((fn) => { try { fn(kind); } catch (e) { console.error(e); } });
const pending = []; // avis donnés avant qu'un écran ne s'abonne (au chargement)
export const takeNotices = () => pending.splice(0);
export const isBlocked = (S) => blocked.get(S) || null;

export function load(storage = globalThis.localStorage) {
  let text = null;
  try { text = storage.getItem(STORE_KEY); } catch { return defaults(); }
  if (!text) return defaults();
  let raw = null;
  try { raw = JSON.parse(text); } catch { /* illisible */ }
  if (raw && typeof raw === "object" && Number.isInteger(raw.version) && raw.version > VERSION) {
    const S = defaults(); blocked.set(S, "newer"); pending.push("newer"); return S;
  }
  if (raw && typeof raw === "object" && raw.version === VERSION) {
    try { return sanitize(raw); } catch { /* abîmée */ }
  }
  try { if (!storage.getItem(DAMAGED_KEY)) storage.setItem(DAMAGED_KEY, text); } catch { /* rien */ }
  pending.push("damaged");
  return defaults();
}

// Numéro de révision de ce qui est enregistré (−1 si rien ou illisible).
function storedRev(storage) {
  try { const t = storage.getItem ? storage.getItem(STORE_KEY) : null; if (!t) return -1; const r = JSON.parse(t).rev; return Number.isInteger(r) ? r : 0; }
  catch { return -1; }
}
// Un autre onglet a enregistré depuis : cette copie en mémoire est périmée, elle n'écrira plus (relecture complète, n° 1).
export function markStale(S) { if (!blocked.has(S)) { blocked.set(S, "other-tab"); notice("other-tab"); } }

// Échec d'enregistrement (navigation privée, stockage plein ou bloqué) : les écrans abonnés sont prévenus,
// pour que l'utilisateur ne croie pas sa progression gardée alors qu'elle disparaîtra au rechargement.
const saveErrorListeners = new Set();
export const onSaveError = (fn) => { saveErrorListeners.add(fn); return () => saveErrorListeners.delete(fn); };

// Gains du jeu (pièces, coffres de niveau) : calculés ici, d'après les XP, à chaque enregistrement.
// Ainsi tous les écrans qui donnent des XP donnent aussi des pièces, sans rien changer chez eux.
// Après l'écriture, les effets de jeu (« +XP », niveau gagné) sont prévenus avec ces gains ; une erreur
// dans un effet n'empêche jamais l'enregistrement.
const savedListeners = new Set();
export const onSaved = (fn) => { savedListeners.add(fn); return () => savedListeners.delete(fn); };

export function save(S, storage = globalThis.localStorage) {
  if (blocked.has(S)) { notice(blocked.get(S)); return false; }
  // Deux onglets : si ce qui est enregistré est plus récent que ce que cet onglet a lu, on n'écrase pas.
  if (storedRev(storage) > (S.rev || 0)) { markStale(S); return false; }
  const g = S.game && S.progress ? syncGame(S.game, S.progress) : { coins: 0, chests: [], levels: [] };
  let ok = true;
  S.rev = (S.rev || 0) + 1;
  try { storage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { ok = false; S.rev--; saveErrorListeners.forEach((fn) => fn(e)); }
  savedListeners.forEach((fn) => { try { fn(g); } catch (e) { console.error(e); } });
  return ok;
}
