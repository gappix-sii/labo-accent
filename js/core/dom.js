// Rendu HTML sûr par construction.
// - html`…` échappe toute valeur interpolée ; seuls les fragments déjà créés par html`` sont insérés tels quels.
// - Chaque modèle est analysé une fois : interdit d'interpoler un nom de balise, un attribut sans guillemets,
//   ou la valeur d'un attribut dangereux (on*, style, href, src, srcdoc, action…).
// - Avec Trusted Types (CSP « require-trusted-types-for 'script'; trusted-types labo »), le navigateur refuse toute
//   écriture HTML ou URL de script qui ne passe pas par la politique « labo » ci-dessous, accessible seulement ici.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
const escapeHtml = s => String(s).replace(/[&<>"'`]/g, c => ESC[c]);

class SafeHTML {
  #s;
  constructor(s) { this.#s = s; }
  static unwrap(v) { return v.#s; } // lève une TypeError si v n'est pas un SafeHTML
  static is(v) { return v !== null && typeof v === "object" && #s in v; }
}
export const isSafe = v => SafeHTML.is(v);
// Lecture seule (tests, longueur) : obtenir la chaîne ne permet pas d'en fabriquer une « sûre ».
export const toHTMLString = v => SafeHTML.unwrap(v);

const DANGER_ATTR = /^(on|style$|href$|xlink:href$|src$|srcset$|srcdoc$|action$|formaction$|data$|poster$|background$|ping$|manifest$|codebase$|cite$|is$)/i;
const ATTR_NAMES = /^(?:[a-z][a-z0-9-]*(?: [a-z][a-z0-9-]*)*)?$/;
const contexts = new WeakMap();

// Analyse des morceaux fixes d'un modèle : contexte de chaque trou (texte, valeur d'attribut entre guillemets, balise).
function analyse(strings) {
  let ctx = contexts.get(strings);
  if (ctx) return ctx;
  ctx = [];
  let st = "text", quote = "", attr = "";
  for (let i = 0; i < strings.length; i++) {
    const s = strings[i];
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (st === "text") { if (c === "<" && /[a-zA-Z/!]/.test(s[j + 1] || "")) st = "tag"; }
      else if (st === "tag") {
        if (c === ">") st = "text";
        else if (c === '"' || c === "'") {
          const m = s.slice(0, j).match(/([^\s"'=<>/]+)\s*=\s*$/);
          if (!m) throw new Error("html: guillemet inattendu");
          quote = c; attr = m[1]; st = "attr";
        }
      } else if (c === quote) st = "tag";
    }
    if (i === strings.length - 1) break;
    if (st === "attr") {
      if (DANGER_ATTR.test(attr)) throw new Error(`html: interpolation interdite dans l'attribut ${attr}`);
      ctx.push("attr");
    } else if (st === "tag") {
      if (/=\s*$/.test(s)) throw new Error("html: valeur d'attribut sans guillemets");
      if (/<\/?[a-zA-Z0-9-]*$/.test(s)) throw new Error("html: nom de balise interpolé");
      ctx.push("tag");
    } else {
      if (/<$/.test(s)) throw new Error("html: nom de balise interpolé");
      ctx.push("text");
    }
  }
  if (st !== "text") throw new Error("html: modèle mal fermé");
  contexts.set(strings, ctx);
  return ctx;
}

function encode(v, where) {
  if (v === null || v === undefined || v === false) return "";
  if (where === "text") {
    if (SafeHTML.is(v)) return SafeHTML.unwrap(v);
    if (Array.isArray(v)) return v.map(x => encode(x, "text")).join("");
    if (typeof v === "object") throw new TypeError("html: objet inattendu");
    return escapeHtml(v);
  }
  if (SafeHTML.is(v) || Array.isArray(v) || typeof v === "object") throw new TypeError("html: valeur non textuelle dans un attribut");
  if (where === "tag") {
    const s = String(v).trim();
    if (!ATTR_NAMES.test(s)) throw new TypeError("html: seuls des noms d'attributs sont permis ici");
    return s;
  }
  return escapeHtml(v);
}

export function html(strings, ...values) {
  const ctx = analyse(strings);
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += encode(values[i], ctx[i]) + strings[i + 1];
  return new SafeHTML(out);
}
export const join = (list, sep = html``) => {
  const out = [];
  list.forEach((x, i) => { if (i) out.push(sep); out.push(x); });
  return out;
};

// ---- Trusted Types ----
// Racine de l'appli, déduite de l'emplacement de ce fichier (js/core/dom.js) : juste aussi pour une page de tools/.
const appRoot = () => new URL("../../", import.meta.url);
const tt = globalThis.trustedTypes;
const policy = tt && tt.createPolicy ? tt.createPolicy("labo", {
  createHTML: s => s, // n'est appelée que par toTrusted(), qui n'accepte que la sortie de html``
  createScriptURL: u => {
    const url = new URL(u, document.baseURI), root = appRoot();
    const rel = url.pathname.startsWith(root.pathname) ? url.pathname.slice(root.pathname.length) : "";
    if (url.origin !== location.origin || url.search || url.hash || !/^(sw\.js|js\/(engine\/)?[a-z-]+\.js)$/.test(rel)) throw new TypeError("URL de script refusée");
    return url.href;
  }
}) : null;

function toTrusted(tpl) {
  const s = SafeHTML.unwrap(tpl);
  return policy ? policy.createHTML(s) : s;
}
export function scriptURL(u) { return policy ? policy.createScriptURL(String(u)) : String(new URL(u, document.baseURI)); }
export function makeWorker(u) { return new Worker(scriptURL(u), { type: "module" }); }

// Variables CSS posées après rendu (pas de style inline : la CSP l'interdit). Format : data-css="--p:42%;--i:3".
const VAR_NAME = /^--[a-z][a-z0-9-]*$/, VAR_VALUE = /^(-?\d+(\.\d+)?(%|px|deg|s|ms|em|rem)?|#[0-9a-f]{3,8})$/i;
function hydrate(root) {
  const list = root.querySelectorAll ? root.querySelectorAll("[data-css]") : [];
  for (const el of list) {
    for (const part of el.getAttribute("data-css").split(";")) {
      const k = part.indexOf(":");
      if (k < 0) continue;
      const name = part.slice(0, k).trim(), value = part.slice(k + 1).trim();
      if (VAR_NAME.test(name) && VAR_VALUE.test(value)) el.style.setProperty(name, value);
    }
    el.removeAttribute("data-css");
  }
}

// Redessin d'un écran (relecture complète, n° 6) : le clavier et le lecteur d'écran ne perdent pas leur place.
// - l'élément qui avait le focus est retrouvé dans le nouveau dessin (même id, ou mêmes data-act / data-id / data-i…) ;
// - les messages (role="status" ou "alert") sont recopiés dans la zone d'annonce #annonce, qui, elle, n'est jamais redessinée.
const KEY_ATTRS = ["act", "id", "i", "v", "slot", "cat", "side", "goal", "q"];
const cssq = (v) => String(v).replace(/["\\]/g, "\\$&");
export function focusKey(node) {
  if (!node || !node.getAttribute || node === node.ownerDocument?.body) return null;
  if (node.id) return `#${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(node.id) : node.id}`;
  const d = node.dataset || {};
  if (!d.act) return null;
  return KEY_ATTRS.filter((k) => d[k] !== undefined).map((k) => `[data-${k}="${cssq(d[k])}"]`).join("");
}
// Animations d'entrée (relecture de la phase 8, n° 1 et 2) : un redessin recrée tous les éléments, et leur animation
// d'entrée repartirait de zéro (bulles transparentes pendant la réponse de Gemini, blocs qui clignotent au téléchargement).
// Un élément qui était déjà là au dessin précédent (même place, mêmes classes) est marqué data-seen : il ne se rejoue pas
// (css/theme.css). Seul ce qui apparaît vraiment s'anime. ENTRY reprend les sélecteurs des animations d'entrée du thème.
export const ENTRY = [".screen > *", ".score-row .mood", ".banner", ".tab.on .tab-ico", ".bar > i", ".btn.choice.wrong", ".score", ".word", ".bubble", ".correction-card"];
const ENTRY_SEL = ENTRY.join(", ");
// Place d'un élément sous `top` : balise, classes et rang de chaque niveau (fonction pure, testée).
export function placeKey(n, top) {
  let k = "";
  for (let x = n; x && x !== top; x = x.parentElement) {
    let i = 0;
    for (let s = x.previousElementSibling; s; s = s.previousElementSibling) i++;
    k = `${x.tagName}.${typeof x.className === "string" ? x.className : ""}:${i}/${k}`;
  }
  return k;
}
const seenAt = new WeakMap();
function markSeen(el) {
  if (!el.querySelectorAll) return;
  const before = seenAt.get(el), now = new Set();
  for (const n of el.querySelectorAll(ENTRY_SEL)) { const k = placeKey(n, el); now.add(k); if (before && before.has(k)) n.setAttribute("data-seen", ""); }
  seenAt.set(el, now);
}
// Annonces (relecture de la phase 8, n° 3) : le dernier message lu est gardé pour CHAQUE zone redessinée ; la barre du haut,
// qui n'a pas de message, ne fait donc plus relire celui de l'écran. Renvoie vrai s'il faut lire `msg` (fonction testée).
const lastAnnounce = new WeakMap();
export function shouldAnnounce(el, msg) {
  const prev = lastAnnounce.has(el) ? lastAnnounce.get(el) : "";
  lastAnnounce.set(el, msg);
  return !!msg && msg !== prev;
}
export function render(el, tpl) {
  const doc = el.ownerDocument, active = doc && doc.activeElement;
  const key = active && active !== el && el.contains(active) ? focusKey(active) : null;
  el.innerHTML = toTrusted(tpl); hydrate(el); markSeen(el);
  if (key) { let t = null; try { t = el.querySelector(key); } catch { /* sélecteur refusé */ } if (t && t.focus) t.focus({ preventScroll: true }); }
  const live = doc && doc.getElementById("annonce");
  if (live) {
    const msg = [...el.querySelectorAll('[role="status"], [role="alert"]')].map((n) => n.textContent.trim()).filter(Boolean).join(" ");
    if (shouldAnnounce(el, msg)) live.textContent = msg;
  }
  return el;
}
export function frag(tpl) {
  const t = document.createElement("template");
  t.innerHTML = toTrusted(tpl);
  hydrate(t.content);
  return t.content;
}
export function append(el, tpl) { const f = frag(tpl); const first = f.firstElementChild; el.appendChild(f); return first; }
export function replace(el, tpl) { const f = frag(tpl); const first = f.firstElementChild; el.replaceWith(f); return first; }
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export function setVar(el, name, value) { if (el && VAR_NAME.test(name) && VAR_VALUE.test(String(value))) el.style.setProperty(name, String(value)); }
