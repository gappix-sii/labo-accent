// Effets : sons synthétisés (aucun fichier audio), confettis, textes et pièces qui volent, secousses.
// Tout est décoratif : si les animations sont réduites, on saute directement au résultat.
let ctx = null, reducedFn = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const setReduced = fn => { reducedFn = fn; };
export const reduced = () => reducedFn();

function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } return ctx; }
function tone(freq, t0, dur, type = "sine", gain = 0.12, slide = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + t0 + dur);
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
  level() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.28, "square", 0.05)); tone(1568, 0.5, 0.5, "triangle", 0.08); },
  coin() { tone(988, 0, 0.07, "square", 0.05); tone(1319, 0.06, 0.16, "square", 0.05); },
  chest() { tone(200, 0, 0.3, "sawtooth", 0.05, 600); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.32 + i * 0.07, 0.25, "triangle", 0.09)); },
  hit() { tone(160, 0, 0.12, "square", 0.08, -80); tone(90, 0.02, 0.18, "sawtooth", 0.06); },
  crit() { tone(1200, 0, 0.08, "square", 0.06); tone(140, 0.05, 0.25, "sawtooth", 0.09, -90); },
  heart() { tone(330, 0, 0.18, "triangle", 0.08, -160); },
  tick() { tone(1500, 0, 0.03, "square", 0.025); },
  whoosh() { tone(300, 0, 0.18, "sine", 0.05, 900); },
  rank() { [523, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.4, "triangle", 0.1)); [659, 988, 1319].forEach((f, i) => tone(f, i * 0.12, 0.4, "sine", 0.06)); },
  buy() { [1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.05, 0.12, "square", 0.04)); }
};

export function confetti(canvas, ms = 2200, { x = 0.5, y = 0.35, count = 140 } = {}) {
  if (!canvas || reduced()) return;
  const dpr = window.devicePixelRatio || 1, W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const g = canvas.getContext("2d"), cols = ["#ffd23f", "#4ee07a", "#4cc9f0", "#ff5d8f", "#ff9f43", "#a98bff"];
  const parts = Array.from({ length: count }, () => ({ x: W * x + (Math.random() - 0.5) * W * 0.25, y: H * y, vx: (Math.random() - 0.5) * 14 * dpr,
    vy: (-Math.random() * 14 - 4) * dpr, r: (4 + Math.random() * 5) * dpr, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, circle: Math.random() < 0.3 }));
  const t0 = performance.now();
  canvas.classList.add("on");
  const step = t => {
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.45 * dpr; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c;
      if (p.circle) { g.beginPath(); g.arc(0, 0, p.r / 1.6, 0, 6.3); g.fill(); } else g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      g.restore();
    }
    if (t - t0 < ms) requestAnimationFrame(step); else { g.clearRect(0, 0, W, H); canvas.classList.remove("on"); }
  };
  requestAnimationFrame(step);
}

const layer = () => document.getElementById("fxl");
function centerOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

// Texte qui s'envole (« +15 XP », « CRITIQUE ! »). Texte inséré avec textContent : aucun HTML.
export function floatText(text, at, cls = "") {
  const L = layer(); if (!L || reduced()) return;
  const p = at instanceof Element ? centerOf(at) : at;
  const el = document.createElement("div");
  el.className = "float-txt " + cls;
  el.textContent = text;
  el.style.setProperty("--x", Math.round(p.x) + "px"); el.style.setProperty("--y", Math.round(p.y) + "px");
  L.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 2500);
}

// Pièces qui volent jusqu'au compteur du haut, puis callback.
export function flyCoins(from, to, n, done) {
  const L = layer();
  if (!L || !from || !to || reduced() || !n) { done && done(); return; }
  const a = centerOf(from), b = centerOf(to), count = Math.min(12, Math.max(3, Math.round(n / 6)));
  let left = count;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "coin-fly";
    L.appendChild(el);
    const dx = (Math.random() - 0.5) * 90, dy = (Math.random() - 0.5) * 60 - 30;
    const anim = el.animate([
      { transform: `translate(${a.x}px, ${a.y}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${a.x + dx}px, ${a.y + dy}px) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${b.x}px, ${b.y}px) scale(.6)`, opacity: 1 }
    ], { duration: 650 + i * 45, easing: "cubic-bezier(.5,0,.75,1)", delay: i * 40, fill: "forwards" });
    anim.onfinish = () => { el.remove(); if (--left === 0) { pulse(to); done && done(); } };
  }
}

export function countUp(el, from, to, ms = 700) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = String(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function retrigger(el, cls) { if (!el || reduced()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener("animationend", () => el.classList.remove(cls), { once: true }); }
export const pulse = el => retrigger(el, "fx-pulse");
export const shake = el => retrigger(el, "fx-shake");
export const pop = el => retrigger(el, "fx-pop");
export const flash = el => retrigger(el, "fx-flash");
