// QR code du transfert (phase 7) : calcul par la bibliothèque qrcode-generator (vendor/, empreinte vérifiée par test/qr.test.mjs),
// dessin en SVG avec le modèle html`` de l'appli (jamais le HTML que la bibliothèque sait produire).
import qrcode from "../../vendor/qrcode-generator/qrcode.mjs";
import { html } from "../core/dom.js";

export const QR_ECC = "L"; // correction d'erreur basse : le moins de points possible, donc le plus facile à lire sur un écran
export const QUIET = 4; // marge blanche autour, en modules (exigée par la norme)

// Grille du QR code : { size, dark(r, c) }, ou null si le texte ne tient pas (version 40 dépassée) ou n'est pas en ASCII.
export function qrMatrix(text, ecc = QR_ECC) {
  if (typeof text !== "string" || !text || !/^[\x20-\x7e]+$/.test(text)) return null;
  try {
    const q = qrcode(0, ecc); // 0 : la plus petite version qui convient
    q.addData(text, "Byte");
    q.make();
    const size = q.getModuleCount();
    return { size, dark: (r, c) => q.isDark(r, c) };
  } catch { return null; }
}

// Tracé SVG des modules noirs (un seul chemin, coordonnées entières).
export function qrPath(m) {
  let d = "";
  for (let r = 0; r < m.size; r++) for (let c = 0; c < m.size; c++) if (m.dark(r, c)) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
  return d;
}

// QR code en SVG (noir sur blanc, même en thème sombre : sinon les appareils photo le lisent mal), ou null s'il ne tient pas.
export function qrSvg(text, { label = "QR code" } = {}) {
  const m = qrMatrix(text);
  if (!m) return null;
  const n = m.size + QUIET * 2;
  return html`<svg class="qr" viewBox="0 0 ${n} ${n}" role="img" aria-label="${label}" shape-rendering="crispEdges">
    <rect width="${n}" height="${n}" fill="#ffffff"/><path d="${qrPath(m)}" fill="#000000"/></svg>`;
}
