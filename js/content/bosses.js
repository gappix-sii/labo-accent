// Les 9 boss du parcours (phase 9, tâche 2), un par région (js/content/regions.js), en rapport avec son thème.
// Style « mignon » choisi par l'utilisateur le 2026-11-19 : petites créatures rondes aux grands yeux brillants,
// joues roses et sourcils froncés (fâchées pour rire), chacune avec un objet de sa région. Dessins originaux ;
// noms et répliques d'entrée repris de ancien/js/avatar.js.
// Trois états : "idle" (au repos : il rebondit et cligne des yeux), "hit" (touché : yeux plissés > <, il recule
// et clignote), "ko" (vaincu : yeux en croix, il s'affaisse). Animations dans css/theme.css, sur transform et opacity
// seulement, coupées par « Effets réduits ».
import { html } from "../core/dom.js";

const INK = "#3a2350"; // contour et yeux

// ---------- Morceaux communs ----------
const heart = (x, y, s, fill) => html`<path transform="${`translate(${x} ${y}) scale(${s})`}" d="M0 5 C-7 -1 -5 -8 0 -4 C5 -8 7 -1 0 5 Z" fill="${fill}" stroke="${INK}" stroke-width="${2 / s}"/>`;
const shine = (d) => html`<path d="${d}" stroke="#ffffff" stroke-width="7" opacity=".7" fill="none" stroke-linecap="round"/>`;
const feet = (y, fill, dx = 22) => html`<ellipse cx="${100 - dx}" cy="${y}" rx="12" ry="7" fill="${fill}" stroke="${INK}" stroke-width="4"/><ellipse cx="${100 + dx}" cy="${y}" rx="12" ry="7" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
const arm = (d, fill) => html`<path d="${d}" stroke="${INK}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${fill}" stroke-width="7" fill="none" stroke-linecap="round"/>`;

// Visage : yeux, sourcils, joues, bouche, selon l'état. o.mouth : "grump" (moue), "shout" (bouche ouverte),
// "flat" (trait), "cat" (ω), "beak" (bec) ; o.glasses : lunettes noires à la place des yeux (au repos).
function face(st, { y = 120, dx = 22, eye = INK, mouth = "grump", glasses = false, blush = true } = {}) {
  const L = 100 - dx, R = 100 + dx;
  const eyes = st === "ko"
    ? html`<path d="${`M${L - 9} ${y - 9}l18 18M${L + 9} ${y - 9}l-18 18M${R - 9} ${y - 9}l18 18M${R + 9} ${y - 9}l-18 18`}" stroke="${eye}" stroke-width="5" stroke-linecap="round"/>`
    : st === "hit"
      ? html`<path d="${`M${L - 9} ${y - 9}l15 9-15 9M${R + 9} ${y - 9}l-15 9 15 9`}" stroke="${eye}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      : glasses
        ? html`<path d="${`M${L - 18} ${y - 10}h${2 * dx + 36}`}" stroke="${INK}" stroke-width="4"/><rect x="${L - 18}" y="${y - 12}" width="34" height="22" rx="9" fill="#1c1430" stroke="${INK}" stroke-width="3"/><rect x="${R - 16}" y="${y - 12}" width="34" height="22" rx="9" fill="#1c1430" stroke="${INK}" stroke-width="3"/><path d="${`M${L - 11} ${y - 6}l9 0M${R - 9} ${y - 6}l9 0`}" stroke="#ffffff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`
        : html`<g class="boss-eyes"><ellipse cx="${L}" cy="${y}" rx="12" ry="14" fill="${eye}"/><ellipse cx="${R}" cy="${y}" rx="12" ry="14" fill="${eye}"/>
            <circle cx="${L - 5}" cy="${y - 7}" r="5" fill="#ffffff"/><circle cx="${R - 5}" cy="${y - 7}" r="5" fill="#ffffff"/><circle cx="${L + 4}" cy="${y + 6}" r="2.3" fill="#ffffff"/><circle cx="${R + 4}" cy="${y + 6}" r="2.3" fill="#ffffff"/></g>`;
  const brows = st === "ko" ? "" : html`<path d="${`M${L - 14} ${y - 22}l20 6M${R + 14} ${y - 22}l-20 6`}" stroke="${eye}" stroke-width="5" stroke-linecap="round"/>`;
  const m = y + 28;
  const mo = st === "ko" && mouth !== "beak"
    ? html`<path d="${`M86 ${m}q4-4 7 0t7 0 7 0 7 0`}" stroke="${eye}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : st === "hit" && mouth !== "beak"
      ? html`<ellipse cx="100" cy="${m}" rx="6" ry="7" fill="${eye}"/>`
      : mouth === "shout" ? html`<path d="${`M89 ${m - 4}q11 16 22 0z`}" fill="${eye}" stroke="${eye}" stroke-width="2.5" stroke-linejoin="round"/>`
        : mouth === "flat" ? html`<path d="${`M90 ${m}h20`}" stroke="${eye}" stroke-width="4" stroke-linecap="round"/>`
          : mouth === "cat" ? html`<path d="${`M89 ${m - 2}q5.5 7 11 0q5.5 7 11 0`}" stroke="${eye}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
            : mouth === "beak" ? html`<path d="${`M93 ${y + 16}l7 10 7-10z`}" fill="#ffb020" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
              : html`<path d="${`M92 ${m}q8-6 16 0`}" stroke="${eye}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const cheeks = blush ? html`<ellipse cx="${L - 16}" cy="${y + 22}" rx="10" ry="6" fill="#ff4f8b" opacity=".45"/><ellipse cx="${R + 16}" cy="${y + 22}" rx="10" ry="6" fill="#ff4f8b" opacity=".45"/>` : "";
  return html`${cheeks}${eyes}${brows}${mo}`;
}

// ---------- Les 9 boss ----------
// g : dégradé du corps (clair, moyen, foncé) ; body : contour du corps (sert aussi à l'éclair « touché ») ;
// back : ce qui passe derrière le corps ; front(état) : visage et objets ; aura : décor qui flotte (caché si vaincu).
// line : réplique d'entrée ; taunt : quand tu rates ; hurt : quand il prend un gros coup ; ko : vaincu ; win : il gagne.
export const BOSSES = {
  couple: {
    name: "Cupidon Grognon", g: ["#ffe3ef", "#ffa3c8", "#f0679d"],
    body: "M100 56C150 56 162 96 160 128C158 164 130 180 100 180C70 180 42 164 40 128C38 96 50 56 100 56Z",
    back: () => html`<path d="M52 108c-22-14-34 4-24 16c-10 6-2 18 12 12c0 10 14 10 20-2z" fill="#ffffff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M148 108c22-14 34 4 24 16c10 6 2 18-12 12c0 10-14 10-20-2z" fill="#ffffff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 60V44" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${heart(100, 38, 2, "#ff4f8b")}`,
    front: (st) => html`${shine("M58 96q12-26 40-30")}${face(st)}${feet(176, "#f0679d")}
      <path d="M150 140q18 4 18 20M146 136l14-6M146 136l4 14" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>${heart(170, 166, 1.3, "#ff4f8b")}`,
    aura: () => html`${heart(34, 64, 1.3, "#ffb3d1")}${heart(170, 52, 1, "#ffb3d1")}${heart(24, 150, 0.9, "#ff86b8")}`,
    line: "L'amour, ça se dit bien ou pas du tout !", taunt: "Ce n'est pas comme ça qu'on parle à son cœur !", hurt: "Aïe ! Une flèche en plein cœur…",
    ko: "Bon… tu sais parler d'amour. Je te laisse passer.", win: "Reviens quand tu sauras dire « I love you » sans trembler !"
  },
  travel: {
    name: "Le Douanier", g: ["#dff4ff", "#7fd0ff", "#3e95e0"],
    body: "M100 62C138 62 164 104 166 140C168 168 140 180 100 180C60 180 32 168 34 140C36 104 62 62 100 62Z",
    back: () => "",
    front: (st) => html`${shine("M54 120q6-30 30-44")}
      <path d="M60 74C62 46 138 46 140 74Z" fill="#2f4c8f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="58" y="70" width="84" height="10" rx="4" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
      <path d="M60 80q40 14 80 0l-4 8q-36 10-72 0z" fill="#1c2d5c" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="100" cy="60" r="6" fill="#ffd23f" stroke="${INK}" stroke-width="2.5"/>
      ${face(st, { y: 122 })}
      ${st === "ko" ? "" : html`<circle cx="122" cy="122" r="17" fill="none" stroke="#ffd23f" stroke-width="3.5"/><path d="M138 128q8 12 6 24" stroke="#ffd23f" stroke-width="2" fill="none"/>`}
      <path d="M88 143q6-6 12 0q6-6 12 0" fill="#7a4b2a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M160 146q14-2 18-12" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="168" y="114" width="10" height="16" rx="4" fill="#a8743f" stroke="${INK}" stroke-width="3"/>
      <rect x="160" y="128" width="26" height="11" rx="4" fill="#ff5470" stroke="${INK}" stroke-width="3"/>`,
    aura: () => html`<path d="M26 90q6-6 12 0t12 0M150 46q6-6 12 0t12 0" stroke="#7fd0ff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`,
    line: "Passeport ! Et parle-moi en anglais, s'il te plaît.", taunt: "Hmm… accent suspect. Au suivant !", hurt: "Ouch ! Tamponné en pleine figure !",
    ko: "Tout est en règle. Bon voyage !", win: "Visa refusé. Révise et reviens à la frontière."
  },
  daily: {
    name: "Monsieur Bonjour", g: ["#fff0d6", "#ffc06b", "#f08a2c"],
    body: "M100 66C146 66 170 98 170 132C170 166 140 180 100 180C60 180 30 166 30 132C30 98 54 66 100 66Z",
    back: () => html`${arm("M160 116q18-14 16-34", "#ffc06b")}<circle cx="177" cy="80" r="9" fill="#ffc06b" stroke="${INK}" stroke-width="4"/>`,
    front: (st) => html`${shine("M48 118q4-26 28-40")}
      <path d="M66 84C68 58 132 58 134 84Z" fill="#ff5470" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M130 82q22-4 30 6q-16 4-32 2z" fill="#d93a55" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="100" cy="62" r="4" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
      ${face(st, { y: 124, dx: 24, mouth: "shout" })}${feet(177, "#f08a2c", 30)}`,
    aura: () => html`<path d="M188 66q7 6 4 15M194 58q10 9 6 22" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
    line: "Bonjour ? Non : Hello ! Prouve-moi que tu sais te présenter !", taunt: "Hello ? Je n'ai rien compris !", hurt: "Ouille ! Bien dit, ça pique !",
    ko: "Hello, champion ! Le village est à toi.", win: "Retourne au village t'entraîner, et reviens me dire hello."
  },
  past: {
    name: "Le Conteur", g: ["#e6ffef", "#7fe0a6", "#2fae6a"],
    body: "M100 64C146 64 162 100 160 134C158 168 132 180 100 180C68 180 42 168 40 134C38 100 54 64 100 64Z",
    back: () => html`<path d="M56 88l-10-26 26 12zM144 88l10-26-26 12z" fill="#2fae6a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    front: (st) => html`<ellipse cx="100" cy="154" rx="36" ry="22" fill="#e6ffef" opacity=".6"/>${shine("M54 112q6-26 28-36")}
      <path d="M64 80L102 16L138 78Q100 66 64 80Z" fill="#7a52e0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M64 80Q100 64 138 78l2 8Q100 74 62 88Z" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M96 40l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1zM114 58l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-2-3 2 .5-3.5-2.5-2.5 3.5-.5z" fill="#ffd23f"/>
      ${face(st, { y: 116, mouth: "beak" })}
      <path d="M36 150l28-8v26l-28 8zM64 142l28 8v26l-28-8z" fill="#fff6dc" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M42 156l16-4M42 163l16-4M70 152l16 4M70 159l16 4" stroke="#c9a35a" stroke-width="2" stroke-linecap="round"/>${feet(178, "#2fae6a")}`,
    aura: () => html`<path d="M164 54l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1zM30 76l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#ffd23f" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`,
    line: "Raconte-moi ton week-end… sans fautes !", taunt: "Ce n'était pas hier, ça ! Tu as oublié le -ed ?", hurt: "Argh ! Une histoire parfaitement racontée…",
    ko: "Quelle belle histoire ! Je n'ai plus rien à t'apprendre.", win: "Fin de l'histoire… pour aujourd'hui. Il était une fois ta revanche ?"
  },
  work: {
    name: "La Cheffe Pressée", g: ["#fffbe0", "#ffe066", "#f5b700"],
    body: "M100 70C140 70 160 110 160 140C160 168 134 180 100 180C66 180 40 168 40 140C40 110 60 70 100 70Z",
    back: () => html`${arm("M154 142q16-8 18-28", "#ffe066")}<ellipse cx="176" cy="104" rx="7" ry="11" fill="#c98a4b" stroke="${INK}" stroke-width="3.5"/>`,
    front: (st) => html`${shine("M54 124q4-26 26-40")}
      <path d="M70 84q-22-30 10-38q10-24 40-10q30-10 30 20q10 16-10 28z" fill="#ffffff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="68" y="76" width="64" height="13" rx="5" fill="#ffffff" stroke="${INK}" stroke-width="3.5"/>
      <path d="M88 56q4 10 0 18M112 52q4 12 0 22" stroke="#d9d3e6" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${face(st, { y: 126, mouth: "shout" })}${feet(178, "#ff9f1c")}`,
    aura: () => html`<path d="M152 92c-4 6-6 10-2 13s8-2 2-13z" fill="#7fd0ff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 104h12M26 116h14M32 128h10" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
    line: "Vite ! Le client attend, prononce bien !", taunt: "Trop lent, trop flou ! Recommence !", hurt: "Ah ! Efficace, je note…",
    ko: "Mission accomplie. Tu es promu !", win: "Réunion terminée : tu n'étais pas prêt. On se revoit lundi !"
  },
  out: {
    name: "Le Videur", g: ["#efe6ff", "#b79bff", "#7a52e0"],
    body: "M62 66H138C156 66 166 78 166 96V150C166 170 152 180 134 180H66C48 180 34 170 34 150V96C34 78 44 66 62 66Z",
    back: () => "",
    front: (st) => html`${shine("M48 116q0-28 22-40")}
      ${face(st, { y: 114, dx: 24, mouth: "flat", glasses: true })}
      <path d="M64 146q36 24 72 0" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M64 146q36 24 72 0" stroke="#ffd23f" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="100" cy="160" r="8" fill="#ffd23f" stroke="${INK}" stroke-width="3"/><path d="M97 157l6 6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      ${feet(178, "#7a52e0", 30)}`,
    aura: () => html`<path d="M24 70l4 8 8 2-8 3-4 8-3-8-8-3 8-2zM172 50l3 6 6 2-6 2-3 6-2-6-6-2 6-2z" fill="#ffd23f" opacity=".9"/>`,
    line: "Pour entrer, il faut le bon accent.", taunt: "Pas sur la liste, désolé.", hurt: "Wow… tu as le style, toi.",
    ko: "Ok, c'est bon, entre. Bonne soirée !", win: "Ce soir, c'est complet pour toi. Reviens demain."
  },
  health: {
    name: "Docteur Zarbi", g: ["#e6fffb", "#8ff0de", "#2fc4a8"],
    body: "M48 94C48 64 152 64 152 94L160 160C162 174 150 180 136 180H64C50 180 38 174 40 160Z",
    back: () => html`${arm("M46 150q-14-8-18-24", "#8ff0de")}<path d="M28 126l-6-22" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M28 126l-6-22" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><circle cx="29" cy="128" r="5" fill="#ff5470" stroke="${INK}" stroke-width="3"/>`,
    front: (st) => html`${shine("M58 116q2-24 22-34")}
      <path d="M50 88q50-24 100 0" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M50 88q50-24 100 0" stroke="#e9eef7" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="100" cy="70" r="13" fill="#dfe7f5" stroke="${INK}" stroke-width="3.5"/><circle cx="100" cy="70" r="6" fill="#ffffff" stroke="${INK}" stroke-width="2"/><path d="M93 64l4-3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      ${face(st, { y: 122 })}
      <rect x="128" y="138" width="22" height="10" rx="4" transform="rotate(-20 139 143)" fill="#ffd7b0" stroke="${INK}" stroke-width="2.5"/>
      <path d="M70 150q30 34 60 0" stroke="${INK}" stroke-width="3.5" fill="none"/><circle cx="100" cy="166" r="6" fill="#dfe7f5" stroke="${INK}" stroke-width="3"/>`,
    aura: () => html`<path d="M164 60h6v-6h6v6h6v6h-6v6h-6v-6h-6z" fill="#ff5470" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="34" cy="70" r="5" fill="#8ff0de" opacity=".8"/><circle cx="168" cy="96" r="3.5" fill="#8ff0de" opacity=".8"/>`,
    line: "Dites « aaah »… en anglais !", taunt: "Diagnostic : prononciation fiévreuse.", hurt: "Ouh ! Remède de cheval, cette phrase !",
    ko: "Guérison complète ! Vous pouvez sortir.", win: "Repos et exercices : je vous revois en consultation."
  },
  fun: {
    name: "La Critique", g: ["#ffe4e6", "#ff8f9e", "#e8465c"],
    body: "M100 62C148 62 162 98 160 132C158 166 132 180 100 180C68 180 42 166 40 132C38 98 52 62 100 62Z",
    back: () => html`<path d="M56 84L60 46L88 68ZM144 84L140 46L112 68Z" fill="#e8465c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M62 74l1-16 12 9zM138 74l-1-16-12 9z" fill="#ffc2cb"/>
      <path d="M152 164q34-6 22-44" stroke="${INK}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M152 164q34-6 22-44" stroke="#ff8f9e" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    front: (st) => html`${shine("M56 110q6-26 30-36")}
      <path d="M62 76q36-30 78-6q-12 12-78 6z" fill="#2a2450" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M104 58v-8" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      ${face(st, { y: 120, mouth: "cat" })}
      ${st === "ko" ? "" : html`<circle cx="78" cy="120" r="17" fill="none" stroke="#ffd23f" stroke-width="3.5"/><path d="M62 126q-8 12-6 24" stroke="#ffd23f" stroke-width="2" fill="none"/>`}
      <path d="M44 136h14M44 144l14-3M156 136h-14M156 144l-14-3" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M120 168v-22" stroke="#a8743f" stroke-width="5" stroke-linecap="round"/>
      <rect x="104" y="128" width="40" height="22" rx="5" fill="#ffffff" stroke="${INK}" stroke-width="3"/>
      <path d="M114 133l2 4 4.5.5-3.3 3 .8 4.5-4-2.2-4 2.2.8-4.5-3.3-3 4.5-.5z" fill="#ffd23f" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M128 133l2 4 4.5.5-3.3 3 .8 4.5-4-2.2-4 2.2.8-4.5-3.3-3 4.5-.5z" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>${feet(178, "#e8465c")}`,
    aura: () => html`<path d="M30 70l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" fill="none" stroke="#ffd23f" stroke-width="2.5" stroke-linejoin="round"/>`,
    line: "Ton avis ? Je le note sur 100.", taunt: "Une étoile. Et encore.", hurt: "Oh ! Ça, c'est du cinq étoiles…",
    ko: "Chef-d'œuvre ! Je n'ai rien à redire.", win: "Critique sévère : à retravailler. Reviens me surprendre."
  },
  phone: {
    name: "Le Robot du standard", g: ["#ffffff", "#cfd8ea", "#8f9bb8"],
    body: "M96 54H104C134 54 160 80 160 110V122C160 152 134 178 104 178H96C66 178 40 152 40 122V110C40 80 66 54 96 54Z",
    back: () => html`<path d="M100 52V36" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="32" r="8" fill="#ff8aa0" stroke="${INK}" stroke-width="3.5"/><circle cx="97" cy="29" r="2.5" fill="#ffffff"/>
      <rect x="30" y="98" width="18" height="34" rx="9" fill="#a99bff" stroke="${INK}" stroke-width="4"/><rect x="152" y="98" width="18" height="34" rx="9" fill="#a99bff" stroke="${INK}" stroke-width="4"/>
      <path d="M40 98C40 40 160 40 160 98" stroke="${INK}" stroke-width="10" fill="none"/><path d="M40 98C40 40 160 40 160 98" stroke="#a99bff" stroke-width="5" fill="none"/>`,
    front: (st) => html`${shine("M58 92q10-24 34-30")}
      <rect x="56" y="92" width="88" height="56" rx="26" fill="#2a2450" stroke="${INK}" stroke-width="3.5"/>
      ${face(st, { y: 116, dx: 20, eye: "#7ff0ff", blush: false })}
      <ellipse cx="62" cy="158" rx="9" ry="5" fill="#ff7aa8" opacity=".55"/><ellipse cx="138" cy="158" rx="9" ry="5" fill="#ff7aa8" opacity=".55"/>
      <path d="M160 124q16 24-18 30" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="140" cy="154" r="5.5" fill="#a99bff" stroke="${INK}" stroke-width="3"/>
      ${feet(178, "#a99bff")}`,
    aura: () => html`<path d="M28 64l8 10-6 3 9 11M172 58l-8 10 6 3-9 11" stroke="#ffd23f" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`,
    line: "Bip. Veuillez parler distinctement. Bip.", taunt: "Bip. Je n'ai pas compris. Tapez 1 pour réessayer.", hurt: "Bzzt ! Erreur… système… touché…",
    ko: "Bip… Transfert vers la sortie. Au revoir, humain.", win: "Bip. Appel terminé. Veuillez rappeler plus tard."
  }
};
export const STATES = ["idle", "hit", "ko"];
export const bossOf = (regionId) => (Object.hasOwn(BOSSES, regionId) ? BOSSES[regionId] : null);

// Dessin d'un boss (gid : identifiant unique du dégradé). label : texte lu par les lecteurs d'écran ("" pour un dessin décoratif).
function drawBoss(gid, b, state, label) {
  const st = STATES.includes(state) ? state : "idle";
  const name = label === undefined ? (st === "ko" ? `${b.name}, vaincu` : b.name) : label;
  return html`<svg class="${`boss ${st}`}" viewBox="0 0 200 200" role="${name ? "img" : "presentation"}" aria-label="${name}" aria-hidden="${name ? "false" : "true"}">
    <defs><radialGradient id="${gid}" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${b.g[0]}"/><stop offset=".5" stop-color="${b.g[1]}"/><stop offset="1" stop-color="${b.g[2]}"/></radialGradient></defs>
    <ellipse cx="100" cy="186" rx="50" ry="7" fill="#000000" opacity=".3"/>
    ${st === "ko" ? "" : html`<g class="boss-aura">${b.aura()}</g>`}
    <g class="boss-body">
      ${b.back(st)}
      <path d="${b.body}" fill="${`url(#${gid})`}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      ${b.front(st)}
      <path class="boss-flash" d="${b.body}" fill="#ffffff"/>
    </g>
  </svg>`;
}
export function bossSvg(regionId, state = "idle", { label } = {}) {
  const id = bossOf(regionId) ? regionId : "daily";
  return drawBoss(`kb-${id}`, BOSSES[id], state, label);
}

// ---------- Mini-boss des familles de verbes (phase 10, tâche 5) : « Le Grimoire » ----------
// Un seul personnage (choix du 2026-11-19) : un livre de sorts vivant, en style mignon, d'une couleur par famille.
// Couverture arrondie avec coins dorés, pages crème sur le côté, fermoir, marque-page, plume magique et étincelles.
export const GRIMOIRE_COLORS = {
  stars: ["#fff4c2", "#ffd23f", "#e09a12"], aaa: ["#e3ffe9", "#7fe39a", "#2fae5c"], ought: ["#dffbff", "#6fdde6", "#2b9fb0"],
  t: ["#e3ecff", "#8fb0ff", "#4a6fe0"], abb: ["#f0e6ff", "#b994ff", "#7b4fe0"], iau: ["#ffe3f3", "#ff9ccf", "#e0559c"],
  aba: ["#ffeedd", "#ffb070", "#e0702a"], ew: ["#ffe5e5", "#ff8f8f", "#d94848"], en: ["#f6e8da", "#d2a27a", "#9a6640"]
};
const sparkle = (x, y, s, fill) => html`<path transform="${`translate(${x} ${y}) scale(${s})`}" d="M0 -8L2 -2L8 0L2 2L0 8L-2 2L-8 0L-2 -2Z" fill="${fill}" stroke="${INK}" stroke-width="${1.5 / s}" stroke-linejoin="round"/>`;
export const GRIMOIRE = {
  name: "Le Grimoire",
  body: "M58 52H144Q156 52 156 64V166Q156 178 144 178H58Q46 178 46 166V64Q46 52 58 52Z",
  back: () => html`<path d="M148 58H162Q168 58 168 64V166Q168 172 162 172H148Z" fill="#fff6dc" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M154 72h8M154 88h8M154 104h8M154 120h8M154 136h8M154 152h8" stroke="#d9c79a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M118 176v16l7-6 7 6v-16" fill="#ff4f8b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  front: (st) => html`<path d="M46 64Q46 52 58 52H66V178H58Q46 178 46 166Z" fill="#000000" opacity=".18"/>
    ${shine("M76 70q20-8 46-6")}
    <path d="M140 52h4q12 0 12 12v4zM140 178h4q12 0 12-12v-4z" fill="#ffd23f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="148" y="104" width="16" height="22" rx="5" fill="#ffd23f" stroke="${INK}" stroke-width="3.5"/>
    ${sparkle(106, 80, 1.3, "#ffffff")}
    ${face(st, { y: 118, dx: 20 })}${feet(182, "#7a4b2a", 26)}
    ${st === "ko" ? "" : html`<path d="M40 140q-14-6-14-22" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M26 118q-8-22 10-36q2 20-10 36z" fill="#ffffff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`}`,
  aura: () => html`${sparkle(30, 60, 1.2, "#ffe58a")}${sparkle(176, 40, 1, "#ffe58a")}${sparkle(184, 120, 0.8, "#ffffff")}${sparkle(22, 168, 0.8, "#ffffff")}`,
  line: "Hé hé… Je connais par cœur tous les verbes de cette famille. Et toi ?", taunt: "Faux ! Ce verbe n'a rien de régulier, voyons !",
  hurt: "Aïe ! Mes pages ! Tu connais tes formes…", ko: "Tu sais ta famille par cœur… Je referme mon livre.",
  win: "Retourne réviser tes formes, apprenti, et reviens me voir !"
};
export function grimoireSvg(famId, state = "idle", { label } = {}) {
  const id = Object.hasOwn(GRIMOIRE_COLORS, famId) ? famId : "stars";
  return drawBoss(`kg-${id}`, { ...GRIMOIRE, g: GRIMOIRE_COLORS[id] }, state, label);
}
