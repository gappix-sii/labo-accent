// Petit serveur local pour tester l'appli sur ce PC :  npm start  puis ouvrir http://localhost:8000
// Aucune dépendance : seulement les modules intégrés à Node.
// Sécurité :
// - il n'écoute que sur cet ordinateur (127.0.0.1) : invisible depuis le réseau ;
// - il ne sert que les types de fichiers de l'appli (liste ci-dessous) : jamais les .md
//   (notes perso), ni les fichiers ou dossiers commençant par un point (.git, .claude…) ;
// - il refuse tout chemin qui sortirait du dossier du projet.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, sep, extname, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PORT = 8000;
export const HOST = "127.0.0.1";

export const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
  ".onnx": "application/octet-stream",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

// En-têtes envoyés avec chaque réponse. COOP + COEP permettent au moteur de prononciation
// d'utiliser plusieurs cœurs du processeur ; les autres bloquent des attaques courantes.
export const HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store"
};

// Transforme le chemin demandé (« /js/app.js ») en fichier sur le disque, ou null si refusé.
export function resolvePath(root, urlPath) {
  let path;
  try { path = decodeURIComponent(urlPath.split("?")[0].split("#")[0]); } catch { return null; }
  if (path.includes("\0") || path.includes("\\")) return null;
  if (path.endsWith("/")) path += "index.html";
  const parts = path.split("/").filter(Boolean);
  if (parts.some((p) => p.startsWith(".") || p === "..")) return null;
  if (!Object.hasOwn(TYPES, extname(path).toLowerCase())) return null;
  const file = normalize(join(root, ...parts));
  if (!file.startsWith(root + sep)) return null;
  return file;
}

export function makeServer(root = ROOT) {
  return createServer(async (req, res) => {
    const send = (code, body, type = "text/plain; charset=utf-8") => {
      res.writeHead(code, { ...HEADERS, "Content-Type": type });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "Méthode refusée");
    const file = resolvePath(root, req.url || "/");
    if (!file) return send(404, "Introuvable");
    try {
      if (!(await stat(file)).isFile()) return send(404, "Introuvable");
      send(200, await readFile(file), TYPES[extname(file).toLowerCase()]);
    } catch {
      send(404, "Introuvable");
    }
  });
}

// Lancé directement (npm start) : démarre le serveur. Importé par un test : ne fait rien.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  makeServer().listen(PORT, HOST, () => {
    console.log(`Labo d'accent : http://localhost:${PORT}  (Ctrl+C pour arrêter)`);
  });
}
