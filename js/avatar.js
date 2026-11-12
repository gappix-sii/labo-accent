// Compagnons : 9 animaux originaux dessinés sur un même gabarit (200×200), avec couleurs et accessoires.
// Tête centrée en (100, 94), yeux en (76, 96) et (124, 96), corps en (100, 160). Aucune image externe.
import { html } from "./core/dom.js";

const L = 3; // épaisseur du contour
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

// ---------- Morceaux communs ----------
const stdBody = (c, extra = "") => html`
  <ellipse cx="100" cy="160" rx="52" ry="34" fill="${c.body || c.fur}" stroke="${c.line}" stroke-width="${L}"/>
  <ellipse cx="100" cy="168" rx="${c.bellyRx || 28}" ry="${c.bellyRy || 18}" fill="${c.belly}"/>${extra}
  <ellipse cx="70" cy="186" rx="14" ry="8" fill="${c.feet || c.body || c.fur}" stroke="${c.line}" stroke-width="${L}"/>
  <ellipse cx="130" cy="186" rx="14" ry="8" fill="${c.feet || c.body || c.fur}" stroke="${c.line}" stroke-width="${L}"/>`;
const round = c => html`<circle cx="100" cy="94" r="56" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/>`;
const eyesBlock = c => html`<g class="pf-eyes">
  <g class="pf-open">
    <ellipse cx="76" cy="96" rx="11" ry="13" fill="#fff"/><ellipse cx="124" cy="96" rx="11" ry="13" fill="#fff"/>
    ${c.iris ? html`<circle cx="78" cy="98" r="8.5" fill="${c.iris}"/><circle cx="122" cy="98" r="8.5" fill="${c.iris}"/>` : ""}
    <circle class="pf-pupil" cx="78" cy="98" r="${c.iris ? 5 : 7}" fill="#120d24"/><circle class="pf-pupil" cx="122" cy="98" r="${c.iris ? 5 : 7}" fill="#120d24"/>
    <circle cx="81" cy="94" r="2.6" fill="#fff"/><circle cx="125" cy="94" r="2.6" fill="#fff"/>
  </g>
  <g class="pf-joy" fill="none" stroke="${c.lid}" stroke-width="5" stroke-linecap="round"><path d="M66 100q10-12 20 0"/><path d="M114 100q10-12 20 0"/></g>
  <g class="pf-sad" fill="none" stroke="${c.lid}" stroke-width="5" stroke-linecap="round"><path d="M67 94q9 8 19 2"/><path d="M114 96q10 6 19-2"/></g>
</g>`;
const cheeks = c => html`<ellipse cx="62" cy="114" rx="7" ry="4.5" fill="${c.cheek}" opacity=".7"/><ellipse cx="138" cy="114" rx="7" ry="4.5" fill="${c.cheek}" opacity=".7"/>`;
const stdNose = c => html`<path d="M93 108h14c3 0 4 3 2 5l-7 6-7-6c-2-2-1-5 2-5z" fill="${c.nose}"/>`;
const stdMouth = (c, teeth = "") => html`<g class="pf-mouth-closed"><path d="M90 124q10 8 20 0" fill="none" stroke="#120d24" stroke-width="3.5" stroke-linecap="round"/>${teeth}</g><ellipse class="pf-mouth-open" cx="100" cy="127" rx="8" ry="7" fill="#120d24"/>`;
const beakMouth = () => html``;
const flippers = (fill, line) => html`<ellipse cx="50" cy="156" rx="10" ry="24" transform="rotate(24 50 156)" fill="${fill}" stroke="${line}" stroke-width="${L}"/><ellipse cx="150" cy="156" rx="10" ry="24" transform="rotate(-24 150 156)" fill="${fill}" stroke="${line}" stroke-width="${L}"/>`;

// ---------- Espèces ----------
// skins : la première est gratuite dès que l'espèce est débloquée. c = couleurs.
export const SPECIES = [
  { id: "skunk", name: "Putois", plural: "putois", lvl: 1, pitch: 1.5, desc: "Le coach d'origine, toujours à l'écoute.",
    tail: c => html`<g class="av-tail"><path d="M154 168c34-6 46-40 34-70-10-26-38-38-52-26 14 4 24 18 22 36-2 22-18 36-24 52z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/><path d="M164 150c18-10 22-34 12-52-6-12-18-18-26-16 10 6 16 18 14 32-2 14-6 24 0 36z" fill="${c.mark}"/></g>`,
    body: c => stdBody(c),
    ears: c => html`<path d="M56 62l-6-30c-1-6 5-9 9-5l22 20z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/><path d="M144 62l6-30c1-6-5-9-9-5l-22 20z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/><path d="M59 52l-3-16 12 11z" fill="${c.inner}"/><path d="M141 52l3-16-12 11z" fill="${c.inner}"/>`,
    head: round,
    marks: c => html`<path d="M100 40c-10 0-16 8-14 22l6 34h16l6-34c2-14-4-22-14-22z" fill="${c.mark}"/><ellipse cx="100" cy="118" rx="26" ry="20" fill="${c.fur2}"/>`,
    skins: [
      { id: "night", name: "Nuit", rarity: "common", c: { fur: "#2b2250", fur2: "#3a2f5e", belly: "#3a2f5e", mark: "#f4f1ff", inner: "#ff9bb3", line: "#8b7be0", nose: "#ff8fab", cheek: "#ff9bb3" } },
      { id: "candy", name: "Barbe à papa", rarity: "rare", c: { fur: "#ff7eb6", fur2: "#ff9fca", belly: "#ffc2dd", mark: "#ffffff", inner: "#fff0f6", line: "#c43d7c", nose: "#c43d7c", cheek: "#ffffff" } },
      { id: "gold", name: "Doré", rarity: "epic", c: { fur: "#b8860b", fur2: "#d4a017", belly: "#e6c35c", mark: "#fff4c2", inner: "#ffd27a", line: "#ffe58a", nose: "#7a4f00", cheek: "#ffd27a" } },
      { id: "neon", name: "Néon", rarity: "legendary", c: { fur: "#0d1b2a", fur2: "#14273d", belly: "#14273d", mark: "#39ff14", inner: "#39ff14", line: "#39ff14", nose: "#ff2fd0", cheek: "#ff2fd0" } }
    ] },
  { id: "fox", name: "Renard", plural: "renards", lvl: 2, pitch: 1.3, desc: "Rusé, rapide, il a toujours une réplique.",
    tail: c => html`<g class="av-tail"><path d="M146 172c32 4 52-26 44-60-4-16-14-26-24-28 6 20 2 44-26 66z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/><path d="M190 112c-4-16-14-26-24-28 2 8 4 16 3 24 7 0 15 2 21 4z" fill="${c.belly}"/></g>`,
    body: c => stdBody(c),
    ears: c => html`<path d="M52 64 44 16q2-6 8-2l36 30z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M148 64l8-48q-2-6-8-2l-36 30z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M56 54 50 26l26 20z" fill="${c.inner}"/><path d="M144 54l6-28-26 20z" fill="${c.inner}"/><path d="M44 16q2-6 8-2l4 8-10 4z" fill="${c.tip}"/><path d="M156 16q-2-6-8-2l-4 8 10 4z" fill="${c.tip}"/>`,
    head: round,
    marks: c => html`<path d="M100 98c-16 0-40 6-48 22 10 18 30 28 48 28s38-10 48-28c-8-16-32-22-48-22z" fill="${c.belly}"/>`,
    nose: c => html`<ellipse cx="100" cy="112" rx="7" ry="5" fill="${c.nose}"/>`,
    skins: [
      { id: "red", name: "Roux", rarity: "common", c: { fur: "#f07b28", line: "#9a3f0a", belly: "#fff7ee", inner: "#ffd6b8", tip: "#3a1d10", nose: "#2b1a14", cheek: "#ffb3a0", feet: "#3a1d10", iris: "#c46e16" } },
      { id: "arctic", name: "Arctique", rarity: "rare", c: { fur: "#eef3ff", line: "#9fb3d9", belly: "#ffffff", inner: "#cfd9f2", tip: "#8fa3c8", nose: "#3a4660", cheek: "#ffc6d9", feet: "#c7d3ee", iris: "#4c8fd6" } },
      { id: "silver", name: "Argenté", rarity: "epic", c: { fur: "#8d93a6", line: "#4a5066", belly: "#e8ebf3", inner: "#c9cede", tip: "#2f3342", nose: "#1d2030", cheek: "#ffb3c6", feet: "#2f3342", iris: "#ffb02e" } },
      { id: "cosmic", name: "Cosmique", rarity: "legendary", c: { fur: "#5b2a86", line: "#c9b6ff", belly: "#c9b6ff", inner: "#ff6fae", tip: "#ffd23f", nose: "#ffd23f", cheek: "#ff6fae", feet: "#2d1450", iris: "#4cc9f0" } }
    ] },
  { id: "cat", name: "Chat", plural: "chats", lvl: 3, pitch: 1.7, desc: "Curieux et un peu fier quand tu réussis.",
    tail: c => html`<g class="av-tail"><path d="M148 176c30-2 40-30 32-56-3-10-10-14-16-10" fill="none" stroke="${c.line}" stroke-width="17" stroke-linecap="round"/><path d="M148 176c30-2 40-30 32-56-3-10-10-14-16-10" fill="none" stroke="${c.fur}" stroke-width="11" stroke-linecap="round"/><path d="M178 140l8 2M182 126l8-1" stroke="${c.fur2}" stroke-width="4" stroke-linecap="round"/></g>`,
    body: c => stdBody(c),
    ears: c => html`<path d="M54 64 50 24q2-6 8-3l30 26z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M146 64l4-40q-2-6-8-3l-30 26z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M58 56 56 32l22 17z" fill="${c.inner}"/><path d="M142 56l2-24-22 17z" fill="${c.inner}"/>`,
    head: round,
    marks: c => html`<path d="M100 42v14M88 44l3 12M112 44l-3 12M46 98h10M47 108h8M154 98h-10M153 108h-8" stroke="${c.fur2}" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="91" cy="119" rx="11" ry="9" fill="${c.belly}"/><ellipse cx="109" cy="119" rx="11" ry="9" fill="${c.belly}"/><path d="M80 116 52 110M80 121l-28 3M120 116l28-6M120 121l28 3" stroke="${c.whisker}" stroke-width="2" stroke-linecap="round"/>`,
    nose: c => html`<path d="M95 110h10l-5 6z" fill="${c.nose}" stroke="${c.nose}" stroke-width="2" stroke-linejoin="round"/>`,
    skins: [
      { id: "tabby", name: "Gris tigré", rarity: "common", c: { fur: "#9aa3b5", fur2: "#6b7385", belly: "#eef0f6", inner: "#ffb3c6", line: "#4d5466", nose: "#ff8fab", cheek: "#ffb3c6", whisker: "#ffffff", iris: "#8fd16a" } },
      { id: "ginger", name: "Roux", rarity: "common", c: { fur: "#f2a65a", fur2: "#c8742e", belly: "#fff3e3", inner: "#ffc9a8", line: "#9a5420", nose: "#ff8fab", cheek: "#ffb3a0", whisker: "#ffffff", iris: "#7fc96b" } },
      { id: "midnight", name: "Minuit", rarity: "rare", c: { fur: "#2a2a35", fur2: "#44445a", belly: "#3d3d4d", inner: "#ff9bb3", line: "#6b6b85", nose: "#ff8fab", cheek: "#ff9bb3", whisker: "#c9c9d9", iris: "#ffd23f" } },
      { id: "galaxy", name: "Galaxie", rarity: "legendary", c: { fur: "#2d1b69", fur2: "#ff6fae", belly: "#4c2ea0", inner: "#ff6fae", line: "#a98bff", nose: "#ffd23f", cheek: "#ff6fae", whisker: "#ffd23f", iris: "#4cc9f0" } }
    ] },
  { id: "rabbit", name: "Lapin", plural: "lapins", lvl: 4, pitch: 1.8, desc: "Ses grandes oreilles entendent chaque son.",
    tail: c => html`<circle class="av-tail" cx="150" cy="174" r="13" fill="${c.belly}" stroke="${c.line}" stroke-width="${L}"/>`,
    body: c => stdBody(c),
    ears: c => html`<g class="av-ear-l"><ellipse cx="78" cy="38" rx="14" ry="34" transform="rotate(-10 78 38)" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/><ellipse cx="78" cy="40" rx="7" ry="25" transform="rotate(-10 78 40)" fill="${c.inner}"/></g><g class="av-ear-r"><ellipse cx="122" cy="38" rx="14" ry="34" transform="rotate(10 122 38)" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/><ellipse cx="122" cy="40" rx="7" ry="25" transform="rotate(10 122 40)" fill="${c.inner}"/></g>`,
    head: round,
    marks: c => html`<ellipse cx="100" cy="118" rx="20" ry="15" fill="${c.belly}"/>`,
    nose: c => html`<path d="M95 109h10q0 6-5 7-5-1-5-7z" fill="${c.nose}"/>`,
    mouth: c => stdMouth(c, html`<rect x="94.5" y="127" width="5" height="7" rx="1.5" fill="#fff" stroke="#c9c2e8"/><rect x="100.5" y="127" width="5" height="7" rx="1.5" fill="#fff" stroke="#c9c2e8"/>`),
    skins: [
      { id: "snow", name: "Neige", rarity: "common", c: { fur: "#f6f2ff", line: "#b9b0dd", belly: "#ffffff", inner: "#ffb3c6", nose: "#ff8fab", cheek: "#ffc6d9" } },
      { id: "caramel", name: "Caramel", rarity: "common", c: { fur: "#c98b5a", line: "#8a5a33", belly: "#f3dcc4", inner: "#ffc4a8", nose: "#6b3d1e", cheek: "#ffb3a0" } },
      { id: "grey", name: "Gris perle", rarity: "rare", c: { fur: "#a7a3b5", line: "#6e6a80", belly: "#e7e5ee", inner: "#ffb3c6", nose: "#ff8fab", cheek: "#ffb3c6" } },
      { id: "lavender", name: "Lavande", rarity: "epic", c: { fur: "#b9a3ff", line: "#7d63d9", belly: "#efe9ff", inner: "#ff9bd2", nose: "#ff6fae", cheek: "#ff9bd2" } }
    ] },
  { id: "panda", name: "Panda", plural: "pandas", lvl: 5, pitch: 1.0, desc: "Calme et patient, même quand ça rate.", eyeBg: "dark",
    body: c => stdBody({ ...c, body: c.dark, belly: c.fur, feet: c.dark }),
    ears: c => html`<circle cx="56" cy="50" r="19" fill="${c.dark}" stroke="${c.line}" stroke-width="${L}"/><circle cx="144" cy="50" r="19" fill="${c.dark}" stroke="${c.line}" stroke-width="${L}"/><circle cx="56" cy="50" r="9" fill="${c.inner}"/><circle cx="144" cy="50" r="9" fill="${c.inner}"/>`,
    head: round,
    marks: c => html`<ellipse cx="74" cy="98" rx="17" ry="21" transform="rotate(28 74 98)" fill="${c.dark}"/><ellipse cx="126" cy="98" rx="17" ry="21" transform="rotate(-28 126 98)" fill="${c.dark}"/><ellipse cx="100" cy="120" rx="22" ry="15" fill="${c.belly}"/>`,
    nose: c => html`<ellipse cx="100" cy="111" rx="8" ry="5.5" fill="${c.dark}"/>`,
    skins: [
      { id: "classic", name: "Classique", rarity: "common", c: { fur: "#f7f7fb", dark: "#1d1d29", line: "#6b6b85", belly: "#ececf3", inner: "#3a3a4d", cheek: "#ffb3c6" } },
      { id: "mint", name: "Menthe", rarity: "common", c: { fur: "#effff7", dark: "#1f9e57", line: "#157a42", belly: "#dcf7e8", inner: "#3ddc84", cheek: "#ffb3c6" } },
      { id: "rose", name: "Rose", rarity: "rare", c: { fur: "#fff0f6", dark: "#ff5d8f", line: "#c43d7c", belly: "#ffe0ec", inner: "#ff9bbd", cheek: "#ff5d8f" } },
      { id: "negative", name: "Négatif", rarity: "epic", c: { fur: "#1d1d29", dark: "#f7f7fb", line: "#8b7be0", belly: "#2c2c3d", inner: "#c9c9d9", cheek: "#ff6fae" } }
    ] },
  { id: "penguin", name: "Pingouin", plural: "pingouins", lvl: 7, pitch: 1.6, desc: "Toujours bien habillé, même sur la banquise.", eyeBg: "face", hatY: 2,
    back: c => flippers(c.fur, c.line),
    body: c => stdBody({ ...c, belly: c.face, feet: c.beak, bellyRx: 36, bellyRy: 26 }),
    head: round,
    marks: c => html`<path d="M100 66c-12-14-46-8-46 26 0 30 22 50 46 50s46-20 46-50c0-34-34-40-46-26z" fill="${c.face}"/>`,
    nose: c => html`<path class="pf-beak" d="M86 112q14-8 28 0-6 10-14 12-8-2-14-12z" fill="${c.beak}" stroke="${c.beakLine}" stroke-width="2" stroke-linejoin="round"/>`,
    mouth: beakMouth,
    skins: [
      { id: "emperor", name: "Empereur", rarity: "common", c: { fur: "#1d2440", line: "#5a6aa8", face: "#ffffff", beak: "#ffb02e", beakLine: "#c77d00", cheek: "#ffb3c6" } },
      { id: "glacier", name: "Glacier", rarity: "common", c: { fur: "#2c6fb7", line: "#87b8ef", face: "#f3f9ff", beak: "#ffb02e", beakLine: "#c77d00", cheek: "#ffc6d9" } },
      { id: "flamingo", name: "Flamant", rarity: "rare", c: { fur: "#ff7eb6", line: "#c43d7c", face: "#fff5fa", beak: "#ffd23f", beakLine: "#c99a00", cheek: "#ff5d8f" } },
      { id: "royal", name: "Or royal", rarity: "legendary", c: { fur: "#8a6a00", line: "#ffe58a", face: "#fff8dc", beak: "#ff8a3d", beakLine: "#b35a12", cheek: "#ffb3a0" } }
    ] },
  { id: "owl", name: "Hibou", plural: "hiboux", lvl: 9, pitch: 0.9, desc: "Sage et précis : rien ne lui échappe.", eyeBg: "disc",
    back: c => flippers(c.fur2, c.line),
    body: c => stdBody({ ...c, belly: c.disc }, html`<path d="M86 160l6 5 6-5M102 160l6 5 6-5M94 172l6 5 6-5" fill="none" stroke="${c.fur2}" stroke-width="2.5" stroke-linecap="round"/>`),
    ears: c => html`<path d="M58 60 48 24l32 22z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M142 60l10-36-32 22z" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/>`,
    head: round,
    marks: c => html`<circle cx="76" cy="97" r="23" fill="${c.disc}"/><circle cx="124" cy="97" r="23" fill="${c.disc}"/>`,
    nose: c => html`<path class="pf-beak" d="M93 110h14l-7 14z" fill="${c.beak}" stroke="${c.beak}" stroke-width="2" stroke-linejoin="round"/>`,
    mouth: beakMouth,
    skins: [
      { id: "brown", name: "Chouette brune", rarity: "common", c: { fur: "#8b5a3c", fur2: "#6b4129", line: "#c49470", disc: "#f1dcc0", beak: "#ffb02e", iris: "#ffb02e", cheek: "#ffb3a0", feet: "#ffb02e" } },
      { id: "snowy", name: "Harfang", rarity: "rare", c: { fur: "#f2f4fa", fur2: "#2b2b3a", line: "#a9b0c6", disc: "#ffffff", beak: "#2b2b3a", iris: "#ffd23f", cheek: "#ffc6d9", feet: "#d9dde9" } },
      { id: "nocturne", name: "Nocturne", rarity: "epic", c: { fur: "#2b2250", fur2: "#4a3a9e", line: "#8b7be0", disc: "#4a3a9e", beak: "#ffd23f", iris: "#ffd23f", cheek: "#ff9bb3", feet: "#ffd23f" } },
      { id: "phoenix", name: "Phénix", rarity: "legendary", c: { fur: "#c2410c", fur2: "#ffd23f", line: "#ffb27a", disc: "#ffd27a", beak: "#fff3c4", iris: "#ffffff", cheek: "#ffd23f", feet: "#ffd23f" } }
    ] },
  { id: "axolotl", name: "Axolotl", plural: "axolotls", lvl: 12, pitch: 1.9, desc: "Toujours le sourire, même sous l'eau.", hatY: 8,
    tail: c => html`<path class="av-tail" d="M144 168c30 0 48-14 54-34-14 10-32 18-54 20z" fill="${c.fur2}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/>`,
    body: c => stdBody(c),
    ears: c => html`<g class="av-gills" fill="none" stroke="${c.gill}" stroke-width="9" stroke-linecap="round"><path d="M50 78q-18-14-32-8"/><path d="M46 96q-20-2-32 6"/><path d="M50 114q-16 10-26 22"/><path d="M150 78q18-14 32-8"/><path d="M154 96q20-2 32 6"/><path d="M150 114q16 10 26 22"/></g>`,
    head: c => html`<ellipse cx="100" cy="96" rx="62" ry="50" fill="${c.fur}" stroke="${c.line}" stroke-width="${L}"/>`,
    marks: c => html`<circle cx="88" cy="60" r="3" fill="${c.fur2}"/><circle cx="100" cy="56" r="3" fill="${c.fur2}"/><circle cx="112" cy="60" r="3" fill="${c.fur2}"/>`,
    nose: () => html``,
    mouth: () => html`<g class="pf-mouth-closed"><path d="M80 120q20 16 40 0" fill="none" stroke="#120d24" stroke-width="3.5" stroke-linecap="round"/></g><ellipse class="pf-mouth-open" cx="100" cy="126" rx="10" ry="7" fill="#120d24"/>`,
    skins: [
      { id: "pink", name: "Rose", rarity: "common", c: { fur: "#ffb3cf", fur2: "#ff8fb8", gill: "#ff5d8f", line: "#e06a95", cheek: "#ff5d8f", belly: "#ffd6e5" } },
      { id: "pearl", name: "Perle", rarity: "common", c: { fur: "#fff0f5", fur2: "#ffd6e5", gill: "#ff8fab", line: "#e5b3c6", cheek: "#ff8fab", belly: "#ffffff" } },
      { id: "gold", name: "Doré", rarity: "rare", c: { fur: "#ffd27a", fur2: "#ffb84d", gill: "#ff9f43", line: "#d9952e", cheek: "#ff9f43", belly: "#ffe9b8" } },
      { id: "shadow", name: "Mélanique", rarity: "epic", c: { fur: "#3b3b52", fur2: "#2a2a3d", gill: "#8b7be0", line: "#8b7be0", cheek: "#8b7be0", belly: "#4a4a66" } }
    ] },
  { id: "dragon", name: "Bébé dragon", plural: "dragons", lvl: 15, pitch: 0.7, desc: "Légendaire. Il crache des voyelles parfaites.",
    back: c => html`<g class="av-wings"><path d="M58 146C30 124 16 132 10 150c12-2 20 4 26 12 4-8 10-12 18-10z" fill="${c.wing}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M142 146c28-22 42-14 48 4-12-2-20 4-26 12-4-8-10-12-18-10z" fill="${c.wing}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/></g>`,
    tail: c => html`<g class="av-tail"><path d="M148 172c24 6 42-4 46-22" fill="none" stroke="${c.line}" stroke-width="16" stroke-linecap="round"/><path d="M148 172c24 6 42-4 46-22" fill="none" stroke="${c.fur}" stroke-width="10" stroke-linecap="round"/><path d="M188 152l10-16 3 20z" fill="${c.spike}"/></g>`,
    body: c => stdBody(c, html`<path d="M80 160h40M82 168h36M86 176h28" stroke="${c.fur2}" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`),
    ears: c => html`<path d="M70 52 60 16l26 28z" fill="${c.horn}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/><path d="M130 52l10-36-26 28z" fill="${c.horn}" stroke="${c.line}" stroke-width="${L}" stroke-linejoin="round"/>`,
    head: c => html`${round(c)}<path d="M90 40l10-14 10 14z" fill="${c.spike}"/>`,
    marks: c => html`<ellipse cx="100" cy="119" rx="27" ry="19" fill="${c.belly}"/><ellipse cx="92" cy="112" rx="3" ry="2.2" fill="${c.fur2}"/><ellipse cx="108" cy="112" rx="3" ry="2.2" fill="${c.fur2}"/>`,
    nose: () => html``,
    skins: [
      { id: "emerald", name: "Émeraude", rarity: "common", c: { fur: "#3ddc84", fur2: "#1f9e57", line: "#157a42", belly: "#fff3c4", wing: "#1f9e57", horn: "#fff3c4", spike: "#ffd23f", iris: "#ffd23f", cheek: "#ff9bb3" } },
      { id: "amethyst", name: "Améthyste", rarity: "rare", c: { fur: "#8b5cf6", fur2: "#6d28d9", line: "#4c1d95", belly: "#ede9fe", wing: "#6d28d9", horn: "#fde68a", spike: "#f472b6", iris: "#fde047", cheek: "#f9a8d4" } },
      { id: "ruby", name: "Rubis", rarity: "epic", c: { fur: "#ef4444", fur2: "#b91c1c", line: "#7f1d1d", belly: "#fee2e2", wing: "#b91c1c", horn: "#fde68a", spike: "#fbbf24", iris: "#fde047", cheek: "#fda4af" } },
      { id: "shadow", name: "Ombre", rarity: "legendary", c: { fur: "#1f2937", fur2: "#111827", line: "#ff6fae", belly: "#374151", wing: "#ff6fae", horn: "#e5e7eb", spike: "#ff6fae", iris: "#ff6fae", cheek: "#ff6fae" } }
    ] }
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));

// ---------- Accessoires ----------
// rarity : common, rare, epic, legendary. price : en pièces (null = pas en boutique). lvl : niveau minimum pour l'acheter.
// drop : peut sortir d'un coffre. unlock : condition spéciale (attribué automatiquement).
const star5 = "M0-18 4.7-6.5 17.1-5.6 7.6 2.5 10.6 14.6 0 8-10.6 14.6-7.6 2.5-17.1-5.6-4.7-6.5z";
const heart = "M0 6c-8-6-12-10-8-14 3-3 7-1 8 2 1-3 5-5 8-2 4 4 0 8-8 14z";
const spark = "M0-10 2-2 10 0 2 2 0 10-2 2-10 0-2-2z";
export const ITEMS = [
  // Tête
  { id: "phones", slot: "head", name: "Casque audio", rarity: "common", price: 0, lvl: 1,
    draw: () => html`<path d="M44 92c0-40 24-62 56-62s56 22 56 62" fill="none" stroke="#ff8a3d" stroke-width="9" stroke-linecap="round"/><rect x="34" y="84" width="20" height="32" rx="9" fill="#ff8a3d"/><rect x="146" y="84" width="20" height="32" rx="9" fill="#ff8a3d"/><rect x="39" y="90" width="10" height="20" rx="5" fill="#ffb27a"/><rect x="151" y="90" width="10" height="20" rx="5" fill="#ffb27a"/>` },
  { id: "cap", slot: "head", name: "Casquette", rarity: "common", price: 70, lvl: 1, drop: true,
    draw: () => html`<path d="M52 66c0-24 20-38 48-38s48 14 48 38z" fill="#ff5470"/><path d="M44 68q56-14 112 0-56 10-112 0z" fill="#c22a47"/><circle cx="100" cy="29" r="4" fill="#c22a47"/><path d="M70 44q30-10 60 0" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>` },
  { id: "bow", slot: "head", name: "Nœud", rarity: "common", price: 60, lvl: 1, drop: true,
    draw: () => html`<g transform="translate(140 44) rotate(20)"><path d="M0 0-18-10v20zM0 0l18-10v20z" fill="#ff6fae" stroke="#c43d7c" stroke-width="2" stroke-linejoin="round"/><circle r="5" fill="#ff9bc8"/></g>` },
  { id: "beanie", slot: "head", name: "Bonnet", rarity: "common", price: 70, lvl: 2, drop: true,
    draw: () => html`<path d="M50 70c0-30 22-46 50-46s50 16 50 46z" fill="#4cc9f0"/><path d="M62 44h76M56 56h88" stroke="#1e8fb5" stroke-width="4"/><rect x="46" y="60" width="108" height="16" rx="8" fill="#1e8fb5"/><circle cx="100" cy="22" r="10" fill="#ffffff"/>` },
  { id: "party", slot: "head", name: "Chapeau de fête", rarity: "common", price: 80, lvl: 2, drop: true,
    draw: () => html`<g transform="rotate(-12 100 52)"><path d="M100 0 76 52h48z" fill="#ff6fae"/><path d="M92 20l14 5M85 34l24 8" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="2" r="6" fill="#4cc9f0"/></g>` },
  { id: "chef", slot: "head", name: "Toque de chef", rarity: "rare", price: 150, lvl: 3, drop: true,
    draw: () => html`<path d="M66 64V50c-14-4-14-26 4-26 2-14 22-18 30-6 8-12 28-8 30 6 18 0 18 22 4 26v14z" fill="#ffffff" stroke="#c9c2e8" stroke-width="3" stroke-linejoin="round"/><rect x="66" y="56" width="68" height="10" fill="#efeaff"/>` },
  { id: "pirate", slot: "head", name: "Tricorne de pirate", rarity: "rare", price: 160, lvl: 3, drop: true,
    draw: () => html`<path d="M38 64c20-30 104-30 124 0-20-6-40-8-62 4-22-12-42-10-62-4z" fill="#1d1d29"/><path d="M56 56c8-26 80-26 88 0z" fill="#1d1d29"/><path d="M40 62c22-8 44-6 60 4 16-10 38-12 60-4" fill="none" stroke="#ffd23f" stroke-width="3"/><circle cx="100" cy="42" r="7" fill="#ffffff"/><circle cx="97" cy="41" r="1.6" fill="#1d1d29"/><circle cx="103" cy="41" r="1.6" fill="#1d1d29"/>` },
  { id: "viking", slot: "head", name: "Casque viking", rarity: "rare", price: 180, lvl: 4, drop: true,
    draw: () => html`<path d="M54 52C34 46 26 26 34 10c4 16 14 26 28 30z" fill="#fff3c4" stroke="#c9a227" stroke-width="2"/><path d="M146 52c20-6 28-26 20-42-4 16-14 26-28 30z" fill="#fff3c4" stroke="#c9a227" stroke-width="2"/><path d="M54 70c0-28 20-44 46-44s46 16 46 44z" fill="#9aa3b5" stroke="#5a6075" stroke-width="3"/><rect x="50" y="62" width="100" height="12" rx="6" fill="#c9a227"/><circle cx="76" cy="68" r="2.5" fill="#fff3c4"/><circle cx="100" cy="68" r="2.5" fill="#fff3c4"/><circle cx="124" cy="68" r="2.5" fill="#fff3c4"/>` },
  { id: "gamer", slot: "head", name: "Casque gamer RGB", rarity: "epic", price: 350, lvl: 5, drop: true,
    draw: () => html`<path d="M44 92c0-40 24-62 56-62s56 22 56 62" fill="none" stroke="#1b1b2b" stroke-width="10" stroke-linecap="round"/><path class="av-rgb" d="M50 70c8-20 26-32 50-32s42 12 50 32" fill="none" stroke-width="3" stroke-linecap="round"/><rect x="32" y="80" width="24" height="38" rx="10" fill="#1b1b2b"/><rect x="144" y="80" width="24" height="38" rx="10" fill="#1b1b2b"/><rect class="av-rgb-f" x="36" y="88" width="6" height="22" rx="3"/><rect class="av-rgb-f" x="158" y="88" width="6" height="22" rx="3"/><path d="M44 114q4 22 40 22" fill="none" stroke="#1b1b2b" stroke-width="4" stroke-linecap="round"/><circle cx="86" cy="136" r="5" fill="#2e2e45"/>` },
  { id: "wizard", slot: "head", name: "Chapeau de sorcier", rarity: "epic", price: 320, lvl: 6, drop: true,
    draw: () => html`<path d="M46 66q54-16 108 0-54 12-108 0z" fill="#3b2f80"/><path d="M66 62 100 0l34 62z" fill="#4a3a9e"/><path d="M68 56q32 8 64 0" fill="none" stroke="#ffd23f" stroke-width="4"/><g transform="translate(100 34) scale(.45)"><path class="av-twinkle" d="${"M0-18 4.7-6.5 17.1-5.6 7.6 2.5 10.6 14.6 0 8-10.6 14.6-7.6 2.5-17.1-5.6-4.7-6.5z"}" fill="#ffd23f"/></g>` },
  { id: "crown", slot: "head", name: "Couronne", rarity: "epic", price: null, lvl: 1, unlock: { bosses: 3, text: "Bats 3 boss" },
    draw: () => html`<path d="M64 56 70 24l16 18 14-24 14 24 16-18 6 32z" fill="#ffd23f" stroke="#c99a00" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="44" r="5" fill="#ff5470"/><circle cx="80" cy="47" r="3.5" fill="#4cc9f0"/><circle cx="120" cy="47" r="3.5" fill="#3ddc84"/>` },
  { id: "halo", slot: "head", name: "Auréole", rarity: "legendary", price: null, lvl: 1, unlock: { streak: 21, text: "Série de 21 jours" },
    draw: () => html`<ellipse class="av-halo" cx="100" cy="22" rx="34" ry="9" fill="none" stroke="#fff3a8" stroke-width="12" opacity=".35"/><ellipse class="av-halo" cx="100" cy="22" rx="34" ry="9" fill="none" stroke="#ffe066" stroke-width="6"/>` },
  // Yeux
  { id: "round", slot: "eyes", name: "Lunettes rondes", rarity: "common", price: 60, lvl: 1, drop: true,
    draw: () => html`<circle cx="76" cy="96" r="16" fill="#ffffff" opacity=".15"/><circle cx="124" cy="96" r="16" fill="#ffffff" opacity=".15"/><g fill="none" stroke="#1d1d29" stroke-width="4"><circle cx="76" cy="96" r="16"/><circle cx="124" cy="96" r="16"/><path d="M92 94q8-6 16 0M60 92l-12-4M140 92l12-4"/></g>` },
  { id: "sun", slot: "eyes", name: "Lunettes de soleil", rarity: "common", price: 80, lvl: 2, drop: true,
    draw: () => html`<path d="M54 86h44v10c0 12-8 18-22 18s-22-6-22-18zM102 86h44v10c0 12-8 18-22 18s-22-6-22-18z" fill="#1d1d29"/><path d="M96 90h8M54 88l-8-4M146 88l8-4" stroke="#1d1d29" stroke-width="4" stroke-linecap="round"/><path d="M60 92h12M108 92h12" stroke="#ffffff" opacity=".45" stroke-width="3" stroke-linecap="round"/>` },
  { id: "pixel", slot: "eyes", name: "Lunettes pixel", rarity: "rare", price: 200, lvl: 3, drop: true,
    draw: () => html`<g fill="#111111"><rect x="50" y="86" width="100" height="6"/><rect x="56" y="92" width="36" height="12"/><rect x="108" y="92" width="36" height="12"/><rect x="62" y="104" width="24" height="5"/><rect x="114" y="104" width="24" height="5"/></g><g fill="#ffffff"><rect x="62" y="94" width="6" height="4"/><rect x="114" y="94" width="6" height="4"/></g>` },
  { id: "monocle", slot: "eyes", name: "Monocle", rarity: "rare", price: 160, lvl: 4, drop: true,
    draw: () => html`<circle cx="124" cy="96" r="15" fill="#ffffff" opacity=".12"/><circle cx="124" cy="96" r="15" fill="none" stroke="#ffd23f" stroke-width="3.5"/><path d="M137 104q8 20 2 44" fill="none" stroke="#ffd23f" stroke-width="2"/>` },
  { id: "stars", slot: "eyes", name: "Lunettes étoiles", rarity: "epic", price: 300, lvl: 6, drop: true,
    draw: () => html`<path d="M93 94h14" stroke="#c99a00" stroke-width="4"/><g transform="translate(76 96)"><path d="${star5}" fill="#ffd23f" stroke="#c99a00" stroke-width="2" stroke-linejoin="round"/></g><g transform="translate(124 96)"><path d="${star5}" fill="#ffd23f" stroke="#c99a00" stroke-width="2" stroke-linejoin="round"/></g>` },
  { id: "visor", slot: "eyes", name: "Visière VR", rarity: "legendary", price: 600, lvl: 10, drop: true,
    draw: () => html`<rect x="48" y="80" width="104" height="32" rx="14" fill="#1b1b2b"/><rect class="av-visor" x="54" y="85" width="92" height="22" rx="10"/><path d="M62 91h34" stroke="#ffffff" stroke-width="3" opacity=".6" stroke-linecap="round"/>` },
  // Cou
  { id: "bowtie", slot: "neck", name: "Nœud papillon", rarity: "common", price: 60, lvl: 1, drop: true,
    draw: () => html`<path d="M100 146l-18-10v20zM100 146l18-10v20z" fill="#ff6fae" stroke="#c43d7c" stroke-width="2" stroke-linejoin="round"/><rect x="95" y="141" width="10" height="10" rx="3" fill="#c43d7c"/>` },
  { id: "scarf", slot: "neck", name: "Écharpe", rarity: "common", price: 70, lvl: 1, drop: true,
    draw: () => html`<path d="M58 140q42 18 84 0v12q-42 18-84 0z" fill="#ff5470"/><path d="M118 148l10 30-14 2-6-28z" fill="#ff5470"/><path d="M64 145q36 14 72 0" stroke="#ffffff" stroke-width="3" opacity=".5" fill="none"/>` },
  { id: "bandana", slot: "neck", name: "Bandana", rarity: "common", price: 70, lvl: 2, drop: true,
    draw: () => html`<path d="M64 138q36 12 72 0l-36 30z" fill="#4cc9f0"/><circle cx="92" cy="146" r="2" fill="#fff"/><circle cx="106" cy="149" r="2" fill="#fff"/><circle cx="100" cy="157" r="2" fill="#fff"/>` },
  { id: "medal", slot: "neck", name: "Médaille d'or", rarity: "rare", price: null, lvl: 1, unlock: { rank: 2, text: "Atteins le rang Or" },
    draw: () => html`<path d="M84 138l16 22 16-22" fill="none" stroke="#4cc9f0" stroke-width="7"/><circle cx="100" cy="166" r="11" fill="#ffd23f" stroke="#c99a00" stroke-width="3"/><g transform="translate(100 166) scale(.38)"><path d="${star5}" fill="#c99a00"/></g>` },
  { id: "chain", slot: "neck", name: "Chaîne en or", rarity: "epic", price: 340, lvl: 7, drop: true,
    draw: () => html`<path d="M66 138q34 30 68 0" fill="none" stroke="#ffd23f" stroke-width="5" stroke-dasharray="6 3"/><circle cx="100" cy="160" r="9" fill="#ffd23f" stroke="#c99a00" stroke-width="2"/><circle cx="100" cy="160" r="4" fill="#4cc9f0"/>` },
  { id: "cape", slot: "neck", name: "Cape de héros", rarity: "epic", price: 380, lvl: 8, drop: true,
    back: () => html`<path class="av-cape" d="M64 140c-20 30-24 46-20 56h112c4-10 0-26-20-56z" fill="#ff5470"/>`,
    draw: () => html`<path d="M62 138q38 14 76 0" stroke="#c22a47" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="100" cy="144" r="6" fill="#ffd23f" stroke="#c99a00" stroke-width="2"/>` },
  // Main
  { id: "mic", slot: "hand", name: "Micro", rarity: "common", price: 60, lvl: 1, drop: true,
    draw: () => html`<g transform="translate(162 150) rotate(20)"><rect x="-4" y="0" width="8" height="30" rx="3" fill="#2e2e45"/><circle cx="0" cy="-4" r="11" fill="#9aa3b5" stroke="#5a6075" stroke-width="2"/><path d="M-7-8h14M-8-3h16M-7 2h14" stroke="#5a6075" stroke-width="1.5"/></g>` },
  { id: "tea", slot: "hand", name: "Tasse de thé", rarity: "common", price: 70, lvl: 2, drop: true,
    draw: () => html`<g transform="translate(160 160)"><path class="av-steam" d="M-6-16q-4-6 0-12M2-16q-4-6 0-12" fill="none" stroke="#ffffff" stroke-width="2" opacity=".75" stroke-linecap="round"/><path d="M-14-8h24v12c0 8-6 12-12 12s-12-4-12-12z" fill="#ffffff" stroke="#c9c2e8" stroke-width="2"/><path d="M10-4c8 0 8 10 0 10" fill="none" stroke="#c9c2e8" stroke-width="3"/><path d="M-12-4h20" stroke="#c98b5a" stroke-width="3"/></g>` },
  { id: "flag", slot: "hand", name: "Drapeau britannique", rarity: "rare", price: 150, lvl: 3, drop: true,
    draw: () => html`<g transform="translate(158 172)"><rect x="-2" y="-64" width="4" height="66" rx="2" fill="#8b5a3c"/><g class="av-flag" transform="translate(2 -64)"><rect width="44" height="28" fill="#1e3a8a"/><path d="M0 0 44 28M44 0 0 28" stroke="#fff" stroke-width="6"/><path d="M0 0 44 28M44 0 0 28" stroke="#ef4444" stroke-width="2"/><path d="M22 0v28M0 14h44" stroke="#fff" stroke-width="8"/><path d="M22 0v28M0 14h44" stroke="#ef4444" stroke-width="4.5"/></g></g>` },
  { id: "controller", slot: "hand", name: "Manette", rarity: "rare", price: 200, lvl: 4, drop: true,
    draw: () => html`<g transform="translate(158 162) rotate(-12) scale(.9)"><path d="M-22-10h44c8 0 12 6 12 14 0 10-6 16-12 16-6 0-8-6-14-6h-16c-6 0-8 6-14 6-6 0-12-6-12-16 0-8 4-14 12-14z" fill="#2e2e45" stroke="#8b7be0" stroke-width="2"/><path d="M-14-4v10M-19 1h10" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="-3" r="3" fill="#ff5470"/><circle cx="18" cy="3" r="3" fill="#3ddc84"/><circle cx="6" cy="3" r="3" fill="#4cc9f0"/><circle cx="12" cy="9" r="3" fill="#ffd23f"/></g>` },
  { id: "sword", slot: "hand", name: "Épée en mousse", rarity: "rare", price: 180, lvl: 5, drop: true,
    draw: () => html`<g transform="translate(160 164) rotate(-35)"><rect x="-4" y="-58" width="8" height="54" rx="4" fill="#4cc9f0" stroke="#1e8fb5" stroke-width="2"/><rect x="-14" y="-6" width="28" height="7" rx="3" fill="#ffd23f"/><rect x="-3" y="1" width="6" height="14" rx="3" fill="#8b5a3c"/></g>` },
  { id: "wand", slot: "hand", name: "Baguette magique", rarity: "epic", price: 320, lvl: 7, drop: true,
    draw: () => html`<g transform="translate(160 162) rotate(-30)"><rect x="-2.5" y="-46" width="5" height="46" rx="2" fill="#1d1d29"/><rect x="-2.5" y="-46" width="5" height="8" fill="#ffffff"/><g transform="translate(0 -60) scale(.55)"><path class="av-twinkle" d="${star5}" fill="#ffd23f"/></g></g>` },
  { id: "guitar", slot: "hand", name: "Guitare", rarity: "epic", price: 340, lvl: 8, drop: true,
    draw: () => html`<g transform="translate(160 166) rotate(-40)"><rect x="-3" y="-58" width="6" height="40" fill="#6b4129"/><rect x="-6" y="-64" width="12" height="9" rx="2" fill="#3a2414"/><path d="M0-22c10 0 14 6 12 12 6 4 6 16-2 20-6 3-14 3-20 0-8-4-8-16-2-20-2-6 2-12 12-12z" fill="#ff9f43" stroke="#c46e16" stroke-width="2"/><circle cx="0" cy="-4" r="4" fill="#3a2414"/></g>` },
  { id: "trophy", slot: "hand", name: "Mini trophée", rarity: "legendary", price: null, lvl: 1, unlock: { rank: 4, text: "Atteins le rang Diamant" },
    draw: () => html`<g transform="translate(160 160)"><path d="M-12-20h24v8c0 10-6 16-12 16s-12-6-12-16z" fill="#ffd23f" stroke="#c99a00" stroke-width="2"/><path d="M-12-16h-6c0 8 4 12 8 12M12-16h6c0 8-4 12-8 12" fill="none" stroke="#c99a00" stroke-width="2.5"/><rect x="-3" y="4" width="6" height="8" fill="#c99a00"/><rect x="-10" y="12" width="20" height="6" rx="2" fill="#8b5a3c"/></g>` },
  // Aura (derrière le compagnon, animée)
  { id: "starfield", slot: "aura", name: "Étoiles", rarity: "common", price: 90, lvl: 2, drop: true,
    draw: () => html`${[[28, 40, 1], [172, 46, 2], [22, 132, 3], [180, 128, 4], [100, 8, 5]].map(([x, y, d]) => html`<g transform="translate(${x} ${y}) scale(.5)"><path class="av-twinkle d${d}" d="${star5}" fill="#ffd23f"/></g>`)}` },
  { id: "hearts", slot: "aura", name: "Cœurs", rarity: "rare", price: 180, lvl: 3, drop: true,
    draw: () => html`${[[30, 120, 1], [170, 110, 2], [44, 60, 3], [160, 52, 4]].map(([x, y, d]) => html`<g transform="translate(${x} ${y})"><path class="av-float d${d}" d="${heart}" fill="#ff6fae"/></g>`)}` },
  { id: "sparkles", slot: "aura", name: "Étincelles", rarity: "rare", price: 200, lvl: 4, drop: true,
    draw: () => html`${[[26, 70, 1], [176, 80, 2], [40, 150, 3], [166, 156, 4], [150, 20, 5], [52, 22, 2]].map(([x, y, d]) => html`<g transform="translate(${x} ${y})"><path class="av-twinkle d${d}" d="${spark}" fill="#ffffff"/></g>`)}` },
  { id: "glow", slot: "aura", name: "Halo d'énergie", rarity: "rare", price: 220, lvl: 5, drop: true,
    draw: () => html`<circle class="av-pulse" cx="100" cy="110" r="86" fill="none" stroke="#4cc9f0" stroke-width="4" opacity=".55"/><circle class="av-pulse d2" cx="100" cy="110" r="72" fill="none" stroke="#a98bff" stroke-width="3" opacity=".45"/>` },
  { id: "pixels", slot: "aura", name: "Pixels", rarity: "epic", price: 360, lvl: 6, drop: true,
    draw: () => html`${[[24, 60, "#39ff14", 1], [170, 40, "#ff2fd0", 2], [30, 150, "#4cc9f0", 3], [176, 140, "#ffd23f", 4], [60, 20, "#ff5470", 5], [140, 186, "#39ff14", 2], [12, 104, "#ff2fd0", 4], [188, 96, "#4cc9f0", 1]].map(([x, y, f, d]) => html`<rect class="av-float d${d}" x="${x}" y="${y}" width="8" height="8" fill="${f}"/>`)}` },
  { id: "fire", slot: "aura", name: "Flammes", rarity: "epic", price: 400, lvl: 8, drop: true,
    draw: () => html`${[[44, 192, 1.1, 1], [100, 200, 1.5, 2], [156, 192, 1.1, 3]].map(([x, y, s, d]) => html`<g transform="translate(${x} ${y}) scale(${s})"><g class="av-flame d${d}"><path d="M0 0c-14-12-12-30 0-44 2 10 10 12 10 22 4-4 5-9 3-14 10 10 10 28-2 36z" fill="#ff9f43"/><path d="M0 0c-7-6-6-16 0-24 1 6 6 8 6 13 2-2 2-4 1-7 5 6 5 14-1 18z" fill="#ffd23f"/></g></g>`)}` },
  { id: "rainbow", slot: "aura", name: "Arc-en-ciel", rarity: "legendary", price: 700, lvl: 12, drop: true,
    draw: () => html`<g class="av-pulse" fill="none" stroke-width="7" stroke-linecap="round">${["#ff5470", "#ff9f43", "#ffd23f", "#3ddc84", "#4cc9f0", "#a98bff"].map((col, i) => html`<path d="M${8 + i * 8} 126a${92 - i * 8} ${92 - i * 8} 0 0 1 ${184 - i * 16} 0" stroke="${col}"/>`)}</g>` },
  { id: "lightning", slot: "aura", name: "Éclairs", rarity: "legendary", price: null, lvl: 1, unlock: { chrono: 3000, text: "Marque 3 000 points au défi chrono" },
    draw: () => html`<g transform="translate(20 40)"><path class="av-flash" d="M8 0h14l-8 16h10L6 50l6-22H2z" fill="#ffd23f" stroke="#c99a00" stroke-width="1.5"/></g><g transform="translate(160 60)"><path class="av-flash d2" d="M8 0h14l-8 16h10L6 50l6-22H2z" fill="#ffd23f" stroke="#c99a00" stroke-width="1.5"/></g>` }
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const SLOTS = [["head", "Tête"], ["eyes", "Yeux"], ["neck", "Cou"], ["hand", "Main"], ["aura", "Aura"]];

// ---------- Thèmes de l'interface ----------
export const THEMES = [
  { id: "nuit", name: "Nuit violette", rarity: "common", price: 0, lvl: 1, sw: ["#150d3d", "#ffd23f", "#4cc9f0"] },
  { id: "jour", name: "Jour", rarity: "common", price: 0, lvl: 1, sw: ["#f4f1ff", "#5b3fd6", "#ff6fae"] },
  { id: "foret", name: "Forêt enchantée", rarity: "common", price: 120, lvl: 2, drop: true, sw: ["#0b2118", "#9be564", "#ffd23f"] },
  { id: "ocean", name: "Abysses", rarity: "common", price: 120, lvl: 2, drop: true, sw: ["#04192b", "#2ee6d6", "#ff8a5c"] },
  { id: "sunset", name: "Coucher de soleil", rarity: "rare", price: 200, lvl: 3, drop: true, sw: ["#2a0f2e", "#ff9f43", "#ff6fae"] },
  { id: "neon", name: "Néon cyber", rarity: "epic", price: 320, lvl: 4, drop: true, sw: ["#05060f", "#00f0ff", "#ff2fd0"] },
  { id: "arcade", name: "Rétro arcade", rarity: "epic", price: 350, lvl: 6, drop: true, sw: ["#000000", "#39ff14", "#ff2fd0"] },
  { id: "prestige", name: "Prestige", rarity: "legendary", price: null, lvl: 1, unlock: { rank: 5, text: "Atteins le rang Maître" }, sw: ["#0c0a06", "#ffd700", "#fff3c4"] }
];
export const THEME_BY_ID = Object.fromEntries(THEMES.map(t => [t.id, t]));

export const RARITY = { common: "Commun", rare: "Rare", epic: "Épique", legendary: "Légendaire" };
export const SKIN_PRICE = { common: 80, rare: 160, epic: 320, legendary: 700 };

// Identifiants d'inventaire : « skin.<espèce>.<couleur> », « theme.<id> », ou l'id de l'accessoire.
export const skinKey = (sp, sk) => `skin.${sp}.${sk}`;
export const themeKey = t => `theme.${t}`;
export const DEFAULT_OWNED = ["phones", themeKey("nuit"), themeKey("jour")];
export const DEFAULT_AVATAR = { species: "skunk", skin: "night", head: "phones", eyes: "", neck: "", hand: "", aura: "", name: "Pouf" };

export function ownsSkin(owned, sp, sk) {
  const s = SPECIES_BY_ID[sp];
  return !!s && (s.skins[0].id === sk || owned.includes(skinKey(sp, sk)));
}
// Tout ce qui peut sortir d'un coffre (et que le joueur n'a pas encore).
export function droppable(owned) {
  const out = [];
  for (const i of ITEMS) if (i.drop && !owned.includes(i.id)) out.push({ id: i.id, rarity: i.rarity });
  for (const s of SPECIES) for (const k of s.skins.slice(1)) if (!owned.includes(skinKey(s.id, k.id))) out.push({ id: skinKey(s.id, k.id), rarity: k.rarity });
  for (const t of THEMES) if (t.drop && !owned.includes(themeKey(t.id))) out.push({ id: themeKey(t.id), rarity: t.rarity });
  return out;
}
export function describeOwned(id) {
  if (id.startsWith("skin.")) { const [, sp, sk] = id.split("."); const s = SPECIES_BY_ID[sp], k = s && s.skins.find(x => x.id === sk); return k ? { kind: "skin", name: `${s.name} ${k.name}`, rarity: k.rarity, sp, sk } : null; }
  if (id.startsWith("theme.")) { const t = THEME_BY_ID[id.slice(6)]; return t ? { kind: "theme", name: `Thème ${t.name}`, rarity: t.rarity, theme: t.id } : null; }
  const i = ITEM_BY_ID[id]; return i ? { kind: "item", name: i.name, rarity: i.rarity, slot: i.slot } : null;
}
export const isValidOwned = id => !!describeOwned(id);

// ---------- Rendu ----------
export function avatarSvg(av = DEFAULT_AVATAR, { cls = "", label = "" } = {}) {
  const sp = SPECIES_BY_ID[av.species] || SPECIES[0];
  const skin = sp.skins.find(s => s.id === av.skin) || sp.skins[0];
  const c = { cheek: "#ff9bb3", nose: "#ff8fab", belly: "#ffffff", line: "#8b7be0", ...skin.c };
  c.lid = lum(c[sp.eyeBg || "fur"] || c.fur) > 0.3 ? "#1c1240" : "#ffffff";
  const it = slot => { const i = ITEM_BY_ID[av[slot]]; return i && i.slot === slot ? i : null; };
  const head = it("head"), eyes = it("eyes"), neck = it("neck"), hand = it("hand"), aura = it("aura");
  return html`<svg class="pouf av sp-${sp.id} ${cls}" viewBox="0 0 200 200" role="img" aria-label="${label || `${av.name || sp.name}, ${sp.name.toLowerCase()}`}">
    ${aura ? html`<g class="av-aura">${aura.draw()}</g>` : ""}
    ${neck && neck.back ? neck.back() : ""}
    ${sp.back ? sp.back(c) : ""}
    ${sp.tail ? sp.tail(c) : ""}
    <g class="av-body">${sp.body(c)}</g>
    ${neck ? html`<g class="av-neck">${neck.draw()}</g>` : ""}
    <g class="pf-head av-head">
      ${sp.ears ? sp.ears(c) : ""}
      ${sp.head(c)}
      ${sp.marks ? sp.marks(c) : ""}
      ${eyesBlock(c)}
      ${cheeks(c)}
      ${sp.nose ? sp.nose(c) : stdNose(c)}
      ${sp.mouth ? sp.mouth(c) : stdMouth(c)}
      ${eyes ? html`<g class="av-eyes">${eyes.draw()}</g>` : ""}
      ${head ? html`<g class="av-hat" transform="translate(0 ${sp.hatY || 0})">${head.draw()}</g>` : ""}
    </g>
    ${hand ? html`<g class="av-hand">${hand.draw()}</g>` : ""}
  </svg>`;
}

// Petite icône d'un accessoire seul (boutique) : on le dessine sur une silhouette neutre.
export function itemPreview(id) {
  const i = ITEM_BY_ID[id];
  if (!i) return html``;
  return html`<svg class="item-ico" viewBox="0 0 200 200" aria-hidden="true">
    ${i.slot === "aura" ? html`<g class="av-aura">${i.draw()}</g>` : ""}
    ${i.back ? i.back() : ""}
    <circle cx="100" cy="94" r="56" fill="#ffffff" opacity=".08"/><ellipse cx="100" cy="160" rx="52" ry="34" fill="#ffffff" opacity=".06"/>
    ${i.slot !== "aura" ? i.draw() : ""}
  </svg>`;
}

// ---------- Boss des unités ----------
export const BOSSES = {
  u1: { name: "Monsieur Bonjour", fur: "#ff9f43", hat: "cap", eyes: "", line: "Bonjour ? Non : Hello ! Prouve-moi que tu sais te présenter !" },
  u2: { name: "Cupidon Grognon", fur: "#ff6fae", hat: "bow", eyes: "", aura: "hearts", line: "L'amour, ça se dit bien ou pas du tout !" },
  u3: { name: "Le Douanier", fur: "#4cc9f0", hat: "cap", eyes: "monocle", line: "Passeport ! Et parle-moi en anglais, s'il te plaît." },
  u4: { name: "Le Conteur", fur: "#3ddc84", hat: "wizard", eyes: "round", line: "Raconte-moi ton week-end… sans fautes !" },
  u5: { name: "La Cheffe Pressée", fur: "#ffd23f", hat: "chef", eyes: "", line: "Vite ! Le client attend, prononce bien !" },
  u6: { name: "Le Videur", fur: "#a98bff", hat: "", eyes: "sun", neck: "chain", line: "Pour entrer, il faut le bon accent." },
  u7: { name: "Docteur Zarbi", fur: "#5ee6d0", hat: "", eyes: "round", neck: "bowtie", line: "Dites « aaah »… en anglais !" },
  u8: { name: "La Critique", fur: "#ff5470", hat: "pirate", eyes: "monocle", line: "Ton avis ? Je le note sur 100." },
  u9: { name: "Le Robot du standard", fur: "#9aa3b5", hat: "", eyes: "visor", aura: "lightning", line: "Bip. Veuillez parler distinctement. Bip." }
};
export function bossSvg(unitId, cls = "") {
  const b = BOSSES[unitId] || BOSSES.u1;
  const it = id => id && ITEM_BY_ID[id];
  const hat = it(b.hat), eyes = it(b.eyes), neck = it(b.neck), aura = it(b.aura);
  return html`<svg class="boss ${cls}" viewBox="0 0 200 200" role="img" aria-label="${b.name}">
    ${aura ? html`<g class="av-aura">${aura.draw()}</g>` : ""}
    <g class="boss-body">
      <path d="M100 34c42 0 70 30 72 72 2 40-12 66-30 78-20 10-64 10-84 0-18-12-32-38-30-78 2-42 30-72 72-72z" fill="${b.fur}" stroke="#120d24" stroke-width="4"/>
      <path d="M64 46 54 18l26 16zM136 46l10-28-26 16z" fill="#fff3c4" stroke="#120d24" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="100" cy="160" rx="40" ry="18" fill="#ffffff" opacity=".18"/>
      <g class="boss-eyes"><ellipse cx="76" cy="104" rx="14" ry="16" fill="#fff"/><ellipse cx="124" cy="104" rx="14" ry="16" fill="#fff"/><circle cx="79" cy="107" r="7" fill="#c22a47"/><circle cx="121" cy="107" r="7" fill="#c22a47"/><circle cx="79" cy="107" r="3" fill="#120d24"/><circle cx="121" cy="107" r="3" fill="#120d24"/></g>
      <path d="M58 82l30 12M142 82l-30 12" stroke="#120d24" stroke-width="7" stroke-linecap="round"/>
      <path d="M70 138q30 20 60 0-30 10-60 0z" fill="#120d24"/>
      <path d="M78 140l5 7 5-6 6 7 6-7 6 7 6-7 5 6 5-7z" fill="#ffffff"/>
      ${neck ? html`<g transform="translate(0 18)">${neck.draw()}</g>` : ""}
      ${eyes ? html`<g transform="translate(0 8)">${eyes.draw()}</g>` : ""}
      ${hat ? html`<g transform="translate(0 2)">${hat.draw()}</g>` : ""}
    </g>
  </svg>`;
}
