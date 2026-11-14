// Voix naturelle côté page : pilote le worker Kokoro et joue l'audio morceau par morceau dès qu'il est prêt.
// Garde les dernières phrases en mémoire (réécoute instantanée). Repris de ancien/js/tts.js, simplifié.
import { makeWorker } from "../core/dom.js";

export const VOICE_MB = 90; // taille de la voix à télécharger la première fois
export const VOICES = [
  { id: "af_heart", name: "Heart (femme)" },
  { id: "am_michael", name: "Michael (homme)" }
];
const RATE = 24000, GAP = 0.09;

let worker = null, ready = null, ctx = null, cur = null, seq = 0;
const listeners = new Set(), memo = new Map();
export const onVoice = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (ev) => listeners.forEach((fn) => fn(ev));

function onMsg(e) {
  const m = e.data || {};
  if (m.type === "progress" || m.type === "ready") return emit(m);
  if (m.type === "error" && m.id === undefined) return emit({ type: "error", message: m.message });
  const c = cur;
  if (!c || m.id !== c.id) return;
  if (m.type === "chunk" && m.audio instanceof Float32Array) { c.parts.push(m.audio); if (!c.silent) play(c, m.audio); }
  else if (m.type === "end") { c.done = true; if (!m.cancelled && c.parts.length) remember(c.key, c.parts); check(c); }
  else if (m.type === "error") finish(c, new Error(m.message));
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
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function play(c, audio) {
  if (!audio.length) return;
  const buf = ctx.createBuffer(1, audio.length, RATE);
  buf.getChannelData(0).set(audio);
  const src = ctx.createBufferSource();
  src.buffer = buf; src.connect(ctx.destination);
  const at = Math.max(ctx.currentTime + 0.03, c.nextAt);
  src.start(at);
  c.nextAt = at + buf.duration + GAP;
  c.playing++; c.sources.push(src);
  src.onended = () => { c.playing--; check(c); };
}
function check(c) { if (c.done && c.playing <= 0) finish(c, null); }
function finish(c, err) {
  if (c.over) return;
  c.over = true;
  if (cur === c) cur = null;
  err ? c.reject(err) : c.resolve();
}

function remember(key, parts) {
  memo.delete(key); memo.set(key, parts);
  while (memo.size > 30) memo.delete(memo.keys().next().value);
}

function request(text, voice, speed) {
  const t = String(text || "").trim();
  const v = VOICES.some((x) => x.id === voice) ? voice : "af_heart";
  const sp = Math.min(1.25, Math.max(0.6, Number(speed) || 1));
  return { t, v, sp, key: `${v}|${sp}|${t}` };
}

function start(r, silent) {
  let c;
  c = { id: ++seq, key: r.key, silent, parts: [], sources: [], playing: 0, nextAt: 0, done: false, over: false };
  c.promise = new Promise((resolve, reject) => { c.resolve = resolve; c.reject = reject; });
  cur = c;
  if (!r.t) { finish(c, null); return c; }
  prepareVoice().then(() => {
    if (!c.over) worker.postMessage({ type: "say", id: c.id, text: r.t, voice: r.v, speed: r.sp });
  }, (e) => finish(c, e));
  return c;
}

// Lit un texte anglais. Se résout à la fin de la lecture (ou si une autre lecture l'interrompt).
// À appeler pendant un clic : le navigateur n'autorise le son qu'après un geste de l'utilisateur.
export function say(text, { voice = "af_heart", speed = 1 } = {}) {
  audioCtx();
  const r = request(text, voice, speed);
  const hit = memo.get(r.key);
  if (hit) { // déjà préparée : lecture immédiate
    stopVoice();
    const c = { id: ++seq, key: r.key, silent: false, parts: hit, sources: [], playing: 0, nextAt: 0, done: true, over: false };
    c.promise = new Promise((resolve, reject) => { c.resolve = resolve; c.reject = reject; });
    cur = c;
    hit.forEach((a) => play(c, a));
    check(c);
    return c.promise;
  }
  if (cur && !cur.over && cur.silent && cur.key === r.key) { // en cours de préparation : on la rend audible
    cur.silent = false;
    cur.parts.forEach((a) => play(cur, a));
    check(cur);
    return cur.promise;
  }
  stopVoice();
  return start(r, false).promise;
}

// Prépare une phrase en arrière-plan, sans la jouer : le clic sur « Écouter » sera immédiat.
// N'interrompt jamais une lecture en cours.
export function preload(text, { voice = "af_heart", speed = 1 } = {}) {
  const r = request(text, voice, speed);
  if (!r.t || memo.has(r.key)) return Promise.resolve();
  if (cur && !cur.over) {
    if (cur.key === r.key) return cur.promise.catch(() => {});
    if (!cur.silent) return Promise.resolve();
    stopVoice(); // une autre préparation en cours : on passe à celle-ci
  }
  return start(r, true).promise.catch(() => {});
}

export function stopVoice() {
  const c = cur;
  if (!c) return;
  for (const s of c.sources) { s.onended = null; try { s.stop(); } catch { /* déjà fini */ } }
  if (worker && !c.done) worker.postMessage({ type: "cancel" });
  finish(c, null);
}
