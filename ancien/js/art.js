// Petits dessins de l'interface : pièce, trophée, coffres, emblèmes de rang. Originaux, en SVG.
import { html } from "./core/dom.js";

export const COIN = html`<svg class="ico coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ffd23f" stroke="#c99a00" stroke-width="2"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#c99a00" stroke-width="1.5"/><path d="M12 8.2l1.2 2.5 2.7.3-2 1.8.6 2.7-2.5-1.4-2.5 1.4.6-2.7-2-1.8 2.7-.3z" fill="#fff3b0"/></svg>`;
export const TROPHY = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4a5 5 0 0 1-10 0z" fill="#ffd23f" stroke="#c99a00" stroke-width="1.5"/><path d="M7 5H4c0 3 1.5 4.5 3.5 4.5M17 5h3c0 3-1.5 4.5-3.5 4.5" fill="none" stroke="#c99a00" stroke-width="1.5"/><rect x="10.5" y="12" width="3" height="4" fill="#c99a00"/><rect x="7.5" y="16" width="9" height="4" rx="1" fill="#8b5a3c"/></svg>`;
export const CHEST_ICO = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5z" fill="#c98b5a" stroke="#6b4129" stroke-width="1.5"/><rect x="3" y="10" width="18" height="10" rx="2" fill="#a86a3d" stroke="#6b4129" stroke-width="1.5"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#ffd23f" stroke="#c99a00"/></svg>`;
export const BOLT = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="#ffd23f" stroke="#c99a00" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
export const SNOW = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="#7cc4ff" stroke-width="2" stroke-linecap="round"/></svg>`;
export const CROWN = html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 4 7l5 5 3-7 3 7 5-5 1 11z" fill="#ffd23f" stroke="#c99a00" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
export const HEART = on => html`<svg class="ico heart ${on ? "on" : "off"}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 15.5 2 12.3 2 8.5 2 5.4 4.4 3 7.3 3c1.9 0 3.6 1 4.7 2.6C13.1 4 14.8 3 16.7 3 19.6 3 22 5.4 22 8.5c0 3.8-3 7-10 12.5z" fill="${on ? "#ff5470" : "#3b2f80"}" stroke="${on ? "#c22a47" : "#1d1450"}" stroke-width="1.5"/></svg>`;

const CHEST_COLORS = {
  wood: { body: "#a86a3d", lid: "#c98b5a", band: "#6b4129", lock: "#ffd23f", glow: "#ffd27a" },
  silver: { body: "#8d93a6", lid: "#b9c0d0", band: "#4d5466", lock: "#4cc9f0", glow: "#c7e9ff" },
  gold: { body: "#d9a514", lid: "#ffd23f", band: "#8a6a00", lock: "#ff5470", glow: "#fff3a8" },
  legend: { body: "#6c4fd1", lid: "#a98bff", band: "#ffd23f", lock: "#ff6fae", glow: "#ffb3ec" }
};
export function chestSvg(tier, cls = "") {
  const c = CHEST_COLORS[tier] || CHEST_COLORS.wood;
  return html`<svg class="chest chest-${tier} ${cls}" viewBox="0 0 200 180" role="img" aria-label="Coffre">
    <g class="chest-glow"><circle cx="100" cy="92" r="70" fill="${c.glow}" opacity=".35"/></g>
    <g class="chest-rays" stroke="${c.glow}" stroke-width="6" stroke-linecap="round" opacity=".8">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => html`<path d="M100 92 100 12" transform="rotate(${a} 100 92)"/>`)}</g>
    <rect x="34" y="92" width="132" height="70" rx="10" fill="${c.body}" stroke="#120d24" stroke-width="4"/>
    <rect x="34" y="114" width="132" height="10" fill="${c.band}"/><rect x="62" y="92" width="12" height="70" fill="${c.band}"/><rect x="126" y="92" width="12" height="70" fill="${c.band}"/>
    <g class="chest-lid"><path d="M34 92V74c0-24 20-40 66-40s66 16 66 40v18z" fill="${c.lid}" stroke="#120d24" stroke-width="4" stroke-linejoin="round"/><rect x="62" y="40" width="12" height="52" fill="${c.band}"/><rect x="126" y="40" width="12" height="52" fill="${c.band}"/><path d="M48 60q52-26 104 0" fill="none" stroke="#ffffff" stroke-width="4" opacity=".3" stroke-linecap="round"/></g>
    <rect x="88" y="84" width="24" height="28" rx="5" fill="${c.lock}" stroke="#120d24" stroke-width="3"/><circle cx="100" cy="96" r="4" fill="#120d24"/>
  </svg>`;
}

export function emblemSvg(rank, cls = "") {
  const n = rank.div === "I" ? 3 : rank.div === "II" ? 2 : rank.div === "III" ? 1 : 0;
  return html`<svg class="emblem ${cls}" viewBox="0 0 100 110" role="img" aria-label="${`Rang ${rank.name} ${rank.div}`}">
    <path d="M50 4 92 20v34c0 26-18 44-42 52C26 98 8 80 8 54V20z" fill="${rank.color}" stroke="#120d24" stroke-width="4" stroke-linejoin="round"/>
    <path d="M50 14 82 26v28c0 20-13 34-32 41C31 88 18 74 18 54V26z" fill="#ffffff" opacity=".18"/>
    <path d="M50 30l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="#ffffff" stroke="#120d24" stroke-width="2.5" stroke-linejoin="round"/>
    ${[0, 1, 2].slice(0, n).map(i => html`<path d="M${36 + i * 14} 84l7 6 7-6" fill="none" stroke="#120d24" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`)}
    ${rank.id === "legend" ? html`<path class="av-twinkle" d="M50 0l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffffff"/>` : ""}
  </svg>`;
}

// Boîtes à butin : chaque modèle a sa couleur ; la mythique a un ruban qui change de couleur.
const BOX_COLORS = {
  classic: { a: "#4cc9f0", b: "#1e8fb5", rib: "#ffd23f", ribD: "#c99a00" },
  epic: { a: "#a98bff", b: "#6c4fd1", rib: "#ff6fae", ribD: "#c43d7c" },
  mythic: { a: "#241a4f", b: "#120d24", rib: "#ff2fd0", ribD: "#8a1a73" }
};
export function boxSvg(id, cls = "") {
  const c = BOX_COLORS[id] || BOX_COLORS.classic, rgb = id === "mythic" ? "box-rgb" : "";
  return html`<svg class="lbox lbox-${id} ${cls}" viewBox="0 0 200 200" role="img" aria-label="Boîte à butin">
    <ellipse cx="100" cy="186" rx="64" ry="9" fill="#000000" opacity=".3"/>
    <g class="lbox-body">
      <rect x="40" y="94" width="120" height="86" rx="10" fill="${c.a}" stroke="#120d24" stroke-width="4"/>
      <rect x="40" y="150" width="120" height="30" rx="8" fill="${c.b}" opacity=".55"/>
      <rect class="${rgb}" x="90" y="94" width="20" height="86" fill="${c.rib}"/>
      <text x="64" y="152" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-style="italic" font-weight="900" font-size="46" fill="#ffffff" opacity=".9">?</text>
      <text x="124" y="152" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-style="italic" font-weight="900" font-size="46" fill="#ffffff" opacity=".9">?</text>
      ${id === "mythic" ? html`<path d="M48 104l8 8M146 104l8 8M50 170l10-6M150 170l-10-6" stroke="#ffd23f" stroke-width="3" stroke-linecap="round" opacity=".8"/>` : ""}
    </g>
    <g class="lbox-lid">
      <rect x="30" y="68" width="140" height="32" rx="8" fill="${c.a}" stroke="#120d24" stroke-width="4"/>
      <rect x="30" y="88" width="140" height="12" rx="4" fill="${c.b}" opacity=".5"/>
      <rect class="${rgb}" x="90" y="68" width="20" height="32" fill="${c.rib}"/>
      <path class="${rgb}" d="M100 66c-10-22-40-26-38-8 2 12 24 12 38 8zM100 66c10-22 40-26 38-8-2 12-24 12-38 8z" fill="${c.rib}" stroke="${c.ribD}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="100" cy="64" r="8" fill="${c.ribD}"/>
    </g>
  </svg>`;
}
