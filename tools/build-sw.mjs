// Génère la liste d'empreintes SHA-256 de tous les fichiers de l'appli et l'écrit dans sw.js.
// À lancer avant chaque publication :  node tools/build-sw.mjs
// Vérifie aussi que les bibliothèques copiées dans vendor/ n'ont pas changé (empreintes de SECURITY.md)
// et que chaque module importé existe bien dans la liste.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = {
  "vendor/transformers.min.js": "8b5a3171f8876bab2b1820a7d65eb87628e3d30bb5ea85b9dd398e76eb34decb",
  "vendor/ort-wasm-simd-threaded.asyncify.mjs": "0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611",
  "vendor/ort-wasm-simd-threaded.asyncify.wasm": "49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082",
  "data/cmudict.json": "ca8e790ec08466b37153a35576e2ac3ede1dfe3b1a16ccdb7605deef4add654b"
};
const walk = d => readdirSync(join(root, d)).flatMap(f => { const p = posix.join(d, f); return statSync(join(root, p)).isDirectory() ? walk(p) : [p]; });
const files = [
  "index.html", "manifest.webmanifest",
  ...walk("css"), ...walk("js"), ...walk("fonts").filter(f => f.endsWith(".woff2")), ...walk("icons"),
  ...Object.keys(VENDOR)
].sort();

const manifest = {}, problems = [];
for (const f of files) {
  const buf = readFileSync(join(root, f));
  const h = createHash("sha256").update(buf).digest("hex");
  manifest[f] = { h, n: buf.length };
  if (VENDOR[f] && VENDOR[f] !== h) problems.push(`${f} a changé : ${h} au lieu de ${VENDOR[f]}`);
}
// Chaque import relatif doit pointer vers un fichier de la liste.
for (const f of files.filter(f => f.endsWith(".js") && f.startsWith("js/"))) {
  const src = readFileSync(join(root, f), "utf8");
  for (const m of src.matchAll(/(?:import|export)[^"'`]*?from\s*["'](\.[^"']+)["']|new URL\(["'](\.[^"']+)["'],\s*import\.meta\.url\)/g)) {
    const target = posix.normalize(posix.join(posix.dirname(f), m[1] || m[2]));
    if (target.endsWith("/")) continue; // dossier (chemins des moteurs), pas un module
    if (!manifest[target]) problems.push(`${f} importe ${target}, absent de la liste`);
  }
}
if (problems.length) { console.error("ÉCHEC :\n- " + problems.join("\n- ")); process.exit(1); }

const version = "labo-" + createHash("sha256").update(JSON.stringify(manifest)).digest("hex").slice(0, 12);
const block = `/* BUILD:BEGIN */\nconst VERSION = ${JSON.stringify(version)};\nconst MANIFEST = ${JSON.stringify(manifest, null, 0).replace(/\},"/g, '},\n  "')};\n/* BUILD:END */`;
const swPath = join(root, "sw.js");
const sw = readFileSync(swPath, "utf8");
const out = sw.replace(/\/\* BUILD:BEGIN \*\/[\s\S]*?\/\* BUILD:END \*\//, block);
if (out === sw && !sw.includes(version)) { console.error("Marqueurs BUILD introuvables dans sw.js"); process.exit(1); }
writeFileSync(swPath, out);
const total = Object.values(manifest).reduce((a, x) => a + x.n, 0);
console.log(`${version} · ${files.length} fichiers vérifiés · ${(total / 1e6).toFixed(1)} Mo`);
