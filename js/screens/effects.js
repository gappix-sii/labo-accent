// Effets de jeu (phase 6, tâche 6) : « +XP » qui s'envole avec la barre de niveau qui se remplit, et « NIVEAU n ! » en plein écran
// avec confettis. Ils se déclenchent tout seuls après chaque enregistrement qui fait gagner des XP (js/core/store.js, onSaved),
// quel que soit l'écran. Réglage « Effets réduits » (S.fx) : sans animation, un simple message.
// Éléments créés avec createElement et textContent (jamais de HTML), positions via le CSSOM (permis par la CSP).
import { onSaved } from "../core/store.js";
import { levelOf } from "../core/progress.js";

export const FX_MODES = [["auto", "Selon l'appareil"], ["full", "Tous les effets"], ["reduced", "Effets réduits"]];
export const fxModeOk = (m) => FX_MODES.some(([id]) => id === m);

const deviceReduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// Effets réduits : choisi dans les réglages, ou (« Selon l'appareil ») demandé par le système.
export const reducedFx = (S) => S.fx === "reduced" || (S.fx !== "full" && deviceReduced());

// Classe sur <html> : coupe aussi les petites animations du compagnon (CSS).
export function applyFx(S) { if (typeof document !== "undefined") document.documentElement.classList.toggle("fx-reduced", reducedFx(S)); }

// Ce qu'il faut montrer après un enregistrement, d'après les XP avant et après (fonction pure, testée).
export function gainOf(before, after, g = { coins: 0, chests: [] }) {
  if (!(after > before)) return null;
  const a = levelOf(before), b = levelOf(after);
  return { xp: after - before, coins: g.coins || 0, chests: (g.chests || []).length, level: b.level, up: b.level > a.level,
    from: b.level > a.level ? 0 : a.into / a.need, to: b.into / b.need };
}

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

function layer() {
  let L = document.getElementById("fx-layer");
  if (!L) { L = el("div", "fx-layer"); L.id = "fx-layer"; L.setAttribute("aria-live", "polite"); document.body.append(L); }
  return L;
}

// « +10 XP · +2 🪙 » et la barre du niveau qui se remplit.
function toast(gain, reduced) {
  const t = el("div", `fx-toast${reduced ? " still" : ""}`);
  t.setAttribute("role", "status");
  t.append(el("b", "fx-xp", `+${gain.xp} XP`));
  if (gain.coins) t.append(el("span", "fx-coins", ` · +${gain.coins} 🪙`));
  const bar = el("span", "fx-bar"), fill = el("span", "fx-fill");
  fill.style.setProperty("--from", String(gain.from)); fill.style.setProperty("--to", String(gain.to));
  bar.append(fill); t.append(bar);
  layer().append(t);
  setTimeout(() => t.remove(), reduced ? 2500 : 1800);
}

const COLORS = ["#ff5470", "#ffd23f", "#3ddc84", "#4cc9f0", "#a98bff", "#ff8a3d"];
function levelUp(gain, reduced) {
  document.getElementById("fx-level")?.remove();
  const o = el("div", `fx-level${reduced ? " still" : ""}`); o.id = "fx-level";
  o.setAttribute("role", "dialog"); o.setAttribute("aria-label", `Niveau ${gain.level} atteint`);
  const box = el("div", "fx-level-box");
  box.append(el("p", "fx-level-title", `NIVEAU ${gain.level} !`));
  box.append(el("p", "fx-level-sub", gain.chests ? `🎁 ${gain.chests > 1 ? `${gain.chests} coffres gagnés` : "Un coffre gagné"} : ouvre-le dans « Coffres ».` : "Continue comme ça !"));
  const ok = el("button", "btn", "Continuer"); ok.type = "button";
  box.append(ok); o.append(box);
  if (!reduced) for (let i = 0; i < 40; i++) {
    const c = el("i", "fx-confetti");
    c.style.setProperty("--x", `${Math.round(Math.random() * 100)}vw`);
    c.style.setProperty("--d", `${(1.6 + Math.random() * 1.6).toFixed(2)}s`);
    c.style.setProperty("--w", `${(Math.random() * 0.6).toFixed(2)}s`);
    c.style.setProperty("--c", COLORS[i % COLORS.length]);
    o.append(c);
  }
  const close = () => { o.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  o.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  setTimeout(close, 5000);
  document.body.append(o);
  ok.focus({ preventScroll: true });
}

// À appeler une fois au démarrage : surveille les gains d'XP de toute l'appli.
export function watchGains(S) {
  applyFx(S);
  let seen = S.progress.xp;
  return onSaved((g) => {
    const gain = gainOf(seen, S.progress.xp, g);
    seen = S.progress.xp;
    if (!gain) return;
    const reduced = reducedFx(S);
    toast(gain, reduced);
    if (gain.up) levelUp(gain, reduced);
  });
}
