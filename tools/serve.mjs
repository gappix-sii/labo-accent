// Petit serveur local pour tester l'appli sur ce PC :  npm start  puis ouvrir http://localhost:8000
// Aucune dépendance : seulement les modules intégrés à Node.
// Sécurité :
// - il n'écoute que sur cet ordinateur (127.0.0.1) : invisible depuis le réseau ;
// - il ne sert que les types de fichiers de l'appli (liste ci-dessous) : jamais les .md
//   (notes perso), ni les fichiers ou dossiers commençant par un point (.git, .claude…) ;
// - il refuse tout chemin qui sortirait du dossier du projet.
// Mode fabrique (npm run fabrique, pour tools/fabrique.html) : il accepte EN PLUS l'écriture des sons
// fabriqués, et rien d'autre : uniquement dans data/audio/, des noms de fichier fixés d'avance,
// des fichiers Ogg ou la liste index.json, envoyés par une page de ce même serveur.
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile, rename } from "node:fs/promises";
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
  ".ogg": "audio/ogg",
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

// Écritures permises en mode fabrique : nom du fichier → [type attendu, taille maximale].
export const WRITABLE = /^\/data\/audio\/((?:af|am)_[a-z]+-[0-9a-f]{16}\.ogg|index\.json|files\.json)$/;
const LIMITS = { ".ogg": ["audio/ogg", 256 * 1024], ".json": ["application/json", 2 * 1024 * 1024] };

// Vérifie une demande d'écriture ; renvoie [code, message] si elle est refusée, sinon le nom du fichier.
export function checkWrite(req, port = PORT) {
  const m = WRITABLE.exec(req.url || "");
  if (!m) return [403, "Écriture refusée à cet endroit"];
  // Seule une page servie par ce serveur peut écrire (pas un autre site ouvert dans le navigateur).
  const origins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
  if (!origins.includes(req.headers.origin)) return [403, "Origine refusée"];
  const site = req.headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin") return [403, "Origine refusée"];
  const [type] = LIMITS[extname(m[1])];
  if ((req.headers["content-type"] || "").split(";")[0].trim() !== type) return [415, "Type refusé"];
  return m[1];
}

async function readBody(req, max) {
  const parts = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > max) throw Object.assign(new Error("trop gros"), { code: 413 });
    parts.push(c);
  }
  return Buffer.concat(parts);
}

async function handleWrite(req, send, root, port) {
  const name = checkWrite(req, port);
  if (Array.isArray(name)) return send(...name);
  const [, max] = LIMITS[extname(name)];
  let body;
  try { body = await readBody(req, max); } catch (e) { return send(e.code || 400, "Envoi refusé"); }
  if (name.endsWith(".ogg") && body.subarray(0, 4).toString("latin1") !== "OggS") return send(400, "Pas un fichier Ogg");
  if (name.endsWith(".json")) {
    try { const j = JSON.parse(body.toString("utf8")); if (!j || typeof j !== "object" || Array.isArray(j)) throw 0; }
    catch { return send(400, "JSON invalide"); }
  }
  const dir = join(root, "data", "audio"), file = join(dir, name), tmp = file + ".tmp";
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, body);
  await rename(tmp, file); // écrit d'un coup : jamais de fichier à moitié écrit
  send(201, "Enregistré");
}

export function makeServer(root = ROOT, { fabrique = false, port = PORT } = {}) {
  return createServer(async (req, res) => {
    const send = (code, body, type = "text/plain; charset=utf-8") => {
      res.writeHead(code, { ...HEADERS, "Content-Type": type });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    if (req.method === "PUT" && fabrique) {
      try { return await handleWrite(req, send, root, port); } catch { return send(500, "Écriture impossible"); }
    }
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
  const fabrique = process.argv.includes("--fabrique");
  makeServer(ROOT, { fabrique }).listen(PORT, HOST, () => {
    console.log(fabrique
      ? `Fabrique des sons : http://localhost:${PORT}/tools/fabrique.html  (écriture permise dans data/audio/ ; Ctrl+C pour arrêter)`
      : `Labo d'accent : http://localhost:${PORT}  (Ctrl+C pour arrêter)`);
  });
}
