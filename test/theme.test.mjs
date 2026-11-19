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

test("barre du haut et onglets : onglet allumé, onglets cachés pendant un exercice, chiffres", async () => {
  const { route } = await import("../js/main.js");
  const { TABS, tabFor, inExercise, hudData } = await import("../js/screens/shell.js");
  const { defaults } = await import("../js/core/store.js");
  assert.deepEqual(route("#entrainement"), { screen: "training" });
  assert.deepEqual(route("#profil"), { screen: "profile" });
  assert.deepEqual(TABS.map((t) => t[1]), ["#accueil", "#entrainement", "#compagnon", "#boutique", "#profil"]);
  for (const h of TABS.map((t) => t[1])) assert.notEqual(route(h).screen, undefined);
  const cases = { "#accueil": "path", "#lecon/s-h": "path", "#vocab": "training", "#ecoute": "training", "#grammaire": "training", "#grammaire/be": "training", "#fautes": "training", "#role": "training",
    "#discussion": "training", "#compagnon": "companion", "#boutique": "shop", "#coffres": "shop", "#profil": "profile", "#reglages": "profile", "#transfert": "profile", "#banc": "profile", "#style": "profile", "#entrainement": "training" };
  for (const [h, tab] of Object.entries(cases)) assert.equal(tabFor(route(h).screen), tab, h);
  for (const h of ["#lecon/s-h", "#vocab", "#ecoute", "#grammaire/be", "#fautes", "#role/cafe", "#discussion", "#banc"]) assert.equal(inExercise(route(h).screen), true, h);
  for (const h of ["#accueil", "#entrainement", "#grammaire", "#role", "#compagnon", "#boutique", "#coffres", "#profil", "#reglages"]) assert.equal(inExercise(route(h).screen), false, h);
  const S = defaults(); S.progress.xp = 150; S.game.coins = 12; S.game.chests = ["silver"];
  const d = hudData(S);
  assert.equal(d.level, 2); assert.ok(d.pct >= 0 && d.pct <= 100); assert.equal(d.coins, 12); assert.equal(d.chests, 1);
});

test("carte du parcours : régions, étapes et quête du jour", async () => {
  const { dailyQuest, nodeState, lessonState } = await import("../js/screens/home.js");
  const { REGIONS, PER_REGION } = await import("../js/content/regions.js");
  const { LESSONS } = await import("../js/content/lessons.js");
  const { newProgress, recordItem, dayKey } = await import("../js/core/progress.js");
  assert.ok(REGIONS.length * PER_REGION >= LESSONS.length, "chaque leçon a sa région");
  const P = newProgress(), now = new Date(2026, 10, 18, 12).getTime();
  const next = (P) => LESSONS.findIndex((_, i) => { const st = lessonState(P, i); return st.open && st.done === 0; });
  assert.equal(nodeState(P, 0, next(P)), "current");
  assert.equal(nodeState(P, LESSONS.length - 1, next(P)), "locked");
  for (let k = 0; k < LESSONS[0].items.length; k++) recordItem(P, LESSONS[0].id, k, LESSONS[0].items.length, 95, now);
  assert.equal(nodeState(P, 0, next(P)), "done"); assert.equal(nodeState(P, 1, next(P)), "current");
  const q = dailyQuest(P, now);
  assert.ok(q.today > 0 && q.pct >= 0 && q.pct <= 100 && q.goal === P.goal);
  const Q = newProgress(); Q.days[dayKey(now)] = Q.goal + 5;
  assert.equal(dailyQuest(Q, now).done, true); assert.equal(dailyQuest(Q, now).pct, 100);
  assert.equal(dailyQuest(newProgress(), now).next, 1, "récompense : la série démarre");
});

test("exercices : barre d'avancement sûre, bornée et lisible par un lecteur d'écran", async () => {
  const { progressBar } = await import("../js/screens/practice.js");
  const { toHTMLString, isSafe } = await import("../js/core/dom.js");
  const s = (t) => toHTMLString(t);
  assert.ok(isSafe(progressBar(3, 10)));
  assert.match(s(progressBar(3, 10, "Séance")), /data-css="--p:30%".*role="progressbar".*aria-label="Séance".*aria-valuemax="10".*aria-valuenow="3"/);
  assert.match(s(progressBar(12, 10)), /--p:100%/); assert.match(s(progressBar(-1, 0)), /--p:0%/);
});
