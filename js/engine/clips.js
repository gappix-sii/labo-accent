// Sons des phrases fixes, fabriqués à l'avance (tools/fabrique.html) et livrés avec l'appli dans data/audio/.
// Rien à télécharger ni à calculer sur l'appareil : le clic joue un petit fichier (≈ 7 Ko).
// « Lentement » = le même fichier joué plus lentement, sans changer la hauteur de la voix (preservesPitch).
export const VOICES = [
  { id: "af_heart", name: "Heart (femme)" },
  { id: "am_michael", name: "Michael (homme)" }
];
const BASE = new URL("../../data/audio/", import.meta.url);
const KEEP = 24; // lecteurs gardés prêts en mémoire

let index = null, indexLoading = null, current = null, gen = 0, stats = null;
const players = new Map(); // nom du fichier → <audio> déjà chargé

// Liste des sons (texte → fichier), lue une fois. Exportée pour les tests.
// L'appli lit files.json (texte → nom du fichier, écrite par la fabrique) ; index.json, trois fois plus lourde
// (prononciation, durée, taille de chaque son), ne sert qu'à la fabrique. Les deux formes sont acceptées ici.
export function fileFor(idx, text, voice) {
  const v = idx && idx.clips && Object.hasOwn(idx.clips, voice) ? idx.clips[voice] : null;
  const c = v && Object.hasOwn(v, text) ? v[text] : null;
  const file = typeof c === "string" ? c : c && c.file;
  return typeof file === "string" && /^(?:af|am)_[a-z]+-[0-9a-f]{16}\.ogg$/.test(file) ? file : null;
}

export function loadIndex() {
  if (index) return Promise.resolve(index);
  if (!indexLoading) {
    indexLoading = fetch(new URL("files.json", BASE))
      .then((r) => { if (!r.ok) throw new Error("liste des sons introuvable"); return r.json(); })
      .then((j) => (index = j))
      .catch((e) => { indexLoading = null; throw e; });
  }
  return indexLoading;
}

function player(file) {
  let a = players.get(file);
  if (a) { players.delete(file); players.set(file, a); return a; } // le plus récent en dernier
  a = new Audio();
  a.preload = "auto";
  a.src = new URL(file, BASE).href;
  players.set(file, a);
  while (players.size > KEEP) {
    const [old, p] = players.entries().next().value;
    if (current && current.audio === p) break;
    p.removeAttribute("src"); p.load(); players.delete(old);
  }
  return a;
}

// Charge à l'avance le son d'une phrase : le clic suivant part tout de suite.
export async function preload(text, { voice = "af_heart" } = {}) {
  const file = fileFor(await loadIndex(), text, voice);
  if (file) player(file);
}

// Mesure de la dernière lecture (délai entre le clic et le son), affichée sous les boutons.
export const lastStats = () => stats;

// Joue la phrase. Se résout à la fin du son, ou quand une autre lecture (ou stopVoice) l'interrompt.
export async function say(text, { voice = "af_heart", speed = 1 } = {}) {
  const t0 = performance.now();
  stopVoice();
  const my = ++gen;
  const file = fileFor(await loadIndex(), String(text || "").trim(), voice);
  if (my !== gen) return; // un autre clic est arrivé entre-temps : c'est lui qui joue
  if (!file) throw new Error("son absent : relancer la fabrique des sons (npm run fabrique)");
  const audio = player(file);
  audio.preservesPitch = true;
  audio.playbackRate = Math.min(1.25, Math.max(0.5, Number(speed) || 1));
  audio.currentTime = 0;
  return new Promise((resolve, reject) => {
    const c = { audio, done: () => { cleanup(); resolve(); } };
    const cleanup = () => {
      audio.onended = audio.onerror = audio.onplaying = null;
      if (current === c) current = null;
    };
    current = c;
    stats = { firstMs: null };
    audio.onplaying = () => { stats = { firstMs: Math.round(performance.now() - t0) }; audio.onplaying = null; };
    audio.onended = c.done;
    audio.onerror = () => { cleanup(); players.delete(file); reject(new Error("lecture du son impossible")); };
    audio.play().catch((e) => { cleanup(); reject(e); });
  });
}

// Arrête la lecture en cours.
export function stopVoice() {
  gen++; // une lecture qui attendait encore la liste des sons ne partira pas
  const c = current;
  if (!c) return;
  c.audio.pause();
  c.done();
}
