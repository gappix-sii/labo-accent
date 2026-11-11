// Effets : petits sons synthétisés (aucun fichier audio) et confettis.
let ctx = null;
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } return ctx; }
function tone(freq, t0, dur, type = "sine", gain = 0.12) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}
export const sfx = {
  great() { [660, 880, 1320].forEach((f, i) => tone(f, i * 0.08, 0.18, "triangle")); },
  good() { [587, 784].forEach((f, i) => tone(f, i * 0.09, 0.18, "triangle")); },
  bad() { tone(220, 0, 0.22, "sawtooth", 0.06); tone(180, 0.12, 0.25, "sawtooth", 0.05); },
  tap() { tone(900, 0, 0.05, "square", 0.04); },
  done() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.3, "triangle", 0.1)); },
  level() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, "square", 0.05)); }
};

export function confetti(canvas, ms = 2200) {
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const dpr = window.devicePixelRatio || 1, W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const g = canvas.getContext("2d"), cols = ["#ffd23f", "#4ee07a", "#4cc9f0", "#ff5d8f", "#ff9f43", "#a98bff"];
  const parts = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14 * dpr,
    vy: (-Math.random() * 14 - 4) * dpr, r: (4 + Math.random() * 5) * dpr, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3 }));
  const t0 = performance.now();
  canvas.classList.add("on");
  const step = t => {
    g.clearRect(0, 0, W, H);
    for (const p of parts) { p.vy += 0.45 * dpr; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
    if (t - t0 < ms) requestAnimationFrame(step); else { g.clearRect(0, 0, W, H); canvas.classList.remove("on"); }
  };
  requestAnimationFrame(step);
}
