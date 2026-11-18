// Son du direct (phase 5) : micro envoyé PENDANT qu'on parle (16 kHz), réponse de Gemini jouée au fil de l'eau (24 kHz).
// À l'essai (2026-11-18), un enregistrement envoyé d'un seul bloc bloquait parfois Google plusieurs secondes ;
// envoyé au rythme réel, jamais. Les fonctions pures (conversion, rééchantillonnage, silence) sont testées dans Node.
import { scriptURL } from "../core/dom.js";

export const IN_RATE = 16000, OUT_RATE = 24000, CHUNK = 1600; // 100 ms de son par envoi

// Float32 [-1, 1] → PCM 16 bits petit-boutiste, en base64.
export function f32ToPcm64(f32) {
  const b = new Uint8Array(f32.length * 2), v = new DataView(b.buffer);
  for (let i = 0; i < f32.length; i++) { const s = Math.max(-1, Math.min(1, f32[i])); v.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(bin);
}

// PCM 16 bits base64 → Float32 (renvoie un tableau vide si les données sont abîmées).
export function pcm64ToF32(b64) {
  let bin;
  try { bin = atob(typeof b64 === "string" ? b64 : ""); } catch { return new Float32Array(0); }
  const n = bin.length >> 1, out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let x = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (x >= 0x8000) x -= 0x10000; out[i] = x / 0x8000; }
  return out;
}

// Rééchantillonnage simple (interpolation linéaire) du débit du micro (souvent 48 kHz) vers 16 kHz, morceau par morceau.
export class Resampler {
  constructor(from, to = IN_RATE) { this.step = from / to; this.pos = 0; this.last = 0; }
  push(x) {
    const out = [];
    // pos : position (en échantillons d'entrée) du prochain échantillon de sortie ; -1 = dernier du morceau précédent
    while (this.pos < x.length - 1 + 1e-9) {
      const i = Math.floor(this.pos), f = this.pos - i;
      const a = i < 0 ? this.last : x[i], b = i + 1 < x.length ? x[i + 1] : x[i];
      out.push(a + (b - a) * f);
      this.pos += this.step;
    }
    this.pos -= x.length;
    if (x.length) this.last = x[x.length - 1];
    return Float32Array.from(out);
  }
}

export const rms = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return x.length ? Math.sqrt(s / x.length) : 0; };

// Fin de phrase détectée sur l'appareil : 1,2 s de silence après au moins 0,4 s de parole, ou 25 s au maximum.
// (Google sait aussi le faire, mais il attend un silence plus long ; ici on lui signale la fin nous-mêmes.)
export class SilenceDetector {
  constructor({ threshold = 0.02, silenceMs = 1200, minSpeechMs = 400, maxMs = 25000 } = {}) {
    Object.assign(this, { threshold, silenceMs, minSpeechMs, maxMs, t: 0, speech: 0, quiet: 0 });
  }
  // Ajoute un morceau de `ms` millisecondes ; renvoie true quand la phrase est finie.
  push(level, ms) {
    this.t += ms;
    if (level > this.threshold) { this.speech += ms; this.quiet = 0; } else if (this.speech) this.quiet += ms;
    return (this.speech >= this.minSpeechMs && this.quiet >= this.silenceMs) || this.t >= this.maxMs;
  }
  get heard() { return this.speech >= this.minSpeechMs; }
}

// Micro en direct : onChunk(Float32Array de 100 ms à 16 kHz), onLevel(0..1), onEnd() à la fin de phrase détectée.
export class MicStream {
  constructor({ onChunk, onLevel = () => {}, onEnd = () => {} }) { Object.assign(this, { onChunk, onLevel, onEnd }); this.active = false; }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    try {
      this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      await this.ctx.audioWorklet.addModule(scriptURL(new URL("./mic-worklet.js", import.meta.url)));
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, "labo-mic");
      const rs = new Resampler(this.ctx.sampleRate), det = new SilenceDetector();
      let buf = new Float32Array(0);
      this.active = true;
      this.node.port.onmessage = (e) => {
        if (!this.active) return;
        const y = rs.push(e.data), all = new Float32Array(buf.length + y.length);
        all.set(buf); all.set(y, buf.length); buf = all;
        while (buf.length >= CHUNK && this.active) {
          const c = buf.slice(0, CHUNK); buf = buf.slice(CHUNK);
          const lv = rms(c);
          this.onLevel(Math.min(1, lv * 8));
          this.onChunk(c);
          if (det.push(lv, 100)) { this.heard = det.heard; this.stop(); this.onEnd(); }
        }
      };
      src.connect(this.node);
      this.det = det;
    } catch (e) { this.stop(); throw e; }
  }

  // Coupe le micro tout de suite (le voyant du navigateur s'éteint).
  stop() {
    if (this.det) this.heard = this.det.heard;
    this.active = false;
    if (this.node) { this.node.port.onmessage = null; try { this.node.disconnect(); } catch { /* rien */ } }
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close().catch(() => {});
    this.node = this.stream = this.ctx = null;
  }
}

// Lecture de la réponse : morceaux enchaînés sans trou ; stop() coupe net (quand tu reprends la parole).
export class Player {
  constructor() { this.ctx = null; this.at = 0; this.sources = new Set(); }
  unlock() { if (!this.ctx) this.ctx = new AudioContext({ sampleRate: OUT_RATE }); if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); }
  play(b64) {
    this.unlock();
    const x = pcm64ToF32(b64);
    if (!x.length) return;
    const buf = this.ctx.createBuffer(1, x.length, OUT_RATE);
    buf.getChannelData(0).set(x);
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.connect(this.ctx.destination);
    this.at = Math.max(this.at, this.ctx.currentTime + 0.05);
    src.start(this.at); this.at += buf.duration;
    this.sources.add(src); src.onended = () => this.sources.delete(src);
  }
  get playing() { return !!this.ctx && this.at > this.ctx.currentTime; }
  stop() { for (const s of this.sources) { try { s.stop(); } catch { /* déjà fini */ } } this.sources.clear(); this.at = 0; }
  close() { this.stop(); if (this.ctx) this.ctx.close().catch(() => {}); this.ctx = null; }
}
