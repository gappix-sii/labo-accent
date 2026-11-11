// Enregistrement micro, détection de fin de parole, conversion en 16 kHz mono, synthèse vocale.

export class Recorder {
  constructor({ onLevel, onAutoStop } = {}) {
    this.onLevel = onLevel || (() => {});
    this.onAutoStop = onAutoStop || (() => {});
    this.active = false;
  }

  async start() {
    if (this.active) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.done = new Promise(res => { this.rec.onstop = res; });
    this.rec.start();
    this.active = true;
    this.t0 = performance.now();
    this.speechAt = 0; this.lastLoud = 0;
    const buf = new Float32Array(this.analyser.fftSize);
    const tick = () => {
      if (!this.active) return;
      this.analyser.getFloatTimeDomainData(buf);
      let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length);
      const now = performance.now();
      this.onLevel(Math.min(1, rms * 8));
      if (rms > 0.025) { if (!this.speechAt) this.speechAt = now; this.lastLoud = now; }
      const elapsed = now - this.t0;
      // Arrêt automatique : 1,4 s de silence après avoir parlé, ou 15 s au maximum.
      if ((this.speechAt && now - this.lastLoud > 1400 && now - this.speechAt > 500) || elapsed > 15000) {
        this.onAutoStop(); return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  async stop() {
    if (!this.active) return null;
    this.active = false;
    cancelAnimationFrame(this.raf);
    try { this.rec.stop(); } catch (e) {}
    await this.done;
    this.stream.getTracks().forEach(t => t.stop()); // coupe le micro tout de suite
    const blob = new Blob(this.chunks, { type: this.rec.mimeType || "audio/webm" });
    const heardSpeech = !!this.speechAt;
    let pcm = null;
    try { pcm = await toPcm16k(this.ctx, blob); } finally { try { await this.ctx.close(); } catch (e) {} }
    return { blob, pcm, heardSpeech };
  }
}

async function toPcm16k(ctx, blob) {
  const ab = await blob.arrayBuffer();
  const decoded = await new Promise((res, rej) => {
    const p = ctx.decodeAudioData(ab, res, rej);
    if (p && p.then) p.then(res, rej);
  });
  const len = Math.max(1, Math.ceil(decoded.duration * 16000));
  const off = new OfflineAudioContext(1, len, 16000);
  const src = off.createBufferSource();
  src.buffer = decoded; src.connect(off.destination); src.start();
  const rendered = await off.startRendering();
  return trimAndNormalize(rendered.getChannelData(0));
}

// Retire les silences au début et à la fin, normalise le volume.
function trimAndNormalize(x) {
  const win = 320, thr = 0.012;
  let a = 0, b = x.length;
  const energy = i => { let s = 0; for (let k = i; k < Math.min(x.length, i + win); k++) s += x[k] * x[k]; return Math.sqrt(s / win); };
  while (a < x.length && energy(a) < thr) a += win;
  while (b > a && energy(Math.max(0, b - win)) < thr) b -= win;
  a = Math.max(0, a - 3200); b = Math.min(x.length, b + 3200); // garde 0,2 s de marge
  const y = x.slice(a, b);
  let peak = 0; for (let i = 0; i < y.length; i++) peak = Math.max(peak, Math.abs(y[i]));
  if (peak > 0.01) { const g = 0.9 / peak; for (let i = 0; i < y.length; i++) y[i] *= g; }
  return { samples: y, offsetSec: a / 16000 };
}

// ---------- Synthèse vocale (voix de l'appareil) ----------
export function englishVoices() { return voicesFor("en"); }
export function voicesFor(lang) {
  if (!("speechSynthesis" in window)) return [];
  const re = new RegExp("^" + lang + "([-_]|$)", "i");
  return speechSynthesis.getVoices().filter(v => re.test(v.lang));
}

export function speak(text, { voiceURI = "", rate = 1, pitch = 1, lang = "en" } = {}) {
  if (!("speechSynthesis" in window)) return Promise.resolve(false);
  return new Promise(res => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = voicesFor(lang);
    const pref = lang === "en" ? /en-US/i : /fr-FR/i;
    const v = voices.find(x => x.voiceURI === voiceURI) || voices.find(x => pref.test(x.lang)) || voices[0];
    if (v) u.voice = v;
    u.lang = v ? v.lang : (lang === "en" ? "en-US" : "fr-FR");
    u.rate = rate; u.pitch = pitch;
    let done = false; const fin = ok => { if (!done) { done = true; res(ok); } };
    u.onend = () => fin(true); u.onerror = () => fin(false);
    setTimeout(() => fin(false), 400 + text.length * 120); // certains navigateurs n'envoient jamais onend
    speechSynthesis.speak(u);
  });
}

// PCM 16 kHz (Float32) -> WAV 16 bits mono, encodé en base64 (pour l'envoi à Gemini).
export function wavBase64(samples, rate = 16000) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  const bytes = new Uint8Array(buf); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
