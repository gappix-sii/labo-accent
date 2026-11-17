// Enregistrement au micro, arrêt automatique en fin de parole, conversion en 16 kHz mono.
// Repris de l'ancienne appli (ancien/js/audio.js). L'audio reste dans le navigateur.

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
    try {
      this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
      this.chunks = [];
      this.rec = new MediaRecorder(this.stream);
      this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      this.done = new Promise((res) => { this.rec.onstop = res; });
      this.rec.start();
    } catch (e) {
      // Échec après l'ouverture du micro : on le coupe tout de suite, sinon il resterait allumé.
      this.stream.getTracks().forEach((t) => t.stop());
      if (this.ctx) this.ctx.close().catch(() => {});
      throw e;
    }
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
      // Arrêt automatique : 1,4 s de silence après avoir parlé, ou 15 s au maximum.
      if ((this.speechAt && now - this.lastLoud > 1400 && now - this.speechAt > 500) || now - this.t0 > 15000) {
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
    try { this.rec.stop(); } catch { /* déjà arrêté */ }
    await this.done;
    this.stream.getTracks().forEach((t) => t.stop()); // coupe le micro tout de suite
    const blob = new Blob(this.chunks, { type: this.rec.mimeType || "audio/webm" });
    const heardSpeech = !!this.speechAt;
    let pcm = null;
    try { pcm = await toPcm16k(this.ctx, blob); } finally { try { await this.ctx.close(); } catch { /* rien */ } }
    return { blob, pcm, heardSpeech };
  }
}

async function toPcm16k(ctx, blob) {
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  const len = Math.max(1, Math.ceil(decoded.duration * 16000));
  const off = new OfflineAudioContext(1, len, 16000);
  const src = off.createBufferSource();
  src.buffer = decoded; src.connect(off.destination); src.start();
  const rendered = await off.startRendering();
  return trimAndNormalize(rendered.getChannelData(0));
}

// Retire les silences au début et à la fin, normalise le volume. Exportée pour les tests.
export function trimAndNormalize(x) {
  const win = 320, thr = 0.012;
  let a = 0, b = x.length;
  const energy = (i) => { let s = 0; for (let k = i; k < Math.min(x.length, i + win); k++) s += x[k] * x[k]; return Math.sqrt(s / win); };
  while (a < x.length && energy(a) < thr) a += win;
  while (b > a && energy(Math.max(0, b - win)) < thr) b -= win;
  a = Math.max(0, a - 3200); b = Math.min(x.length, b + 3200); // garde 0,2 s de marge
  const y = x.slice(a, b);
  let peak = 0; for (let i = 0; i < y.length; i++) peak = Math.max(peak, Math.abs(y[i]));
  if (peak > 0.01) { const g = 0.9 / peak; for (let i = 0; i < y.length; i++) y[i] *= g; }
  return { samples: y, offsetSec: a / 16000 };
}
