// Pouf, le putois coach d'accent. Personnage original : putois rond au casque audio orange.
import { speak } from "./audio.js";

export function poufSvg(cls = "") {
  return `<svg class="pouf ${cls}" viewBox="0 0 200 200" role="img" aria-label="Pouf, le putois">
  <g class="pf-tail">
    <path d="M150 168c34-6 46-40 34-70-10-26-38-38-52-26 14 4 24 18 22 36-2 22-18 36-24 52z" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/>
    <path d="M160 150c18-10 22-34 12-52-6-12-18-18-26-16 10 6 16 18 14 32-2 14-6 24 0 36z" fill="#f4f1ff"/>
  </g>
  <ellipse cx="96" cy="160" rx="52" ry="34" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/>
  <ellipse cx="96" cy="168" rx="28" ry="18" fill="#3a2f5e"/>
  <g class="pf-head">
    <path d="M52 62l-6-30c-1-6 5-9 9-5l22 20z" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/>
    <path d="M140 62l6-30c1-6-5-9-9-5l-22 20z" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/>
    <path d="M55 52l-3-16 12 11z" fill="#ff9bb3"/>
    <path d="M137 52l3-16-12 11z" fill="#ff9bb3"/>
    <circle cx="96" cy="94" r="56" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/>
    <path d="M96 40c-10 0-16 8-14 22l6 34h16l6-34c2-14-4-22-14-22z" fill="#f4f1ff"/>
    <ellipse cx="96" cy="118" rx="26" ry="20" fill="#3a2f5e"/>
    <g class="pf-eyes">
      <g class="pf-open">
        <ellipse cx="72" cy="96" rx="11" ry="13" fill="#fff"/><ellipse cx="120" cy="96" rx="11" ry="13" fill="#fff"/>
        <circle class="pf-pupil" cx="74" cy="98" r="7" fill="#120d24"/><circle class="pf-pupil" cx="118" cy="98" r="7" fill="#120d24"/>
        <circle cx="77" cy="94" r="2.6" fill="#fff"/><circle cx="121" cy="94" r="2.6" fill="#fff"/>
      </g>
      <g class="pf-joy" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round">
        <path d="M62 100q10-12 20 0"/><path d="M110 100q10-12 20 0"/>
      </g>
      <g class="pf-sad" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round">
        <path d="M63 94q9 8 19 2"/><path d="M110 96q10 6 19-2"/>
      </g>
    </g>
    <ellipse cx="60" cy="114" rx="7" ry="4.5" fill="#ff9bb3" opacity=".7"/>
    <ellipse cx="132" cy="114" rx="7" ry="4.5" fill="#ff9bb3" opacity=".7"/>
    <path d="M89 108h14c3 0 4 3 2 5l-7 6-7-6c-2-2-1-5 2-5z" fill="#ff8fab"/>
    <path class="pf-mouth-closed" d="M86 124q10 8 20 0" fill="none" stroke="#120d24" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse class="pf-mouth-open" cx="96" cy="127" rx="8" ry="7" fill="#120d24"/>
    <g class="pf-phones">
      <path d="M40 92c0-40 24-62 56-62s56 22 56 62" fill="none" stroke="#ff8a3d" stroke-width="9" stroke-linecap="round"/>
      <rect x="30" y="84" width="20" height="32" rx="9" fill="#ff8a3d"/><rect x="142" y="84" width="20" height="32" rx="9" fill="#ff8a3d"/>
      <rect x="35" y="90" width="10" height="20" rx="5" fill="#ffb27a"/><rect x="147" y="90" width="10" height="20" rx="5" fill="#ffb27a"/>
    </g>
  </g>
  <ellipse cx="66" cy="186" rx="14" ry="8" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/><ellipse cx="126" cy="186" rx="14" ry="8" fill="#2b2250" stroke="#8b7be0" stroke-width="3"/>
</svg>`;
}

export const LINES = {
  hello: ["Salut, moi c'est Pouf ! Je vais écouter ton accent.", "Prêt à faire chauffer tes cordes vocales ?", "On s'entraîne un peu ? Juste cinq minutes !"],
  listen: ["Écoute bien, puis répète.", "À toi ! Appuie sur le micro.", "Prends ton temps, articule."],
  great: ["Parfait ! On dirait un vrai Anglais.", "Énorme ! Ça sonne super bien.", "Wouah, impeccable !", "Excellent ! Continue comme ça."],
  good: ["Bien joué ! Quelques sons à peaufiner.", "Pas mal du tout !", "C'est bien, on y est presque."],
  meh: ["Presque ! Écoute le mot en rouge et réessaie.", "On y est presque, encore un essai ?", "Pas mal, mais tu peux mieux faire !"],
  bad: ["Pas grave ! Écoute lentement et retente.", "Ça arrive, même aux putois. On réessaie ?", "Courage ! Commence par écouter au ralenti."],
  combo: ["Série en feu ! Tu enchaînes !", "Combo ! Ne t'arrête pas !"],
  done: ["Leçon terminée ! Je suis fier de toi.", "Bravo ! Une leçon de plus dans la poche."],
  levelup: ["Niveau supérieur ! Tu progresses vite."],
  streak: ["Ta série continue, ne la casse pas demain !"],
  locked: ["Termine d'abord la leçon précédente !"]
};
export const pick = k => { const a = LINES[k] || [""]; return a[Math.floor(Math.random() * a.length)]; };

// Affiche une bulle et (option) la lit avec une voix française aiguë, bouche animée.
export function poufSay(root, text, { voice = true, mood = "" } = {}) {
  if (!root) return;
  const svg = root.querySelector(".pouf"), bubble = root.querySelector(".bubble");
  if (bubble) bubble.textContent = text;
  if (svg) { svg.classList.remove("happy", "sad"); if (mood) svg.classList.add(mood); }
  if (!voice) return;
  if (svg) svg.classList.add("talk");
  speak(text, { lang: "fr", rate: 1.05, pitch: 1.5 }).then(() => { if (svg) svg.classList.remove("talk"); });
}
