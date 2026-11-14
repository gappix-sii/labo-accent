// Voix naturelle côté page : pilote le worker Kokoro, joue l'audio phrase par phrase dès qu'elle est prête,
// garde les dernières phrases en mémoire (réécoute instantanée) et s'arrête net quand on parle d'autre chose.
// Si la voix naturelle n'est pas prête ou échoue, speak() (audio.js) bascule sur la voix de l'appareil.
import { makeWorker } from "./core/dom.js";

export const NATURAL_VOICES = [
  { id: "af_heart", name: "Heart", desc: "femme, chaleureuse" },
  { id: "am_michael", name: "Michael", desc: "homme, posé" },
  { id: "af_bella", name: "Bella", desc: "femme, pleine d'énergie" }
];
export const TTS_REPO = "onnx-community/Kokoro-82M-v1.0-ONNX";
const MODEL_URL = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/1939ad2a8e416c0acfeecc08a694d14ef25f2231/onnx/model_quantized.onnx";
const RATE = 24000, GAP = 0.09;

let enabled = false, local = false, worker = null, state = "off", info = { loaded: 0, total: 0, error: "" };
let ctx = null, cur = null, seq = 0, waiters = [];
const subs = new Set(), cache = new Map();

const emit = () => subs.forEach(f => { try { f(state, info); } catch (e) {} });
export function onTts(f) { subs.add(f); return () => subs.delete(f); }
export function ttsState() { return { state, ...info }; }
export function naturalOn() { return enabled; }

export function configureTts(o = {}) {
  enabled = !!o.enabled; local = !!o.local;
  if (!enabled) { naturalCancel(); stopWorker(); }
}

// Le modèle est-il déjà sur l'appareil ? (évite de relancer 92 Mo de téléchargement sans le dire)
export async function ttsCached() {
  if (local) return true;
  try {
    const c = await caches.open("transformers-cache");
    if (await c.match(MODEL_URL)) return true;
    return (await c.keys()).some(r => r.url.includes("/" + TTS_REPO + "/") && r.url.endsWith("/onnx/model_quantized.onnx"));
  } catch (e) { return false; }
}

function stopWorker() {
  if (worker) { worker.terminate(); worker = null; }
  state = "off"; info = { loaded: 0, total: 0, error: "" };
  waiters.splice(0).forEach(r => r(false));
  emit();
}

export function initTts() {
  if (state === "ready") return Promise.resolve(true);
  const p = new Promise(r => waiters.push(r));
  if (!worker) {
    try { worker = makeWorker(new URL("./tts-worker.js", import.meta.url)); } catch (e) { fail(String(e && e.message || e)); return p; }
    worker.onmessage = onMsg;
    worker.onerror = e => { e.preventDefault && e.preventDefault(); fail("worker"); };
    state = "loading"; info = { loaded: 0, total: 0, error: "" }; emit();
    worker.postMessage({ type: "init", local });
  }
  return p;
}
function fail(message) {
  if (worker) { worker.terminate(); worker = null; }
  state = "error"; info = { ...info, error: message };
  waiters.splice(0).forEach(r => r(false));
  if (cur) finish(cur, cur.started ? false : null);
  emit();
}
function waitReady(ms) {
  if (state === "ready") return Promise.resolve(true);
  return Promise.race([initTts(), new Promise(r => setTimeout(() => r(false), ms))]);
}

function onMsg(e) {
  const m = e.data || {};
  if (m.type === "progress") { info = { ...info, loaded: m.loaded, total: m.total }; emit(); return; }
  if (m.type === "ready") { state = "ready"; info = { ...info, threads: m.threads, error: "" }; waiters.splice(0).forEach(r => r(true)); emit(); return; }
  if (m.type === "error" && m.id === undefined) { fail(m.message || "chargement"); return; }
  if (!cur || m.id !== cur.id) return;
  const c = cur;
  if (m.type === "chunk" && m.audio instanceof Float32Array) { c.parts.push(m.audio); play(c, m.audio); arm(c); }
  else if (m.type === "end") { c.done = true; clearTimeout(c.timer); if (!m.cancelled && c.parts.length) remember(c.key, c.parts); check(c); }
  else if (m.type === "error") finish(c, c.started ? false : null);
}

function audioCtx() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
function play(c, audio) {
  const ac = ctx; if (!ac || !audio.length) return;
  const buf = ac.createBuffer(1, audio.length, RATE);
  buf.getChannelData(0).set(audio);
  const src = ac.createBufferSource();
  src.buffer = buf; src.connect(ac.destination);
  const at = Math.max(ac.currentTime + 0.03, c.nextAt);
  src.start(at);
  c.nextAt = at + buf.duration + GAP;
  c.started = true; c.playing++; c.sources.push(src);
  src.onended = () => { c.playing--; check(c); };
}
function check(c) { if (c.done && c.playing <= 0) finish(c, true); }
function arm(c) { clearTimeout(c.timer); c.timer = setTimeout(() => finish(c, c.started ? false : null), c.started ? 30000 : 20000); }
function finish(c, result) {
  if (c.over) return;
  c.over = true; clearTimeout(c.timer);
  if (cur === c) cur = null;
  c.resolve(result);
}

// Mémoire des dernières phrases (réécoute instantanée, ex. bouton « Écouter » répété).
function remember(key, parts) {
  cache.delete(key); cache.set(key, parts);
  let total = 0; for (const p of cache.values()) total += p.reduce((a, x) => a + x.length, 0);
  while (cache.size > 40 || total > 6e6) { const [k, v] = cache.entries().next().value; cache.delete(k); total -= v.reduce((a, x) => a + x.length, 0); }
}

// Résultat : true = lu en entier, false = interrompu, null = voix naturelle indisponible (prendre la voix de l'appareil).
export function naturalSay(text, { voice = "af_heart", rate = 1 } = {}) {
  naturalCancel();
  const t = String(text || "").trim();
  if (!enabled || !t || state === "error") return Promise.resolve(null);
  if (!audioCtx()) return Promise.resolve(null); // créé ou relancé pendant le geste de l'utilisateur
  const speed = Math.min(1.25, Math.max(0.6, Number(rate) || 1));
  const v = NATURAL_VOICES.some(x => x.id === voice) ? voice : "af_heart";
  const key = `${v}|${speed.toFixed(2)}|${t}`;
  return new Promise(resolve => {
    const c = cur = { id: ++seq, key, resolve, parts: [], sources: [], playing: 0, nextAt: 0, done: false, started: false, over: false, timer: 0 };
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); hit.forEach(a => play(c, a)); c.done = true; check(c); return; }
    waitReady(8000).then(ok => {
      if (c.over) return;
      if (!ok || !worker) return finish(c, null);
      arm(c);
      worker.postMessage({ type: "say", id: c.id, text: t, voice: v, speed, local });
    });
  });
}

export function naturalCancel() {
  const c = cur;
  if (!c) return;
  for (const s of c.sources) { s.onended = null; try { s.stop(); } catch (e) {} }
  if (worker && !c.done) worker.postMessage({ type: "cancel" });
  finish(c, false);
}

// Retire le modèle de l'appareil (cache du navigateur).
export async function deleteTts() {
  configureTts({ enabled: false, local });
  cache.clear();
  try {
    const c = await caches.open("transformers-cache");
    for (const req of await c.keys()) if (req.url.includes("/" + TTS_REPO + "/")) await c.delete(req);
  } catch (e) {}
}
