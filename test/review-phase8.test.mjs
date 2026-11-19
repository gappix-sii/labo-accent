// Tests de la relecture de la phase 8 : animations d'entrée jouées une fois, annonces, animations légères,
// contrastes sur les cases lumineuses et contour du clavier, boutons de retour vers le bon onglet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENTRY, placeKey, shouldAnnounce } from "../js/core/dom.js";

const root = new URL("../", import.meta.url), read = (p) => readFileSync(new URL(p, root), "utf8");
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => { const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const mix = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p))); // color-mix(in srgb, a p, b)
function tokens(css, dark) {
  const i = dark ? css.indexOf(":root", css.indexOf("prefers-color-scheme: dark")) : css.indexOf(":root");
  const block = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2]]));
}
// Blocs @keyframes : nom et contenu (accolades imbriquées).
function keyframes(css) {
  const out = [];
  for (const m of css.matchAll(/@keyframes\s+([A-Za-z0-9-]+)\s*\{/g)) {
    let depth = 1, j = m.index + m[0].length;
    while (depth && j < css.length) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    out.push([m[1], css.slice(m.index + m[0].length, j - 1)]);
  }
  return out;
}

test("un élément déjà affiché garde sa place d'un dessin à l'autre (pas d'animation rejouée)", () => {
  // faux éléments : balise, classes, parent et frère précédent, comme dans le navigateur
  const node = (tagName, className, parentElement, previousElementSibling = null) => ({ tagName, className, parentElement, previousElementSibling });
  const top = node("DIV", "screen", null);
  const card = node("SECTION", "card", top), b1 = node("P", "bubble ai", card), b2 = node("P", "bubble me", card, b1);
  assert.equal(placeKey(b2, top), "SECTION.card:0/P.bubble me:1/");
  // même bulle redessinée (le texte qui arrive ne compte pas) : même place
  const card2 = node("SECTION", "card", top), c1 = node("P", "bubble ai", card2), c2 = node("P", "bubble me", card2, c1);
  assert.equal(placeKey(c2, top), placeKey(b2, top));
  // une mauvaise réponse change de classe : nouvelle place, la secousse se joue
  assert.notEqual(placeKey(node("BUTTON", "btn choice wrong", card), top), placeKey(node("BUTTON", "btn choice", card), top));
  // un SVG (className n'est pas du texte) ne fait pas planter
  assert.equal(placeKey(node("svg", { baseVal: "x" }, card), top), "SECTION.card:0/svg.:0/");
});

test("le lecteur d'écran ne relit pas un message parce qu'une autre zone (barre du haut) a été redessinée", () => {
  const screen = {}, hud = {};
  assert.equal(shouldAnnounce(screen, "Je n'ai rien entendu."), true);
  assert.equal(shouldAnnounce(hud, ""), false, "la barre du haut n'a pas de message");
  assert.equal(shouldAnnounce(screen, "Je n'ai rien entendu."), false, "même message : pas relu");
  assert.equal(shouldAnnounce(screen, "Bravo !"), true);
  assert.equal(shouldAnnounce(screen, ""), false);
  assert.equal(shouldAnnounce(screen, "Bravo !"), true, "le message revient après avoir disparu : relu");
});

test("chaque animation d'entrée du thème est couverte par ENTRY, et data-seen l'arrête", () => {
  const css = (read("css/theme.css") + read("css/app.css")).replace(/\/\*[\s\S]*?\*\//g, ""); // sans les commentaires
  assert.match(read("css/theme.css"), /\[data-seen\] \{ animation: none !important; \}/);
  const once = new Set(["rise", "tabPop", "fill", "shake", "pop", "tileIn"]);
  let n = 0;
  for (const m of css.matchAll(/(?<=^|\})()\s*([^{}@]+?)\s*\{([^{}]*)\}/g)) {
    const a = /(?:^|;)\s*animation:\s*([A-Za-z-]+)([^;]*)/.exec(m[3]);
    if (!a || !once.has(a[1]) || /infinite/.test(a[2])) continue;
    for (const sel of m[2].split(",").map((x) => x.trim())) { n++; assert.ok(ENTRY.includes(sel), `animation d'entrée « ${a[1]} » sur « ${sel} » absente de ENTRY`); }
  }
  assert.ok(n >= 9, `${n} règles trouvées`);
});

test("animations de la phase 8 : seulement transform et opacity (légères sur téléphone)", () => {
  const app = read("css/app.css"), from = app.indexOf("/* Parcours en carte de quête");
  assert.ok(from > 0);
  for (const [file, css] of [["theme.css", read("css/theme.css")], ["app.css (phase 8)", app.slice(from)]]) {
    for (const [name, body] of keyframes(css)) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      for (const p of props) assert.ok(p === "transform" || p === "opacity", `${file} : @keyframes ${name} anime ${p}`);
    }
  }
});

test("contrastes : contour du clavier (3 : 1) et raretés sur les cases lumineuses (4,5 : 1), en clair et en sombre", () => {
  const css = read("css/theme.css");
  for (const dark of [false, true]) {
    const t = { ...tokens(css, false), ...(dark ? tokens(css, true) : {}) }, th = dark ? "sombre" : "clair";
    for (const bg of ["bg", "card", "card2"]) assert.ok(ratio(hex(t.focus), hex(t[bg])) >= 3, `${th} : --focus sur --${bg} = ${ratio(hex(t.focus), hex(t[bg])).toFixed(2)}`);
    for (const r of ["common", "rare", "epic", "legendary", "mythic"]) {
      const glow = mix(hex(t[`glow-${r}`]), hex(t.card2), 0.18), picked = mix(hex(t["gold-fill"]), hex(t.card2), 0.16), text = hex(t[`rar-${r}`]);
      assert.ok(ratio(text, glow) >= 4.5, `${th} : --rar-${r} sur sa case = ${ratio(text, glow).toFixed(2)}`);
      assert.ok(ratio(text, picked) >= 4.5, `${th} : --rar-${r} sur une case choisie = ${ratio(text, picked).toFixed(2)}`);
    }
  }
  assert.match(css, /:focus-visible, \.btn:focus-visible \{ outline: 3px solid var\(--focus\)/);
});

test("boutons de retour : vers l'onglet de l'écran, avec son nom", async () => {
  const { TABS, tabFor } = await import("../js/screens/shell.js");
  const NAME = Object.fromEntries(TABS.map(([, hash, , label]) => [hash, label]));
  const TAB_HASH = Object.fromEntries(TABS.map(([id, hash]) => [id, hash]));
  const FILES = { lesson: "lesson", vocab: "vocab", listening: "listening", grammar: "grammarList", mistakes: "mistakes", roleplay: "roleList", chat: "chat",
    companion: "companion", shop: "shop", chests: "chests", settings: "settings", transfer: "transfer", say: "bench", styleguide: "style" };
  for (const [file, screen] of Object.entries(FILES)) {
    const src = read(`js/screens/${file}.js`);
    const label = /data-act="home" type="button">← ([^<]+)<\/button>/.exec(src), target = /=== "home"\)[^\n]*?location\.hash = "(#[a-z]+)"/.exec(src);
    assert.ok(label && target, `${file}.js : bouton ou adresse de retour introuvable`);
    const tab = TAB_HASH[tabFor(screen)], own = TABS.some(([, hash]) => hash === `#${screen}` || (screen === "companion" && hash === "#compagnon") || (screen === "shop" && hash === "#boutique"));
    assert.equal(target[1], own ? "#accueil" : tab, `${file}.js : le retour mène à l'onglet de l'écran`);
    assert.equal(label[1], NAME[target[1]], `${file}.js : le bouton porte le nom de l'onglet`);
  }
});

test("chaque boîte à butin a sa rareté d'affichage dans les données du jeu", async () => {
  const { BOXES } = await import("../js/core/game.js");
  for (const [id, B] of Object.entries(BOXES)) assert.ok(["common", "rare", "epic", "legendary", "mythic"].includes(B.glow), id);
});
