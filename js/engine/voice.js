// Voix naturelle côté page : pilote le worker Kokoro et joue l'audio morceau par morceau dès qu'il est prêt.
// Garde les dernières phrases en mémoire (réécoute instantanée). Repris de ancien/js/tts.js, simplifié.
import { makeWorker } from "../core/dom.js";
import { getClip, putClip } from "./clip-store.js";

export const VOICE_MB = 90; // taille de la voix à télécharger la première fois
export const VOICES = [
  { id: "af_heart", name: "Heart (femme)" },
  { id: "am_michael", name: "Michael (homme)" }
];
const RATE = 24000, GAP = 0.09;

// job : la phrase que le worker est en train de fabriquer (en silence ou pour la jouer).
// out : la lecture en cours (une phrase déjà prête en mémoire, ou le job lui-même).
// Les séparer permet de rejouer une phrase prête sans interrompre la préparation des suivantes.
let worker = null, ready = null, ctx = null, job = null, out = null, seq = 0;
const listeners = new Set(), memo = new Map();
export const onVoice = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (ev) => listeners.forEach((fn) => fn(ev));

function onMsg(e) {
  const m = e.data || {};
  if (m.type === "progress" || m.type === "ready") return emit(m);
  if (m.type === "error" && m.id === undefined) return emit({ type: "error", message: m.message });
  const c = job;
  if (!c || m.id !== c.id) return;
  if (m.type === "chunk" && m.audio instanceof Float32Array) { c.parts.push(m.audio); if (!c.silent) play(c, m.audio); }
  else if (m.type === "end") {
    c.done = true; job = null; // le worker est libre
    if (!m.cancelled && c.parts.length) { remember(c.key, c.parts); putClip(c.key, c.parts); }
    check(c);
  } else if (m.type === "error") finish(c, new Error(m.message));
}

// Charge la voix (télécharge le modèle la première fois). Se résout quand elle est prête.
export function prepareVoice() {
  if (!worker) {
    worker = makeWorker(new URL("./tts-worker.js", import.meta.url));
    worker.onmessage = onMsg;
    worker.onerror = (e) => emit({ type: "error", message: e.message || "la voix s'est arrêtée" });
  }
  if (!ready) {
    ready = new Promise((res, rej) => {
      const off = onVoice((ev) => {
        if (ev.type === "ready") { off(); res(ev); }
        if (ev.type === "error") { off(); ready = null; worker.terminate(); worker = null; rej(new Error(ev.message)); }
      });
    });
    worker.postMessage({ type: "init" });
  }
  return ready;
}

function audioCtx() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    // Un son nul joué en continu garde la sortie audio ouverte : sinon Windows (et surtout un casque
    // Bluetooth) la met en veille, et le réveil ajoute un délai avant chaque lecture.
    const keep = ctx.createConstantSource(), mute = ctx.createGain();
    keep.offset.value = 0; mute.gain.value = 0;
    keep.connect(mute).connect(ctx.destination);
    keep.start();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// À appeler au premier geste de l'utilisateur sur la page : la sortie audio est prête avant le 1er clic sur « Écouter ».
export function unlockAudio() { audioCtx(); }

// Mesure de la dernière lecture (affichée sous les boutons, pour trouver l'origine d'un délai).
let stats = null;
export const lastStats = () => stats;

function play(c, audio) {
  if (!audio.length) return;
  const buf = ctx.createBuffer(1, audio.length, RATE);
  buf.getChannelData(0).set(audio);
  const src = ctx.createBufferSource();
  src.buffer = buf; src.connect(ctx.destination);
  const at = Math.max(ctx.currentTime + 0.03, c.nextAt);
  if (c.stats && c.stats.firstMs === null) {
    c.stats.firstMs = Math.round(performance.now() - c.stats.t0 + (at - ctx.currentTime) * 1000);
    c.stats.outMs = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000);
    c.stats.state = ctx.state;
  }
  src.start(at);
  c.nextAt = at + buf.duration + GAP;
  c.playing++; c.sources.push(src);
  src.onended = () => { c.playing--; check(c); };
}
function check(c) { if (c.done && c.playing <= 0) finish(c, null); }
function finish(c, err) {
  if (c.over) return;
  c.over = true;
  if (job === c) job = null;
  if (out === c) out = null;
  err ? c.reject(err) : c.resolve();
}

function newReq(key, silent, parts = [], done = false) {
  const c = { id: ++seq, key, silent, parts, sources: [], playing: 0, nextAt: 0, done, over: false, stats: null };
  c.promise = new Promise((resolve, reject) => { c.resolve = resolve; c.reject = reject; });
  return c;
}

// Abandonne la fabrication en cours dans le worker.
function cancelJob() {
  const c = job;
  if (!c) return;
  if (worker && !c.done) worker.postMessage({ type: "cancel" });
  for (const s of c.sources) { s.onended = null; try { s.stop(); } catch { /* déjà fini */ } }
  finish(c, null);
}

function remember(key, parts) {
  memo.delete(key); memo.set(key, parts);
  while (memo.size > 60) memo.delete(memo.keys().next().value);
}

// Phrase prête : en mémoire, sinon gardée sur l'appareil par une session précédente.
async function ready_(key) {
  if (memo.has(key)) return memo.get(key);
  const parts = await getClip(key);
  if (parts) remember(key, parts);
  return parts;
}

function request(text, voice, speed) {
  const t = String(text || "").trim();
  const v = VOICES.some((x) => x.id === voice) ? voice : "af_heart";
  const sp = Math.min(1.25, Math.max(0.6, Number(speed) || 1));
  return { t, v, sp, key: `${v}|${sp}|${t}` };
}

function start(r, silent) {
  const c = newReq(r.key, silent);
  job = c;
  if (!silent) out = c;
  if (!r.t) { finish(c, null); return c; }
  prepareVoice().then(() => {
    if (!c.over) worker.postMessage({ type: "say", id: c.id, text: r.t, voice: r.v, speed: r.sp });
  }, (e) => finish(c, e));
  return c;
}

// Lit un texte anglais. Se résout à la fin de la lecture (ou si une autre lecture l'interrompt).
// À appeler pendant un clic : le navigateur n'autorise le son qu'après un geste de l'utilisateur.
export async function say(text, { voice = "af_heart", speed = 1 } = {}) {
  const t0 = performance.now(), fresh = !ctx;
  audioCtx(); // tout de suite, pendant le clic
  const r = request(text, voice, speed);
  const st = (prepared) => (stats = { t0, prepared, freshAudio: fresh, firstMs: null, outMs: null, state: "" });
  stopVoice(); // arrête la lecture en cours, sans toucher à une préparation en arrière-plan
  const hit = await ready_(r.key);
  if (hit) { // déjà prête : lecture immédiate, pendant que le worker continue de préparer la suite
    const c = newReq(r.key, false, hit, true);
    c.stats = st("oui");
    out = c;
    hit.forEach((a) => play(c, a));
    check(c);
    return c.promise;
  }
  if (job && job.silent && job.key === r.key) { // en cours de préparation : on la rend audible
    const c = job;
    c.silent = false; c.stats = st("en cours"); out = c;
    c.parts.forEach((a) => play(c, a));
    check(c);
    return c.promise;
  }
  cancelJob(); // une autre phrase était en préparation : celle qu'on veut entendre passe d'abord
  const c = start(r, false);
  c.stats = st("non");
  return c.promise;
}

// Prépare une phrase en arrière-plan, sans la jouer : le clic sur « Écouter » sera immédiat.
// N'interrompt jamais une lecture en cours.
export function preload(text, { voice = "af_heart", speed = 1 } = {}) {
  const r = request(text, voice, speed);
  if (!r.t || memo.has(r.key)) return Promise.resolve();
  return getClip(r.key).then((parts) => {
    if (parts) { remember(r.key, parts); return; } // gardée sur l'appareil : rien à fabriquer
    return fabricate(r);
  });
}

function fabricate(r) {
  if (memo.has(r.key)) return Promise.resolve();
  if (job) {
    if (job.key === r.key) return job.promise.catch(() => {});
    if (!job.silent) return Promise.resolve(); // une phrase demandée à l'écoute passe avant
    cancelJob(); // une autre préparation en cours : on passe à celle-ci
  }
  return start(r, true).promise.catch(() => {});
}

// Arrête la lecture en cours. Une préparation silencieuse en arrière-plan continue.
export function stopVoice() {
  const c = out;
  if (!c) return;
  for (const s of c.sources) { s.onended = null; try { s.stop(); } catch { /* déjà fini */ } }
  if (job === c && worker && !c.done) worker.postMessage({ type: "cancel" });
  finish(c, null);
}
