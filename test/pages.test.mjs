// Tests de la phase 7, tâche 4 : ce que GitHub Pages publie (précautions de la tâche 6 de la phase 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("(a) sw.js efface l'ancienne appli, se désinstalle et ne sert aucune page", () => {
  const s = read("sw.js").replace(/^\s*\/\/.*$/gm, "");
  assert.match(s, /caches\.delete/); assert.match(s, /registration\.unregister\(\)/); assert.match(s, /skipWaiting\(\)/);
  assert.match(s, /if \(key\.startsWith\("labo-"\)\) await caches\.delete\(key\)/, "seulement les caches de l'ancienne appli, pas le moteur");
  assert.ok(!/addEventListener\(\s*["']fetch/.test(s), "pas d'écouteur fetch");
  assert.ok(!/importScripts|fetch\(/.test(s));
  assert.ok(!/serviceWorker\.register/.test(read("index.html") + read("js/main.js")), "la nouvelle appli n'installe pas de service worker (phase 9)");
});

test("(b) GitHub Pages ne publie ni ancien/, ni les tests, ni les outils", () => {
  assert.ok(!existsSync(new URL(".nojekyll", root)), "Jekyll doit lire _config.yml");
  const cfg = read("_config.yml");
  for (const d of ["ancien/", "test/", "tools/", ".claude/", "docs/"]) assert.ok(cfg.includes(`  - ${d}\n`), d);
  // Jekyll ignore les fichiers en « _ » ou « . » et transforme ceux qui commencent par « --- » : aucun fichier publié ne doit en dépendre.
  const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean)
    .filter((f) => !/^(ancien|test|tools|\.claude)\//.test(f) && !f.endsWith(".md") && f !== "package.json");
  const hidden = files.filter((f) => f.split("/").some((p) => /^[_.#]/.test(p)) && !["_config.yml", ".gitignore", ".gitattributes"].includes(f));
  assert.deepEqual(hidden, []);
  const front = files.filter((f) => /\.(html|js|mjs|css|json|txt|svg|webmanifest)$/.test(f) && read(f).startsWith("---"));
  assert.deepEqual(front, []);
  assert.ok(files.includes("index.html") && files.includes("sw.js") && files.some((f) => f.startsWith("vendor/qrcode-generator/")));
});
