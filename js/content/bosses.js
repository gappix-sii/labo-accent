// Les 9 boss du parcours (phase 9, tâche 2), un par région (js/content/regions.js), en rapport avec son thème.
// Dessins et répliques d'entrée repris de ancien/js/avatar.js (« Boss des unités ») : un monstre à cornes dont la
// couleur et les accessoires (ceux du compagnon, js/content/avatar.js) changent d'un boss à l'autre.
// Trois états : "idle" (au repos, il respire), "hit" (touché : il recule et clignote), "ko" (vaincu : yeux en croix,
// il s'affaisse). Animations dans css/theme.css, sur transform et opacity seulement, coupées par « Effets réduits ».
import { html } from "../core/dom.js";
import { ITEM_BY_ID } from "./avatar.js";

// line : réplique d'entrée ; taunt : quand tu rates ; hurt : quand il prend un gros coup ; ko : vaincu ; win : il gagne.
const B = (name, fur, look, line, taunt, hurt, ko, win) => ({ name, fur, ...look, line, taunt, hurt, ko, win });
export const BOSSES = {
  couple: B("Cupidon Grognon", "#ff6fae", { hat: "bow", aura: "hearts" },
    "L'amour, ça se dit bien ou pas du tout !", "Ce n'est pas comme ça qu'on parle à son cœur !", "Aïe ! Une flèche en plein cœur…",
    "Bon… tu sais parler d'amour. Je te laisse passer.", "Reviens quand tu sauras dire « I love you » sans trembler !"),
  travel: B("Le Douanier", "#4cc9f0", { hat: "cap", eyes: "monocle" },
    "Passeport ! Et parle-moi en anglais, s'il te plaît.", "Hmm… accent suspect. Au suivant !", "Ouch ! Tamponné en pleine figure !",
    "Tout est en règle. Bon voyage !", "Visa refusé. Révise et reviens à la frontière."),
  daily: B("Monsieur Bonjour", "#ff9f43", { hat: "cap" },
    "Bonjour ? Non : Hello ! Prouve-moi que tu sais te présenter !", "Hello ? Je n'ai rien compris !", "Ouille ! Bien dit, ça pique !",
    "Hello, champion ! Le village est à toi.", "Retourne au village t'entraîner, et reviens me dire hello."),
  past: B("Le Conteur", "#3ddc84", { hat: "wizard", eyes: "round" },
    "Raconte-moi ton week-end… sans fautes !", "Ce n'était pas hier, ça ! Tu as oublié le -ed ?", "Argh ! Une histoire parfaitement racontée…",
    "Quelle belle histoire ! Je n'ai plus rien à t'apprendre.", "Fin de l'histoire… pour aujourd'hui. Il était une fois ta revanche ?"),
  work: B("La Cheffe Pressée", "#ffd23f", { hat: "chef" },
    "Vite ! Le client attend, prononce bien !", "Trop lent, trop flou ! Recommence !", "Ah ! Efficace, je note…",
    "Mission accomplie. Tu es promu !", "Réunion terminée : tu n'étais pas prêt. On se revoit lundi !"),
  out: B("Le Videur", "#a98bff", { eyes: "sun", neck: "chain" },
    "Pour entrer, il faut le bon accent.", "Pas sur la liste, désolé.", "Wow… tu as le style, toi.",
    "Ok, c'est bon, entre. Bonne soirée !", "Ce soir, c'est complet pour toi. Reviens demain."),
  health: B("Docteur Zarbi", "#5ee6d0", { eyes: "round", neck: "bowtie" },
    "Dites « aaah »… en anglais !", "Diagnostic : prononciation fiévreuse.", "Ouh ! Remède de cheval, cette phrase !",
    "Guérison complète ! Vous pouvez sortir.", "Repos et exercices : je vous revois en consultation."),
  fun: B("La Critique", "#ff5470", { hat: "pirate", eyes: "monocle" },
    "Ton avis ? Je le note sur 100.", "Une étoile. Et encore.", "Oh ! Ça, c'est du cinq étoiles…",
    "Chef-d'œuvre ! Je n'ai rien à redire.", "Critique sévère : à retravailler. Reviens me surprendre."),
  phone: B("Le Robot du standard", "#9aa3b5", { eyes: "visor", aura: "lightning" },
    "Bip. Veuillez parler distinctement. Bip.", "Bip. Je n'ai pas compris. Tapez 1 pour réessayer.", "Bzzt ! Erreur… système… touché…",
    "Bip… Transfert vers la sortie. Au revoir, humain.", "Bip. Appel terminé. Veuillez rappeler plus tard.")
};
export const STATES = ["idle", "hit", "ko"];
export const bossOf = (regionId) => (Object.hasOwn(BOSSES, regionId) ? BOSSES[regionId] : null);

const BODY = "M100 34c42 0 70 30 72 72 2 40-12 66-30 78-20 10-64 10-84 0-18-12-32-38-30-78 2-42 30-72 72-72z";
const item = (id) => (id && Object.hasOwn(ITEM_BY_ID, id) ? ITEM_BY_ID[id] : null);

// Dessin d'un boss. label : texte lu par les lecteurs d'écran ("" pour un dessin décoratif).
export function bossSvg(regionId, state = "idle", { label } = {}) {
  const b = bossOf(regionId) || BOSSES.daily, st = STATES.includes(state) ? state : "idle";
  const hat = item(b.hat), eyes = item(b.eyes), neck = item(b.neck), aura = item(b.aura), ko = st === "ko";
  const name = label === undefined ? (ko ? `${b.name}, vaincu` : b.name) : label;
  return html`<svg class="${`boss ${st}`}" viewBox="0 0 200 200" role="${name ? "img" : "presentation"}" aria-label="${name}" aria-hidden="${name ? "false" : "true"}">
    ${aura && !ko ? html`<g class="av-aura">${aura.draw()}</g>` : ""}
    <g class="boss-body">
      <path d="${BODY}" fill="${b.fur}" stroke="#120d24" stroke-width="4"/>
      <path d="M64 46 54 18l26 16zM136 46l10-28-26 16z" fill="#fff3c4" stroke="#120d24" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="100" cy="160" rx="40" ry="18" fill="#ffffff" opacity=".18"/>
      ${ko
        ? html`<g class="boss-eyes"><path d="M64 92l24 24M88 92l-24 24M112 92l24 24M136 92l-24 24" stroke="#120d24" stroke-width="7" stroke-linecap="round"/></g>
          <path d="M76 146q24-14 48 0" fill="none" stroke="#120d24" stroke-width="6" stroke-linecap="round"/>`
        : html`<g class="boss-eyes"><ellipse cx="76" cy="104" rx="14" ry="16" fill="#fff"/><ellipse cx="124" cy="104" rx="14" ry="16" fill="#fff"/><circle cx="79" cy="107" r="7" fill="#c22a47"/><circle cx="121" cy="107" r="7" fill="#c22a47"/><circle cx="79" cy="107" r="3" fill="#120d24"/><circle cx="121" cy="107" r="3" fill="#120d24"/></g>
          <path d="M58 82l30 12M142 82l-30 12" stroke="#120d24" stroke-width="7" stroke-linecap="round"/>
          <path d="M70 138q30 20 60 0-30 10-60 0z" fill="#120d24"/>
          <path d="M78 140l5 7 5-6 6 7 6-7 6 7 6-7 5 6 5-7z" fill="#ffffff"/>`}
      ${neck ? html`<g transform="translate(0 18)">${neck.draw()}</g>` : ""}
      ${eyes && !ko ? html`<g transform="translate(0 8)">${eyes.draw()}</g>` : ""}
      ${hat ? html`<g transform="translate(0 2)">${hat.draw()}</g>` : ""}
      <path class="boss-flash" d="${BODY}" fill="#ffffff"/>
    </g>
  </svg>`;
}
