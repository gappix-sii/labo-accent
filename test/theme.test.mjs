// Tests de la phase 8, tâche 1 : thème « aventure » (css/theme.css, page #style).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url), read = (p) => readFileSync(new URL(p, root), "utf8");
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
// Jetons d'un bloc :root (clair : le premier ; sombre : celui de la règle prefers-color-scheme: dark).
function tokens(css, dark) {
  const i = dark ? css.indexOf(":root", css.indexOf("prefers-color-scheme: dark")) : css.indexOf(":root");
  const block = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2]]));
}

test("contrastes du texte (WCAG AA, 4,5 : 1) en thème clair et sombre", () => {
  const css = read("css/theme.css");
  for (const dark of [false, true]) {
    const t = { ...tokens(css, false), ...(dark ? tokens(css, true) : {}) };
    const pairs = [["text", "card"], ["text", "bg"], ["muted", "card"], ["muted", "bg"], ["gold", "card"], ["accent", "card"], ["good", "card"], ["ok", "card"], ["bad", "card"], ["on-gold", "gold-fill"],
      ["rar-common", "card"], ["rar-rare", "card"], ["rar-epic", "card"], ["rar-legendary", "card"], ["rar-mythic", "card"]];
    for (const [a, b] of pairs) assert.ok(ratio(t[a], t[b]) >= 4.5, `${dark ? "sombre" : "clair"} : --${a} sur --${b} = ${ratio(t[a], t[b]).toFixed(2)}`);
    assert.ok(ratio("#ffffff", t.violet) >= 4.5 && ratio("#ffffff", t.red) >= 4.5, "boutons violet et rouge");
  }
});

test("thème chargé après app.css, polices locales avec leur licence, rien d'interdit par la CSP", () => {
  const index = read("index.html"), css = read("css/theme.css");
  assert.ok(index.indexOf("css/app.css") < index.indexOf("css/theme.css"));
  assert.match(index, /<div class="bgfx" aria-hidden="true">/);
  for (const m of css.matchAll(/url\(\.\.\/(fonts\/[^)]+)\)/g)) assert.ok(existsSync(new URL(m[1], root)), m[1]);
  assert.ok(existsSync(new URL("fonts/LICENSE-OFL.txt", root)));
  assert.ok(!/@import|url\(https?:/i.test(css), "aucune ressource extérieure");
  assert.ok(/\.fx-reduced \.bgfx i/.test(css), "fond figé avec « Effets réduits »");
  // animations : seulement transform, opacity, ombres et dégradés (pas de largeur/hauteur animées, coûteuses sur téléphone)
  for (const m of css.matchAll(/@keyframes\s+([a-z-]+)\s*\{([\s\S]*?)\}\s*\}/gi)) assert.ok(!/\b(width|height|top|left|margin|padding)\s*:/.test(m[2]), `animation ${m[1]}`);
});

test("page d'exemple : adresse #style", async () => {
  const { route } = await import("../js/main.js");
  assert.deepEqual(route("#style"), { screen: "style" });
});
