// Dessins du coffre et de la boîte à butin (phase 6, repris de ancien/js/art.js).
import { html } from "../core/dom.js";

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
